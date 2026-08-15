import { Head, Link } from '@inertiajs/react';
import {
    Badge,
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
import MetricCard from '@/Components/MetricCard';
import {
    formatCents,
    formatDateTime,
    formatNumber,
    statusBadgeVariant,
    statusLabel,
} from '@/lib/superpowers';
import type { SubscriptionStatus, TableRowShape } from '@/types';

interface DashboardStats {
    tenants_total: number;
    tenants_active: number;
    tenants_readonly: number;
    tenants_deleted: number;
    users_total: number;
    active_users_24h: number;
    activity_24h: number;
    total_db_records: number;
    mrr_cents: number;
    pending_invoices_count: number;
}

interface RecentActivity extends TableRowShape {
    id: number;
    action: string;
    target_type: string | null;
    target_id: number | null;
    metadata: Record<string, unknown> | null;
    admin_name: string | null;
    created_at: string | null;
}

interface RecentTenant extends TableRowShape {
    id: number;
    company_name: string;
    slug: string;
    subscription_status: SubscriptionStatus;
    plan_name: string | null;
    created_at: string | null;
}

interface DashboardProps {
    stats: DashboardStats;
    emails: { sent_24h: number; failed_24h: number };
    queue_size: number;
    failed_jobs: number;
    recent_activity: RecentActivity[];
    recent_tenants: RecentTenant[];
}

export default function Dashboard({
    stats,
    emails,
    queue_size,
    failed_jobs,
    recent_activity,
    recent_tenants,
}: DashboardProps) {
    return (
        <SuperAdminShell>
            <Head title="Dashboard" />
            <PageLayout
                title="Dashboard Platform"
                description="Metrik developer, kesehatan resource platform, dan aktivitas superadmin terbaru."
            >
                {/* Row 1: SaaS & Platform Growth */}
                <Grid columns={{ minWidth: 220, max: 4 }} gap={4}>
                    <MetricCard
                        label="MRR (perkiraan)"
                        value={formatCents(stats.mrr_cents)}
                        description={`${formatNumber(stats.tenants_active)} tenant aktif`}
                        variant="green"
                    />
                    <MetricCard
                        label="Total tenant"
                        value={formatNumber(stats.tenants_total)}
                        description={`${formatNumber(stats.tenants_readonly)} readonly · ${formatNumber(stats.tenants_deleted)} terhapus`}
                    />
                    <MetricCard
                        label="Total pengguna"
                        value={formatNumber(stats.users_total)}
                        description={`${formatNumber(stats.active_users_24h)} aktif 24 jam`}
                    />
                    <MetricCard
                        label="Aktivitas platform (24h)"
                        value={formatNumber(stats.activity_24h)}
                        description={`${formatNumber(stats.total_db_records)} total data records`}
                    />
                </Grid>

                {/* Row 2: Diagnostics, System & Invoices */}
                <Grid columns={{ minWidth: 220, max: 4 }} gap={4}>
                    <MetricCard
                        label="Verifikasi tagihan"
                        value={formatNumber(stats.pending_invoices_count)}
                        description="Menunggu approval admin"
                        variant={stats.pending_invoices_count > 0 ? 'orange' : 'default'}
                    />
                    <MetricCard
                        label="Antrean pekerjaan"
                        value={formatNumber(queue_size)}
                    />
                    <MetricCard
                        label="Pekerjaan gagal"
                        value={formatNumber(failed_jobs)}
                        variant={failed_jobs > 0 ? 'red' : 'default'}
                    />
                    <MetricCard
                        label="Email terkirim (24h)"
                        value={formatNumber(emails.sent_24h)}
                        description={emails.failed_24h > 0 ? `${formatNumber(emails.failed_24h)} gagal` : '0 gagal'}
                        variant={emails.failed_24h > 0 ? 'red' : 'default'}
                    />
                </Grid>

                {/* Row 3: Tables */}
                <Grid columns={{ minWidth: 360, max: 2 }} gap={4}>
                    <Card padding={4}>
                        <Stack gap={3}>
                            <Stack
                                direction="horizontal"
                                hAlign="between"
                                vAlign="center"
                            >
                                <Heading level={3}>Tenant terbaru</Heading>
                                <Link href="/superpowers/tenants">
                                    <Text type="label">Lihat semua</Text>
                                </Link>
                            </Stack>
                            <Table
                                data={recent_tenants}
                                idKey="id"
                                density="compact"
                                hasHover
                                emptyState={
                                    <Text type="supporting">Belum ada tenant.</Text>
                                }
                                columns={[
                                    {
                                        key: 'company_name',
                                        header: 'Perusahaan',
                                        width: proportional(2),
                                        renderCell: (t) => (
                                            <Stack gap={0.5}>
                                                <Link
                                                    href={`/superpowers/tenants/${t.id}`}
                                                >
                                                    <Text type="label">
                                                        {t.company_name}
                                                    </Text>
                                                </Link>
                                                <Text type="supporting" display="block">
                                                    {t.slug}
                                                </Text>
                                            </Stack>
                                        ),
                                    },
                                    {
                                        key: 'subscription_status',
                                        header: 'Status',
                                        width: proportional(1),
                                        renderCell: (t) => (
                                            <Badge
                                                variant={statusBadgeVariant(
                                                    t.subscription_status,
                                                )}
                                                label={statusLabel(
                                                    t.subscription_status,
                                                )}
                                            />
                                        ),
                                    },
                                    {
                                        key: 'plan_name',
                                        header: 'Paket',
                                        width: proportional(1),
                                        renderCell: (t) => (
                                            <Text>{t.plan_name ?? '—'}</Text>
                                        ),
                                    },
                                ]}
                            />
                        </Stack>
                    </Card>

                    <Card padding={4}>
                        <Stack gap={3}>
                            <Heading level={3}>Aktivitas superadmin</Heading>
                            <Table
                                data={recent_activity}
                                idKey="id"
                                density="compact"
                                hasHover
                                emptyState={
                                    <Text type="supporting">
                                        Belum ada aktivitas tercatat.
                                    </Text>
                                }
                                columns={[
                                    {
                                        key: 'action',
                                        header: 'Aksi',
                                        width: proportional(2),
                                        renderCell: (a) => (
                                            <Stack gap={0.5}>
                                                <Text type="label">{a.action}</Text>
                                                <Text
                                                    type="supporting"
                                                    display="block"
                                                >
                                                    {a.target_type
                                                        ? `${a.target_type} #${a.target_id ?? '—'}`
                                                        : '—'}
                                                </Text>
                                            </Stack>
                                        ),
                                    },
                                    {
                                        key: 'admin_name',
                                        header: 'Oleh',
                                        width: proportional(1),
                                        renderCell: (a) => (
                                            <Text>{a.admin_name ?? 'Sistem'}</Text>
                                        ),
                                    },
                                    {
                                        key: 'created_at',
                                        header: 'Waktu',
                                        width: proportional(1),
                                        renderCell: (a) => (
                                            <Text type="supporting">
                                                {formatDateTime(a.created_at)}
                                            </Text>
                                        ),
                                    },
                                ]}
                            />
                        </Stack>
                    </Card>
                </Grid>
            </PageLayout>
        </SuperAdminShell>
    );
}
