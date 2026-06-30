<?php

namespace App\Observers;

use App\Models\DoItem;

class DoItemObserver
{
    public function saved(DoItem $doItem): void
    {
        $item = $doItem->item;
        if (! $item) {
            return;
        }
        $po = $item->po;
        if (! $po) {
            return;
        }

        // Sum of delivered_qty == target_qty triggers PO completion
        $allDelivered = true;
        foreach ($po->items()->get() as $poItem) {
            if ($poItem->status === 'CANCELLED' || $poItem->status === 'TERMINATED') {
                continue; // Cancelled or terminated items don't block PO completion
            }
            $deliveredSum = DoItem::where('item_id', $poItem->id)->sum('delivered_qty');
            if ($deliveredSum < $poItem->target_qty) {
                $allDelivered = false;
                break;
            }
        }

        if ($allDelivered && $po->status !== 'COMPLETED') {
            $po->update(['status' => 'COMPLETED']);
        }
    }
}
