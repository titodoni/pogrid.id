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

                <form onSubmit={handleSubmit}>
                    <input type="hidden" name="token" value={data.token} />

                    <div style={{ marginBottom: '20px' }}>
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

                    <div style={{ marginBottom: '20px' }}>
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
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
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
                                {errors.password}
                            </span>
                        )}
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label htmlFor="password_confirmation" style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#a1a1aa',
                            marginBottom: '6px'
                        }}>
                            {t.confirm_password_label}
                        </label>
                        <input
                            type="password"
                            id="password_confirmation"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
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
                        {processing ? t.resetting : t.submit_btn}
                    </button>
                </form>

                <div className="text-center text-sm">
                    <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                        {t.back_to_login}
                    </Link>
                </div>
            </div>
        </div>
    );
}
