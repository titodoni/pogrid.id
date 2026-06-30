<?php

namespace App\Http\Controllers;

use App\Events\KendalaReported;
use App\Models\Alert;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantManager;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WorkerDashboardController extends Controller
{
    public function index(Request $request, $slug)
    {
        // 1. Resolve tenant context by slug
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->first();
        if (! $tenant) {
            abort(404, 'Tenant not found.');
        }
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        // 2. If guest, render the unified login gateway
        if (! auth()->check()) {
            $workers = User::where('tenant_id', $tenant->id)
                ->whereNotNull('pin')
                ->get(['id', 'name', 'role']);

            return Inertia::render('Worker/Login', [
                'tenant' => [
                    'id' => $tenant->id,
                    'company_name' => $tenant->company_name,
                    'slug' => $tenant->slug,
                ],
                'workers' => $workers,
            ]);
        }

        // 3. Authenticated: verify tenant scope matching
        $user = auth()->user();
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized tenant access.');
        }

        // 4. Determine dashboard views by office vs floor roles division
        $officeRoles = ['OWNER', 'ADMIN', 'SALES', 'MANAGER'];
        if (in_array(strtoupper($user->role), $officeRoles)) {
            $pos = Po::with('items.itemProgresses')->get();
            $alerts = Alert::where('is_resolved', false)->get();
            $users = User::get();

            $range = $request->input('range', 'month');
            if (! in_array($range, ['week', 'month', 'year'])) {
                $range = 'month';
            }
            $telemetry = $this->getTelemetryData($range);

            return Inertia::render('Owner/Dashboard', [
                'pos' => $pos,
                'alerts' => $alerts,
                'users' => $users,
                'tenant' => $tenant,
                'auth_user' => $user,
                'telemetry' => $telemetry,
                'selected_range' => $range,
            ]);
        }

        // Otherwise, render floor operators dashboard
        $items = Item::with(['itemProgresses', 'po'])
            ->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
            ->get();

        return Inertia::render('Worker/Dashboard', [
            'items' => $items,
        ]);
    }

    public function exportPdf(Request $request, $slug)
    {
        // 1. Resolve tenant context by slug
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->first();
        if (! $tenant) {
            abort(404, 'Tenant not found.');
        }
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        // 2. Auth check
        if (! auth()->check()) {
            abort(401);
        }

        // 3. Tenant matching check
        $user = auth()->user();
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized tenant access.');
        }

        // 4. Role check
        $officeRoles = ['OWNER', 'ADMIN', 'SALES', 'MANAGER'];
        if (! in_array(strtoupper($user->role), $officeRoles)) {
            abort(403, 'Unauthorized role.');
        }

        $range = $request->input('range', 'month');
        if (! in_array($range, ['week', 'month', 'year'])) {
            $range = 'month';
        }
        $telemetry = $this->getTelemetryData($range);

        $pdf = Pdf::loadView('pdf.performance-matrix', [
            'tenant' => $tenant,
            'telemetry' => $telemetry,
            'range' => $range,
            'generated_at' => now()->format('Y-m-d H:i:s'),
        ]);

        return $pdf->download("performance-matrix-{$range}.pdf");
    }

    private function getTelemetryData($range)
    {
        if ($range === 'week') {
            $startDate = now()->subDays(6)->startOfDay();
        } elseif ($range === 'year') {
            $startDate = now()->subDays(364)->startOfDay();
        } else {
            $startDate = now()->subDays(29)->startOfDay();
        }

        // 1. On-Time Delivery Rate (OTDR)
        $posCompleted = Po::where('status', 'COMPLETED')
            ->where('created_at', '>=', $startDate)
            ->with(['deliveryOrders'])
            ->get();

        $totalCompleted = $posCompleted->count();
        $onTimeCompleted = 0;
        foreach ($posCompleted as $po) {
            $latestDoDate = $po->deliveryOrders->max('delivery_date');
            if ($latestDoDate) {
                $latestDo = Carbon::parse($latestDoDate)->startOfDay();
                $deadline = Carbon::parse($po->global_deadline)->startOfDay();
                if ($latestDo->lte($deadline)) {
                    $onTimeCompleted++;
                }
            } else {
                $deadline = Carbon::parse($po->global_deadline)->startOfDay();
                if ($po->updated_at->startOfDay()->lte($deadline)) {
                    $onTimeCompleted++;
                }
            }
        }
        $otdr = $totalCompleted > 0 ? round(($onTimeCompleted / $totalCompleted) * 100, 1) : 100.0;

        // 2. Output Volumes by Type
        $items = Item::where('created_at', '>=', $startDate)->get();

        $outputManufacture = 0.0;
        $targetManufacture = 0;
        $outputBuyout = 0.0;
        $targetBuyout = 0;
        $outputService = 0.0;
        $targetService = 0;

        foreach ($items as $item) {
            $prog = (float) $item->progress_percent;
            if ($item->item_type === 'MANUFACTURE') {
                $outputManufacture += $item->target_qty * ($prog / 100.0);
                $targetManufacture += $item->target_qty;
            } elseif ($item->item_type === 'BUY_OUT') {
                $outputBuyout += $item->target_qty * ($prog / 100.0);
                $targetBuyout += $item->target_qty;
            } elseif ($item->item_type === 'SERVICE') {
                $outputService += $item->target_qty * ($prog / 100.0);
                $targetService += $item->target_qty;
            }
        }

        // 3. Active Risks
        $unresolvedAlerts = Alert::where('is_resolved', false)->get();
        $redRisks = $unresolvedAlerts->where('severity', 'RED')->count();
        $yellowRisks = $unresolvedAlerts->where('severity', 'YELLOW')->count();

        // 4. Average Delay (in Days)
        $delayedPos = Po::where('created_at', '>=', $startDate)
            ->with(['deliveryOrders'])
            ->get();
        $totalDelayDays = 0;
        $delayedCount = 0;

        foreach ($delayedPos as $po) {
            $deadline = Carbon::parse($po->global_deadline)->startOfDay();
            if ($po->status === 'COMPLETED') {
                $latestDoDate = $po->deliveryOrders->max('delivery_date');
                $completionDate = $latestDoDate ? Carbon::parse($latestDoDate)->startOfDay() : $po->updated_at->startOfDay();
                if ($completionDate->gt($deadline)) {
                    $totalDelayDays += $completionDate->diffInDays($deadline);
                    $delayedCount++;
                }
            } else {
                if (now()->startOfDay()->gt($deadline)) {
                    $totalDelayDays += now()->startOfDay()->diffInDays($deadline);
                    $delayedCount++;
                }
            }
        }
        $avgDelayDays = $delayedCount > 0 ? round($totalDelayDays / $delayedCount, 1) : 0.0;

        // 5. Why Delayed Breakdown
        $alertsQuery = Alert::where('created_at', '>=', $startDate)->get();
        $delayReasons = [
            'Machine Broken' => 0,
            'Material Shortage' => 0,
            'QC Rework' => 0,
            'Purchasing Lag' => 0,
            'Operator Absence' => 0,
            'Other' => 0,
        ];
        foreach ($alertsQuery as $alert) {
            $msg = strtolower($alert->message);
            if (str_contains($msg, 'machine') || str_contains($msg, 'mesin') || str_contains($msg, 'broken') || str_contains($msg, 'rusak')) {
                $delayReasons['Machine Broken']++;
            } elseif (str_contains($msg, 'material') || str_contains($msg, 'bahan') || str_contains($msg, 'shortage') || str_contains($msg, 'habis') || str_contains($msg, 'vendor')) {
                $delayReasons['Material Shortage']++;
            } elseif (str_contains($msg, 'rework') || str_contains($msg, 'reject') || str_contains($msg, 'qc')) {
                $delayReasons['QC Rework']++;
            } elseif (str_contains($msg, 'purchasing') || str_contains($msg, 'beli') || str_contains($msg, 'pembelian')) {
                $delayReasons['Purchasing Lag']++;
            } elseif (str_contains($msg, 'absent') || str_contains($msg, 'absen') || str_contains($msg, 'pekerja') || str_contains($msg, 'worker')) {
                $delayReasons['Operator Absence']++;
            } else {
                $delayReasons['Other']++;
            }
        }

        // 6. Production Trend Data (Completed Qty & Overdue PO count)
        $trendData = [];
        if ($range === 'week') {
            for ($i = 6; $i >= 0; $i--) {
                $date = now()->subDays($i);
                $start = (clone $date)->startOfDay();
                $end = (clone $date)->endOfDay();

                $output = ItemProgress::whereHas('item', function ($q) {
                    $q->where('item_type', 'MANUFACTURE');
                })
                    ->where('status', 'COMPLETED')
                    ->whereBetween('updated_at', [$start, $end])
                    ->sum('completed_qty');

                $overdue = Po::where('global_deadline', '<', $start->toDateString())
                    ->where(function ($query) use ($end) {
                        $query->where('status', '!=', 'COMPLETED')
                            ->orWhere('updated_at', '>', $end);
                    })->count();

                $trendData[] = [
                    'label' => $date->format('D'),
                    'output' => (int) $output,
                    'overdue' => (int) $overdue,
                ];
            }
        } elseif ($range === 'year') {
            for ($i = 11; $i >= 0; $i--) {
                $date = now()->subMonths($i);
                $start = (clone $date)->startOfMonth()->startOfDay();
                $end = (clone $date)->endOfMonth()->endOfDay();

                $output = ItemProgress::whereHas('item', function ($q) {
                    $q->where('item_type', 'MANUFACTURE');
                })
                    ->where('status', 'COMPLETED')
                    ->whereBetween('updated_at', [$start, $end])
                    ->sum('completed_qty');

                $overdue = Po::where('global_deadline', '<', $start->toDateString())
                    ->where(function ($query) use ($end) {
                        $query->where('status', '!=', 'COMPLETED')
                            ->orWhere('updated_at', '>', $end);
                    })->count();

                $trendData[] = [
                    'label' => $date->format('M'),
                    'output' => (int) $output,
                    'overdue' => (int) $overdue,
                ];
            }
        } else { // month
            for ($i = 3; $i >= 0; $i--) {
                $date = now()->subWeeks($i);
                $start = (clone $date)->startOfWeek()->startOfDay();
                $end = (clone $date)->endOfWeek()->endOfDay();

                $output = ItemProgress::whereHas('item', function ($q) {
                    $q->where('item_type', 'MANUFACTURE');
                })
                    ->where('status', 'COMPLETED')
                    ->whereBetween('updated_at', [$start, $end])
                    ->sum('completed_qty');

                $overdue = Po::where('global_deadline', '<', $start->toDateString())
                    ->where(function ($query) use ($end) {
                        $query->where('status', '!=', 'COMPLETED')
                            ->orWhere('updated_at', '>', $end);
                    })->count();

                $trendData[] = [
                    'label' => 'Wk '.(4 - $i),
                    'output' => (int) $output,
                    'overdue' => (int) $overdue,
                ];
            }
        }

        // 7. Bottleneck Stage Analyzer (Grouped by stage name)
        $stages = ItemProgress::select('stage_name')
            ->distinct()
            ->pluck('stage_name')
            ->toArray();

        // Ensure default/core stages are included if they aren't in the database yet
        $coreStages = ['Purchasing', 'CNC', 'Fabrication', 'QC', 'Delivery'];
        foreach ($coreStages as $cs) {
            if (! in_array($cs, $stages) && ! in_array(strtolower($cs), array_map('strtolower', $stages))) {
                $stages[] = $cs;
            }
        }

        $stageMetrics = [];
        foreach ($stages as $stage) {
            if (str_contains(strtolower($stage), 'rework')) {
                continue;
            }

            // Active Items (all stages not completed)
            $activeCount = ItemProgress::where('stage_name', $stage)
                ->where('status', '!=', 'COMPLETED')
                ->count();

            // Stuck Count: RED alerts on this stage
            $stuckCount = Alert::where('severity', 'RED')
                ->where('message', 'like', "%'{$stage}'%")
                ->count();

            // Rework Count: YELLOW alerts on this stage
            $reworkCount = Alert::where('severity', 'YELLOW')
                ->where('message', 'like', "%'{$stage}'%")
                ->count();

            // Average Cycle Time in days
            $completedStages = ItemProgress::where('stage_name', $stage)
                ->where('status', 'COMPLETED')
                ->whereNotNull('updated_at')
                ->get();

            $totalDays = 0.0;
            $completedCount = 0;
            foreach ($completedStages as $cs) {
                $created = Carbon::parse($cs->created_at);
                $updated = Carbon::parse($cs->updated_at);
                $totalDays += $updated->diffInHours($created) / 24.0;
                $completedCount++;
            }
            $avgCycleTime = $completedCount > 0 ? round($totalDays / $completedCount, 2) : 0.00;

            $stageMetrics[] = [
                'stage' => $stage,
                'active_items' => $activeCount,
                'stuck_count' => $stuckCount,
                'rework_count' => $reworkCount,
                'avg_cycle_time' => $avgCycleTime,
            ];
        }

        return [
            'otdr' => $otdr,
            'manufacture' => [
                'completed' => round($outputManufacture, 1),
                'target' => $targetManufacture,
            ],
            'buyout' => [
                'completed' => round($outputBuyout, 1),
                'target' => $targetBuyout,
            ],
            'service' => [
                'completed' => round($outputService, 1),
                'target' => $targetService,
            ],
            'risks' => [
                'red' => $redRisks,
                'yellow' => $yellowRisks,
            ],
            'avg_delay_days' => $avgDelayDays,
            'delay_reasons' => $delayReasons,
            'trend_data' => $trendData,
            'stage_metrics' => $stageMetrics,
        ];
    }

    public function updateProgress(Request $request, $slug, $progressId)
    {
        $request->validate([
            'completed_qty' => ['nullable', 'integer', 'min:0'],
            'progress_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        $item = $progress->item;

        if ($item->target_qty > 1) {
            $completedQty = $request->input('completed_qty', 0);
            // Cap completed quantity at target
            $completedQty = min($item->target_qty, $completedQty);
            $progressPercent = ($completedQty / $item->target_qty) * 100;
            $status = $completedQty >= $item->target_qty ? 'COMPLETED' : 'IN_PROGRESS';

            $progress->update([
                'completed_qty' => $completedQty,
                'progress_percent' => $progressPercent,
                'status' => $status,
            ]);
        } else {
            $progressPercent = $request->input('progress_percent', 0.00);
            $status = $progressPercent >= 100.00 ? 'COMPLETED' : 'IN_PROGRESS';

            $progress->update([
                'progress_percent' => $progressPercent,
                'status' => $status,
            ]);
        }

        return back()->with('success', 'Progress updated.');
    }

    public function reportKendala(Request $request, $slug, $progressId)
    {
        $request->validate([
            'kendala_type' => ['required', 'string'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        $progress->update(['status' => 'STUCK']);

        $item = $progress->item;
        $po = $item->po;

        // Save RED alert
        $alert = Alert::create([
            'tenant_id' => TenantManager::getTenantId(),
            'item_id' => $item->id,
            'severity' => 'RED',
            'message' => "Stuck: {$request->kendala_type} on stage '{$progress->stage_name}' for item '{$item->item_name}' (PO: {$po->po_number}).",
            'is_resolved' => false,
        ]);

        // Broadcast alert
        broadcast(new KendalaReported($alert))->toOthers();

        return back()->with('success', 'Kendala reported successfully.');
    }

    public function logQcRework(Request $request, $slug, $progressId)
    {
        $request->validate([
            'reject_qty' => ['required', 'integer', 'min:1'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        $item = $progress->item;
        $po = $item->po;

        // Spawn a rework stage: stage_name - REWORK
        $reworkStageName = $progress->stage_name.' - REWORK';

        $reworkProgress = ItemProgress::firstOrCreate([
            'tenant_id' => TenantManager::getTenantId(),
            'item_id' => $item->id,
            'stage_name' => $reworkStageName,
        ], [
            'completed_qty' => 0,
            'progress_percent' => 0.00,
            'status' => 'PENDING',
        ]);

        // Deduct rejected quantity/progress from original stage
        if ($item->target_qty > 1) {
            $progress->completed_qty = max(0, $progress->completed_qty - $request->reject_qty);
            $progress->progress_percent = ($progress->completed_qty / $item->target_qty) * 100;
            $progress->status = $progress->completed_qty >= $item->target_qty ? 'COMPLETED' : 'IN_PROGRESS';
            $progress->save();
        } else {
            $progress->progress_percent = 0.00;
            $progress->status = 'IN_PROGRESS';
            $progress->save();
        }

        // Update item status if it was completed or pending, back to in progress
        if ($item->status === 'COMPLETED') {
            $item->update(['status' => 'IN_PROGRESS']);
        }

        // Create a YELLOW alert
        Alert::create([
            'tenant_id' => TenantManager::getTenantId(),
            'item_id' => $item->id,
            'severity' => 'YELLOW',
            'message' => "QC Rework: {$request->reject_qty} items rejected on stage '{$progress->stage_name}' for item '{$item->item_name}' (PO: {$po->po_number}).",
            'is_resolved' => false,
        ]);

        return back()->with('success', 'QC Rework logged and Rework stage spawned.');
    }
}
