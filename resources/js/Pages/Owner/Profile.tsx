import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Lock, Palette } from '../../Components/Icons';
import { AppLayout } from '../../Components/AppLayout';
import { localizedDisplay } from '../../Utils/locale';
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
    tenant?: {
        company_name: string;
        slug: string;
    };
    auth_user?: {
        id: number;
        name: string;
        role_name: string;
        role_level: string;
        post_name: string | null;
        role_display_name: string;
        role_display_name_id?: string | null;
        post_display_name?: string | null;
        post_display_name_id?: string | null;
    };
}

const themeOptions = [
    { id: 'theme-default', name: 'Titanium Slate', translationKey: 'theme_default', primaryCol: 'var(--color-pg-primary)', bgCol: 'var(--color-pg-bg)', cardBg: 'var(--color-pg-surface)', textCol: 'var(--color-pg-text)' },
    { id: 'theme-linear', name: 'Obsidian Graphite', translationKey: 'theme_linear', primaryCol: 'var(--color-pg-primary)', bgCol: '#0b0a13', cardBg: '#12111f', textCol: '#f3f0ff' },
    { id: 'theme-vercel', name: 'Monochrome Void', translationKey: 'theme_vercel', primaryCol: 'var(--color-pg-primary)', bgCol: '#000000', cardBg: '#0a0a0a', textCol: '#ffffff' },
    { id: 'theme-stripe', name: 'Stripe Navy', translationKey: 'theme_stripe', primaryCol: 'var(--color-pg-primary)', bgCol: '#0b132b', cardBg: '#1c2541', textCol: '#f1f5f9' },
    { id: 'theme-github', name: 'GitHub Slate', translationKey: 'theme_github', primaryCol: 'var(--color-pg-primary)', bgCol: '#0d1117', cardBg: '#161b22', textCol: '#c9d1d9' },
    { id: 'theme-nordic', name: 'Nordic Polar', translationKey: 'theme_nordic', primaryCol: 'var(--color-pg-primary)', bgCol: '#2e3440', cardBg: '#3b4252', textCol: '#eceff4' },
    { id: 'theme-light', name: 'Mint Cream Light', translationKey: 'theme_light', primaryCol: '#1c3738', bgCol: '#f4fff8', cardBg: '#ffffff', textCol: '#000f08' },
    { id: 'theme-brand', name: 'Brand Dark', translationKey: 'theme_brand', primaryCol: '#8baaad', bgCol: '#000f08', cardBg: '#1c3738', textCol: '#f4fff8' },
];

