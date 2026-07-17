import React from 'react';

type BadgeColor = {
    bg: string;
    text: string;
    border: string;
    dot?: string;
};

const COLOR_MAPS: Record<string, BadgeColor> = {
    // PO and Item General Statuses
    COMPLETED: { bg: 'rgba(52, 211, 153, 0.12)', text: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)', dot: '#34d399' },
    IN_PROGRESS: { bg: 'rgba(251, 191, 36, 0.12)', text: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.2)', dot: '#fbbf24' },
    CANCELLED: { bg: 'rgba(248, 113, 113, 0.12)', text: '#f87171', border: '1px solid rgba(248, 113, 113, 0.2)', dot: '#f87171' },
    TERMINATED: { bg: 'rgba(161, 161, 170, 0.12)', text: '#a1a1aa', border: '1px solid rgba(161, 161, 170, 0.2)', dot: '#a1a1aa' },
    PENDING: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818cf8', border: '1px solid var(--color-pg-primary-glow)', dot: '#818cf8' },

    // PO Lifecycle Statuses
    DELIVERED: { bg: 'rgba(20, 184, 166, 0.12)', text: '#14b8a6', border: '1px solid rgba(20, 184, 166, 0.2)', dot: '#14b8a6' },
    CLOSED: { bg: 'rgba(113, 113, 122, 0.12)', text: '#a1a1aa', border: '1px solid rgba(113, 113, 122, 0.2)', dot: '#a1a1aa' },
    
    // Urgency
    URGENT: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', dot: '#ef4444' },
    
    // Item Type
    MANUFACTURED: { bg: 'rgba(255, 255, 255, 0.04)', text: '#fafafa', border: '1px solid var(--color-pg-border)' },
    BUYOUT: { bg: 'rgba(255, 255, 255, 0.04)', text: '#fafafa', border: '1px solid var(--color-pg-border)' },

    // Drafter / Drawings
    DRAWING: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.2)' },
    APPROVED: { bg: 'rgba(52, 211, 153, 0.12)', text: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)' },

    // Purchasing / Delivery
    ORDER: { bg: 'rgba(251, 146, 60, 0.12)', text: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.2)' },
    PROSES: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818cf8', border: '1px solid var(--color-pg-primary-glow)' },
    READY: { bg: 'rgba(52, 211, 153, 0.12)', text: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)' },

    // Invoicing
    UNINVOICED: { bg: 'rgba(255, 255, 255, 0.04)', text: '#a1a1aa', border: '1px solid rgba(255, 255, 255, 0.06)' },
    PARTIAL: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.2)' },
    INVOICED: { bg: 'rgba(52, 211, 153, 0.12)', text: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)' },

    // Payments
    UNPAID: { bg: 'rgba(255, 255, 255, 0.04)', text: '#a1a1aa', border: '1px solid rgba(255, 255, 255, 0.06)' },
    PARTIAL_PAID: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818cf8', border: '1px solid var(--color-pg-primary-glow)' },
    PAID: { bg: 'rgba(52, 211, 153, 0.12)', text: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)' },
};

interface StatusBadgeProps {
    status: string;
    variant?: 'dot' | 'solid';
    style?: React.CSSProperties;
    children?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    variant = 'dot',
    style,
    children,
}) => {
    const key = status.toUpperCase().replace(/\s+/g, '_');
    const color = COLOR_MAPS[key] || {
        bg: 'rgba(255, 255, 255, 0.04)',
        text: '#a1a1aa',
        border: '1px solid rgba(255, 255, 255, 0.06)',
    };

    const hasDot = variant === 'dot' && color.dot;

    return (
        <span
            className="badge"
            style={{
                backgroundColor: color.bg,
                color: color.text,
                border: color.border,
                fontSize: '10px',
                padding: '2px 8px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
                ...style,
            }}
        >
            {hasDot && (
                <span
                    style={{
                        width: '4px',
                        height: '4px',
                        backgroundColor: color.dot,
                        borderRadius: '50%',
                    }}
                />
            )}
            {children || status}
        </span>
    );
};
