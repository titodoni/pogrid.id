import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { AppLayout } from '../../Components/AppLayout';
import { ChevronLeft, AlertTriangle } from '../../Components/Icons';
import { formatDDMMYYYY } from '../../Utils/date';

interface Tenant {
    id: number;
    company_name: string;
    slug: string;
    subscription_status?: string;
    trial_ends_at?: string;
}

interface Props {
    tenant?: Tenant;
    is_expired: boolean;
}

const translations = {
    en: {
        title: 'Subscription & Billing Control',
        subtitle: 'Manage trial status, enterprise subscription, and manual bank transfer payments',
        back: 'Back to Office Dashboard',
        status: 'Subscription Status',
        trial_end: 'Trial Expiration',
        active_plan: 'Active Enterprise Subscription',
        trial_plan: '14-Day Free Trial',
        expired_plan: 'Trial Expired (ReadOnly PO Creation)',
        expired_warning_title: 'PO Creation Locked due to Trial Expiration',
        expired_warning_desc: 'Your free trial has concluded. To resume creating new Purchase Orders and broadcasting jobs to the factory floor, please activate an active subscription. Note: Ongoing item operations and worker progress reports on the floor remain fully functional.',
        payment_instructions: 'Payment Instructions (Manual Bank Transfer)',
        transfer_step_1: '1. Transfer the annual enterprise subscription fee of IDR 3,500,000 / year to one of our designated operational accounts:',
        bca_account: 'Bank Central Asia (BCA) — Acc: 8829-1002-39 a/n PT POgrid Teknologi Indonesia',
        mandiri_account: 'Bank Mandiri — Acc: 122-009-883-772 a/n PT POgrid Teknologi Indonesia',
        transfer_step_2: '2. Include your unique Tenant ID / Slug in the bank transfer reference note:',
        transfer_step_3: '3. After transferring, send your proof of payment via email to billing@pogrid.id or contact our finance confirmation hotline.',
        confirm_btn: 'Confirm Payment via WhatsApp / Email',
        lang_en: 'English',
        lang_id: 'Bahasa Indonesia',
    },
    id: {
        title: 'Kontrol Berlangganan & Tagihan',
        subtitle: 'Kelola masa uji coba (trial), langganan perusahaan, dan pembayaran transfer bank',
        back: 'Kembali ke Dasbor Kantor',
        status: 'Status Berlangganan',
        trial_end: 'Akhir Masa Uji Coba',
        active_plan: 'Langganan Perusahaan Aktif',
        trial_plan: 'Uji Coba Gratis 14 Hari',
        expired_plan: 'Uji Coba Habis (Pembuatan PO Dikunci)',
        expired_warning_title: 'Pembuatan PO Dikunci karena Masa Uji Coba Habis',
        expired_warning_desc: 'Masa uji coba gratis Anda telah berakhir. Untuk melanjutkan pembuatan Purchase Order baru ke lantai produksi, silakan aktifkan langganan resmi. Catatan: Pekerjaan yang sedang berjalan dan update progres teknisi di bengkel tetap beroperasi penuh tanpa gangguan.',
        payment_instructions: 'Instruksi Pembayaran (Transfer Bank Manual)',
        transfer_step_1: '1. Lakukan transfer biaya langganan perusahaan sebesar Rp 3.500.000 / tahun ke salah satu rekening resmi kami:',
        bca_account: 'Bank Central Asia (BCA) — Rek: 8829-1002-39 a.n. PT POgrid Teknologi Indonesia',
        mandiri_account: 'Bank Mandiri — Rek: 122-009-883-772 a.n. PT POgrid Teknologi Indonesia',
        transfer_step_2: '2. Wajib sertakan Kode Tenant / Slug berikut pada berita atau keterangan transfer:',
        transfer_step_3: '3. Setelah melunasi pembayaran, kirimkan bukti transfer melalui email ke billing@pogrid.id atau WhatsApp tim admin finansial kami.',
        confirm_btn: 'Konfirmasi Pembayaran via WhatsApp / Email',
        lang_en: 'English',
        lang_id: 'Bahasa Indonesia',
    }
};

