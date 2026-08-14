<?php

namespace App\Observers;

use App\Models\DoItem;
use App\Services\PoCompletionChecker;
use Illuminate\Support\Facades\DB;

class DoItemObserver
{
    public function saved(DoItem $doItem): void
    {
        DB::transaction(function () use ($doItem) {
            $item = $doItem->item()->lockForUpdate()->first();
            if (! $item) {
                return;
            }

            // Recalculate and update item delivery status
            $itemDeliveredSum = DoItem::where('item_id', $item->id)->sum('delivered_qty');
            $deliveryStatus = 'PENDING';
            if ($itemDeliveredSum >= $item->target_qty) {
                $deliveryStatus = 'DELIVERED';
            } elseif ($itemDeliveredSum > 0) {
                $deliveryStatus = 'PARTIAL';
            }

            $item->timestamps = false;
            $item->update(['delivery_status' => $deliveryStatus]);

            $po = $item->po()->lockForUpdate()->first();
            if ($po) {
                PoCompletionChecker::checkDelivery($po);
            }
        });
    }
}
