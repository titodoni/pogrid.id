import React from 'react';

export default function Maintenance({ message }: { status?: number; message?: string | null }) {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-pg-bg)', fontFamily: 'Inter, sans-serif', color: 'var(--color-pg-text)', padding: '16px' }}>
            <div style={{ textAlign: 'center', maxWidth: '480px' }}>
                <h1 style={{ fontSize: '96px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>503</h1>
                <p style={{ color: 'var(--color-pg-text-secondary)', fontSize: '18px', marginTop: '8px' }}>Sedang Pemeliharaan</p>
                <p style={{ color: 'var(--color-pg-text-muted)', fontSize: '14px', marginTop: '4px' }}>
                    {message || 'POGrid sedang dalam pemeliharaan terjadwal. Silakan coba beberapa saat lagi.'}
                </p>
            </div>
        </div>
    );
}
