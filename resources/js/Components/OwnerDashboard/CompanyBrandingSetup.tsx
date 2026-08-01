import React, { useState, useRef } from 'react';
import { useForm, router } from '@inertiajs/react';

interface Props {
    tenant?: {
        company_name: string;
        slug: string;
        logo_path?: string | null;
        theme?: string;
    };
    language: 'en' | 'id';
}

const THEMES = [
    { id: 'theme-default', name: 'Default Indigo', color: '#6366f1', bg: '#0f172a', desc: 'Sleek dark blue & indigo accents' },
    { id: 'theme-linear', name: 'Linear Dark', color: '#a855f7', bg: '#0a0a0c', desc: 'Ultra dark minimalist & purple glow' },
    { id: 'theme-vercel', name: 'Vercel Monochrome', color: '#ffffff', bg: '#000000', desc: 'High contrast black, white & gray' },
    { id: 'theme-stripe', name: 'Stripe Corporate', color: '#06b6d4', bg: '#0d162a', desc: 'Vivid cyan, purple & tech gradient' },
    { id: 'theme-github', name: 'GitHub Slate', color: '#3b82f6', bg: '#0d1117', desc: 'Developer style slate & ocean blue' },
    { id: 'theme-nordic', name: 'Nordic Frost', color: '#38bdf8', bg: '#2e3440', desc: 'Calming arctic frost & night sky' },
    { id: 'theme-light', name: 'Mint Cream Light', color: '#059669', bg: '#f8fafc', desc: 'Clean, modern bright executive look', isLight: true },
    { id: 'theme-brand', name: 'Emerald Forest', color: '#10b981', bg: '#064e3b', desc: 'Rich green & gold industrial luxury' },
];

