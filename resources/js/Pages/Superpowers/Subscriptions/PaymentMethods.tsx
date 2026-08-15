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
import { formatDate } from '@/lib/superpowers';
import type { PaymentMethod } from '@/types';

interface PaymentMethodsProps {
    payment_methods: PaymentMethod[];
}

const PROVIDERS = [
    { value: 'mayar', label: 'Mayar.id (Payment Gateway Otomatis / QRIS / VA)' },
    { value: 'bca', label: 'BCA (Bank Central Asia)' },
    { value: 'mandiri', label: 'Bank Mandiri' },
    { value: 'bri', label: 'BRI (Bank Rakyat Indonesia)' },
    { value: 'bni', label: 'BNI (Bank Negara Indonesia)' },
    { value: 'midtrans', label: 'Midtrans Payment Gateway' },
    { value: 'xendit', label: 'Xendit Payment Gateway' },
    { value: 'other', label: 'Lainnya / Kustom' },
] as const;

export default function PaymentMethods({ payment_methods }: PaymentMethodsProps) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const form = useForm<{
        name: string;
        type: 'bank_transfer' | 'payment_gateway';
        provider: string;
        account_number: string;
        account_holder: string;
        instructions: string;
        config: {
            api_key: string;
            webhook_token: string;
            merchant_id: string;
            client_key: string;
            server_key: string;
            is_production: boolean;
        };
        is_active: boolean;
        sort_order: number;
    }>({
        name: '',
        type: 'bank_transfer',
        provider: 'bca',
        account_number: '',
        account_holder: '',
        instructions: '',
        config: {
            api_key: '',
            webhook_token: '',
            merchant_id: '',
            client_key: '',
            server_key: '',
            is_production: false,
        },
        is_active: true,
        sort_order: 0,
    });

    const openCreate = () => {
        setEditingId(null);
        form.reset();
        form.setData({
            name: 'BCA Manual Transfer',
            type: 'bank_transfer',
            provider: 'bca',
            account_number: '',
            account_holder: 'PT POgrid Teknologi Indonesia',
            instructions: 'Transfer tepat sesuai nominal tagihan dan lampirkan bukti transfer.',
            config: {
                api_key: '',
                webhook_token: '',
                merchant_id: '',
                client_key: '',
                server_key: '',
                is_production: false,
            },
            is_active: true,
            sort_order: (payment_methods.length + 1) * 10,
        });
        setShowForm(true);
    };

    const openEdit = (pm: PaymentMethod) => {
        setEditingId(pm.id);
        form.setData({
            name: pm.name,
            type: pm.type,
            provider: pm.provider,
            account_number: pm.account_number ?? '',
            account_holder: pm.account_holder ?? '',
            instructions: pm.instructions ?? '',
            config: {
                api_key: pm.config?.api_key ?? '',
                webhook_token: pm.config?.webhook_token ?? '',
                merchant_id: pm.config?.merchant_id ?? '',
                client_key: pm.config?.client_key ?? '',
                server_key: pm.config?.server_key ?? '',
                is_production: Boolean(pm.config?.is_production),
            },
            is_active: pm.is_active,
            sort_order: pm.sort_order,
        });
        setShowForm(true);
    };

    const submitForm = (e: FormEvent) => {
        e.preventDefault();
        if (editingId) {
            form.put(`/superpowers/subscriptions/payment-methods/${editingId}`, {
                onSuccess: () => {
                    setShowForm(false);
                    setEditingId(null);
                },
            });
        } else {
            form.post('/superpowers/subscriptions/payment-methods', {
                onSuccess: () => {
                    setShowForm(false);
                },
            });
        }
    };

    const handleDelete = (pm: PaymentMethod) => {
        if (window.confirm(`Hapus metode pembayaran ${pm.name}?`)) {
            router.delete(`/superpowers/subscriptions/payment-methods/${pm.id}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <SuperAdminShell>
            <Head title="Metode Pembayaran" />
            <PageLayout
                title="Metode Pembayaran Platform"
                description="Kelola saluran pembayaran transfer bank manual & kredensial Payment Gateway untuk tagihan tenant."
                actions={
                    <Stack direction="horizontal" gap={2} wrap="wrap">
                        <Link href="/superpowers/subscriptions">
                            <Button label="Ikhtisar Langganan" variant="secondary" />
                        </Link>
                        <Link href="/superpowers/subscriptions/invoices">
                            <Button label="Tagihan & Invoice" variant="secondary" />
                        </Link>
                        <Button
                            label="+ Tambah Metode Bayar"
                            variant="primary"
                            onClick={openCreate}
                        />
                    </Stack>
                }
            >
                {/* Form Add / Edit */}
                {showForm && (
                    <Card padding={5}>
                        <Stack gap={4}>
                            <Stack direction="horizontal" hAlign="between" vAlign="center">
                                <Heading level={3}>
                                    {editingId ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran Baru'}
                                </Heading>
                                <Button
                                    label="Tutup"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowForm(false)}
                                />
                            </Stack>

                            <form onSubmit={submitForm}>
                                <Stack gap={3}>
                                    <Grid columns={{ minWidth: 240, max: 3 }} gap={3}>
                                        <TextInput
                                            label="Nama Saluran Pembayaran"
                                            placeholder="Contoh: BCA Manual Transfer"
                                            value={form.data.name}
                                            onChange={(val) => form.setData('name', val)}
                                            status={form.errors.name ? { type: 'error', message: form.errors.name } : undefined}
                                        />

                                        <Selector
                                            label="Tipe Metode"
                                            options={[
                                                { value: 'bank_transfer', label: 'Transfer Bank Manual' },
                                                { value: 'payment_gateway', label: 'Payment Gateway (Otomatis)' },
                                            ]}
                                            value={form.data.type}
                                            onChange={(val) => {
                                                const newType = val as 'bank_transfer' | 'payment_gateway';
                                                form.setData((prev) => ({
                                                    ...prev,
                                                    type: newType,
                                                    provider: newType === 'payment_gateway' ? 'mayar' : 'bca',
                                                }));
                                            }}
                                            width="100%"
                                        />

                                        <Selector
                                            label="Provider / Bank"
                                            options={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
                                            value={form.data.provider}
                                            onChange={(val) => form.setData('provider', val)}
                                            width="100%"
                                        />
                                    </Grid>

                                    {/* Bank Transfer Specific Fields */}
                                    {form.data.type === 'bank_transfer' && (
                                        <Grid columns={{ minWidth: 240, max: 2 }} gap={3}>
                                            <TextInput
                                                label="Nomor Rekening"
                                                placeholder="Contoh: 1234567890"
                                                value={form.data.account_number}
                                                onChange={(val) => form.setData('account_number', val)}
                                            />
                                            <TextInput
                                                label="Atas Nama Pemilik Rekening"
                                                placeholder="Contoh: PT POgrid Teknologi Indonesia"
                                                value={form.data.account_holder}
                                                onChange={(val) => form.setData('account_holder', val)}
                                            />
                                        </Grid>
                                    )}

                                    {/* Payment Gateway Specific Fields */}
                                    {form.data.type === 'payment_gateway' && (
                                        <Stack gap={3}>
                                            {form.data.provider === 'mayar' ? (
                                                <Stack gap={3}>
                                                    <div
                                                        style={{
                                                            padding: '12px 16px',
                                                            borderRadius: '8px',
                                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                                            fontSize: '13px',
                                                            color: 'var(--color-pg-text, #f8fafc)',
                                                            lineHeight: 1.5,
                                                        }}
                                                    >
                                                        <strong>ℹ️ Integrasi Mayar.id:</strong> Masukkan API Token & Webhook Token dari Dashboard Mayar.id. Jika akun masih dalam proses verifikasi KYC, Anda dapat menyimpan kredensial sekarang dan mengaktifkan toggle saat KYC telah disetujui.
                                                    </div>
                                                    <Grid columns={{ minWidth: 240, max: 2 }} gap={3}>
                                                        <TextInput
                                                            label="Mayar API Token / Secret Key"
                                                            placeholder="Contoh: mayar_live_... / mayar_test_..."
                                                            type="password"
                                                            value={form.data.config.api_key}
                                                            onChange={(val) =>
                                                                form.setData('config', { ...form.data.config, api_key: val })
                                                            }
                                                        />
                                                        <TextInput
                                                            label="Mayar Webhook Token"
                                                            placeholder="Contoh: webhook_secret_token_..."
                                                            type="password"
                                                            value={form.data.config.webhook_token}
                                                            onChange={(val) =>
                                                                form.setData('config', { ...form.data.config, webhook_token: val })
                                                            }
                                                        />
                                                    </Grid>
                                                </Stack>
                                            ) : (
                                                <Grid columns={{ minWidth: 240, max: 3 }} gap={3}>
                                                    <TextInput
                                                        label="Merchant ID"
                                                        placeholder="Contoh: G12345678"
                                                        value={form.data.config.merchant_id}
                                                        onChange={(val) =>
                                                            form.setData('config', { ...form.data.config, merchant_id: val })
                                                        }
                                                    />
                                                    <TextInput
                                                        label="Client Key"
                                                        placeholder="Client Key..."
                                                        value={form.data.config.client_key}
                                                        onChange={(val) =>
                                                            form.setData('config', { ...form.data.config, client_key: val })
                                                        }
                                                    />
                                                    <TextInput
                                                        label="Server Key"
                                                        placeholder="Server Key..."
                                                        type="password"
                                                        value={form.data.config.server_key}
                                                        onChange={(val) =>
                                                            form.setData('config', { ...form.data.config, server_key: val })
                                                        }
                                                    />
                                                </Grid>
                                            )}
                                            <Switch
                                                label="Mode Production (Live Gateway)"
                                                value={form.data.config.is_production}
                                                onChange={(val) =>
                                                    form.setData('config', { ...form.data.config, is_production: val })
                                                }
                                            />
                                        </Stack>
                                    )}

                                    <TextArea
                                        label="Instruksi Pembayaran"
                                        placeholder="Petunjuk khusus pembayaran yang muncul di billing tenant..."
                                        value={form.data.instructions}
                                        onChange={(val) => form.setData('instructions', val)}
                                        rows={3}
                                    />

                                    <Grid columns={{ minWidth: 200, max: 2 }} gap={3}>
                                        <Switch
                                            label="Aktifkan saluran ini"
                                            value={form.data.is_active}
                                            onChange={(val) => form.setData('is_active', val)}
                                        />
                                        <TextInput
                                            label="Urutan Tampilan (Sort Order)"
                                            value={String(form.data.sort_order)}
                                            onChange={(val) => form.setData('sort_order', parseInt(val, 10) || 0)}
                                        />
                                    </Grid>

                                    <Stack direction="horizontal" gap={2}>
                                        <Button
                                            label={editingId ? 'Perbarui Metode Bayar' : 'Simpan Metode Bayar'}
                                            variant="primary"
                                            type="submit"
                                            isLoading={form.processing}
                                        />
                                        <Button
                                            label="Batal"
                                            variant="ghost"
                                            onClick={() => setShowForm(false)}
                                        />
                                    </Stack>
                                </Stack>
                            </form>
                        </Stack>
                    </Card>
                )}

                {/* Table of Payment Methods */}
                <Card padding={4}>
                    <Stack gap={4}>
                        <Table
                            data={payment_methods}
                            idKey="id"
                            density="balanced"
                            hasHover
                            emptyState={<Text type="supporting">Belum ada metode pembayaran yang dikonfigurasi.</Text>}
                            columns={[
                                {
                                    key: 'name',
                                    header: 'Saluran & Provider',
                                    width: proportional(2.5),
                                    renderCell: (pm) => (
                                        <Stack gap={0.5}>
                                            <Text type="label">{pm.name}</Text>
                                            <Text type="supporting" display="block">
                                                Provider: {pm.provider.toUpperCase()} · {pm.type === 'bank_transfer' ? 'Manual Transfer' : 'Gateway'}
                                            </Text>
                                        </Stack>
                                    ),
                                },
                                {
                                    key: 'account',
                                    header: 'Rekening / Kredensial',
                                    width: proportional(2.5),
                                    renderCell: (pm) => (
                                        <Stack gap={0.5}>
                                            {pm.type === 'bank_transfer' ? (
                                                <>
                                                    <Text type="label">{pm.account_number ?? '—'}</Text>
                                                    <Text type="supporting" display="block">
                                                        a/n {pm.account_holder ?? '—'}
                                                    </Text>
                                                </>
                                            ) : (
                                                <Text type="supporting">
                                                    Gateway: {pm.config?.is_production ? 'Production (Live)' : 'Sandbox/Test'}
                                                </Text>
                                            )}
                                        </Stack>
                                    ),
                                },
                                {
                                    key: 'status',
                                    header: 'Status',
                                    width: proportional(1),
                                    renderCell: (pm) => (
                                        <Badge
                                            variant={pm.is_active ? 'success' : 'neutral'}
                                            label={pm.is_active ? 'Aktif' : 'Nonaktif'}
                                        />
                                    ),
                                },
                                {
                                    key: 'sort_order',
                                    header: 'Urutan',
                                    width: proportional(1),
                                    renderCell: (pm) => <Text>{pm.sort_order}</Text>,
                                },
                                {
                                    key: 'created_at',
                                    header: 'Dibuat',
                                    width: proportional(1.5),
                                    renderCell: (pm) => (
                                        <Text type="supporting">{formatDate(pm.created_at)}</Text>
                                    ),
                                },
                                {
                                    key: 'actions',
                                    header: 'Aksi',
                                    width: proportional(2),
                                    renderCell: (pm) => (
                                        <Stack direction="horizontal" gap={1.5} vAlign="center">
                                            <Button
                                                label="Edit"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => openEdit(pm)}
                                            />
                                            <Button
                                                label="Hapus"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(pm)}
                                            />
                                        </Stack>
                                    ),
                                },
                            ]}
                        />
                    </Stack>
                </Card>
            </PageLayout>
        </SuperAdminShell>
    );
}
