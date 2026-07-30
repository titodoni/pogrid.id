import React from 'react';
import { calculateDeadlineDiff } from '../Utils/deadline';

interface WarningPillProps {
    deadlineDateStr?: string;
    reworkMessage?: string | null | boolean;
    lang: 'en' | 'id';
}

const ExclaimIcon: React.FC = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const ClockIcon: React.FC = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const CheckIcon: React.FC = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const RefreshIcon: React.FC = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
);

export const WarningPill: React.FC<WarningPillProps> = ({
    deadlineDateStr,
    reworkMessage,
    lang,
}) => {
    if (!deadlineDateStr) return null;

    if (reworkMessage) {
        let displayMsg = lang === 'id' ? 'Rework QC' : 'QC Rework';
        
        if (typeof reworkMessage === 'string') {
            const match = reworkMessage.match(/(\d+)\s+(?:items?|pcs)(?:\s+rejected)?/i) || reworkMessage.match(/QC Rework:\s*(\d+)/i) || reworkMessage.match(/\((\d+)\s*pcs\)/i);
            if (match && parseInt(match[1], 10) > 0) {
                displayMsg = lang === 'id' ? `Rework QC (${match[1]} pcs)` : `QC Rework (${match[1]} pcs)`;
            }
        }

        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] text-[11px] font-semibold flex-shrink-0 whitespace-nowrap overflow-hidden" style={{
                backgroundColor: 'rgba(251, 146, 60, 0.15)',
                color: 'var(--color-pg-orange, #f97316)',
                border: '1px solid var(--color-pg-orange, rgba(251, 146, 60, 0.3))',
                maxWidth: '220px'
            }} title={typeof reworkMessage === 'string' ? reworkMessage : undefined}>
                <RefreshIcon />
                <span className="truncate">{displayMsg}</span>
            </span>
        );
    }

    const { diffDays } = calculateDeadlineDiff(deadlineDateStr);

    if (diffDays < 0) {
        const days = Math.abs(diffDays);
        const text = lang === 'id'
            ? `Terlambat ${days} hari`
            : `Delayed ${days} day${days > 1 ? 's' : ''}`;
        return (
            <span style={{
                backgroundColor: 'rgba(248, 113, 113, 0.15)',
                color: 'var(--color-pg-danger, #ef4444)',
                border: '1px solid var(--color-pg-danger, rgba(248, 113, 113, 0.3))',
                fontSize: '11px',
                padding: '3px 9px',
                fontWeight: 600,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0
            }}>
                <ExclaimIcon />
                {text}
            </span>
        );
    } else if (diffDays <= 3) {
        let text = '';
        if (diffDays === 0) {
            text = lang === 'id' ? 'Batas Hari Ini' : 'Due Today';
        } else {
            text = lang === 'id'
            ? `Sisa ${diffDays} hari`
                : `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
        }
        return (
            <span style={{
                backgroundColor: 'rgba(251, 191, 36, 0.15)',
                color: 'var(--color-pg-warning, #f59e0b)',
                border: '1px solid var(--color-pg-warning, rgba(251, 191, 36, 0.3))',
                fontSize: '11px',
                padding: '3px 9px',
                fontWeight: 600,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0
            }}>
                <ClockIcon />
                {text}
            </span>
        );
    } else {
        return (
            <span style={{
                backgroundColor: 'rgba(52, 211, 153, 0.15)',
                color: 'var(--color-pg-success, #10b981)',
                border: '1px solid var(--color-pg-success, rgba(52, 211, 153, 0.3))',
                fontSize: '11px',
                padding: '3px 9px',
                fontWeight: 600,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0
            }}>
                <CheckIcon />
                {lang === 'id' ? 'Aman / Sesuai Jadwal' : 'On Schedule'}
            </span>
        );
    }
};
