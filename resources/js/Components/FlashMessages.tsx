import React, { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

interface Flash {
    success?: string;
    error?: string;
}

export default function FlashMessages() {
    const { flash, errors } = usePage<{ flash: Flash; errors: Record<string, string> }>().props;
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (flash?.success || flash?.error || (errors && Object.keys(errors).length > 0)) {
            setVisible(true);
        }
    }, [flash, errors]);

    useEffect(() => {
        if (!visible) return;
        const timer = setTimeout(() => setVisible(false), 5000);
        return () => clearTimeout(timer);
    }, [visible, flash, errors]);

    if (!visible) return null;

    const hasErrors = errors && Object.keys(errors).length > 0;

    if (flash?.success) {
        return (
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                backgroundColor: 'rgba(16, 185, 129, 0.95)',
                color: '#fff',
                padding: '14px 20px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                maxWidth: '400px',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                {flash.success}
            </div>
        );
    }

    if (flash?.error) {
        return (
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                backgroundColor: 'rgba(239, 68, 68, 0.95)',
                color: '#fff',
                padding: '14px 20px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                maxWidth: '400px',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                {flash.error}
            </div>
        );
    }

    if (hasErrors) {
        return (
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                backgroundColor: 'rgba(239, 68, 68, 0.95)',
                color: '#fff',
                padding: '14px 20px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                maxWidth: '400px',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                {Object.entries(errors).map(([key, val]) => (
                    <div key={key}>{val}</div>
                ))}
            </div>
        );
    }

    return null;
}
