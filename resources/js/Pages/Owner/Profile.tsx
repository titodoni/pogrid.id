import React, { useState } from 'react';
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
        role: string;
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
        back: 'Kembali ke Dashboard',
        greeting: 'Halo,',
        change_password: 'Ubah Kata Sandi',
        current_password: 'Kata Sandi Saat Ini',
        new_password: 'Kata Sandi Baru',
        confirm_password: 'Konfirmasi Kata Sandi',
        save_changes: 'Simpan Perubahan',
        cancel: 'Batal',
        language_label: 'Bahasa',
        lang_en: 'English',
        lang_id: 'Bahasa Indonesia',
        company: 'Perusahaan',
        role: 'Peran',
        password_changed: 'Kata sandi berhasil diubah.',
    }
};

export default function Profile({ tenant, auth_user }: Props) {
    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
        }
        return 'en';
    });

    const changeLanguage = (lang: 'en' | 'id') => {
        setLanguage(lang);
        localStorage.setItem('pogrid_lang', lang);
    };

    const t = translations[language];

    const [cpCurrentPassword, setCpCurrentPassword] = useState('');
    const [cpNewPassword, setCpNewPassword] = useState('');
    const [cpConfirmPassword, setCpConfirmPassword] = useState('');

    const submitChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        const slug = tenant?.slug || '';
        router.post('/change-password', {
            current_password: cpCurrentPassword,
            new_password: cpNewPassword,
            new_password_confirmation: cpConfirmPassword,
        }, {
            onSuccess: () => {
                setCpCurrentPassword('');
                setCpNewPassword('');
                setCpConfirmPassword('');
            },
        });
    };

    return (
        <div className="dashboard-root" style={{
            backgroundColor: '#090d16',
            fontFamily: 'Inter, sans-serif',
            color: '#f8fafc'
        }}>
            <header style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
            }}>
                <a
                    href={`/c/${tenant?.slug || ''}`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#60a5fa',
                        fontSize: '14px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(96, 165, 250, 0.08)',
                    }}
                >
                    <ChevronLeft size={16} /> {t.back}
                </a>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px' }}>
                    <button
                        onClick={() => changeLanguage('en')}
                        style={{
                            padding: '6px 10px',
                            backgroundColor: language === 'en' ? '#2563eb' : 'transparent',
                            border: 'none',
                            borderRadius: '4px',
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
                            backgroundColor: language === 'id' ? '#2563eb' : 'transparent',
                            border: 'none',
                            borderRadius: '4px',
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
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>
                        {t.greeting}, {auth_user?.name}
                    </p>

                    {/* User Info Card */}
                    <div style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                    }}>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                                    {t.company}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                                    {tenant?.company_name || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                                    {t.role}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa' }}>
                                    {auth_user?.role}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Form */}
                    <div style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '12px',
                        padding: '20px',
                    }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Lock size={16} /> {t.change_password}
                        </h2>

                        <form onSubmit={submitChangePassword}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
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
                                        backgroundColor: '#090d16',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
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
                                        backgroundColor: '#090d16',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
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
                                        backgroundColor: '#090d16',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#2563eb',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                }}
                            >
                                {t.save_changes}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
