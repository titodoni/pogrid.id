import React, { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';

interface Props {
    token: string;
}

const translations = {
    en: {
        title: "POgrid.id",
        subtitle: "Set a new password",
        email_label: "Email Address",
        email_placeholder: "Enter your email",
        password_label: "New Password",
        confirm_password_label: "Confirm New Password",
        submit_btn: "Reset Password",
        resetting: "Resetting...",
        back_to_login: "Back to Login"
    },
    id: {
        title: "POgrid.id",
        subtitle: "Atur Password Baru",
        email_label: "Email",
        email_placeholder: "Masukkan email Anda",
        password_label: "Password Baru",
        confirm_password_label: "Konfirmasi Password Baru",
        submit_btn: "Simpan Password Baru",
        resetting: "Memproses...",
        back_to_login: "Kembali ke Login"
    }
};

export default function ResetPassword({ token }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        token: token,
        email: '',
        password: '',
        password_confirmation: '',
    });

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/reset-password');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#09090b',
            backgroundImage: 'radial-gradient(circle at top, rgba(99, 102, 241, 0.08) 0%, transparent 60%)',
            padding: '16px',
            position: 'relative',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Language Switcher */}
            <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'inline-flex',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                padding: '2px',
                zIndex: 10,
            }}>
                <button
                    type="button"
                    onClick={() => changeLanguage('en')}
                    style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: language === 'en' ? '#6366f1' : 'transparent',
                        color: language === 'en' ? '#ffffff' : '#a1a1aa',
                        transition: 'all 0.2s',
                    }}
                >
                    EN
                </button>
                <button
                    type="button"
                    onClick={() => changeLanguage('id')}
                    style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: language === 'id' ? '#6366f1' : 'transparent',
                        color: language === 'id' ? '#ffffff' : '#a1a1aa',
                        transition: 'all 0.2s',
                    }}
                >
                    ID
                </button>
            </div>

            {/* Login Card */}
            <div className="login-card" style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: 'rgba(20, 20, 23, 0.85)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '40px 32px',
                boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
            }}>
                <Link href="/login" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#a1a1aa',
                    textDecoration: 'none',
                    fontSize: '13px',
                    marginBottom: '16px',
                    alignSelf: 'flex-start',
                    transition: 'color 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseOut={(e) => e.currentTarget.style.color = '#a1a1aa'}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    {language === 'id' ? 'Kembali' : 'Back'}
                </Link>

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 800,
                        letterSpacing: '-0.025em',
                        margin: '0 0 6px 0',
                        background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        {t.title}
                    </h1>
                    <p style={{
                        fontSize: '13px',
                        color: '#a1a1aa',
                        margin: 0,
                        lineHeight: '1.4',
                    }}>
                        {t.subtitle}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <input type="hidden" name="token" value={data.token} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="email" style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#a1a1aa',
                        }}>
                            {t.email_label}
                        </label>
                        <input
                            type="email"
                            id="email"
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            style={{
                                width: '100%',
                                height: '44px',
                                padding: '0 14px',
                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '10px',
                                color: '#ffffff',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#6366f1';
                                e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.2)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                e.target.style.boxShadow = 'none';
                            }}
                            placeholder={t.email_placeholder}
                            required
                        />
                        {errors.email && (
                            <span style={{ color: '#f87171', fontSize: '11px', marginTop: '6px', display: 'block' }}>
                                {errors.email}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="password" style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#a1a1aa',
                        }}>
                            {t.password_label}
                        </label>
                        <input
                            type="password"
                            id="password"
                            autoComplete="new-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            style={{
                                width: '100%',
                                height: '44px',
                                padding: '0 14px',
                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '10px',
                                color: '#ffffff',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#6366f1';
                                e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.2)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                e.target.style.boxShadow = 'none';
                            }}
                            placeholder="••••••••"
                            required
                        />
                        {errors.password && (
                            <span style={{ color: '#f87171', fontSize: '11px', marginTop: '6px', display: 'block' }}>
                                {errors.password}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label htmlFor="password_confirmation" style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#a1a1aa',
                        }}>
                            {t.confirm_password_label}
                        </label>
                        <input
                            type="password"
                            id="password_confirmation"
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            style={{
                                width: '100%',
                                height: '44px',
                                padding: '0 14px',
                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '10px',
                                color: '#ffffff',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#6366f1';
                                e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.2)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                e.target.style.boxShadow = 'none';
                            }}
                            placeholder="••••••••"
                            required
                        />
                        {errors.password_confirmation && (
                            <span style={{ color: '#f87171', fontSize: '11px', marginTop: '6px', display: 'block' }}>
                                {errors.password_confirmation}
                            </span>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        style={{
                            width: '100%',
                            height: '46px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '10px',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.35)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.25)';
                        }}
                    >
                        {processing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg style={{ animation: 'spin 1s linear infinite', height: '18px', width: '18px', color: '#ffffff' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>{t.resetting}</span>
                            </div>
                        ) : (
                            t.submit_btn
                        )}
                    </button>
                </form>

                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: '24px',
                    fontSize: '13px',
                }}>
                    <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                        {t.back_to_login}
                    </Link>
                </div>
            </div>
        </div>
    );
}
