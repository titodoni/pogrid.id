import type { BadgeVariant } from '@astryxdesign/core';
import type { SubscriptionStatus } from '@/types';

/** Format integer cents (IDR) into a readable currency string. */
export function formatCents(cents: number | null | undefined): string {
    const value = (cents ?? 0) / 100;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
}

/** Format an ISO timestamp into a compact local date-time. */
export function formatDateTime(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

/** Format an ISO timestamp into a date only. */
export function formatDate(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
}

const ACTIVE_STATUSES = ['ACTIVE', 'PAID', 'SUBSCRIBED'];

/** Whether a subscription status permits mutations (fully active). */
export function isActiveStatus(status: SubscriptionStatus): boolean {
    return ACTIVE_STATUSES.includes(status);
}

/** Map a subscription status to a Badge variant. */
export function statusBadgeVariant(
    status: SubscriptionStatus,
    deletedAt?: string | null,
): BadgeVariant {
    if (deletedAt) {
        return 'neutral';
    }

    if (isActiveStatus(status)) {
        return 'success';
    }

    if (status === 'READONLY') {
        return 'warning';
    }

    return 'error';
}

/** Human label for a subscription status. */
export function statusLabel(
    status: SubscriptionStatus,
    deletedAt?: string | null,
): string {
    if (deletedAt) {
        return 'Terhapus';
    }

    return status;
}

/** Number formatting for large counts. */
export function formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('id-ID').format(value ?? 0);
}
