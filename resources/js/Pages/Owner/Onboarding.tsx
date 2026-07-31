import React, { useState } from 'react';
import { Link, router, usePage, useForm } from '@inertiajs/react';

interface Props {
    tenant: {
        company_name: string;
        slug: string;
    };
}

export default function Onboarding({ tenant }: Props) {
    const { flash } = usePage().props as any;
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
    });

    const [createdUser, setCreatedUser] = useState<{ name: string; email: string; tempPass?: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/users/onboarding-create', {
            onSuccess: (page) => {
                const successMsg = (page.props.flash as any)?.success || '';
                let tempPass = '';
                const match = successMsg.match(/Temporary password '([^']+)'/);
                if (match) {
                    tempPass = match[1];
                }
                setCreatedUser({
                    name: data.name,
                    email: data.email,
                    tempPass: tempPass,
                });
                reset();
            },
        });
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-pg-bg)',
            color: 'var(--color-pg-text)',
            fontFamily: 'var(--font-sans)',
            WebkitFontSmoothing: 'antialiased',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
        }}>
            {/* Ambient Background Glow */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0,
                background: 'radial-gradient(circle at 50% 25%, rgba(99,102,241,0.15) 0%, transparent 60%)',
                pointerEvents: 'none',
            }} />

            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%', maxWidth: '520px',
                textAlign: 'center',
            }}>
                {/* Logo / Badge */}
                <div style={{ marginBottom: '24px' }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        fontSize: '12px', fontWeight: 600,
                        color: 'var(--color-pg-success)',
                        backgroundColor: 'rgba(52,211,153,0.12)',
                        border: '1px solid rgba(52,211,153,0.3)',
                        padding: '6px 14px', borderRadius: '999px',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                    }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        PABRIK AKTIF &middot; ONBOARDING
                    </span>
                </div>

                {!createdUser ? (
                    <>
                        <h1 style={{
                            fontSize: 'clamp(24px, 5vw, 32px)',
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            lineHeight: 1.2,
                            margin: '0 0 16px',
                        }}>
                            Selamat Datang di POgrid, <span style={{ color: 'var(--color-pg-primary)' }}>{tenant.company_name}</span>!
                        </h1>
                        <p style={{
                            fontSize: '14.5px',
                            color: 'var(--color-pg-text-secondary)',
                            lineHeight: 1.6,
                            margin: '0 auto 28px',
                            maxWidth: '460px',
                        }}>
                            Untuk menjaga integritas data & pemisahan tugas, akun <strong>Owner</strong> hanya bertindak sebagai pemantau. Anda perlu mendaftarkan <strong>Admin</strong> pertama untuk membuat PO dan mengelola produksi.
                        </p>

                        {/* Onboarding Form Card */}
                        <div style={{
                            backgroundColor: 'var(--color-pg-surface)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '20px',
                            padding: '32px',
                            textAlign: 'left',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-pg-primary)' }}>
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                                Daftarkan Akun Admin
                            </h2>

                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: '18px' }}>
                                    <label style={{
                                        display: 'block', fontSize: '13px', fontWeight: 600,
                                        color: 'var(--color-pg-text-secondary)', marginBottom: '8px'
                                    }}>
                                        Nama Lengkap Admin
                                    </label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        placeholder="Contoh: Budi Santoso"
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            backgroundColor: 'var(--color-pg-bg)',
                                            border: errors.name ? '1px solid var(--color-pg-error)' : '1px solid var(--color-pg-border)',
                                            color: 'var(--color-pg-text)',
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                        required
                                    />
                                    {errors.name && (
                                        <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-pg-error)', marginTop: '6px' }}>
                                            {errors.name}
                                        </span>
                                    )}
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{
                                        display: 'block', fontSize: '13px', fontWeight: 600,
                                        color: 'var(--color-pg-text-secondary)', marginBottom: '8px'
                                    }}>
                                        Email Admin
                                    </label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={e => setData('email', e.target.value)}
                                        placeholder="admin@perusahaan.com"
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            backgroundColor: 'var(--color-pg-bg)',
                                            border: errors.email ? '1px solid var(--color-pg-error)' : '1px solid var(--color-pg-border)',
                                            color: 'var(--color-pg-text)',
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                        required
                                    />
                                    {errors.email && (
                                        <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-pg-error)', marginTop: '6px' }}>
                                            {errors.email}
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    style={{
                                        width: '100%',
                                        backgroundColor: 'var(--color-pg-primary)',
                                        color: 'var(--color-pg-text)',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '14px',
                                        fontSize: '15px',
                                        fontWeight: 700,
                                        cursor: processing ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 8px 24px var(--color-pg-primary-glow)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'opacity 0.2s',
                                    }}
                                >
                                    {processing ? 'Mendaftarkan...' : 'Daftarkan Admin & Kirim Email'}
                                    {!processing && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13" />
                                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                        </svg>
                                    )}
                                </button>
                            </form>
                        </div>

                        <Link href="/dashboard" style={{
                            display: 'inline-block', marginTop: '24px',
                            fontSize: '13px', color: 'var(--color-pg-text-secondary)',
                            textDecoration: 'underline',
                            fontWeight: 500,
                        }}>
                            Lewati & buka dashboard
                        </Link>
                    </>
                ) : (
                    /* Onboarding Success Page */
                    <div style={{
                        backgroundColor: 'var(--color-pg-surface)',
                        border: '1px solid var(--color-pg-border)',
                        borderRadius: '24px',
                        padding: '40px 32px',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
                        animation: 'fadeIn 0.5s ease-out',
                    }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            backgroundColor: 'rgba(52,211,153,0.12)',
                            color: 'var(--color-pg-success)',
                            display: 'grid', placeItems: 'center',
                            margin: '0 auto 24px',
                            border: '1px solid rgba(52,211,153,0.3)',
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>

                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            margin: '0 0 12px',
                        }}>
                            Admin Berhasil Terdaftar!
                        </h1>
                        <p style={{
                            fontSize: '14px',
                            color: 'var(--color-pg-text-secondary)',
                            lineHeight: 1.6,
                            marginBottom: '24px',
                        }}>
                            Akun admin untuk <strong>{createdUser.name}</strong> ({createdUser.email}) berhasil dibuat. Email berisi informasi login telah dikirimkan.
                        </p>

                        {createdUser.tempPass && (
                            <div style={{
                                backgroundColor: 'var(--color-pg-bg)',
                                border: '1px dashed var(--color-pg-border)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '28px',
                                textAlign: 'center',
                            }}>
                                <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-pg-text-muted)', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Password Sementara Admin
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <code style={{ 
                                        fontSize: '20px', 
                                        fontWeight: 800, 
                                        color: 'var(--color-pg-success)', 
                                        letterSpacing: '0.08em',
                                        backgroundColor: 'var(--color-pg-surface)',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--color-pg-border)'
                                    }}>
                                        {createdUser.tempPass}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (createdUser.tempPass) {
                                                navigator.clipboard.writeText(createdUser.tempPass);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 3000);
                                            }
                                        }}
                                        style={{
                                            padding: '9px 16px',
                                            backgroundColor: copied ? 'var(--color-pg-success)' : 'var(--color-pg-primary)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                                            transition: 'background-color 0.2s ease, transform 0.1s ease',
                                        }}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            {copied ? (
                                                <polyline points="20 6 9 17 4 12" />
                                            ) : (
                                                <>
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                </>
                                            )}
                                        </svg>
                                        {copied ? 'Tersalin!' : 'Salin Password'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => router.visit('/dashboard')}
                            style={{
                                width: '100%',
                                backgroundColor: 'var(--color-pg-success)',
                                color: 'var(--color-pg-text)',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '14px',
                                fontSize: '15px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 8px 24px rgba(52,211,153,0.25)',
                            }}
                        >
                            Masuk Ke Dashboard
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </button>
                    </div>
                )}

                <p style={{
                    fontSize: '12px', color: 'var(--color-pg-text-muted)',
                    marginTop: '32px', lineHeight: 1.5,
                }}>
                    Butuh bantuan? Silakan hubungi tim support kami. POgrid.id sepenuhnya mendukung Bahasa Indonesia.
                </p>
            </div>
        </div>
    );
}
