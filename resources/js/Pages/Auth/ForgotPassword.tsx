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
        subtitle: "Atur ulang kata sandi Anda",
        dev_mode_msg: "Dalam mode pengembangan, tautan atur ulang kata sandi dicatat. Periksa storage/logs/laravel.log untuk URL atur ulang.",
        email_label: "Alamat Email",
        email_placeholder: "Masukkan alamat email Anda",
        submit_btn: "Kirim Tautan Atur Ulang",
        sending: "Mengirim...",
        remember_password: "Ingat kata sandi Anda?",
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
            backgroundColor: '#090d16',
            fontFamily: 'Inter, sans-serif',
            color: '#f8fafc',
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
                        backgroundColor: language === 'en' ? '#2563eb' : 'transparent',
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
                        backgroundColor: language === 'id' ? '#2563eb' : 'transparent',
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

            <div className="w-full max-w-[420px] bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/8 p-6 sm:p-10 shadow-2xl">
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 800,
                        letterSpacing: '-0.025em',
                        background: 'linear-gradient(to right, #60a5fa, #3b82f6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px'
                    }}>
                        {t.title}
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                        {t.subtitle}
                    </p>
                </div>

                <div style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.06)',
                    border: '1px dashed rgba(37, 99, 235, 0.3)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '24px',
                    fontSize: '12px',
                    color: '#60a5fa',
                    lineHeight: '1.5'
                }}>
                    {t.dev_mode_msg.split('storage/logs/laravel.log').map((part, index, arr) => (
                        <React.Fragment key={index}>
                            {part}
                            {index < arr.length - 1 && <code style={{ color: '#38bdf8' }}>storage/logs/laravel.log</code>}
                        </React.Fragment>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '32px' }}>
                        <label htmlFor="email" style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#94a3b8',
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
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
                                backgroundColor: '#090d16',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: '#f8fafc',
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
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            fontWeight: 600,
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '16px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s, transform 0.1s',
                            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                            marginBottom: '20px'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                    >
                        {processing ? t.sending : t.submit_btn}
                    </button>
                </form>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between items-center text-sm">
                    <span style={{ color: '#94a3b8' }}>{t.remember_password} </span>
                    <Link href="/login" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
                        {t.sign_in}
                    </Link>
                </div>
            </div>
        </div>
    );
}
