<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\DoItem;
use App\Models\Item;
use App\Models\ItemProgress;
use App\Models\Po;
use Carbon\Carbon;

/**
 * Worker/office dashboard analytics (OTDR, throughput, risk, client health,
 * finance strip). Extracted verbatim from WorkerDashboardController — read-only,
 * behavior-preserving. Business formulas unchanged.
 */
class TelemetryService
{
    public function forRange(string $range)
    {
        // ── Date range bounds ─────────────────────────────────────────────────
        [$startDate, $endDate] = $this->getRangeBounds($range);
        [$prevStartDate, $prevEndDate] = $this->getPreviousRangeBounds($range);

        // ── 1. On-Time Delivery Rate (OTDR) ──────────────────────────────────
        // Filter by global_deadline falling within the range (not created_at).
        // This means "Month" = POs that were *due* this month — the correct
        // question for a performance review.
        $otdr = $this->calcOtdr($startDate, $endDate);
        $prevOtdr = $this->calcOtdr($prevStartDate, $prevEndDate);

        // ── 2. Output Volumes ─────────────────────────────────────────────────
        // Migrated to native SQL to prevent OOM on large tenants.
        $deliveredManufacture = (float) \DB::table('do_items')
            ->join('items', 'do_items.item_id', '=', 'items.id')
            ->where('items.item_type', 'MANUFACTURE')
            ->whereNull('items.deleted_at')
            ->whereBetween('do_items.updated_at', [$startDate, $endDate])
            ->sum('do_items.delivered_qty');

        $targetManufacture = (int) Item::where('item_type', 'MANUFACTURE')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('target_qty');

        $outputBuyout = (float) Item::where('item_type', 'BUY_OUT')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum(\DB::raw('target_qty * (progress_percent / 100.0)'));

        $targetBuyout = (int) Item::where('item_type', 'BUY_OUT')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('target_qty');

        $outputService = (float) Item::where('item_type', 'SERVICE')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum(\DB::raw('target_qty * (progress_percent / 100.0)'));

        $targetService = (int) Item::where('item_type', 'SERVICE')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('target_qty');

        // Previous period manufacture for delta comparison
        $prevDeliveredManufacture = (float) \DB::table('do_items')
            ->join('items', 'do_items.item_id', '=', 'items.id')
            ->where('items.item_type', 'MANUFACTURE')
            ->whereNull('items.deleted_at')
            ->whereBetween('do_items.updated_at', [$prevStartDate, $prevEndDate])
            ->sum('do_items.delivered_qty');

        $prevTargetManufacture = (int) Item::where('item_type', 'MANUFACTURE')
            ->whereBetween('created_at', [$prevStartDate, $prevEndDate])
            ->sum('target_qty');

        // ── 3. Active Risks ───────────────────────────────────────────────────
        $unresolvedAlerts = Alert::where('is_resolved', false)->get();
        $redRisks = $unresolvedAlerts->where('severity', 'RED')->count();
        $yellowRisks = $unresolvedAlerts->where('severity', 'YELLOW')->count();

        // ── 4. Average Delay (in Days) ────────────────────────────────────────
        $avgDelayDays = $this->calcAvgDelay($startDate, $endDate);
        $prevAvgDelayDays = $this->calcAvgDelay($prevStartDate, $prevEndDate);

        // ── 5. Urgent POs count ───────────────────────────────────────────────
        $urgentActiveCount = Po::whereNotIn('status', ['COMPLETED', 'CANCELLED'])
            ->where('is_urgent', true)
            ->count();

        $delayedPosCount = Po::whereNotIn('status', ['COMPLETED', 'CANCELLED'])
            ->where('global_deadline', '<', now()->toDateString())
            ->count();

        // ── 6. Why Delayed Breakdown ──────────────────────────────────────────
        // Now uses reason_type enum column instead of keyword scanning.
        // Falls back to keyword scanning for legacy alerts without reason_type.
        $alertsInRange = Alert::where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate)
            ->get();

        $delayReasons = [
            'Machine Broken' => 0,
            'Material Delay' => 0,
            'QC Rework' => 0,
            'Power Outage' => 0,
            'Human Error' => 0,
            'Operator Sick' => 0,
            'Other' => 0,
        ];

