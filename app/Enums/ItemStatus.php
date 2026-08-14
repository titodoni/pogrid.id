<?php

namespace App\Enums;

/**
 * Authoritative item lifecycle vocabulary (stored as strings in items.status).
 *
 * PENDING       — no progress logged
 * IN_PROGRESS   — only pre-production stages (design/material/purchasing) have progress
 * IN_PRODUCTION — production-stage progress > 0%
 * COMPLETED     — 100% progress
 * DELIVERED     — fully delivered
 * CANCELLED     — cancelled at 0% progress
 * TERMINATED    — stopped after progress > 0% (sunk cost)
 */
enum ItemStatus: string
{
    case Pending = 'PENDING';
    case InProgress = 'IN_PROGRESS';
    case InProduction = 'IN_PRODUCTION';
    case Completed = 'COMPLETED';
    case Delivered = 'DELIVERED';
    case Cancelled = 'CANCELLED';
    case Terminated = 'TERMINATED';

    /**
     * Statuses that mean "work has started" (drives PO PENDING → IN_PROGRESS).
     *
     * @return array<int, string>
     */
    public static function startedValues(): array
    {
        return [self::InProgress->value, self::InProduction->value];
    }
}