export default function Billing({ tenant, is_expired }: Props) {
    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
        }
        return 'en';
    });

    const changeLanguage = (lang: 'en' | 'id') => {
        setLanguage(lang);
        localStorage.setItem('pogrid_lang', lang);
    };

    const t = translations[language];
    const statusStr = (tenant?.subscription_status || '').toUpperCase();
    const isPaid = statusStr === 'ACTIVE' || statusStr === 'PAID' || statusStr === 'SUBSCRIBED';

    return (
        <AppLayout activeNav="billing" title={t.title} subtitle={t.subtitle}>
            <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
                {/* Header Navigation */}
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '32px',
                    paddingBottom: '20px',
                    borderBottom: '1px solid var(--color-pg-border, rgba(255, 255, 255, 0.1))'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <Link href="/dashboard" style={{ color: 'var(--color-pg-text-muted)', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                                <ChevronLeft size={16} /> {t.back}
                            </Link>
                        </div>
                        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-pg-text)', margin: '0', letterSpacing: '-0.025em' }}>
                            {t.title}
                        </h1>
                        <p style={{ fontSize: '14px', color: 'var(--color-pg-text-secondary, #a1a1aa)', margin: '4px 0 0 0' }}>
                            {t.subtitle} &mdash; <strong>{tenant?.company_name || 'Tenant Account'}</strong>
                        </p>
                    </div>

                    <div style={{
                        display: 'inline-flex',
                        backgroundColor: 'var(--color-pg-surface)',
                        padding: '4px',
                        borderRadius: '10px',
                        border: '1px solid var(--color-pg-border)',
                    }}>
                        <button
                            onClick={() => changeLanguage('en')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '7px',
                                fontSize: '12px',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: language === 'en' ? 'var(--color-pg-primary, #3b82f6)' : 'transparent',
                                color: language === 'en' ? '#fff' : 'var(--color-pg-text-secondary, #a1a1aa)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {t.lang_en}
                        </button>
                        <button
                            onClick={() => changeLanguage('id')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '7px',
                                fontSize: '12px',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: language === 'id' ? 'var(--color-pg-primary, #3b82f6)' : 'transparent',
                                color: language === 'id' ? '#fff' : 'var(--color-pg-text-secondary, #a1a1aa)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {t.lang_id}
                        </button>
                    </div>
                </header>

                {/* Trial Expiry Alert Banner */}
                {is_expired && !isPaid && (
                    <div style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '32px',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'flex-start',
                        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)',
                    }}>
                        <div style={{ color: 'var(--color-pg-danger, #ef4444)', marginTop: '2px' }}>
                            <AlertTriangle size={28} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-pg-danger, #ef4444)', margin: '0 0 6px 0' }}>
                                {t.expired_warning_title}
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--color-pg-text)', margin: 0, lineHeight: 1.6 }}>
                                {t.expired_warning_desc}
                            </p>
                        </div>
                    </div>
                )}

                {/* Status Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    <div style={{
                        backgroundColor: 'var(--color-pg-surface, #18181b)',
                        border: '1px solid var(--color-pg-border, rgba(255, 255, 255, 0.08))',
                        borderRadius: '12px',
                        padding: '24px',
                    }}>
                        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-pg-text-muted)', letterSpacing: '0.05em', margin: '0 0 10px 0', fontWeight: 700 }}>
                            {t.status}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: 800,
                                backgroundColor: isPaid ? 'rgba(34, 197, 94, 0.15)' : (is_expired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)'),
                                color: isPaid ? '#22c55e' : (is_expired ? '#ef4444' : '#fbbf24'),
                                border: `1px solid ${isPaid ? 'rgba(34, 197, 94, 0.4)' : (is_expired ? 'rgba(239, 68, 68, 0.4)' : 'rgba(251, 191, 36, 0.4)')}`,
                            }}>
                                {isPaid ? t.active_plan : (is_expired ? t.expired_plan : t.trial_plan)}
                            </span>
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'var(--color-pg-surface, #18181b)',
                        border: '1px solid var(--color-pg-border, rgba(255, 255, 255, 0.08))',
                        borderRadius: '12px',
                        padding: '24px',
                    }}>
                        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-pg-text-muted)', letterSpacing: '0.05em', margin: '0 0 10px 0', fontWeight: 700 }}>
                            {t.trial_end}
                        </h4>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                            {tenant?.trial_ends_at ? formatDDMMYYYY(tenant.trial_ends_at) : (language === 'en' ? 'Unlimited / N/A' : 'Tidak terbatas')}
                        </div>
                    </div>
                </div>

                {/* Manual Bank Transfer Instruction Section */}
                <div style={{
                    backgroundColor: 'var(--color-pg-surface, #18181b)',
                    border: '1px solid var(--color-pg-border, rgba(255, 255, 255, 0.08))',
                    borderRadius: '12px',
                    padding: '32px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-pg-text)', margin: '0 0 20px 0', borderBottom: '1px solid var(--color-pg-border)', paddingBottom: '12px' }}>
                        💳 {t.payment_instructions}
                    </h2>

                    <p style={{ fontSize: '14px', color: 'var(--color-pg-text)', lineHeight: 1.6, marginBottom: '16px', fontWeight: 600 }}>
                        {t.transfer_step_1}
                    </p>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        marginBottom: '24px',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        padding: '20px',
                        borderRadius: '10px',
                        border: '1px solid var(--color-pg-border)',
                    }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#60a5fa' }}>
                            🏦 {t.bca_account}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#34d399' }}>
                            🏦 {t.mandiri_account}
                        </div>
                    </div>

                    <p style={{ fontSize: '14px', color: 'var(--color-pg-text)', lineHeight: 1.6, marginBottom: '12px', fontWeight: 600 }}>
                        {t.transfer_step_2}
                    </p>

                    <div style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        borderRadius: '8px',
                        color: '#818cf8',
                        fontSize: '15px',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        marginBottom: '24px',
                    }}>
                        REF: {tenant?.slug || 'TEKNIK-MANDIRI'}
                    </div>

                    <p style={{ fontSize: '14px', color: 'var(--color-pg-text)', lineHeight: 1.6, marginBottom: '24px', fontWeight: 600 }}>
                        {t.transfer_step_3}
                    </p>

                    <a
                        href={`mailto:billing@pogrid.id?subject=Payment%20Confirmation%20-%20${tenant?.slug || ''}&body=Hi%20POgrid%20Billing%2C%0A%0AAttached%20is%20our%20proof%20of%20payment%20for%20tenant%20slug%3A%20${tenant?.slug || ''}.`}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 24px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--color-pg-primary, #3b82f6)',
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 700,
                            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                            transition: 'all 0.2s',
                        }}
                    >
                        ✉️ {t.confirm_btn}
                    </a>
                </div>
            </div>
        </AppLayout>
    );
}
