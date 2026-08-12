<?php

namespace App\Observers;

use App\Models\ItemProgress;
use App\Services\ActivityLogger;
use Illuminate\Support\Facades\DB;
use App\Services\PoCompletionChecker;

class ItemProgressObserver
{
    public function updated(ItemProgress $itemProgress): void
    {
        // Real worker progress deltas (completed_qty / progress_percent changed).
        if ($itemProgress->wasChanged('completed_qty') || $itemProgress->wasChanged('progress_percent')) {
            ActivityLogger::logProgress($itemProgress);
        }
    }

    public function saved(ItemProgress $itemProgress): void
    {
        DB::transaction(function () use ($itemProgress) {
            $item = $itemProgress->item()->lockForUpdate()->first();
            if (! $item) {
                return;
            }

            $stages = $item->itemProgresses()->get();
            $totalStagesCount = is_array($item->required_stages) ? count($item->required_stages) : 1;

            if ($totalStagesCount === 0) {
                return;
            }

            if ($item->target_qty > 1) {
                // Formula (Qty > 1): Item Progress (%) = (sum of completed_qty across all stages) / (target_qty * total checked stages) * 100
                $sumCompletedQty = $stages->sum('completed_qty');
                $progressPercent = ($sumCompletedQty / ($item->target_qty * $totalStagesCount)) * 100;
            } else {
                // Formula (Qty == 1): Item Progress (%) = (sum of progress_percent across all stages) / total checked stages
                $sumProgressPercent = $stages->sum('progress_percent');
                $progressPercent = $sumProgressPercent / $totalStagesCount;
            }

            // Limit to 100% and map within valid bounds
            $progressPercent = min(100.00, max(0.00, $progressPercent));

            // Determine item status
            $status = $item->status;
            if ($status !== 'CANCELLED' && $status !== 'TERMINATED') {
                if ($progressPercent >= 100) {
                    $status = 'COMPLETED';
                } elseif ($progressPercent > 0) {
                    $status = 'IN_PROGRESS';
                } else {
                    $status = 'PENDING';
                }
            }

            if ((float) $item->progress_percent !== (float) $progressPercent || $item->status !== $status) {
                $item->timestamps = false;
                $item->update([
                    'progress_percent' => $progressPercent,
                    'status' => $status,
                ]);

                // Also check and update parent PO status if needed
                $po = $item->po()->lockForUpdate()->first();
                if ($po) {
                    PoCompletionChecker::checkCompletion($po);
                }
            }
        });
    }
}
