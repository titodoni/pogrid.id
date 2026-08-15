import { useState, type FormEvent } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Badge,
    Button,
    Card,
    Grid,
    Stack,
    Table,
    Text,
    TextInput,
    proportional,
} from '@astryxdesign/core';
import SuperAdminShell from '@/Components/SuperAdminShell';
import PageLayout from '@/Components/PageLayout';
import MetricCard from '@/Components/MetricCard';
import ServerPagination from '@/Components/ServerPagination';
import { formatDateTime, formatNumber } from '@/lib/superpowers';
import type { BadgeVariant } from '@astryxdesign/core';
import type { Paginated, TableRowShape } from '@/types';

interface EmailLogRow extends TableRowShape {
    id: number;
    tenant_id: number | null;
    tenant_name: string | null;
    from: string | null;
    to: string | null;
    subject: string | null;
    status: string;
    error: string | null;
    created_at: string | null;
    sent_at: string | null;
}

interface EmailsIndexProps {
    logs: Paginated<EmailLogRow>;
    stats: {
        queued: number;
        sent: number;
        failed: number;
        sent_24h: number;
        failed_24h: number;
    };
    filters: { status: string; search: string };
}

const STATUS_FILTERS = ['all', 'queued', 'sent', 'failed'] as const;

function statusVariant(status: string): BadgeVariant {
    if (status === 'sent') return 'success';
    if (status === 'failed') return 'error';
    if (status === 'queued') return 'warning';
    return 'neutral';
}

export default function EmailsIndex({
    logs,
    stats,
    filters,
}: EmailsIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const status = filters.status ?? 'all';

    const setStatus = (next: string) => {
        router.get(
            '/superpowers/emails',
            { status: next, search },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const applySearch = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/superpowers/emails',
            { status, search },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <SuperAdminShell>
            <Head title="Email Delivery" />
            <PageLayout
                title="Email Delivery"
                description="Log pengiriman email lintas tenant untuk pemantauan deliverability."
            >
                <Grid columns={{ minWidth: 200, max: 5 }} gap={4}>
                    <MetricCard
                        label="Terkirim (24 jam)"
                        value={formatNumber(stats.sent_24h)}
                    />
                    <MetricCard
                        label="Gagal (24 jam)"
                        value={formatNumber(stats.failed_24h)}
                        variant={stats.failed_24h > 0 ? 'red' : 'default'}
                    />
                    <MetricCard
                        label="Antre"
                        value={formatNumber(stats.queued)}
                    />
                    <MetricCard
                        label="Total terkirim"
                        value={formatNumber(stats.sent)}
                    />
                    <MetricCard
                        label="Total gagal"
                        value={formatNumber(stats.failed)}
                        variant={stats.failed > 0 ? 'orange' : 'default'}
                    />
                </Grid>

                <Card padding={4}>
                    <Stack gap={4}>
                        <form onSubmit={applySearch}>
                            <Stack gap={3}>
                                <TextInput
                                    label="Cari email"
                                    value={search}
                                    onChange={setSearch}
                                    placeholder="Subjek, penerima, atau pengirim"
                                    width="100%"
                                />
                                <Stack
                                    direction="horizontal"
                                    gap={2}
                                    vAlign="center"
                                    wrap="wrap"
                                >
                                    {STATUS_FILTERS.map((option) => (
                                        <Button
                                            key={option}
                                            label={
                                                option === 'all'
                                                    ? 'Semua'
                                                    : option === 'queued'
                                                      ? 'Antre'
                                                      : option === 'sent'
                                                        ? 'Terkirim'
                                                        : 'Gagal'
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
                                    <Button
                                        label="Cari"
                                        variant="primary"
                                        size="sm"
                                        type="submit"
                                    />
                                </Stack>
                            </Stack>
                        </form>

                        <Table
                            data={logs.data}
                            idKey="id"
                            density="compact"
                            hasHover
                            textOverflow="truncate"
                            emptyState={
                                <Text type="supporting">
                                    Tidak ada log email pada filter ini.
                                </Text>
                            }
                            columns={[
                                {
                                    key: 'status',
                                    header: 'Status',
                                    width: proportional(1),
                                    renderCell: (log) => (
                                        <Badge
                                            variant={statusVariant(log.status)}
                                            label={log.status}
                                        />
                                    ),
                                },
                                {
                                    key: 'subject',
                                    header: 'Subjek',
                                    width: proportional(3),
                                    renderCell: (log) => (
                                        <Stack gap={0.5}>
                                            <Text maxLines={1}>
                                                {log.subject ?? '(tanpa subjek)'}
                                            </Text>
                                            <Text
                                                type="supporting"
                                                display="block"
                                                maxLines={1}
                                            >
                                                → {log.to ?? '—'}
                                            </Text>
                                        </Stack>
                                    ),
                                },
                                {
                                    key: 'tenant_name',
                                    header: 'Tenant',
                                    width: proportional(1),
                                    renderCell: (log) => (
                                        <Text>{log.tenant_name ?? 'Platform'}</Text>
                                    ),
                                },
                                {
                                    key: 'created_at',
                                    header: 'Waktu',
                                    width: proportional(1),
                                    renderCell: (log) => (
                                        <Text type="supporting">
                                            {formatDateTime(
                                                log.sent_at ?? log.created_at,
                                            )}
                                        </Text>
                                    ),
                                },
                            ]}
                        />

                        <ServerPagination
                            meta={logs}
                            params={{ status, search }}
                        />
                    </Stack>
                </Card>
            </PageLayout>
        </SuperAdminShell>
    );
}
