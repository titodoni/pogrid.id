import React, { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import { ChevronLeft, Lock, Palette } from '../../Components/Icons';
import { localizedDisplay } from '../../Utils/locale';

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

const translations = {
    en: {
        page_title: 'Profile Settings',
        back: 'Back to Dashboard',
        greeting: 'Hello,',
        change_password: 'Change Password',
        current_password: 'Current Password',
        new_password: 'New Password',
        confirm_password: 'Confirm Password',
        save_changes: 'Save Changes',
        cancel: 'Cancel',
        language_label: 'Language',
        lang_en: 'English',
        lang_id: 'Bahasa Indonesia',
        company: 'Company',
        role: 'Role',
        password_changed: 'Password changed successfully.',
        theme_label: 'Backdrop Theme',
        theme_desc: 'Select your preferred background and card style. The brand accent remains unified.',
        theme_default: 'Titanium Slate',
        theme_linear: 'Obsidian Graphite',
        theme_vercel: 'Monochrome Void',
        theme_stripe: 'Stripe Navy',
        theme_github: 'GitHub Slate',
        theme_nordic: 'Nordic Polar',
    },
    id: {
        page_title: 'Pengaturan Profil',
        back: 'Kembali ke Dasbor',
        greeting: 'Halo,',
        change_password: 'Ganti Password',
        current_password: 'Password Saat Ini',
        new_password: 'Password Baru',
        confirm_password: 'Konfirmasi Password',
        save_changes: 'Simpan Perubahan',
        cancel: 'Batal',
        language_label: 'Bahasa',
        lang_en: 'English',
        lang_id: 'Bahasa Indonesia',
        company: 'Perusahaan',
        role: 'Jabatan',
        password_changed: 'Password berhasil diubah.',
        theme_label: 'Tema Latar Belakang',
        theme_desc: 'Pilih latar belakang dan gaya kartu pilihan Anda. Warna aksen utama tetap sama.',
        theme_default: 'Titanium Slate',
        theme_linear: 'Obsidian Graphite',
        theme_vercel: 'Monochrome Void',
        theme_stripe: 'Stripe Navy',
        theme_github: 'GitHub Slate',
        theme_nordic: 'Nordic Polar',
    }
};

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
    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
        }
        return 'en';
    });

    const [theme, setTheme] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('pogrid_theme') || 'theme-default';
        }
        return 'theme-default';
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

    const changeTheme = (newTheme: string) => {
        setTheme(newTheme);
        localStorage.setItem('pogrid_theme', newTheme);
        const classes = ['theme-default', 'theme-linear', 'theme-vercel', 'theme-stripe', 'theme-github', 'theme-nordic', 'theme-light', 'theme-brand'];
        classes.forEach(c => document.documentElement.classList.remove(c));
        document.documentElement.classList.add(newTheme);
    };

    const t = translations[language];

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
        <div className="dashboard-root" style={{
            backgroundColor: 'var(--color-pg-bg)',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--color-pg-text)'
        }}>
            <header className="responsive-header" style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-pg-border)',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <Link
                        href={`/c/${tenant?.slug || ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--color-pg-primary-hover)',
                            fontSize: '14px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--color-pg-primary-glow)',
                            border: '1px solid var(--color-pg-primary-glow)',
                        }}
                    >
                        <ChevronLeft size={16} /> {t.back}
                    </Link>
                    <div>
                        <div className="greeting-name" style={{ fontSize: '11px', color: 'var(--color-pg-primary-hover)', fontWeight: 600, marginBottom: '2px' }}>
                            {language === 'en' ? `Hello, ${auth_user?.name}` : `Halo, ${auth_user?.name}`}
                        </div>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{t.page_title}</h1>
                        <p style={{ fontSize: '11px', color: 'var(--color-pg-text-muted)', margin: '1px 0 0 0' }}>
                            {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            {' · '}
                            {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '8px' }}>
                    <button
                        onClick={() => changeLanguage('en')}
                        style={{
                            padding: '6px 10px',
                            backgroundColor: language === 'en' ? 'var(--color-pg-primary)' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '11px',
                            cursor: 'pointer',
                        }}
                    >
                        {t.lang_en}
                    </button>
                    <button
                        onClick={() => changeLanguage('id')}
                        style={{
                            padding: '6px 10px',
                            backgroundColor: language === 'id' ? 'var(--color-pg-primary)' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '11px',
                            cursor: 'pointer',
                        }}
                    >
                        {t.lang_id}
                    </button>
                </div>
            </header>

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
    );
}
