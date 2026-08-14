import React from 'react';
import { translateStatus, Language } from '../Utils/locale';

type BadgeColor = {
    bg: string;
    text: string;
    border: string;
    dot?: string;
};

const COLOR_MAPS: Record<string, BadgeColor> = {
    // PO and Item General Statuses
    COMPLETED: { bg: 'rgba(52, 211, 153, 0.15)', text: 'var(--color-pg-success, #10b981)', border: '1px solid var(--color-pg-success, #10b981)', dot: 'var(--color-pg-success, #10b981)' },
    IN_PROGRESS: { bg: 'rgba(251, 191, 36, 0.15)', text: 'var(--color-pg-warning, #f59e0b)', border: '1px solid var(--color-pg-warning, #f59e0b)', dot: 'var(--color-pg-warning, #f59e0b)' },
    IN_PRODUCTION: { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', border: '1px solid #f97316', dot: '#f97316' },
    CANCELLED: { bg: 'rgba(248, 113, 113, 0.15)', text: 'var(--color-pg-danger, #ef4444)', border: '1px solid var(--color-pg-danger, #ef4444)', dot: 'var(--color-pg-danger, #ef4444)' },
    TERMINATED: { bg: 'var(--color-pg-surface)', text: 'var(--color-pg-text-muted, #71717a)', border: '1px solid var(--color-pg-border)', dot: 'var(--color-pg-text-muted)' },
    PENDING: { bg: 'var(--color-pg-primary-glow, rgba(99, 102, 241, 0.15))', text: 'var(--color-pg-primary, #6366f1)', border: '1px solid var(--color-pg-primary, #6366f1)', dot: 'var(--color-pg-primary, #6366f1)' },

    // PO Lifecycle Statuses
    DELIVERED: { bg: 'rgba(20, 184, 166, 0.15)', text: 'var(--color-pg-accent, #14b8a6)', border: '1px solid var(--color-pg-accent, #14b8a6)', dot: 'var(--color-pg-accent, #14b8a6)' },
    CLOSED: { bg: 'var(--color-pg-surface)', text: 'var(--color-pg-text-secondary, #71717a)', border: '1px solid var(--color-pg-border)', dot: 'var(--color-pg-text-secondary)' },
    
    // Urgency
    URGENT: { bg: 'rgba(239, 68, 68, 0.18)', text: 'var(--color-pg-danger, #ef4444)', border: '1px solid var(--color-pg-danger, #ef4444)', dot: 'var(--color-pg-danger, #ef4444)' },
    
    // Item Type
    MANUFACTURED: { bg: 'var(--color-pg-surface)', text: 'var(--color-pg-text, #3f3f46)', border: '1px solid var(--color-pg-border)' },
    MANUFACTURE: { bg: 'var(--color-pg-surface)', text: 'var(--color-pg-text, #3f3f46)', border: '1px solid var(--color-pg-border)' },
    BUYOUT: { bg: 'var(--color-pg-surface)', text: 'var(--color-pg-text, #3f3f46)', border: '1px solid var(--color-pg-border)' },
    BUY_OUT: { bg: 'var(--color-pg-surface)', text: 'var(--color-pg-text, #3f3f46)', border: '1px solid var(--color-pg-border)' },

    // Drafter / Drawings
    DRAWING: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' },
    APPROVED: { bg: 'rgba(52, 211, 153, 0.15)', text: 'var(--color-pg-success, #10b981)', border: '1px solid var(--color-pg-success, #10b981)' },

    // Purchasing / Delivery
    ORDER: { bg: 'rgba(251, 146, 60, 0.15)', text: 'var(--color-pg-orange, #f97316)', border: '1px solid var(--color-pg-orange, #f97316)' },
    PROSES: { bg: 'var(--color-pg-primary-glow, rgba(99, 102, 241, 0.15))', text: 'var(--color-pg-primary, #6366f1)', border: '1px solid var(--color-pg-primary, #6366f1)' },
    READY: { bg: 'rgba(52, 211, 153, 0.15)', text: 'var(--color-pg-success, #10b981)', border: '1px solid var(--color-pg-success, #10b981)' },

    // Invoicing
    UNINVOICED: { bg: 'var(--color-pg-surface)', text: 'var(--color-pg-text-muted, #71717a)', border: '1px solid var(--color-pg-border)' },
    PARTIAL: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' },
    INVOICED: { bg: 'rgba(52, 211, 153, 0.15)', text: 'var(--color-pg-success, #10b981)', border: '1px solid var(--color-pg-success, #10b981)' },

    // Payments
    UNPAID: { bg: 'var(--color-pg-surface)', text: 'var(--color-pg-text-muted, #71717a)', border: '1px solid var(--color-pg-border)' },
    PARTIAL_PAID: { bg: 'var(--color-pg-primary-glow, rgba(99, 102, 241, 0.15))', text: 'var(--color-pg-primary, #6366f1)', border: '1px solid var(--color-pg-primary, #6366f1)' },
    PAID: { bg: 'rgba(52, 211, 153, 0.15)', text: 'var(--color-pg-success, #10b981)', border: '1px solid var(--color-pg-success, #10b981)' },
    
    // Bottlenecks
    STUCK: { bg: 'rgba(239, 68, 68, 0.18)', text: 'var(--color-pg-danger, #ef4444)', border: '1px solid var(--color-pg-danger, #ef4444)', dot: 'var(--color-pg-danger, #ef4444)' },
};

interface StatusBadgeProps {
    status: string;
    variant?: 'dot' | 'solid';
    style?: React.CSSProperties;
    children?: React.ReactNode;
    lang?: Language;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    variant = 'dot',
    style,
    children,
    lang,
}) => {
    const key = status.toUpperCase().replace(/\s+/g, '_');
    const color = COLOR_MAPS[key] || {
        bg: 'var(--color-pg-surface, rgba(255, 255, 255, 0.04))',
        text: 'var(--color-pg-text-muted, #71717a)',
        border: '1px solid var(--color-pg-border)',
    };

    const hasDot = variant === 'dot' && color.dot;
    const displayText = children || translateStatus(status, lang);

    return (
        <span
            className="badge"
            style={{
                backgroundColor: color.bg,
                color: color.text,
                border: color.border,
                fontSize: '11px',
                padding: '3px 9px',
                fontWeight: 600, // Medium importance secondary control
                letterSpacing: '0.02em',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0,
                lineHeight: 1.2,
                ...style,
            }}
        >
            {hasDot && (
                <span
                    style={{
                        width: '5px',
                        height: '5px',
                        backgroundColor: color.dot,
                        borderRadius: '50%',
                    }}
                />
            )}
            {displayText}
        </span>
    );
};