export const CompanyBrandingSetup: React.FC<Props> = ({ tenant, language }) => {
    const [previewTheme, setPreviewTheme] = useState(tenant?.theme || 'theme-default');
    const [previewLogo, setPreviewLogo] = useState<string | null>(tenant?.logo_path || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm({
        company_name: tenant?.company_name || '',
        theme: tenant?.theme || 'theme-default',
        logo: null as File | null,
    });

    const handleThemeSelect = (themeId: string) => {
        setData('theme', themeId);
        setPreviewTheme(themeId);
        localStorage.setItem('pogrid_theme', themeId);
        const classes = ['theme-default', 'theme-linear', 'theme-vercel', 'theme-stripe', 'theme-github', 'theme-nordic', 'theme-light', 'theme-brand'];
        classes.forEach(c => document.documentElement.classList.remove(c));
        document.documentElement.classList.add(themeId);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setData('logo', file);
            setPreviewLogo(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/company/update', {
            preserveScroll: true,
            onSuccess: () => {
                // Flash success will be handled globally
            }
        });
    };

    const isId = language === 'id';

    return (
        <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '40px' }}>
            <div style={{
                background: 'var(--color-pg-surface)',
                border: '1px solid var(--color-pg-border)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
                backdropFilter: 'blur(16px)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Top Decorative Glow */}
                <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '20%',
                    width: '60%',
                    height: '100%',
                    background: 'radial-gradient(ellipse at center, var(--color-pg-primary-glow, rgba(99, 102, 241, 0.15)) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ marginBottom: '28px', borderBottom: '1px solid var(--color-pg-border)', paddingBottom: '16px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: 'var(--color-pg-text)' }}>
                            {isId ? 'Pengaturan Branding & Identitas Klien' : 'Client Company Branding & Identity'}
                        </h2>
                        <p style={{ fontSize: '14px', color: 'var(--color-pg-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            {isId 
                                ? 'Sesuaikan nama perusahaan, unggah logo resmi pabrik untuk portal pekerja, dan pilih tema warna visual pabrik Anda.' 
                                : 'Customize your organization name, upload your factory logo for kiosk terminals, and set your active visual color scheme.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        {/* Section 1: Company Name */}
                        <div>
                            <label htmlFor="company_name" style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: 'var(--color-pg-text)',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                            }}>
                                {isId ? 'Nama Perusahaan / Klien' : 'Company / Client Name'}
                            </label>
                            <input
                                id="company_name"
                                type="text"
                                value={data.company_name}
                                onChange={e => setData('company_name', e.target.value)}
                                placeholder={isId ? 'Contoh: CV. Teknik Mandiri' : 'e.g. PT. Precision Gear Indonesia'}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: 'var(--color-pg-bg)',
                                    color: 'var(--color-pg-text)',
                                    border: '1px solid var(--color-pg-border)',
                                    borderRadius: '12px',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    outline: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                }}
                                onFocus={e => { e.target.style.borderColor = 'var(--color-pg-primary, #6366f1)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)'; }}
                                onBlur={e => { e.target.style.borderColor = 'var(--color-pg-border)'; e.target.style.boxShadow = 'none'; }}
                                required
                            />
                            {errors.company_name && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.company_name}</span>}
                        </div>

                        {/* Section 2: Logo Upload */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: 'var(--color-pg-text)',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                            }}>
                                {isId ? 'Logo Resmi Perusahaan (Opsional)' : 'Official Company Logo (Optional)'}
                            </label>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '20px',
                                padding: '20px',
                                background: 'var(--color-pg-bg)',
                                border: '2px dashed var(--color-pg-border)',
                                borderRadius: '16px',
                                transition: 'all 0.2s',
                            }}>
                                {previewLogo ? (
                                    <div style={{
                                        width: '100px',
                                        height: '70px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'var(--color-pg-surface)',
                                        borderRadius: '10px',
                                        padding: '6px',
                                        border: '1px solid var(--color-pg-border)',
                                        flexShrink: 0
                                    }}>
                                        <img src={previewLogo} alt="Logo Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                    </div>
                                ) : (
                                    <div style={{
                                        width: '100px',
                                        height: '70px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'var(--color-pg-surface)',
                                        borderRadius: '10px',
                                        color: 'var(--color-pg-text-muted)',
                                        fontSize: '12px',
                                        textAlign: 'center',
                                        border: '1px solid var(--color-pg-border)',
                                        flexShrink: 0
                                    }}>
                                        {isId ? 'Tanpa Logo' : 'No Logo'}
                                    </div>
                                )}

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                                        {isId ? 'Unggah File Gambar Logo' : 'Upload Logo Image File'}
                                    </div>
                                    <div style={{ color: 'var(--color-pg-text-muted)', fontSize: '12px', marginBottom: '12px' }}>
                                        {isId ? 'Format yang didukung: PNG, JPG, atau WEBP. Maksimal 2MB. Logo akan muncul di Portal Pekerja dan Dasbor.' : 'Supported formats: PNG, JPG, or WEBP. Max 2MB. Logo appears on Worker Kiosk and Dashboard.'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: 'var(--color-pg-primary, #6366f1)',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: 700,
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {isId ? 'Pilih Gambar...' : 'Choose Image...'}
                                        </button>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png, image/jpeg, image/webp"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                    {errors.logo && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', display: 'block' }}>{errors.logo}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Color Theme Selection */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: 'var(--color-pg-text)',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                            }}>
                                {isId ? 'Skema Tema Warna Visual Pabrik' : 'Factory Visual Color Scheme'}
                            </label>
                            <p style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginTop: 0, marginBottom: '16px' }}>
                                {isId ? 'Pilih skema warna agar sesuai dengan kepribadian dan gaya perusahaan Anda. Ini mengubah tampilan portal secara instan.' : 'Select a color scheme to match your brand personality. Changes apply immediately across all terminal screens.'}
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                                {THEMES.map(tItem => {
                                    const isSelected = data.theme === tItem.id;
                                    return (
                                        <div
                                            key={tItem.id}
                                            onClick={() => handleThemeSelect(tItem.id)}
                                            style={{
                                                background: tItem.bg,
                                                border: isSelected ? `2px solid ${tItem.color}` : '1px solid var(--color-pg-border)',
                                                borderRadius: '12px',
                                                padding: '14px',
                                                cursor: 'pointer',
                                                boxShadow: isSelected ? `0 0 16px ${tItem.color}66` : 'none',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                minHeight: '110px',
                                                position: 'relative'
                                            }}
                                            onMouseOver={e => { if (!isSelected) e.currentTarget.style.borderColor = tItem.color; }}
                                            onMouseOut={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--color-pg-border)'; }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    background: tItem.color,
                                                    boxShadow: `0 0 8px ${tItem.color}`
                                                }} />
                                                {isSelected && (
                                                    <span style={{ fontSize: '10px', fontWeight: 800, background: tItem.color, color: tItem.isLight ? '#000' : '#fff', padding: '2px 6px', borderRadius: '10px', textTransform: 'uppercase' }}>
                                                        {isId ? 'Aktif' : 'Active'}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '13px', color: tItem.isLight ? '#0f172a' : '#f8fafc', marginBottom: '4px' }}>
                                                    {tItem.name}
                                                </div>
                                                <div style={{ fontSize: '11px', color: tItem.isLight ? '#475569' : '#94a3b8', lineHeight: 1.3 }}>
                                                    {tItem.desc}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {errors.theme && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.theme}</span>}
                        </div>

                        {/* Submit Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid var(--color-pg-border)', paddingTop: '20px' }}>
                            <button
                                type="submit"
                                disabled={processing}
                                style={{
                                    padding: '12px 28px',
                                    background: processing ? 'var(--color-pg-border)' : 'linear-gradient(135deg, var(--color-pg-primary, #6366f1) 0%, var(--color-pg-primary-hover, #4f46e5) 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    cursor: processing ? 'not-allowed' : 'pointer',
                                    boxShadow: processing ? 'none' : '0 8px 20px rgba(99, 102, 241, 0.4)',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                onMouseOver={e => { if (!processing) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(99, 102, 241, 0.5)'; } }}
                                onMouseOut={e => { if (!processing) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.4)'; } }}
                            >
                                {processing ? (
                                    <>
                                        <span>{isId ? 'Menyimpan...' : 'Saving...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                            <polyline points="7 3 7 8 15 8"></polyline>
                                        </svg>
                                        <span>{isId ? 'Simpan Pengaturan Branding' : 'Save Branding Settings'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
