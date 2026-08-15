import { Head, Link, router } from '@inertiajs/react';
import {
    Badge,
    Button,
    Card,
    Grid,
    Stack,
    Table,
    Text,
    proportional,
} from '@astryxdesign/core';
import SuperAdminShell from '@/Components/SuperAdminShell';
import PageLayout from '@/Components/PageLayout';
import MetricCard from '@/Components/MetricCard';
import ServerPagination from '@/Components/ServerPagination';
import {
    formatCents,
    formatDate,
    statusBadgeVariant,
    statusLabel,
} from '@/lib/superpowers';
import type {
    Paginated,
    PlanSummary,
    SubscriptionStatus,
    TableRowShape,
} from '@/types';

interface SubscriptionRow extends TableRowShape {
    id: number;
    company_name: string;
    slug: string;
    subscription_status: SubscriptionStatus;
    plan: PlanSummary | null;
    is_active: boolean;
    is_readonly: boolean;
    deleted_at: string | null;
    created_at: string | null;
}

interface SubscriptionsIndexProps {
    subscriptions: Paginated<SubscriptionRow>;
    totals: {
        mrr_cents: number;
        active_count: number;
        readonly_count: number;
    };
    filters: { status: string };
}

const STATUS_FILTERS = ['all', 'active', 'readonly', 'deleted'] as const;

export default function SubscriptionsIndex({
    subscriptions,
    totals,
    filters,
}: SubscriptionsIndexProps) {
    const selected = filters.status ?? 'all';

    const setStatus = (status: string) => {
        router.get(
            '/superpowers/subscriptions',
            { status },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <SuperAdminShell>
            <Head title="Langganan & Billing" />
            <PageLayout
                title="Langganan & Billing"
                description="Pantau status akses tenant, estimasi pendapatan bulanan (MRR), dan kelola keuangan SaaS."
                actions={
                    <Stack direction="horizontal" gap={2} wrap="wrap">
                        <Link href="/superpowers/subscriptions/invoices">
                            <Button label="Tagihan & Invoice" variant="secondary" />
                        </Link>
                        <Link href="/superpowers/subscriptions/payment-methods">
                            <Button label="Metode Pembayaran" variant="secondary" />
                        </Link>
                    </Stack>
                }
            >
                <Grid columns={{ minWidth: 220, max: 3 }} gap={4}>
                    <MetricCard
                        label="ARR / Pendapatan Tahunan"
                        value={formatCents(totals.mrr_cents)}
                        variant="green"
                    />
                    <MetricCard
                        label="Langganan 1 Thn Aktif"
                        value={totals.active_count}
                    />
                    <MetricCard
                        label="Demo 30 Hari / Readonly"
                        value={totals.readonly_count}
                        variant={
                            totals.readonly_count > 0 ? 'orange' : 'default'
                        }
                    />
                </Grid>

                <Card padding={4}>
                    <Stack gap={4}>
                        <Stack
                            direction="horizontal"
                            gap={2}
                            vAlign="center"
                            wrap="wrap"
                        >
                            {STATUS_FILTERS.map((status) => (
                                <Button
                                    key={status}
                                    label={
                                        status === 'all'
                                            ? 'Semua'
                                            : status === 'active'
                                              ? 'Langganan 1 Thn (Aktif)'
                                              : status === 'readonly'
                                                ? 'Demo 30 Hari (Trial)'
                                                : 'Terhapus'
                                    }
                                    variant={
                                        selected === status
                                            ? 'primary'
                                            : 'secondary'
                                    }
                                    size="sm"
                                    onClick={() => setStatus(status)}
                                />
                            ))}
                        </Stack>

                        <Table
                            data={subscriptions.data}
                            idKey="id"
                            density="balanced"
                            hasHover
                            emptyState={
                                <Text type="supporting">
                                    Tidak ada langganan pada filter ini.
                                </Text>
                            }
                            columns={[
                                {
                                    key: 'company_name',
                                    header: 'Tenant',
                                    width: proportional(2),
                                    renderCell: (item) => (
                                        <Stack gap={0.5}>
                                            <Link
                                                href={`/superpowers/tenants/${item.id}`}
                                            >
                                                <Text type="label">
                                                    {item.company_name}
                                                </Text>
                                            </Link>
                                            <Text
                                                type="supporting"
                                                display="block"
                                            >
                                                {item.slug}
                                            </Text>
                                        </Stack>
                                    ),
                                },
                                {
                                    key: 'subscription_status',
                                    header: 'Status',
                                    width: proportional(1),
                                    renderCell: (item) => (
                                        <Badge
                                            variant={statusBadgeVariant(
                                                item.subscription_status,
                                                item.deleted_at,
                                            )}
                                            label={statusLabel(
                                                item.subscription_status,
                                                item.deleted_at,
                                            )}
                                        />
                                    ),
                                },
                                {
                                    key: 'plan',
                                    header: 'Paket',
                                    width: proportional(1),
                                    renderCell: (item) => (
                                        <Stack gap={0.5}>
                                            <Text>
                                                {item.plan?.name ?? 'Tanpa paket'}
                                            </Text>
                                            {item.plan && (
                                                <Text
                                                    type="supporting"
                                                    display="block"
                                                >
                                                    {formatCents(
                                                        item.plan.price_cents,
                                                    )}
                                                </Text>
                                            )}
                                        </Stack>
                                    ),
                                },
                                {
                                    key: 'access',
                                    header: 'Akses',
                                    width: proportional(1),
                                    renderCell: (item) => (
                                        <Text>
                                            {item.deleted_at
                                                ? 'Nonaktif'
                                                : item.is_readonly
                                                  ? 'Baca saja'
                                                  : item.is_active
                                                    ? 'Penuh'
                                                    : 'Baca saja'}
                                        </Text>
                                    ),
                                },
                                {
                                    key: 'created_at',
                                    header: 'Sejak',
                                    width: proportional(1),
                                    renderCell: (item) => (
                                        <Text type="supporting">
                                            {formatDate(item.created_at)}
                                        </Text>
                                    ),
                                },
                            ]}
                        />

                        <ServerPagination
                            meta={subscriptions}
                            params={{ status: selected }}
                        />
                    </Stack>
                </Card>
            </PageLayout>
        </SuperAdminShell>
    );
}
