import React from 'react';

type InvoiceStatus = 'UNINVOICED' | 'PARTIAL' | 'INVOICED';
type PaymentStatus = 'UNPAID' | 'PARTIAL_PAID' | 'PAID';

interface FinancePanelProps {
    deliveryStatus?: string | null;
    deliveredQty: number;
    targetQty: number;
    invoiceStatus: InvoiceStatus;
    setInvoiceStatus: (status: InvoiceStatus) => void;
    invoicedQty: number;
    setInvoicedQty: (qty: number) => void;
    paymentStatus: PaymentStatus;
    setPaymentStatus: (status: PaymentStatus) => void;
    onSubmit: () => void;
    loading: boolean;
    language: 'en' | 'id';
    t: Record<string, any>;
}

/**
 * Finance stage panel shown inside an expanded worker item card: delivery
 * status readout, invoice/payment status selectors, invoiced-qty input, and
 * the save action. Presentation only — submit behavior stays owned by the card.
 */
export default function FinancePanel({
    deliveryStatus,
    deliveredQty,
    targetQty,
    invoiceStatus,
    setInvoiceStatus,
    invoicedQty,
    setInvoicedQty,
    paymentStatus,
    setPaymentStatus,
    onSubmit,
    loading,
    language,
    t,
}: FinancePanelProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Delivery Status & Delivered Qty Display for Finance */}
            <div style={{
                padding: '12px',
                backgroundColor: 'var(--color-pg-border-subtle)',
                border: '1px solid var(--color-pg-border)',
                borderRadius: '8px',
                marginBottom: '8px',
            }}>
                <div style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', marginBottom: '2px' }}>
                    {language === 'en' ? 'Item Delivery Status' : 'Status Pengiriman Barang'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: deliveryStatus === 'DELIVERED' ? 'var(--color-pg-success)' :
                            deliveryStatus === 'PARTIAL' ? 'var(--color-pg-warning)' : '#3b82f6'
                    }}>
                        {deliveryStatus === 'DELIVERED'
                            ? (language === 'id' ? 'Terkirim' : 'Delivered')
                            : deliveryStatus === 'PARTIAL'
                            ? (language === 'id' ? 'Terkirim Sebagian' : 'Partially Delivered')
                            : (language === 'id' ? 'Belum Dikirim' : 'Pending Delivery')}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-pg-text)' }}>
                        {deliveredQty ?? 0} / {targetQty} pcs
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: invoiceStatus === 'INVOICED' ? 'rgba(52, 211, 153, 0.12)' :
                        invoiceStatus === 'PARTIAL' ? 'rgba(168, 85, 247, 0.12)' : 'var(--color-pg-surface)',
                    color: invoiceStatus === 'INVOICED' ? 'var(--color-pg-success)' :
                        invoiceStatus === 'PARTIAL' ? '#c084fc' : 'var(--color-pg-text-secondary)',
                    border: '1px solid ' + (invoiceStatus === 'INVOICED' ? 'rgba(52, 211, 153, 0.2)' :
                        invoiceStatus === 'PARTIAL' ? 'rgba(168, 85, 247, 0.2)' : 'var(--color-pg-surface)'),
                }}>
                    {t.invoice_label}: {invoiceStatus === 'INVOICED' ? t.invoiced : invoiceStatus === 'PARTIAL' ? `${t.partially_invoiced} (${invoicedQty}/${targetQty})` : t.uninvoiced}
                </span>
                <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: paymentStatus === 'PAID' ? 'rgba(52, 211, 153, 0.12)' :
                        paymentStatus === 'PARTIAL_PAID' ? 'rgba(99, 102, 241, 0.12)' : 'var(--color-pg-surface)',
                    color: paymentStatus === 'PAID' ? 'var(--color-pg-success)' :
                        paymentStatus === 'PARTIAL_PAID' ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-text-secondary)',
                    border: '1px solid ' + (paymentStatus === 'PAID' ? 'rgba(52, 211, 153, 0.2)' :
                        paymentStatus === 'PARTIAL_PAID' ? 'rgba(99, 102, 241, 0.2)' : 'var(--color-pg-surface)'),
                }}>
                    {t.payment_label}: {paymentStatus === 'PAID' ? t.paid : paymentStatus === 'PARTIAL_PAID' ? t.partially_paid : t.unpaid}
                </span>
            </div>

            {/* Status selectors and qty input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', marginTop: '12px' }}>
                {/* Invoiced Status Selection */}
                <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-pg-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    {language === 'en' ? 'Invoice Status' : 'Status Invoice'}
                </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {(['UNINVOICED', 'PARTIAL', 'INVOICED'] as const).map(status => {
                            const isSel = invoiceStatus === status;
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => {
                                        setInvoiceStatus(status);
                                        if (status === 'INVOICED') setInvoicedQty(deliveredQty ?? 0);
                                        if (status === 'UNINVOICED') setInvoicedQty(0);
                                    }}
                                    className="focus:outline-none transition-all duration-150"
                                    style={{
                                        padding: '10px 8px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                    border: '1px solid ' + (isSel ? 'var(--color-pg-primary)' : 'var(--color-pg-border)'),
                                    backgroundColor: isSel ? 'var(--color-pg-primary-glow)' : 'var(--color-pg-bg)',
                                    color: isSel ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-text-secondary)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {status === 'PARTIAL' ? (language === 'en' ? 'PARTIAL' : 'SEBAGIAN') : status}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Invoiced Qty (Shown when PARTIAL) */}
                {invoiceStatus === 'PARTIAL' && (
                    <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-pg-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                            {language === 'en' ? 'Invoiced Quantity' : 'Jumlah Diinvoice'}
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="number"
                                min="0"
                                max={deliveredQty ?? 0}
                                value={invoicedQty}
                                onChange={e => {
                                    const val = Math.min(deliveredQty ?? 0, Math.max(0, parseInt(e.target.value) || 0));
                                    setInvoicedQty(val);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    fontSize: '14px',
                                    backgroundColor: 'var(--color-pg-bg)',
                                    border: '1px solid var(--color-pg-border)',
                                    borderRadius: '8px',
                                    color: 'var(--color-pg-text)',
                                    outline: 'none',
                                }}
                            />
                            <span style={{ fontSize: '13px', color: 'var(--color-pg-text-muted)' }}>
                                / {deliveredQty ?? 0}
                            </span>
                        </div>
                    </div>
                )}

                {/* Payment Status Selection */}
                <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-pg-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    {language === 'en' ? 'Payment Status' : 'Status Pembayaran'}
                </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {(['UNPAID', 'PARTIAL_PAID', 'PAID'] as const).map(status => {
                            const isSel = paymentStatus === status;
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setPaymentStatus(status)}
                                    className="focus:outline-none transition-all duration-150"
                                    style={{
                                        padding: '10px 8px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        border: '1px solid ' + (isSel ? '#10b981' : 'var(--color-pg-border)'),
                                        backgroundColor: isSel ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-pg-bg)',
                                        color: isSel ? 'var(--color-pg-success)' : 'var(--color-pg-text-secondary)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {status === 'PARTIAL_PAID' ? (language === 'en' ? 'PARTIAL' : 'SEBAGIAN') : status}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="button"
                    disabled={loading}
                    onClick={onSubmit}
                    className="focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none transition-all duration-200"
                    style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: '#10b981',
                        color: 'var(--color-pg-text)',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        marginTop: '8px',
                    }}
                >
                    {language === 'en' ? 'Save Status' : 'Simpan Status'}
                </button>
            </div>
        </div>
    );
}
