<?php

namespace App\Observers;

use App\Enums\ItemStatus;
use App\Models\ItemProgress;
use App\Services\ActivityLogger;
use App\Services\PoCompletionChecker;
use Illuminate\Support\Facades\DB;

class ItemProgressObserver
{
    public function updated(ItemProgress $itemProgress): void
    {
        // Real worker progress deltas (completed_qty / progress_percent changed).
        if ($itemProgress->wasChanged('completed_qty') || $itemProgress->wasChanged('progress_percent')) {
            ActivityLogger::logProgress($itemProgress);
        }
    }

    /**
     * Pre-production stage check against the authoritative keyword list
     * (config/workflow.php). Single source of truth — do not re-inline.
     */
    private function isPreProductionStage(string $stageName): bool
    {
        foreach (config('workflow.pre_production_keywords') as $keyword) {
            if (stripos($stageName, $keyword) !== false) {
                return true;
            }
        }

        return false;
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

            $productionStages = $stages->reject(function ($stage) {
                return $this->isPreProductionStage($stage->stage_name);
            });

            $requiredStages = is_array($item->required_stages) ? $item->required_stages : [];
            $productionStagesCount = 0;
            foreach ($requiredStages as $reqStage) {
                if (! $this->isPreProductionStage($reqStage)) {
                    $productionStagesCount++;
                }
            }

            if ($productionStagesCount > 0) {
                if ($item->target_qty > 1) {
                    $sumCompletedQty = $productionStages->sum('completed_qty');
                    $progressPercent = ($sumCompletedQty / ($item->target_qty * $productionStagesCount)) * 100;
                } else {
                    $sumProgressPercent = $productionStages->sum('progress_percent');
                    $progressPercent = $sumProgressPercent / $productionStagesCount;
                }
            } else {
                if ($item->target_qty > 1) {
                    $sumCompletedQty = $stages->sum('completed_qty');
                    $progressPercent = ($sumCompletedQty / ($item->target_qty * $totalStagesCount)) * 100;
                } else {
                    $sumProgressPercent = $stages->sum('progress_percent');
                    $progressPercent = $sumProgressPercent / $totalStagesCount;
                }
            }

            // Limit to 100% and map within valid bounds
            $progressPercent = min(100.00, max(0.00, $progressPercent));

            // Determine item status
            $status = $item->status;
            if ($status !== ItemStatus::Cancelled->value && $status !== ItemStatus::Terminated->value) {
                if ($progressPercent >= 100) {
                    $status = ItemStatus::Completed->value;
                } elseif ($progressPercent > 0) {
                    $status = ItemStatus::InProduction->value;
                } elseif ($stages->sum('progress_percent') > 0 || $stages->sum('completed_qty') > 0) {
                    $status = ItemStatus::InProgress->value;
                } else {
                    $status = ItemStatus::Pending->value;
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
