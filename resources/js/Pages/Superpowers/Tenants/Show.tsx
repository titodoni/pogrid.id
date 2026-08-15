import { type FormEvent } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Badge,
    Button,
    Card,
    Grid,
    Heading,
    Stack,
    Table,
    Text,
    proportional,
} from '@astryxdesign/core';
import SuperAdminShell from '@/Components/SuperAdminShell';
import PageLayout from '@/Components/PageLayout';
import ServerPagination from '@/Components/ServerPagination';
import MetricCard from '@/Components/MetricCard';
import {
    formatCents,
    formatDate,
    formatDateTime,
    formatNumber,
    isActiveStatus,
    statusBadgeVariant,
    statusLabel,
} from '@/lib/superpowers';
import type {
    Paginated,
    PlanSummary,
    SubscriptionStatus,
    TableRowShape,
    TenantAnalytics,
} from '@/types';

interface ShowTenant {
    id: number;
    company_name: string;
    slug: string;
    subscription_status: SubscriptionStatus;
    subscription_expires_at: string | null;
    plan: PlanSummary | null;
    deleted_at: string | null;
    created_at: string | null;
    updated_at: string | null;
}

interface TenantUser extends TableRowShape {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string | null;
}

interface TenantShowProps {
    tenant: ShowTenant;
    users: Paginated<TenantUser>;
    analytics: TenantAnalytics;
}

