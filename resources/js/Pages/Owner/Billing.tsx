import React, { useState, FormEvent } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AppLayout } from '../../Components/AppLayout';
import { AlertTriangle } from '../../Components/Icons';
import { formatDDMMYYYY } from '../../Utils/date';
import { useTranslation } from "@/i18n/useTranslation";

interface Plan {
    id: number;
    name: string;
    price: number;
}

interface Tenant {
    id: number;
    company_name: string;
    slug: string;
    subscription_status?: string;
    trial_ends_at?: string;
    subscription_expires_at?: string;
    plan?: Plan | null;
}

interface PaymentMethodItem {
    id: number;
    name: string;
    type: 'bank_transfer' | 'payment_gateway';
    provider: string;
    account_number: string | null;
    account_holder: string | null;
    instructions: string | null;
}

interface InvoiceItem {
    id: number;
    invoice_number: string;
    amount_cents: number;
    status: string;
    due_date: string | null;
    period_start: string | null;
    period_end: string | null;
    paid_at: string | null;
    payment_proof_path: string | null;
    payment_proof_uploaded_at: string | null;
    payment_method?: {
        name: string;
        provider: string;
    } | null;
}

interface Props {
    tenant?: Tenant;
    is_expired: boolean;
    payment_methods?: PaymentMethodItem[];
    open_invoice?: InvoiceItem | null;
    recent_invoices?: InvoiceItem[];
}

