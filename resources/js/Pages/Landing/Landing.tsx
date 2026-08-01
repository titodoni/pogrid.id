import React, { useState, useEffect } from 'react';
import { Link, Head } from '@inertiajs/react';

function appUrl(path: string): string {
    if (typeof window === 'undefined') return path;
    const search = window.location.search || '';
    if (window.location.hostname.endsWith('pogrid.id') || window.location.hostname.endsWith('www.pogrid.id')) {
        return `https://app.pogrid.id${path}${search}`;
    }
    return `${path}${search}`;
}

const WA_DEMO_URL = 'https://wa.me/628151678101?text=Halo%20saya%20berminat%20dengan%20POgrid..';

const id = {
    brand: 'POgrid.id',
    nav_product: 'Fitur',
    nav_how: 'Cara Kerja',
    nav_price: 'Harga',
    nav_faq: 'FAQ',
    nav_demo: 'Minta Demo',
    login: 'Masuk',
    cta: 'Daftar Gratis',

    // Hero
    eyebrow: 'Sistem Pelacakan PO & Kontrol Produksi Pabrik #1 di Indonesia',
    hero_title: 'Stop Kejar-Kejar Tim PPIC. Pantau Progress PO Pabrik Real-Time.',
    hero_sub: 'Operator input progres pengerjaan lewat HP pakai PIN 4 digit. Owner pantau mana PO yang Aman, Rawan, atau Bakal Kena Pinalti Telat Kirim.',
    hero_cta_primary: 'Coba Gratis 30 Hari',
    hero_cta_demo: 'Minta Demo',
    hero_cta_secondary: 'Lihat Cara Kerja',
    hero_note: '✓ Tanpa kartu kredit  ✓ Tanpa instalasi app  ✓ Setup kurang dari 5 menit',
    hero_stat_1: '100%',
    hero_stat_1_label: 'Visibilitas progress real-time',
    hero_stat_2: '3 Menit',
    hero_stat_2_label: 'Setup pabrik & PO pertama',
    hero_stat_3: 'Nol',
    hero_stat_3_label: 'Instalasi aplikasi (cukup browser)',

    // Pain
    pain_title: 'Masalah Klasik di Bengkel & Lantai Produksi yang Bikin Pusing Owner',
    pain_sub: 'Setiap pemilik pabrik & tim purchasing di Indonesia pasti akrab dengan masalah ini:',
    pain_items: [
        { q: '1. "Pak, barang saya urutan berapa? Kok belum dikirim?"', a: 'Setiap sore HP Anda berdering dikomplain pemesan/klien. Anda bingung menjawab karena data di lantai produksi masih tebak-tebakan.' },
        { q: '2. Tahu-tahu Telat di Hari-H Kirim & Kena Denda Pinalti', a: 'Tidak ada warning dari awal. Keterlambatan baru ketahuan saat armada siap muat, berujung pinalti denda atau pembatalan order.' },
        { q: '3. Progres Pengerjaan Cuma Dicatat di Kertas Lecek & Papan Tulis', a: 'Surat jalan/SPK lecek, hilang, atau operator lupa update. Owner kesulitan memantau progress riil di lapangan.' },
        { q: '4. Menjanjikan Estimasi Kirim Cuma Berdasarkan "Firasat"', a: 'Tanpa data real-time tiap tahapan (potong, bubut, CNC, welding, QC), Anda berisiko salah janji tanggal cair/kirim ke pelanggan.' },
    ],
    pain_solution: 'POgrid.id hadir untuk satu tujuan: menghilangkan kecemasan owner soal status pengerjaan PO dan memastikan pengiriman tepat waktu bebas denda pinalti.',

    // How it works
    how_title: '3 Langkah Simpel: Operator Update dari HP, Owner Terima Beres',
    how_sub: 'Tidak perlu mengajari operator komputer rumit. Cukup 3 klik dari HP di meja kerja.',
    steps: [
        { n: '1', title: 'Operator Input Progres Pakai PIN (3 Detik)', desc: 'Tanpa email atau password. Operator di meja kerja (CNC, Bubut, Las, QC) cukup pilih nama, ketik PIN 4 digit, dan masukkan unit selesai.' },
        { n: '2', title: 'Sistem Kalkulasi Progres & Sisa Waktu Otomatis', desc: 'POgrid otomatis menghitung persentase progress lintas tahapan (Drafter → Machining → Assembly → QC → Delivery) secara real-time.' },
        { n: '3', title: 'Owner Pantau Status & Dapatkan Alert Lampu Kuning/Merah', desc: 'Buka dashboard dari laptop atau HP. Dapatkan peringatan dini sebelum PO melewati tenggat pengiriman.' },
    ],
    how_outcome: 'Hasilnya: Anda tahu persis order PO mana yang Aman, Rawan, atau Delayed, lengkap dengan estimasi jadwal kirim.',

    // Features
    feat_title: 'Fitur Utama Kontrol Produksi',
    feat_sub: 'Pantau status PO dengan cepat & akurat, tanpa ribetnya sistem ERP.',
    features: [
        { t: 'Live Dashboard Status PO', d: 'Sekali lirik dari HP/laptop, langsung paham mana order yang On-Time, Macet di QC, atau Mendekati Deadline.' },
        { t: 'Login PIN Operator (Bebas Email)', d: 'Operator lantai produksi tidak butuh email. Cukup 4 digit PIN seperti ATM, dijamin cepat & anti-ribet.' },
        { t: 'Sistem Alert Pinalti Keterlambatan', d: 'Peringatan otomatis untuk item PO yang berjalan lambat di salah satu tahapan sebelum terlambat dikirim.' },
        { t: 'Mode Presentasi / Layar TV Pabrik', d: 'Tampilkan grafik & status PO di TV lantai produksi atau ruang rapat untuk dorong keterbukaan tim.' },
        { t: 'Bukan ERP Rumit, Tanpa Kontrak Berbulan-bulan', d: 'Tidak perlu bayar konsultan mahal atau setup berbulan-bulan. Cepat dikonfigurasi dan langsung dipakai hari ini.' },
        { t: 'Multi-Tenant Terisolasi & Aman', d: 'Data order, nama klien, dan kerahasiaan proses pengerjaan pabrik Anda terjamin terisolasi penuh.' },
    ],

    // Social proof
    proof_title: 'Dirancang Khusus untuk Berbagai Sektor Manufaktur Indonesia',
    proof_sub: 'CNC · Fabrikasi · Machining · Perakitan · Stamping · Karoseri · Manufaktur Umum',
    proof_items: [
        { t: 'Pabrik CNC & Machining', d: 'Lacak alur pengerjaan part spesifik: Drafter → Turning/Milling → CNC Router → QC Dimension → Kirim.' },
        { t: 'Workshop Fabrikasi & Sheet Metal', d: 'Pantau progress Cutting/Laser → Bending → Welding → Coating → Assembly hingga pengiriman.' },
        { t: 'Perakitan, Stamping & Moulding', d: 'Hilangkan bottleneck produksi dan pastikan stok part siap rakit tepat waktu bebas keterlambatan.' },
    ],
    proof_quote: '“Dulu tiap jam 4 sore saya harus keliling bengkel nanya satu-satu barang mana yang sudah selesai QC. Sekarang sambil luar kota pun saya tahu persis PO mana yang siap jalan armada kirimnya.”',
    proof_quote_by: '— Pak Hendra, Owner Workshop Fabrikasi & Machining, Cikarang',

    // Pricing
    price_title: 'Mulai Lacak Order PO Pabrik Anda Hari Ini',
    price_sub: 'Gratis 30 hari untuk pabrik baru. Tanpa kartu kredit.',
    price_feature_label: 'Semua paket sudah termasuk akses penuh:',
    price_features: [
        'Dashboard owner real-time & Presentation Mode (TV Pabrik)',
        'Update progress via HP operator (Login PIN 4 digit)',
        'Alert delayed otomatis & ringkasan status harian',
        'Akses instan dari browser HP/Laptop, tanpa instalasi',
        'Tampilan simpel & 100% cocok untuk operator lapangan',
    ],
    price_cta: 'Coba Gratis 30 Hari Sekarang',

    // FAQ
    faq_title: 'Tanya Jawab (FAQ)',
    faqs: [
        { q: 'Apakah ini software ERP atau akuntansi pabrik?', a: 'Bukan. POgrid.id fokus 100% pada pelacakan progress Purchase Order dan ketepatan pengiriman (On-Time Delivery). Kami sengaja tidak membebani Anda dengan modul akuntansi atau stok bahan baku yang rumit agar sistem bisa langsung dipakai hari ini.' },
        { q: 'Gimana kalau operator saya kurang paham teknologi / gaptek?', a: 'Sangat bisa. Operator tidak perlu mengetik huruf sama sekali. Cukup pilih nama mereka, ketik PIN 4 digit, lalu masukkan angka unit selesai. Diuji bisa dipakai operator dalam 1 menit pelatihan.' },
        { q: 'Apakah harus install aplikasi tertentu di HP?', a: 'Tidak perlu. Cukup buka link via browser (Chrome/Safari) di HP atau laptop apa saja. Data tersimpan aman di cloud dan terupdate real-time.' },
        { q: 'Berapa lama waktu setup sampai bisa buat PO?', a: 'Sangat cepat. Kurang dari 3 menit. Begitu selesai registrasi, Anda bisa langsung mengatur tahapan pengerjaan pabrik dan membuat PO pertama.' },
        { q: 'Apakah bahasanya Indonesia?', a: 'Ya, 100% menggunakan Bahasa Indonesia alami yang akrab dengan istilah lantai produksi lokal (seperti PO, Rework, Milling, CNC, Progress, Delayed, Pinalti).' },
        { q: 'Apakah data pabrik kami aman?', a: 'Terjamin aman. Data setiap perusahaan dipisahkan secara ketat menggunakan Row-Level Security, sehingga tidak akan bercampur atau diakses oleh pihak luar.' },
    ],

    // Final CTA
    final_title: 'Pantau langsung, tanpa tebak-tebakan.',
    final_sub: 'Daftarkan pabrik Anda sekarang dan buat PO pertama dalam 3 menit.',
    final_cta: 'Coba Gratis 30 Hari',

    footer_tag: 'Real-time PO tracking & kontrol produksi untuk pabrik manufaktur & procurement Indonesia.',
    footer_product: 'Produk',
    footer_company: 'Perusahaan',
    footer_links_product: ['Fitur', 'Cara Kerja', 'Harga', 'FAQ'],
    footer_links_company: ['Masuk', 'Daftar', 'Bantuan'],
};

