import React, { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';

const translations = {
    en: {
        title: "Setup POgrid.id",
        subtitle: "Register your factory & configure the Owner Administrator account",
        company_details: "1. Company Details",
        company_name_label: "Company / Factory Name",
        company_name_placeholder: "e.g. CV. Teknik Mandiri",
        slug_label: "Company URL Slug / Short Name",
        slug_placeholder: "e.g. MTR",
        slug_desc: "Used for your login URL. Alphanumeric only (letters & numbers), max 10 characters. No spaces/dashes.",
        admin_account: "2. Administrator Account",
        full_name_label: "Full Name",
        full_name_placeholder: "e.g. Budi Santoso",
        email_label: "Email Address",
        email_placeholder: "e.g. owner@factory.com",
        password_label: "Password",
        confirm_password_label: "Confirm Password",
        submit_btn: "Register & Setup Onboarding",
        registering: "Registering...",
        already_have_account: "Already have an account?",
        sign_in: "Sign In"
    },
    id: {
        title: "Pendaftaran POgrid.id",
        subtitle: "Daftarkan perusahaan Anda & atur akun Owner (Pengelola)",
        company_details: "1. Profil Perusahaan",
        company_name_label: "Nama Perusahaan / Pabrik",
        company_name_placeholder: "misal: CV. Teknik Mandiri",
        slug_label: "Slug URL Perusahaan (Nama Pendek)",
        slug_placeholder: "misal: MTR",
        slug_desc: "Digunakan untuk alamat link masuk (login). Hanya huruf & angka (maksimal 10 karakter), tanpa spasi atau tanda hubung.",
        admin_account: "2. Akun Owner",
        full_name_label: "Nama Lengkap",
        full_name_placeholder: "misal: Budi Santoso",
        email_label: "Email",
        email_placeholder: "misal: owner@factory.com",
        password_label: "Password",
        confirm_password_label: "Konfirmasi Password",
        submit_btn: "Daftar & Mulai Penggunaan",
        registering: "Memproses...",
        already_have_account: "Sudah punya akun?",
        sign_in: "Masuk"
    }
};

function readAttribution(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const p = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref'].forEach((k) => {
        const v = p.get(k);
        if (v) out[k] = v;
    });
    return out;
}

