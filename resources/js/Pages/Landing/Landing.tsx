import React, { useState } from 'react';
import { Link } from '@inertiajs/react';

const id = {
    brand: 'POgrid.id',
    nav_product: 'Fitur',
    nav_how: 'Cara Kerja',
    nav_price: 'Harga',
    nav_faq: 'FAQ',
    login: 'Masuk',
    cta: 'Daftar Gratis',

    // Hero
    eyebrow: 'Tracker Progres & Ketepatan Kirim untuk Bengkel Manufaktur',
    hero_title: 'Tahu persis dimana pesanan pelanggan Anda — sebelum mereka telepon.',
    hero_sub: 'POgrid.id ubah kekacauan lantai produksi bengkel las, CNC, & fabrikasi jadi data progres nyata. Owner lihat dashboard, operator update dari HP. Tanpa ERP, tanpa ribet.',
    hero_cta_primary: 'Daftar & Buat Bengkel Gratis',
    hero_cta_secondary: 'Lihat Cara Kerja',
    hero_note: 'Gratis 30 hari · Tanpa kartu kredit · Bahasa Indonesia',
    hero_stat_1: '100%',
    hero_stat_1_label: 'Visibilitas order real-time',
    hero_stat_2: '< 2 menit',
    hero_stat_2_label: 'Untuk input PO pertama',
    hero_stat_3: '0',
    hero_stat_3_label: 'Software yang harus diinstall',

    // Pain
    pain_title: 'Bos bengkel kenal rasa ini?',
    pain_sub: 'Setiap owner bengkel manufaktur pernah di sini.',
    pain_items: [
        { q: '“Orderan mana yang sudah mau jadi, mana yang baru mulai?”', a: 'Tanya 3 orang, dapat 3 jawaban beda. Status di kepala, bukan di data.' },
        { q: '“Pelanggan telepon tanya progress, kita malah harus ke lantai cek.”', a: 'Waktu habis jadi kurir info, bukan buat kerja.' },
        { q: '“Telat kirim, pelanggan marah, padahal tukang bilang on-time.”', a: 'Tidak ada bukti progres. Semuanya kata-kata.' },
        { q: '“Susah kasih tahu kapan benernya bisa dikirim.”', a: 'Estimasi dari feeling, bukan dari progres nyata.' },
    ],
    pain_solution: 'POgrid.id beresin satu hal: menghilangkan kecemasan owner soal “order pelanggan ada di mana, dan nyampe tepat waktu nggak.”',

    // How it works
    how_title: 'Dari daftar sampai PO pertama — cuma 3 langkah',
    how_sub: 'Dibuat khusus biar owner bengkel langsung dapet nilai, bukan cuma akun.',
    steps: [
        { n: '1', title: 'Daftar bengkel', desc: 'Isi nama bengkel & email. Slug login otomatis. Selesai dalam 30 detik, langsung aktif.' },
        { n: '2', title: 'Buat PO pertama', desc: 'Masukkan nomor PO, nama klien, & item yang diminta. Tambah tahapan kerja (drafter, CNC, QC, kirim…).' },
        { n: '3', title: 'Operator update dari HP', desc: 'Operator pilih nama + PIN, update progres tiap tahap. Owner & klien lihat live — tanpa tanya-tanya.' },
    ],
    how_outcome: 'Hasil: Anda tahu order mana merah/kuning/hijau, dan kapan benar-benar siap kirim.',

    // Features
    feat_title: 'Satu layar, semua jawaban',
    feat_sub: 'Tidak perlu jadi ahli IT. Semua orang di bengkel bisa pakai.',
    features: [
        { t: 'Dashboard Owner Real-time', d: 'Lihat semua PO, status merah/kuning/hijau, & alert keterlambatan dalam satu pandangan.' },
        { t: 'Update dari HP Operator', d: 'Pekerja di lantai pilih nama + PIN, klik progres. Tidak perlu komputer kantor.' },
        { t: 'Alert Keterlambatan', d: 'Sistem kasih tahu otomatis kalau PO berisiko telat — sebelum pelanggan komplain.' },
        { t: 'Status untuk Klien', d: 'Tunjukkan progres ke pelanggan tanpa buka akses bengkel Anda.' },
        { t: 'Tanpa Install', d: 'Buka dari browser HP maupun laptop. Tidak ada software yang harus diunduh.' },
        { t: 'Bahasa Indonesia', d: 'Antarmuka full Bahasa Indonesia. Cocok untuk tim di lantai produksi.' },
    ],

    // Social proof
    proof_title: 'Untuk bengkel seperti milik Anda',
    proof_sub: 'CNC · Fabrikasi · Las · Engineering workshop · Kombinasi semuanya.',
    proof_items: [
        { t: 'Bengkel CNC & Machining', d: 'Lacak progres per part: drafter → milling → CNC → QC → kirim.' },
        { t: 'Bengkel Fabrikasi & Las', d: 'Pantau cutting, welding, assembly, & finishing dalam satu papan.' },
        { t: 'Workshop Engineering Lengkap', d: 'Gabungkan banyak jenis kerja, satu sumber kebenaran untuk owner.' },
    ],
    proof_quote: '“Dulu tiap sore aku harus tanya satu-satu ke lantai. Sekarang tinggal lihat HP — tahu persis order mana yang telat.”',
    proof_quote_by: '— Owner bengkel fabrikasi, Jawa Barat',

    // Pricing
    price_title: 'Mulai gratis. Naik cuma kalau sudah untung.',
    price_sub: 'Coba dulu 30 hari tanpa bayar. Tidak perlu kartu kredit.',
    price_feature_label: 'Semua paket sudah termasuk:',
    price_features: [
        'Dashboard owner real-time',
        'Update progres dari HP operator',
        'Alert keterlambatan otomatis',
        'Tanpa install · akses browser',
        'Bahasa Indonesia',
    ],
    price_cta: 'Daftar & Coba 30 Hari Gratis',

    // FAQ
    faq_title: 'Pertanyaan sering ditanya',
    faqs: [
        { q: 'Apakah ini software ERP atau akuntansi?', a: 'Bukan. POgrid.id hanya tracker progres & ketepatan kirim. Tidak ada stok barang, BOM, atau buku besar. Fokusnya satu: tahu status order pelanggan.' },
        { q: 'Operator saya tidak jago komputer, bisa pakai?', a: 'Bisa. Operator cuma pilih nama lalu masukkan PIN 4 digit, lalu klik progres. Tidak perlu email atau password.' },
        { q: 'Apakah harus install aplikasi?', a: 'Tidak. Buka lewat browser di HP maupun laptop. Data tersimpan di cloud, bisa dilihat kapan saja.' },
        { q: 'Berapa lama sampai PO pertama masuk?', a: 'Setelah daftar, kurang dari 2 menit Anda sudah bisa buat PO pertama dan lihat di dashboard.' },
        { q: 'Apakah bahasanya Indonesia?', a: 'Ya, antarmuka sepenuhnya Bahasa Indonesia — untuk owner maupun operator di lantai.' },
        { q: 'Apakah aman untuk data bengkel?', a: 'Ya. Data tiap bengkel terpisah rapi. Hanya orang dengan akses yang bisa melihat.' },
    ],

    // Final CTA
    final_title: 'Berhenti nebak. Mulai tahu.',
    final_sub: 'Daftarkan bengkel Anda sekarang dan buat PO pertama dalam 2 menit.',
    final_cta: 'Daftar Gratis — 30 Hari',

    footer_tag: 'Tracker progres & ketepatan kirim untuk bengkel manufaktur Indonesia.',
    footer_product: 'Produk',
    footer_company: 'Perusahaan',
    footer_links_product: ['Fitur', 'Cara Kerja', 'Harga', 'FAQ'],
    footer_links_company: ['Masuk', 'Daftar', 'Bantuan'],
};

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
    const t = id;

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-pg-bg)',
            color: 'var(--color-pg-text)',
            fontFamily: 'var(--font-sans)',
            WebkitFontSmoothing: 'antialiased',
        }}>
            {/* ===== NAV ===== */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                backdropFilter: 'blur(12px)',
                backgroundColor: 'rgba(9, 9, 11, 0.72)',
                borderBottom: '1px solid var(--color-pg-border)',
            }}>
                <div style={{
                    maxWidth: '1120px',
                    margin: '0 auto',
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
                        <span style={{
                            width: '30px', height: '30px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                            display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '15px', color: '#fff',
                        }}>P</span>
                        <span style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.02em' }}>POgrid.id</span>
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
                            backgroundColor: 'var(--color-pg-primary)',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '14px',
                            padding: '10px 16px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
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
                padding: '72px 20px 56px',
                textAlign: 'center',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 55%)',
                    pointerEvents: 'none',
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <span style={{
                        display: 'inline-block',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-pg-primary-hover)',
                        backgroundColor: 'var(--color-pg-primary-glow)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        marginBottom: '22px',
                    }}>{t.eyebrow}</span>

                    <h1 style={{
                        fontSize: 'clamp(30px, 6vw, 54px)',
                        lineHeight: 1.08,
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        margin: '0 auto 20px',
                        maxWidth: '880px',
                    }}>
                        {t.hero_title}
                    </h1>

                    <p style={{
                        fontSize: 'clamp(15px, 2.2vw, 18px)',
                        lineHeight: 1.6,
                        color: 'var(--color-pg-text-secondary)',
                        margin: '0 auto 32px',
                        maxWidth: '640px',
                    }}>{t.hero_sub}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '22px' }}>
                        <Link href="/register" style={{
                            backgroundColor: 'var(--color-pg-primary)',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '16px',
                            padding: '15px 28px',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                        }}>
                            {t.hero_cta_primary}
                            <ArrowRight size={18} />
                        </Link>
                        <a href="#cara" style={{
                            backgroundColor: 'transparent',
                            color: 'var(--color-pg-text)',
                            border: '1px solid var(--color-pg-border)',
                            fontWeight: 600,
                            fontSize: '16px',
                            padding: '15px 24px',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <PlayCircle size={18} />
                            {t.hero_cta_secondary}
                        </a>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--color-pg-text-muted)', margin: '0 0 36px' }}>{t.hero_note}</p>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '16px',
                        maxWidth: '760px',
                        margin: '0 auto',
                    }}>
                        {[
                            { v: t.hero_stat_1, l: t.hero_stat_1_label },
                            { v: t.hero_stat_2, l: t.hero_stat_2_label },
                            { v: t.hero_stat_3, l: t.hero_stat_3_label },
                        ].map((s, i) => (
                            <div key={i} style={{
                                backgroundColor: 'var(--color-pg-surface)',
                                border: '1px solid var(--color-pg-border)',
                                borderRadius: '14px',
                                padding: '20px 16px',
                            }}>
                                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-pg-primary-hover)', letterSpacing: '-0.02em' }}>{s.v}</div>
                                <div style={{ fontSize: '13px', color: 'var(--color-pg-text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>{s.l}</div>
                            </div>
                        ))}
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
                            backgroundColor: 'var(--color-pg-surface)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '16px',
                            padding: '22px',
                        }}>
                            <p style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.4, margin: '0 0 10px', color: 'var(--color-pg-text)' }}>{p.q}</p>
                            <p style={{ fontSize: '14px', color: 'var(--color-pg-text-secondary)', lineHeight: 1.55, margin: 0 }}>{p.a}</p>
                        </div>
                    ))}
                </div>
                <div style={{
                    marginTop: '28px',
                    backgroundColor: 'var(--color-pg-primary-glow)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '16px',
                    padding: '22px 26px',
                    textAlign: 'center',
                }}>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-pg-primary-hover)', margin: 0, lineHeight: 1.5 }}>{t.pain_solution}</p>
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
                            backgroundColor: 'var(--color-pg-surface)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '18px',
                            padding: '28px 24px',
                        }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '12px',
                                background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                                color: '#fff', fontWeight: 800, fontSize: '20px',
                                display: 'grid', placeItems: 'center', marginBottom: '18px',
                                boxShadow: '0 6px 16px rgba(99,102,241,0.3)',
                            }}>{s.n}</div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>{s.title}</h3>
                            <p style={{ fontSize: '14px', color: 'var(--color-pg-text-secondary)', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
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
                            backgroundColor: 'var(--color-pg-surface)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '16px',
                            padding: '22px',
                            display: 'flex',
                            gap: '14px',
                            alignItems: 'flex-start',
                        }}>
                            <span style={{
                                flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px',
                                backgroundColor: 'var(--color-pg-primary-glow)',
                                color: 'var(--color-pg-primary-hover)',
                                display: 'grid', placeItems: 'center',
                            }}><Check size={18} /></span>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '2px 0 6px' }}>{f.t}</h3>
                                <p style={{ fontSize: '13.5px', color: 'var(--color-pg-text-secondary)', lineHeight: 1.55, margin: 0 }}>{f.d}</p>
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
                            backgroundColor: 'var(--color-pg-surface)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '16px',
                            padding: '24px',
                        }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: 'var(--color-pg-primary-hover)' }}>{p.t}</h3>
                            <p style={{ fontSize: '14px', color: 'var(--color-pg-text-secondary)', lineHeight: 1.55, margin: 0 }}>{p.d}</p>
                        </div>
                    ))}
                </div>
                <div style={{
                    backgroundColor: 'var(--color-pg-card-hover)',
                    border: '1px solid var(--color-pg-border)',
                    borderRadius: '18px',
                    padding: '30px',
                    textAlign: 'center',
                    maxWidth: '760px',
                    margin: '0 auto',
                }}>
                    <StarRow />
                    <p style={{ fontSize: '17px', fontWeight: 600, lineHeight: 1.6, margin: '14px 0 10px', color: 'var(--color-pg-text)' }}>{t.proof_quote}</p>
                    <p style={{ fontSize: '13px', color: 'var(--color-pg-text-muted)', margin: 0 }}>{t.proof_quote_by}</p>
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
                    backgroundColor: 'var(--color-pg-surface)',
                    border: '1px solid rgba(99,102,241,0.35)',
                    borderRadius: '22px',
                    padding: '36px 32px',
                    boxShadow: '0 20px 60px -20px rgba(99,102,241,0.3)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em' }}>Gratis</span>
                        <span style={{ fontSize: '15px', color: 'var(--color-pg-text-muted)' }}>30 hari</span>
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--color-pg-text-secondary)', margin: '0 0 22px' }}>{t.price_feature_label}</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {t.price_features.map((f, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', color: 'var(--color-pg-text)' }}>
                                <span style={{ color: 'var(--color-pg-success)', display: 'grid', placeItems: 'center' }}><Check size={17} /></span>
                                {f}
                            </li>
                        ))}
                    </ul>
                    <Link href="/register" style={{
                        display: 'flex', width: '100%', justifyContent: 'center',
                        backgroundColor: 'var(--color-pg-primary)',
                        color: '#fff', fontWeight: 700, fontSize: '16px',
                        padding: '15px', borderRadius: '12px', textDecoration: 'none',
                        alignItems: 'center', gap: '8px',
                        boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
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
                                backgroundColor: 'var(--color-pg-surface)',
                                border: '1px solid var(--color-pg-border)',
                                borderRadius: '14px',
                                overflow: 'hidden',
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
                                        color: 'var(--color-pg-text)',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    {f.q}
                                    <span style={{
                                        color: 'var(--color-pg-primary-hover)',
                                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s',
                                        flexShrink: 0,
                                    }}><ChevronDownIcon /></span>
                                </button>
                                {open && (
                                    <div style={{ padding: '0 20px 18px', fontSize: '14px', color: 'var(--color-pg-text-secondary)', lineHeight: 1.6 }}>
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
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.06) 100%)',
                    border: '1px solid rgba(99,102,241,0.35)',
                    borderRadius: '24px',
                    padding: '52px 28px',
                    textAlign: 'center',
                }}>
                    <h2 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px' }}>{t.final_title}</h2>
                    <p style={{ fontSize: '16px', color: 'var(--color-pg-text-secondary)', margin: '0 auto 28px', maxWidth: '520px', lineHeight: 1.55 }}>{t.final_sub}</p>
                    <Link href="/register" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        backgroundColor: 'var(--color-pg-primary)', color: '#fff',
                        fontWeight: 700, fontSize: '16px', padding: '16px 32px',
                        borderRadius: '12px', textDecoration: 'none',
                        boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <span style={{
                                width: '28px', height: '28px', borderRadius: '8px',
                                background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                                display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '14px', color: '#fff',
                            }}>P</span>
                            <span style={{ fontWeight: 800, fontSize: '15px' }}>POgrid.id</span>
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
                </div>
                <div style={{
                    borderTop: '1px solid var(--color-pg-border)',
                    padding: '18px 20px',
                    textAlign: 'center',
                    fontSize: '12.5px',
                    color: 'var(--color-pg-text-muted)',
                }}>
                    © {new Date().getFullYear()} POgrid.id — Dibuat untuk bengkel manufaktur Indonesia.
                </div>
            </footer>

            <style>{`
                @media (min-width: 860px) {
                    .pg-nav-desktop { display: flex !important; }
                }
            `}</style>
        </div>
    );
}

const navLink: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-pg-text-secondary)',
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
};

const sub: React.CSSProperties = {
    fontSize: '15px',
    color: 'var(--color-pg-text-secondary)',
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
