<?php

namespace App\Enums;

/**
 * Authoritative purchase-order lifecycle vocabulary (stored as strings in pos.status).
 *
 * PENDING → IN_PROGRESS → COMPLETED → DELIVERED → CLOSED
 * CANCELLED — terminal, excluded from completion/delivery checks
 */
enum PoStatus: string
{
    case Pending = 'PENDING';
    case InProgress = 'IN_PROGRESS';
    case Completed = 'COMPLETED';
    case Delivered = 'DELIVERED';
    case Closed = 'CLOSED';
    case Cancelled = 'CANCELLED';

    /**
     * Statuses from which a PO may no longer be auto-transitioned.
     *
     * @return array<int, string>
     */
    public static function terminalValues(): array
    {
        return [self::Cancelled->value, self::Closed->value, self::Delivered->value];
    }
}
