<?php

namespace App\Http\Controllers;

use App\Events\KendalaReported;
use App\Models\Alert;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use App\Models\Post;
use App\Models\Role;
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
                ->with('roleRelation:id,name', 'postRelation:id,name')
                ->get(['id', 'name', 'role_id', 'post_id']);

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
        $user = auth()->user()->load('roleRelation', 'postRelation');
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized tenant access.');
        }

        // 4. Determine dashboard views by office vs floor roles division
        if ($user->role_level === 'office') {
            $pos = Po::with('items.itemProgresses')->get();
            $alerts = Alert::with('item')->where('is_resolved', false)->get();
            $users = User::with('roleRelation:id,name', 'postRelation:id,name')->get();
            $roles = Role::all(['id', 'name', 'display_name', 'level']);
            $posts = Post::all(['id', 'name', 'display_name']);

            $range = $request->input('range', 'month');
            if (! in_array($range, ['week', 'month', 'year'])) {
                $range = 'month';
            }
            $telemetry = $this->getTelemetryData($range);

            return Inertia::render('Owner/Dashboard', [
                'pos' => $pos,
                'alerts' => $alerts,
                'users' => $users,
                'roles' => $roles,
                'posts' => $posts,
                'tenant' => $tenant,
                'auth_user' => $user,
                'telemetry' => $telemetry,
                'selected_range' => $range,
            ]);
        }

        // Otherwise, render floor operators dashboard
        $query = Item::with(['itemProgresses', 'po', 'alerts' => function ($q) {
            $q->where('is_resolved', false);
        }]);

        if ($user->role_name === 'FINANCE') {
            $query->where(function ($q) {
                $q->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
                    ->orWhere(function ($sub) {
                        $sub->where('status', 'COMPLETED')
                            ->where(function ($subFinance) {
                                $subFinance->where('invoice_status', 'UNINVOICED')
                                    ->orWhere('payment_status', 'UNPAID');
                            });
                    });
            });
        } else {
            $query->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED']);
        }

        $items = $query->get();

        return Inertia::render('Worker/Dashboard', [
            'items' => $items,
            'auth_user' => $user,
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
        $user->load('roleRelation');
        if ($user->role_level !== 'office') {
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
        $coreStages = ['Purchasing', 'Machining', 'Fabrication', 'QC', 'Delivery'];
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

        // 8. Active Delayed & Stuck Items Directory
        $delayedItemsData = [];
        $activeItems = Item::whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
            ->with(['po', 'itemProgresses'])
            ->get();

        foreach ($activeItems as $item) {
            $po = $item->po;
            if (! $po) {
                continue;
            }

            $deadline = Carbon::parse($po->global_deadline)->startOfDay();
            $isOverdue = now()->startOfDay()->gt($deadline);

            // Check if there is an active stuck stage or active alert
            $stuckProgress = $item->itemProgresses->firstWhere('status', 'STUCK');
            $stuckAlert = Alert::where('item_id', $item->id)->where('is_resolved', false)->where('severity', 'RED')->first();
            $reworkAlert = Alert::where('item_id', $item->id)->where('is_resolved', false)->where('severity', 'YELLOW')->first();

            if ($isOverdue || $stuckProgress || $stuckAlert || $reworkAlert) {
                $reason = 'Overdue';
                if ($stuckAlert) {
                    $reason = $stuckAlert->message;
                } elseif ($reworkAlert) {
                    $reason = $reworkAlert->message;
                } elseif ($stuckProgress) {
                    $reason = "Stuck on stage '{$stuckProgress->stage_name}'";
                }

                $daysOverdue = now()->startOfDay()->gt($deadline) ? now()->startOfDay()->diffInDays($deadline) : 0;

                $delayedItemsData[] = [
                    'id' => $item->id,
                    'po_id' => $po->id,
                    'po_number' => $po->po_number,
                    'client_name' => $po->client_name,
                    'item_name' => $item->item_name,
                    'progress_percent' => (float) $item->progress_percent,
                    'global_deadline' => $po->global_deadline->toDateString(),
                    'days_overdue' => $daysOverdue,
                    'reason' => $reason,
                    'status' => $item->status,
                ];
            }
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
            'delayed_items' => $delayedItemsData,
        ];
    }

    public function updateProgress(Request $request, $slug, $progressId)
    {
        $request->validate([
            'completed_qty' => ['nullable', 'integer', 'min:0'],
            'progress_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        $this->validateStageAccess($progress, auth()->user());

        $item = $progress->item;
        $previousCompletedQty = $progress->completed_qty;
        $previousProgressPercent = $progress->progress_percent;

        $stageLower = strtolower($progress->stage_name);
        $isCustomStage = str_contains($stageLower, 'design') || str_contains($stageLower, 'gambar') || str_contains($stageLower, 'draft') ||
                          str_contains($stageLower, 'material') || str_contains($stageLower, 'bahan') || str_contains($stageLower, 'vendor') || str_contains($stageLower, 'purchasing');

        if ($isCustomStage) {
            $progressPercent = $request->input('progress_percent', 0.00);
            $completedQty = round($item->target_qty * ($progressPercent / 100));
            $status = $progressPercent >= 100.00 ? 'COMPLETED' : 'IN_PROGRESS';
            if ($progressPercent == 0.00) {
                $status = 'PENDING';
            }

            $progress->update([
                'completed_qty' => $completedQty,
                'progress_percent' => $progressPercent,
                'status' => $status,
                'previous_completed_qty' => $previousCompletedQty,
                'previous_progress_percent' => $previousProgressPercent,
            ]);
        } else {
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
                    'previous_completed_qty' => $previousCompletedQty,
                    'previous_progress_percent' => $previousProgressPercent,
                ]);
            } else {
                $progressPercent = $request->input('progress_percent', 0.00);
                $status = $progressPercent >= 100.00 ? 'COMPLETED' : 'IN_PROGRESS';

                $progress->update([
                    'progress_percent' => $progressPercent,
                    'status' => $status,
                    'previous_completed_qty' => $previousCompletedQty,
                    'previous_progress_percent' => $previousProgressPercent,
                ]);
            }
        }

        // Auto-resolve any active RED alerts for this stage since it is now active/updating
        Alert::where('item_id', $item->id)
            ->where('is_resolved', false)
            ->where('severity', 'RED')
            ->where('message', 'like', "%on stage '{$progress->stage_name}'%")
            ->update(['is_resolved' => true]);

        // When the 'Delivery' stage progress is updated, automatically create/update a DeliveryOrder and corresponding DoItem
        $stageNameLower = strtolower($progress->stage_name);
        if (str_contains($stageNameLower, 'delivery') || str_contains($stageNameLower, 'pengiriman')) {
            $po = $item->po;
            $deliveryOrder = DeliveryOrder::updateOrCreate([
                'tenant_id' => $item->tenant_id,
                'po_id' => $item->po_id,
                'do_number' => 'DO-'.$po->po_number,
            ], [
                'delivery_date' => now()->toDateString(),
            ]);

            $deliveredQty = $item->target_qty > 1
                ? $progress->completed_qty
                : ($progress->progress_percent >= 100.00 ? 1 : 0);

            DoItem::updateOrCreate([
                'delivery_order_id' => $deliveryOrder->id,
                'item_id' => $item->id,
            ], [
                'delivered_qty' => $deliveredQty,
            ]);
        }

        return back()->with('success', 'Progress updated.');
    }

    public function cancelLastUpdate(Request $request, $slug, $progressId)
    {
        $progress = ItemProgress::findOrFail($progressId);
        $this->validateStageAccess($progress, auth()->user());

        if ($progress->previous_completed_qty === null && $progress->previous_progress_percent === null) {
            return back()->with('error', 'No previous progress update to cancel.');
        }

        $prevQty = $progress->previous_completed_qty ?? 0;
        $prevPercent = $progress->previous_progress_percent ?? 0.00;

        $item = $progress->item;
        $status = 'IN_PROGRESS';
        if ($item->target_qty > 1) {
            if ($prevQty >= $item->target_qty) {
                $status = 'COMPLETED';
            } elseif ($prevQty == 0) {
                $status = 'PENDING';
            }
        } else {
            if ($prevPercent >= 100.00) {
                $status = 'COMPLETED';
            } elseif ($prevPercent == 0.00) {
                $status = 'PENDING';
            }
        }

        $progress->update([
            'completed_qty' => $prevQty,
            'progress_percent' => $prevPercent,
            'status' => $status,
            'previous_completed_qty' => null,
            'previous_progress_percent' => null,
        ]);

        // Revert DO Item Qty if it was a Delivery stage
        $stageNameLower = strtolower($progress->stage_name);
        if (str_contains($stageNameLower, 'delivery') || str_contains($stageNameLower, 'pengiriman')) {
            $deliveryOrder = DeliveryOrder::where('po_id', $item->po_id)->first();
            if ($deliveryOrder) {
                $deliveredQty = $item->target_qty > 1
                    ? $prevQty
                    : ($prevPercent >= 100.00 ? 1 : 0);

                DoItem::updateOrCreate([
                    'delivery_order_id' => $deliveryOrder->id,
                    'item_id' => $item->id,
                ], [
                    'delivered_qty' => $deliveredQty,
                ]);
            }
        }

        return back()->with('success', 'Last progress update reverted successfully.');
    }

    public function reportKendala(Request $request, $slug, $progressId)
    {
        $request->validate([
            'kendala_type' => ['required', 'string'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $progress = ItemProgress::findOrFail($progressId);
        $this->validateStageAccess($progress, auth()->user());

        $progress->update(['status' => 'STUCK']);

        $item = $progress->item;
        $po = $item->po;

        $note = $request->input('note');
        $noteText = $note ? " (Note: {$note})" : '';

        // Save RED alert
        $alert = Alert::create([
            'tenant_id' => TenantManager::getTenantId(),
            'item_id' => $item->id,
            'severity' => 'RED',
            'message' => "Stuck: {$request->kendala_type} on stage '{$progress->stage_name}' for item '{$item->item_name}' (PO: {$po->po_number}){$noteText}.",
            'is_resolved' => false,
        ]);

        // Broadcast alert
        broadcast(new KendalaReported($alert))->toOthers();

        return back()->with('success', 'Kendala reported successfully.');
    }

    public function listTroubles(Request $request, $slug)
    {
        // 1. Resolve tenant context by slug
        TenantManager::bypass();
        $tenant = Tenant::where('slug', $slug)->first();
        if (! $tenant) {
            abort(404, 'Tenant not found.');
        }
        TenantManager::enableScope();
        TenantManager::setTenantId($tenant->id);

        if (! auth()->check()) {
            return redirect()->route('worker.dashboard', ['slug' => $slug]);
        }

        $user = auth()->user();
        if ($user->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized tenant access.');
        }

        // Fetch all alerts for this tenant (resolved and unresolved)
        $alerts = Alert::with(['item.po'])
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Worker/TroubleReports', [
            'alerts' => $alerts,
            'auth_user' => $user,
            'tenant' => $tenant,
        ]);
    }

    public function logQcRework(Request $request, $slug, $progressId)
    {
        $request->validate([
            'reject_qty' => ['required', 'integer', 'min:1'],
        ]);

        $user = auth()->user()->load('roleRelation');
        if ($user->role_level !== 'office' && $user->role_name !== 'QC') {
            abort(403, 'Forbidden: Only QC inspectors can log rework.');
        }

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

    public function updateDrafterStatus(Request $request, $slug, $itemId)
    {
        $request->validate([
            'drafter_status' => ['required', 'string', 'in:DRAWING,APPROVED'],
        ]);

        $user = auth()->user()->load('roleRelation');
        $userRoleName = $user->role_name;

        if ($user->role_level !== 'office' && $userRoleName !== 'DRAFTER') {
            abort(403, 'Forbidden: Only Drafters can update drafter status.');
        }

        $item = Item::findOrFail($itemId);
        $item->update(['drafter_status' => $request->drafter_status]);

        if ($request->drafter_status === 'APPROVED') {
            ItemProgress::where('item_id', $item->id)
                ->where(function ($q) {
                    $q->where('stage_name', 'like', '%Design%')
                        ->orWhere('stage_name', 'like', '%DESIGN%')
                        ->orWhere('stage_name', 'like', '%Gambar%')
                        ->orWhere('stage_name', 'like', '%gambar%')
                        ->orWhere('stage_name', 'like', '%Draft%')
                        ->orWhere('stage_name', 'like', '%draft%');
                })
                ->update([
                    'completed_qty' => $item->target_qty,
                    'progress_percent' => 100.00,
                    'status' => 'COMPLETED',
                ]);
        }

        return back()->with('success', 'Drafter status updated.');
    }

    public function updatePurchasingStatus(Request $request, $slug, $itemId)
    {
        $request->validate([
            'purchasing_status' => ['required', 'string', 'in:ORDER,PROSES,READY'],
        ]);

        $user = auth()->user()->load('roleRelation');

        if ($user->role_level !== 'office' && $user->role_name !== 'PURCHASING') {
            abort(403, 'Forbidden: Only Purchasing agents can update purchasing status.');
        }

        $item = Item::findOrFail($itemId);
        $item->update(['purchasing_status' => $request->purchasing_status]);

        if ($request->purchasing_status === 'READY') {
            ItemProgress::where('item_id', $item->id)
                ->where(function ($q) {
                    $q->where('stage_name', 'like', '%Material%')
                        ->orWhere('stage_name', 'like', '%MATERIAL%')
                        ->orWhere('stage_name', 'like', '%Bahan%')
                        ->orWhere('stage_name', 'like', '%bahan%');
                })
                ->update([
                    'completed_qty' => $item->target_qty,
                    'progress_percent' => 100.00,
                    'status' => 'COMPLETED',
                ]);
        }

        return back()->with('success', 'Purchasing status updated.');
    }

    public function updateFinanceStatus(Request $request, $slug, $itemId)
    {
        $request->validate([
            'invoice_status' => ['required', 'string'],
            'payment_status' => ['required', 'string'],
        ]);

        $user = auth()->user()->load('roleRelation');
        if ($user->role_level !== 'office' && $user->role_name !== 'FINANCE') {
            abort(403, 'Forbidden: Only Finance controllers can update finance status.');
        }

        $item = Item::findOrFail($itemId);

        // Ensure Delivery stage status is 'COMPLETED' first
        $deliveryProgress = ItemProgress::where('item_id', $itemId)
            ->where(function ($query) {
                $query->where('stage_name', 'Delivery')
                    ->orWhere('stage_name', 'Pengiriman');
            })
            ->first();

        if (! $deliveryProgress || $deliveryProgress->completed_qty <= 0) {
            abort(403, 'Stage locked: Finance status cannot be updated until at least one item has been delivered.');
        }

        $item->update([
            'invoice_status' => $request->invoice_status,
            'payment_status' => $request->payment_status,
        ]);

        return back()->with('success', 'Finance status updated.');
    }

    private function validateStageAccess(ItemProgress $progress, User $user): void
    {
        $user->loadMissing('roleRelation');
        $roleName = $user->role_name;
        $isOffice = $user->role_level === 'office';

        // 1. Role validation check
        if (! $isOffice) {
            $stageLower = strtolower($progress->stage_name);
            if (str_contains($stageLower, 'design') || str_contains($stageLower, 'gambar') || str_contains($stageLower, 'draft')) {
                if ($roleName !== 'DRAFTER') {
                    abort(403, 'Stage locked: Only Drafters can update this stage.');
                }
            } elseif (str_contains($stageLower, 'material') || str_contains($stageLower, 'bahan')) {
                if ($roleName !== 'PURCHASING') {
                    abort(403, 'Stage locked: Only Purchasing agents can update this stage.');
                }
            } elseif (str_contains($stageLower, 'machining') || str_contains($stageLower, 'cnc')) {
                if ($roleName !== 'MACHINING' && $roleName !== 'CNC' && $roleName !== 'PRODUCTION') {
                    abort(403, 'Stage locked: Only Machining/CNC operators can update this stage.');
                }
            } elseif (str_contains($stageLower, 'fabrication') || str_contains($stageLower, 'fabrikasi')) {
                if ($roleName !== 'FABRICATION' && $roleName !== 'PRODUCTION') {
                    abort(403, 'Stage locked: Only Fabrication operators can update this stage.');
                }
            } elseif (str_contains($stageLower, 'vendor') || str_contains($stageLower, 'purchasing')) {
                if ($roleName !== 'PURCHASING') {
                    abort(403, 'Stage locked: Only Purchasing agents can update this stage.');
                }
            } elseif (str_contains($stageLower, 'qc')) {
                if ($roleName !== 'QC') {
                    abort(403, 'Stage locked: Only QC inspectors can update this stage.');
                }
            } elseif (str_contains($stageLower, 'delivery') || str_contains($stageLower, 'pengiriman')) {
                if ($roleName !== 'DELIVERY') {
                    abort(403, 'Stage locked: Only Delivery couriers can update this stage.');
                }
            }
        }

        $item = $progress->item;
        if (! $item) {
            return;
        }

        $requiredStages = $item->required_stages ?? [];
        $isVendorChecked = in_array('Vendor', $requiredStages);
        $isMachiningChecked = in_array('Machining', $requiredStages) || in_array('CNC', $requiredStages);
        $isFabricationChecked = in_array('Fabrication', $requiredStages) || in_array('FABRICATION', $requiredStages) || in_array('FABRIKASI', $requiredStages);
        $stageNameLower = strtolower($progress->stage_name);

        // 2. Off-state locks and workflow locks
        if (! $isOffice) {
            if ($isVendorChecked) {
                if (str_contains($stageNameLower, 'machining') ||
                    str_contains($stageNameLower, 'fabrication') || str_contains($stageNameLower, 'fabrikasi') ||
                    str_contains($stageNameLower, 'qc') ||
                    str_contains($stageNameLower, 'delivery') || str_contains($stageNameLower, 'pengiriman')) {
                    abort(403, 'Stage locked: This is a Vendor job, so other production stages are locked.');
                }
            }

            if ($isMachiningChecked && ! $isFabricationChecked) {
                if (str_contains($stageNameLower, 'fabrication') || str_contains($stageNameLower, 'fabrikasi')) {
                    abort(403, 'Stage locked: Fabrication is not required/checked for this item.');
                }
            }

            if ($isFabricationChecked && ! $isMachiningChecked) {
                if (str_contains($stageNameLower, 'machining')) {
                    abort(403, 'Stage locked: Machining is not required/checked for this item.');
                }
            }

            // Delivery stage update lockout
            if (str_contains($stageNameLower, 'delivery') || str_contains($stageNameLower, 'pengiriman')) {
                $qcProgress = ItemProgress::where('item_id', $item->id)
                    ->where('stage_name', 'QC')
                    ->first();
                if (! $qcProgress || ($qcProgress->completed_qty <= 0 && $qcProgress->progress_percent <= 0)) {
                    abort(403, 'Stage locked: Delivery cannot be updated until QC stage has completed quantities.');
                }
            }
        }
    }
}
