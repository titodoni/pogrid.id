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
import {
    formatDate,
    formatDateTime,
    isActiveStatus,
    statusBadgeVariant,
    statusLabel,
} from '@/lib/superpowers';
import type {
    Paginated,
    PlanSummary,
    SubscriptionStatus,
    TableRowShape,
} from '@/types';

interface ShowTenant {
    id: number;
    company_name: string;
    slug: string;
    subscription_status: SubscriptionStatus;
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

interface PoStats {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    delivered: number;
    closed: number;
    cancelled: number;
}

interface TenantShowProps {
    tenant: ShowTenant;
    users: Paginated<TenantUser>;
    po_stats: PoStats;
}

export default function TenantShow({
    tenant,
    users,
    po_stats,
}: TenantShowProps) {
    const del = useForm({});
    const isActive = isActiveStatus(tenant.subscription_status);

    const suspend = (event: FormEvent) => {
        event.preventDefault();
        if (
            window.confirm(
                `Suspends tenant ${tenant.company_name} menjadi readonly? Penghuni masih bisa login dan membaca data, tapi semua mutasi diblokir.`,
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
                `Hapus (soft-delete) tenant ${tenant.company_name}? Tenant bisa dipulihkan kemudian.`,
            )
        ) {
            del.submit('delete', `/superpowers/tenants/${tenant.id}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <SuperAdminShell>
            <Head title={tenant.company_name} />
            <PageLayout
                title={tenant.company_name}
                description={tenant.slug}
                actions={
                    <Stack direction="horizontal" gap={2} wrap="wrap">
                        <Link href={`/superpowers/tenants/${tenant.id}/edit`}>
                            <Button label="Edit" variant="secondary" />
                        </Link>
                        {tenant.deleted_at ? (
                            <Button
                                label="Pulihkan"
                                variant="primary"
                                onClick={restore}
                            />
                        ) : isActive ? (
                            <Button
                                label="Suspends ke readonly"
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
                <Grid columns={{ minWidth: 320, max: 2 }} gap={4}>
                    <Card padding={4}>
                        <Stack gap={3}>
                            <Heading level={3}>Detail tenant</Heading>
                            <Stack gap={2}>
                                <DetailRow
                                    label="Status"
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
                                            ? `${tenant.plan.name}`
                                            : '—'
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
                                <DetailRow
                                    label="Dihapus"
                                    value={formatDate(tenant.deleted_at)}
                                />
                            </Stack>
                        </Stack>
                    </Card>

                    <Card padding={4}>
                        <Stack gap={3}>
                            <Heading level={3}>Statistik PO</Heading>
                            <Grid columns={{ minWidth: 140, max: 3 }} gap={3}>
                                <StatTile label="Total" value={po_stats.total} />
                                <StatTile
                                    label="Menunggu"
                                    value={po_stats.pending}
                                />
                                <StatTile
                                    label="Berjalan"
                                    value={po_stats.in_progress}
                                />
                                <StatTile
                                    label="Selesai"
                                    value={po_stats.completed}
                                />
                                <StatTile
                                    label="Terkirim"
                                    value={po_stats.delivered}
                                />
                                <StatTile label="Tutup" value={po_stats.closed} />
                                <StatTile
                                    label="Batal"
                                    value={po_stats.cancelled}
                                />
                            </Grid>
                        </Stack>
                    </Card>
                </Grid>

                <Card padding={4}>
                    <Stack gap={3}>
                        <Heading level={3}>Pengguna</Heading>
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
