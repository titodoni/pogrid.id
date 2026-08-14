import React from 'react';
import { Link } from '@inertiajs/react';

// Branded, responsive 404 page consistent with the POgrid design language:
// full-viewport layout, brand gradient headline, semantic actions (Home /
// Back), and Astryx design tokens (var(--color-pg-*) / var(--spacing-*)) —
// no raw hex/px per the Astryx rules.
export default function NotFound({ status }: { status?: number }) {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-pg-bg)',
            fontFamily: 'var(--font-sans, Inter, sans-serif)',
            color: 'var(--color-pg-text)',
            padding: 'var(--spacing-lg, 24px)',
            boxSizing: 'border-box',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Brand glow backdrop */}
            <div style={{
                position: 'absolute',
                top: '12%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'min(520px, 90vw)',
                height: 'min(520px, 90vw)',
                borderRadius: '50%',
                background: 'var(--color-pg-primary-glow)',
                filter: 'blur(100px)',
                opacity: 0.35,
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            {/* Brand logo */}
            <Link href="/" aria-label="POgrid.id — Home" style={{ textDecoration: 'none', position: 'relative', zIndex: 1 }}>
                <img src="/pogrid-logo.png" alt="POgrid.id Logo" style={{ height: '48px', width: 'auto', marginBottom: 'var(--spacing-md, 16px)' }} />
            </Link>

            <h1 style={{
                fontSize: 'clamp(64px, 18vw, 128px)',
                fontWeight: 800,
                margin: 0,
                lineHeight: 1,
                background: 'linear-gradient(135deg, var(--color-pg-primary) 0%, var(--color-pg-primary-hover) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                position: 'relative',
                zIndex: 1,
            }}>404</h1>

            <p style={{
                color: 'var(--color-pg-text-secondary)',
                fontSize: 'clamp(16px, 3vw, 20px)',
                fontWeight: 600,
                marginTop: 'var(--spacing-sm, 8px)',
                position: 'relative',
                zIndex: 1,
            }}>Page not found</p>
            <p style={{
                color: 'var(--color-pg-text-muted)',
                fontSize: '14px',
                marginTop: 'var(--spacing-xs, 4px)',
                maxWidth: '440px',
                position: 'relative',
                zIndex: 1,
            }}>The page you're looking for doesn't exist or has been moved.</p>

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 'var(--spacing-sm, 12px)',
                marginTop: 'var(--spacing-xl, 32px)',
                position: 'relative',
                zIndex: 1,
            }}>
                <Link href="/"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, var(--color-pg-primary) 0%, var(--color-pg-primary-hover) 100%)',
                        color: 'var(--color-pg-primary-ink)',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '14px',
                        boxShadow: '0 4px 12px var(--color-pg-primary-glow)',
                    }}
                >Go Home</Link>

                <button
                    type="button"
                    onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = '/')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: 'var(--color-pg-surface)',
                        color: 'var(--color-pg-text-secondary)',
                        borderRadius: '10px',
                        border: '1px solid var(--color-pg-border)',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >Go Back</button>
            </div>
        </div>
    );
}
