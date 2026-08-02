import React from 'react';

export interface BroadcastToastEntry {
    message: string;
    severity: string;
    id: number;
    timestamp: number;
}

interface BroadcastToastsProps {
    toasts: BroadcastToastEntry[];
    onDismiss: (timestamp: number) => void;
    language: 'en' | 'id';
}

const TITLE: Record<'RED' | 'ALERT' | 'INFO' | 'QC', { en: string; id: string }> = {
    RED: { en: 'Kendala Reported', id: 'Kendala Dilaporkan' },
    ALERT: { en: 'Alert Escalated', id: 'Peringatan Dinaikkan' },
    INFO: { en: 'Task Updated', id: 'Tugas Diperbarui' },
    QC: { en: 'QC Rework', id: 'Rework QC' },
};

// Shared live broadcast toasts (window "slideIn" keyframe is global in app.css).
export const BroadcastToasts: React.FC<BroadcastToastsProps> = ({ toasts, onDismiss, language }) => {
    if (toasts.length === 0) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Notifications"
            style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
            {toasts.map((t) => {
                const kind: 'RED' | 'ALERT' | 'INFO' | 'QC' =
                    t.severity === 'RED' ? 'RED' : t.severity === 'ALERT' ? 'ALERT' : t.severity === 'INFO' ? 'INFO' : 'QC';
                const backgroundColor =
                    kind === 'RED'
                        ? 'rgba(239, 68, 68, 0.95)'
                        : kind === 'ALERT'
                        ? 'rgba(251, 191, 36, 0.95)'
                        : kind === 'INFO'
                        ? 'rgba(59, 130, 246, 0.95)'
                        : 'rgba(251, 191, 36, 0.95)';
                const iconEl = kind === 'RED' ? '🚨' : kind === 'ALERT' ? '🔴' : kind === 'INFO' ? 'ℹ️' : '⚠️';

                return (
                    <div
                        key={t.timestamp}
                        onClick={() => onDismiss(t.timestamp)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onDismiss(t.timestamp);
                            }
                        }}
                        aria-label={`${TITLE[kind][language]}: ${t.message}`}
                        style={{
                            backgroundColor: backgroundColor,
                            color: '#fff',
                            padding: '12px 20px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 600,
                            maxWidth: '360px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            animation: 'slideIn 0.3s ease-out',
                            cursor: 'pointer',
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>{iconEl}</span>
                        <div>
                            <div style={{ fontWeight: 700, marginBottom: '2px' }}>{TITLE[kind][language]}</div>
                            <div style={{ opacity: 0.9, fontSize: '12px' }}>{t.message}</div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDismiss(t.timestamp);
                            }}
                            aria-label="Dismiss"
                            style={{
                                marginLeft: 'auto',
                                background: 'none',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '18px',
                                opacity: 0.7,
                            }}
                        >
                            ×
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default BroadcastToasts;