export default function Billing({
    tenant,
    is_expired,
    payment_methods = [],
    open_invoice = null,
    recent_invoices = [],
}: Props) {
    const { t, language } = useTranslation('Owner_Billing');
    const statusStr = (tenant?.subscription_status || '').toUpperCase();
    const isPaid = statusStr === 'ACTIVE' || statusStr === 'PAID' || statusStr === 'SUBSCRIBED';

    const [selectedMethodId, setSelectedMethodId] = useState<number | ''>(
        payment_methods[0]?.id ?? ''
    );
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const uploadForm = useForm<{
        invoice_id: number | null;
        payment_method_id: number | '';
        proof: File | null;
    }>({
        invoice_id: open_invoice?.id ?? null,
        payment_method_id: selectedMethodId,
        proof: null,
    });

    const [isDuitkuLoading, setIsDuitkuLoading] = useState(false);

    const handleDuitkuCheckout = () => {
        setIsDuitkuLoading(true);
        router.post('/billing/duitku-checkout', {}, {
            onFinish: () => setIsDuitkuLoading(false),
        });
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleUploadProof = (e: FormEvent) => {
        e.preventDefault();
        uploadForm.setData('payment_method_id', selectedMethodId);
        uploadForm.post('/billing/upload-proof', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                uploadForm.reset('proof');
            },
        });
    };

    const formatRupiah = (cents: number) => {
        return 'Rp ' + Number(cents / 100).toLocaleString('id-ID');
    };

    return (
        <AppLayout
            activeNav="billing"
            title={t.title}
            subtitle={`${t.subtitle} — ${tenant?.company_name || 'Tenant Account'}`}
            backUrl="/dashboard"
        >
            <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
                {/* Trial Expiry / Readonly Alert Banner */}
                {is_expired && !isPaid && (
                    <div
                        style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '12px',
                            padding: '20px',
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'flex-start',
                            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)',
                        }}
                    >
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    <div
                        style={{
                            backgroundColor: 'var(--color-pg-surface, #18181b)',
                            border: '1px solid var(--color-pg-border, rgba(255, 255, 255, 0.08))',
                            borderRadius: '12px',
                            padding: '24px',
                        }}
                    >
                        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-pg-text-muted)', letterSpacing: '0.05em', margin: '0 0 10px 0', fontWeight: 700 }}>
                            {t.status}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    backgroundColor: isPaid ? 'rgba(34, 197, 94, 0.15)' : (is_expired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)'),
                                    color: isPaid ? '#22c55e' : (is_expired ? '#ef4444' : '#fbbf24'),
                                    border: `1px solid ${isPaid ? 'rgba(34, 197, 94, 0.4)' : (is_expired ? 'rgba(239, 68, 68, 0.4)' : 'rgba(251, 191, 36, 0.4)')}`,
                                }}
                            >
                                {isPaid ? (tenant?.plan?.name ? `Langganan Aktif: ${tenant.plan.name}` : t.active_plan) : (is_expired ? t.expired_plan : t.trial_plan)}
                            </span>
                        </div>
                    </div>

                    <div
                        style={{
                            backgroundColor: 'var(--color-pg-surface, #18181b)',
                            border: '1px solid var(--color-pg-border, rgba(255, 255, 255, 0.08))',
                            borderRadius: '12px',
                            padding: '24px',
                        }}
                    >
                        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-pg-text-muted)', letterSpacing: '0.05em', margin: '0 0 10px 0', fontWeight: 700 }}>
                            {isPaid ? 'Masa Berlaku Langganan' : t.trial_end}
                        </h4>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                            {tenant?.subscription_expires_at
                                ? formatDDMMYYYY(tenant.subscription_expires_at)
                                : (tenant?.trial_ends_at ? formatDDMMYYYY(tenant.trial_ends_at) : (language === 'en' ? 'Unlimited / N/A' : 'Tidak terbatas'))}
                        </div>
                    </div>
                </div>

                {/* Instant Online Payment (Duitku Gateway Card) */}
                <div
                    style={{
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(30, 64, 175, 0.05) 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        borderRadius: '12px',
                        padding: '28px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <div style={{ maxWidth: '640px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>
                                ⚡ Pembayaran Otomatis Instan
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-pg-text)', margin: '0 0 8px 0' }}>
                                Bayar & Perpanjang Langganan via Duitku
                            </h3>
                            <p style={{ fontSize: '13px', color: 'var(--color-pg-text-muted)', margin: '0 0 16px 0', lineHeight: 1.6 }}>
                                Transaksi diproses seketika 24/7 tanpa perlu upload bukti transfer manual. Mendukung berbagai metode pembayaran resmi:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {['QRIS', 'BCA Virtual Account', 'Mandiri VA', 'BNI VA', 'BRI VA', 'Permata VA', 'E-Wallet', 'Kartu Kredit', 'Indomaret / Alfamart'].map((badge, bIdx) => (
                                    <span
                                        key={bIdx}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: '#cbd5e1',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {badge}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={handleDuitkuCheckout}
                                disabled={isDuitkuLoading}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '14px 28px',
                                    borderRadius: '10px',
                                    backgroundColor: isDuitkuLoading ? '#2563eb' : '#3b82f6',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: '15px',
                                    fontWeight: 800,
                                    cursor: isDuitkuLoading ? 'not-allowed' : 'pointer',
                                    opacity: isDuitkuLoading ? 0.7 : 1,
                                    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.45)',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {isDuitkuLoading ? '⏳ Mengarahkan ke Duitku...' : '💳 Bayar Sekarang dengan Duitku'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Open Invoice / Verification Pending Banner */}
                {open_invoice && (
                    <div
                        style={{
                            backgroundColor: open_invoice.status === 'PENDING_VERIFICATION' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            border: `1px solid ${open_invoice.status === 'PENDING_VERIFICATION' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                            borderRadius: '12px',
                            padding: '24px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 700, color: open_invoice.status === 'PENDING_VERIFICATION' ? '#fbbf24' : '#60a5fa', marginBottom: '4px' }}>
                                    {open_invoice.status === 'PENDING_VERIFICATION' ? '⏳ Sedang Diverifikasi' : '📄 Tagihan Terbuka'}
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-pg-text)', margin: '0 0 4px 0' }}>
                                    Invoice {open_invoice.invoice_number} — {formatRupiah(open_invoice.amount_cents)}
                                </h3>
                                <p style={{ fontSize: '14px', color: 'var(--color-pg-text-muted)', margin: 0 }}>
                                    {open_invoice.status === 'PENDING_VERIFICATION'
                                        ? 'Bukti transfer Anda telah berhasil diunggah dan sedang dalam proses verifikasi tim billing POgrid.'
                                        : `Jatuh tempo pembayaran: ${open_invoice.due_date ? formatDDMMYYYY(open_invoice.due_date) : 'Segera'}`}
                                </p>
                            </div>
                            {open_invoice.status === 'UNPAID' && (
                                <div>
                                    <button
                                        type="button"
                                        onClick={handleDuitkuCheckout}
                                        disabled={isDuitkuLoading}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            backgroundColor: '#3b82f6',
                                            color: '#fff',
                                            border: 'none',
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            cursor: isDuitkuLoading ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                                        }}
                                    >
                                        {isDuitkuLoading ? '⏳ Memproses...' : '🚀 Bayar Otomatis dengan Duitku'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Payment Instructions & Bank Transfer Section */}
                <div
                    style={{
                        backgroundColor: 'var(--color-pg-surface, #18181b)',
                        border: '1px solid var(--color-pg-border, rgba(255, 255, 255, 0.08))',
                        borderRadius: '12px',
                        padding: '32px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                    }}
                >
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-pg-text)', margin: '0 0 20px 0', borderBottom: '1px solid var(--color-pg-border)', paddingBottom: '12px' }}>
                        💳 {t.payment_instructions}
                    </h2>

                    <p style={{ fontSize: '14px', color: 'var(--color-pg-text)', lineHeight: 1.6, marginBottom: '16px', fontWeight: 600 }}>
                        Silakan lakukan pembayaran langganan ke salah satu rekening resmi platform POgrid berikut:
                    </p>

                    {/* Bank Transfer Accounts */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                        {/* BCA */}
                        <div
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                padding: '20px',
                                borderRadius: '10px',
                                border: '1px solid var(--color-pg-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '12px',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 700, color: '#60a5fa', marginBottom: '4px' }}>
                                    🏦 Bank BCA
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                                    8905463965
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--color-pg-text-muted)', marginTop: '2px' }}>
                                    a/n Tito Doni Asmoro
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleCopy('8905463965', 100)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {copiedIndex === 100 ? '✓ Berhasil Disalin' : 'Salin No. Rekening'}
                            </button>
                        </div>

                        {/* Mandiri */}
                        <div
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                padding: '20px',
                                borderRadius: '10px',
                                border: '1px solid var(--color-pg-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '12px',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>
                                    🏦 Bank Mandiri
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                                    1140024129135
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--color-pg-text-muted)', marginTop: '2px' }}>
                                    a/n Tito Doni Asmoro
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleCopy('1140024129135', 101)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                {copiedIndex === 101 ? '✓ Berhasil Disalin' : 'Salin No. Rekening'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--color-pg-text)', lineHeight: 1.6, marginBottom: '8px', fontWeight: 600 }}>
                            Sertakan kode referensi tenant pada berita transfer:
                        </p>
                        <div
                            style={{
                                display: 'inline-block',
                                padding: '8px 16px',
                                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                borderRadius: '8px',
                                color: '#818cf8',
                                fontSize: '15px',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                            }}
                        >
                            REF: {tenant?.slug ? tenant.slug.toUpperCase() : 'TEKNIK-MANDIRI'}
                        </div>
                    </div>

                    {/* Upload Payment Proof Form */}
                    <div
                        style={{
                            borderTop: '1px solid var(--color-pg-border)',
                            paddingTop: '24px',
                        }}
                    >
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-pg-text)', margin: '0 0 12px 0' }}>
                            📤 Konfirmasi & Upload Bukti Transfer
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--color-pg-text-muted)', marginBottom: '16px' }}>
                            Setelah melakukan transfer, unggah foto atau struk transfer di bawah ini. Tim kami akan segera memverifikasi dan mengaktifkan akun Anda.
                        </p>

                        <form onSubmit={handleUploadProof} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
                            {payment_methods.length > 0 && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-pg-text)', marginBottom: '6px' }}>
                                        Metode / Bank Tujuan Transfer
                                    </label>
                                    <select
                                        value={selectedMethodId}
                                        onChange={(e) => setSelectedMethodId(Number(e.target.value))}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-pg-border)',
                                            backgroundColor: 'rgba(0,0,0,0.3)',
                                            color: '#fff',
                                            fontSize: '14px',
                                        }}
                                    >
                                        {payment_methods.map((pm) => (
                                            <option key={pm.id} value={pm.id}>
                                                {pm.name} ({pm.account_number ?? pm.provider})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-pg-text)', marginBottom: '6px' }}>
                                    File Bukti Transfer (JPG, PNG, PDF maks 5MB)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    required
                                    onChange={(e) => uploadForm.setData('proof', e.target.files?.[0] ?? null)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--color-pg-border)',
                                        backgroundColor: 'rgba(0,0,0,0.3)',
                                        color: '#fff',
                                        fontSize: '13px',
                                    }}
                                />
                                {uploadForm.errors.proof && (
                                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                        {uploadForm.errors.proof}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={uploadForm.processing || !uploadForm.data.proof}
                                style={{
                                    alignSelf: 'flex-start',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--color-pg-primary, #3b82f6)',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    cursor: uploadForm.processing || !uploadForm.data.proof ? 'not-allowed' : 'pointer',
                                    opacity: uploadForm.processing || !uploadForm.data.proof ? 0.6 : 1,
                                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                                }}
                            >
                                {uploadForm.processing ? 'Mengunggah...' : 'Kirim Bukti Pembayaran'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Recent Invoices History */}
                {recent_invoices.length > 0 && (
                    <div
                        style={{
                            backgroundColor: 'var(--color-pg-surface, #18181b)',
                            border: '1px solid var(--color-pg-border, rgba(255, 255, 255, 0.08))',
                            borderRadius: '12px',
                            padding: '24px',
                        }}
                    >
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-pg-text)', margin: '0 0 16px 0' }}>
                            Riwayat Pembayaran Sebelumnya
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-pg-border)', color: 'var(--color-pg-text-muted)', textAlign: 'left' }}>
                                        <th style={{ padding: '8px 12px' }}>No. Invoice</th>
                                        <th style={{ padding: '8px 12px' }}>Nominal</th>
                                        <th style={{ padding: '8px 12px' }}>Status</th>
                                        <th style={{ padding: '8px 12px' }}>Periode</th>
                                        <th style={{ padding: '8px 12px' }}>Tanggal Bayar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent_invoices.map((inv) => (
                                        <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>{inv.invoice_number}</td>
                                            <td style={{ padding: '10px 12px' }}>{formatRupiah(inv.amount_cents)}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{ padding: '3px 8px', borderRadius: '12px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontSize: '11px', fontWeight: 700 }}>
                                                    Lunas
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', color: 'var(--color-pg-text-muted)' }}>
                                                {inv.period_start ? formatDDMMYYYY(inv.period_start) : '—'} s/d {inv.period_end ? formatDDMMYYYY(inv.period_end) : '—'}
                                            </td>
                                            <td style={{ padding: '10px 12px', color: 'var(--color-pg-text-muted)' }}>
                                                {inv.paid_at ? formatDDMMYYYY(inv.paid_at) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
