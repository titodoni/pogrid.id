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

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Langganan 1 Tahun (Subscriber / Akses Penuh)' },
    { value: 'READONLY', label: 'Demo 30 Hari (Trial / Demo)' },
];

export default function TenantCreate() {
    const { data, setData, post, processing, errors } = useForm({
        company_name: '',
        slug: '',
        subscription_status: 'ACTIVE',
        subscription_expires_at: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post('/superpowers/tenants');
    };

    return (
        <SuperAdminShell>
            <Head title="Tambah Tenant" />
            <PageLayout
                title="Tambah Tenant Baru"
                description="Daftarkan pabrik / tenant baru dengan status Demo 30 Hari atau Langganan 1 Tahun."
                actions={
                    <Link href="/superpowers/tenants">
                        <Button label="Kembali" variant="ghost" />
                    </Link>
                }
            >
                <Card padding={5} maxWidth={640}>
                    <form onSubmit={submit}>
                        <Stack gap={4}>
                            <TextInput
                                label="Nama Perusahaan / Pabrik"
                                placeholder="Contoh: PT Teknik Mandiri Presisi"
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
                                description="Alamat akses worker pabrik (misal /c/teknik-mandiri)."
                                placeholder="teknik-mandiri"
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
                                description="Tanggal batas aktif akun tenant pabrik (contoh: 15/08/2027). Jika kosong, sistem otomatis menghitung 1 Tahun (Subscriber) atau 30 Hari (Demo)."
                                placeholder="DD/MM/YYYY"
                                value={data.subscription_expires_at}
                                onChange={(value) => setData('subscription_expires_at', value)}
                                width="100%"
                            />

                            <Stack direction="horizontal" gap={2}>
                                <Button
                                    label="Simpan & Buat Tenant"
                                    variant="primary"
                                    type="submit"
                                    isLoading={processing}
                                />
                                <Link href="/superpowers/tenants">
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
