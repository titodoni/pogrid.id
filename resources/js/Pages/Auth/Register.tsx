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

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        company_name: '',
        slug: '',
        name: '',
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

    const generateSlug = (companyName: string) => {
        // Strip business prefixes: PT., PT, CV., CV, UD., UD
        let cleaned = companyName.replace(/^(PT|CV|UD)\.?\s+/i, '').trim();
        if (!cleaned) return '';
        
        // Remove all non-alphanumeric except spaces
        cleaned = cleaned.replace(/[^a-zA-Z0-9\s]/g, '');
        let words = cleaned.split(/\s+/);
        let generated = '';
        
        if (words.length > 1) {
            if (words[0].length <= 4) {
                generated = words[0];
            } else if (words[0].toLowerCase().startsWith('dsk')) {
                generated = 'DSK';
            } else {
                // Extract first letter of each word (initials)
                generated = words.map(w => w[0]).join('');
            }
        } else {
            // Take first 4 characters of single word
            generated = cleaned.substring(0, 4);
        }
        
        // Uppercase, limit 10 chars, strip dashes/spaces/symbols
        return generated.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/register');
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

            <div className="login-card w-full max-w-[480px] bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/8 p-6 sm:p-10 shadow-2xl">
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

                <form onSubmit={handleSubmit}>
                    {/* Section: Company Details */}
                    <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {t.company_details}
                        </h3>
                        <div>
                            <label htmlFor="company_name" style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#94a3b8',
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
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
                                    padding: '12px 16px',
                                    backgroundColor: '#090d16',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                placeholder={t.company_name_placeholder}
                                required
                            />
                            {errors.company_name && (
                                <span style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                                    {errors.company_name}
                                </span>
                            )}
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <label htmlFor="slug" style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#94a3b8',
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
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
                                    padding: '12px 16px',
                                    backgroundColor: '#090d16',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                placeholder={t.slug_placeholder}
                                required
                            />
                            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                                {t.slug_desc}
                            </span>
                            {errors.slug && (
                                <span style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                                    {errors.slug}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Section: Admin Administrator Details */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {t.admin_account}
                        </h3>
                        
                        <div style={{ marginBottom: '16px' }}>
                            <label htmlFor="name" style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#94a3b8',
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
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
                                    padding: '12px 16px',
                                    backgroundColor: '#090d16',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                placeholder={t.full_name_placeholder}
                                required
                            />
                            {errors.name && (
                                <span style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                                    {errors.name}
                                </span>
                            )}
                        </div>

                        <div style={{ marginBottom: '16px' }}>
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

                        <div style={{ marginBottom: '16px' }}>
                            <label htmlFor="password" style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#94a3b8',
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
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
                                    backgroundColor: '#090d16',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
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

                        <div>
                            <label htmlFor="password_confirmation" style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#94a3b8',
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
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
                                    backgroundColor: '#090d16',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
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
                        {processing ? t.registering : t.submit_btn}
                    </button>
                </form>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between items-center text-sm">
                    <span style={{ color: '#94a3b8' }}>{t.already_have_account} </span>
                    <Link href="/login" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
                        {t.sign_in}
                    </Link>
                </div>
            </div>
        </div>
    );
}
