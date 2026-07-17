import React, { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, AlertTriangle, DotGreen, Settings } from '../../Components/Icons';

interface Alert {
    id: number;
    severity: string;
    message: string;
    is_resolved: boolean;
    escalated_at?: string | null;
    created_at: string;
    item?: {
        id: number;
        item_name: string;
        po?: {
            po_number: string;
            client_name: string;
        };
    };
}

interface Props {
    alerts: Alert[];
    auth_user?: {
        id: number;
        name: string;
        role: string;
    };
    tenant?: {
        company_name: string;
        slug: string;
    };
}

const translations = {
    en: {
        title: 'Trouble Reports',
        subtitle: 'Log of active and resolved production issues',
        severity: 'Severity',
        message: 'Message / Description',
        status: 'Status',
        date: 'Date Reported',
        back: 'Back to Dashboard',
        no_reports: 'No trouble reports logged.',
        active: 'Active',
        resolved: 'Resolved',
        exit_terminal: 'Exit',
        lang_en: 'English',
        lang_id: 'Bahasa Indonesia',
    },
    id: {
        title: 'Laporan Kendala',
        subtitle: 'Daftar kendala produksi aktif dan selesai',
        severity: 'Tingkat',
        message: 'Pesan / Deskripsi Kendala',
        status: 'Status',
        date: 'Tanggal Dilaporkan',
        back: 'Kembali ke Dasbor',
        no_reports: 'Tidak ada laporan kendala.',
        active: 'Aktif',
        resolved: 'Selesai',
        exit_terminal: 'Keluar',
        lang_en: 'English',
        lang_id: 'Bahasa Indonesia',
    }
};

export default function TroubleReports({ alerts, auth_user, tenant }: Props) {
    const { url } = usePage();
    const pathParts = url.split('/');
    const slug = tenant?.slug || pathParts[2] || '';

    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
        }
        return 'en';
    });

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const changeLanguage = (lang: 'en' | 'id') => {
        setLanguage(lang);
        localStorage.setItem('pogrid_lang', lang);
    };

    const t = translations[language];

    return (
        <div className="dashboard-root" style={{
            backgroundColor: 'var(--color-pg-bg)',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--color-pg-text)',
        }}>
            {/* Header matching all user screens */}
            <header className="responsive-header" style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(9, 9, 11, 0.6)',
                backdropFilter: 'blur(8px)',
                flexShrink: 0,
            }}>
                <div>
                    <div className="greeting-name" style={{ fontSize: '13px', color: 'var(--color-pg-primary-hover)', fontWeight: 600, marginBottom: '2px' }}>
                        {language === 'en' ? `Hello, ${auth_user?.name}` : `Halo, ${auth_user?.name}`}
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{t.title}</h1>
                    <p style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', margin: '2px 0 0 0' }}>
                        {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' · '}
                        {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '8px', marginRight: '8px' }}>
                        <button
                            onClick={() => changeLanguage('en')}
                            style={{
                                padding: '4px 8px',
                                backgroundColor: language === 'en' ? 'var(--color-pg-primary)' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '10px',
                                cursor: 'pointer',
                            }}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => changeLanguage('id')}
                            style={{
                                padding: '4px 8px',
                                backgroundColor: language === 'id' ? 'var(--color-pg-primary)' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '10px',
                                cursor: 'pointer',
                            }}
                        >
                            ID
                        </button>
                    </div>

                    <Link
                        href={`/c/${slug}/profile`}
                        style={{
                            padding: '8px',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            color: 'var(--color-pg-text-secondary)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            lineHeight: '1',
                            display: 'flex',
                            textDecoration: 'none',
                        }}
                        title={language === 'en' ? 'Profile' : 'Profil'}
                    >
                        <Settings size={16} />
                    </Link>

                    <button
                        onClick={() => router.post('/logout')}
                        style={{
                            padding: '8px 14px',
                            backgroundColor: 'var(--color-pg-danger)',
                            color: '#fff',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '12px',
                        }}
                    >
                        {t.exit_terminal}
                    </button>
                </div>
            </header>

            {/* Back to Dashboard and Content Area */}
            <div className="dashboard-scroll" style={{
                padding: '24px',
                boxSizing: 'border-box',
            }}>
                <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
                <div style={{ marginBottom: '16px' }}>
                    <Link
                        href={`/c/${slug}`}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--color-pg-primary-hover)',
                            fontSize: '13px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                        }}
                    >
                        <ChevronLeft size={16} /> {t.back}
                    </Link>
                </div>

                <div style={{
                    backgroundColor: 'rgba(24, 24, 27, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '14px',
                    padding: '20px',
                    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0' }}>{t.title}</h2>
                    <p style={{ fontSize: '13px', color: 'var(--color-pg-text-muted)', margin: '0 0 20px 0' }}>{t.subtitle}</p>

                    {alerts.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: 'var(--color-pg-text-muted)',
                            fontSize: '14px',
                            border: '1px dashed rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                        }}>
                            {t.no_reports}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                textAlign: 'left',
                                fontSize: '13px',
                            }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                        <th style={{ padding: '12px 8px', color: 'var(--color-pg-text-secondary)', fontWeight: 600 }}>{t.date}</th>
                                        <th style={{ padding: '12px 8px', color: 'var(--color-pg-text-secondary)', fontWeight: 600 }}>{t.severity}</th>
                                        <th style={{ padding: '12px 8px', color: 'var(--color-pg-text-secondary)', fontWeight: 600 }}>{t.message}</th>
                                        <th style={{ padding: '12px 8px', color: 'var(--color-pg-text-secondary)', fontWeight: 600 }}>{t.status}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.map((alert) => {
                                        const date = new Date(alert.created_at);
                                        const dateStr = date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });

                                        const sevColor = alert.severity === 'RED' ? 'var(--color-pg-danger)'
                                            : alert.severity === 'YELLOW' ? 'var(--color-pg-warning)'
                                            : alert.severity === 'BLUE' ? 'var(--color-pg-primary)'
                                            : 'var(--color-pg-orange)';

                                        return (
                                            <tr key={alert.id} style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                backgroundColor: alert.is_resolved ? 'transparent' : 'rgba(239, 68, 68, 0.02)',
                                            }}>
                                                <td style={{ padding: '14px 8px', color: '#e4e4e7', whiteSpace: 'nowrap' }}>
                                                    {dateStr}
                                                </td>
                                                <td style={{ padding: '14px 8px' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        backgroundColor: `${sevColor}20`,
                                                        color: sevColor,
                                                        border: `1px solid ${sevColor}40`,
                                                    }}>
                                                        {alert.severity}
                                                    </span>
                                                    {alert.escalated_at && (
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontSize: '9px',
                                                            fontWeight: 800,
                                                            backgroundColor: '#fbbf2440',
                                                            color: 'var(--color-pg-warning)',
                                                            border: '1px solid #fbbf2480',
                                                            marginLeft: '4px',
                                                            animation: 'pulse 1.5s ease-in-out infinite',
                                                        }}>
                                                            ESCALATED
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '14px 8px', color: 'var(--color-pg-text)', lineHeight: '1.4' }}>
                                                    {alert.message}
                                                </td>
                                                <td style={{ padding: '14px 8px' }}>
                                                    {alert.is_resolved ? (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            color: 'var(--color-pg-success)',
                                                            fontWeight: 600,
                                                            fontSize: '12px'
                                                        }}>
                                                            <DotGreen size={8} /> {t.resolved}
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            color: 'var(--color-pg-danger)',
                                                            fontWeight: 600,
                                                            fontSize: '12px'
                                                        }}>
                                                            <AlertTriangle size={12} /> {t.active}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
