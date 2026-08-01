import React, { useState, useEffect, useRef } from 'react';
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
    hero_note: '✓ Tanpa kartu kredit    ✓ Tanpa instalasi app    ✓ Setup kurang dari 5 menit',
    hero_stat_1: '100%',
    hero_stat_1_label: 'Visibilitas progress real-time',
    hero_stat_2: '3 Menit',
    hero_stat_2_label: 'Setup pabrik & PO pertama',
    hero_stat_3: '0',
    hero_stat_3_label: 'Instalasi aplikasi (cukup browser)',
    hero_stat_4: '30 Hari',
    hero_stat_4_label: 'Uji coba gratis, tanpa kartu kredit',

    // Trust marquee
    marquee_label: 'Dirancang untuk lantai produksi & workshop di seluruh Indonesia',
    marquee_items: ['CNC & Machining', 'Fabrikasi & Sheet Metal', 'Stamping & Press', 'Karoseri', 'Perakitan / Assembly', 'Moulding', 'General Manufacturing', 'Workshop Engineering'],

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

    // Comparison
    compare_title: 'Kenapa bukan Spreadsheet atau WhatsApp?',
    compare_sub: 'Mengandalkan Excel & grup chat untuk kontrol produksi itu mahal secara tersembunyi — dan sangat berisiko.',
    compare_cols: ['Spreadsheet / WA', 'POgrid.id'],
    compare_rows: [
        { label: 'Update progress dari lantai produksi', bad: 'Manual, harus diinput ulang oleh staf kantor', good: 'Operator sendiri input via HP, 3 detik' },
        { label: 'Status PO otomatis (Aman / Rawan / Delay)', bad: 'Harus dihitung & diinterpretasi manual', good: 'Otomatis terhitung dari data real-time' },
        { label: 'Peringatan dini sebelum tenggat kirim', bad: 'Tidak ada — telat baru ketahuan', good: 'Alert otomatis saat tahapan macet' },
        { label: 'Visibilitas tiap tahapan kerja', bad: 'Tergantung update file yang bisa basi', good: 'Lintas Drafter → Machining → QC → Kirim' },
        { label: 'Operator tanpa email & password', bad: 'Operator tidak punya akses sama sekali', good: 'Login PIN 4 digit di kiosk lantai' },
        { label: 'Data pabrik Anda terisolasi & aman', bad: 'File bertebaran di HP & laptop pribadi', good: 'Multi-tenant terisolasi penuh (row-level)' },
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
    proof_quote_by: 'Pak Hendra — Owner Workshop Fabrikasi & Machining, Cikarang',

    testimonials: [
        { name: 'Hendra Gunawan', role: 'Owner Workshop Fabrikasi & Machining', initial: 'HG', quote: 'Dulu tiap jam 4 sore saya keliling bengkel nanya satu-satu barang yang sudah selesai QC. Sekarang sambil luar kota pun saya tahu persis PO mana yang siap kirim.' },
        { name: 'Ratna Kusuma', role: 'Owner Workshop Stamping & Press', initial: 'RK', quote: 'Dulu saya baru tahu order telat pas barang mau dimuat. Sekarang warning sudah masuk sejak tahapan machining berjalan lambat. Beda banget.' },
        { name: 'Dedi Firmansyah', role: 'General Manager, Fabrikasi Baja', initial: 'DF', quote: 'Operator yang gaptek pun bisa pakai. PIN 4 digit, ketik angka, selesai. Data masuk ke dashboard tanpa saya harus keliling lantai.' },
    ],

    // Trust band
    trust_items: [
        { t: 'Row-Level Security', d: 'Data tiap pabrik terisolasi penuh antar tenant.' },
        { t: 'Cloud Aman & Terenkripsi', d: 'Tersimpan aman di cloud dengan backup otomatis.' },
        { t: 'Setup Kurang dari 5 Menit', d: 'Tanpa konsultan & kontrak panjang, langsung pakai.' },
        { t: 'Tanpa Kartu Kredit', d: 'Uji coba gratis 30 hari, upgrade kapan pun.' },
    ],

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
        { q: 'Apakah ini software ERP atau akuntansi pabrik?', a: 'Bukan. POgrid.id fokus 100% pada pelacakan progress Purchase Order and ketepatan pengiriman (On-Time Delivery). Kami sengaja tidak membebani Anda dengan modul akuntansi atau stok bahan baku yang rumit agar sistem bisa langsung dipakai hari ini.' },
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

/* ============================================================
   Motion primitives
   ============================================================ */

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }> = ({ children, delay = 0, className = '', style }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        setShown(true);
                        obs.disconnect();
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`reveal ${shown ? 'reveal-visible' : ''} ${className}`}
            style={{ transitionDelay: `${delay}ms`, ...style }}
        >
            {children}
        </div>
    );
};

const CountUp: React.FC<{ end: number; prefix?: string; suffix?: string; decimals?: number; duration?: number; className?: string }> = ({
    end, prefix = '', suffix = '', decimals = 0, duration = 1500, className = '',
}) => {
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);
    const [val, setVal] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting && !started.current) {
                        started.current = true;
                        const start = performance.now();
                        const tick = (now: number) => {
                            const p = Math.min(1, (now - start) / duration);
                            const eased = 1 - Math.pow(1 - p, 3);
                            setVal(end * eased);
                            if (p < 1) requestAnimationFrame(tick);
                        };
                        requestAnimationFrame(tick);
                        obs.disconnect();
                    }
                });
            },
            { threshold: 0.4 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [end, duration]);

    return (
        <span ref={ref} className={className}>
            {prefix}
            {val.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
            {suffix}
        </span>
    );
};

const SectionHead: React.FC<{ eyebrow: string; title: React.ReactNode; sub?: string }> = ({ eyebrow, title, sub }) => (
    <Reveal className="max-w-2xl mx-auto text-center mb-14 md:mb-20">
        <span className="inline-flex items-center gap-2 text-[11px] md:text-xs font-bold uppercase tracking-[0.22em] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1 h-1 rounded-full bg-indigo-400" />
            {eyebrow}
        </span>
        <h2 className="landing-display text-3xl md:text-[44px] leading-[1.1] font-bold text-white mb-5">{title}</h2>
        {sub && <p className="text-sm md:text-base text-zinc-400 leading-relaxed">{sub}</p>}
    </Reveal>
);

/* ============================================================
   Icons
   ============================================================ */

type IconProps = { className?: string; size?: number };

const ArrowRight: React.FC<IconProps> = ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const PlayCircle: React.FC<IconProps> = ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
);

const MenuIcon: React.FC<IconProps> = ({ size = 20, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className}>
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
);

const CloseIcon: React.FC<IconProps> = ({ size = 20, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className}>
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
);