export default function Register() {
    const attribution = readAttribution();
    const { data, setData, post, processing, errors } = useForm({
        company_name: '',
        slug: '',
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        utm_source: attribution.utm_source || '',
        utm_medium: attribution.utm_medium || '',
        utm_campaign: attribution.utm_campaign || '',
        utm_content: attribution.utm_content || '',
        ref: attribution.ref || '',
    });

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

    const generateSlug = (companyName: string) => {
        let cleaned = companyName.replace(/^(PT|CV|UD)\.?\s+/i, '').trim();
        if (!cleaned) return '';
        cleaned = cleaned.replace(/[^a-zA-Z0-9\s]/g, '');
        let words = cleaned.split(/\s+/);
        let generated = '';
        if (words.length > 1) {
            if (words[0].length <= 4) {
                generated = words[0];
            } else if (words[0].toLowerCase().startsWith('dsk')) {
                generated = 'DSK';
            } else {
                generated = words.map(w => w[0]).join('');
            }
        } else {
            generated = cleaned.substring(0, 4);
        }
        return generated.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/register', { preserveScroll: true });
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-pg-bg)',
            backgroundImage: 'radial-gradient(circle at top, rgba(99, 102, 241, 0.08) 0%, transparent 60%)',
            padding: '24px 16px',
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

            {/* Login Card */}
            <div className="login-card" style={{
                width: '100%',
                maxWidth: '480px',
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
                <Link href="/login" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--color-pg-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '13px',
                    marginBottom: '16px',
                    alignSelf: 'flex-start',
                    transition: 'color 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-pg-text-secondary)'}
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
                        background: 'linear-gradient(135deg, var(--color-pg-primary) 0%, var(--color-pg-primary-hover) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        {t.title}
                    </h1>
                    <p style={{
                        fontSize: '13px',
                        color: 'var(--color-pg-text-secondary)',
                        margin: 0,
                        lineHeight: '1.4',
                    }}>
                        {t.subtitle}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Section: Company Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-pg-primary-hover)', margin: '0' }}>
                            {t.company_details}
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor="company_name" style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--color-pg-text-secondary)',
                            }}>
                                {t.company_name_label}
                            </label>
                            <input
                                type="text"
                                id="company_name"
                                value={data.company_name}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setData(data => ({
                                        ...data,
                                        company_name: val,
                                        slug: generateSlug(val)
                                    }));
                                }}
                                style={{
                                    width: '100%',
                                    height: '44px',
                                    padding: '0 14px',
                                    backgroundColor: 'var(--color-pg-input)',
                                    border: '1px solid var(--color-pg-border)',
                                    borderRadius: '10px',
                                    color: '#ffffff',
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
                                placeholder={t.company_name_placeholder}
                                required
                            />
                            {errors.company_name && (
                                <span style={{ color: 'var(--color-pg-danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                    {errors.company_name}
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor="slug" style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--color-pg-text-secondary)',
                            }}>
                                {t.slug_label}
                            </label>
                            <input
                                type="text"
                                id="slug"
                                maxLength={10}
                                value={data.slug}
                                onChange={(e) => {
                                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                    setData('slug', val);
                                }}
                                style={{
                                    width: '100%',
                                    height: '44px',
                                    padding: '0 14px',
                                    backgroundColor: 'var(--color-pg-input)',
                                    border: '1px solid var(--color-pg-border)',
                                    borderRadius: '10px',
                                    color: '#ffffff',
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
                                placeholder={t.slug_placeholder}
                                required
                            />
                            <span style={{ fontSize: '11px', color: 'var(--color-pg-text-muted)', lineHeight: '1.4' }}>
                                {t.slug_desc}
                            </span>
                            {errors.slug && (
                                <span style={{ color: 'var(--color-pg-danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                    {errors.slug}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Section: Admin Administrator Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-pg-primary-hover)', margin: '0' }}>
                            {t.admin_account}
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor="name" style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--color-pg-text-secondary)',
                            }}>
                                {t.full_name_label}
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '44px',
                                    padding: '0 14px',
                                    backgroundColor: 'var(--color-pg-input)',
                                    border: '1px solid var(--color-pg-border)',
                                    borderRadius: '10px',
                                    color: '#ffffff',
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
                                placeholder={t.full_name_placeholder}
                                required
                            />
                            {errors.name && (
                                <span style={{ color: 'var(--color-pg-danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                    {errors.name}
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor="email" style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--color-pg-text-secondary)',
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
                                    height: '44px',
                                    padding: '0 14px',
                                    backgroundColor: 'var(--color-pg-input)',
                                    border: '1px solid var(--color-pg-border)',
                                    borderRadius: '10px',
                                    color: '#ffffff',
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
                                placeholder={t.email_placeholder}
                                required
                            />
                            {errors.email && (
                                <span style={{ color: 'var(--color-pg-danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                    {errors.email}
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor="password" style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--color-pg-text-secondary)',
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
                                    height: '44px',
                                    padding: '0 14px',
                                    backgroundColor: 'var(--color-pg-input)',
                                    border: '1px solid var(--color-pg-border)',
                                    borderRadius: '10px',
                                    color: '#ffffff',
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
                                <span style={{ color: 'var(--color-pg-danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                    {errors.password}
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label htmlFor="password_confirmation" style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--color-pg-text-secondary)',
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
                                    height: '44px',
                                    padding: '0 14px',
                                    backgroundColor: 'var(--color-pg-input)',
                                    border: '1px solid var(--color-pg-border)',
                                    borderRadius: '10px',
                                    color: '#ffffff',
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
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        style={{
                            width: '100%',
                            height: '46px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, var(--color-pg-primary-hover) 0%, var(--color-pg-primary) 100%)',
                            color: '#ffffff',
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
                            e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-pg-primary) 0%, var(--color-pg-primary-hover) 100%)';
                            e.currentTarget.style.boxShadow = '0 6px 16px var(--color-pg-primary-glow)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-pg-primary-hover) 0%, var(--color-pg-primary) 100%)';
                            e.currentTarget.style.boxShadow = '0 4px 12px var(--color-pg-primary-glow)';
                        }}
                    >
                        {processing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg style={{ animation: 'spin 1s linear infinite', height: '18px', width: '18px', color: '#ffffff' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>{t.registering}</span>
                            </div>
                        ) : (
                            t.submit_btn
                        )}
                    </button>
                </form>

                <p style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '16px',
                    marginBottom: 0,
                    fontSize: '12px',
                    color: 'var(--color-pg-text-muted)',
                    textAlign: 'center',
                    lineHeight: 1.4,
                }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    {language === 'id' ? 'Gratis 30 hari · Tanpa kartu kredit · Data pabrik aman' : 'Free 30-day trial · No credit card · Your data is safe'}
                </p>

                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '24px',
                    fontSize: '13px',
                }}>
                    <span style={{ color: 'var(--color-pg-text-secondary)' }}>{t.already_have_account} </span>
                    <Link href="/login" style={{ color: 'var(--color-pg-primary-hover)', textDecoration: 'none', fontWeight: 600 }}>
                        {t.sign_in}
                    </Link>
                </div>
            </div>
        </div>
    );
}
