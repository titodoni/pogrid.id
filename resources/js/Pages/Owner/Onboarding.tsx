import React from 'react';
import { Link, router } from '@inertiajs/react';

interface Props {
    tenant: {
        company_name: string;
        slug: string;
    };
}

const steps = [
    {
        n: 1,
        title: 'Buat PO pertama',
        desc: 'Masukkan nomor PO, nama klien, & item yang diminta. Pilih tahapan kerja (drafter, CNC, QC, kirim…).',
        cta: 'Buat PO Pertama',
        href: '/pos/create',
        primary: true,
    },
    {
        n: 2,
        title: 'Tambah operator (opsional)',
        desc: 'Daftarkan nama pekerja agar mereka bisa update progres dari HP pakai PIN. Bisa dilewati dulu.',
        cta: 'Lihat Dashboard Dulu',
        href: '/dashboard',
        primary: false,
    },
    {
        n: 3,
        title: 'Pantau dari dashboard',
        desc: 'Lihat semua PO, status merah/kuning/hijau, & alert keterlambatan dalam satu layar.',
        cta: 'Buka Dashboard',
        href: '/dashboard',
        primary: false,
    },
];

export default function Onboarding({ tenant }: Props) {
    const go = (href: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        router.visit(href);
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
            padding: '0 20px',
        }}>
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0,
                background: 'radial-gradient(circle at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 50%)',
                pointerEvents: 'none',
            }} />

            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%', maxWidth: '640px',
                padding: '56px 0 64px',
                textAlign: 'center',
            }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    fontSize: '12px', fontWeight: 600,
                    color: 'var(--color-pg-success)',
                    backgroundColor: 'rgba(52,211,153,0.12)',
                    border: '1px solid rgba(52,211,153,0.3)',
                    padding: '6px 14px', borderRadius: '999px',
                    marginBottom: '22px',
                }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Pabrik aktif
                </span>

                <h1 style={{
                    fontSize: 'clamp(26px, 5vw, 36px)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                    margin: '0 0 12px',
                }}>
                    Selamat datang, {tenant.company_name}!
                </h1>
                <p style={{
                    fontSize: '15px',
                    color: 'var(--color-pg-text-secondary)',
                    lineHeight: 1.6,
                    margin: '0 auto 12px',
                    maxWidth: '480px',
                }}>
                    Pabrik Anda sudah jadi. Sekarang langkah paling penting: buat PO pertama supaya progres mulai terekam.
                </p>

                {/* Steps */}
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '14px',
                    marginTop: '36px', textAlign: 'left',
                }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{
                            backgroundColor: 'var(--color-pg-surface)',
                            border: s.primary ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--color-pg-border)',
                            borderRadius: '16px',
                            padding: '20px',
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'flex-start',
                        }}>
                            <div style={{
                                flexShrink: 0,
                                width: '34px', height: '34px', borderRadius: '10px',
                                background: s.primary
                                    ? 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)'
                                    : 'var(--color-pg-card-hover)',
                                color: s.primary ? '#fff' : 'var(--color-pg-text-secondary)',
                                fontWeight: 800, fontSize: '15px',
                                display: 'grid', placeItems: 'center',
                                boxShadow: s.primary ? '0 6px 16px rgba(99,102,241,0.3)' : 'none',
                            }}>{s.n}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 6px' }}>{s.title}</h3>
                                <p style={{ fontSize: '13.5px', color: 'var(--color-pg-text-secondary)', lineHeight: 1.55, margin: '0 0 14px' }}>{s.desc}</p>
                                <a
                                    href={s.href}
                                    onClick={go(s.href)}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                        backgroundColor: s.primary ? 'var(--color-pg-primary)' : 'transparent',
                                        color: s.primary ? '#fff' : 'var(--color-pg-text)',
                                        border: s.primary ? 'none' : '1px solid var(--color-pg-border)',
                                        fontWeight: 700, fontSize: '14px',
                                        padding: s.primary ? '12px 20px' : '11px 18px',
                                        borderRadius: '10px', textDecoration: 'none',
                                        boxShadow: s.primary ? '0 8px 24px var(--color-pg-primary-glow)' : 'none',
                                    }}
                                >
                                    {s.cta}
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                <p style={{
                    fontSize: '12.5px', color: 'var(--color-pg-text-muted)',
                    marginTop: '28px', lineHeight: 1.5,
                }}>
                    Butuh bantuan? POgrid.id penuh Bahasa Indonesia & bisa dibuka dari HP maupun laptop.
                </p>

                <Link href="/dashboard" style={{
                    display: 'inline-block', marginTop: '8px',
                    fontSize: '13px', color: 'var(--color-pg-text-secondary)',
                    textDecoration: 'underline',
                }}>
                    Lewati & buka dashboard
                </Link>
            </div>
        </div>
    );
}
