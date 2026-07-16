import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ChevronLeft, Lock, Globe } from '../../Components/Icons';

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
    }
};

export default function Profile({ tenant, auth_user }: Props) {
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
            backgroundColor: '#09090b',
            fontFamily: 'Inter, sans-serif',
            color: '#fafafa'
        }}>
            <header className="responsive-header" style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(9, 9, 11, 0.6)',
                backdropFilter: 'blur(8px)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <a
                        href={`/c/${tenant?.slug || ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#818cf8',
                            fontSize: '14px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                        }}
                    >
                        <ChevronLeft size={16} /> {t.back}
                    </a>
                    <div>
                        <div className="greeting-name" style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600, marginBottom: '2px' }}>
                            {language === 'en' ? `Hello, ${auth_user?.name}` : `Halo, ${auth_user?.name}`}
                        </div>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{t.page_title}</h1>
                        <p style={{ fontSize: '11px', color: '#71717a', margin: '1px 0 0 0' }}>
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
                            backgroundColor: language === 'en' ? '#6366f1' : 'transparent',
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
                            backgroundColor: language === 'id' ? '#6366f1' : 'transparent',
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
                    <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 24px 0' }}>
                        {t.greeting}, {auth_user?.name}
                    </p>

                    {/* User Info Card */}
                    <div style={{
                        backgroundColor: 'rgba(24, 24, 27, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '14px',
                        padding: '16px',
                        marginBottom: '20px',
                    }}>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                                    {t.company}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa' }}>
                                    {tenant?.company_name || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                                    {t.role}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8' }}>
                                    {auth_user?.role_name}{auth_user?.post_name ? ` — ${auth_user.post_name}` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Form */}
                    <div style={{
                        backgroundColor: 'rgba(24, 24, 27, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '14px',
                        padding: '20px',
                    }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Lock size={16} /> {t.change_password}
                        </h2>

                        <form onSubmit={submitChangePassword}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '4px', fontWeight: 600 }}>
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
                                        backgroundColor: '#0a0a0c',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '4px', fontWeight: 600 }}>
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
                                        backgroundColor: '#0a0a0c',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '4px', fontWeight: 600 }}>
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
                                        backgroundColor: '#0a0a0c',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px',
                                        color: '#fff',
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
                                    background: changingPassword ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    cursor: changingPassword ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    opacity: changingPassword ? 0.7 : 1,
                                    boxShadow: changingPassword ? 'none' : '0 4px 12px -2px rgba(99, 102, 241, 0.3)',
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
