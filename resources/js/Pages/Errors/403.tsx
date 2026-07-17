import React from 'react';
import { Link } from '@inertiajs/react';

export default function Forbidden({ status }: { status?: number }) {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-pg-bg)', fontFamily: 'Inter, sans-serif', color: '#fafafa', padding: '16px' }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '96px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>403</h1>
                <p style={{ color: '#a1a1aa', fontSize: '18px', marginTop: '8px' }}>Forbidden</p>
                <p style={{ color: '#71717a', fontSize: '14px', marginTop: '4px' }}>You don't have permission to access this resource.</p>
                <Link href="/" style={{ display: 'inline-block', marginTop: '24px', padding: '12px 24px', background: '#6366f1', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>Go Home</Link>
            </div>
        </div>
    );
}
