import { useState, type FormEvent } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Badge,
    Button,
    Card,
    Grid,
    Heading,
    Selector,
    Stack,
    Switch,
    Table,
    Text,
    TextInput,
    TextArea,
    proportional,
} from '@astryxdesign/core';
import SuperAdminShell from '@/Components/SuperAdminShell';
import PageLayout from '@/Components/PageLayout';
import ServerPagination from '@/Components/ServerPagination';
import { formatDate, formatDateTime, formatCents } from '@/lib/superpowers';
import type { Paginated, SubscriptionInvoice } from '@/types';

interface AvailableTenant {
    id: number;
    company_name: string;
    slug: string;
    subscription_status: string;
    subscription_expires_at: string | null;
    owner_name?: string | null;
    owner_email?: string | null;
}

interface InvoicesProps {
    invoices: Paginated<SubscriptionInvoice>;
    totals: {
        unpaid_count: number;
        pending_verification_count: number;
        paid_count: number;
    };
    filters: {
        status: string;
        search: string;
    };
    available_tenants: AvailableTenant[];
    default_plan: {
        id: number;
        name: string;
        price: number;
    };
}

const STATUS_FILTERS = [
    { value: 'all', label: 'Semua Status' },
    { value: 'pending_verification', label: '⏳ Menunggu Approval' },
    { value: 'unpaid', label: '🔴 Belum Bayar' },
    { value: 'paid', label: '🟢 Lunas (+1 Thn)' },
    { value: 'cancelled', label: '⚪ Dibatalkan' },
] as const;

