import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';

const translations = {
    en: {
        title: "Privacy Policy",
        subtitle: "Last updated: July 17, 2026",
        back_to_home: "Back to Home",
        table_of_contents: "Table of Contents",
        sections: [
            {
                title: "1. Information We Collect",
                content: "We collect two main categories of information: (a) Tenant metadata: corporate name, factory slug, employee rosters, and office admin emails. (b) Production telemetry: Purchase Order details, item progress increments, and operator trouble logs."
            },
            {
                title: "2. How We Use Data",
                content: "All collected data is used strictly to power your active tracking dashboard, compute weighted stage completions, trigger risk/delay alerts, and generate performance metrics. We do not sell or monetize your operational logs or client list data."
            },
            {
                title: "3. Multi-Tenant Data Protection",
                content: "We deploy strict row-level security (Tenant Scope) inside our databases. Each tenant's data is isolated programmatically. Floor operator updates via PIN can only retrieve or mutate items explicitly belonging to their designated Tenant scope."
            },
            {
                title: "4. Worker PIN & Authenticator Security",
                content: "Operator login PIN codes are encrypted and stored securely. Office passwords are hashed using bcrypt. Our support team cannot read your worker PIN codes; they can only trigger a reset request upon administrative approval."
            },
            {
                title: "5. Data Retention & Backups",
                content: "Your operational logs, KPI stats, and order records are retained as long as your tenant subscription is active. Daily database backups are encrypted and stored in secure cloud nodes with 14-day rotation periods."
            },
            {
                title: "6. Changes to this Policy",
                content: "We may update this Privacy Policy from time to time. When changes are made, we will update the 'Last updated' date at the top of this page. Continued use of POgrid.id constitutes acceptance of updated terms."
            }
        ]
    },
    id: {
        title: "Kebijakan Privasi",
        subtitle: "Terakhir diperbarui: 17 Juli 2026",
        back_to_home: "Kembali ke Beranda",
        table_of_contents: "Daftar Isi",
        sections: [
            {
                title: "1. Informasi yang Kami Kumpulkan",
                content: "Kami mengumpulkan dua kategori informasi utama: (a) Metadata Tenant: nama perusahaan, slug pabrik, daftar karyawan, dan email admin kantor. (b) Telemetri Produksi: Detail Purchase Order, progres penyelesaian item, dan laporan kendala operator."
            },
            {
                title: "2. Penggunaan Informasi Anda",
                content: "Semua data yang dikumpulkan digunakan murni untuk menampilkan dashboard pelacakan aktif Anda, menghitung persentase progress tahapan, mengirimkan alert keterlambatan, dan menyusun laporan matriks kinerja. Kami tidak menjual atau menyebarkan data operasional pabrik atau daftar klien Anda kepada pihak ketiga."
            },
            {
                title: "3. Keamanan & Isolasi Data Multi-Tenant",
                content: "Kami menerapkan skema row-level security (Tenant Scope) yang ketat pada database. Setiap data tenant terisolasi secara programatik. Input operator lantai melalui PIN hanya dapat mengakses data yang berada dalam cakupan tenant pabrik yang bersangkutan."
            },
            {
                title: "4. Kriptografi & Keamanan PIN Operator",
                content: "Kode PIN login operator dienkripsi dan disimpan secara aman. Password akun admin di-hash menggunakan algoritma Bcrypt. Tim dukungan kami tidak dapat melihat kode PIN operator Anda; kami hanya dapat melayani permohonan reset PIN atas persetujuan admin pabrik Anda."
            },
            {
                title: "5. Retensi & Backup Data",
                content: "Log operasional, KPI kinerja, dan data PO Anda akan disimpan selama masa langganan tenant Anda aktif. Backup database harian dienkripsi dan disimpan pada server cloud cadangan yang aman dengan siklus rotasi 14 hari."
            },
            {
                title: "6. Perubahan Kebijakan Ini",
                content: "Kami dapat memperbarui Kebijakan Privasi ini sewaktu-waktu. Jika ada perubahan material, kami akan memperbarui tanggal 'Terakhir diperbarui' di bagian atas halaman ini. Penggunaan berkelanjutan atas layanan kami dianggap sebagai persetujuan Anda."
            }
        ]
    }
};