        foreach ($alertsInRange as $alert) {
            if ($alert->reason_type) {
                // Structured path — accurate
                $key = match (true) {
                    str_contains($alert->reason_type, 'Machine') || str_contains($alert->reason_type, 'Mesin') => 'Machine Broken',
                    str_contains($alert->reason_type, 'Material') => 'Material Delay',
                    str_contains($alert->reason_type, 'Rework') || str_contains($alert->reason_type, 'QC') => 'QC Rework',
                    str_contains($alert->reason_type, 'Power') || str_contains($alert->reason_type, 'Listrik') => 'Power Outage',
                    str_contains($alert->reason_type, 'Human') || str_contains($alert->reason_type, 'Kesalahan') => 'Human Error',
                    str_contains($alert->reason_type, 'Sick') || str_contains($alert->reason_type, 'Sakit') => 'Operator Sick',
                    default => 'Other',
                };
                $delayReasons[$key]++;
            } else {
                // Legacy fallback — keyword scan for old alerts before migration
                $msg = strtolower($alert->message);
                if (str_contains($msg, 'machine') || str_contains($msg, 'mesin') || str_contains($msg, 'broken') || str_contains($msg, 'rusak')) {
                    $delayReasons['Machine Broken']++;
                } elseif (str_contains($msg, 'material') || str_contains($msg, 'bahan') || str_contains($msg, 'shortage') || str_contains($msg, 'habis') || str_contains($msg, 'vendor')) {
                    $delayReasons['Material Delay']++;
                } elseif (str_contains($msg, 'rework') || str_contains($msg, 'reject') || str_contains($msg, 'qc')) {
                    $delayReasons['QC Rework']++;
                } elseif (str_contains($msg, 'power') || str_contains($msg, 'listrik')) {
                    $delayReasons['Power Outage']++;
                } elseif (str_contains($msg, 'absent') || str_contains($msg, 'absen') || str_contains($msg, 'sakit') || str_contains($msg, 'sick')) {
                    $delayReasons['Operator Sick']++;
                } elseif (str_contains($msg, 'human') || str_contains($msg, 'error') || str_contains($msg, 'kesalahan')) {
                    $delayReasons['Human Error']++;
                } else {
                    $delayReasons['Other']++;
                }
            }
        }

        // ── 7. Production Trend Data ──────────────────────────────────────────
        $trendData = $this->buildTrendData($range);

        // ── 8. Bottleneck Stage Analyzer ──────────────────────────────────────
        $stageMapping = [
            'Drafter' => ['Design', 'Drafter', 'Drafting', 'Drawing', 'Gambar', 'Draft'],
            'Purchasing' => ['Material', 'Bahan', 'Purchasing', 'Vendor'],
            'Production' => ['Machining', 'Fabrication', 'CNC', 'Milling', 'Welder', 'Helper', 'Production', 'Fabrikasi'],
            'QC' => ['QC'],
            'Finance' => ['Delivery', 'Pengiriman', 'Finance', 'Billing'],
        ];

        $stageMetrics = [];
        foreach ($stageMapping as $targetStage => $sourceStages) {
            // Active items
            $activeCount = ItemProgress::whereIn('stage_name', $sourceStages)
                ->where('status', '!=', 'COMPLETED')
                ->count();

            // Stuck count
            $stuckCount = Alert::where('severity', 'RED')
                ->where(function ($q) use ($sourceStages) {
                    foreach ($sourceStages as $src) {
                        $q->orWhere('message', 'like', "%'{$src}'%");
                    }
                })
                ->count();

            // Rework count
            $reworkCount = Alert::where('severity', 'YELLOW')
                ->where(function ($q) use ($sourceStages) {
                    foreach ($sourceStages as $src) {
                        $q->orWhere('message', 'like', "%'{$src}'%");
                    }
                })
                ->count();

            // Completed stages average cycle time
            $completedStages = ItemProgress::whereIn('stage_name', $sourceStages)
                ->where('status', 'COMPLETED')
                ->whereBetween('updated_at', [$startDate, $endDate])
                ->get();

            $totalDays = 0.0;
            $completedCount = 0;
            foreach ($completedStages as $cs) {
                $created = Carbon::parse($cs->created_at);
                $updated = Carbon::parse($cs->updated_at);
                $totalDays += abs($updated->diffInHours($created)) / 24.0;
                $completedCount++;
            }
            $avgCycleTime = $completedCount > 0 ? round($totalDays / $completedCount, 2) : 0.00;

            $stageMetrics[] = [
                'stage' => $targetStage,
                'active_items' => $activeCount,
                'stuck_count' => $stuckCount,
                'rework_count' => $reworkCount,
                'avg_cycle_time' => $avgCycleTime,
            ];
        }

