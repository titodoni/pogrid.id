<?php

namespace App\Observers;

use App\Models\ItemProgress;

class ItemProgressObserver
{
    public function saved(ItemProgress $itemProgress): void
    {
        $item = $itemProgress->item;
        if (!$item) {
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

        if ((float)$item->progress_percent !== (float)$progressPercent || $item->status !== $status) {
            $item->timestamps = false;
            $item->update([
                'progress_percent' => $progressPercent,
                'status' => $status,
            ]);

            // Also check and update parent PO status if needed
            $po = $item->po;
            if ($po && $po->status !== 'CANCELLED') {
                $poStatus = $po->status;
                $poItems = $po->items()->get();
                $allCompleted = true;
                $anyInProgress = false;

                foreach ($poItems as $poItem) {
                    if ($poItem->status !== 'COMPLETED' && $poItem->status !== 'CANCELLED' && $poItem->status !== 'TERMINATED') {
                        $allCompleted = false;
                    }
                    if ($poItem->status === 'IN_PROGRESS') {
                        $anyInProgress = true;
                    }
                }

                // Note: Delivery Order completes the PO completely, but we can set IN_PROGRESS if items start
                if ($anyInProgress && $poStatus === 'PENDING') {
                    $po->update(['status' => 'IN_PROGRESS']);
                }
            }
        }
    }
}
