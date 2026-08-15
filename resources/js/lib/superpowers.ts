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

/** Format an ISO timestamp into dd/mm/yyyy HH:mm. */
export function formatDateTime(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');

    return `${d}/${m}/${y} ${hh}:${mm}`;
}

/** Format an ISO timestamp into dd/mm/yyyy. */
export function formatDate(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();

    return `${d}/${m}/${y}`;
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

    return 'warning';
}

/** Human label for the 2 simple subscription statuses: Demo 30 Hari vs Langganan 1 Tahun. */
export function statusLabel(
    status: SubscriptionStatus,
    deletedAt?: string | null,
): string {
    if (deletedAt) {
        return 'Terhapus';
    }

    if (isActiveStatus(status)) {
        return 'Langganan 1 Thn (Subscriber)';
    }

    return 'Demo 30 Hari (Trial)';
}

/** Number formatting for large counts. */
export function formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('id-ID').format(value ?? 0);
}