export default function Profile({ tenant, auth_user }: Props) {
    const { t, language, changeLanguage } = useTranslation('Owner_Profile');
    const [theme, setTheme] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('pogrid_theme') || 'theme-default';
        }
        return 'theme-default';
    });

    const changeTheme = (newTheme: string) => {
        setTheme(newTheme);
        localStorage.setItem('pogrid_theme', newTheme);
        const classes = ['theme-default', 'theme-linear', 'theme-vercel', 'theme-stripe', 'theme-github', 'theme-nordic', 'theme-light', 'theme-brand'];
        classes.forEach(c => document.documentElement.classList.remove(c));
        document.documentElement.classList.add(newTheme);
    };
    const [cpCurrentPassword, setCpCurrentPassword] = useState('');
    const [cpNewPassword, setCpNewPassword] = useState('');
    const [cpConfirmPassword, setCpConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    const submitChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (changingPassword) return;
        setChangingPassword(true);
        router.post('/change-password', {
            current_password: cpCurrentPassword,
            new_password: cpNewPassword,
            new_password_confirmation: cpConfirmPassword,
        }, {
            onSuccess: () => {
                setCpCurrentPassword('');
                setCpNewPassword('');
                setCpConfirmPassword('');
                setChangingPassword(false);
            },
            onError: () => setChangingPassword(false),
        });
    };

    return (
        <AppLayout activeNav="profile" title={t.page_title} subtitle={language === 'en' ? `Hello, ${auth_user?.name || 'User'}` : `Halo, ${auth_user?.name || 'User'}`} backUrl={`/c/${tenant?.slug || ''}`}>
            <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">


            <div className="dashboard-scroll" style={{ padding: '20px' }}>
                <div style={{ maxWidth: '520px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0' }}>
                        {t.page_title}
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--color-pg-text-secondary)', margin: '0 0 24px 0' }}>
                        {t.greeting}, {auth_user?.name}
                    </p>

                    {/* User Info Card */}
                    <div style={{
                        backgroundColor: 'var(--color-pg-card)',
                        border: '1px solid var(--color-pg-border)',
                        borderRadius: '14px',
                        padding: '16px',
                        marginBottom: '20px',
                    }}>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--color-pg-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                                    {t.company}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-pg-text)' }}>
                                    {tenant?.company_name || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--color-pg-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                                    {t.role}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-pg-primary-hover)' }}>
                                    {localizedDisplay({ display_name: auth_user?.role_display_name || '', display_name_id: auth_user?.role_display_name_id }, language)}{auth_user?.post_display_name ? ` — ${localizedDisplay({ display_name: auth_user.post_display_name, display_name_id: auth_user.post_display_name_id }, language)}` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Theme Selector Card */}
                    <div style={{
                        backgroundColor: 'var(--color-pg-card)',
                        border: '1px solid var(--color-pg-border)',
                        borderRadius: '14px',
                        padding: '20px',
                        marginBottom: '20px',
                    }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Palette size={16} /> {t.theme_label}
                        </h2>
                        <p style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginBottom: '16px' }}>
                            {t.theme_desc}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                            {themeOptions.map((opt) => {
                                const isActive = theme === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => changeTheme(opt.id)}
                                        style={{
                                            padding: '12px',
                                            backgroundColor: opt.cardBg,
                                            border: '2px solid ' + (isActive ? 'var(--color-pg-primary)' : 'var(--color-pg-border)'),
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            transition: 'border-color 0.2s',
                                        }}
                                    >
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: opt.textCol }}>
                                            {t[opt.translationKey as keyof typeof t] || opt.name}
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}>
                                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: opt.primaryCol }} />
                                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: opt.bgCol }} />
                                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: opt.cardBg }} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Change Password Form */}
                    <div style={{
                        backgroundColor: 'var(--color-pg-card)',
                        border: '1px solid var(--color-pg-border)',
                        borderRadius: '14px',
                        padding: '20px',
                    }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Lock size={16} /> {t.change_password}
                        </h2>

                        <form onSubmit={submitChangePassword}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                                    {t.current_password}
                                </label>
                                <input
                                    type="password"
                                    value={cpCurrentPassword}
                                    onChange={(e) => setCpCurrentPassword(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--color-pg-input)',
                                        border: '1px solid var(--color-pg-border)',
                                        borderRadius: '10px',
                                        color: 'var(--color-pg-text)',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                                    {t.new_password}
                                </label>
                                <input
                                    type="password"
                                    value={cpNewPassword}
                                    onChange={(e) => setCpNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--color-pg-input)',
                                        border: '1px solid var(--color-pg-border)',
                                        borderRadius: '10px',
                                        color: 'var(--color-pg-text)',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                                    {t.confirm_password}
                                </label>
                                <input
                                    type="password"
                                    value={cpConfirmPassword}
                                    onChange={(e) => setCpConfirmPassword(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: 'var(--color-pg-input)',
                                        border: '1px solid var(--color-pg-border)',
                                        borderRadius: '10px',
                                        color: 'var(--color-pg-text)',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={changingPassword}
                                style={{
                                    padding: '10px 20px',
                                    background: changingPassword ? 'var(--color-pg-primary)' : 'linear-gradient(135deg, var(--color-pg-primary) 0%, var(--color-pg-primary-hover) 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    cursor: changingPassword ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    opacity: changingPassword ? 0.7 : 1,
                                    boxShadow: changingPassword ? 'none' : '0 4px 12px -2px var(--color-pg-primary-glow)',
                                }}
                            >
                                {changingPassword ? '...' : t.save_changes}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            </div>
        </AppLayout>
    );
}
