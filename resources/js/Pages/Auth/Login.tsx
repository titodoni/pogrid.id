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
        network_error: "Poor network connection. Please check your internet."
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
        network_error: "Koneksi buruk. Silakan periksa jaringan internet Anda."
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
            backgroundColor: '#09090b',
            fontFamily: 'Inter, sans-serif',
            color: '#fafafa',
            padding: '16px',
            position: 'relative'
        }}>
            {/* Language Switcher */}
            <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'inline-flex',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(255,255,255,0.04)',
                zIndex: 10
            }}>
                <button
                    type="button"
                    onClick={() => changeLanguage('en')}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: language === 'en' ? '#6366f1' : 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    EN
                </button>
                <button
                    type="button"
                    onClick={() => changeLanguage('id')}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: language === 'id' ? '#6366f1' : 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    ID
                </button>
            </div>

            <div className="login-card animate-in w-full max-w-[420px] bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-white/8 p-6 sm:p-10 shadow-2xl">
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 800,
                        letterSpacing: '-0.025em',
                        background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px'
                    }}>
                        {t.title}
                    </h1>
                    <p style={{ color: '#a1a1aa', fontSize: '14px' }}>
                        {t.subtitle}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="username" style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#a1a1aa',
                            marginBottom: '6px'
                        }}>
                            {t.username_label}
                        </label>
                        <input
                            type="text"
                            id="username"
                            autoComplete="username"
                            value={data.username}
                            onChange={(e) => setData('username', e.target.value)}
                            className="focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: '#0a0a0c',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '10px',
                                color: '#fafafa',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            placeholder={t.username_placeholder}
                            required
                        />
                        {errors.username && (
                            <span style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                                {t[errors.username as keyof typeof t] || errors.username}
                            </span>
                        )}
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label htmlFor="password" style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#a1a1aa',
                            marginBottom: '6px'
                        }}>
                            {t.password_label}
                        </label>
                        <input
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: '#0a0a0c',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '10px',
                                color: '#fafafa',
                                fontSize: '15px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            placeholder="••••••••"
                            required
                        />
                        {errors.password && (
                            <span style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                                {t[errors.password as keyof typeof t] || errors.password}
                            </span>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-base shadow-lg shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        style={{ marginBottom: '20px' }}
                    >
                        {processing ? (
                            <div className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>{t.logging_in}</span>
                            </div>
                        ) : (
                            t.submit_btn
                        )}
                    </button>
                </form>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between items-center text-sm">
                    <div>
                        <span style={{ color: '#a1a1aa' }}>{t.new_company} </span>
                        <Link href="/register" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                            {t.register}
                        </Link>
                    </div>
                    <Link href="/forgot-password" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '13px' }}>
                        {t.forgot_password}
                    </Link>
                </div>
            </div>
        </div>
    );
}
