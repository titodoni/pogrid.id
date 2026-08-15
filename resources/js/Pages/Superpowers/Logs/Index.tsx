import { Head, router } from '@inertiajs/react';
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
import MetricCard from '@/Components/MetricCard';
import { formatDateTime } from '@/lib/superpowers';
import type { BadgeVariant } from '@astryxdesign/core';
import type { TableRowShape } from '@/types';

interface LogEntry extends TableRowShape {
    timestamp: string | null;
    env: string | null;
    level: string;
    message: string;
}

interface LogsIndexProps {
    entries: LogEntry[];
    error_count: number;
    lines: number;
    log_exists: boolean;
    log_size: number;
}

function levelVariant(level: string): BadgeVariant {
    const normalized = level.toLowerCase();
    if (['emergency', 'alert', 'critical', 'error'].includes(normalized)) {
        return 'error';
    }
    if (['warning', 'notice'].includes(normalized)) {
        return 'warning';
    }
    if (normalized === 'info') {
        return 'info';
    }
    return 'neutral';
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1,
    );
    return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function LogsIndex({
    entries,
    error_count,
    lines,
    log_exists,
    log_size,
}: LogsIndexProps) {
    const refresh = () => {
        router.reload({ only: ['entries', 'error_count', 'log_size'] });
    };

    return (
        <SuperAdminShell>
            <Head title="Error Log" />
            <PageLayout
                title="Error Log"
                description="Entri terbaru dari log aplikasi Laravel."
                actions={
                    <Button
                        label="Muat ulang"
                        variant="secondary"
                        onClick={refresh}
                    />
                }
            >
                <Grid columns={{ minWidth: 220, max: 3 }} gap={4}>
                    <MetricCard
                        label="Baris error terdeteksi"
                        value={error_count}
                        variant={error_count > 0 ? 'red' : 'green'}
                    />
                    <MetricCard label="Baris ditampilkan" value={lines} />
                    <MetricCard
                        label="Ukuran log"
                        value={formatBytes(log_size)}
                    />
                </Grid>

                <Card padding={4}>
                    <Stack gap={3}>
                        <Heading level={3}>Entri log</Heading>
                        {!log_exists ? (
                            <Text type="supporting">
                                File log belum ada.
                            </Text>
                        ) : (
                            <Table
                                data={entries}
                                idKey={(entry) =>
                                    `${entry.timestamp ?? ''}-${entry.message.slice(0, 24)}`
                                }
                                density="compact"
                                textOverflow="truncate"
                                emptyState={
                                    <Text type="supporting">
                                        Tidak ada entri log terbaru.
                                    </Text>
                                }
                                columns={[
                                    {
                                        key: 'level',
                                        header: 'Level',
                                        width: proportional(1),
                                        renderCell: (entry) => (
                                            <Badge
                                                variant={levelVariant(
                                                    entry.level,
                                                )}
                                                label={entry.level}
                                            />
                                        ),
                                    },
                                    {
                                        key: 'timestamp',
                                        header: 'Waktu',
                                        width: proportional(1),
                                        renderCell: (entry) => (
                                            <Text type="supporting">
                                                {formatDateTime(entry.timestamp)}
                                            </Text>
                                        ),
                                    },
                                    {
                                        key: 'message',
                                        header: 'Pesan',
                                        width: proportional(4),
                                        renderCell: (entry) => (
                                            <Text maxLines={2}>
                                                {entry.message}
                                            </Text>
                                        ),
                                    },
                                ]}
                            />
                        )}
                    </Stack>
                </Card>
            </PageLayout>
        </SuperAdminShell>
    );
}