const MarkerUnderline: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = '#ef4444' }) => (
    <span style={{ position: 'relative', display: 'inline-block', zIndex: 1 }}>
        {children}
        <span style={{
            position: 'absolute',
            left: '-2px',
            right: '-2px',
            bottom: '-2px',
            height: '4px',
            backgroundColor: color,
            borderRadius: '2px',
            zIndex: -1,
            transform: 'skewX(-12deg) rotate(-0.5deg)',
            opacity: 0.85,
        }} />
    </span>
);

const Check: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const ArrowRight: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const PlayCircle: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
);

const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
);

const StarRow: React.FC = () => (
    <div style={{ display: 'flex', gap: '2px', color: '#f59e0b', justifyContent: 'center' }}>
        {[0,1,2,3,4].map(i => (
            <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
        ))}
    </div>
);

export default function Landing() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const t = id;

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 40) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#09090b',
            color: '#fafafa',
            fontFamily: 'var(--font-sans)',
            WebkitFontSmoothing: 'antialiased',
        }}>
            <Head>
                {/* Primary Title & Meta */}
                <title>POgrid.id — Sistem Pelacakan PO & Kontrol Produksi Pabrik Real-Time</title>
                <meta name="title" content="POgrid.id — Sistem Pelacakan PO & Kontrol Produksi Pabrik Real-Time" />
                <meta name="description" content="Stop kejar-kejar Tim PPIC. Pantau progress Purchase Order pabrik CNC, fabrikasi, dan machining dari HP secara real-time. Bebas denda keterlambatan kirim. Coba gratis 30 hari." />
                <meta name="keywords" content="sistem pelacakan PO pabrik, software kontrol produksi, tracking progress workshop CNC, aplikasi fabrikasi logam, manajemen purchase order manufaktur, POgrid Indonesia" />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://pogrid.id/" />

                {/* Open Graph / Facebook / WhatsApp Preview */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://pogrid.id/" />
                <meta property="og:title" content="POgrid.id — Pantau Progress PO Pabrik Langsung dari HP (Real-Time)" />
                <meta property="og:description" content="Operator update via HP pakai PIN 4 digit, Owner pantau status order aman/delay di dashboard. Tanpa ribet instalasi ERP." />
                <meta property="og:image" content="https://pogrid.id/pogrid-logo.png" />

                {/* Twitter Cards */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:url" content="https://pogrid.id/" />
                <meta name="twitter:title" content="POgrid.id — Sistem Kontrol Produksi Pabrik Indonesia" />
                <meta name="twitter:description" content="Lacak status pengerjaan barang & tenggat kirim PO pabrik Anda tanpa perlu telepon berulang kali ke lantai produksi." />
                <meta name="twitter:image" content="https://pogrid.id/pogrid-logo.png" />

                {/* JSON-LD Schema.org Structured Data */}
                <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "SoftwareApplication",
                    "name": "POgrid.id",
                    "operatingSystem": "Web Browser",
                    "applicationCategory": "BusinessApplication",
                    "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "IDR",
                        "description": "Gratis uji coba 30 hari"
                    },
                    "description": "Sistem pelacakan progress Purchase Order (PO) dan kontrol ketepatan pengiriman khusus pabrik manufaktur, workshop CNC, dan fabrikasi di Indonesia."
                })}
                </script>
            </Head>

            {/* ===== NAV ===== */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                backdropFilter: 'blur(12px)',
                backgroundColor: 'rgba(9, 9, 11, 0.85)',
                borderBottom: scrolled ? '1px solid #1f1f23' : '1px solid transparent',
                boxShadow: scrolled ? '0 8px 30px rgba(0, 0, 0, 0.5)' : 'none',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease',
            }}>
                <div style={{
                    maxWidth: '1120px',
                    margin: '0 auto',
                    padding: scrolled ? '8px 20px' : '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'padding 0.3s ease',
                }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                        <img src="/pogrid-logo.png" alt="POgrid.id Logo" style={{ height: scrolled ? '54px' : '66px', width: 'auto', transition: 'height 0.3s ease', objectFit: 'contain' }} />
                    </Link>

                    <nav style={{ display: 'none', alignItems: 'center', gap: '26px' }} className="pg-nav-desktop">
                        <a href="#fitur" style={navLink}>{t.nav_product}</a>
                        <a href="#cara" style={navLink}>{t.nav_how}</a>
                        <a href="#harga" style={navLink}>{t.nav_price}</a>
                        <a href="#faq" style={navLink}>{t.nav_faq}</a>
                    </nav>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <a href={WA_DEMO_URL} target="_blank" rel="noopener noreferrer" style={{
                            backgroundColor: 'transparent',
                            color: '#10b981',
                            border: '1px solid #10b981',
                            fontWeight: 600,
                            fontSize: '14px',
                            padding: '9px 15px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            display: 'none',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                        }}
                        className="pg-nav-desktop"
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#10b981';
                            e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#10b981';
                        }}
                        >
                            <WhatsAppIcon size={16} /> {t.nav_demo}
                        </a>
                        <a href={appUrl('/login')} style={{ ...navLink, display: 'none' }} className="pg-nav-desktop">{t.login}</a>
                        <a href={appUrl('/register')} style={{
                            backgroundColor: '#6366f1',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '14px',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#818cf8'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
                        >
                            {t.cta}
                            <ArrowRight size={15} />
                        </a>
                    </div>
                </div>
            </header>

            {/* ===== HERO ===== */}
            <section style={{
                position: 'relative',
                maxWidth: '1120px',
                margin: '0 auto',
                padding: '48px 16px 40px',
                overflow: 'hidden',
                boxSizing: 'border-box',
            }}>
                <div className="hero-grid" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '100%', minWidth: 0 }}>
                    {/* Hero Left Column (Copy) */}
                    <div style={{ textAlign: 'left', width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden', wordBreak: 'break-word' as const }}>
                        <span style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#818cf8',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            padding: '6px 12px',
                            borderRadius: '999px',
                            marginBottom: '16px',
                            maxWidth: '100%',
                            whiteSpace: 'normal' as const,
                            lineHeight: 1.4,
                        }}>{t.eyebrow}</span>

                        <h1 style={{
                            fontSize: 'clamp(24px, 6vw, 48px)',
                            lineHeight: 1.15,
                            fontWeight: 800,
                            letterSpacing: '-0.03em',
                            margin: '0 0 16px',
                            color: '#ffffff',
                            wordBreak: 'break-word' as const,
                            overflowWrap: 'break-word' as const,
                        }}>
                            {t.hero_title}
                        </h1>

                        <p style={{
                            fontSize: 'clamp(14px, 2vw, 17px)',
                            lineHeight: 1.6,
                            color: '#94a3b8',
                            margin: '0 0 24px',
                            maxWidth: '100%',
                            wordBreak: 'break-word' as const,
                        }}>
                            Operator input progres pengerjaan lewat HP pakai <span style={{ color: '#f0f4f8', fontWeight: 700 }}>PIN 4 digit</span>. Owner pantau mana PO yang <span style={{ color: '#10b981', fontWeight: 700 }}>Aman</span>, <span style={{ color: '#f59e0b', fontWeight: 700 }}>Rawan</span>, atau bakal <MarkerUnderline>Kena Pinalti Telat Kirim</MarkerUnderline>.
                        </p>

                        <div className="btn-responsive-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxWidth: '100%' }}>
                            <a href={appUrl('/register')} style={{
                                backgroundColor: '#6366f1',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '15px',
                                padding: '14px 24px',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                                transition: 'background-color 0.15s ease',
                                boxSizing: 'border-box' as const,
                                width: '100%',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#818cf8'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
                            >
                                {t.hero_cta_primary}
                                <ArrowRight size={17} />
                            </a>
                            <a href={WA_DEMO_URL} target="_blank" rel="noopener noreferrer" style={{
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '15px',
                                padding: '14px 24px',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                                transition: 'background-color 0.15s ease',
                                boxSizing: 'border-box' as const,
                                width: '100%',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                            >
                                <WhatsAppIcon size={18} />
                                {t.hero_cta_demo}
                            </a>
                            <a href="#cara" style={{
                                backgroundColor: 'transparent',
                                color: '#f0f4f8',
                                border: '1px solid #f0f4f8',
                                fontWeight: 600,
                                fontSize: '15px',
                                padding: '14px 20px',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'background-color 0.2s, color 0.2s',
                                boxSizing: 'border-box' as const,
                                width: '100%',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            >
                                <PlayCircle size={17} />
                                {t.hero_cta_secondary}
                            </a>
                        </div>

                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5, wordBreak: 'break-word' as const }}>{t.hero_note}</p>

                        {/* Centered Stats in left column or bottom */}
                        <div className="hero-stats-grid" style={{
                            display: 'grid',
                            gap: '10px',
                            width: '100%',
                            minWidth: 0,
                            maxWidth: '560px',
                        }}>
                            {[
                                { v: t.hero_stat_1, l: t.hero_stat_1_label },
                                { v: t.hero_stat_2, l: t.hero_stat_2_label },
                                { v: t.hero_stat_3, l: t.hero_stat_3_label },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    backgroundColor: '#18181b',
                                    border: '1px solid #27272a',
                                    borderRadius: '12px',
                                    padding: '16px 14px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                }}>
                                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#818cf8', letterSpacing: '-0.02em' }}>{s.v}</div>
                                    <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px', lineHeight: 1.35 }}>{s.l}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hero Right Column (True Smartphone UI Mockup) */}
                    <div className="hero-visual">
                        <div className="phone-mock">
                            {/* iPhone Dynamic Island / Notch */}
                            <div className="phone-notch">
                                <span className="notch-camera"></span>
                            </div>

                            {/* Mobile Screen */}
                            <div className="phone-body">
                                {/* Status Bar */}
                                <div className="phone-status-bar">
                                    <span className="status-time">09:41</span>
                                    <div className="status-icons">
                                        <svg width="12" height="10" viewBox="0 0 16 12" fill="currentColor">
                                            <rect x="0" y="8" width="3" height="4" rx="0.5" />
                                            <rect x="4" y="6" width="3" height="6" rx="0.5" />
                                            <rect x="8" y="3" width="3" height="9" rx="0.5" />
                                            <rect x="12" y="0" width="3" height="12" rx="0.5" />
                                        </svg>
                                        <span className="status-wifi">📶</span>
                                        <div className="status-battery">
                                            <div className="battery-level"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* App Header */}
                                <div className="phone-app-header">
                                    <div>
                                        <span className="app-po-code">PO-2026-089</span>
                                        <div className="app-client-name">PT Astra Otoparts</div>
                                    </div>
                                    <span className="app-badge-live">🟢 On Track</span>
                                </div>

                                {/* Stage Progress List */}
                                <div className="phone-stages-list">
                                    <div className="stage-item">
                                        <div className="stage-header">
                                            <span className="stage-name">1. Milling & Turning</span>
                                            <span className="stage-pct ok">100%</span>
                                        </div>
                                        <div className="phone-progress-bg">
                                            <div className="phone-progress-fill" style={{ width: '100%', backgroundColor: '#10b981' }}></div>
                                        </div>
                                        <span className="stage-status-label green">✓ Completed</span>
                                    </div>

                                    <div className="stage-item">
                                        <div className="stage-header">
                                            <span className="stage-name">2. CNC Router</span>
                                            <span className="stage-pct ok">95%</span>
                                        </div>
                                        <div className="phone-progress-bg">
                                            <div className="phone-progress-fill" style={{ width: '95%', backgroundColor: '#10b981' }}></div>
                                        </div>
                                        <span className="stage-status-label green">✓ Completed</span>
                                    </div>

                                    <div className="stage-item active">
                                        <div className="stage-header">
                                            <span className="stage-name">3. QC Inspection</span>
                                            <span className="stage-pct warn">50%</span>
                                        </div>
                                        <div className="phone-progress-bg">
                                            <div className="phone-progress-fill" style={{ width: '50%', backgroundColor: '#f59e0b' }}></div>
                                        </div>
                                        <span className="stage-status-label amber">⚡ In Progress</span>
                                    </div>

                                    <div className="stage-item">
                                        <div className="stage-header">
                                            <span className="stage-name">4. Delivery / Kirim</span>
                                            <span className="stage-pct muted">0%</span>
                                        </div>
                                        <div className="phone-progress-bg">
                                            <div className="phone-progress-fill" style={{ width: '0%', backgroundColor: '#64748b' }}></div>
                                        </div>
                                        <span className="stage-status-label gray">Pending</span>
                                    </div>
                                </div>

                                {/* Recent Activity Feed */}
                                <div className="phone-activity-box">
                                    <div className="activity-title">Aktivitas Terakhir:</div>
                                    <div className="activity-row">
                                        <span className="activity-dot green"></span>
                                        <span>QC Station checked — OK: 48, NG: 2</span>
                                    </div>
                                </div>

                                {/* Quick Action Button */}
                                <button className="phone-action-btn">
                                    Update Progress (PIN 4 Digit)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== PAIN ===== */}
             <section style={{ maxWidth: '1120px', margin: '0 auto', padding: '40px 20px' }}>
                 <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                     <h2 style={h2}>{t.pain_title}</h2>
                     <p style={sub}>{t.pain_sub}</p>
                 </div>
                 <div style={{
                     display: 'grid',
                     gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                     gap: '16px',
                     width: '100%',
                     minWidth: 0,
                 }}>
                     {t.pain_items.map((p, i) => (
                         <div key={i} style={{
                             backgroundColor: 'rgba(255,255,255,0.04)',
                             border: '1px solid rgba(255,255,255,0.08)',
                             borderLeft: '4px solid #ef4444',
                             borderRadius: '16px',
                             padding: '22px',
                             boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                         }}>
                             <p style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.4, margin: '0 0 10px', color: '#f0f4f8' }}>{p.q}</p>
                             <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>{p.a}</p>
                         </div>
                     ))}
                 </div>
                 <div style={{
                     marginTop: '28px',
                     backgroundColor: '#18181b',
                     border: '1px solid #27272a',
                     borderRadius: '12px',
                     padding: '20px 24px',
                     textAlign: 'center',
                 }}>
                     <p style={{ fontSize: '16px', fontWeight: 600, color: '#818cf8', margin: 0, lineHeight: 1.5 }}>{t.pain_solution}</p>
                 </div>
             </section>

            {/* ===== HOW IT WORKS ===== */}
             <section id="cara" style={{ maxWidth: '1120px', margin: '0 auto', padding: '56px 20px' }}>
                 <div style={{ textAlign: 'center', marginBottom: '44px' }}>
                     <h2 style={h2}>{t.how_title}</h2>
                     <p style={sub}>{t.how_sub}</p>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', position: 'relative', width: '100%', minWidth: 0 }}>
                     {t.steps.map((s, i) => (
                         <div key={i} style={{
                             position: 'relative',
                             backgroundColor: '#18181b',
                             border: '1px solid #27272a',
                             borderRadius: '18px',
                             padding: '28px 24px',
                             boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                         }}>
                             <div style={{
                                 width: '44px', height: '44px', borderRadius: '12px',
                                 background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                 color: '#ffffff', fontWeight: 800, fontSize: '20px',
                                 display: 'grid', placeItems: 'center', marginBottom: '18px',
                                 boxShadow: '0 6px 16px rgba(99, 102, 241, 0.3)',
                             }}>{s.n}</div>
                             <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#fafafa' }}>{s.title}</h3>
                             <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                         </div>
                     ))}
                 </div>
                 <div style={{ textAlign: 'center', marginTop: '30px' }}>
                     <p style={{ fontSize: '15px', color: '#818cf8', fontWeight: 600, margin: 0 }}>{t.how_outcome}</p>
                 </div>
             </section>

            {/* ===== FEATURES ===== */}
             <section id="fitur" style={{ maxWidth: '1120px', margin: '0 auto', padding: '40px 20px' }}>
                 <div style={{ textAlign: 'center', marginBottom: '44px' }}>
                     <h2 style={h2}>{t.feat_title}</h2>
                     <p style={sub}>{t.feat_sub}</p>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', width: '100%', minWidth: 0 }}>
                     {t.features.map((f, i) => (
                         <div key={i} style={{
                             backgroundColor: 'rgba(255,255,255,0.04)',
                             border: '1px solid rgba(255,255,255,0.08)',
                             borderRadius: '16px',
                             padding: '22px',
                             display: 'flex',
                             gap: '14px',
                             alignItems: 'flex-start',
                             boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                         }}>
                             <span style={{
                                 flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px',
                                 backgroundColor: 'rgba(99, 102, 241, 0.12)',
                                 color: '#818cf8',
                                 display: 'grid', placeItems: 'center',
                             }}><Check size={18} /></span>
                             <div>
                                 <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '2px 0 6px', color: '#f0f4f8' }}>{f.t}</h3>
                                 <p style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>{f.d}</p>
                             </div>
                         </div>
                     ))}
                 </div>
             </section>

            {/* ===== SOCIAL PROOF ===== */}
             <section style={{ maxWidth: '1120px', margin: '0 auto', padding: '40px 20px' }}>
                 <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                     <h2 style={h2}>{t.proof_title}</h2>
                     <p style={sub}>{t.proof_sub}</p>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px', width: '100%', minWidth: 0 }}>
                     {t.proof_items.map((p, i) => (
                         <div key={i} style={{
                             backgroundColor: '#18181b',
                             border: '1px solid #27272a',
                             borderRadius: '16px',
                             padding: '24px',
                             boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                         }}>
                             <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: '#818cf8' }}>{p.t}</h3>
                             <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.55, margin: 0 }}>{p.d}</p>
                         </div>
                     ))}
                 </div>
                 <div style={{
                     backgroundColor: '#18181b',
                     border: '1px solid #27272a',
                     borderRadius: '16px',
                     padding: '28px',
                     textAlign: 'center',
                     maxWidth: '760px',
                     margin: '0 auto',
                     boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                 }}>
                     <StarRow />
                     <p style={{ fontSize: '17px', fontWeight: 600, lineHeight: 1.6, margin: '14px 0 10px', color: '#f0f4f8' }}>{t.proof_quote}</p>
                     <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{t.proof_quote_by}</p>
                 </div>
             </section>

            {/* ===== PRICING ===== */}
             <section id="harga" style={{ maxWidth: '1120px', margin: '0 auto', padding: '56px 20px' }}>
                 <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                     <h2 style={h2}>{t.price_title}</h2>
                     <p style={sub}>{t.price_sub}</p>
                 </div>
                 <div style={{
                     maxWidth: '520px', margin: '0 auto',
                     backgroundColor: '#18181b',
                     border: '1px solid #27272a',
                     borderRadius: '16px',
                     padding: '32px 28px',
                     boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                 }}>
                     <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                         <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em', color: '#fafafa' }}>Gratis</span>
                         <span style={{ fontSize: '15px', color: '#a1a1aa' }}>30 hari</span>
                     </div>
                     <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 22px' }}>{t.price_feature_label}</p>
                     <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                         {t.price_features.map((f, i) => (
                             <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', color: '#fafafa' }}>
                                 <span style={{ color: '#818cf8', display: 'grid', placeItems: 'center' }}><Check size={17} /></span>
                                 {f}
                             </li>
                         ))}
                     </ul>
                     <a href={appUrl('/register')} style={{
                         display: 'flex', width: '100%', justifyContent: 'center',
                         backgroundColor: '#6366f1',
                         color: '#ffffff', fontWeight: 700, fontSize: '16px',
                         padding: '15px', borderRadius: '12px', textDecoration: 'none',
                         alignItems: 'center', gap: '8px',
                         boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
                         transition: 'background-color 0.2s',
                     }}
                     onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#818cf8'}
                     onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
                     >
                         {t.price_cta}
                         <ArrowRight size={18} />
                     </a>
                 </div>
             </section>

            {/* ===== FAQ ===== */}
             <section id="faq" style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 20px' }}>
                 <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                     <h2 style={h2}>{t.faq_title}</h2>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                     {t.faqs.map((f, i) => {
                         const open = openFaq === i;
                         return (
                             <div key={i} style={{
                                 backgroundColor: 'rgba(255,255,255,0.04)',
                                 border: '1px solid rgba(255,255,255,0.08)',
                                 borderRadius: '14px',
                                 overflow: 'hidden',
                                 boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                             }}>
                                 <button
                                     type="button"
                                     onClick={() => setOpenFaq(open ? null : i)}
                                     style={{
                                         width: '100%',
                                         textAlign: 'left',
                                         background: 'transparent',
                                         border: 'none',
                                         cursor: 'pointer',
                                         padding: '18px 20px',
                                         display: 'flex',
                                         justifyContent: 'space-between',
                                         alignItems: 'center',
                                         gap: '12px',
                                         color: '#f0f4f8',
                                         fontSize: '15px',
                                         fontWeight: 600,
                                         fontFamily: 'inherit',
                                     }}
                                 >
                                     {f.q}
                                     <span style={{
                                         color: '#10b981',
                                         transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                                         transition: 'transform 0.2s',
                                         flexShrink: 0,
                                     }}><ChevronDownIcon /></span>
                                 </button>
                                 {open && (
                                     <div style={{ padding: '0 20px 18px', fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
                                         {f.a}
                                     </div>
                                 )}
                             </div>
                         );
                     })}
                 </div>
             </section>

            {/* ===== FINAL CTA ===== */}
             <section style={{ maxWidth: '1120px', margin: '0 auto', padding: '24px 20px 64px' }}>
                 <div style={{
                     backgroundColor: '#18181b',
                     border: '1px solid #27272a',
                     borderRadius: '16px',
                     padding: '44px 28px',
                     textAlign: 'center',
                 }}>
                     <h2 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px', color: '#fafafa' }}>{t.final_title}</h2>
                     <p style={{ fontSize: '16px', color: '#a1a1aa', margin: '0 auto 28px', maxWidth: '520px', lineHeight: 1.55 }}>{t.final_sub}</p>
                     <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                         <a href={appUrl('/register')} style={{
                             display: 'inline-flex', alignItems: 'center', gap: '8px',
                             backgroundColor: '#6366f1', color: '#ffffff',
                             fontWeight: 700, fontSize: '16px', padding: '16px 32px',
                             borderRadius: '12px', textDecoration: 'none',
                             boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
                             transition: 'background-color 0.2s',
                         }}
                         onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#818cf8'}
                         onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
                         >
                             {t.final_cta}
                             <ArrowRight size={18} />
                         </a>
                         <a href={WA_DEMO_URL} target="_blank" rel="noopener noreferrer" style={{
                             display: 'inline-flex', alignItems: 'center', gap: '8px',
                             backgroundColor: '#10b981', color: '#ffffff',
                             fontWeight: 700, fontSize: '16px', padding: '16px 32px',
                             borderRadius: '12px', textDecoration: 'none',
                             boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
                             transition: 'background-color 0.2s',
                         }}
                         onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                         onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                         >
                             <WhatsAppIcon size={18} />
                             {t.hero_cta_demo}
                         </a>
                     </div>
                 </div>
             </section>

            {/* ===== FOOTER ===== */}
            <footer style={{
                borderTop: '1px solid #1f1f23',
                backgroundColor: '#09090b',
            }}>
                <div style={{
                    maxWidth: '1120px', margin: '0 auto', padding: '40px 20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '28px',
                }}>
                    <div className="footer-brand-span">
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <img src="/pogrid-logo.png" alt="POgrid.id Logo" style={{ height: '72px', width: 'auto', objectFit: 'contain' }} />
                        </div>
                        <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.55, margin: 0, maxWidth: '320px' }}>{t.footer_tag}</p>
                    </div>
                    <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.footer_product}</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {t.footer_links_product.map((l, i) => (
                                <li key={i}><a href={hrefFor(i)} style={footerLink}>{l}</a></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.footer_company}</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {t.footer_links_company.map((l, i) => (
                                <li key={i}><a href={appUrl(i === 0 ? '/login' : '/register')} style={footerLink}>{l}</a></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Legal</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li><Link href="/terms" style={footerLink}>Syarat & Ketentuan</Link></li>
                            <li><Link href="/privacy" style={footerLink}>Kebijakan Privasi</Link></li>
                        </ul>
                    </div>
                </div>
                <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '18px 20px',
                    textAlign: 'center',
                    fontSize: '12.5px',
                    color: '#64748b',
                }}>
                    <div>© {new Date().getFullYear()} POgrid.id — Dibuat untuk pabrik manufaktur Indonesia.</div>
                </div>
            </footer>

            <style>{`
                @media (min-width: 860px) {
                    .pg-nav-desktop { display: flex !important; }
                }

                /* Hero stats grid - 1 column on mobile, 3 on wider */
                .hero-stats-grid {
                    grid-template-columns: 1fr 1fr;
                }
                @media (min-width: 480px) {
                    .hero-stats-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }

                /* CTA buttons - full-width column on mobile, row on desktop */
                @media (min-width: 520px) {
                    .btn-responsive-group {
                        flex-direction: row !important;
                    }
                    .btn-responsive-group > a {
                        width: auto !important;
                    }
                }

                /* Prevent any grid child from overflowing */
                * { box-sizing: border-box; }
                
                /* Hero layout grid */
                .hero-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr);
                    gap: 36px;
                    align-items: center;
                    text-align: left;
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                }
                @media (min-width: 860px) {
                    .hero-grid {
                        grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
                        gap: 48px;
                    }
                }

                /* Phone Mockup floating animation and styles */
                .hero-visual {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                }
                @media (max-width: 859px) {
                    .hero-visual {
                        order: 2; /* Display mockup cleanly below text & CTA buttons on mobile */
                        margin-top: 10px;
                        margin-bottom: 20px;
                    }
                }
                :root {
                    --color-pg-success: #10b981;
                    --color-pg-warning: #f59e0b;
                    --color-pg-danger: #ef4444;
                }
                /* Hardware Smartphone Frame (iPhone Style) */
                .phone-mock {
                    width: 290px;
                    position: relative;
                    background: #0f172a;
                    border: 8px solid #27272a;
                    border-radius: 40px;
                    padding: 8px;
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
                }
                @keyframes pgFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }

                /* Dynamic Island Notch */
                .phone-notch {
                    position: absolute;
                    top: 13px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 80px;
                    height: 18px;
                    background: #000000;
                    border-radius: 12px;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    padding-right: 8px;
                }
                .notch-camera {
                    width: 8px;
                    height: 8px;
                    background: #111827;
                    border-radius: 50%;
                    box-shadow: inset 0 0 2px rgba(255, 255, 255, 0.2);
                }

                /* Mobile Screen Inner Body */
                .phone-body {
                    background: #0b1329;
                    border-radius: 36px;
                    padding: 24px 14px 14px;
                    text-align: left;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                /* Status Bar */
                .phone-status-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 10px;
                    color: #94a3b8;
                    margin-bottom: 12px;
                    font-weight: 700;
                }
                .status-icons {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .status-battery {
                    width: 14px;
                    height: 7px;
                    border: 1px solid #94a3b8;
                    border-radius: 2px;
                    padding: 1px;
                }
                .battery-level {
                    width: 70%;
                    height: 100%;
                    background: #10b981;
                    border-radius: 1px;
                }

                /* App Header */
                .phone-app-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    padding: 10px 12px;
                    border-radius: 12px;
                    margin-bottom: 12px;
                }
                .app-po-code {
                    display: block;
                    font-size: 13px;
                    font-weight: 800;
                    color: #f0f4f8;
                }
                .app-client-name {
                    font-size: 10px;
                    color: #94a3b8;
                    font-weight: 500;
                }
                .app-badge-live {
                    font-size: 10px;
                    font-weight: 700;
                    color: #10b981;
                    background: rgba(16, 185, 129, 0.12);
                    padding: 4px 8px;
                    border-radius: 999px;
                    border: 1px solid rgba(16, 185, 129, 0.25);
                }

                /* Stages List */
                .phone-stages-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .stage-item {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.04);
                    padding: 8px 10px;
                    border-radius: 10px;
                }
                .stage-item.active {
                    background: rgba(245, 158, 11, 0.05);
                    border-color: rgba(245, 158, 11, 0.2);
                }
                .stage-header {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10.5px;
                    font-weight: 600;
                    color: #e2e8f0;
                    margin-bottom: 4px;
                }
                .stage-pct.ok { color: #10b981; }
                .stage-pct.warn { color: #f59e0b; }
                .stage-pct.muted { color: #64748b; }

                .phone-progress-bg {
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 4px;
                    height: 5px;
                    overflow: hidden;
                    width: 100%;
                    margin-bottom: 4px;
                }
                .phone-progress-fill {
                    height: 100%;
                    border-radius: 4px;
                }
                .stage-status-label {
                    display: block;
                    font-size: 9px;
                    font-weight: 700;
                }
                .stage-status-label.green { color: #10b981; }
                .stage-status-label.amber { color: #f59e0b; }
                .stage-status-label.gray { color: #64748b; }

                /* Activity Box */
                .phone-activity-box {
                    background: rgba(16, 185, 129, 0.05);
                    border: 1px solid rgba(16, 185, 129, 0.15);
                    border-radius: 8px;
                    padding: 6px 8px;
                    margin-bottom: 10px;
                }
                .activity-title {
                    font-size: 9px;
                    color: #94a3b8;
                    font-weight: 600;
                    margin-bottom: 2px;
                }
                .activity-row {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 9.5px;
                    color: #f1f5f9;
                    font-weight: 500;
                }
                .activity-dot.green {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: #10b981;
                }

                /* Mobile Action Button */
                .phone-action-btn {
                    width: 100%;
                    background: #10b981;
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    padding: 8px;
                    font-size: 10px;
                    font-weight: 800;
                    text-align: center;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                }
                html { scroll-behavior: smooth; }
            `}</style>
        </div>
    );
}

const navLink: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#94a3b8',
    textDecoration: 'none',
    fontFamily: 'inherit',
    transition: 'color 0.2s ease',
};

const footerLink: React.CSSProperties = {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
    fontFamily: 'inherit',
    transition: 'color 0.2s ease',
};

const h2: React.CSSProperties = {
    fontSize: 'clamp(24px, 4vw, 34px)',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    margin: '0 0 10px',
    color: '#f0f4f8',
};

const sub: React.CSSProperties = {
    fontSize: '15px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: 1.55,
};

const ChevronDownIcon: React.FC = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

function hrefFor(i: number): string {
    const map = ['#fitur', '#cara', '#harga', '#faq'];
    return map[i] ?? '#';
}
