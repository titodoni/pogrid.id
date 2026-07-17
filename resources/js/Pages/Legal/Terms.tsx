import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';

const translations = {
    en: {
        title: "Terms of Service",
        subtitle: "Last updated: July 17, 2026",
        back_to_home: "Back to Home",
        table_of_contents: "Table of Contents",
        sections: [
            {
                title: "1. Acceptance of Terms",
                content: "By registering for and using the POgrid.id application, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, you must not access or use our services."
            },
            {
                title: "2. Account Registration & Tenant Security",
                content: "Tenants (factory owners or managers) are responsible for maintaining the confidentiality of their office accounts, employee rosters, and floor operator PIN codes. Any production updates logged via worker PINs are deemed authorized by the Tenant. POgrid.id is not liable for unauthorized logins or PIN breaches caused by internal sharing."
            },
            {
                title: "3. Service Scope & Real-Time Tracking",
                content: "POgrid.id provides real-time progress tracking, bottleneck analysis, and automated alerts for Purchase Orders (PO) and manufacturing projects. The services are provided 'as is' and 'as available.' We do not guarantee uninterrupted or error-free operations under unstable cellular network conditions on factory floors."
            },
            {
                title: "4. Liquidated Damages & Delay Penalties Disclaimer",
                content: "POgrid.id acts strictly as a visibility and tracking helper. Under no circumstances shall POgrid.id, its developers, or parent company be held liable for actual delay penalties (pinalti denda), project liquidated damages (denda keterlambatan), or cancelled Purchase Orders resulting from delays on your production floor. The final delivery and quality compliance remain the sole responsibility of the Tenant."
            },
            {
                title: "5. Data Ownership & Intellectual Property",
                content: "You retain all intellectual property rights and ownership over your uploaded POs, client databases, and item lists. POgrid.id retains all rights, titles, and interests in the software, algorithms, themes, and codebase of the application."
            },
            {
                title: "6. Service Termination & Data Deletion",
                content: "You may terminate your account at any time via Profile Settings. Upon termination, we will delete or anonymize all production data, operator logs, and client archives associated with your tenant within 30 business days, subject to regulatory storage compliance."
            },
            {
                title: "7. Governing Law & Dispute Resolution",
                content: "These Terms shall be governed by and construed in accordance with the laws of the Republic of Indonesia. Any disputes arising out of the use of this service shall be referred to the exclusive jurisdiction of the District Court of Jakarta."
            }
        ]
    },
    id: {
        title: "Syarat & Ketentuan Layanan",
        subtitle: "Terakhir diperbarui: 17 Juli 2026",
        back_to_home: "Kembali ke Beranda",
        table_of_contents: "Daftar Isi",
        sections: [
            {
                title: "1. Penerimaan Ketentuan",
                content: "Dengan mendaftar dan menggunakan aplikasi POgrid.id, Anda setuju untuk mematuhi dan terikat oleh Syarat & Ketentuan Layanan ini. Jika Anda tidak menyetujui ketentuan ini, Anda tidak diperkenankan mengakses atau menggunakan layanan kami."
            },
            {
                title: "2. Registrasi Akun & Keamanan Tenant",
                content: "Tenant (pemilik pabrik atau manajemen) bertanggung jawab penuh atas kerahasiaan akun kantor, daftar karyawan, dan kode PIN login operator lantai produksi. Setiap pembaruan progress yang dicatat melalui PIN pekerja dianggap sah dilakukan oleh Tenant. POgrid.id tidak bertanggung jawab atas kebocoran PIN atau akses tidak sah akibat kelalaian internal."
            },
            {
                title: "3. Cakupan Layanan & Pelacakan Real-Time",
                content: "POgrid.id menyediakan alat bantu pelacakan progres, analisis titik hambat (bottleneck), dan alert otomatis untuk Purchase Order (PO) dan proyek manufaktur. Layanan disediakan 'apa adanya'. Kami tidak menjamin operasi tanpa gangguan jika terdapat gangguan sinyal seluler di area pabrik Anda."
            },
            {
                title: "4. Pelepasan Tanggung Jawab Denda & Pinalti Keterlambatan",
                content: "POgrid.id murni berfungsi sebagai sistem monitoring dan pelacak visibilitas. POgrid.id beserta pengembangnya tidak dapat dituntut atau dimintai pertanggungjawaban atas denda pinalti (liquidated damages), denda keterlambatan proyek, atau pembatalan Purchase Order yang dialami Tenant akibat keterlambatan produksi. Ketepatan pengiriman akhir tetap menjadi tanggung jawab penuh Tenant."
            },
            {
                title: "5. Kepemilikan Data & Hak Kekayaan Intelektual",
                content: "Anda memegang hak milik penuh atas data PO, daftar klien, dan item barang yang diunggah. POgrid.id memegang hak cipta penuh atas software, algoritma penghitungan progress, tema visual, dan seluruh codebase aplikasi."
            },
            {
                title: "6. Pembatalan Layanan & Penghapusan Data",
                content: "Anda berhak menutup akun kapan saja melalui menu Pengaturan Profil. Setelah penutupan akun, kami akan menghapus atau melakukan anonimisasi seluruh data produksi, log operator, dan arsip klien yang terkait dengan tenant Anda dalam waktu 30 hari kerja."
            },
            {
                title: "7. Hukum yang Berlaku & Penyelesaian Sengketa",
                content: "Syarat & Ketentuan Layanan ini diatur dan ditafsirkan sesuai dengan hukum Republik Indonesia. Setiap perselisihan yang timbul dari penggunaan layanan ini akan diselesaikan secara eksklusif melalui Pengadilan Negeri Jakarta."
            }
        ]
    }
};

export default function Terms() {
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
