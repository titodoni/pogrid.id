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
import type { TableRowShape } from '@/types';

interface HealthCheck {
    label: string;
    healthy: boolean;
    detail: string;
}

interface BackupEntry extends TableRowShape {
    path: string;
    size: number;
    modified: string | null;
}

interface HealthIndexProps {
    checks: Record<string, HealthCheck>;
    backups: BackupEntry[];
    disk: {
        total_bytes: number;
        free_bytes: number;
        used_bytes: number;
        used_percent: number;
    };
    healthy: boolean;
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1,
    );
    const value = bytes / 1024 ** index;
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function HealthIndex({
    checks,
    backups,
    disk,
    healthy,
}: HealthIndexProps) {
    const createBackup = () => {
        if (
            window.confirm(
                'Mulai backup database sekarang? Proses dapat memerlukan beberapa saat.',
            )
        ) {
            router.post('/superpowers/health/backup');
        }
    };

    const checkRows = Object.entries(checks).map(([key, check]) => ({
        key,
        ...check,
    }));

    return (
        <SuperAdminShell>
            <Head title="System Health" />
            <PageLayout
                title="System Health"
                description="Periksa konektivitas layanan, kapasitas disk, dan backup database."
                actions={
                    <Button
                        label="Buat backup"
                        variant="primary"
                        onClick={createBackup}
                    />
                }
            >
                <Grid columns={{ minWidth: 220, max: 4 }} gap={4}>
                    <MetricCard
                        label="Status keseluruhan"
                        value={healthy ? 'Sehat' : 'Perlu perhatian'}
                        variant={healthy ? 'green' : 'red'}
                    />
                    <MetricCard
                        label="Disk terpakai"
                        value={`${disk.used_percent.toFixed(1)}%`}
                        description={`${formatBytes(disk.used_bytes)} dari ${formatBytes(disk.total_bytes)}`}
                        variant={disk.used_percent >= 90 ? 'red' : 'default'}
                    />
                    <MetricCard
                        label="Ruang bebas"
                        value={formatBytes(disk.free_bytes)}
                    />
                    <MetricCard label="Jumlah backup" value={backups.length} />
                </Grid>

                <Grid columns={{ minWidth: 360, max: 2 }} gap={4}>
                    <Card padding={4}>
                        <Stack gap={3}>
                            <Heading level={3}>Pemeriksaan layanan</Heading>
                            <Table
                                data={checkRows}
                                idKey="key"
                                density="compact"
                                columns={[
                                    {
                                        key: 'label',
                                        header: 'Layanan',
                                        width: proportional(1),
                                        renderCell: (check) => (
                                            <Text type="label">
                                                {check.label}
                                            </Text>
                                        ),
                                    },
                                    {
                                        key: 'healthy',
                                        header: 'Status',
                                        width: proportional(1),
                                        renderCell: (check) => (
                                            <Badge
                                                variant={
                                                    check.healthy
                                                        ? 'success'
                                                        : 'error'
                                                }
                                                label={
                                                    check.healthy
                                                        ? 'Sehat'
                                                        : 'Bermasalah'
                                                }
                                            />
                                        ),
                                    },
                                    {
                                        key: 'detail',
                                        header: 'Detail',
                                        width: proportional(2),
                                        renderCell: (check) => (
                                            <Text type="supporting">
                                                {check.detail}
                                            </Text>
                                        ),
                                    },
                                ]}
                            />
                        </Stack>
                    </Card>

                    <Card padding={4}>
                        <Stack gap={3}>
                            <Heading level={3}>Backup terbaru</Heading>
                            <Table
                                data={backups}
                                idKey="path"
                                density="compact"
                                emptyState={
                                    <Text type="supporting">
                                        Belum ada backup yang ditemukan.
                                    </Text>
                                }
                                columns={[
                                    {
                                        key: 'path',
                                        header: 'File',
                                        width: proportional(2),
                                        renderCell: (backup) => (
                                            <Text maxLines={1}>{backup.path}</Text>
                                        ),
                                    },
                                    {
                                        key: 'size',
                                        header: 'Ukuran',
                                        width: proportional(1),
                                        renderCell: (backup) => (
                                            <Text>{formatBytes(backup.size)}</Text>
                                        ),
                                    },
                                    {
                                        key: 'modified',
                                        header: 'Dibuat',
                                        width: proportional(1),
                                        renderCell: (backup) => (
                                            <Text type="supporting">
                                                {formatDateTime(backup.modified)}
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
