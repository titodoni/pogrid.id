<?php

namespace App\Services;

use App\Enums\ItemStatus;
use App\Enums\PoStatus;
use App\Models\DoItem;
use App\Models\Po;

class PoCompletionChecker
{
    /**
     * Check if all items in a PO are COMPLETED, and update PO status accordingly.
     */
    public static function checkCompletion(Po $po): void
    {
        if (in_array($po->status, PoStatus::terminalValues(), true)) {
            return;
        }

        $poItems = $po->items()->get();
        $allCompleted = true;
        $anyInProgress = false;

        foreach ($poItems as $poItem) {
            if (! in_array($poItem->status, [ItemStatus::Completed->value, ItemStatus::Cancelled->value, ItemStatus::Terminated->value], true)) {
                $allCompleted = false;
            }
            if (in_array($poItem->status, ItemStatus::startedValues(), true)) {
                $anyInProgress = true;
            }
        }

        if ($allCompleted && in_array($po->status, [PoStatus::Pending->value, PoStatus::InProgress->value], true)) {
            $po->update(['status' => PoStatus::Completed->value]);
        } elseif ($anyInProgress && $po->status === PoStatus::Pending->value) {
            $po->update(['status' => PoStatus::InProgress->value]);
        }
    }

    /**
     * Check if all items in a PO are DELIVERED, and update PO status accordingly.
     */
    public static function checkDelivery(Po $po): void
    {
        if (in_array($po->status, PoStatus::terminalValues(), true)) {
            return;
        }

        $allDelivered = true;
        foreach ($po->items()->get() as $poItem) {
            if ($poItem->status === ItemStatus::Cancelled->value || $poItem->status === ItemStatus::Terminated->value) {
                continue;
            }
            $deliveredSum = DoItem::where('item_id', $poItem->id)->sum('delivered_qty');
            if ($deliveredSum < $poItem->target_qty) {
                $allDelivered = false;
                break;
            }
        }

        if ($allDelivered) {
            $po->update(['status' => PoStatus::Delivered->value]);
        }
    }
}
