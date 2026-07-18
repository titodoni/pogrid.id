import React, { useState } from 'react';
import { useForm, usePage, Link } from '@inertiajs/react';

const translations = {
    en: {
        title: "POgrid.id",
        subtitle: "Verify Your Email",
        notice: "Thanks for signing up! Before getting started, could you verify your email address by clicking on the link we just emailed to you? If you didn't receive the email, we will gladly send you another.",
        dev_mode_msg: "In development mode, verification links are logged. Check storage/logs/laravel.log for the verification URL.",
        status_sent: "A new verification link has been sent to the email address you provided during registration.",
        resend_btn: "Resend Verification Email",
        resending: "Sending...",
        logout_btn: "Log Out"
    },
    id: {
        title: "POgrid.id",
        subtitle: "Verifikasi Email Anda",
        notice: "Terima kasih telah mendaftar! Sebelum memulai, silakan verifikasi alamat email Anda dengan mengklik link yang baru saja kami kirimkan ke email Anda. Jika Anda tidak menerima email tersebut, kami dengan senang hati akan mengirimkan yang baru.",
        dev_mode_msg: "Dalam mode pengembangan, link verifikasi dicatat pada file log. Silakan periksa storage/logs/laravel.log untuk melihat URL.",
        status_sent: "Link verifikasi baru telah dikirim ke alamat email yang Anda berikan saat pendaftaran.",
        resend_btn: "Kirim Ulang Email Verifikasi",
        resending: "Mengirim...",
        logout_btn: "Keluar"
    }
};

interface VerifyEmailProps {
    status?: string;
}

export default function VerifyEmail({ status }: VerifyEmailProps) {
    const { post, processing } = useForm({});
    
    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'id';
        }
        return 'id';
    });

    const changeLanguage = (lang: 'en' | 'id') => {
        setLanguage(lang);
        localStorage.setItem('pogrid_lang', lang);
    };

    const t = translations[language];

    const handleResend = (e: React.FormEvent) => {
        e.preventDefault();
        post('/email/verification-notification');
    };

    const handleLogout = (e: React.FormEvent) => {
        e.preventDefault();
        post('/logout');
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
            fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
        }}>
            {/* Language Switcher */}
            <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'inline-flex',
                borderRadius: '8px',
                border: '1px solid var(--color-pg-border)',
                backgroundColor: 'var(--color-pg-border-subtle)',
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
                        color: language === 'en' ? '#ffffff' : 'var(--color-pg-text-secondary)',
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
                        color: language === 'id' ? '#ffffff' : 'var(--color-pg-text-secondary)',
                        transition: 'all 0.2s',
                    }}
                >
                    ID
                </button>
            </div>

            {/* Verification Card */}
            <div className="login-card" style={{
                width: '100%',
                maxWidth: '440px',
                backgroundColor: 'var(--color-pg-surface)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid var(--color-pg-border)',
                padding: '40px 32px',
                boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 800,
                        letterSpacing: '-0.025em',
                        margin: '0 0 6px 0',
                        background: 'linear-gradient(135deg, var(--color-pg-primary) 0%, var(--color-pg-primary-hover) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        {t.title}
                    </h1>
                    <h2 style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'var(--color-pg-text-secondary)',
                        margin: '0 0 12px 0',
                    }}>
                        {t.subtitle}
                    </h2>
                    <p style={{
                        fontSize: '13px',
                        color: 'var(--color-pg-text-secondary)',
                        lineHeight: '1.5',
                        margin: 0,
                    }}>
                        {t.notice}
                    </p>
                </div>

                <div style={{
                    fontSize: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px dashed var(--color-pg-border)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: 'var(--color-pg-text-muted)',
                    marginBottom: '24px',
                    textAlign: 'center',
                    lineHeight: '1.4'
                }}>
                    {t.dev_mode_msg}
                </div>

                {status === 'verification-link-sent' && (
                    <div style={{
                        fontSize: '13px',
                        color: 'var(--color-pg-success, #34d399)',
                        backgroundColor: 'rgba(52, 211, 153, 0.1)',
                        border: '1px solid rgba(52, 211, 153, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '24px',
                        textAlign: 'center',
                        fontWeight: 500,
                        lineHeight: '1.4'
                    }}>
                        {t.status_sent}
                    </div>
                )}

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    <form onSubmit={handleResend} style={{ width: '100%' }}>
                        <button
                            type="submit"
                            disabled={processing}
                            style={{
                                width: '100%',
                                height: '44px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, var(--color-pg-primary-hover) 0%, var(--color-pg-primary) 100%)',
                                color: '#ffffff',
                                fontSize: '14px',
                                fontWeight: 600,
                                border: 'none',
                                cursor: processing ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px var(--color-pg-primary-glow)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                opacity: processing ? 0.7 : 1,
                            }}
                        >
                            {processing ? t.resending : t.resend_btn}
                        </button>
                    </form>

                    <form onSubmit={handleLogout} style={{ width: '100%' }}>
                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                height: '44px',
                                borderRadius: '10px',
                                border: '1px solid var(--color-pg-border)',
                                backgroundColor: 'transparent',
                                color: 'var(--color-pg-text-secondary)',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--color-pg-text-secondary)';
                            }}
                        >
                            {t.logout_btn}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
