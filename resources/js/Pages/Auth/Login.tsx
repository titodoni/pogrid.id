import React, { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';

const translations = {
    en: {
        title: "POgrid.id",
        subtitle: "Live Progress & Delivery Punctuality Tracker",
        username_label: "Username",
        username_placeholder: "Enter username",
        password_label: "Password",
        submit_btn: "Sign In",
        logging_in: "Logging in...",
        new_company: "New company?",
        register: "Register POgrid",
        forgot_password: "Forgot Password?",
        auth_failed: "These credentials do not match our records.",
        user_not_found: "No account found with that username/email.",
        wrong_password: "Incorrect password. Please try again.",
        network_error: "Poor network connection. Please check your internet.",
        back_to_home: "Back to Home"
    },
    id: {
        title: "POgrid.id",
        subtitle: "Pantau Progres Produksi & Ketepatan Pengiriman",
        username_label: "Username",
        username_placeholder: "Masukkan username",
        password_label: "Password",
        submit_btn: "Masuk",
        logging_in: "Memproses...",
        new_company: "Perusahaan baru?",
        register: "Daftar POgrid",
        forgot_password: "Lupa Password?",
        auth_failed: "Kredensial yang Anda masukkan salah.",
        user_not_found: "Tidak ada akun dengan username/email tersebut.",
        wrong_password: "Password salah. Silakan coba lagi.",
        network_error: "Koneksi buruk. Silakan periksa jaringan internet Anda.",
        back_to_home: "Kembali ke Beranda"
    }
};

export default function Login() {
    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        username: '',
        password: '',
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
        clearErrors();
        if (!navigator.onLine) {
            setError('username', 'network_error');
            return;
        }
        post('/login');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-pg-bg)',
            backgroundImage: 'radial-gradient(circle at top, var(--color-pg-primary-glow) 0%, transparent 60%)',
            padding: '16px',
            position: 'relative',
            fontFamily: 'var(--font-sans)',
            overflow: 'hidden',
        }}>
            {/* Back Button */}
            <Link
                href="/"
                style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-pg-border)',
                    backgroundColor: 'var(--color-pg-card)',
                    color: 'var(--color-pg-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    zIndex: 10,
                    transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.color = 'var(--color-pg-text)';
                    e.currentTarget.style.borderColor = 'var(--color-pg-primary-hover)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.color = 'var(--color-pg-text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--color-pg-border)';
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                {t.back_to_home}
            </Link>

            {/* Glowing background shapes */}
            <div style={{
                position: 'absolute',
                top: '10%',
                left: '10%',
                width: '280px',
                height: '280px',
                borderRadius: '50%',
                background: 'var(--color-pg-primary-glow)',
                filter: 'blur(80px)',
                opacity: 0.5,
                pointerEvents: 'none',
                zIndex: 1,
            }} />
            <div style={{
                position: 'absolute',
                bottom: '10%',
                right: '10%',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                background: 'var(--color-pg-primary-glow)',
                filter: 'blur(100px)',
                opacity: 0.4,
                pointerEvents: 'none',
                zIndex: 1,
            }} />

            {/* Language Switcher */}
            <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'inline-flex',
                borderRadius: '8px',
                border: '1px solid var(--color-pg-border)',
                backgroundColor: 'var(--color-pg-card)',
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
                        backgroundColor: language === 'en' ? 'var(--color-pg-primary)' : 'transparent',
                        color: language === 'en' ? 'var(--color-pg-primary-ink)' : 'var(--color-pg-text-secondary)',
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
                        backgroundColor: language === 'id' ? 'var(--color-pg-primary)' : 'transparent',
                        color: language === 'id' ? 'var(--color-pg-primary-ink)' : 'var(--color-pg-text-secondary)',
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
                backgroundColor: 'var(--color-pg-surface)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1px solid var(--color-pg-border)',
                padding: '44px 36px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--color-pg-border)',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 2,
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
                    <img src="/pogrid-logo.png" alt="POgrid.id Logo" style={{ height: '48px', width: 'auto', marginBottom: '12px' }} />
                    <p style={{
                        fontSize: '13px',
                        color: 'var(--color-pg-text-secondary)',
                        margin: 0,
                        lineHeight: '1.4',
                        textAlign: 'center'
                    }}>
                        {t.subtitle}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label htmlFor="username" style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--color-pg-text-secondary)',
                            marginBottom: '6px',
                        }}>
                            {t.username_label}
                        </label>
                        <input
                            type="text"
                            id="username"
                            autoComplete="username"
                            value={data.username}
                            onChange={(e) => setData('username', e.target.value)}
                            style={{
                                width: '100%',
                                height: '44px',
                                padding: '0 14px',
                                backgroundColor: 'var(--color-pg-input)',
                                border: '1px solid var(--color-pg-border)',
                                borderRadius: '10px',
                                color: 'var(--color-pg-text)',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--color-pg-primary)';
                                e.target.style.boxShadow = '0 0 0 2px var(--color-pg-primary-glow)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--color-pg-border)';
                                e.target.style.boxShadow = 'none';
                            }}
                            placeholder={t.username_placeholder}
                            required
                        />
                        {errors.username && (
                            <span style={{ color: 'var(--color-pg-danger)', fontSize: '11px', marginTop: '6px', display: 'block' }}>
                                {t[errors.username as keyof typeof t] || errors.username}
                            </span>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password" style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--color-pg-text-secondary)',
                            marginBottom: '6px',
                        }}>
                            {t.password_label}
                        </label>
                        <input
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            style={{
                                width: '100%',
                                height: '44px',
                                padding: '0 14px',
                                backgroundColor: 'var(--color-pg-input)',
                                border: '1px solid var(--color-pg-border)',
                                borderRadius: '10px',
                                color: 'var(--color-pg-text)',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--color-pg-primary)';
                                e.target.style.boxShadow = '0 0 0 2px var(--color-pg-primary-glow)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--color-pg-border)';
                                e.target.style.boxShadow = 'none';
                            }}
                            placeholder="••••••••"
                            required
                        />
                        {errors.password && (
                            <span style={{ color: 'var(--color-pg-danger)', fontSize: '11px', marginTop: '6px', display: 'block' }}>
                                {t[errors.password as keyof typeof t] || errors.password}
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
                            background: 'linear-gradient(135deg, var(--color-pg-primary) 0%, var(--color-pg-primary-hover) 100%)',
                            color: 'var(--color-pg-primary-ink)',
                            fontSize: '14px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px var(--color-pg-primary-glow)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '10px',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-pg-primary-hover) 0%, var(--color-pg-primary) 100%)';
                            e.currentTarget.style.boxShadow = '0 6px 16px var(--color-pg-primary-glow)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-pg-primary) 0%, var(--color-pg-primary-hover) 100%)';
                            e.currentTarget.style.boxShadow = '0 4px 12px var(--color-pg-primary-glow)';
                        }}
                    >
                        {processing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg style={{ animation: 'spin 1s linear infinite', height: '18px', width: '18px', color: 'var(--color-pg-primary-ink)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>{t.logging_in}</span>
                            </div>
                        ) : (
                            t.submit_btn
                        )}
                    </button>
                </form>

                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '24px',
                    fontSize: '13px',
                }}>
                    <div>
                        <span style={{ color: 'var(--color-pg-text-secondary)' }}>{t.new_company} </span>
                        <Link href="/register" style={{ color: 'var(--color-pg-primary-hover)', textDecoration: 'none', fontWeight: 600 }}>
                            {t.register}
                        </Link>
                    </div>
                    <Link href="/forgot-password" style={{ color: 'var(--color-pg-text-secondary)', textDecoration: 'none' }}>
                        {t.forgot_password}
                    </Link>
                </div>
            </div>
        </div>
    );
}
