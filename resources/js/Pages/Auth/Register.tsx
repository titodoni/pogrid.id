import React from 'react';
import { useForm, Link } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        company_name: '',
        slug: '',
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

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
            backgroundColor: '#0f172a',
            fontFamily: 'Inter, sans-serif',
            color: '#f8fafc',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '480px',
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '40px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)'
            }}>
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
                        Setup POgrid.id
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                        Register your factory & configure the Owner Administrator account
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Section: Company Details */}
                    <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            1. Company Details
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
                                Company / Factory Name
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
                                    backgroundColor: '#0f172a',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                placeholder="e.g. CV. Teknik Mandiri"
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
                                Company URL Slug / Short Name
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
                                    backgroundColor: '#0f172a',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                placeholder="e.g. MTR"
                                required
                            />
                            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                                Used for your login URL. Alphanumeric only (letters & numbers), max 10 characters. No spaces/dashes.
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
                            2. Administrator Account
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
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: '#0f172a',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                placeholder="e.g. Budi Santoso"
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
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: '#0f172a',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#f8fafc',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                placeholder="e.g. owner@factory.com"
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
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: '#0f172a',
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
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: '#0f172a',
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
                        {processing ? 'Registering...' : 'Register & Setup Onboarding'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', fontSize: '14px' }}>
                    <span style={{ color: '#94a3b8' }}>Already have an account? </span>
                    <Link href="/login" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
