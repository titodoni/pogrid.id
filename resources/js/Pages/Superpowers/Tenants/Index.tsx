import { useState, type FormEvent } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Badge,
    Button,
    Card,
    Stack,
    Table,
    TextInput,
    Text,
    Heading,
    proportional,
} from '@astryxdesign/core';
import SuperAdminShell from '@/Components/SuperAdminShell';
import PageLayout from '@/Components/PageLayout';
import ServerPagination from '@/Components/ServerPagination';
import {
    formatDateTime,
    statusBadgeVariant,
    statusLabel,
} from '@/lib/superpowers';
import type { Paginated, TenantRow } from '@/types';

const STATUS_OPTIONS = ['all', 'ACTIVE', 'READONLY', 'deleted'] as const;

interface TenantsIndexProps {
    tenants: Paginated<TenantRow>;
    filters: { search: string; status: string };
}

export default function TenantsIndex({ tenants, filters }: TenantsIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');

    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/superpowers/tenants',
            { search, status },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('all');
        router.get(
            '/superpowers/tenants',
            { search: '', status: 'all' },
            { preserveScroll: true, replace: true },
        );
    };

    return (
        <SuperAdminShell>
            <Head title="Tenant" />
            <PageLayout
                title="Tenant"
                description="Kelola semua tenant POGrid, status langganan, dan kepemilikan paket."
                actions={
                    <Link href="/superpowers/tenants/create">
                        <Button label="Tambah tenant" variant="primary" />
                    </Link>
                }
            >
                <Card padding={4}>
                    <Stack gap={4}>
                        <form onSubmit={applyFilters}>
                            <Stack gap={3}>
                                <TextInput
                                    label="Cari tenant"
                                    value={search}
                                    onChange={setSearch}
                                    placeholder="Nama perusahaan atau slug"
                                    width="100%"
                                />
                                <Stack
                                    direction="horizontal"
                                    gap={2}
                                    vAlign="center"
                                    wrap="wrap"
                                >
                                    {STATUS_OPTIONS.map((option) => (
                                        <Button
                                            key={option}
                                            label={
                                                option === 'all'
                                                    ? 'Semua'
                                                    : option === 'deleted'
                                                      ? 'Terhapus'
                                                      : option
                                            }
                                            variant={
                                                status === option
                                                    ? 'primary'
                                                    : 'secondary'
                                            }
                                            size="sm"
                                            onClick={() => setStatus(option)}
                                        />
                                    ))}
                                </Stack>
                                <Stack
                                    direction="horizontal"
                                    gap={2}
                                    vAlign="center"
                                >
                                    <Button
                                        label="Terapkan filter"
                                        variant="primary"
                                        type="submit"
                                    />
                                    <Button
                                        label="Reset"
                                        variant="ghost"
                                        onClick={clearFilters}
                                    />
                                </Stack>
                            </Stack>
                        </form>

                        <Table
                            data={tenants.data}
                            idKey="id"
                            density="balanced"
                            hasHover
                            emptyState={
                                <Stack gap={1} vAlign="center" hAlign="center">
                                    <Heading level={3}>
                                        Belum ada tenant yang cocok
                                    </Heading>
                                    <Text type="supporting">
                                        Ubah kata kunci atau filter status lalu coba
                                        lagi.
                                    </Text>
                                </Stack>
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
                                            <Text
                                                type="supporting"
                                                display="block"
                                            >
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
                                                t.deleted_at,
                                            )}
                                            label={statusLabel(
                                                t.subscription_status,
                                                t.deleted_at,
                                            )}
                                        />
                                    ),
                                },
                                {
                                    key: 'plan',
                                    header: 'Paket',
                                    width: proportional(1),
                                    renderCell: (t) =>
                                        t.plan ? (
                                            <Text>{t.plan.name}</Text>
                                        ) : (
                                            <Text type="supporting">—</Text>
                                        ),
                                },
                                {
                                    key: 'users_count',
                                    header: 'Pengguna',
                                    width: proportional(1),
                                    renderCell: (t) => (
                                        <Text>{t.users_count}</Text>
                                    ),
                                },
                                {
                                    key: 'created_at',
                                    header: 'Dibuat',
                                    width: proportional(1),
                                    renderCell: (t) => (
                                        <Text type="supporting">
                                            {formatDateTime(t.created_at)}
                                        </Text>
                                    ),
                                },
                            ]}
                        />

                        <ServerPagination meta={tenants} params={{ search, status }} />
                    </Stack>
                </Card>
            </PageLayout>
        </SuperAdminShell>
    );
}
