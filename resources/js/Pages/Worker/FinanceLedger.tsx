import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, DotGreen, AlertTriangle } from '../../Components/Icons';
import { WorkerHeader } from '../../Components/WorkerHeader';

interface Item {
    id: number;
    item_name: string;
    target_qty: number;
    delivered_qty?: number;
    invoiced_qty?: number;
    invoice_status?: string | null;
    payment_status?: string | null;
    delivery_status?: string | null;
    status: string;
}

interface Po {
    id: number;
    po_number: string;
    client_name: string;
    global_deadline?: string;
    status: string;
    items?: Item[];
}

interface Props {
    pos: Po[];
    auth_user?: {
        id: number;
        name: string;
        role?: string;
        role_name?: string;
        post_name?: string;
        is_owner?: boolean;
    };
    tenant?: {
        company_name: string;
        slug: string;
    };
}

const translations = {
    en: {
        title: 'Finance Ledger & Billing Control',
        subtitle: 'Monitor invoicing, delivered items, and payment reconciliation per PO',
        po_number: 'PO Number',
        client: 'Client',
        deadline: 'Deadline',
        status: 'Status',
        items: 'Items Drill-Down',
        no_pos: 'No active Purchase Orders recorded in ledger.',
        item_name: 'Item Name',
        target_qty: 'Target Qty',
        delivered_qty: 'Delivered',
        invoice_status: 'Invoice Status',
        payment_status: 'Payment Status',
        back: 'Back to Dashboard',
        exit: 'Exit',
        lang_en: 'English',
        lang_id: 'Bahasa Indonesia',
        uninvoiced: 'Uninvoiced',
        partial: 'Partial',
        invoiced: 'Invoiced',
        unpaid: 'Unpaid',
        partial_paid: 'Partial Paid',
        paid: 'Paid',
    },
    id: {
        title: 'Buku Besar Keuangan & Tagihan',
        subtitle: 'Pantau invoice, barang terkirim, dan rekonsiliasi pembayaran per PO',
        po_number: 'Nomor PO',
        client: 'Klien',
        deadline: 'Tenggat',
        status: 'Status',
        items: 'Rincian Barang',
        no_pos: 'Tidak ada Purchase Order tercatat di buku besar.',
        item_name: 'Nama Barang',
        target_qty: 'Jml Target',
        delivered_qty: 'Terkirim',
        invoice_status: 'Status Invoice',
        payment_status: 'Status Pembayaran',
        back: 'Kembali ke Dasbor',
        exit: 'Keluar',
        lang_en: 'English',
        lang_id: 'Bahasa Indonesia',
        uninvoiced: 'Belum Tagih',
        partial: 'Sebagian',
        invoiced: 'Tertagih',
        unpaid: 'Belum Bayar',
        partial_paid: 'Bayar Sebagian',
        paid: 'Lunas',
    }
};