const Check: React.FC<IconProps> = ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const Cross: React.FC<IconProps> = ({ size = 14, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className}>
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
);

const WhatsAppIcon: React.FC<IconProps> = ({ size = 18, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
);

const StarRow: React.FC = () => (
    <div className="flex gap-1 justify-center">
        {[0, 1, 2, 3, 4].map((i) => (
            <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
        ))}
    </div>
);

const CncIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        <path d="M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0 -6 0" />
        <path d="M7.5 7.5l9 9" />
    </svg>
);

const FabrikasiIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        <circle cx="15" cy="21" r="1" fill="currentColor" />
        <circle cx="9" cy="3" r="1" fill="currentColor" />
    </svg>
);

const PerakitanIcon: React.FC<IconProps> = ({ className, size = 40 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M12 6v6l4 2" />
        <circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
    </svg>
);

const DashboardIcon: React.FC<IconProps> = ({ className, size = 22 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
);

const PinIcon: React.FC<IconProps> = ({ className, size = 22 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const AlertIcon: React.FC<IconProps> = ({ className, size = 22 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const TvIcon: React.FC<IconProps> = ({ className, size = 22 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

const ErpIcon: React.FC<IconProps> = ({ className, size = 22 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
);

const LockIcon: React.FC<IconProps> = ({ className, size = 22 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const ShieldIcon: React.FC<IconProps> = ({ className, size = 22 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

const ServerIcon: React.FC<IconProps> = ({ className, size = 22 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
);

const ClockIcon: React.FC<IconProps> = ({ className, size = 22 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const CardIcon: React.FC<IconProps> = ({ className, size = 22 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
        <path d="M5 14h4" />
    </svg>
);

const QuoteIcon: React.FC<IconProps> = ({ className, size = 28 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.583 17.321C8.553 16.227 8 15 8 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm-8 0C.553 16.227 0 15 0 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C6.409 11.678 7.83 13.159 7.83 15a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
    </svg>
);

const ChevronDownIcon: React.FC<IconProps> = ({ size = 18, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

function hrefFor(i: number): string {
    const map = ['#fitur', '#cara', '#harga', '#faq'];
    return map[i] ?? '#';
}

const NAV_LINKS = [
    { label: 'Fitur', href: '#fitur' },
    { label: 'Cara Kerja', href: '#cara' },
    { label: 'Harga', href: '#harga' },
    { label: 'FAQ', href: '#faq' },
];

/* ============================================================
   Main page
   ============================================================ */

export default function Landing() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const t = id;

    // Interactive Simulator States
    const [simPin, setSimPin] = useState<string>('');
    const [simStep, setSimStep] = useState<'pin' | 'update' | 'success'>('pin');
    const [simProgress, setSimProgress] = useState<number>(60);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [showLaser, setShowLaser] = useState<boolean>(false);
    const [poStatus, setPoStatus] = useState<'rawan' | 'aman'>('rawan');
    const [activityFeed, setActivityFeed] = useState<string>('QC Station checked — OK: 48, NG: 2');

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 40) setScrolled(true);
            else setScrolled(false);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleNumClick = (num: string) => {
        if (simPin.length < 4) {
            const nextPin = simPin + num;
            setSimPin(nextPin);
            if (nextPin.length === 4) {
                setTimeout(() => setSimStep('update'), 400);
            }
        }
    };

    const handleClearPin = () => setSimPin('');

    const triggerUpdateSend = () => {
        setIsSending(true);
        setShowLaser(true);
        setTimeout(() => {
            setShowLaser(false);
            setIsSending(false);
            setSimStep('success');
            setPoStatus('aman');
            setActivityFeed('Joko Susilo menyelesaikan Welder (10/10) — Baru saja');
        }, 800);
    };

    const resetSimulator = () => {
        setSimPin('');
        setSimStep('pin');
        setSimProgress(60);
        setPoStatus('rawan');
        setActivityFeed('QC Station checked — OK: 48, NG: 2');
        setIsSending(false);
        setShowLaser(false);
    };

    const metrics = [
        { end: 100, prefix: '', suffix: '%', label: 'Visibilitas progress real-time' },
        { end: 3, prefix: '', suffix: ' Menit', label: 'Setup pabrik & PO pertama' },
        { end: 0, prefix: '', suffix: '', label: 'Instalasi app — cukup browser' },
        { end: 30, prefix: '', suffix: ' Hari', label: 'Uji coba gratis tanpa kartu kredit' },
    ];

    const trustIcons = [<ShieldIcon className="text-indigo-400" />, <ServerIcon className="text-indigo-400" />, <ClockIcon className="text-indigo-400" />, <CardIcon className="text-indigo-400" />];

    const featureIcons = [<DashboardIcon className="text-indigo-400" />, <PinIcon className="text-indigo-400" />, <AlertIcon className="text-indigo-400" />, <TvIcon className="text-indigo-400" />, <ErpIcon className="text-indigo-400" />, <LockIcon className="text-indigo-400" />];

    const sectorIcons = [
        <CncIcon className="text-indigo-400" />,
        <FabrikasiIcon className="text-indigo-400" />,
        <PerakitanIcon className="text-indigo-400" />,
    ];

    return (
        <div className="min-h-screen bg-[#05070c] text-zinc-100 font-sans antialiased relative overflow-x-hidden selection:bg-indigo-500/40 selection:text-white landing-root">
            <Head>
                {/* Primary Title & Meta */}
                <title>POgrid.id — Sistem Pelacakan PO & Kontrol Produksi Pabrik Real-Time</title>
                <meta name="title" content="POgrid.id — Sistem Pelacakan PO & Kontrol Produksi Pabrik Real-Time" />
                <meta name="description" content="Stop kejar-kejar Tim PPIC. Pantau progress Purchase Order pabrik CNC, fabrikasi, dan machining dari HP secara real-time. Bebas denda keterlambatan kirim. Coba gratis 30 hari." />
                <meta name="keywords" content="sistem pelacakan PO pabrik, software kontrol produksi, tracking progress workshop CNC, aplikasi fabrikasi logam, manajemen purchase order manufaktur, POgrid Indonesia" />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://pogrid.id/" />

                {/* Fonts */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

                {/* Open Graph / Facebook / WhatsApp Preview */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://pogrid.id/" />
                <meta property="og:title" content="POgrid.id — Pantau Progress PO Pabrik Langsung dari HP (Real-Time)" />
                <meta property="og:description" content="Operator update via HP pakai PIN 4 digit, Owner pantau status order aman/delay di dashboard. Tanpa ribet jika instalasi ERP." />
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

            {/* ===== Global background layers ===== */}
            <div className="fixed inset-0 -z-10 pointer-events-none">
                <div className="absolute inset-0 landing-grid" />
                <div className="aurora" style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.28), transparent)', width: 640, height: 640, top: '-180px', left: '-120px', animationDelay: '0s' }} />
                <div className="aurora" style={{ background: 'radial-gradient(closest-side, rgba(56,189,248,0.16), transparent)', width: 560, height: 560, top: '20%', right: '-180px', animationDelay: '-5s' }} />
                <div className="aurora" style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.14), transparent)', width: 700, height: 700, bottom: '-200px', left: '30%', animationDelay: '-10s' }} />
                <div className="absolute inset-0 landing-noise" />
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(99,102,241,0.10), transparent 55%)' }} />
            </div>

            {/* ===== NAV ===== */}
            <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'landing-nav-scrolled py-3' : 'py-5'}`}>
                <div className="max-w-[1200px] mx-auto px-4 md:px-6 flex items-center justify-between gap-6">
                    <Link href="/" className="flex items-center text-decoration-none group">
                        <img
                            src="/pogrid-logo.png"
                            alt="POgrid.id Logo"
                            style={{
                                height: scrolled ? '38px' : '46px',
                                width: 'auto',
                                objectFit: 'contain',
                                transition: 'height 0.3s ease',
                            }}
                        />
                    </Link>

                    <nav className="hidden lg:flex items-center gap-8">
                        {NAV_LINKS.map((l) => (
                            <a key={l.href} href={l.href} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200 relative nav-link">
                                {l.label}
                            </a>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
                        <a
                            href={WA_DEMO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden lg:inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 border border-emerald-500/25 bg-emerald-500/[0.06] hover:bg-emerald-500/10 px-4 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap"
                        >
                            <WhatsAppIcon size={15} /> {t.nav_demo}
                        </a>

                        <a
                            href={appUrl('/login')}
                            className="hidden md:inline-block text-sm font-semibold text-zinc-300 hover:text-white px-3 py-2 transition-colors duration-200 whitespace-nowrap"
                        >
                            {t.login}
                        </a>

                        <a
                            href={appUrl('/register')}
                            className="hidden md:inline-flex items-center gap-2 btn-primary text-white font-bold text-sm px-4.5 py-2.5 rounded-xl whitespace-nowrap"
                        >
                            {t.cta}
                            <ArrowRight size={14} />
                        </a>

                        <button
                            type="button"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-200"
                            aria-label="Menu"
                        >
                            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                <div className={`lg:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[420px]' : 'max-h-0'}`}>
                    <div className="mx-4 mt-3 mb-4 p-5 rounded-2xl border border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl flex flex-col gap-1">
                        {NAV_LINKS.map((l) => (
                            <a
                                key={l.href}
                                href={l.href}
                                onClick={() => setMobileOpen(false)}
                                className="px-3 py-3 rounded-lg text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
                            >
                                {l.label}
                            </a>
                        ))}
                        <div className="mt-3 pt-4 border-t border-zinc-800/80 flex flex-col gap-2.5">
                            <a href={appUrl('/register')} onClick={() => setMobileOpen(false)} className="btn-primary text-white font-bold text-sm py-3 rounded-xl text-center flex items-center justify-center gap-2">
                                {t.cta}
                                <ArrowRight size={14} />
                            </a>
                            <a href={appUrl('/login')} onClick={() => setMobileOpen(false)} className="text-sm font-semibold text-zinc-300 py-2.5 rounded-xl text-center border border-zinc-800 hover:bg-zinc-900 transition-colors">
                                {t.login}
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            {/* ===== HERO ===== */}
            <section className="relative max-w-[1200px] mx-auto px-4 md:px-6 pt-8 lg:pt-14 pb-16 md:pb-24 z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

                    {/* Hero Copy (Left) */}
                    <div className="lg:col-span-6 text-left flex flex-col items-start">
                        <Reveal>
                            <span className="inline-flex items-center gap-2.5 text-xs font-semibold text-zinc-300 bg-white/[0.04] border border-white/10 rounded-full pl-2 pr-4 py-1.5 mb-7">
                                <span className="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                    <span className="relative flex w-1.5 h-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-400" />
                                    </span>
                                    #1
                                </span>
                                {t.eyebrow}
                            </span>
                        </Reveal>

                        <Reveal delay={80}>
                            <h1 className="landing-display text-[40px] md:text-[56px] leading-[1.05] font-bold tracking-tight mb-6">
                                <span className="text-white">Stop Kejar-Kejar Tim PPIC.</span>
                                <br />
                                <span className="text-gradient bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300">Pantau Progress PO Pabrik</span>
                                <br />
                                <span className="text-white">Real-Time.</span>
                            </h1>
                        </Reveal>

                        <Reveal delay={160}>
                            <p className="text-base md:text-lg text-zinc-400 font-normal leading-relaxed mb-9 max-w-xl">
                                Operator input progres pengerjaan lewat HP pakai <span className="text-white font-semibold">PIN 4 digit</span>. Owner pantau mana PO yang <span className="text-emerald-400 font-semibold">Aman</span>, <span className="text-amber-400 font-semibold">Rawan</span>, atau bakal <MarkerUnderline>Kena Pinalti Telat Kirim</MarkerUnderline>.
                            </p>
                        </Reveal>

                        <Reveal delay={240}>
                            <div className="flex flex-wrap items-center gap-4 w-full mb-5">
                                <a
                                    href={appUrl('/register')}
                                    className="btn-primary inline-flex items-center justify-center gap-2.5 whitespace-nowrap text-white font-bold text-sm md:text-base px-7 py-4 rounded-xl"
                                >
                                    {t.hero_cta_primary}
                                    <ArrowRight size={17} />
                                </a>

                                <a
                                    href={WA_DEMO_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2.5 whitespace-nowrap text-white font-bold text-sm md:text-base px-7 py-4 rounded-xl btn-secondary-emerald"
                                >
                                    <WhatsAppIcon size={18} />
                                    {t.hero_cta_demo}
                                </a>

                                <a
                                    href="#cara"
                                    className="inline-flex items-center justify-center gap-2.5 whitespace-nowrap border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 hover:text-white font-semibold text-sm md:text-base px-6 py-4 rounded-xl active:scale-[0.98] transition-all duration-200"
                                >
                                    <PlayCircle size={17} />
                                    {t.hero_cta_secondary}
                                </a>
                            </div>
                        </Reveal>

                        <Reveal delay={300}>
                            <p className="text-[12px] text-zinc-500 mb-10 w-full flex flex-wrap gap-x-5 gap-y-1">
                                {t.hero_note.split(/\s{3,}/).filter(Boolean).map((n, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5">
                                        <span className="text-emerald-400"><Check size={12} /></span>
                                        {n}
                                    </span>
                                ))}
                            </p>
                        </Reveal>

                        <Reveal delay={360} className="w-full">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="flex -space-x-2.5">
                                    {['HG', 'RK', 'DF', 'JS'].map((ini, i) => (
                                        <div
                                            key={ini}
                                            className="w-8 h-8 rounded-full border-2 border-[#05070c] bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[9px] font-bold flex items-center justify-center"
                                            style={{ zIndex: 10 - i }}
                                        >
                                            {ini}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-left">
                                    <StarRow />
                                    <p className="text-[11px] text-zinc-500 mt-0.5">Dipercaya owner workshop & pabrik di Indonesia</p>
                                </div>
                            </div>
                        </Reveal>

                        {/* Stats */}
                        <Reveal delay={420} className="w-full">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full border-t border-white/[0.06] pt-8">
                                {[
                                    { v: t.hero_stat_1, l: t.hero_stat_1_label },
                                    { v: t.hero_stat_2, l: t.hero_stat_2_label },
                                    { v: t.hero_stat_3, l: t.hero_stat_3_label },
                                    { v: t.hero_stat_4, l: t.hero_stat_4_label },
                                ].map((s, i) => (
                                    <div key={i}>
                                        <div className="landing-display text-xl md:text-2xl font-bold text-white tracking-tight">{s.v}</div>
                                        <div className="text-[11px] text-zinc-500 mt-1 leading-snug">{s.l}</div>
                                    </div>
                                ))}
                            </div>
                        </Reveal>
                    </div>

                    {/* Interactive Dual-Monitor Demo Simulator (Right) */}
                    <div className="lg:col-span-6 relative flex items-center justify-center lg:justify-end w-full sm:min-h-[440px] lg:min-h-[500px] pt-2 lg:pt-0">
                        <Reveal delay={200} style={{ transform: 'none' }} className="w-full flex items-center justify-center lg:justify-end">

                        {showLaser && (
                            <div className="absolute inset-0 pointer-events-none z-50 hidden lg:block">
                                <div className="laser-particle laser-active absolute right-[170px] bottom-[140px]" />
                            </div>
                        )}

                        {/* Back Element: Owner Dashboard Console */}
                        <div className="dashboard-mockup relative z-10 w-full max-w-[500px] bg-[#0a0e18] border border-white/[0.08] rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden transition-all duration-300">
                            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                                <div className="mx-auto w-[60%] h-4.5 rounded bg-[#05070c] border border-white/[0.06] text-[9px] text-zinc-500 flex items-center justify-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    app.pogrid.id/dashboard
                                </div>
                            </div>

                            <div className="p-3.5 grid grid-cols-12 gap-3 min-h-[290px]">
                                <div className="col-span-3 border-r border-white/[0.06] pr-2 flex flex-col gap-1.5">
                                    <div className="landing-display font-bold text-[10px] text-indigo-400 tracking-wider mb-1.5">POgrid.id</div>
                                    <div className="w-full h-5 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center px-1.5 text-[8.5px] text-indigo-200 font-semibold">Dashboard</div>
                                    <div className="w-full h-5 rounded flex items-center px-1.5 text-[8.5px] text-zinc-500">Purchase Orders</div>
                                    <div className="w-full h-5 rounded flex items-center px-1.5 text-[8.5px] text-zinc-500">Trouble Alerts</div>
                                    <div className="w-full h-5 rounded flex items-center px-1.5 text-[8.5px] text-zinc-500">Performance</div>
                                </div>

                                <div className="col-span-9 flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[7.5px] text-zinc-500 uppercase tracking-widest block font-bold">CLIENT TRACKER</span>
                                            <span className="text-[11px] font-bold text-zinc-100">PT Astra Otoparts</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[7.5px] text-zinc-500 block">KODE PO</span>
                                            <span className="text-[10px] font-bold text-zinc-300">PO-2026-089</span>
                                        </div>
                                    </div>

                                    <div className="border border-white/[0.07] bg-white/[0.02] rounded-xl p-2.5 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] text-zinc-400 font-medium">Progress Pengerjaan Item:</span>
                                            {poStatus === 'rawan' ? (
                                                <span className="text-[8.5px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                                    ⚡ Rawan (Welder Delay)
                                                </span>
                                            ) : (
                                                <span className="text-[8.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                                    On Track (Aman)
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between text-[8px] text-zinc-400">
                                                <span>1. Milling & Turning</span>
                                                <span className="text-emerald-400 font-bold">100%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 w-full rounded-full" />
                                            </div>

                                            <div className="flex items-center justify-between text-[8px] text-zinc-400">
                                                <span>2. CNC Router</span>
                                                <span className="text-emerald-400 font-bold">100%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 w-full rounded-full" />
                                            </div>

                                            <div className="flex items-center justify-between text-[8px] text-zinc-400">
                                                <span>3. Welder & Joining</span>
                                                <span className={`font-bold transition-colors duration-300 ${simProgress === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                    {simProgress}%
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${simProgress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${simProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/[0.02] border border-white/[0.06] p-2 rounded-lg">
                                        <div className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Aktivitas Terakhir:</div>
                                        <div className="flex items-center gap-1.5 text-[8.5px] text-zinc-200">
                                            <span className={`w-1.5 h-1.5 rounded-full ${poStatus === 'aman' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                                            <span className="transition-all duration-300">{activityFeed}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Front Element: iPhone 15 Pro Hardware Frame */}
                        <div className="phone-mockup-wrapper absolute -right-3 -bottom-6 z-20 w-[215px] md:w-[230px] floating-mock hidden sm:block transition-all duration-300">
                            <div className="relative w-full aspect-[9/18.5] bg-[#070a12] border-[5px] border-zinc-800 rounded-[32px] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden">
                                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-30 flex items-center justify-end px-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-900/90 shadow-[inset_0_0_2px_rgba(255,255,255,0.4)]" />
                                </div>

                                <div className="w-full h-full bg-[#0b0f19] rounded-[24px] overflow-hidden flex flex-col p-3 pt-7 select-none">
                                    <div className="flex items-center justify-between text-[8px] text-zinc-400 font-bold mb-2">
                                        <span>09:41</span>
                                        <div className="flex items-center gap-1">
                                            <span>📶</span>
                                            <div className="w-3.5 h-1.7 border border-zinc-400 rounded-sm p-0.5">
                                                <div className="h-full bg-emerald-500 w-[70%]" />
                                            </div>
                                        </div>
                                    </div>

                                    {simStep === 'pin' && (
                                        <div className="flex-1 flex flex-col justify-between pt-1">
                                            <div className="text-center">
                                                <span className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-widest block mb-0.5">FLOOR TERMINAL</span>
                                                <h4 className="text-[11px] font-black text-zinc-100">Kiosk PIN Operator</h4>

                                                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-1.5 my-2 text-left">
                                                    <span className="text-[7px] text-zinc-500 block">NAMA OPERATOR:</span>
                                                    <span className="text-[9px] font-bold text-zinc-200">Joko Susilo (Welding)</span>
                                                </div>

                                                <div className="text-[8.5px] text-zinc-400 mt-2">Masukkan 4-Digit PIN Anda:</div>

                                                <div className="flex justify-center gap-2.5 my-2.5">
                                                    {[0, 1, 2, 3].map((i) => (
                                                        <div
                                                            key={i}
                                                            className={`w-2.5 h-2.5 rounded-full border transition-all duration-200 ${
                                                                simPin.length > i
                                                                    ? 'bg-indigo-400 border-indigo-400 scale-110 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                                                                    : 'border-zinc-700 bg-transparent'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/[0.03] rounded-xl border border-white/[0.08] mb-1">
                                                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                                                    <button
                                                        key={n}
                                                        onClick={() => handleNumClick(n)}
                                                        className="h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 text-[10px] font-bold active:scale-95 active:bg-indigo-600 transition-all flex items-center justify-center"
                                                    >
                                                        {n}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={handleClearPin}
                                                    className="h-8 rounded-lg bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 text-red-400 text-[9.5px] font-extrabold flex items-center justify-center"
                                                >
                                                    C
                                                </button>
                                                <button
                                                    onClick={() => handleNumClick('0')}
                                                    className="h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 text-[10px] font-bold flex items-center justify-center"
                                                >
                                                    0
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (simPin.length === 4) setSimStep('update');
                                                    }}
                                                    className="h-8 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-[9.5px] font-extrabold flex items-center justify-center"
                                                >
                                                    OK
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {simStep === 'update' && (
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between mb-3 border-b border-white/[0.08] pb-2">
                                                    <span className="text-[10px] font-extrabold text-zinc-100">Update Welder</span>
                                                    <span className="text-[8.5px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Joko S.</span>
                                                </div>

                                                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-2.5 text-left mb-3">
                                                    <span className="text-[7px] text-zinc-500 block uppercase font-bold">Purchase Order</span>
                                                    <span className="text-[9.5px] font-bold text-zinc-200 block">PO-2026-089</span>
                                                    <span className="text-[8.5px] text-zinc-400">PT Astra Otoparts</span>
                                                </div>

                                                <div className="mb-4">
                                                    <div className="flex items-center justify-between text-[9px] text-zinc-300 font-bold mb-1.5">
                                                        <span>Progres Welder:</span>
                                                        <span>{simProgress === 100 ? '10 / 10' : simProgress === 80 ? '8 / 10' : '6 / 10'} Unit</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-300 ${simProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                            style={{ width: `${simProgress}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() => setSimProgress(80)}
                                                        className={`w-full py-2.5 rounded-lg border text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                                                            simProgress === 80
                                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                                                                : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] text-zinc-300'
                                                        }`}
                                                    >
                                                        <span>+2 Unit (Capai 80%)</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setSimProgress(100)}
                                                        className={`w-full py-2.5 rounded-lg border text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                                                            simProgress === 100
                                                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg'
                                                                : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] text-zinc-300'
                                                        }`}
                                                    >
                                                        <span>🏁 Selesaikan (Capai 100%)</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <button
                                                    onClick={triggerUpdateSend}
                                                    disabled={isSending}
                                                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-none rounded-xl text-[10.5px] font-black text-center shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.5)] active:scale-98 cursor-pointer flex items-center justify-center gap-1"
                                                >
                                                    {isSending ? 'Mengirim...' : '🚀 Kirim Update Real-Time'}
                                                </button>
                                                <button
                                                    onClick={resetSimulator}
                                                    className="w-full py-2 bg-transparent hover:bg-zinc-900 text-[8.5px] text-zinc-500 border-none font-semibold text-center"
                                                >
                                                    Kembali ke PIN
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {simStep === 'success' && (
                                        <div className="flex-1 flex flex-col justify-between text-center pt-4">
                                            <div className="flex-1 flex flex-col items-center justify-center">
                                                <div className="w-13 h-13 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center mb-4">
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                </div>
                                                <h4 className="text-[12.5px] font-extrabold text-white mb-2">Update Terkirim!</h4>
                                                <p className="text-[9.5px] text-zinc-400 leading-relaxed px-1">
                                                    Progres Welder diperbarui ke <span className="text-emerald-400 font-bold">{simProgress}%</span> secara instan di dashboard Owner.
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <button
                                                    onClick={resetSimulator}
                                                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl text-[10px] font-black"
                                                >
                                                    🔄 Reset Demo Kiosk
                                                </button>
                                                <span className="text-[7.5px] text-zinc-500">Lihat perubahan status PO di monitor sebelah kiri!</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ===== TRUST MARQUEE ===== */}
            <section className="relative z-10 border-y border-white/[0.05] bg-white/[0.015] py-7 overflow-hidden">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-500 text-center mb-5">
                    {t.marquee_label}
                </p>
                <div className="marquee-mask">
                    <div className="marquee-track flex items-center gap-0 w-max">
                        {[...t.marquee_items, ...t.marquee_items].map((m, i) => (
                            <span key={i} className="inline-flex items-center gap-3 mx-5 text-sm md:text-base font-semibold text-zinc-500 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rotate-45 bg-indigo-500/40" />
                                {m}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== METRICS BAND ===== */}
            <section className="relative max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-24 z-10">
                <Reveal>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                        {metrics.map((m, i) => (
                            <div key={i} className="bg-[#070a12] px-6 py-9 md:px-8 text-center group relative overflow-hidden">
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="landing-display text-4xl md:text-[44px] font-bold text-white tracking-tight mb-2">
                                    <CountUp end={m.end} prefix={m.prefix} suffix={m.suffix} />
                                </div>
                                <div className="text-[12px] md:text-[13px] text-zinc-500 leading-snug">{m.label}</div>
                            </div>
                        ))}
                    </div>
                </Reveal>
            </section>

            {/* ===== PAIN SECTION ===== */}
            <section className="relative max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-24 z-10">
                <SectionHead eyebrow="Masalah Nyata" title={t.pain_title} sub={t.pain_sub} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-14">
                    {t.pain_items.map((p, i) => (
                        <Reveal key={i} delay={i * 70}>
                            <div className="group relative h-full bg-white/[0.02] border border-white/[0.07] hover:border-indigo-500/30 rounded-2xl p-7 md:p-8 transition-all duration-300 hover:bg-white/[0.03] overflow-hidden">
                                <div className="absolute -top-6 -right-6 text-[88px] font-bold text-white/[0.025] leading-none pointer-events-none select-none landing-display">0{i + 1}</div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold">
                                        {i + 1}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Tantangan</span>
                                </div>
                                <h3 className="text-base md:text-lg font-bold text-zinc-100 mb-3 leading-snug">{p.q}</h3>
                                <p className="text-sm text-zinc-400 leading-relaxed">{p.a}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>

                <Reveal>
                    <div className="relative max-w-3xl mx-auto rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/[0.08] via-indigo-500/[0.04] to-transparent p-7 md:p-8 text-center overflow-hidden">
                        <div className="absolute inset-0 -z-0" style={{ background: 'radial-gradient(circle at 20% 0%, rgba(99,102,241,0.15), transparent 50%)' }} />
                        <p className="relative text-sm md:text-base font-semibold text-indigo-200 leading-relaxed">
                            {t.pain_solution}
                        </p>
                    </div>
                </Reveal>
            </section>

            {/* ===== HOW IT WORKS ===== */}
            <section id="cara" className="relative max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-24 border-t border-white/[0.05] z-10">
                <SectionHead eyebrow="Cara Kerja" title={t.how_title} sub={t.how_sub} />

                <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8 items-start">
                    <div className="absolute top-[52px] left-[15%] right-[15%] h-0.5 hidden lg:block z-0 pointer-events-none">
                        <svg width="100%" height="2" fill="none" className="w-full">
                            <line x1="0%" y1="1" x2="100%" y2="1" stroke="#2a2f3f" strokeWidth="2" strokeDasharray="6 6" className="animated-pipe-line" />
                        </svg>
                    </div>

                    {t.steps.map((s, i) => (
                        <Reveal key={i} delay={i * 120}>
                            <div className="relative bg-white/[0.02] border border-white/[0.07] hover:border-indigo-500/25 rounded-2xl p-7 md:p-8 hover:bg-white/[0.03] transition-all duration-300 flex flex-col items-center text-center group h-full">
                                <div className="relative mb-7">
                                    <div className="absolute inset-0 rounded-2xl bg-indigo-500/25 blur-lg group-hover:bg-indigo-500/40 transition-all duration-300" />
                                    <div className="relative w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
                                        {s.n}
                                    </div>
                                </div>
                                <h3 className="text-base md:text-lg font-bold text-zinc-100 mb-3 group-hover:text-white transition-colors">{s.title}</h3>
                                <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>

                <Reveal>
                    <div className="text-center mt-12">
                        <p className="text-sm md:text-base text-indigo-300 font-semibold">{t.how_outcome}</p>
                    </div>
                </Reveal>
            </section>

            {/* ===== FEATURES ===== */}
            <section id="fitur" className="relative max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-24 border-t border-white/[0.05] z-10">
                <SectionHead eyebrow="Fitur" title={t.feat_title} sub={t.feat_sub} />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {t.features.map((f, i) => (
                        <Reveal key={i} delay={(i % 3) * 90}>
                            <div className="group relative h-full bg-white/[0.02] border border-white/[0.07] hover:border-indigo-500/30 rounded-2xl p-7 transition-all duration-300 hover:bg-white/[0.03] hover:-translate-y-1 overflow-hidden">
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-105 group-hover:border-indigo-500/40 transition-all duration-300">
                                    {featureIcons[i] || <Check size={18} className="text-indigo-400" />}
                                </div>
                                <h3 className="text-base font-bold text-zinc-100 mb-2 leading-snug group-hover:text-white transition-colors">{f.t}</h3>
                                <p className="text-sm text-zinc-400 leading-relaxed">{f.d}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ===== COMPARISON ===== */}
            <section className="relative max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-24 border-t border-white/[0.05] z-10">
                <SectionHead eyebrow="Perbandingan" title={t.compare_title} sub={t.compare_sub} />

                <Reveal>
                    <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.02] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                        <table className="w-full min-w-[640px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/[0.07]">
                                    <th className="py-5 px-6 text-sm font-semibold text-zinc-300 w-[34%]">Aspek</th>
                                    <th className="py-5 px-6 text-sm font-semibold text-zinc-500">
                                        <span className="inline-flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                            {t.compare_cols[0]}
                                        </span>
                                    </th>
                                    <th className="py-5 px-6 text-sm font-bold text-indigo-300 bg-indigo-500/[0.06] border-l border-white/[0.05]">
                                        <span className="inline-flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                            {t.compare_cols[1]}
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {t.compare_rows.map((r, i) => (
                                    <tr key={i} className={`border-b border-white/[0.04] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
                                        <td className="py-4 px-6 text-sm font-semibold text-zinc-200">{r.label}</td>
                                        <td className="py-4 px-6 text-sm text-zinc-500">
                                            <span className="inline-flex items-start gap-2.5">
                                                <span className="mt-0.5 w-5 h-5 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center flex-shrink-0">
                                                    <Cross size={10} className="text-red-400" />
                                                </span>
                                                {r.bad}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-zinc-300 bg-indigo-500/[0.04] border-l border-white/[0.05]">
                                            <span className="inline-flex items-start gap-2.5">
                                                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                                                    <Check size={10} className="text-emerald-400" />
                                                </span>
                                                <span className="text-zinc-200">{r.good}</span>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Reveal>
            </section>

            {/* ===== SOCIAL PROOF / SECTORS ===== */}
            <section className="relative max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-24 border-t border-white/[0.05] z-10">
                <SectionHead eyebrow="Sektor" title={t.proof_title} sub={t.proof_sub} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-14">
                    {t.proof_items.map((p, i) => (
                        <Reveal key={i} delay={i * 90}>
                            <div className="group relative h-full bg-white/[0.02] border border-white/[0.07] hover:border-indigo-500/30 rounded-2xl p-7 md:p-8 transition-all duration-300 hover:bg-white/[0.03] overflow-hidden">
                                <div className="absolute inset-0 -z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(circle at 90% 10%, rgba(99,102,241,0.12), transparent 55%)' }} />
                                <div className="flex items-start justify-between mb-6 relative">
                                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
                                        {sectorIcons[i]}
                                    </span>
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-600">Sektor 0{i + 1}</span>
                                </div>
                                <h3 className="text-base md:text-lg font-bold text-zinc-100 group-hover:text-white transition-colors mb-3">{p.t}</h3>
                                <p className="text-sm text-zinc-400 leading-relaxed">{p.d}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>

                {/* Testimonials */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {t.testimonials.map((tm, i) => (
                        <Reveal key={i} delay={i * 90}>
                            <div className="group relative h-full bg-white/[0.02] border border-white/[0.07] hover:border-indigo-500/25 rounded-2xl p-7 transition-all duration-300 hover:bg-white/[0.03] flex flex-col">
                                <QuoteIcon size={22} className="text-indigo-500/40 mb-5" />
                                <p className="text-sm md:text-[15px] text-zinc-300 leading-relaxed flex-1 italic">“{tm.quote}”</p>
                                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/[0.06]">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                        {tm.initial}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-zinc-100">{tm.name}</div>
                                        <div className="text-[11px] text-zinc-500">{tm.role}</div>
                                    </div>
                                    <div className="ml-auto"><StarRow /></div>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ===== TRUST BAND ===== */}
            <section className="relative max-w-[1200px] mx-auto px-4 md:px-6 py-8 md:py-12 z-10">
                <Reveal>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {t.trust_items.map((item, i) => (
                            <div key={i} className="flex items-start gap-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl px-5 py-5">
                                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                    {trustIcons[i]}
                                </span>
                                <div>
                                    <div className="text-sm font-bold text-zinc-100 mb-1">{item.t}</div>
                                    <div className="text-[12px] text-zinc-500 leading-snug">{item.d}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Reveal>
            </section>

            {/* ===== PRICING ===== */}
            <section id="harga" className="relative max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-24 border-t border-white/[0.05] z-10">
                <SectionHead eyebrow="Harga" title={t.price_title} sub={t.price_sub} />

                <Reveal>
                    <div className="max-w-[580px] mx-auto rounded-3xl border border-indigo-500/25 p-[1px] shadow-[0_30px_90px_rgba(0,0,0,0.6)] gradient-ring">
                        <div className="bg-[#070a12] rounded-[calc(1.5rem-1px)] p-8 md:p-11 relative overflow-hidden">
                            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 80% 0%, rgba(99,102,241,0.14), transparent 55%)' }} />
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative flex items-center justify-between mb-7">
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-1">Paket Pemula</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="landing-display text-5xl font-bold text-white tracking-tight">Gratis</span>
                                        <span className="text-sm text-zinc-500 font-medium">selama 30 hari</span>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Akses Penuh
                                </span>
                            </div>

                            <p className="relative text-sm text-zinc-400 font-medium mb-7">{t.price_feature_label}</p>

                            <ul className="relative flex flex-col gap-3.5 mb-9">
                                {t.price_features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mt-0.5">
                                            <Check size={11} className="text-indigo-300" />
                                        </span>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <a
                                href={appUrl('/register')}
                                className="btn-primary relative w-full py-4 text-white font-bold text-base rounded-xl flex items-center justify-center gap-2"
                            >
                                {t.price_cta}
                                <ArrowRight size={18} />
                            </a>
                            <p className="relative text-center text-[11px] text-zinc-600 mt-4">✓ Tanpa kartu kredit &nbsp;·&nbsp; ✓ Batalkan kapan saja</p>
                        </div>
                    </div>
                </Reveal>
            </section>

            {/* ===== FAQ ===== */}
            <section id="faq" className="relative max-w-[840px] mx-auto px-4 md:px-6 py-16 md:py-24 border-t border-white/[0.05] z-10">
                <SectionHead eyebrow="FAQ" title={t.faq_title} />

                <div className="flex flex-col gap-3.5">
                    {t.faqs.map((f, i) => {
                        const open = openFaq === i;
                        return (
                            <Reveal key={i} delay={i * 40}>
                                <div className={`bg-white/[0.02] border rounded-2xl overflow-hidden transition-all duration-300 ${open ? 'border-indigo-500/30' : 'border-white/[0.07] hover:border-white/15'}`}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaq(open ? null : i)}
                                        className="w-full text-left bg-transparent border-none cursor-pointer p-5 md:p-6 flex justify-between items-center gap-6 text-zinc-200 hover:text-white font-bold text-sm md:text-[15px]"
                                    >
                                        <span>{f.q}</span>
                                        <span className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-300 ${open ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300 rotate-180' : 'border-white/[0.08] bg-white/[0.02] text-zinc-400'}`}>
                                            <ChevronDownIcon size={15} />
                                        </span>
                                    </button>

                                    <div className={`transition-all duration-300 ease-in-out ${open ? 'max-h-[400px] opacity-100 border-t border-white/[0.06]' : 'max-h-0 opacity-0 overflow-hidden border-t border-transparent'}`}>
                                        <p className="text-xs md:text-sm text-zinc-400 leading-relaxed p-5 md:p-6">{f.a}</p>
                                    </div>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>
            </section>

            {/* ===== FINAL CTA ===== */}
            <section className="relative max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-24 z-10">
                <Reveal>
                    <div className="relative rounded-3xl border border-white/[0.08] p-[1px] overflow-hidden">
                        <div className="absolute inset-0 gradient-ring opacity-70" />
                        <div className="relative bg-[#080b14] rounded-[calc(1.5rem-1px)] p-10 md:p-20 text-center overflow-hidden">
                            <div className="absolute inset-0 pointer-events-none">
                                <div style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(99,102,241,0.25), transparent 60%)' }} className="absolute inset-0" />
                                <div className="aurora" style={{ background: 'radial-gradient(closest-side, rgba(56,189,248,0.18), transparent)', width: 500, height: 500, top: '-250px', left: '50%', transform: 'translateX(-50%)', animationDelay: '-3s' }} />
                            </div>

                            <div className="relative">
                                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-4 py-1.5 mb-7">
                                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                                    Mulai Hari Ini
                                </span>
                                <h2 className="landing-display text-3xl md:text-5xl font-bold text-white mb-5 tracking-tight">{t.final_title}</h2>
                                <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto mb-10">{t.final_sub}</p>

                                <div className="flex flex-wrap gap-4 justify-center">
                                    <a href={appUrl('/register')} className="btn-primary inline-flex items-center gap-2.5 text-white font-bold text-base px-9 py-4 rounded-xl">
                                        {t.final_cta}
                                        <ArrowRight size={18} />
                                    </a>
                                    <a
                                        href={WA_DEMO_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2.5 text-white font-bold text-base px-9 py-4 rounded-xl btn-secondary-emerald"
                                    >
                                        <WhatsAppIcon size={18} />
                                        {t.hero_cta_demo}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="relative border-t border-white/[0.06] bg-[#04060a] z-10">
                <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-5 flex flex-col items-start">
                        <img
                            src="/pogrid-logo.png"
                            alt="POgrid.id Logo"
                            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
                            className="mb-5"
                        />
                        <p className="text-xs md:text-sm text-zinc-500 leading-relaxed max-w-[320px] mb-6">{t.footer_tag}</p>
                        <div className="flex gap-3">
                            <a href={WA_DEMO_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all duration-200 flex items-center justify-center">
                                <WhatsAppIcon size={16} />
                            </a>
                            <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all duration-200 flex items-center justify-center">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                            </a>
                            <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10 transition-all duration-200 flex items-center justify-center">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                            </a>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest mb-5">{t.footer_product}</h4>
                        <ul className="flex flex-col gap-3.5">
                            {t.footer_links_product.map((l, i) => (
                                <li key={i}>
                                    <a href={hrefFor(i)} className="text-xs md:text-sm text-zinc-500 hover:text-zinc-300 transition-colors duration-200">{l}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="lg:col-span-2">
                        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest mb-5">{t.footer_company}</h4>
                        <ul className="flex flex-col gap-3.5">
                            {t.footer_links_company.map((l, i) => (
                                <li key={i}>
                                    <a href={appUrl(i === 0 ? '/login' : '/register')} className="text-xs md:text-sm text-zinc-500 hover:text-zinc-300 transition-colors duration-200">{l}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="lg:col-span-3">
                        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest mb-5">Legal</h4>
                        <ul className="flex flex-col gap-3.5">
                            <li>
                                <Link href="/terms" className="text-xs md:text-sm text-zinc-500 hover:text-zinc-300 transition-colors duration-200">Syarat & Ketentuan</Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="text-xs md:text-sm text-zinc-500 hover:text-zinc-300 transition-colors duration-200">Kebijakan Privasi</Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/[0.06] py-6 text-center text-[12.5px] text-zinc-600 px-4">
                    <div>© {new Date().getFullYear()} POgrid.id — Dibuat untuk pabrik manufaktur Indonesia.</div>
                </div>
            </footer>

            {/* ===== Landing CSS System ===== */}
            <style>{`
                .landing-root {
                    --display-font: 'Space Grotesk', 'Inter', ui-sans-serif, system-ui, sans-serif;
                }
                .landing-display {
                    font-family: var(--display-font);
                    letter-spacing: -0.02em;
                }
                .text-gradient {
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                }

                /* ---- Buttons ---- */
                .btn-primary {
                    position: relative;
                    overflow: hidden;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    box-shadow: 0 8px 28px -8px rgba(99, 102, 241, 0.6);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .btn-primary::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.30) 50%, transparent 60%);
                    transform: translateX(-160%);
                    transition: transform 0.65s ease;
                }
                .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 14px 40px -10px rgba(99, 102, 241, 0.75);
                }
                .btn-primary:hover::after { transform: translateX(160%); }
                .btn-primary:active { transform: translateY(0) scale(0.98); }

                .btn-secondary-emerald {
                    background: linear-gradient(135deg, #059669, #10b981);
                    box-shadow: 0 8px 28px -8px rgba(16, 185, 129, 0.5);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .btn-secondary-emerald:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 14px 40px -10px rgba(16, 185, 129, 0.65);
                }
                .btn-secondary-emerald:active { transform: translateY(0) scale(0.98); }

                /* ---- Gradient ring card ---- */
                .gradient-ring {
                    background: linear-gradient(135deg, rgba(99,102,241,0.55), rgba(139,92,246,0.15) 30%, rgba(56,189,248,0.15) 60%, rgba(99,102,241,0.55));
                }

                /* ---- Nav ---- */
                .landing-nav-scrolled {
                    background: rgba(5, 7, 12, 0.75);
                    backdrop-filter: blur(18px);
                    -webkit-backdrop-filter: blur(18px);
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
                }
                .nav-link::after {
                    content: '';
                    position: absolute;
                    left: 0;
                    right: 100%;
                    bottom: -6px;
                    height: 2px;
                    border-radius: 2px;
                    background: linear-gradient(90deg, #818cf8, #a78bfa);
                    transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .nav-link:hover::after { right: 0; }

                /* ---- Reveal on scroll ---- */
                .reveal {
                    opacity: 0;
                    transform: translateY(26px);
                    transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: opacity, transform;
                }
                .reveal-visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                @media (prefers-reduced-motion: reduce) {
                    .reveal { opacity: 1; transform: none; transition: none; }
                    .aurora, .marquee-track, .floating-mock, .animated-pipe-line { animation: none !important; }
                }

                /* ---- Aurora blobs ---- */
                @keyframes auroraDrift {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(50px, -40px) scale(1.12); }
                    66% { transform: translate(-40px, 30px) scale(0.92); }
                }
                .aurora {
                    position: absolute;
                    border-radius: 9999px;
                    filter: blur(90px);
                    animation: auroraDrift 18s ease-in-out infinite;
                    will-change: transform;
                    pointer-events: none;
                }

                /* ---- Grid + noise ---- */
                .landing-grid {
                    background-image:
                        linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px);
                    background-size: 44px 44px;
                    mask-image: radial-gradient(ellipse at 50% 0%, black 30%, transparent 78%);
                    -webkit-mask-image: radial-gradient(ellipse at 50% 0%, black 30%, transparent 78%);
                }
                .landing-noise {
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
                }

                /* ---- Marquee ---- */
                .marquee-mask {
                    overflow: hidden;
                    mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);
                }
                @keyframes marqueeScroll {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                .marquee-track {
                    animation: marqueeScroll 30s linear infinite;
                }
                .marquee-mask:hover .marquee-track { animation-play-state: paused; }

                /* ---- Phone float ---- */
                @keyframes pgFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-9px); }
                }
                .floating-mock { animation: pgFloat 5.5s ease-in-out infinite; }

                /* ---- Laser beam ---- */
                @keyframes laserBeam {
                    0% { transform: translate(0, 0) scale(1.6); opacity: 1; box-shadow: 0 0 12px 6px rgba(16, 185, 129, 0.8); background-color: #34d399; }
                    100% { transform: translate(-190px, -170px) scale(0.6); opacity: 0; box-shadow: 0 0 4px 1px rgba(16, 185, 129, 0.1); background-color: #34d399; }
                }
                .laser-particle { width: 12px; height: 12px; border-radius: 50%; pointer-events: none; z-index: 100; }
                .laser-active { animation: laserBeam 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }

                /* ---- Pipeline ---- */
                @keyframes dash { to { stroke-dashoffset: -40; } }
                .animated-pipe-line { stroke-dasharray: 8, 8; animation: dash 1.6s linear infinite; }

                /* ---- Mockup responsive ---- */
                @media (max-width: 1023px) {
                    .dashboard-mockup { display: none !important; }
                    .phone-mockup-wrapper {
                        position: relative !important;
                        right: auto !important;
                        bottom: auto !important;
                        margin: 0 auto;
                        transform: none !important;
                        animation: none !important;
                    }
                }

                html { scroll-behavior: smooth; }
            `}</style>
        </div>
    );
}

const MarkerUnderline: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = '#ef4444' }) => (
    <span className="relative inline-block">
        {children}
        <span
            className="absolute left-[-2px] right-[-2px] bottom-[1px] h-[7px] rounded-[3px] -z-10 skew-x-[-12deg] opacity-40"
            style={{ backgroundColor: color, backgroundImage: 'linear-gradient(90deg, rgba(239,68,68,0.85), rgba(249,115,22,0.85))' }}
        />
    </span>
);
