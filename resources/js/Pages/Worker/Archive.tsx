import React, { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, AlertTriangle, Settings } from '../../Components/Icons';
import { WarningPill } from '../../Components/WarningPill';
import { formatDeadline } from '../../Utils/deadline';

interface Stage {
    id: number;
    stage_name: string;
    completed_qty: number;
    progress_percent: string;
    status: string;
}

interface Item {
    id: number;
    item_name: string;
    target_qty: number;
    item_type: string;
    progress_percent: string;
    status: string;
    delivery_status?: string | null;
    delivered_qty?: number;
    po?: {
        po_number: string;
        client_name: string;
        global_deadline: string;
    };
    item_progresses: Stage[];
}

interface Props {
    items: Item[];
    auth_user?: {
        id: number;
        name: string;
        role_name: string;
        post_name: string | null;
    };
    tenant?: {
        company_name: string;
        slug: string;
    };
}

const translations = {
    en: {
        title: 'Archive',
        subtitle: 'Completed work history',
        back: 'Back to Dashboard',
        no_items: 'No archived items yet.',
        client: 'Client',
        qty: 'Qty',
        delivered: 'Delivered',
        completed: 'Completed',
        exit_terminal: 'Exit',
        manufactured: 'Manufactured',
        buyout: 'Buyout',
    },
    id: {
        title: 'Arsip',
        subtitle: 'Riwayat pekerjaan selesai',
        back: 'Kembali ke Dasbor',
        no_items: 'Belum ada item yang diarsipkan.',
        client: 'Klien',
        qty: 'Jml',
        delivered: 'Terkirim',
        completed: 'Selesai',
        exit_terminal: 'Keluar',
        manufactured: 'Produksi Internal',
        buyout: 'Beli Jadi',
    }
};

export default function Archive({ items, auth_user, tenant }: Props) {
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

    const getStageCount = (item: Item): { completed: number; total: number } => {
        const stages = item.item_progresses;
        return {
            completed: stages.filter(s => s.status === 'COMPLETED').length,
            total: stages.length,
        };
    };

    return (
        <div className="dashboard-root" style={{
            backgroundColor: 'var(--color-pg-bg)',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--color-pg-text)',
        }}>
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
                                border: '1px solid var(--color-pg-primary-glow)',
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

                        {items.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: 'var(--color-pg-text-muted)',
                                fontSize: '14px',
                                border: '1px dashed rgba(255, 255, 255, 0.08)',
                                borderRadius: '10px',
                            }}>
                                {t.no_items}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {items.map((item) => {
                                    const sc = getStageCount(item);
                                    return (
                                        <div
                                            key={item.id}
                                            style={{
                                                backgroundColor: 'var(--color-pg-border-subtle)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                borderRadius: '12px',
                                                padding: '14px 16px',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                                                        {item.item_name}
                                                    </h3>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                                        <span style={{ fontSize: '13px', color: 'var(--color-pg-primary-hover)', fontWeight: 700 }}>
                                                            {item.po?.client_name || 'N/A'}
                                                        </span>
                                                        <div style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                            <span>
                                                                {formatDeadline(item.po?.global_deadline, language)}
                                                            </span>
                                                            <span style={{ color: 'var(--color-pg-text-muted)', fontSize: '10px' }}>&middot;</span>
                                                            <span style={{ color: 'var(--color-pg-text-muted)', fontWeight: 600 }}>
                                                                {item.po?.po_number || ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        padding: '2px 6px',
                                                        borderRadius: '6px',
                                                        backgroundColor: 'rgba(52, 211, 153, 0.12)',
                                                        color: 'var(--color-pg-success)',
                                                    }}>
                                                        {parseFloat(item.progress_percent).toFixed(0)}%
                                                    </span>
                                                    {item.delivery_status === 'DELIVERED' && (
                                                        <span style={{
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            padding: '2px 6px',
                                                            borderRadius: '6px',
                                                            backgroundColor: 'rgba(99, 102, 241, 0.12)',
                                                            color: 'var(--color-pg-primary-hover)',
                                                        }}>
                                                            {t.delivered}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)' }}>
                                                    {t.qty}: <strong style={{ color: 'var(--color-pg-text)' }}>{item.target_qty} pcs</strong>
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)' }}>
                                                    {t.completed}: <strong style={{ color: 'var(--color-pg-text)' }}>{sc.completed}/{sc.total} stages</strong>
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)' }}>
                                                    {formatDeadline(item.po?.global_deadline, language)}
                                                </div>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                                    color: 'var(--color-pg-text-secondary)',
                                                }}>
                                                    {item.item_type === 'MANUFACTURE' ? t.manufactured : t.buyout}
                                                </span>
                                                <WarningPill deadlineDateStr={item.po?.global_deadline} lang={language} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
