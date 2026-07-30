import React, { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import { AlertTriangle, Settings, Palette, ChevronLeft } from './Icons';
import { localizedDisplay } from '../Utils/locale';

export type WorkerHeaderView = 'dashboard' | 'finance-ledger' | 'my-kpi' | 'archive' | 'trouble-reports';

interface WorkerHeaderProps {
    slug: string;
    auth_user?: {
        id: number;
        name: string;
        role?: string;
        role_name?: string;
        post_display_name?: string;
        post_display_name_id?: string;
    };
    userRole?: string;
    title: string;
    subtitle?: string;
    language: 'en' | 'id';
    changeLanguage: (lang: 'en' | 'id') => void;
    currentView: WorkerHeaderView;
    onlineUsersCount?: number;
    wsStatus?: string;
    backUrl?: string;
}

export const WorkerHeader: React.FC<WorkerHeaderProps> = ({
    slug,
    auth_user,
    userRole,
    title,
    subtitle,
    language,
    changeLanguage,
    currentView,
    onlineUsersCount,
    wsStatus,
    backUrl
}) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const changeTheme = (newTheme: string) => {
        localStorage.setItem('pogrid_theme', newTheme);
        const classes = ['theme-default', 'theme-linear', 'theme-vercel', 'theme-stripe', 'theme-github', 'theme-nordic', 'theme-light', 'theme-brand'];
        classes.forEach(c => document.documentElement.classList.remove(c));
        document.documentElement.classList.add(newTheme);
        setShowThemeDropdown(false);
    };

    const role = userRole || auth_user?.role || auth_user?.role_name || '';

    return (
        <header className="responsive-header shrink-0 sticky top-0 z-40" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '14px 24px',
            borderBottom: '1px solid var(--color-pg-border, rgba(255,255,255,0.08))',
            backgroundColor: 'var(--color-pg-bg, rgba(9, 9, 11, 0.85))',
            backdropFilter: 'blur(12px)',
            boxSizing: 'border-box',
            width: '100%',
        }}>
            {/* Left Section: Back Button + Titles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {currentView !== 'dashboard' && (
                    <Link
                        href={backUrl || `/c/${slug}`}
                        style={{
                            height: '44px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0 14px',
                            backgroundColor: 'var(--color-pg-surface)',
                            color: 'var(--color-pg-text, #f8fafc)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            flexShrink: 0,
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-pg-card-hover)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-pg-surface)'; }}
                        title={language === 'id' ? 'Kembali ke Dasbor' : 'Back to Dashboard'}
                    >
                        <ChevronLeft size={16} />
                        <span>{language === 'id' ? 'Kembali' : 'Back'}</span>
                    </Link>
                )}
                <div>
                    {auth_user && (
                        <div className="greeting-name" style={{ fontSize: '13px', color: 'var(--color-pg-primary, #6366f1)', fontWeight: 600, marginBottom: '2px' }}>
                            {language === 'en'
                                ? `Hello, ${auth_user.name}${auth_user.post_display_name ? ` (${localizedDisplay({ display_name: auth_user.post_display_name, display_name_id: auth_user.post_display_name_id }, language)})` : (role ? ` (${role})` : '')}`
                                : `Halo, ${auth_user.name}${auth_user.post_display_name ? ` (${localizedDisplay({ display_name: auth_user.post_display_name, display_name_id: auth_user.post_display_name_id }, language)})` : (role ? ` (${role})` : '')}`}
                        </div>
                    )}
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--color-pg-text, #f8fafc)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        {title}
                    </h1>
                    <p style={{ fontSize: '12px', color: 'var(--color-pg-text-muted, #71717a)', margin: '2px 0 0 0' }}>
                        {subtitle ? `${subtitle} · ` : ''}
                        {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' · '}
                        {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>

            {/* Right Section: Unified Action Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Language Switcher */}
                <div style={{
                    display: 'inline-flex',
                    gap: '2px',
                    backgroundColor: 'var(--color-pg-surface)',
                    padding: '3px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-pg-border)',
                }}>
                    <button
                        type="button"
                        onClick={() => changeLanguage('en')}
                        style={{
                            minWidth: '40px',
                            height: '38px',
                            padding: '0 12px',
                            border: 'none',
                            borderRadius: '8px',
                            color: language === 'en' ? 'var(--color-pg-primary-ink, #fff)' : 'var(--color-pg-text)',
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: 'pointer',
                            backgroundColor: language === 'en' ? 'var(--color-pg-primary, #6366f1)' : 'transparent',
                            transition: 'all 0.2s',
                        }}
                    >
                        EN
                    </button>
                    <button
                        type="button"
                        onClick={() => changeLanguage('id')}
                        style={{
                            minWidth: '40px',
                            height: '38px',
                            padding: '0 12px',
                            border: 'none',
                            borderRadius: '8px',
                            color: language === 'id' ? 'var(--color-pg-primary-ink, #fff)' : 'var(--color-pg-text)',
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: 'pointer',
                            backgroundColor: language === 'id' ? 'var(--color-pg-primary, #6366f1)' : 'transparent',
                            transition: 'all 0.2s',
                        }}
                    >
                        ID
                    </button>
                </div>

                {/* Online Users Pill (When running websocket tracking) */}
                {onlineUsersCount !== undefined && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0 12px',
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: wsStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        border: `1px solid ${wsStatus === 'connected' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                        color: wsStatus === 'connected' ? '#10b981' : '#f59e0b',
                        fontSize: '12px',
                        fontWeight: 700,
                    }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: wsStatus === 'connected' ? '#10b981' : '#f59e0b',
                            boxShadow: wsStatus === 'connected' ? '0 0 6px #10b981' : 'none'
                        }} />
                        <span>{onlineUsersCount} {language === 'en' ? 'Online' : 'Online'}</span>
                    </div>
                )}

                {/* Navigation Tools */}
                {currentView !== 'trouble-reports' && (
                    <Link
                        href={`/c/${slug}/trouble-reports`}
                        style={{
                            width: '44px',
                            height: '44px',
                            backgroundColor: 'rgba(248, 113, 113, 0.12)',
                            color: 'var(--color-pg-danger, #ef4444)',
                            border: '1px solid rgba(248, 113, 113, 0.2)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                        }}
                        title={language === 'en' ? 'Trouble Reports' : 'Laporan Kendala'}
                    >
                        <AlertTriangle size={18} />
                    </Link>
                )}

                {currentView !== 'my-kpi' && (
                    <Link
                        href={`/c/${slug}/my-kpi`}
                        style={{
                            height: '44px',
                            padding: '0 14px',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                        }}
                        title={language === 'en' ? 'My KPI' : 'KPI Saya'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        <span className="hidden md:inline">{language === 'en' ? 'My KPI' : 'KPI Saya'}</span>
                    </Link>
                )}

                {currentView !== 'archive' && (
                    <Link
                        href={`/c/${slug}/archive`}
                        style={{
                            height: '44px',
                            padding: '0 14px',
                            backgroundColor: 'rgba(99, 102, 241, 0.12)',
                            color: 'var(--color-pg-primary-hover, #818cf8)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                        }}
                        title={language === 'en' ? 'Archive' : 'Arsip'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="21 8 21 21 3 21 3 8" />
                            <rect x="1" y="3" width="22" height="5" />
                            <line x1="10" y1="12" x2="14" y2="12" />
                        </svg>
                        <span className="hidden md:inline">{language === 'en' ? 'Archive' : 'Arsip'}</span>
                    </Link>
                )}

                {role === 'FINANCE' && currentView !== 'finance-ledger' && (
                    <Link
                        href={`/c/${slug}/finance-ledger`}
                        style={{
                            height: '44px',
                            padding: '0 14px',
                            backgroundColor: 'rgba(34, 197, 94, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(34, 197, 94, 0.4)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 800,
                        }}
                        title={language === 'en' ? 'Finance Ledger' : 'Ledger Finansial'}
                    >
                        <span>💰</span>
                        <span className="hidden md:inline">{language === 'id' ? 'Ledger Finansial' : 'Finance Ledger'}</span>
                    </Link>
                )}

                {/* Theme Picker */}
                <div style={{ position: 'relative' }}>
                    <button
                        type="button"
                        onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                        style={{
                            width: '44px',
                            height: '44px',
                            backgroundColor: 'var(--color-pg-surface)',
                            color: 'var(--color-pg-text-secondary, #a1a1aa)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-pg-card-hover)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-pg-surface)'; }}
                        title={language === 'en' ? 'Switch Theme' : 'Ganti Tema'}
                    >
                        <Palette size={18} />
                    </button>
                    {showThemeDropdown && (
                        <div style={{
                            position: 'absolute',
                            top: '50px',
                            right: '0',
                            width: '180px',
                            backgroundColor: 'var(--color-pg-card, #18181b)',
                            border: '1px solid var(--color-pg-border, rgba(255, 255, 255, 0.1))',
                            borderRadius: '12px',
                            padding: '8px',
                            zIndex: 100,
                            boxShadow: '0 15px 30px -5px rgba(0, 0, 0, 0.6)',
                            display: 'grid',
                            gap: '4px',
                        }}>
                            {[
                                { id: 'theme-default', name: 'Titanium Slate (Dark)', color: '#6366f1' },
                                { id: 'theme-light', name: 'Mint Cream (Light)', color: '#f4fff8' },
                                { id: 'theme-linear', name: 'Obsidian Graphite', color: '#8b5cf6' },
                                { id: 'theme-vercel', name: 'Monochrome Void', color: '#e2e8f0' },
                                { id: 'theme-stripe', name: 'Stripe Navy', color: '#0066ff' },
                                { id: 'theme-github', name: 'GitHub Slate', color: '#2ea043' },
                                { id: 'theme-nordic', name: 'Nordic Polar', color: '#88c0d0' },
                            ].map((tOption) => (
                                <button
                                    type="button"
                                    key={tOption.id}
                                    onClick={() => changeTheme(tOption.id)}
                                    style={{
                                        padding: '8px 10px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'var(--color-pg-text, #f8fafc)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        transition: 'background-color 0.15s',
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-pg-card-hover)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: tOption.color }} />
                                    {tOption.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Profile Settings Button */}
                <Link
                    href={`/c/${slug}/profile`}
                    style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: 'var(--color-pg-surface)',
                        color: 'var(--color-pg-text-secondary, #a1a1aa)',
                        border: '1px solid var(--color-pg-border)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-pg-card-hover)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-pg-surface)'; }}
                    title={language === 'en' ? 'Profile' : 'Profil'}
                >
                    <Settings size={18} />
                </Link>

                {/* Exit / Logout Button */}
                <button
                    type="button"
                    onClick={() => router.post('/logout')}
                    style={{
                        height: '44px',
                        padding: '0 16px',
                        backgroundColor: 'var(--color-pg-danger, #ef4444)',
                        color: '#fff',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                    onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                    {language === 'en' ? 'Exit' : 'Keluar'}
                </button>
            </div>
        </header>
    );
};
