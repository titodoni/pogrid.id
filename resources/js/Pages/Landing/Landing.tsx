import React, { useState, useEffect } from 'react';
import { Link, Head } from '@inertiajs/react';

const id = {
    brand: 'POgrid.id',
    nav_product: 'Fitur',
    nav_how: 'Cara Kerja',
    nav_price: 'Harga',
    nav_faq: 'FAQ',
    login: 'Masuk',
    cta: 'Daftar Gratis',

    // Hero
    eyebrow: 'Untuk pemilik pabrik manufaktur & tim purchasing Indonesia',
    hero_title: 'Pantau langsung posisi order PO Anda. Real-time.',
    hero_sub: 'Capek telpon lantai produksi hanya untuk tanya status order? Dengan POgrid.id, operator langsung input progress dari HP masing-masing. Anda cukup pantau dashboard KPI: aman, rawan, atau delayed.',
    hero_cta_primary: 'Coba Gratis 30 Hari',
    hero_cta_secondary: 'Lihat Cara Kerja',
    hero_note: 'Tanpa kartu kredit. Setup pabrik kurang dari 5 menit.',
    hero_stat_1: '100%',
    hero_stat_1_label: 'Progress terpantau real-time',
    hero_stat_2: '5 Menit',
    hero_stat_2_label: 'Setup & langsung buat PO',
    hero_stat_3: 'Nol',
    hero_stat_3_label: 'Instalasi aplikasi (cukup browser)',

    // Pain
    pain_title: 'Masalah klasik yang sering bikin owner pabrik pusing',
    pain_sub: 'Setiap pemilik pabrik & tim purchasing pasti paham masalah ini:',
    pain_items: [
        { q: '“Barang kita sudah sampai tahap mana?”', a: 'Owner harus telepon ke supervisor atau lantai produksi, operator jawab "masih diproses". Saat klien tanya, Anda bingung menjawabnya.' },
        { q: 'Baru tahu barang delayed pas hari-H kirim', a: 'Tidak ada warning dari awal. Keterlambatan baru ketahuan saat deadline sudah lewat, berujung kena pinalti denda.' },
        { q: 'Progres di lantai produksi tidak terpantau', a: 'Semua dicatat di kertas lecek atau sekadar ingatan. Owner kesulitan memantau progress riil di lantai produksi.' },
        { q: 'Tanggal pengiriman cuma tebak-tebakan', a: 'Susah menentukan estimasi kirim yang akurat ke pelanggan. Akhirnya rawan kena pinalti denda.' },
    ],
    pain_solution: 'POgrid.id hadir untuk satu tujuan: menghilangkan kecemasan owner soal status pengerjaan PO dan memastikan pengiriman tepat waktu bebas pinalti.',

    // How it works
    how_title: 'Operator input dari HP, owner pantau lewat dashboard',
    how_sub: 'Sistem praktis untuk memantau progress lantai produksi tanpa birokrasi rumit.',
    steps: [
        { n: '1', title: 'Operator input progres lewat HP', desc: 'Setiap tahap (potong, CNC, welding, QC, kirim) diupdate pakai PIN di HP. Tinggal input jumlah unit selesai tanpa perlu hitung manual.' },
        { n: '2', title: 'Sistem kalkulasi progres otomatis', desc: 'POgrid otomatis menghitung persentase progress lintas tahapan secara real-time untuk setiap item PO.' },
        { n: '3', title: 'Owner dapat dashboard & alert', desc: 'Lihat rincian PO yang on-time, rawan, atau delayed. Dapatkan alert otomatis sebelum deadline terlewati.' },
    ],
    how_outcome: 'Hasilnya: Anda tahu persis order PO mana yang aman, rawan, atau delayed, lengkap dengan jadwal kirim.',

    // Features
    feat_title: 'Fitur Utama',
    feat_sub: 'Pantau status PO dengan mudah, tanpa ribetnya sistem ERP.',
    features: [
        { t: 'Progress Real-Time', d: 'Setiap progress di lantai produksi langsung terupdate ke dashboard dalam hitungan detik.' },
        { t: 'Alert Delayed & Overdue', d: 'Peringatan otomatis untuk item PO yang mendekati deadline atau macet di salah satu tahapan.' },
        { t: 'Login PIN Operator', d: 'Operator tidak butuh email/password. Cukup pilih nama dan masukkan PIN 4 digit untuk update progress.' },
        { t: 'Dashboard Owner Lengkap', d: 'Pantau bottleneck produksi, status pengiriman, dan KPI ketepatan waktu dari HP atau laptop.' },
        { t: 'Multi-Tenant Terisolasi', d: 'Data pabrik Anda terjamin aman dan terisolasi sepenuhnya dari perusahaan lain.' },
        { t: 'Sederhana & Ringkas (Bukan ERP)', d: 'Fokus pada satu hal: melacak posisi order. Cepat dikonfigurasi dan bisa langsung dipakai hari ini.' },
    ],

    // Social proof
    proof_title: 'Cocok untuk berbagai tipe pabrik & workshop',
    proof_sub: 'CNC · Fabrikasi · Machining · Perakitan · Industri Manufaktur.',
    proof_items: [
        { t: 'Pabrik CNC & Machining', d: 'Lacak alur pengerjaan part: drafter → milling → CNC → QC → kirim.' },
        { t: 'Pabrik Fabrikasi & Perakitan', d: 'Pantau progress cutting, welding, assembly, hingga finishing dalam satu layar.' },
        { t: 'Workshop Manufaktur Umum', d: 'Semua data produksi terpusat di satu dashboard, hilangkan tebak-tebakan progress.' },
    ],
    proof_quote: '“Dulu tiap sore saya harus keliling lantai produksi untuk cek progress. Sekarang tinggal buka HP, langsung kelihatan mana PO yang delayed.”',
    proof_quote_by: '— Owner pabrik manufaktur, Jawa Barat',

    // Pricing
    price_title: 'Mulai Lacak Order PO Pabrik Anda Hari Ini',
    price_sub: 'Gratis 30 hari untuk pabrik baru. Tanpa kartu kredit.',
    price_feature_label: 'Semua paket sudah termasuk akses penuh:',
    price_features: [
        'Dashboard owner real-time & Presentation Mode',
        'Update progress via HP operator (PIN login)',
        'Alert delayed otomatis & email recap harian',
        'Akses instan dari browser, tanpa instalasi',
        'Tampilan simpel & mudah dipahami operator',
    ],
    price_cta: 'Coba Gratis Sekarang',

    // FAQ
    faq_title: 'Tanya Jawab (FAQ)',
    faqs: [
        { q: 'Apakah ini software ERP atau akuntansi?', a: 'Bukan. POgrid.id adalah tracker progress & ketepatan kirim (on-time delivery). Kami sengaja tidak menyediakan modul stok barang, akuntansi, atau BOM agar sistem tetap ringan dan langsung bisa dipakai.' },
        { q: 'Operator saya tidak terbiasa dengan komputer, apakah bisa pakai?', a: 'Sangat bisa. Operator hanya perlu memilih nama mereka, memasukkan PIN 4 digit, lalu input unit yang selesai. Sangat sederhana dan tidak butuh email.' },
        { q: 'Apakah harus install aplikasi tertentu di HP?', a: 'Tidak perlu. Cukup buka link via browser (Chrome/Safari) di HP atau laptop Anda. Data tersimpan aman di cloud dan terupdate real-time.' },
        { q: 'Berapa lama waktu setup sampai bisa buat PO?', a: 'Sangat cepat. Begitu selesai registrasi (kurang dari 30 detik), Anda bisa langsung membuat PO perdana dan memantau statusnya di dashboard.' },
        { q: 'Apakah bahasanya Indonesia?', a: 'Ya, antarmuka menggunakan bahasa Indonesia yang santai dengan istilah industri yang sudah familiar di lapangan (seperti PO, Rework, Progress, Delayed, Pinalti).' },
        { q: 'Apakah data pabrik kami aman?', a: 'Terjamin aman. Data setiap perusahaan dipisahkan secara ketat menggunakan Row-Level Security, sehingga tidak akan bercampur atau diakses oleh pihak luar.' },
    ],

    // Final CTA
    final_title: 'Pantau langsung, tanpa tebak-tebakan.',
    final_sub: 'Daftarkan pabrik Anda sekarang dan buat PO pertama dalam 2 menit.',
    final_cta: 'Coba Gratis 30 Hari',

    footer_tag: 'Real-time PO tracking & kontrol produksi untuk pabrik manufaktur & procurement Indonesia.',
    footer_product: 'Produk',
    footer_company: 'Perusahaan',
    footer_links_product: ['Fitur', 'Cara Kerja', 'Harga', 'FAQ'],
    footer_links_company: ['Masuk', 'Daftar', 'Bantuan'],
};

