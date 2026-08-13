import React from 'react';

interface QcReworkFormProps {
    targetQty: number;
    rejectQty: string;
    setRejectQty: (value: string) => void;
    reworkReason: string;
    setReworkReason: (value: string) => void;
    onCancel: () => void;
    onSubmit: (e: React.FormEvent) => void;
    loading: boolean;
    t: Record<string, any>;
}

/**
 * QC rework form shown inside an expanded worker item card. The reject-qty
 * input only appears for multi-piece items (target_qty > 1); single-piece
 * rework is submitted as qty 1 elsewhere. Presentation only.
 */
export default function QcReworkForm({
    targetQty,
    rejectQty,
    setRejectQty,
    reworkReason,
    setReworkReason,
    onCancel,
    onSubmit,
    loading,
    t,
}: QcReworkFormProps) {
    return (
        <form onSubmit={onSubmit} style={{
            marginTop: '8px',
            padding: '10px',
            backgroundColor: 'var(--color-pg-border-subtle)',
            borderRadius: '10px',
        }}>
            {targetQty > 1 && (
                <>
                    <label style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                        {t.reject_qty_label}
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={rejectQty}
                        disabled={loading}
                        onChange={(e) => setRejectQty(e.target.value)}
                        className="focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 transition-all duration-150"
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            backgroundColor: 'var(--color-pg-input)',
                            color: 'var(--color-pg-text)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            marginBottom: '8px',
                        }}
                    />
                </>
            )}

            <label style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                {t.rework_reason_label}
            </label>
            <textarea
                required
                value={reworkReason}
                disabled={loading}
                onChange={(e) => setReworkReason(e.target.value)}
                placeholder={t.rework_reason_placeholder}
                className="focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 transition-all duration-150"
                style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '10px 12px',
                    backgroundColor: 'var(--color-pg-input)',
                    color: 'var(--color-pg-text)',
                    border: '1px solid var(--color-pg-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    marginBottom: '8px',
                    resize: 'vertical',
                }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="focus:outline-none focus:ring-1 focus:ring-white/25 hover:bg-white/5 active:scale-95 disabled:opacity-50 transition-all duration-150"
                    style={{
                        padding: '10px 16px',
                        backgroundColor: 'transparent',
                        color: 'var(--color-pg-text-secondary)',
                        border: '1px solid var(--color-pg-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                    }}
                >
                    {t.cancel}
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="focus:outline-none focus:ring-2 focus:ring-amber-500/50 hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all duration-150"
                    style={{
                        padding: '10px 18px',
                        backgroundColor: 'var(--color-pg-warning)',
                        color: 'var(--color-pg-surface)',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                    }}
                >
                    {t.submit}
                </button>
            </div>
        </form>
    );
}
