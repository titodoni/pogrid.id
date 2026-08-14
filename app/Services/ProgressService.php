<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Models\Item;
use App\Models\ItemProgress;
use Illuminate\Support\Facades\DB;

/**
 * Worker progress write pipelines, extracted verbatim from
 * WorkerDashboardController (updateProgress / cancelLastUpdate).
 * Behavior-preserving: same formulas, same status mapping, same side effects.
 * All public write operations are atomic (DB::transaction).
 */
class ProgressService
{
    /**
     * Apply a worker progress delta (additive qty or percent) to a stage.
     *
     * @param  array{completed_qty?: mixed, progress_percent?: mixed}  $data
     */
    public function applyUpdate(ItemProgress $progress, array $data): Item
    {
        return DB::transaction(function () use ($progress, $data) {
            $item = $progress->item;
            $previousCompletedQty = $progress->completed_qty;
            $previousProgressPercent = $progress->progress_percent;

            $stageLower = strtolower($progress->stage_name);
            $isCustomStage = StageGate::isPreProductionStage($stageLower);

            if ($isCustomStage) {
                $progressPercent = $data['progress_percent'] ?? 0.00;
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

                // Sync item status attribute
                if (str_contains($stageLower, 'design') || str_contains($stageLower, 'gambar') || str_contains($stageLower, 'draft')) {
                    $item->update([
                        'drafter_status' => $progressPercent >= 100.00 ? 'APPROVED' : ($progressPercent > 0 ? 'DRAWING' : null),
                    ]);
                } elseif (str_contains($stageLower, 'material') || str_contains($stageLower, 'bahan') || str_contains($stageLower, 'vendor') || str_contains($stageLower, 'purchasing')) {
                    $item->update([
                        'purchasing_status' => $progressPercent >= 100.00 ? 'READY' : ($progressPercent >= 66.00 ? 'PROSES' : ($progressPercent >= 33.00 ? 'ORDER' : null)),
                    ]);
                }
            } else {
                if ($item->target_qty > 1) {
                    $inputQty = (int) ($data['completed_qty'] ?? 0);
                    $completedQty = $progress->completed_qty + $inputQty;

                    // Determine maximum allowed quantity for this stage
                    $maxAllowed = $item->target_qty;
                    if (str_contains($stageLower, 'delivery') || str_contains($stageLower, 'pengiriman')) {
                        $qcProgress = ItemProgress::where('item_id', $item->id)
                            ->where('stage_name', 'QC')
                            ->first();
                        if ($qcProgress) {
                            $maxAllowed = $qcProgress->completed_qty;
                        }
                    }

                    // Cap completed quantity
                    $completedQty = min($maxAllowed, $completedQty);
                    $progressPercent = ($completedQty / $item->target_qty) * 100;
                    $status = $completedQty >= $item->target_qty ? 'COMPLETED' : 'IN_PROGRESS';
                    if ($completedQty == 0) {
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
                    $progressPercent = $data['progress_percent'] ?? 0.00;
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
            if (str_contains($stageLower, 'delivery') || str_contains($stageLower, 'pengiriman')) {
                $po = $item->po;
                $deliveryOrder = DeliveryOrder::updateOrCreate([
                    'tenant_id' => $item->tenant_id,
                    'po_id' => $item->po_id,
                    'do_number' => 'DO-'.$po->po_number,
                ], [
                    'delivery_date' => now()->toDateString(),
                ]);

                $deliveredQtyUpdate = $item->target_qty > 1
                    ? (int) ($data['completed_qty'] ?? 0)
                    : ($progress->progress_percent >= 100.00 ? 1 : 0);

                $existing = DoItem::where('delivery_order_id', $deliveryOrder->id)
                    ->where('item_id', $item->id)->first();

                if ($item->target_qty === 1 && $existing && $existing->delivered_qty >= 1) {
                    $deliveredQtyUpdate = 0;
                }

                $newTotal = min($item->target_qty, ($existing->delivered_qty ?? 0) + $deliveredQtyUpdate);

                DoItem::updateOrCreate([
                    'delivery_order_id' => $deliveryOrder->id,
                    'item_id' => $item->id,
                ], [
                    'delivered_qty' => $newTotal,
                ]);
            }

            return $item;
        });
    }

    /**
     * Revert a stage to its previous_* snapshot (single undo step).
     */
    public function revertLast(ItemProgress $progress): Item
    {
        return DB::transaction(function () use ($progress) {
            $prevQty = $progress->previous_completed_qty ?? 0;
            $prevPercent = $progress->previous_progress_percent ?? 0.00;

            $item = $progress->item;
            $status = 'IN_PROGRESS';

            $stageLower = strtolower($progress->stage_name);
            $isCustomStage = StageGate::isPreProductionStage($stageLower);

            if ($isCustomStage) {
                if ($prevPercent >= 100.00) {
                    $status = 'COMPLETED';
                } elseif ($prevPercent == 0.00) {
                    $status = 'PENDING';
                } else {
                    $status = 'IN_PROGRESS';
                }
            } else {
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
            }

            $progress->update([
                'completed_qty' => $prevQty,
                'progress_percent' => $prevPercent,
                'status' => $status,
                'previous_completed_qty' => null,
                'previous_progress_percent' => null,
            ]);

            // Revert drafter_status on item if it's Design stage
            if (str_contains($stageLower, 'design') || str_contains($stageLower, 'gambar') || str_contains($stageLower, 'draft')) {
                $item->update([
                    'drafter_status' => $prevPercent >= 100.00 ? 'APPROVED' : ($prevPercent > 0 ? 'DRAWING' : null),
                ]);
            }

            // Revert purchasing_status on item if it's Material stage
            if (str_contains($stageLower, 'material') || str_contains($stageLower, 'bahan') || str_contains($stageLower, 'vendor') || str_contains($stageLower, 'purchasing')) {
                $item->update([
                    'purchasing_status' => $prevPercent >= 100.00 ? 'READY' : ($prevPercent >= 66.00 ? 'PROSES' : ($prevPercent >= 33.00 ? 'ORDER' : null)),
                ]);
            }

            // Revert DO Item Qty if it was a Delivery stage
            if (str_contains($stageLower, 'delivery') || str_contains($stageLower, 'pengiriman')) {
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

            return $item;
        });
    }
}
