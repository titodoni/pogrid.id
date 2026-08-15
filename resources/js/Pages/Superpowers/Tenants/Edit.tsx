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
import { formatCents } from '@/lib/superpowers';
import type { Plan, SubscriptionStatus } from '@/types';

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'PAID', label: 'PAID' },
    { value: 'SUBSCRIBED', label: 'SUBSCRIBED' },
    { value: 'READONLY', label: 'READONLY' },
];

interface EditableTenant {
    id: number;
    company_name: string;
    slug: string;
    subscription_status: SubscriptionStatus;
    plan_id: number | null;
}

interface TenantEditProps {
    tenant: EditableTenant;
    plans: Plan[];
}

export default function TenantEdit({ tenant, plans }: TenantEditProps) {
    const { data, setData, put, processing, errors } = useForm({
        company_name: tenant.company_name,
        slug: tenant.slug,
        plan_id: tenant.plan_id ? String(tenant.plan_id) : '',
        subscription_status: tenant.subscription_status,
    });

    const planOptions = plans.map((plan) => ({
        value: String(plan.id),
        label: `${plan.name} — ${formatCents(plan.price * 100)}`,
    }));

    const submit = (event: FormEvent) => {
        event.preventDefault();
        put(`/superpowers/tenants/${tenant.id}`);
    };

    return (
        <SuperAdminShell>
            <Head title={`Edit ${tenant.company_name}`} />
            <PageLayout
                title="Edit tenant"
                description={`Perbarui detail dan status langganan untuk ${tenant.company_name}.`}
                actions={
                    <Link href={`/superpowers/tenants/${tenant.id}`}>
                        <Button label="Kembali" variant="ghost" />
                    </Link>
                }
            >
                <Card padding={5} maxWidth={640}>
                    <form onSubmit={submit}>
                        <Stack gap={4}>
                            <TextInput
                                label="Nama perusahaan"
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
                                label="Slug"
                                description="Huruf kecil, angka, dan tanda hubung saja."
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
                            <Selector
                                label="Paket"
                                options={planOptions}
                                value={data.plan_id}
                                onChange={(value) => setData('plan_id', value)}
                                placeholder="Pilih paket"
                                width="100%"
                                status={
                                    errors.plan_id
                                        ? {
                                              type: 'error',
                                              message: errors.plan_id,
                                          }
                                        : undefined
                                }
                            />
                            <Selector
                                label="Status langganan"
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
                            <Stack direction="horizontal" gap={2}>
                                <Button
                                    label="Simpan perubahan"
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
