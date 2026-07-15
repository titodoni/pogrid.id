import React, { useEffect } from 'react';

interface FullscreenOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    alignment?: 'center' | 'top';
    zIndex?: number;
    backdropFilter?: string;
    backgroundColor?: string;
    padding?: string;
    children: React.ReactNode;
}

export const FullscreenOverlay: React.FC<FullscreenOverlayProps> = ({
    isOpen,
    onClose,
    alignment = 'center',
    zIndex = 100,
    backdropFilter = 'blur(10px)',
    backgroundColor = 'rgba(0, 0, 0, 0.8)',
    padding = '40px 20px',
    children,
}) => {
    // Escape key listener to close overlay
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: backgroundColor,
                backdropFilter: backdropFilter,
                display: 'flex',
                alignItems: alignment === 'top' ? 'flex-start' : 'center',
                justifyContent: 'center',
                zIndex: zIndex,
                padding: padding,
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {children}
        </div>
    );
};