export default function TenantShow({
    tenant,
    users,
    analytics,
}: TenantShowProps) {
    const del = useForm({});
    const isActive = isActiveStatus(tenant.subscription_status);

    const suspend = (event: FormEvent) => {
        event.preventDefault();
        if (
            window.confirm(
                `Suspend tenant ${tenant.company_name} menjadi readonly? Penghuni masih bisa login dan membaca data, tapi semua mutasi diblokir.`,
            )
        ) {
            router.post(`/superpowers/tenants/${tenant.id}/suspend`);
        }
    };

    const activate = (event: FormEvent) => {
        event.preventDefault();
        router.post(`/superpowers/tenants/${tenant.id}/activate`);
    };

    const restore = (event: FormEvent) => {
        event.preventDefault();
        router.post(`/superpowers/tenants/${tenant.id}/restore`);
    };

    const destroy = (event: FormEvent) => {
        event.preventDefault();
        if (
            window.confirm(
                `Hapus (soft-delete) tenant ${tenant.company_name}? Tenant bisa dipulihkan kemudian.`
            )
        ) {
            router.delete(`/superpowers/tenants/${tenant.id}`);
        }
    };

    const directExtend = (event: FormEvent) => {
        event.preventDefault();
        if (
            window.confirm(
                `Perpanjang masa aktif tenant ${tenant.company_name} selama 1 Tahun ke depan langsung?`
            )
        ) {
            router.post(`/superpowers/tenants/${tenant.id}/direct-extend`);
        }
    };

    return (
        <SuperAdminShell>
            <Head title={`Tenant: ${tenant.company_name}`} />
            <PageLayout
                title={tenant.company_name}
                description={`Detail teknis & analitika tenant /c/${tenant.slug}`}
                actions={
                    <Stack direction="horizontal" gap={2} wrap="wrap">
                        <Link href={`/superpowers/tenants/${tenant.id}/edit`}>
                            <Button label="Edit Profil" variant="secondary" />
                        </Link>
                        {!tenant.deleted_at && (
                            <Button
                                label="⚡ +1 Tahun Langganan"
                                variant="primary"
                                onClick={directExtend}
                            />
                        )}
                        {tenant.deleted_at ? (
                            <Button
                                label="Restore tenant"
                                variant="primary"
                                onClick={restore}
                            />
                        ) : isActive ? (
                            <Button
                                label="Suspend ke readonly"
                                variant="destructive"
                                onClick={suspend}
                            />
                        ) : (
                            <Button
                                label="Aktifkan"
                                variant="primary"
                                onClick={activate}
                            />
                        )}
                        {!tenant.deleted_at && (
                            <Button
                                label="Hapus"
                                variant="destructive"
                                onClick={destroy}
                            />
                        )}
                    </Stack>
                }
            >
                {/* Metric Summary Cards */}
                <Grid columns={{ minWidth: 220, max: 4 }} gap={4}>
                    <MetricCard
                        label="Status Engagement"
                        value={
                            analytics.engagement.status === 'active'
                                ? 'Aktif'
                                : analytics.engagement.status === 'idle'
                                  ? 'Idle'
                                  : 'Dorman'
                        }
                        description={`Terakhir: ${formatDateTime(analytics.engagement.last_active_at)}`}
                        variant={
                            analytics.engagement.status === 'active'
                                ? 'green'
                                : analytics.engagement.status === 'idle'
                                  ? 'orange'
                                  : 'red'
                        }
                    />
                    <MetricCard
                        label="Pengguna Aktif (DAU / MAU)"
                        value={`${analytics.engagement.dau} / ${analytics.engagement.mau}`}
                        description="Aktif 24 jam / 30 hari"
                    />
                    <MetricCard
                        label="Aktivitas 30 Hari"
                        value={formatNumber(analytics.engagement.activity_count_30d)}
                        description={`Floor: ${formatNumber(analytics.engagement.floor_activity_30d)} · Office: ${formatNumber(analytics.engagement.office_activity_30d)}`}
                    />
                    <MetricCard
                        label="Total Data Records"
                        value={formatNumber(analytics.resources.total_records)}
                        description={`${formatNumber(analytics.resources.audit_logs_count)} logs tersimpan`}
                    />
                </Grid>

                {/* Tenant Details & Subscription Lifecycle */}
                <Grid columns={{ minWidth: 320, max: 2 }} gap={4}>
                    <Card padding={4}>
                        <Stack gap={3}>
                            <Heading level={3}>Detail & Profil Tenant</Heading>
                            <Stack gap={2}>
                                <DetailRow
                                    label="Status Langganan"
                                    value={
                                        <Badge
                                            variant={statusBadgeVariant(
                                                tenant.subscription_status,
                                                tenant.deleted_at,
                                            )}
                                            label={statusLabel(
                                                tenant.subscription_status,
                                                tenant.deleted_at,
                                            )}
                                        />
                                    }
                                />
                                <DetailRow
                                    label="Slug"
                                    value={tenant.slug}
                                />
                                <DetailRow
                                    label="Paket"
                                    value={
                                        tenant.plan
                                            ? `${tenant.plan.name} (${formatCents(tenant.plan.price_cents)}/bln)`
                                            : 'Tanpa paket'
                                    }
                                />
                                <DetailRow
                                    label="Berlaku Hingga"
                                    value={
                                        tenant.subscription_expires_at
                                            ? formatDate(tenant.subscription_expires_at)
                                            : 'N/A'
                                    }
                                />
                                <DetailRow
                                    label="Dibuat"
                                    value={formatDateTime(tenant.created_at)}
                                />
                                <DetailRow
                                    label="Diperbarui"
                                    value={formatDateTime(tenant.updated_at)}
                                />
                                {tenant.deleted_at && (
                                    <DetailRow
                                        label="Dihapus"
                                        value={formatDate(tenant.deleted_at)}
                                    />
                                )}
                            </Stack>
                        </Stack>
                    </Card>

                    <Card padding={4}>
                        <Stack gap={3}>
                            <Heading level={3}>Konsumsi Resource Database</Heading>
                            <Grid columns={{ minWidth: 120, max: 3 }} gap={3}>
                                <StatTile label="Pengguna" value={analytics.resources.users_count} />
                                <StatTile label="Purchase Orders" value={analytics.resources.table_breakdown.pos ?? 0} />
                                <StatTile label="Item Produksi" value={analytics.resources.table_breakdown.items ?? 0} />
                                <StatTile label="Tahapan Progress" value={analytics.resources.table_breakdown.item_progress ?? 0} />
                                <StatTile label="Surat Jalan (DO)" value={analytics.resources.table_breakdown.do_items ?? 0} />
                                <StatTile label="Audit Logs" value={analytics.resources.audit_logs_count} />
                            </Grid>
                        </Stack>
                    </Card>
                </Grid>

                {/* Users List */}
                <Card padding={4}>
                    <Stack gap={3}>
                        <Heading level={3}>Daftar Pengguna Tenant</Heading>
                        <Table
                            data={users.data}
                            idKey="id"
                            density="compact"
                            hasHover
                            emptyState={
                                <Text type="supporting">
                                    Belum ada pengguna pada tenant ini.
                                </Text>
                            }
                            columns={[
                                {
                                    key: 'name',
                                    header: 'Nama',
                                    width: proportional(2),
                                    renderCell: (u) => (
                                        <Text type="label">{u.name}</Text>
                                    ),
                                },
                                {
                                    key: 'email',
                                    header: 'Email',
                                    width: proportional(2),
                                    renderCell: (u) => <Text>{u.email}</Text>,
                                },
                                {
                                    key: 'role',
                                    header: 'Peran',
                                    width: proportional(1),
                                    renderCell: (u) => (
                                        <Badge label={u.role} />
                                    ),
                                },
                                {
                                    key: 'created_at',
                                    header: 'Bergabung',
                                    width: proportional(1),
                                    renderCell: (u) => (
                                        <Text type="supporting">
                                            {formatDate(u.created_at)}
                                        </Text>
                                    ),
                                },
                            ]}
                        />
                        <ServerPagination meta={users} />
                    </Stack>
                </Card>
            </PageLayout>
        </SuperAdminShell>
    );
}

function DetailRow({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <Stack direction="horizontal" hAlign="between" vAlign="center" gap={4}>
            <Text type="supporting">{label}</Text>
            <Text>{value}</Text>
        </Stack>
    );
}

function StatTile({ label, value }: { label: string; value: number }) {
    return (
        <Card padding={3} variant="muted">
            <Stack gap={0.5} vAlign="center" hAlign="center">
                <Heading level={3}>{value}</Heading>
                <Text type="supporting">{label}</Text>
            </Stack>
        </Card>
    );
}