export default function Privacy() {
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

    return (
        <div style={{
            backgroundColor: 'var(--color-pg-bg, #f4fff8)',
            color: 'var(--color-pg-text, #000f08)',
            minHeight: '100vh',
            fontFamily: 'Inter, sans-serif',
            padding: '24px 16px',
            boxSizing: 'border-box',
        }}>
            <Head title={`POgrid.id — ${t.title}`} />

            {/* Header Area */}
            <header style={{
                maxWidth: '1000px',
                margin: '0 auto 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--color-pg-border, rgba(0,0,0,0.08))',
                paddingBottom: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/" style={{ textDecoration: 'none' }}>
                        <img src="/pogrid-logo.png" alt="POgrid.id Logo" style={{ height: '48px', width: 'auto' }} />
                    </Link>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Language Switcher */}
                    <div style={{
                        display: 'inline-flex',
                        borderRadius: '8px',
                        border: '1px solid var(--color-pg-border, rgba(0,0,0,0.08))',
                        backgroundColor: 'var(--color-pg-surface, #ffffff)',
                        padding: '2px',
                    }}>
                        <button
                            onClick={() => changeLanguage('en')}
                            style={{
                                padding: '4px 10px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: 600,
                                backgroundColor: language === 'en' ? 'var(--color-pg-primary, #1c3738)' : 'transparent',
                                color: language === 'en' ? 'var(--color-pg-primary-ink, #f4fff8)' : 'var(--color-pg-text-secondary, #4d4847)',
                            }}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => changeLanguage('id')}
                            style={{
                                padding: '4px 10px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: 600,
                                backgroundColor: language === 'id' ? 'var(--color-pg-primary, #1c3738)' : 'transparent',
                                color: language === 'id' ? 'var(--color-pg-primary-ink, #f4fff8)' : 'var(--color-pg-text-secondary, #4d4847)',
                            }}
                        >
                            ID
                        </button>
                    </div>

                    <Link href="/" style={{
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-pg-primary-hover, #254748)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-pg-border, rgba(0,0,0,0.08))',
                        backgroundColor: 'var(--color-pg-surface, #ffffff)',
                    }}>
                        {t.back_to_home}
                    </Link>
                </div>
            </header>

            {/* Content Body */}
            <main style={{
                maxWidth: '1000px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '32px',
                alignItems: 'start',
            }}>
                {/* Side Navigation / Table of Contents */}
                <aside style={{
                    backgroundColor: 'var(--color-pg-surface, #ffffff)',
                    border: '1px solid var(--color-pg-border, rgba(0,0,0,0.08))',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    position: 'sticky',
                    top: '24px',
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: 'var(--color-pg-text-secondary, #4d4847)' }}>
                        {t.table_of_contents}
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {t.sections.map((sec, i) => (
                            <li key={i}>
                                <a href={`#section-${i}`} style={{
                                    textDecoration: 'none',
                                    fontSize: '13.5px',
                                    fontWeight: 600,
                                    color: 'var(--color-pg-primary-hover, #254748)',
                                    lineHeight: '1.4',
                                }}>
                                    {sec.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </aside>

                {/* Main Legal Copy */}
                <section style={{
                    backgroundColor: 'var(--color-pg-surface, #ffffff)',
                    border: '1px solid var(--color-pg-border, rgba(0,0,0,0.08))',
                    borderRadius: '16px',
                    padding: '36px 28px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    gridColumn: 'span 2',
                }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>{t.title}</h1>
                    <p style={{ fontSize: '13px', color: 'var(--color-pg-text-muted, #687d7b)', margin: '0 0 32px 0' }}>{t.subtitle}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        {t.sections.map((sec, i) => (
                            <div key={i} id={`section-${i}`} style={{ borderBottom: i < t.sections.length - 1 ? '1px solid var(--color-pg-border-subtle, rgba(0,0,0,0.04))' : 'none', paddingBottom: '20px' }}>
                                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--color-pg-text, #000f08)' }}>
                                    {sec.title}
                                </h2>
                                <p style={{ fontSize: '14.5px', lineHeight: '1.65', color: 'var(--color-pg-text-secondary, #4d4847)', margin: 0 }}>
                                    {sec.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
