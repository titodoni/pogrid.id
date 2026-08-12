<?php

namespace App\Services;

use App\Models\Po;
use App\Models\DoItem;

class PoCompletionChecker
{
    /**
     * Check if all items in a PO are COMPLETED, and update PO status accordingly.
     */
    public static function checkCompletion(Po $po): void
    {
        if ($po->status === 'CANCELLED' || $po->status === 'CLOSED' || $po->status === 'DELIVERED') {
            return;
        }

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

        if ($allCompleted && in_array($po->status, ['PENDING', 'IN_PROGRESS'])) {
            $po->update(['status' => 'COMPLETED']);
        } elseif ($anyInProgress && $po->status === 'PENDING') {
            $po->update(['status' => 'IN_PROGRESS']);
        }
    }

    /**
     * Check if all items in a PO are DELIVERED, and update PO status accordingly.
     */
    public static function checkDelivery(Po $po): void
    {
        if ($po->status === 'DELIVERED' || $po->status === 'CLOSED' || $po->status === 'CANCELLED') {
            return;
        }

        $allDelivered = true;
        foreach ($po->items()->get() as $poItem) {
            if ($poItem->status === 'CANCELLED' || $poItem->status === 'TERMINATED') {
                continue;
            }
            $deliveredSum = DoItem::where('item_id', $poItem->id)->sum('delivered_qty');
            if ($deliveredSum < $poItem->target_qty) {
                $allDelivered = false;
                break;
            }
        }

        if ($allDelivered) {
            $po->update(['status' => 'DELIVERED']);
        }
    }
}
