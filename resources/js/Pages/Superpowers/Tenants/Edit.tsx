import { type FormEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    Button,
    Card,
    Selector,
    Stack,
    TextInput,
} from '@astryxdesign/core';
import SuperAdminShell from '@/Components/SuperAdminShell';
import PageLayout from '@/Components/PageLayout';
import type { SubscriptionStatus } from '@/types';

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Langganan 1 Tahun (Subscriber / Akses Penuh)' },
    { value: 'READONLY', label: 'Demo 30 Hari (Trial / Demo)' },
];

interface EditableTenant {
    id: number;
    company_name: string;
    slug: string;
    subscription_status: SubscriptionStatus;
    subscription_expires_at?: string | null;
}

interface TenantEditProps {
    tenant: EditableTenant;
}

export default function TenantEdit({ tenant }: TenantEditProps) {
    const currentStatus = tenant.subscription_status === 'ACTIVE' || tenant.subscription_status === 'PAID' || tenant.subscription_status === 'SUBSCRIBED'
        ? 'ACTIVE'
        : 'READONLY';

    const { data, setData, put, processing, errors } = useForm({
        company_name: tenant.company_name,
        slug: tenant.slug,
        subscription_status: currentStatus,
        subscription_expires_at: tenant.subscription_expires_at || '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        put(`/superpowers/tenants/${tenant.id}`);
    };

    return (
        <SuperAdminShell>
            <Head title={`Edit Tenant: ${tenant.company_name}`} />
            <PageLayout
                title={`Edit Tenant: ${tenant.company_name}`}
                description="Perbarui informasi tenant, status akses, atau tanggal kedaluwarsa langganan."
                actions={
                    <Link href={`/superpowers/tenants/${tenant.id}`}>
                        <Button label="Kembali ke Detail" variant="ghost" />
                    </Link>
                }
            >
                <Card padding={5} maxWidth={640}>
                    <form onSubmit={submit}>
                        <Stack gap={4}>
                            <TextInput
                                label="Nama Perusahaan / Pabrik"
                                value={data.company_name}
                                onChange={(value) =>
                                    setData('company_name', value)
                                }
                                status={
                                    errors.company_name
                                        ? {
                                              type: 'error',
                                              message: errors.company_name,
                                          }
                                        : undefined
                                }
                                width="100%"
                                isRequired
                            />

                            <TextInput
                                label="Slug URL Tenant"
                                description="Alamat akses worker (misal /c/teknik-mandiri)."
                                value={data.slug}
                                onChange={(value) =>
                                    setData(
                                        'slug',
                                        value
                                            .toLowerCase()
                                            .replace(/[^a-z0-9-]/g, ''),
                                    )
                                }
                                status={
                                    errors.slug
                                        ? { type: 'error', message: errors.slug }
                                        : undefined
                                }
                                width="100%"
                                isRequired
                            />

                            <div
                                style={{
                                    padding: '14px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                }}
                            >
                                <div style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 700, color: '#60a5fa', marginBottom: '2px' }}>
                                    Paket Langganan
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                                    Langganan Tahunan POgrid (1 Tahun Akses Penuh)
                                </div>
                            </div>

                            <Selector
                                label="Pilih Status Tenant"
                                options={STATUS_OPTIONS}
                                value={data.subscription_status}
                                onChange={(value) =>
                                    setData('subscription_status', value)
                                }
                                width="100%"
                                status={
                                    errors.subscription_status
                                        ? {
                                              type: 'error',
                                              message: errors.subscription_status,
                                          }
                                        : undefined
                                }
                            />

                            <TextInput
                                label="Masa Berlaku Hingga (Format: DD/MM/YYYY)"
                                description="Tanggal batas aktif akun tenant pabrik (contoh: 15/08/2027)."
                                placeholder="DD/MM/YYYY"
                                value={data.subscription_expires_at}
                                onChange={(value) => setData('subscription_expires_at', value)}
                                width="100%"
                            />

                            <Stack direction="horizontal" gap={2}>
                                <Button
                                    label="Simpan Perubahan"
                                    variant="primary"
                                    type="submit"
                                    isLoading={processing}
                                />
                                <Link href={`/superpowers/tenants/${tenant.id}`}>
                                    <Button label="Batal" variant="ghost" />
                                </Link>
                            </Stack>
                        </Stack>
                    </form>
                </Card>
            </PageLayout>
        </SuperAdminShell>
    );
}