export default function Invoices({
    invoices,
    totals,
    filters,
    available_tenants,
    default_plan,
}: InvoicesProps) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const [selectedStatus, setSelectedStatus] = useState<string>(filters.status || 'all');
    const [search, setSearch] = useState<string>(filters.search || '');

    // Form stores human-readable rupiah (e.g. 5000000)
    const [amountRupiah, setAmountRupiah] = useState<string>(
        String(Math.round((default_plan.price || 5_000_000_00) / 100))
    );

    const createForm = useForm({
        tenant_id: available_tenants[0]?.id ? String(available_tenants[0].id) : '',
        amount_cents: default_plan.price || 5_000_000_00,
        notes: 'Langganan Tahunan POgrid (1 Tahun Akses Penuh)',
        send_email: true,
    });

    const selectedTenantInfo = available_tenants.find(
        (t) => String(t.id) === String(createForm.data.tenant_id)
    );

    const tenantOptions = available_tenants.map((t) => ({
        value: String(t.id),
        label: `${t.company_name} (${t.slug}) - ${
            t.subscription_expires_at
                ? `Aktif s/d ${formatDate(t.subscription_expires_at)}`
                : 'Demo 30 Hari'
        }`,
    }));

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            '/superpowers/subscriptions/invoices',
            { status: selectedStatus, search },
            { preserveState: true }
        );
    };

    const setStatusFilter = (status: string) => {
        setSelectedStatus(status);
        router.get(
            '/superpowers/subscriptions/invoices',
            { status, search },
            { preserveState: true }
        );
    };

    const handleCreateInvoice = (e: FormEvent) => {
        e.preventDefault();
        const cleanRupiah = parseInt(amountRupiah.replace(/[^0-9]/g, ''), 10) || 5000000;
        createForm.setData('amount_cents', cleanRupiah * 100);

        router.post('/superpowers/subscriptions/invoices', {
            tenant_id: Number(createForm.data.tenant_id),
            amount_cents: cleanRupiah * 100,
            notes: createForm.data.notes,
            send_email: createForm.data.send_email,
        }, {
            onSuccess: () => {
                setShowCreateModal(false);
            },
        });
    };

    const handleSendEmail = (invoice: SubscriptionInvoice) => {
        if (window.confirm(`Kirim email notifikasi invoice ${invoice.invoice_number} ke owner tenant?`)) {
            router.post(`/superpowers/subscriptions/invoices/${invoice.id}/send-email`, {}, {
                preserveScroll: true,
            });
        }
    };

    const handleApprove = (invoice: SubscriptionInvoice) => {
        if (
            window.confirm(
                `Setujui pembayaran invoice ${invoice.invoice_number}? Akun tenant ${invoice.tenant?.company_name} akan langsung aktif +1 Tahun.`
            )
        ) {
            router.post(`/superpowers/subscriptions/invoices/${invoice.id}/approve`, {}, {
                preserveScroll: true,
            });
        }
    };

    const handleCancel = (invoice: SubscriptionInvoice) => {
        if (window.confirm(`Batalkan invoice ${invoice.invoice_number}?`)) {
            router.post(`/superpowers/subscriptions/invoices/${invoice.id}/cancel`, {}, {
                preserveScroll: true,
            });
        }
    };

    const handleCopyWhatsAppDraft = (inv: SubscriptionInvoice) => {
        const nominalStr = formatCents(inv.amount_cents);
        const periodStr = `${inv.period_start ? formatDate(inv.period_start) : 'Hari ini'} s/d ${inv.period_end ? formatDate(inv.period_end) : '1 Tahun'}`;
        const draft = `Halo ${inv.tenant?.company_name || 'Bapak/Ibu'},\n\nBerikut rincian tagihan langganan tahunan POgrid.id:\n• *No. Invoice*: ${inv.invoice_number}\n• *Paket*: Langganan 1 Tahun POgrid\n• *Periode*: ${periodStr}\n• *Nominal*: *${nominalStr}*\n• *Jatuh Tempo*: ${inv.due_date ? formatDate(inv.due_date) : '7 Hari'}\n\nPembayaran dapat ditransfer ke rekening resmi atau via payment link dan dikonfirmasi melalui tautan:\nhttps://app.pogrid.id/billing\n\nTerima kasih,\nTim POgrid.id`;

        navigator.clipboard.writeText(draft);
        setCopiedId(inv.id);
        setTimeout(() => setCopiedId(null), 2500);
    };

    const getInvoiceBadgeVariant = (status: string): 'neutral' | 'success' | 'warning' | 'error' => {
        switch (status) {
            case 'PAID':
                return 'success';
            case 'PENDING_VERIFICATION':
                return 'warning';
            case 'UNPAID':
                return 'error';
            case 'CANCELLED':
            default:
                return 'neutral';
        }
    };

    const getInvoiceBadgeLabel = (status: string): string => {
        switch (status) {
            case 'PAID':
                return 'Lunas (+1 Thn)';
            case 'PENDING_VERIFICATION':
                return 'Menunggu Approval';
            case 'UNPAID':
                return 'Belum Bayar';
            case 'CANCELLED':
                return 'Dibatalkan';
            default:
                return status;
        }
    };

    return (
        <SuperAdminShell>
            <Head title="Tagihan & Invoice 1 Tahun" />
            <PageLayout
                title="Tagihan & Invoice Langganan (1 Tahun)"
                description="Kelola tagihan tahunan tenant, kirim email resmi, 1-klik perpanjang masa aktif, dan verifikasi bukti transfer."
                actions={
                    <Stack direction="horizontal" gap={2} wrap="wrap">
                        <Link href="/superpowers/subscriptions/payment-methods">
                            <Button label="Metode Pembayaran" variant="secondary" />
                        </Link>
                        <Button
                            label="⚡ Terbitkan Tagihan 1 Tahun"
                            variant="primary"
                            onClick={() => setShowCreateModal(true)}
                        />
                    </Stack>
                }
            >
                {/* Metric Summary Cards */}
                <Grid columns={{ minWidth: 200, max: 3 }} gap={4}>
                    <Card padding={4}>
                        <Stack gap={1}>
                            <Text type="supporting">Menunggu Approval</Text>
                            <Heading level={2}>
                                {totals.pending_verification_count}
                            </Heading>
                            <Text type="supporting" size="sm">
                                Perlu diverifikasi dan disetujui
                            </Text>
                        </Stack>
                    </Card>

                    <Card padding={4}>
                        <Stack gap={1}>
                            <Text type="supporting">Belum Bayar (Unpaid)</Text>
                            <Heading level={2}>
                                {totals.unpaid_count}
                            </Heading>
                            <Text type="supporting" size="sm">
                                Menunggu transfer dari tenant
                            </Text>
                        </Stack>
                    </Card>

                    <Card padding={4}>
                        <Stack gap={1}>
                            <Text type="supporting">Lunas & Aktif (+1 Tahun)</Text>
                            <Heading level={2}>
                                {totals.paid_count}
                            </Heading>
                            <Text type="supporting" size="sm">
                                Telah diperpanjang 1 tahun
                            </Text>
                        </Stack>
                    </Card>
                </Grid>

                {/* Modern, High-Contrast 1-Year Invoice Modal */}
                {showCreateModal && (
                    <Card padding={5}>
                        <Stack gap={4}>
                            <Stack direction="horizontal" hAlign="between" vAlign="center">
                                <Stack gap={0.5}>
                                    <Heading level={3}>⚡ Terbitkan Tagihan Langganan 1 Tahun</Heading>
                                    <Text type="supporting">
                                        Periode 1 tahun dan jatuh tempo dihitung otomatis oleh sistem tanpa perlu input tanggal manual.
                                    </Text>
                                </Stack>
                                <Button
                                    label="Tutup"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowCreateModal(false)}
                                />
                            </Stack>

                            <form onSubmit={handleCreateInvoice}>
                                <Stack gap={4}>
                                    <Grid columns={{ minWidth: 280, max: 2 }} gap={4}>
                                        <Selector
                                            label="Pilih Tenant Pabrik"
                                            options={tenantOptions}
                                            value={createForm.data.tenant_id}
                                            onChange={(val) => createForm.setData('tenant_id', val)}
                                            width="100%"
                                            isRequired
                                        />

                                        <TextInput
                                            label="Nominal Tagihan 1 Tahun (Rupiah)"
                                            description="Default: Rp 5.000.000 (Langganan 1 Tahun Akses Penuh)"
                                            placeholder="5.000.000"
                                            value={amountRupiah}
                                            onChange={(val) => setAmountRupiah(val)}
                                            width="100%"
                                            isRequired
                                        />
                                    </Grid>

                                    {/* Clean High-Contrast Tenant Detail Card */}
                                    {selectedTenantInfo && (
                                        <Card padding={3}>
                                            <Grid columns={{ minWidth: 220, max: 2 }} gap={2}>
                                                <div>
                                                    <Text type="label" display="block">Kontak Owner Tenant</Text>
                                                    <Text>
                                                        {selectedTenantInfo.owner_name || 'Owner'} ({selectedTenantInfo.owner_email || 'Belum ada email'})
                                                    </Text>
                                                </div>
                                                <div>
                                                    <Text type="label" display="block">Masa Aktif Saat Ini</Text>
                                                    <Text>
                                                        {selectedTenantInfo.subscription_expires_at
                                                            ? formatDate(selectedTenantInfo.subscription_expires_at)
                                                            : 'Demo 30 Hari (Trial)'}
                                                    </Text>
                                                </div>
                                            </Grid>
                                        </Card>
                                    )}

                                    <TextArea
                                        label="Catatan Tagihan (Opsional)"
                                        value={createForm.data.notes}
                                        onChange={(val) => createForm.setData('notes', val)}
                                        rows={2}
                                        width="100%"
                                    />

                                    <Switch
                                        label="✉️ Langsung kirimkan email notifikasi tagihan ke Owner tenant sekarang"
                                        value={createForm.data.send_email}
                                        onChange={(val) => createForm.setData('send_email', val)}
                                    />

                                    <Stack direction="horizontal" gap={2}>
                                        <Button
                                            label={createForm.data.send_email ? '⚡ Terbitkan & Kirim Email Tagihan' : 'Simpan Tagihan'}
                                            variant="primary"
                                            type="submit"
                                            isLoading={createForm.processing}
                                        />
                                        <Button
                                            label="Batal"
                                            variant="ghost"
                                            onClick={() => setShowCreateModal(false)}
                                        />
                                    </Stack>
                                </Stack>
                            </form>
                        </Stack>
                    </Card>
                )}

                {/* Filter and Invoices Table */}
                <Card padding={4}>
                    <Stack gap={4}>
                        <Grid columns={{ minWidth: 260, max: 2 }} gap={3}>
                            {/* Status Filter Badges */}
                            <Stack direction="horizontal" gap={1.5} wrap="wrap" vAlign="center">
                                {STATUS_FILTERS.map((st) => (
                                    <Button
                                        key={st.value}
                                        label={st.label}
                                        variant={selectedStatus === st.value ? 'primary' : 'secondary'}
                                        size="sm"
                                        onClick={() => setStatusFilter(st.value)}
                                    />
                                ))}
                            </Stack>

                            {/* Search Box */}
                            <form onSubmit={handleSearch}>
                                <Stack direction="horizontal" gap={2}>
                                    <TextInput
                                        label="Cari Invoice / Tenant"
                                        placeholder="Cari no invoice atau nama tenant..."
                                        value={search}
                                        onChange={(val) => setSearch(val)}
                                        width="100%"
                                    />
                                    <div style={{ paddingTop: '24px' }}>
                                        <Button label="Cari" variant="secondary" type="submit" />
                                    </div>
                                </Stack>
                            </form>
                        </Grid>

                        <Table<SubscriptionInvoice>
                            data={invoices.data}
                            idKey="id"
                            density="balanced"
                            hasHover
                            emptyState={
                                <Stack gap={1} vAlign="center" hAlign="center">
                                    <Heading level={3}>Belum ada tagihan</Heading>
                                    <Text type="supporting">
                                        Gunakan tombol "⚡ Terbitkan Tagihan 1 Tahun" di atas untuk membuat tagihan baru.
                                    </Text>
                                </Stack>
                            }
                            columns={[
                                {
                                    key: 'invoice_number',
                                    header: 'No. Invoice',
                                    width: proportional(1.8),
                                    renderCell: (inv: SubscriptionInvoice) => (
                                        <Stack gap={0.5}>
                                            <Text type="label">{inv.invoice_number}</Text>
                                            <Text type="supporting" display="block">
                                                Dibuat: {formatDate(inv.created_at)}
                                            </Text>
                                        </Stack>
                                    ),
                                },
                                {
                                    key: 'tenant',
                                    header: 'Tenant Pabrik',
                                    width: proportional(2),
                                    renderCell: (inv: SubscriptionInvoice) => (
                                        <Stack gap={0.5}>
                                            <Link href={`/superpowers/tenants/${inv.tenant_id}`}>
                                                <Text type="label">{inv.tenant?.company_name || '—'}</Text>
                                            </Link>
                                            <Text type="supporting" display="block">
                                                /c/{inv.tenant?.slug}
                                            </Text>
                                        </Stack>
                                    ),
                                },
                                {
                                    key: 'amount_cents',
                                    header: 'Nominal & Periode',
                                    width: proportional(2),
                                    renderCell: (inv: SubscriptionInvoice) => (
                                        <Stack gap={0.5}>
                                            <Text type="label">{formatCents(inv.amount_cents)}</Text>
                                            <Text type="supporting" display="block">
                                                {inv.period_start ? formatDate(inv.period_start) : '—'} s/d {inv.period_end ? formatDate(inv.period_end) : '—'}
                                            </Text>
                                        </Stack>
                                    ),
                                },
                                {
                                    key: 'status',
                                    header: 'Status & Jatuh Tempo',
                                    width: proportional(1.8),
                                    renderCell: (inv: SubscriptionInvoice) => (
                                        <Stack gap={0.5}>
                                            <Badge
                                                variant={getInvoiceBadgeVariant(inv.status)}
                                                label={getInvoiceBadgeLabel(inv.status)}
                                            />
                                            {inv.paid_at ? (
                                                <Text type="supporting" display="block">
                                                    Lunas: {formatDate(inv.paid_at)}
                                                </Text>
                                            ) : inv.due_date ? (
                                                <Text type="supporting" display="block">
                                                    Tempo: {formatDate(inv.due_date)}
                                                </Text>
                                            ) : null}
                                        </Stack>
                                    ),
                                },
                                {
                                    key: 'payment_proof',
                                    header: 'Bukti Bayar',
                                    width: proportional(1.2),
                                    renderCell: (inv: SubscriptionInvoice) =>
                                        inv.payment_proof_path ? (
                                            <Button
                                                label="🔍 Bukti"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setProofPreviewUrl(`/storage/${inv.payment_proof_path}`)}
                                            />
                                        ) : (
                                            <Text type="supporting">—</Text>
                                        ),
                                },
                                {
                                    key: 'actions',
                                    header: 'Aksi Cepat Developer',
                                    width: proportional(3),
                                    renderCell: (inv: SubscriptionInvoice) => (
                                        <Stack direction="horizontal" gap={1} wrap="wrap" vAlign="center">
                                            {/* WhatsApp Draft Copier */}
                                            <Button
                                                label={copiedId === inv.id ? '✓ Tersalin!' : '📋 Salin WA'}
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleCopyWhatsAppDraft(inv)}
                                            />

                                            {/* Resend Email Button */}
                                            <Button
                                                label="✉️ Kirim Email"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSendEmail(inv)}
                                            />

                                            {/* 1-Click Approve */}
                                            {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                                                <Button
                                                    label="✓ Approve (+1 Thn)"
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handleApprove(inv)}
                                                />
                                            )}

                                            {/* Cancel Invoice */}
                                            {inv.status === 'UNPAID' && (
                                                <Button
                                                    label="✕"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleCancel(inv)}
                                                />
                                            )}
                                        </Stack>
                                    ),
                                },
                            ]}
                        />

                        <ServerPagination
                            meta={invoices}
                            params={{ status: selectedStatus, search }}
                        />
                    </Stack>
                </Card>
            </PageLayout>

            {/* Bukti Bayar Preview Modal */}
            {proofPreviewUrl && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                    }}
                    onClick={() => setProofPreviewUrl(null)}
                >
                    <div
                        style={{
                            maxWidth: '700px',
                            maxHeight: '90vh',
                            background: '#1e293b',
                            borderRadius: '12px',
                            padding: '20px',
                            overflow: 'auto',
                            border: '1px solid rgba(255,255,255,0.2)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Stack gap={3}>
                            <Stack direction="horizontal" hAlign="between" vAlign="center">
                                <Heading level={3}>Bukti Pembayaran Transfer</Heading>
                                <Button label="✕ Tutup" variant="ghost" size="sm" onClick={() => setProofPreviewUrl(null)} />
                            </Stack>
                            <img
                                src={proofPreviewUrl}
                                alt="Bukti Transfer"
                                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px' }}
                            />
                            <Button label="Tutup Preview" variant="primary" onClick={() => setProofPreviewUrl(null)} />
                        </Stack>
                    </div>
                </div>
            )}
        </SuperAdminShell>
    );
}