export default function FinanceLedger({ pos = [], auth_user, tenant }: Props) {
    const { url } = usePage();
    const pathParts = url.split('/');
    const slug = tenant?.slug || pathParts[2] || '';

    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
        }
        return 'en';
    });

    const [expandedPos, setExpandedPos] = useState<Record<number, boolean>>(() => {
        const initial: Record<number, boolean> = {};
        pos.forEach((po) => {
            initial[po.id] = true;
        });
        return initial;
    });

    const [loadingId, setLoadingId] = useState<number | null>(null);

    const changeLanguage = (lang: 'en' | 'id') => {
        setLanguage(lang);
        localStorage.setItem('pogrid_lang', lang);
    };

    const t = translations[language];

    const togglePo = (id: number) => {
        setExpandedPos((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleUpdateFinance = (item: Item, newInvoiceStatus?: string, newPaymentStatus?: string) => {
        const targetInvoice = newInvoiceStatus !== undefined ? newInvoiceStatus : (item.invoice_status || 'UNINVOICED');
        const targetPayment = newPaymentStatus !== undefined ? newPaymentStatus : (item.payment_status || 'UNPAID');

        router.post(`/c/${slug}/items/${item.id}/finance`, {
            invoice_status: targetInvoice,
            payment_status: targetPayment,
            invoiced_qty: targetInvoice === 'INVOICED' ? item.target_qty : item.invoiced_qty || 0,
        }, {
            preserveScroll: true,
            onStart: () => setLoadingId(item.id),
            onFinish: () => setLoadingId(null),
        });
    };

    return (
        <div className="dashboard-root lg:ml-64 pb-24 lg:pb-8" style={{
            backgroundColor: 'var(--color-pg-bg, var(--color-pg-bg))',
            minHeight: '100vh',
            color: 'var(--color-pg-text, var(--color-pg-text))',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
        }}>
            <WorkerHeader
                slug={slug}
                auth_user={auth_user}
                userRole="FINANCE"
                title={t.title}
                subtitle={`${t.subtitle} — ${tenant?.company_name || slug}`}
                language={language}
                changeLanguage={changeLanguage}
                currentView="finance-ledger"
            />

            <div className="dashboard-scroll" style={{
                padding: '24px',
                boxSizing: 'border-box',
                flex: 1,
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* PO Ledger Content */}
                <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {pos.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '48px 20px',
                            color: 'var(--color-pg-text-muted, var(--color-pg-text-muted))',
                            fontSize: '14px',
                            border: '1px dashed var(--color-pg-border)',
                            borderRadius: '12px',
                        }}>
                            {t.no_pos}
                        </div>
                    ) : (
                        pos.map((po) => {
                            const isExpanded = expandedPos[po.id] ?? true;
                            const items = po.items || [];
                            const allInvoiced = items.length > 0 && items.every(i => i.invoice_status === 'INVOICED');
                            const allPaid = items.length > 0 && items.every(i => i.payment_status === 'PAID');

                            return (
                                <div key={po.id} className="glass-card" style={{
                                    backgroundColor: 'var(--color-pg-card, var(--color-pg-surface))',
                                    border: '1px solid var(--color-pg-border)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
                                    backdropFilter: 'blur(12px)',
                                }}>
                                    {/* PO Header Bar */}
                                    <div
                                        onClick={() => togglePo(po.id)}
                                        style={{
                                            padding: '16px 20px',
                                            backgroundColor: 'var(--color-pg-surface)',
                                            borderBottom: isExpanded ? '1px solid var(--color-pg-border)' : 'none',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-pg-text)' }}>
                                                {po.po_number}
                                            </span>
                                            <span style={{
                                                padding: '2px 10px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                backgroundColor: 'var(--color-pg-surface)',
                                                color: 'var(--color-pg-text-secondary)',
                                                fontWeight: 600,
                                            }}>
                                                {po.client_name}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                backgroundColor: allInvoiced ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                                color: allInvoiced ? 'var(--color-pg-success, #22c55e)' : 'var(--color-pg-warning, #fbbf24)',
                                                border: `1px solid ${allInvoiced ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                                            }}>
                                                {allInvoiced ? (language === 'id' ? '100% Tertagih' : 'Fully Invoiced') : (language === 'id' ? 'Proses Tagih' : 'Invoicing in Progress')}
                                            </span>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                backgroundColor: allPaid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: allPaid ? 'var(--color-pg-success, #22c55e)' : 'var(--color-pg-danger, #ef4444)',
                                                border: `1px solid ${allPaid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                            }}>
                                                {allPaid ? (language === 'id' ? 'Lunas' : 'Fully Paid') : (language === 'id' ? 'Belum Lunas' : 'Unpaid Balance')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    {isExpanded && (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid var(--color-pg-border)', color: 'var(--color-pg-text-secondary)' }}>
                                                        <th style={{ padding: '12px 20px', fontWeight: 600 }}>{t.item_name}</th>
                                                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t.target_qty}</th>
                                                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t.delivered_qty}</th>
                                                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t.invoice_status}</th>
                                                        <th style={{ padding: '12px 20px', fontWeight: 600 }}>{t.payment_status}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map((item) => {
                                                        const invStatus = item.invoice_status || 'UNINVOICED';
                                                        const payStatus = item.payment_status || 'UNPAID';
                                                        const isItemLoading = loadingId === item.id;

                                                        const invStatuses = ['UNINVOICED', 'PARTIAL', 'INVOICED'];
                                                        const payStatuses = ['UNPAID', 'PARTIAL_PAID', 'PAID'];

                                                        return (
                                                            <tr key={item.id} style={{
                                                                borderBottom: '1px solid var(--color-pg-border)',
                                                                opacity: isItemLoading ? 0.6 : 1,
                                                            }}>
                                                                <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--color-pg-text)' }}>
                                                                    {item.item_name}
                                                                    {item.delivery_status === 'PENDING' && (
                                                                        <span style={{ display: 'block', fontSize: '11px', color: '#f59e0b', marginTop: '2px', fontWeight: 400 }}>

                                                                            ⚠️ {language === 'id' ? 'Menunggu pengiriman barang' : 'Pending physical delivery'}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '16px 16px', color: 'var(--color-pg-text)', fontWeight: 600 }}>
                                                                    {item.target_qty}
                                                                </td>
                                                                <td style={{ padding: '16px 16px', color: (item.delivered_qty && item.delivered_qty >= item.target_qty) ? '#22c55e' : 'var(--color-pg-text-secondary)', fontWeight: 600 }}>
                                                                    {item.delivered_qty || 0} / {item.target_qty}
                                                                </td>
                                                                <td style={{ padding: '16px 16px' }}>
                                                                    <div style={{
                                                                        display: 'inline-flex',
                                                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                                                        padding: '3px',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid var(--color-pg-border)',
                                                                        gap: '2px',
                                                                    }}>
                                                                        {invStatuses.map((s) => {
                                                                            const active = invStatus === s;
                                                                            const label = s === 'UNINVOICED' ? t.uninvoiced : s === 'PARTIAL' ? t.partial : t.invoiced;
                                                                            return (
                                                                                <button
                                                                                    key={s}
                                                                                    disabled={active || isItemLoading}
                                                                                    onClick={() => handleUpdateFinance(item, s, undefined)}
                                                                                    style={{
                                                                                        padding: '4px 10px',
                                                                                        borderRadius: '6px',
                                                                                        border: 'none',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: 700,
                                                                                        backgroundColor: active ? (s === 'INVOICED' ? '#22c55e' : s === 'PARTIAL' ? '#f59e0b' : 'var(--color-pg-text-muted)') : 'transparent',
                                                                                        color: active ? 'var(--color-pg-text)' : 'var(--color-pg-text-secondary)',
                                                                                        cursor: active ? 'default' : 'pointer',
                                                                                        transition: 'all 0.15s',
                                                                                    }}
                                                                                >
                                                                                    {label}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '16px 20px' }}>
                                                                    <div style={{
                                                                        display: 'inline-flex',
                                                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                                                        padding: '3px',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid var(--color-pg-border)',
                                                                        gap: '2px',
                                                                    }}>
                                                                        {payStatuses.map((p) => {
                                                                            const active = payStatus === p;
                                                                            const label = p === 'UNPAID' ? t.unpaid : p === 'PARTIAL_PAID' ? t.partial_paid : t.paid;
                                                                            return (
                                                                                <button
                                                                                    key={p}
                                                                                    disabled={active || isItemLoading}
                                                                                    onClick={() => handleUpdateFinance(item, undefined, p)}
                                                                                    style={{
                                                                                        padding: '4px 10px',
                                                                                        borderRadius: '6px',
                                                                                        border: 'none',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: 700,
                                                                                        backgroundColor: active ? (p === 'PAID' ? '#22c55e' : p === 'PARTIAL_PAID' ? '#f59e0b' : '#ef4444') : 'transparent',
                                                                                        color: active ? 'var(--color-pg-text)' : 'var(--color-pg-text-secondary)',
                                                                                        cursor: active ? 'default' : 'pointer',
                                                                                        transition: 'all 0.15s',
                                                                                    }}
                                                                                >
                                                                                    {label}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </main>
                </div>
            </div>
        </div>
    );
}
