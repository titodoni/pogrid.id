<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Tenant;
use App\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PpicDashboardController extends Controller
{
    public function index(Request $request, $slug)
    {
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->first();
        if (! $tenant) {
            abort(404, 'Tenant not found.');
        }
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        $user = auth()->user()->load('roleRelation', 'postRelation');
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized tenant access.');
        }

        $schedule = $this->getProductionSchedule();
        $workCenterLoad = $this->getWorkCenterLoad();
        $materialReadiness = $this->getMaterialReadiness();
        $bottlenecks = $this->getBottleneckAnalysis();
        $deliveryForecast = $this->getDeliveryForecast();
        $capacityView = $this->getCapacityView();

        return Inertia::render('Ppic/Dashboard', [
            'auth_user' => $user,
            'tenant' => $tenant,
            'schedule' => $schedule,
            'work_center_load' => $workCenterLoad,
            'material_readiness' => $materialReadiness,
            'bottlenecks' => $bottlenecks,
            'delivery_forecast' => $deliveryForecast,
            'capacity_view' => $capacityView,
        ]);
    }

    private function getProductionSchedule(): array
    {
        $pos = Po::with([
            'items' => function ($q) {
                $q->with(['itemProgresses', 'alerts' => fn ($a) => $a->where('is_resolved', false)])
                    ->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty');
            },
        ])->orderBy('global_deadline')->get();

        $schedule = [];
        foreach ($pos as $po) {
            $totalItems = $po->items->count();
            $completedItems = $po->items->where('status', 'COMPLETED')->count();
            $activeItems = $po->items->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])->count();

            $items = [];
            foreach ($po->items as $item) {
                $currentStage = null;
                $stages = $item->required_stages ?? [];
                foreach ($stages as $stage) {
                    $prog = $item->itemProgresses->firstWhere('stage_name', $stage);
                    if ($prog && $prog->status !== 'COMPLETED') {
                        $currentStage = $stage;
                        break;
                    }
                }
                if ($currentStage === null && $item->status === 'COMPLETED') {
                    $currentStage = $item->invoice_status !== 'INVOICED' || $item->payment_status !== 'PAID' ? 'Finance' : 'Done';
                }

                $hasAlert = $item->alerts->isNotEmpty();
                $hasRed = $item->alerts->first(fn ($a) => $a->severity === 'RED');
                $hasYellow = $item->alerts->first(fn ($a) => $a->severity === 'YELLOW');

                $items[] = [
                    'id' => $item->id,
                    'item_name' => $item->item_name,
                    'target_qty' => (int) $item->target_qty,
                    'item_type' => $item->item_type,
                    'progress_percent' => (float) $item->progress_percent,
                    'status' => $item->status,
                    'current_stage' => $currentStage,
                    'purchasing_status' => $item->purchasing_status,
                    'drafter_status' => $item->drafter_status,
                    'delivered_qty' => (int) $item->delivered_qty,
                    'has_alert' => $hasAlert,
                    'severity' => $hasRed ? 'RED' : ($hasYellow ? 'YELLOW' : null),
                ];
            }

            $deadline = Carbon::parse($po->global_deadline);
            $daysUntilDeadline = now()->startOfDay()->diffInDays($deadline, false);
            $isOverdue = $daysUntilDeadline < 0;

            $schedule[] = [
                'id' => $po->id,
                'po_number' => $po->po_number,
                'client_name' => $po->client_name,
                'global_deadline' => $po->global_deadline->toDateString(),
                'status' => $po->status,
                'is_urgent' => (bool) $po->is_urgent,
                'days_until_deadline' => (int) $daysUntilDeadline,
                'is_overdue' => $isOverdue,
                'total_items' => $totalItems,
                'completed_items' => $completedItems,
                'active_items' => $activeItems,
                'items' => $items,
            ];
        }

        return $schedule;
    }

    private function getWorkCenterLoad(): array
    {
        $stageGroups = [
            'Drafter' => ['Design', 'Drafter', 'Drafting', 'Drawing', 'Gambar', 'Draft'],
            'Purchasing' => ['Material', 'Bahan', 'Purchasing', 'Vendor', 'Procurement'],
            'Machining' => ['Machining', 'CNC', 'Milling', 'Turning', 'Bubut', 'Drilling'],
            'Fabrication' => ['Fabrication', 'Fabrikasi', 'Welding', 'Welder', 'Cutting', 'Bending'],
            'Assembly' => ['Assembly', 'Perakitan', 'Rakit', 'Fitting', 'Erection'],
            'Surface' => ['Surface', 'Painting', 'Coating', 'Finishing', 'Galvanizing'],
            'QC' => ['QC', 'Quality Control', 'Inspeksi'],
            'Delivery' => ['Delivery', 'Pengiriman', 'Kirim'],
        ];

        $loads = [];
        foreach ($stageGroups as $groupName => $keywords) {
            $activeCount = ItemProgress::whereIn('stage_name', $keywords)
                ->where('status', '!=', 'COMPLETED')
                ->count();

            $completedCount = ItemProgress::whereIn('stage_name', $keywords)
                ->where('status', 'COMPLETED')
                ->count();

            $loads[] = [
                'work_center' => $groupName,
                'active' => $activeCount,
                'completed' => $completedCount,
                'total' => $activeCount + $completedCount,
            ];
        }

        return $loads;
    }

    private function getMaterialReadiness(): array
    {
        $allItems = Item::whereNotIn('status', ['CANCELLED', 'TERMINATED'])
            ->with('po')
            ->get();

        $ready = [];
        $pending = [];
        $inProgress = [];

        foreach ($allItems as $item) {
            if (! in_array('Material', $item->required_stages ?? [])
                && ! in_array('Bahan', $item->required_stages ?? [])
                && ! in_array('Purchasing', $item->required_stages ?? [])
                && ! in_array('Vendor', $item->required_stages ?? [])) {
                continue;
            }

            $materialProgress = ItemProgress::where('item_id', $item->id)
                ->where(fn ($q) => $q
                    ->where('stage_name', 'like', '%Material%')
                    ->orWhere('stage_name', 'like', '%Bahan%')
                    ->orWhere('stage_name', 'like', '%Purchasing%')
                    ->orWhere('stage_name', 'like', '%Vendor%')
                )
                ->first();

            $entry = [
                'item_id' => $item->id,
                'item_name' => $item->item_name,
                'po_number' => $item->po?->po_number,
                'client_name' => $item->po?->client_name,
                'target_qty' => (int) $item->target_qty,
                'purchasing_status' => $item->purchasing_status,
                'status' => $materialProgress?->status ?? 'PENDING',
                'progress_percent' => (float) ($materialProgress?->progress_percent ?? 0),
            ];

            if ($materialProgress && $materialProgress->status === 'COMPLETED') {
                $ready[] = $entry;
            } elseif ($materialProgress && $materialProgress->status === 'IN_PROGRESS') {
                $inProgress[] = $entry;
            } else {
                $pending[] = $entry;
            }
        }

        return [
            'ready' => $ready,
            'in_progress' => $inProgress,
            'pending' => $pending,
            'ready_count' => count($ready),
            'in_progress_count' => count($inProgress),
            'pending_count' => count($pending),
        ];
    }

    private function getBottleneckAnalysis(): array
    {
        $stuckAlerts = Alert::where('is_resolved', false)
            ->where('severity', 'RED')
            ->with(['item' => fn ($q) => $q->with('po')])
            ->get();

        $bottlenecks = [];
        foreach ($stuckAlerts as $alert) {
            $stage = 'Unknown';
            if (preg_match("/stage '([^']+)'/", $alert->message, $m)) {
                $stage = $m[1];
            }

            $groupName = $stage;
            $stageLower = strtolower($stage);
            if (str_contains($stageLower, 'design') || str_contains($stageLower, 'gambar') || str_contains($stageLower, 'draft')) {
                $groupName = 'Drafter';
            } elseif (str_contains($stageLower, 'material') || str_contains($stageLower, 'bahan') || str_contains($stageLower, 'vendor') || str_contains($stageLower, 'purchasing')) {
                $groupName = 'Purchasing';
            } elseif (str_contains($stageLower, 'machining') || str_contains($stageLower, 'cnc') || str_contains($stageLower, 'milling')) {
                $groupName = 'Machining';
            } elseif (str_contains($stageLower, 'fabrication') || str_contains($stageLower, 'fabrikasi') || str_contains($stageLower, 'welding')) {
                $groupName = 'Fabrication';
            } elseif (str_contains($stageLower, 'qc')) {
                $groupName = 'QC';
            } elseif (str_contains($stageLower, 'delivery') || str_contains($stageLower, 'pengiriman')) {
                $groupName = 'Delivery';
            }

            if (! isset($bottlenecks[$groupName])) {
                $bottlenecks[$groupName] = [
                    'work_center' => $groupName,
                    'stuck_count' => 0,
                    'stuck_items' => [],
                ];
            }
            $bottlenecks[$groupName]['stuck_count']++;
            $bottlenecks[$groupName]['stuck_items'][] = [
                'item_id' => $alert->item_id,
                'item_name' => $alert->item?->item_name ?? 'Unknown',
                'po_number' => $alert->item?->po?->po_number ?? '',
                'reason' => $alert->reason_type ?? $alert->message,
                'created_at' => $alert->created_at?->toDateString(),
            ];
        }

        return array_values($bottlenecks);
    }

    private function getDeliveryForecast(): array
    {
        $now = now()->startOfDay();

        $overdueItems = Item::whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
            ->whereHas('po', fn ($q) => $q->where('global_deadline', '<', $now))
            ->with(['po', 'itemProgresses'])
            ->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty')
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'item_name' => $item->item_name,
                'po_number' => $item->po?->po_number,
                'client_name' => $item->po?->client_name,
                'deadline' => $item->po?->global_deadline?->toDateString(),
                'target_qty' => (int) $item->target_qty,
                'delivered_qty' => (int) $item->delivered_qty,
                'progress_percent' => (float) $item->progress_percent,
            ])
            ->values()
            ->toArray();

        $dueSoonItems = Item::whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
            ->whereHas('po', fn ($q) => $q
                ->where('global_deadline', '>=', $now)
                ->where('global_deadline', '<=', (clone $now)->addDays(7))
            )
            ->with(['po', 'itemProgresses'])
            ->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty')
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'item_name' => $item->item_name,
                'po_number' => $item->po?->po_number,
                'client_name' => $item->po?->client_name,
                'deadline' => $item->po?->global_deadline?->toDateString(),
                'target_qty' => (int) $item->target_qty,
                'delivered_qty' => (int) $item->delivered_qty,
                'progress_percent' => (float) $item->progress_percent,
                'days_remaining' => $item->po ? (int) now()->startOfDay()->diffInDays(Carbon::parse($item->po->global_deadline), false) : 0,
            ])
            ->values()
            ->toArray();

        return [
            'overdue' => $overdueItems,
            'due_soon' => $dueSoonItems,
            'overdue_count' => count($overdueItems),
            'due_soon_count' => count($dueSoonItems),
        ];
    }

    private function getCapacityView(): array
    {
        $stageGroups = [
            'Drafter' => ['Design', 'Drafter', 'Drafting', 'Drawing', 'Gambar', 'Draft'],
            'Purchasing' => ['Material', 'Bahan', 'Purchasing', 'Vendor', 'Procurement'],
            'Machining' => ['Machining', 'CNC', 'Milling', 'Turning', 'Bubut', 'Drilling'],
            'Fabrication' => ['Fabrication', 'Fabrikasi', 'Welding', 'Welder', 'Cutting', 'Bending'],
            'Assembly' => ['Assembly', 'Perakitan', 'Rakit', 'Fitting', 'Erection'],
            'Surface' => ['Surface', 'Painting', 'Coating', 'Finishing', 'Galvanizing'],
            'QC' => ['QC', 'Quality Control', 'Inspeksi'],
            'Delivery' => ['Delivery', 'Pengiriman', 'Kirim'],
        ];

        $capacities = [];
        foreach ($stageGroups as $groupName => $keywords) {
            $activeItems = Item::whereNotIn('items.status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
                ->whereHas('itemProgresses', fn ($q) => $q
                    ->whereIn('stage_name', $keywords)
                    ->where('status', '!=', 'COMPLETED')
                )
                ->with('po')
                ->get();

            $totalTargetQty = $activeItems->sum('target_qty');
            $totalCompletedQty = 0;
            foreach ($activeItems as $item) {
                $progresses = $item->itemProgresses->whereIn('stage_name', $keywords);
                $totalCompletedQty += $progresses->sum('completed_qty');
            }

            $capacities[] = [
                'work_center' => $groupName,
                'active_item_count' => $activeItems->count(),
                'total_target_qty' => (int) $totalTargetQty,
                'total_completed_qty' => (int) $totalCompletedQty,
                'load_percent' => $totalTargetQty > 0 ? round(($totalCompletedQty / $totalTargetQty) * 100, 1) : 0,
            ];
        }

        return $capacities;
    }
}