const MarkerUnderline: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = '#dc2626' }) => (
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
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
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

const StarRow: React.FC = () => (
    <div style={{ display: 'flex', gap: '2px', color: 'var(--color-pg-warning)' }}>
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
            backgroundColor: '#f4fff8',
            color: '#000f08',
            fontFamily: 'var(--font-sans)',
            WebkitFontSmoothing: 'antialiased',
        }}>
            <Head>
                <title>POgrid.id — Sistem Kontrol Produksi untuk Owner Pabrik Indonesia</title>
                <meta name="description" content="Lacak semua Purchase Order produksi dalam 10 detik. Sistem tracking real-time untuk workshop CNC, fabrikasi, dan machining Indonesia. Coba gratis 14 hari." />
                <meta name="keywords" content="sistem produksi manufaktur, tracking purchase order, software workshop CNC, kontrol produksi pabrik, POgrid Indonesia" />
            </Head>

            {/* ===== NAV ===== */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                backdropFilter: 'blur(12px)',
                backgroundColor: 'rgba(244, 255, 248, 0.85)',
                borderBottom: scrolled ? '1px solid rgba(28, 55, 56, 0.12)' : '1px solid rgba(28, 55, 56, 0.05)',
                boxShadow: scrolled ? '0 8px 30px rgba(28, 55, 56, 0.04)' : 'none',
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
                        <img src="/pogrid-logo.png" alt="POgrid.id Logo" style={{ height: scrolled ? '42px' : '84px', width: 'auto', transition: 'height 0.3s ease' }} />
                    </Link>

                    <nav style={{ display: 'none', alignItems: 'center', gap: '26px' }} className="pg-nav-desktop">
                        <a href="#fitur" style={navLink}>{t.nav_product}</a>
                        <a href="#cara" style={navLink}>{t.nav_how}</a>
                        <a href="#harga" style={navLink}>{t.nav_price}</a>
                        <a href="#faq" style={navLink}>{t.nav_faq}</a>
                    </nav>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Link href="/login" style={{ ...navLink, display: 'none' }} className="pg-nav-desktop">{t.login}</Link>
                        <Link href="/register" style={{
                            backgroundColor: '#1c3738',
                            color: '#f4fff8',
                            fontWeight: 700,
                            fontSize: '14px',
                            padding: '10px 16px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(28, 55, 56, 0.2)',
                        }}>
                            {t.cta}
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>
            </header>

            {/* ===== HERO ===== */}
            <section style={{
                position: 'relative',
                maxWidth: '1120px',
                margin: '0 auto',
                padding: '64px 20px 56px',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    background: 'radial-gradient(circle at 50% 0%, rgba(139, 170, 173, 0.15) 0%, transparent 65%)',
                    pointerEvents: 'none',
                }} />
                
                <div className="hero-grid" style={{ position: 'relative', zIndex: 1 }}>
                    {/* Hero Left Column (Copy) */}
                    <div style={{ textAlign: 'left' }}>
                        <span style={{
                            display: 'inline-block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#1c3738',
                            backgroundColor: 'rgba(139, 170, 173, 0.15)',
                            border: '1px solid rgba(139, 170, 173, 0.3)',
                            padding: '6px 14px',
                            borderRadius: '999px',
                            marginBottom: '20px',
                        }}>{t.eyebrow}</span>

                        <h1 style={{
                            fontSize: 'clamp(30px, 5.5vw, 48px)',
                            lineHeight: 1.12,
                            fontWeight: 800,
                            letterSpacing: '-0.03em',
                            margin: '0 0 20px',
                            color: '#000f08',
                        }}>
                            {t.hero_title}
                        </h1>

                        <p style={{
                            fontSize: 'clamp(15px, 2vw, 17px)',
                            lineHeight: 1.6,
                            color: '#4d4847',
                            margin: '0 0 32px',
                            maxWidth: '600px',
                        }}>
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>Capek</span> telpon lantai produksi hanya untuk tanya status order? Dengan <strong>POgrid.id</strong>, operator langsung input progress dari HP masing-masing. Lindungi pabrik Anda dari risiko <MarkerUnderline>Pinalti</MarkerUnderline> dan <MarkerUnderline>denda keterlambatan</MarkerUnderline>.
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                            <Link href="/register" style={{
                                backgroundColor: '#1c3738',
                                color: '#f4fff8',
                                fontWeight: 700,
                                fontSize: '15px',
                                padding: '14px 26px',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 8px 20px rgba(28, 55, 56, 0.2)',
                            }}>
                                {t.hero_cta_primary}
                                <ArrowRight size={17} />
                            </Link>
                            <a href="#cara" style={{
                                backgroundColor: 'transparent',
                                color: '#1c3738',
                                border: '1px solid rgba(28, 55, 56, 0.2)',
                                fontWeight: 600,
                                fontSize: '15px',
                                padding: '14px 22px',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <PlayCircle size={17} />
                                {t.hero_cta_secondary}
                            </a>
                        </div>

                        <p style={{ fontSize: '13px', color: '#687d7b', margin: '0 0 40px' }}>{t.hero_note}</p>

                        {/* Centered Stats in left column or bottom */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: '12px',
                            maxWidth: '560px',
                        }}>
                            {[
                                { v: t.hero_stat_1, l: t.hero_stat_1_label },
                                { v: t.hero_stat_2, l: t.hero_stat_2_label },
                                { v: t.hero_stat_3, l: t.hero_stat_3_label },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid rgba(28, 55, 56, 0.08)',
                                    borderRadius: '12px',
                                    padding: '16px 14px',
                                    boxShadow: '0 4px 12px rgba(28, 55, 56, 0.02)',
                                }}>
                                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c3738', letterSpacing: '-0.02em' }}>{s.v}</div>
                                    <div style={{ fontSize: '12px', color: '#4d4847', marginTop: '4px', lineHeight: 1.35 }}>{s.l}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hero Right Column (CSS Phone Mockup) */}
                    <div className="hero-visual">
                        <div className="phone-mock">
                            <div className="phone-bar">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                            <div className="phone-body">
                                <div className="phone-kpi-row">
                                    <div className="phone-kpi kpi-ok">
                                        <span>12</span>
                                        <label>On Time</label>
                                    </div>
                                    <div className="phone-kpi kpi-warn">
                                        <span>3</span>
                                        <label>Rawan</label>
                                    </div>
                                    <div className="phone-kpi kpi-bad">
                                        <span>1</span>
                                        <label>Telat</label>
                                    </div>
                                </div>
                                <ul className="phone-po-list">
                                    <li className="phone-po-item">
                                        <div className="phone-po-meta">
                                            <span className="phone-po-name">Gearbox A-100</span>
                                            <span className="phone-po-pct">82%</span>
                                        </div>
                                        <div className="phone-progress-bg">
                                            <div className="phone-progress-fill" style={{ width: '82%', backgroundColor: 'var(--color-pg-success)' }}></div>
                                        </div>
                                    </li>
                                    <li className="phone-po-item">
                                        <div className="phone-po-meta">
                                            <span className="phone-po-name">Bracket B-22</span>
                                            <span className="phone-po-pct">45%</span>
                                        </div>
                                        <div className="phone-progress-bg">
                                            <div className="phone-progress-fill" style={{ width: '45%', backgroundColor: 'var(--color-pg-warning)' }}></div>
                                        </div>
                                    </li>
                                    <li className="phone-po-item">
                                        <div className="phone-po-meta">
                                            <span className="phone-po-name">Housing C-7</span>
                                            <span className="phone-po-pct">20%</span>
                                        </div>
                                        <div className="phone-progress-bg">
                                            <div className="phone-progress-fill" style={{ width: '20%', backgroundColor: 'var(--color-pg-danger)' }}></div>
                                        </div>
                                    </li>
                                </ul>
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
                     gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                     gap: '16px',
                 }}>
                     {t.pain_items.map((p, i) => (
                         <div key={i} style={{
                             backgroundColor: '#ffffff',
                             border: '1px solid rgba(28, 55, 56, 0.08)',
                             borderRadius: '16px',
                             padding: '22px',
                             boxShadow: '0 4px 12px rgba(28, 55, 56, 0.02)',
                         }}>
                             <p style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.4, margin: '0 0 10px', color: '#000f08' }}>{p.q}</p>
                             <p style={{ fontSize: '14px', color: '#4d4847', lineHeight: 1.55, margin: 0 }}>{p.a}</p>
                         </div>
                     ))}
                 </div>
                 <div style={{
                     marginTop: '28px',
                     backgroundColor: 'rgba(139, 170, 173, 0.12)',
                     border: '1px solid rgba(139, 170, 173, 0.3)',
                     borderRadius: '16px',
                     padding: '22px 26px',
                     textAlign: 'center',
                 }}>
                     <p style={{ fontSize: '16px', fontWeight: 600, color: '#1c3738', margin: 0, lineHeight: 1.5 }}>{t.pain_solution}</p>
                 </div>
             </section>

            {/* ===== HOW IT WORKS ===== */}
             <section id="cara" style={{ maxWidth: '1120px', margin: '0 auto', padding: '56px 20px' }}>
                 <div style={{ textAlign: 'center', marginBottom: '44px' }}>
                     <h2 style={h2}>{t.how_title}</h2>
                     <p style={sub}>{t.how_sub}</p>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', position: 'relative' }}>
                     {t.steps.map((s, i) => (
                         <div key={i} style={{
                             position: 'relative',
                             backgroundColor: '#ffffff',
                             border: '1px solid rgba(28, 55, 56, 0.08)',
                             borderRadius: '18px',
                             padding: '28px 24px',
                             boxShadow: '0 4px 12px rgba(28, 55, 56, 0.02)',
                         }}>
                             <div style={{
                                 width: '44px', height: '44px', borderRadius: '12px',
                                 background: 'linear-gradient(135deg, #1c3738 0%, #000f08 100%)',
                                 color: '#f4fff8', fontWeight: 800, fontSize: '20px',
                                 display: 'grid', placeItems: 'center', marginBottom: '18px',
                                 boxShadow: '0 6px 16px rgba(28, 55, 56, 0.2)',
                             }}>{s.n}</div>
                             <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#000f08' }}>{s.title}</h3>
                             <p style={{ fontSize: '14px', color: '#4d4847', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                         </div>
                     ))}
                 </div>
                 <div style={{ textAlign: 'center', marginTop: '30px' }}>
                     <p style={{ fontSize: '15px', color: 'var(--color-pg-success)', fontWeight: 600, margin: 0 }}>{t.how_outcome}</p>
                 </div>
             </section>

            {/* ===== FEATURES ===== */}
             <section id="fitur" style={{ maxWidth: '1120px', margin: '0 auto', padding: '40px 20px' }}>
                 <div style={{ textAlign: 'center', marginBottom: '44px' }}>
                     <h2 style={h2}>{t.feat_title}</h2>
                     <p style={sub}>{t.feat_sub}</p>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                     {t.features.map((f, i) => (
                         <div key={i} style={{
                             backgroundColor: '#ffffff',
                             border: '1px solid rgba(28, 55, 56, 0.08)',
                             borderRadius: '16px',
                             padding: '22px',
                             display: 'flex',
                             gap: '14px',
                             alignItems: 'flex-start',
                             boxShadow: '0 4px 12px rgba(28, 55, 56, 0.02)',
                         }}>
                             <span style={{
                                 flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px',
                                 backgroundColor: 'rgba(139, 170, 173, 0.15)',
                                 color: '#1c3738',
                                 display: 'grid', placeItems: 'center',
                             }}><Check size={18} /></span>
                             <div>
                                 <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '2px 0 6px', color: '#000f08' }}>{f.t}</h3>
                                 <p style={{ fontSize: '13.5px', color: '#4d4847', lineHeight: 1.55, margin: 0 }}>{f.d}</p>
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
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                     {t.proof_items.map((p, i) => (
                         <div key={i} style={{
                             backgroundColor: '#ffffff',
                             border: '1px solid rgba(28, 55, 56, 0.08)',
                             borderRadius: '16px',
                             padding: '24px',
                             boxShadow: '0 4px 12px rgba(28, 55, 56, 0.02)',
                         }}>
                             <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: '#1c3738' }}>{p.t}</h3>
                             <p style={{ fontSize: '14px', color: '#4d4847', lineHeight: 1.55, margin: 0 }}>{p.d}</p>
                         </div>
                     ))}
                 </div>
                 <div style={{
                     backgroundColor: '#ffffff',
                     border: '1px solid rgba(28, 55, 56, 0.08)',
                     borderRadius: '18px',
                     padding: '30px',
                     textAlign: 'center',
                     maxWidth: '760px',
                     margin: '0 auto',
                     boxShadow: '0 4px 20px rgba(28, 55, 56, 0.04)',
                 }}>
                     <StarRow />
                     <p style={{ fontSize: '17px', fontWeight: 600, lineHeight: 1.6, margin: '14px 0 10px', color: '#000f08' }}>{t.proof_quote}</p>
                     <p style={{ fontSize: '13px', color: '#4d4847', margin: 0 }}>{t.proof_quote_by}</p>
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
                     backgroundColor: '#ffffff',
                     border: '1px solid rgba(139, 170, 173, 0.4)',
                     borderRadius: '22px',
                     padding: '36px 32px',
                     boxShadow: '0 20px 60px -20px rgba(28, 55, 56, 0.1)',
                 }}>
                     <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                         <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em', color: '#000f08' }}>Gratis</span>
                         <span style={{ fontSize: '15px', color: '#4d4847' }}>30 hari</span>
                     </div>
                     <p style={{ fontSize: '14px', color: '#4d4847', margin: '0 0 22px' }}>{t.price_feature_label}</p>
                     <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                         {t.price_features.map((f, i) => (
                             <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', color: '#000f08' }}>
                                 <span style={{ color: 'var(--color-pg-success)', display: 'grid', placeItems: 'center' }}><Check size={17} /></span>
                                 {f}
                             </li>
                         ))}
                     </ul>
                     <Link href="/register" style={{
                         display: 'flex', width: '100%', justifyContent: 'center',
                         backgroundColor: '#1c3738',
                         color: '#f4fff8', fontWeight: 700, fontSize: '16px',
                         padding: '15px', borderRadius: '12px', textDecoration: 'none',
                         alignItems: 'center', gap: '8px',
                         boxShadow: '0 8px 24px rgba(28, 55, 56, 0.2)',
                     }}>
                         {t.price_cta}
                         <ArrowRight size={18} />
                     </Link>
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
                                 backgroundColor: '#ffffff',
                                 border: '1px solid rgba(28, 55, 56, 0.08)',
                                 borderRadius: '14px',
                                 overflow: 'hidden',
                                 boxShadow: '0 4px 12px rgba(28, 55, 56, 0.02)',
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
                                         color: '#000f08',
                                         fontSize: '15px',
                                         fontWeight: 600,
                                         fontFamily: 'inherit',
                                     }}
                                 >
                                     {f.q}
                                     <span style={{
                                         color: '#1c3738',
                                         transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                                         transition: 'transform 0.2s',
                                         flexShrink: 0,
                                     }}><ChevronDownIcon /></span>
                                 </button>
                                 {open && (
                                     <div style={{ padding: '0 20px 18px', fontSize: '14px', color: '#4d4847', lineHeight: 1.6 }}>
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
                     background: 'linear-gradient(135deg, rgba(139, 170, 173, 0.15) 0%, rgba(139, 170, 173, 0.04) 100%)',
                     border: '1px solid rgba(139, 170, 173, 0.3)',
                     borderRadius: '24px',
                     padding: '52px 28px',
                     textAlign: 'center',
                 }}>
                     <h2 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px', color: '#000f08' }}>{t.final_title}</h2>
                     <p style={{ fontSize: '16px', color: '#4d4847', margin: '0 auto 28px', maxWidth: '520px', lineHeight: 1.55 }}>{t.final_sub}</p>
                     <Link href="/register" style={{
                         display: 'inline-flex', alignItems: 'center', gap: '8px',
                         backgroundColor: '#1c3738', color: '#f4fff8',
                         fontWeight: 700, fontSize: '16px', padding: '16px 32px',
                         borderRadius: '12px', textDecoration: 'none',
                         boxShadow: '0 8px 24px rgba(28, 55, 56, 0.2)',
                     }}>
                         {t.final_cta}
                         <ArrowRight size={18} />
                     </Link>
                 </div>
             </section>

            {/* ===== FOOTER ===== */}
            <footer style={{
                borderTop: '1px solid var(--color-pg-border)',
                backgroundColor: 'var(--color-pg-surface)',
            }}>
                <div style={{
                    maxWidth: '1120px', margin: '0 auto', padding: '40px 20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '28px',
                }}>
                    <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <img src="/pogrid-logo.png" alt="POgrid.id Logo" style={{ height: '120px', width: 'auto' }} />
                        </div>
                        <p style={{ fontSize: '13.5px', color: 'var(--color-pg-text-muted)', lineHeight: 1.55, margin: 0, maxWidth: '320px' }}>{t.footer_tag}</p>
                    </div>
                    <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-pg-text-secondary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.footer_product}</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {t.footer_links_product.map((l, i) => (
                                <li key={i}><a href={hrefFor(i)} style={footerLink}>{l}</a></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-pg-text-secondary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.footer_company}</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {t.footer_links_company.map((l, i) => (
                                <li key={i}><a href={i === 0 ? '/login' : '/register'} style={footerLink}>{l}</a></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-pg-text-secondary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Legal</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <li><Link href="/terms" style={footerLink}>Syarat & Ketentuan</Link></li>
                            <li><Link href="/privacy" style={footerLink}>Kebijakan Privasi</Link></li>
                        </ul>
                    </div>
                </div>
                <div style={{
                    borderTop: '1px solid var(--color-pg-border)',
                    padding: '18px 20px',
                    textAlign: 'center',
                    fontSize: '12.5px',
                    color: 'var(--color-pg-text-muted)',
                }}>
                    <div>© {new Date().getFullYear()} POgrid.id — Dibuat untuk pabrik manufaktur Indonesia.</div>
                    <div style={{ fontSize: '10.5px', marginTop: '6px', opacity: 0.6 }}>beta1 (2026-07-17)</div>
                </div>
            </footer>

            <style>{`
                @media (min-width: 860px) {
                    .pg-nav-desktop { display: flex !important; }
                }
                
                /* Hero layout grid */
                .hero-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 48px;
                    align-items: center;
                    text-align: center;
                }
                @media (min-width: 860px) {
                    .hero-grid {
                        grid-template-columns: 1.15fr 0.85fr;
                        text-align: left;
                    }
                }

                /* Phone Mockup floating animation and styles */
                .hero-visual {
                    display: flex;
                    justify-content: center;
                    position: relative;
                    z-index: 1;
                }
                @media (max-width: 859px) {
                    .hero-visual {
                        order: -1; /* Display mockup above text on mobile */
                        margin-bottom: 20px;
                    }
                }
                .phone-mock {
                    width: 270px;
                    background: var(--color-pg-surface);
                    border: 1px solid var(--color-pg-border);
                    border-radius: 28px;
                    padding: 12px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
                    animation: pgFloat 4s ease-in-out infinite;
                }
                @keyframes pgFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                .phone-bar {
                    display: flex;
                    gap: 6px;
                    padding: 4px 6px 12px;
                }
                .phone-bar .dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--color-pg-border);
                }
                .phone-body {
                    background: var(--color-pg-border-subtle);
                    border-radius: 18px;
                    padding: 16px;
                    text-align: left;
                }
                .phone-kpi-row {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 16px;
                }
                .phone-kpi {
                    flex: 1;
                    border-radius: 10px;
                    padding: 10px 4px;
                    text-align: center;
                }
                .phone-kpi span {
                    display: block;
                    font-size: 1.3rem;
                    font-weight: 800;
                }
                .phone-kpi label {
                    font-size: 0.65rem;
                    color: var(--color-pg-text-secondary);
                    font-weight: 600;
                }
                .kpi-ok {
                    background: rgba(34, 197, 94, 0.12);
                    color: var(--color-pg-success);
                }
                .kpi-warn {
                    background: rgba(245, 158, 11, 0.12);
                    color: var(--color-pg-warning);
                }
                .kpi-bad {
                    background: rgba(239, 68, 68, 0.12);
                    color: var(--color-pg-danger);
                }
                .phone-po-list {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .phone-po-item {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    font-size: 0.75rem;
                }
                .phone-po-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .phone-po-name {
                    color: var(--color-pg-text);
                    font-weight: 600;
                }
                .phone-po-pct {
                    color: var(--color-pg-text-secondary);
                    font-weight: 600;
                }
                .phone-progress-bg {
                    background: var(--color-pg-input);
                    border-radius: 6px;
                    height: 8px;
                    overflow: hidden;
                    width: 100%;
                }
                .phone-progress-fill {
                    height: 100%;
                    border-radius: 6px;
                    transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
                }
            `}</style>
        </div>
    );
}

const navLink: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1c3738',
    textDecoration: 'none',
    fontFamily: 'inherit',
};

const footerLink: React.CSSProperties = {
    fontSize: '14px',
    color: 'var(--color-pg-text-secondary)',
    textDecoration: 'none',
    fontFamily: 'inherit',
};

const h2: React.CSSProperties = {
    fontSize: 'clamp(24px, 4vw, 34px)',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    margin: '0 0 10px',
    color: '#000f08',
};

const sub: React.CSSProperties = {
    fontSize: '15px',
    color: '#4d4847',
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
