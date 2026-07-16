import React, { useState } from 'react';
import { useForm, usePage, Link } from '@inertiajs/react';

const translations = {
    en: {
        title: "POgrid.id",
        subtitle: "Reset your password",
        dev_mode_msg: "In development mode, password reset links are logged. Check storage/logs/laravel.log for the reset URL.",
        email_label: "Email Address",
        email_placeholder: "Enter your email address",
        submit_btn: "Send Reset Link",
        sending: "Sending...",
        remember_password: "Remember your password?",
        sign_in: "Sign In"
    },
    id: {
        title: "POgrid.id",
        subtitle: "Atur Ulang Password",
        dev_mode_msg: "Dalam mode pengembangan, link atur ulang password dicatat pada file log. Silakan periksa storage/logs/laravel.log untuk melihat URL.",
        email_label: "Email",
        email_placeholder: "Masukkan email Anda",
        submit_btn: "Kirim Link Atur Ulang",
        sending: "Mengirim...",
        remember_password: "Sudah ingat password Anda?",
        sign_in: "Masuk"
    }
};

export default function ForgotPassword() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
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
    const { props } = usePage();
    const flashSuccess = (props as any).flash?.success;
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/forgot-password', {
            onSuccess: () => setSubmitted(true),
        });
    };

    const successMessage = flashSuccess || (submitted ? 'Password reset link has been sent to your email. Check your inbox (or server log in dev mode).' : null);

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
                backgroundColor: 'rgba(255,255,255,0.02)',
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

                {successMessage ? (
                    <div style={{
                        backgroundColor: 'rgba(34, 197, 94, 0.08)',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>&#10003;</div>
                        <p style={{ color: '#86efac', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                            {successMessage}
                        </p>
                    </div>
                ) : (
                    <>
                {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                    <div style={{
                        backgroundColor: 'rgba(99, 102, 241, 0.06)',
                        border: '1px dashed rgba(99, 102, 241, 0.25)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '24px',
                        fontSize: '12px',
                        color: '#818cf8',
                        lineHeight: '1.5'
                    }}>
                        {t.dev_mode_msg.split('storage/logs/laravel.log').map((part, index, arr) => (
                            <React.Fragment key={index}>
                                {part}
                                {index < arr.length - 1 && <code style={{ color: '#a5b4fc' }}>storage/logs/laravel.log</code>}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '32px' }}>
                        <label htmlFor="email" style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#a1a1aa',
                            marginBottom: '6px'
                        }}>
                            {t.email_label}
                        </label>
                        <input
                            type="email"
                            id="email"
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
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
                            placeholder={t.email_placeholder}
                            required
                        />
                        {errors.email && (
                            <span style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                                {errors.email}
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
                                <span>{t.sending}</span>
                            </div>
                        ) : (
                            t.submit_btn
                        )}
                    </button>
                </form>
                    </>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between items-center text-sm">
                    <span style={{ color: '#a1a1aa' }}>{t.remember_password} </span>
                    <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                        {t.sign_in}
                    </Link>
                </div>
            </div>
        </div>
    );
}