        // ── 9. Active Delayed & Stuck Items Directory ─────────────────────────
        $delayedItemsData = [];
        $allItemsData = [];
        $activeItems = Item::whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
            ->with(['po', 'itemProgresses', 'alerts'])
            ->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty')
            ->get();

        foreach ($activeItems as $item) {
            $po = $item->po;
            if (! $po) {
                continue;
            }

            $deadline = Carbon::parse($po->global_deadline)->startOfDay();
            $isOverdue = now()->startOfDay()->gt($deadline);

            $stuckProgress = $item->itemProgresses->firstWhere('status', 'STUCK');
            $stuckAlert = $item->alerts->first(fn ($a) => ! $a->is_resolved && $a->severity === 'RED');
            $reworkAlert = $item->alerts->first(fn ($a) => ! $a->is_resolved && $a->severity === 'YELLOW');

            if ($isOverdue || $stuckProgress || $stuckAlert || $reworkAlert) {
                $currentStage = null;
                $requiredStages = $item->required_stages ?? [];
                foreach ($requiredStages as $stage) {
                    $prog = $item->itemProgresses->firstWhere('stage_name', $stage);
                    if ($prog && $prog->status !== 'COMPLETED') {
                        $currentStage = $stage;
                        break;
                    }
                }

                if ($currentStage !== null) {
                    $stageLower = strtolower($currentStage);
                    if (in_array($stageLower, ['design', 'drafter', 'drafting', 'drawing', 'gambar', 'draft'])) {
                        $currentStage = 'Drafter';
                    } elseif (in_array($stageLower, ['material', 'bahan', 'purchasing', 'vendor'])) {
                        $currentStage = 'Purchasing';
                    } elseif (in_array($stageLower, ['machining', 'fabrication', 'cnc', 'milling', 'welder', 'helper', 'production', 'fabrikasi'])) {
                        $currentStage = 'Production';
                    } elseif ($stageLower === 'qc') {
                        $currentStage = 'QC';
                    } elseif (in_array($stageLower, ['delivery', 'pengiriman'])) {
                        $currentStage = 'Delivery';
                    }
                }

                $reason = 'Overdue';
                if ($stuckAlert) {
                    $reason = $stuckAlert->message;
                } elseif ($reworkAlert) {
                    $reason = $reworkAlert->message;
                } elseif ($stuckProgress) {
                    $reason = "Stuck on stage '{$stuckProgress->stage_name}'";
                }

                $daysOverdue = now()->startOfDay()->gt($deadline) ? abs(now()->startOfDay()->diffInDays($deadline)) : 0;

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
                    'current_stage' => $currentStage,
                    'po_status' => $po->status,
                    'invoice_status' => $item->invoice_status,
                    'payment_status' => $item->payment_status,
                    'target_qty' => (int) $item->target_qty,
                    'total_delivered_qty' => (int) $item->delivered_qty,
                ];
            }
        }

        // ── 9.5. Complete Items & POs Directory for Click-through Drilldown ─────
        $allItemsData = [];
        $allItems = Item::with(['po.deliveryOrders', 'itemProgresses', 'doItems', 'alerts'])
            ->withSum('doItems as do_items_sum_delivered_qty', 'delivered_qty')
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
                    ->orWhere(function ($sub) use ($startDate, $endDate) {
                        $sub->whereIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])
                            ->whereBetween('updated_at', [$startDate, $endDate]);
                    });
            })
            ->get();

        foreach ($allItems as $item) {
            $po = $item->po;
            if (! $po) {
                continue;
            }

            $isCompleted = $po->status === 'COMPLETED';
            $deadline = Carbon::parse($po->global_deadline)->startOfDay();

            // Calculate days overdue
            $daysOverdue = 0;
            if ($isCompleted) {
                $latestDoDate = $po->deliveryOrders->max('delivery_date');
                $completionDate = $latestDoDate ? Carbon::parse($latestDoDate)->startOfDay() : $po->updated_at->startOfDay();
                if ($completionDate->gt($deadline)) {
                    $daysOverdue = abs($completionDate->diffInDays($deadline));
                }
            } else {
                if (now()->startOfDay()->gt($deadline)) {
                    $daysOverdue = abs(now()->startOfDay()->diffInDays($deadline));
                }
            }

            // Determine current active stage
            $currentStage = null;
            if ($isCompleted && ($item->invoice_status === 'UNINVOICED' || $item->payment_status === 'UNPAID')) {
                $currentStage = 'Finance';
            } else {
                $requiredStages = $item->required_stages ?? [];
                foreach ($requiredStages as $stage) {
                    $prog = $item->itemProgresses->firstWhere('stage_name', $stage);
                    if ($prog && $prog->status !== 'COMPLETED') {
                        $currentStage = $stage;
                        break;
                    }
                }
                if ($currentStage !== null) {
                    $stageLower = strtolower($currentStage);
                    if (in_array($stageLower, ['design', 'drafter', 'drafting', 'drawing', 'gambar', 'draft'])) {
                        $currentStage = 'Drafter';
                    } elseif (in_array($stageLower, ['material', 'bahan', 'purchasing', 'vendor'])) {
                        $currentStage = 'Purchasing';
                    } elseif (in_array($stageLower, ['machining', 'fabrication', 'cnc', 'milling', 'welder', 'helper', 'production', 'fabrikasi'])) {
                        $currentStage = 'Production';
                    } elseif ($stageLower === 'qc') {
                        $currentStage = 'QC';
                    } elseif (in_array($stageLower, ['delivery', 'pengiriman'])) {
                        $currentStage = 'Delivery';
                    }
                }
            }

            // Determine if PO is completed on time
            $isOnTime = false;
            if ($isCompleted) {
                $latestDoDate = $po->deliveryOrders->max('delivery_date');
                if ($latestDoDate) {
                    $latestDo = Carbon::parse($latestDoDate)->startOfDay();
                    $isOnTime = $latestDo->lte($deadline);
                } else {
                    $isOnTime = $po->updated_at->startOfDay()->lte($deadline);
                }
            }

            // Get delay reason (if any)
            $reason = null;
            $reasonType = null;
            if ($daysOverdue > 0 || $currentStage === 'Finance') {
                $stuckProgress = $item->itemProgresses->firstWhere('status', 'STUCK');
                $stuckAlert = $item->alerts->first(fn ($a) => ! $a->is_resolved && $a->severity === 'RED');
                $reworkAlert = $item->alerts->first(fn ($a) => ! $a->is_resolved && $a->severity === 'YELLOW');

                if ($stuckAlert) {
                    $reason = $stuckAlert->message;
                    $activeAlert = $stuckAlert;
                } elseif ($reworkAlert) {
                    $reason = $reworkAlert->message;
                    $activeAlert = $reworkAlert;
                } elseif ($stuckProgress) {
                    $reason = "Stuck on stage '{$stuckProgress->stage_name}'";
                    $activeAlert = null;
                } elseif ($item->invoice_status === 'UNINVOICED') {
                    $reason = 'Uninvoiced';
                    $activeAlert = null;
                } elseif ($item->payment_status === 'UNPAID') {
                    $reason = 'Unpaid';
                    $activeAlert = null;
                } else {
                    $reason = 'Delayed';
                    $activeAlert = null;
                }

                if ($activeAlert) {
                    if ($activeAlert->reason_type) {
                        $reasonType = match (true) {
                            str_contains($activeAlert->reason_type, 'Machine') || str_contains($activeAlert->reason_type, 'Mesin') => 'Machine Broken',
                            str_contains($activeAlert->reason_type, 'Material') => 'Material Delay',
                            str_contains($activeAlert->reason_type, 'Rework') || str_contains($activeAlert->reason_type, 'QC') => 'QC Rework',
                            str_contains($activeAlert->reason_type, 'Power') || str_contains($activeAlert->reason_type, 'Listrik') => 'Power Outage',
                            str_contains($activeAlert->reason_type, 'Human') || str_contains($activeAlert->reason_type, 'Kesalahan') => 'Human Error',
                            str_contains($activeAlert->reason_type, 'Sick') || str_contains($activeAlert->reason_type, 'Sakit') => 'Operator Sick',
                            default => 'Other',
                        };
                    } else {
                        $msg = strtolower($activeAlert->message);
                        $reasonType = match (true) {
                            str_contains($msg, 'machine') || str_contains($msg, 'mesin') || str_contains($msg, 'broken') || str_contains($msg, 'rusak') => 'Machine Broken',
                            str_contains($msg, 'material') || str_contains($msg, 'bahan') || str_contains($msg, 'shortage') || str_contains($msg, 'habis') || str_contains($msg, 'vendor') => 'Material Delay',
                            str_contains($msg, 'rework') || str_contains($msg, 'reject') || str_contains($msg, 'qc') => 'QC Rework',
                            str_contains($msg, 'power') || str_contains($msg, 'listrik') => 'Power Outage',
                            str_contains($msg, 'absent') || str_contains($msg, 'absen') || str_contains($msg, 'sakit') || str_contains($msg, 'sick') => 'Operator Sick',
                            str_contains($msg, 'human') || str_contains($msg, 'error') || str_contains($msg, 'kesalahan') => 'Human Error',
                            default => 'Other',
                        };
                    }
                } elseif ($stuckProgress) {
                    $reasonType = 'Other';
                } elseif ($item->invoice_status === 'UNINVOICED') {
                    $reasonType = 'Uninvoiced';
                } elseif ($item->payment_status === 'UNPAID') {
                    $reasonType = 'Unpaid';
                }
            }

            // Determine manufactured completed quantity in range
            $deliveredQtyInRange = 0;
            if ($item->item_type === 'MANUFACTURE') {
                $deliveredQtyInRange = $item->doItems
                    ->filter(function ($doItem) use ($startDate, $endDate) {
                        return $doItem->updated_at >= $startDate && $doItem->updated_at <= $endDate;
                    })
                    ->sum('delivered_qty');
            }

            $allItemsData[] = [
                'id' => $item->id,
                'po_id' => $po->id,
                'po_number' => $po->po_number,
                'client_name' => $po->client_name,
                'item_name' => $item->item_name,
                'progress_percent' => (float) $item->progress_percent,
                'global_deadline' => $po->global_deadline->toDateString(),
                'days_overdue' => $daysOverdue,
                'reason' => $reason,
                'reason_type' => $reasonType,
                'status' => $item->status,
                'po_status' => $po->status,
                'is_urgent' => (bool) $po->is_urgent,
                'invoice_status' => $item->invoice_status,
                'payment_status' => $item->payment_status,
                'current_stage' => $currentStage,
                'is_on_time' => $isOnTime,
                'delivered_qty' => (int) $deliveredQtyInRange,
                'target_qty' => (int) $item->target_qty,
                'total_delivered_qty' => (int) $item->delivered_qty,
            ];
        }

        // ── 10. Client Health Scoreboard ──────────────────────────────────────
        $clientHealth = $this->buildClientHealth($startDate, $endDate);

        // ── 11. Finance Health Strip ──────────────────────────────────────────
        $uninvoicedCount = Item::where('invoice_status', 'UNINVOICED')
            ->whereHas('po', fn ($q) => $q->where('status', 'COMPLETED'))
            ->count();

        $unpaidCount = Item::where('payment_status', 'UNPAID')
            ->where('invoice_status', '!=', 'UNINVOICED')
            ->whereHas('po', fn ($q) => $q->where('status', 'COMPLETED'))
            ->count();

        return [
            'otdr' => $otdr,
            'manufacture' => [
                'delivered' => $deliveredManufacture,
                'completed' => $deliveredManufacture, // keep 'completed' key for backward-compat with existing frontend
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
            'delayed_pos_count' => $delayedPosCount,
            'urgent_active' => $urgentActiveCount,
            'delay_reasons' => $delayReasons,
            'trend_data' => $trendData,
            'stage_metrics' => $stageMetrics,
            'delayed_items' => $delayedItemsData,
            'all_items' => $allItemsData,
            'client_health' => $clientHealth,
            'finance_health' => [
                'uninvoiced_count' => $uninvoicedCount,
                'unpaid_count' => $unpaidCount,
            ],
            // Period comparison — same keys, previous period values
            'previous' => [
                'otdr' => $prevOtdr,
                'manufacture' => [
                    'delivered' => $prevDeliveredManufacture,
                    'target' => $prevTargetManufacture,
                ],
                'avg_delay_days' => $prevAvgDelayDays,
            ],
        ];
    }

    // ── Helper: date range bounds ─────────────────────────────────────────────

    private function getRangeBounds(string $range): array
    {
        return match ($range) {
            'week' => [now()->subDays(6)->startOfDay(), now()->endOfDay()],
            'year' => [now()->subDays(364)->startOfDay(), now()->endOfDay()],
            default => [now()->subDays(29)->startOfDay(), now()->endOfDay()], // month
        };
    }

    private function getPreviousRangeBounds(string $range): array
    {
        return match ($range) {
            'week' => [now()->subDays(13)->startOfDay(), now()->subDays(7)->endOfDay()],
            'year' => [now()->subDays(729)->startOfDay(), now()->subDays(365)->endOfDay()],
            default => [now()->subDays(59)->startOfDay(), now()->subDays(30)->endOfDay()], // prev month
        };
    }

    // ── Helper: OTDR for a given range ───────────────────────────────────────
    // Filters by global_deadline IN the range (not created_at).

    private function calcOtdr(Carbon $startDate, Carbon $endDate): ?float
    {
        $posInPeriod = Po::whereBetween('global_deadline', [$startDate->toDateString(), $endDate->toDateString()])
            ->where(function ($query) {
                $query->where('status', 'COMPLETED')
                    ->orWhere('global_deadline', '<', now()->toDateString());
            })
            ->with(['deliveryOrders'])
            ->get();

        $activeOverduePos = Po::whereNotIn('status', ['COMPLETED', 'CANCELLED'])
            ->where('global_deadline', '<', now()->toDateString())
            ->with(['deliveryOrders'])
            ->get();

        $evaluatedPos = $posInPeriod->merge($activeOverduePos)->unique('id');
        $totalConsidered = $evaluatedPos->count();
        $onTimeCount = 0;

        foreach ($evaluatedPos as $po) {
            $deadline = Carbon::parse($po->global_deadline)->startOfDay();
            if ($po->status === 'COMPLETED') {
                $latestDoDate = $po->deliveryOrders->max('delivery_date');
                if ($latestDoDate) {
                    $latestDo = Carbon::parse($latestDoDate)->startOfDay();
                    if ($latestDo->lte($deadline)) {
                        $onTimeCount++;
                    }
                } else {
                    if ($po->updated_at->startOfDay()->lte($deadline)) {
                        $onTimeCount++;
                    }
                }
            } else {
                // Active order with deadline past current date is overdue (failed on time delivery)
            }
        }

        return $totalConsidered > 0 ? round(($onTimeCount / $totalConsidered) * 100, 1) : null;
    }

    // ── Helper: Average Delay for a given range ───────────────────────────────

    private function calcAvgDelay(Carbon $startDate, Carbon $endDate): float
    {
        $delayedPos = Po::whereBetween('global_deadline', [$startDate->toDateString(), $endDate->toDateString()])
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
                    $totalDelayDays += abs($completionDate->diffInDays($deadline));
                    $delayedCount++;
                }
            } else {
                if (now()->startOfDay()->gt($deadline)) {
                    $totalDelayDays += abs(now()->startOfDay()->diffInDays($deadline));
                    $delayedCount++;
                }
            }
        }

        return $delayedCount > 0 ? round($totalDelayDays / $delayedCount, 1) : 0.0;
    }

    // ── Helper: Trend data ────────────────────────────────────────────────────

    private function buildTrendData(string $range): array
    {
        $trendData = [];

        if ($range === 'week') {
            for ($i = 6; $i >= 0; $i--) {
                $date = now()->subDays($i);
                $start = (clone $date)->startOfDay();
                $end = (clone $date)->endOfDay();

                $output = DoItem::whereHas('item', fn ($q) => $q->where('item_type', 'MANUFACTURE'))
                    ->whereBetween('updated_at', [$start, $end])
                    ->sum('delivered_qty');

                $overdue = Po::where('global_deadline', '<', $start->toDateString())
                    ->where(fn ($q) => $q->where('status', '!=', 'COMPLETED')->orWhere('updated_at', '>', $end))
                    ->count();

                $trendData[] = ['label' => $date->format('D'), 'output' => (int) $output, 'overdue' => (int) $overdue];
            }
        } elseif ($range === 'year') {
            for ($i = 11; $i >= 0; $i--) {
                $date = now()->subMonths($i);
                $start = (clone $date)->startOfMonth()->startOfDay();
                $end = (clone $date)->endOfMonth()->endOfDay();

                $output = DoItem::whereHas('item', fn ($q) => $q->where('item_type', 'MANUFACTURE'))
                    ->whereBetween('updated_at', [$start, $end])
                    ->sum('delivered_qty');

                $overdue = Po::where('global_deadline', '<', $start->toDateString())
                    ->where(fn ($q) => $q->where('status', '!=', 'COMPLETED')->orWhere('updated_at', '>', $end))
                    ->count();

                $trendData[] = ['label' => $date->format('M'), 'output' => (int) $output, 'overdue' => (int) $overdue];
            }
        } else { // month
            for ($i = 3; $i >= 0; $i--) {
                $date = now()->subWeeks($i);
                $start = (clone $date)->startOfWeek()->startOfDay();
                $end = (clone $date)->endOfWeek()->endOfDay();

                $output = DoItem::whereHas('item', fn ($q) => $q->where('item_type', 'MANUFACTURE'))
                    ->whereBetween('updated_at', [$start, $end])
                    ->sum('delivered_qty');

                $overdue = Po::where('global_deadline', '<', $start->toDateString())
                    ->where(fn ($q) => $q->where('status', '!=', 'COMPLETED')->orWhere('updated_at', '>', $end))
                    ->count();

                $trendData[] = ['label' => 'Wk '.(4 - $i), 'output' => (int) $output, 'overdue' => (int) $overdue];
            }
        }

        return $trendData;
    }

    // ── Helper: Client Health Scoreboard ─────────────────────────────────────

    private function buildClientHealth(Carbon $startDate, Carbon $endDate): array
    {
        $allPos = Po::with(['items.doItems', 'deliveryOrders'])->get();

        $clients = [];
        foreach ($allPos as $po) {
            $cn = $po->client_name;
            if (! isset($clients[$cn])) {
                $clients[$cn] = [
                    'client_name' => $cn,
                    'active_pos' => 0,
                    'completed_total' => 0,
                    'on_time_count' => 0,
                    'overdue_items' => 0,
                    'uninvoiced_count' => 0,
                    'unpaid_count' => 0,
                ];
            }

            if ($po->status !== 'COMPLETED') {
                $clients[$cn]['active_pos']++;

                // Count overdue items for this PO
                $deadline = Carbon::parse($po->global_deadline)->startOfDay();
                if (now()->startOfDay()->gt($deadline)) {
                    $overdueItems = $po->items->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'TERMINATED'])->count();
                    $clients[$cn]['overdue_items'] += $overdueItems;
                }
            } else {
                $clients[$cn]['completed_total']++;
                // On-time check
                $deadline = Carbon::parse($po->global_deadline)->startOfDay();
                $latestDoDate = $po->deliveryOrders->max('delivery_date');
                if ($latestDoDate) {
                    $latestDo = Carbon::parse($latestDoDate)->startOfDay();
                    if ($latestDo->lte($deadline)) {
                        $clients[$cn]['on_time_count']++;
                    }
                }
            }

            // Finance counts across all POs
            foreach ($po->items as $item) {
                if ($item->invoice_status === 'UNINVOICED' && $po->status === 'COMPLETED') {
                    $clients[$cn]['uninvoiced_count']++;
                }
                if ($item->payment_status === 'UNPAID' && $item->invoice_status !== 'UNINVOICED' && $po->status === 'COMPLETED') {
                    $clients[$cn]['unpaid_count']++;
                }
            }
        }

        // Build output with on_time_rate and risk_score for sorting
        $result = [];
        foreach ($clients as $data) {
            $onTimeRate = $data['completed_total'] > 0
                ? round(($data['on_time_count'] / $data['completed_total']) * 100, 0)
                : null; // null = no completed POs yet, can't compute

            $riskScore = $data['overdue_items'] * 3 + $data['uninvoiced_count'] + $data['unpaid_count'] * 2;

            $result[] = [
                'client_name' => $data['client_name'],
                'active_pos' => $data['active_pos'],
                'completed_total' => $data['completed_total'],
                'on_time_rate' => $onTimeRate,
                'overdue_items' => $data['overdue_items'],
                'uninvoiced_count' => $data['uninvoiced_count'],
                'unpaid_count' => $data['unpaid_count'],
                'risk_score' => $riskScore,
            ];
        }

        // Sort by risk score descending (highest risk first)
        usort($result, fn ($a, $b) => $b['risk_score'] <=> $a['risk_score']);

        return $result;
    }
}
