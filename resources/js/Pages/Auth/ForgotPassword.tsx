import React, { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/forgot-password');
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
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
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
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            color: '#ffffff',
                            fontWeight: 600,
                            borderRadius: '10px',
                            border: 'none',
                            fontSize: '16px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s, transform 0.1s',
                            boxShadow: '0 4px 12px -2px rgba(99, 102, 241, 0.3)',
                            marginBottom: '20px'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)')}
                    >
                        {processing ? t.sending : t.submit_btn}
                    </button>
                </form>

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
