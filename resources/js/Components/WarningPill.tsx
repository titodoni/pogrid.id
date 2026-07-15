import React from 'react';
import { calculateDeadlineDiff } from '../Utils/deadline';

interface WarningPillProps {
    deadlineDateStr?: string;
    reworkMessage?: string | null | boolean;
    lang: 'en' | 'id';
}

export const WarningPill: React.FC<WarningPillProps> = ({
    deadlineDateStr,
    reworkMessage,
    lang,
}) => {
    if (!deadlineDateStr) return null;

    // Check Rework first (takes precedence or is a high priority status)
    if (reworkMessage) {
        const displayMsg = typeof reworkMessage === 'string'
            ? reworkMessage
            : (lang === 'id' ? 'Rework' : 'Rework');

        return (
            <span className="badge" style={{
                backgroundColor: 'rgba(251, 146, 60, 0.12)', // Orange background
                color: '#fb923c', // Orange text
                border: '1px solid rgba(251, 146, 60, 0.2)',
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
            }}>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#fb923c', borderRadius: '50%' }} />
                {displayMsg}
            </span>
        );
    }

    const { diffDays } = calculateDeadlineDiff(deadlineDateStr);

    if (diffDays < 0) {
        // Red warning (delayed)
        const days = Math.abs(diffDays);
        const text = lang === 'id' 
            ? `Terlambat ${days} hari` 
            : `Delayed ${days} day${days > 1 ? 's' : ''}`;
        return (
            <span className="badge" style={{
                backgroundColor: 'rgba(248, 113, 113, 0.12)', // Red background
                color: '#f87171', // Red text
                border: '1px solid rgba(248, 113, 113, 0.2)',
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
            }}>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#f87171', borderRadius: '50%' }} />
                {text}
            </span>
        );
    } else if (diffDays <= 3) {
        // Yellow warning (deadline close)
        let text = '';
        if (diffDays === 0) {
            text = lang === 'id' ? 'Hari Ini' : 'Today';
        } else {
            text = lang === 'id' 
                ? `${diffDays} hari lagi` 
                : `${diffDays} more day${diffDays > 1 ? 's' : ''}`;
        }
        return (
            <span className="badge" style={{
                backgroundColor: 'rgba(251, 191, 36, 0.12)', // Yellow background
                color: '#fbbf24', // Yellow text
                border: '1px solid rgba(251, 191, 36, 0.2)',
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
            }}>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#fbbf24', borderRadius: '50%' }} />
                {text}
            </span>
        );
    } else {
        // Green warning (normal/on track)
        return (
            <span className="badge" style={{
                backgroundColor: 'rgba(52, 211, 153, 0.12)', // Green background
                color: '#34d399', // Green text
                border: '1px solid rgba(52, 211, 153, 0.2)',
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
            }}>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#34d399', borderRadius: '50%' }} />
                {lang === 'id' ? 'Normal' : 'Normal'}
            </span>
        );
    }
};
