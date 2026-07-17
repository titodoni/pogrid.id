import React, { useEffect } from 'react';
import { Close } from '../Icons';

interface ModalShellProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    size?: 'sm' | 'md' | 'lg'; // sm = 420px, md = 460px, lg = 640px
    zIndex?: number;
    children: React.ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    size = 'md',
    zIndex = 60,
    children,
}) => {
    // Escape key listener to close modal
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Map sizing options
    const maxW = size === 'sm' ? '420px' : size === 'lg' ? '640px' : '460px';

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: zIndex,
                padding: '20px',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                style={{
                    backgroundColor: '#18181b',
                    border: '1px solid var(--color-pg-border)',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                    width: '100%',
                    maxWidth: maxW,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0', color: '#fafafa' }}>{title}</h2>
                        {subtitle && <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#71717a',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Close size={16} />
                    </button>
                </div>

                {/* Content */}
                {children}
            </div>
        </div>
    );
};
