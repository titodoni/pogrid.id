import React from 'react';
import { AlertTriangle } from '../../Components/Icons';

interface ProgressControlsProps {
    targetQty: number;
    maxQty: number;
    savedCompletedQty: number;
    savedProgressPercent: string;
    hasPreviousUpdate: boolean;
    localCompletedQty: number;
    setLocalCompletedQty: React.Dispatch<React.SetStateAction<number>>;
    localProgressPercent: string;
    setLocalProgressPercent: (value: string) => void;
    isQcStage: boolean;
    isDeliveryStage: boolean;
    showKendala: boolean;
    setShowKendala: React.Dispatch<React.SetStateAction<boolean>>;
    showQc: boolean;
    setShowQc: React.Dispatch<React.SetStateAction<boolean>>;
    onShowQcForSinglePiece: () => void;
    onRevert: () => void;
    loading: boolean;
    language: 'en' | 'id';
    t: Record<string, any>;
}

/**
 * Progress controls for the active stage inside an expanded worker item card:
 * multi-piece quantity stepper, single-piece QC / delivery / percentage
 * buttons, revert action, and the trouble/rework toggles. Presentation only —
 * all submits and state ownership stay in the card.
 */
export default function ProgressControls({
    targetQty,
    maxQty,
    savedCompletedQty,
    savedProgressPercent,
    hasPreviousUpdate,
    localCompletedQty,
    setLocalCompletedQty,
    localProgressPercent,
    setLocalProgressPercent,
    isQcStage,
    isDeliveryStage,
    showKendala,
    setShowKendala,
    showQc,
    setShowQc,
    onShowQcForSinglePiece,
    onRevert,
    loading,
    language,
    t,
}: ProgressControlsProps) {
    return (
        <>
            {targetQty > 1 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-pg-border-subtle)',
                    borderRadius: '12px',
                    border: '1px solid var(--color-pg-border)',
                }}>
                    <div style={{ marginRight: 'auto', paddingLeft: '4px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        {language === 'en' ? 'Completed' : 'Selesai'}
                    </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-pg-text)', lineHeight: '1' }}>
                                {localCompletedQty}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)' }}>
                                / {maxQty}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                            value={localCompletedQty}
                            disabled={loading || savedCompletedQty >= maxQty}
                            onChange={(e) => setLocalCompletedQty(parseInt(e.target.value, 10))}
                            className="focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 appearance-none text-center"
                            style={{
                                width: '70px',
                                height: '56px',
                                borderRadius: '14px',
                                border: '1px solid var(--color-pg-border)',
                                backgroundColor: 'var(--color-pg-input)',
                                color: 'var(--color-pg-text)',
                                fontSize: '16px',
                                fontWeight: 700,
                                outline: 'none',
                                boxSizing: 'border-box',
                                cursor: 'pointer',
                                textAlignLast: 'center',
                                padding: '0 8px',
                            }}
                        >
                            {Array.from(
                                { length: maxQty - savedCompletedQty + 1 },
                                (_, i) => savedCompletedQty + i
                            ).map((val) => (
                                <option key={val} value={val} style={{ backgroundColor: 'var(--color-pg-input)', color: 'var(--color-pg-text)' }}>
                                    {val}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => setLocalCompletedQty(prev => Math.min(maxQty, prev + 1))}
                            disabled={loading || localCompletedQty >= maxQty || savedCompletedQty >= maxQty}
                            className="focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:brightness-105 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none transition-all duration-150"
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '14px',
                                border: 'none',
                                backgroundColor: 'var(--color-pg-success)',
                                color: 'var(--color-pg-surface)',
                                fontSize: '24px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)',
                            }}
                            title="Increase"
                        >
                            +
                        </button>
                    </div>
                </div>
            )}

            {targetQty === 1 && isQcStage && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '8px',
                }}>
                    <button
                        disabled={loading}
                        onClick={onShowQcForSinglePiece}
                        className="focus:outline-none focus:ring-2 focus:ring-red-500/50 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
                        style={{
                            padding: '16px 8px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'var(--color-pg-danger)',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: 800,
                            cursor: 'pointer',
                        }}
                    >
                        NG
                    </button>
                    <button
                        disabled={loading || savedCompletedQty >= targetQty}
                        onClick={() => {
                            if (!loading) {
                                setLocalProgressPercent('100');
                                setLocalCompletedQty(1);
                            }
                        }}
                        className="focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
                        style={{
                            padding: '16px 8px',
                            borderRadius: '8px',
                            border: localProgressPercent === '100' ? '2px solid #ffffff' : 'none',
                            backgroundColor: localProgressPercent === '100' ? '#10b981' : 'var(--color-pg-success)',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: 800,
                            cursor: (loading || savedCompletedQty >= targetQty) ? 'not-allowed' : 'pointer',
                            boxShadow: localProgressPercent === '100' ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none',
                        }}
                    >
                        OK
                    </button>
                </div>
            )}

            {targetQty === 1 && isDeliveryStage && (
                <div style={{ marginBottom: '8px' }}>
                    <button
                        disabled={loading || savedCompletedQty >= targetQty}
                        onClick={() => {
                            if (!loading) {
                                setLocalProgressPercent('100');
                                setLocalCompletedQty(1);
                            }
                        }}
                        className="focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
                        style={{
                            width: '100%',
                            padding: '16px 8px',
                            borderRadius: '8px',
                            border: localProgressPercent === '100' ? '2px solid #ffffff' : 'none',
                            backgroundColor: localProgressPercent === '100' ? '#10b981' : 'var(--color-pg-success)',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: 800,
                            cursor: (loading || savedCompletedQty >= targetQty) ? 'not-allowed' : 'pointer',
                            boxShadow: localProgressPercent === '100' ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none',
                        }}
                    >
                        {language === 'en' ? 'Delivered' : 'Terkirim'}
                    </button>
                </div>
            )}

            {targetQty === 1 && !isQcStage && !isDeliveryStage && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '6px',
                    marginBottom: '8px',
                }}>
                    {[0, 25, 50, 75, 100].map((pct) => {
                        const currentPct = parseFloat(localProgressPercent || '0');
                        const savedPct = parseFloat(savedProgressPercent || '0');
                        const isDisabled = pct < savedPct;
                        return (
                            <button
                                key={pct}
                                onClick={() => {
                                    if (!isDisabled && !loading) {
                                        setLocalProgressPercent(pct.toString());
                                        setLocalCompletedQty(pct === 100 ? 1 : 0);
                                    }
                                }}
                                disabled={isDisabled || loading}
                                className="focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:brightness-110 active:scale-[0.95] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
                                style={{
                                    padding: '14px 4px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: currentPct === pct
                                        ? 'var(--color-pg-primary)' : 'var(--color-pg-border-subtle)',
                                    color: 'var(--color-pg-text)',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: (isDisabled || loading) ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {pct}%
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Revert Last Update Button */}
            {hasPreviousUpdate && (
                <div style={{ marginBottom: '8px' }}>
                    <button
                        disabled={loading}
                        onClick={onRevert}
                        className="focus:outline-none focus:ring-1 focus:ring-red-500/50 hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: 'rgba(248, 113, 113, 0.12)',
                            color: 'var(--color-pg-danger)',
                            border: '1px solid rgba(248, 113, 113, 0.2)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                        }}
                    >
                        {language === 'en' ? 'Revert Last Update' : 'Batal / Revert Update Terakhir'}
                    </button>
                </div>
            )}
            <div style={{ display: 'flex', gap: '6px' }}>
                <button
                    disabled={loading}
                    onClick={() => !loading && setShowKendala(prev => !prev)}
                    className="focus:outline-none focus:ring-1 focus:ring-red-500/50 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
                    style={{
                        flex: 1,
                        padding: '12px 10px',
                        backgroundColor: showKendala ? 'rgba(248, 113, 113, 0.22)' : 'rgba(248, 113, 113, 0.1)',
                        color: 'var(--color-pg-danger)',
                        border: '1px solid rgba(248, 113, 113, 0.2)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                    }}
                >
                    <AlertTriangle size={14} /> {t.report_failure}
                </button>
                {(!isQcStage || targetQty > 1) && (
                    <button
                        disabled={loading}
                        onClick={() => !loading && setShowQc(prev => !prev)}
                        className="focus:outline-none focus:ring-1 focus:ring-amber-500/50 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
                        style={{
                            flex: 1,
                            padding: '12px 10px',
                            backgroundColor: showQc ? 'rgba(251, 191, 36, 0.22)' : 'rgba(251, 191, 36, 0.1)',
                            color: 'var(--color-pg-warning)',
                            border: '1px solid rgba(251, 191, 36, 0.2)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                        </svg> {t.log_rework}
                    </button>
                )}
            </div>
        </>
    );
}
