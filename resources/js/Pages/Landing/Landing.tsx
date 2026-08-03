import React, { useState, useEffect, useRef } from 'react';
import { Link, Head } from '@inertiajs/react';

/* ============================================================
   i18n
   ============================================================ */

type Lang = 'en' | 'id';

function detectLang(): Lang {
    if (typeof window === 'undefined') return 'en';
    try {
        const saved = window.localStorage.getItem('pogrid_landing_lang');
        if (saved === 'en' || saved === 'id') return saved;
        const nav = (window.navigator.language || '').toLowerCase();
        if (nav.startsWith('id')) return 'id';
    } catch {
        /* localStorage unavailable — fall through to default */
    }
    return 'en';
}

function appUrl(path: string): string {
    if (typeof window === 'undefined') return path;
    const search = window.location.search || '';
    if (window.location.hostname.endsWith('pogrid.id') || window.location.hostname.endsWith('www.pogrid.id')) {
        return `https://app.pogrid.id${path}${search}`;
    }
    return `${path}${search}`;
}

function waUrl(lang: Lang): string {
    const text =
        lang === 'id'
            ? 'Halo, saya berminat dengan POgrid. Saya ingin meminta demo.'
            : 'Hello, I am interested in POgrid. I would like to request a demo.';
    return `https://wa.me/628151678101?text=${encodeURIComponent(text)}`;
}

const translations = {
    en: {
        meta_title: 'POgrid.id — Real-Time PO Tracking & Production Control for Manufacturing',
        meta_desc: 'Track purchase order progress across every production stage in real time. Floor operators update from any phone with a 4-digit PIN. Owners see which orders are safe, at risk, or late — before penalties hit. Free 30-day trial.',
        meta_keywords: 'PO tracking system, production control software, manufacturing order tracking, CNC workshop software, factory floor progress tracking, purchase order management, POgrid',
        og_title: 'POgrid.id — Real-Time Factory PO Tracking from Any Phone',
        og_desc: 'Operators update via phone with a 4-digit PIN. Owners see order status and delay alerts on a live dashboard. No ERP complexity.',
        tw_title: 'POgrid.id — Production Control for Manufacturing',
        tw_desc: 'Know exactly where every order is, right now — without calling the shop floor.',
        schema_desc: 'Real-time purchase order progress tracking and on-time delivery control for manufacturing plants, CNC workshops, and fabrication facilities.',

        nav_features: 'Features',
        nav_how: 'How It Works',
        nav_price: 'Pricing',
        nav_faq: 'FAQ',
        nav_demo: 'Request Demo',
        login: 'Sign In',
        cta: 'Start Free Trial',

        hero_eyebrow: 'Real-Time PO Tracking & Production Control',
        hero_title_1: 'Know exactly where',
        hero_title_2: 'every order is.',
        hero_title_3: 'Right now.',
        hero_sub: 'Floor operators log progress from any phone with a 4-digit PIN. Owners see which POs are safe, at risk, or about to miss their delivery deadline — in real time.',
        hero_cta_primary: 'Start Free 30-Day Trial',
        hero_cta_demo: 'Request a Demo',
        hero_cta_secondary: 'See How It Works',
        hero_notes: ['No credit card required', 'No app installation', 'Setup in under 5 minutes'],
        hero_access_label: 'Early access — limited launch cohort',
        hero_access_note: 'We are onboarding a select group of factories as this is tested on real production floors.',
        hero_stats: [
            { v: '100%', l: 'Real-time progress visibility' },
            { v: '3 min', l: 'To set up your plant & first PO' },
            { v: '0', l: 'Installations — browser only' },
            { v: '30 days', l: 'Free trial, no credit card' },
        ],

        marquee_label: 'Built for production floors & workshops across Indonesia',
        marquee_items: ['CNC & Machining', 'Fabrication & Sheet Metal', 'Stamping & Press', 'Coachbuilding', 'Assembly', 'Moulding', 'General Manufacturing', 'Engineering Workshops'],

        logo_strip_label: 'Powering workshops across Indonesia',

        pain_eyebrow: 'The Problem',
        pain_title: 'The daily reality on the shop floor that keeps owners guessing',
        pain_sub: 'Every factory owner and purchasing team recognizes these situations:',
        pain_tag: 'Challenge',
        pain_items: [
            { q: '"Where is my order in the queue? Why hasn\'t it shipped?"', a: 'Your phone rings every afternoon with customer complaints — and you cannot answer confidently because floor data is still guesswork.' },
            { q: 'Discovering delays on shipping day — when the penalty is due', a: 'No early warning. Delays surface only when the truck is ready to load, ending in late-delivery penalties or cancelled orders.' },
            { q: 'Progress tracked on crumpled paper and whiteboards', a: 'Work orders get lost, damaged, or forgotten. Owners have no reliable view of actual progress on the floor.' },
            { q: 'Promising delivery dates based on gut feeling', a: 'Without real-time data per stage (cutting, turning, CNC, welding, QC), every delivery promise to a customer is a risk.' },
        ],
        pain_solution: 'POgrid.id exists for one purpose: to eliminate owner anxiety about order status — and to keep every delivery on time, free from late penalties.',

        how_eyebrow: 'How It Works',
        how_title: 'Three simple steps: operators update from the floor, owners stay informed',
        how_sub: 'No complicated computer training. Three taps from a phone at the workbench.',
        steps: [
            { n: '1', title: 'Operators log progress with a PIN (3 seconds)', desc: 'No email or password. Operators at CNC, lathe, welding, or QC stations select their name, enter a 4-digit PIN, and key in completed units.' },
            { n: '2', title: 'Progress & remaining time calculated automatically', desc: 'POgrid computes completion percentage across stages (Drafter → Machining → Assembly → QC → Delivery) in real time.' },
            { n: '3', title: 'Owners monitor status with early-warning alerts', desc: 'Open the dashboard from any laptop or phone. Get warned before a PO crosses its delivery deadline.' },
        ],
        how_outcome: 'The result: you know precisely which orders are safe, at risk, or delayed — with an estimated shipping schedule.',

        feat_eyebrow: 'Features',
        feat_title: 'Core production control capabilities',
        feat_sub: 'Accurate PO status at a glance — without the complexity of an ERP.',
        features: [
            { t: 'Live PO Status Dashboard', d: 'One glance from phone or laptop shows which orders are on time, stuck at QC, or approaching deadline.' },
            { t: 'Operator PIN Login (No Email)', d: 'Floor operators need no email. A 4-digit PIN — as familiar as an ATM — keeps updates fast and frictionless.' },
            { t: 'Late-Delivery Penalty Alerts', d: 'Automatic warnings when any PO item runs slow at any stage — long before the shipping date arrives.' },
            { t: 'Presentation Mode / Factory TV', d: 'Display live PO status on a production-floor TV or in the meeting room to drive team transparency.' },
            { t: 'Not a Complex ERP', d: 'No expensive consultants or months-long setup. Configure quickly and start using it the same day.' },
            { t: 'Isolated Multi-Tenant Security', d: 'Your orders, client names, and process data stay fully isolated with row-level security.' },
        ],

        compare_eyebrow: 'Comparison',
        compare_title: 'Why not spreadsheets or WhatsApp?',
        compare_sub: 'Running production control on Excel and group chats is secretly expensive — and highly risky.',
        compare_aspect: 'Capability',
        compare_cols: ['Spreadsheet / WhatsApp', 'POgrid.id'],
        compare_rows: [
            { label: 'Progress updates from the floor', bad: 'Manual, re-typed by office staff', good: 'Operators update themselves in 3 seconds' },
            { label: 'Automatic PO status (Safe / At Risk / Delayed)', bad: 'Calculated and interpreted manually', good: 'Computed automatically from live data' },
            { label: 'Early warning before deadlines', bad: 'None — delays found too late', good: 'Automatic alerts when a stage stalls' },
            { label: 'Per-stage work visibility', bad: 'Depends on files that go stale', good: 'Across Drafter → Machining → QC → Delivery' },
            { label: 'Operators without email & passwords', bad: 'Operators have no system access', good: '4-digit PIN login at the floor kiosk' },
            { label: 'Your plant data isolated & secure', bad: 'Files scattered across personal devices', good: 'Fully isolated multi-tenant (row-level)' },
        ],

        sector_eyebrow: 'Industries',
        sector_title: 'Purpose-built for Indonesian manufacturing sectors',
        sector_sub: 'CNC · Fabrication · Machining · Assembly · Stamping · Coachbuilding · General Manufacturing',
        sector_tag: 'Sector',
        proof_items: [
            { t: 'CNC & Machining Plants', d: 'Track part workflows: Drafter → Turning/Milling → CNC Router → Dimensional QC → Shipping.' },
            { t: 'Fabrication & Sheet Metal Workshops', d: 'Monitor Cutting/Laser → Bending → Welding → Coating → Assembly through to delivery.' },
            { t: 'Assembly, Stamping & Moulding', d: 'Eliminate production bottlenecks and keep parts ready for assembly on time.' },
        ],

        testimonials: [
            { name: 'Hendra Gunawan', role: 'Owner, Fabrication & Machining Workshop', initial: 'HG', quote: 'I used to walk the floor at 4 PM asking what had passed QC, one by one. Now I know exactly which POs are ready to ship — even when I am out of town.' },
            { name: 'Ratna Kusuma', role: 'Owner, Stamping & Press Workshop', initial: 'RK', quote: 'I used to learn about late orders when the truck was already loading. Now warnings arrive the moment the machining stage slows down. Night and day.' },
            { name: 'Dedi Firmansyah', role: 'General Manager, Steel Fabrication', initial: 'DF', quote: 'Even operators with no computer skills can use it. Four-digit PIN, type a number, done. Data reaches the dashboard without me walking the floor.' },
        ],

        trust_items: [
            { t: 'Row-Level Security', d: 'Every plant\u2019s data fully isolated per tenant.' },
            { t: 'Secure Encrypted Cloud', d: 'Safely stored with automatic backups.' },
            { t: 'Setup in Under 5 Minutes', d: 'No consultants, no long contracts.' },
            { t: 'No Credit Card Required', d: 'Free 30-day trial, upgrade anytime.' },
        ],

        price_eyebrow: 'Pricing',
        price_title: 'Start tracking your plant\u2019s orders today',
        price_sub: 'Free for 30 days for new plants. No credit card required.',
        plan_name: 'Starter Plan',
        plan_price: 'Free',
        plan_period: 'for 30 days',
        plan_badge: 'Full Access',
        price_feature_label: 'Every plan includes full access:',
        price_features: [
            'Real-time owner dashboard & Presentation Mode (Factory TV)',
            'Progress updates from operator phones (4-digit PIN login)',
            'Automatic delay alerts & daily status summaries',
            'Instant access from any phone or laptop browser',
            'Simple interface built for field operators',
        ],
        price_cta: 'Start Your Free 30-Day Trial',
        price_note: ['No credit card required', 'Cancel anytime'],

        faq_eyebrow: 'FAQ',
        faq_title: 'Frequently asked questions',
        faqs: [
            { q: 'Is this a factory ERP or accounting system?', a: 'No. POgrid.id is 100% focused on purchase order progress tracking and on-time delivery. We deliberately leave out accounting and raw-material inventory modules so the system works from day one.' },
            { q: 'What if my operators are not tech-savvy?', a: 'That is exactly who it is designed for. Operators never type a single letter — they select their name, enter a 4-digit PIN, and key in completed units. Operators learn it in under a minute.' },
            { q: 'Do we need to install an app on phones?', a: 'No installation. Open a link in any browser (Chrome/Safari) on any phone or laptop. Data is stored securely in the cloud and updated in real time.' },
            { q: 'How long does setup take before the first PO?', a: 'Under 3 minutes. Right after registration you can configure your production stages and create your first PO.' },
            { q: 'Is it available in English and Indonesian?', a: 'Yes. The product interface supports both English and Bahasa Indonesia, using terminology familiar to local production floors (PO, Rework, Milling, CNC, Progress, Delayed).' },
            { q: 'Is our plant data secure?', a: 'Fully secure. Every company\u2019s data is strictly separated with row-level security — never mixed with or accessible to other tenants.' },
        ],

        final_eyebrow: 'Get Started Today',
        final_title: 'See everything. Stop guessing.',
        final_sub: 'Register your plant now and create your first PO in 3 minutes.',
        final_cta: 'Start Free 30-Day Trial',

        footer_tag: 'Real-time PO tracking & production control for manufacturing plants and procurement teams.',
        footer_product: 'Product',
        footer_company: 'Company',
        footer_legal: 'Legal',
        footer_links_product: ['Features', 'How It Works', 'Pricing', 'FAQ'],
        footer_links_company: ['Sign In', 'Register', 'Support'],
        footer_terms: 'Terms & Conditions',
        footer_privacy: 'Privacy Policy',
        footer_copy: 'POgrid.id — Built for manufacturing.',

        // Simulator
        sim_url: 'app.pogrid.id/dashboard',
        sim_client_tracker: 'Client Tracker',
        sim_po_code: 'PO Code',
        sim_progress_label: 'Item production progress:',
        sim_status_risk: 'At Risk (Welder Delay)',
        sim_status_ok: 'On Track',
        sim_activity_label: 'Latest activity:',
        sim_activity_initial: 'QC Station checked — OK: 48, NG: 2',
        sim_activity_done: 'Joko Susilo completed Welder (10/10) — Just now',
        sim_terminal: 'Floor Terminal',
        sim_kiosk_title: 'Operator PIN Kiosk',
        sim_operator_label: 'Operator:',
        sim_operator_value: 'Joko Susilo (Welding)',
        sim_enter_pin: 'Enter your 4-digit PIN:',
        sim_update_title: 'Welder Update',
        sim_po_label: 'Purchase Order',
        sim_progress: 'Welder progress:',
        sim_units: 'Units',
        sim_add2: '+2 Units (reach 80%)',
        sim_finish: 'Complete (reach 100%)',
        sim_sending: 'Sending…',
        sim_send: 'Send Real-Time Update',
        sim_back: 'Back to PIN',
        sim_sent_title: 'Update Sent',
        sim_sent_body: 'Welder progress updated to {pct}% instantly on the Owner dashboard.',
        sim_reset: 'Reset Kiosk Demo',
        sim_see_monitor: 'Watch the PO status change on the dashboard monitor.',
    },
    id: {
        meta_title: 'POgrid.id — Sistem Pelacakan PO & Kontrol Produksi Pabrik Real-Time',
        meta_desc: 'Pantau progres Purchase Order pabrik CNC, fabrikasi, dan machining dari HP secara real-time. Operator input pakai PIN 4 digit. Owner tahu mana PO yang aman, rawan, atau terlambat — sebelum kena penalti. Coba gratis 30 hari.',
        meta_keywords: 'sistem pelacakan PO pabrik, software kontrol produksi, tracking progress workshop CNC, aplikasi fabrikasi logam, manajemen purchase order manufaktur, POgrid Indonesia',
        og_title: 'POgrid.id — Pantau Progres PO Pabrik Langsung dari HP (Real-Time)',
        og_desc: 'Operator update via HP pakai PIN 4 digit. Owner pantau status PO aman/terlambat di dashboard. Tanpa ribet instalasi ERP.',
        tw_title: 'POgrid.id — Sistem Kontrol Produksi Pabrik Indonesia',
        tw_desc: 'Lacak status pengerjaan barang & tenggat kirim PO pabrik Anda tanpa perlu telepon berulang kali ke lantai produksi.',
        schema_desc: 'Sistem pelacakan progres Purchase Order (PO) dan kontrol ketepatan pengiriman khusus pabrik manufaktur, workshop CNC, dan fabrikasi di Indonesia.',

        nav_features: 'Fitur',
        nav_how: 'Cara Kerja',
        nav_price: 'Harga',
        nav_faq: 'FAQ',
        nav_demo: 'Minta Demo',
        login: 'Masuk',
        cta: 'Daftar Gratis',

        hero_eyebrow: 'Pelacakan PO & Kontrol Produksi Real-Time',
        hero_title_1: 'Tahu tepat status',
        hero_title_2: 'setiap PO Anda.',
        hero_title_3: 'Sekarang juga.',
        hero_sub: 'Operator input progres pengerjaan lewat HP pakai PIN 4 digit. Owner pantau mana PO yang Aman, Rawan, atau bakal terlambat kirim — secara real-time.',
        hero_cta_primary: 'Coba Gratis 30 Hari',
        hero_cta_demo: 'Minta Demo',
        hero_cta_secondary: 'Lihat Cara Kerja',
        hero_notes: ['Tanpa kartu kredit', 'Tanpa install aplikasi', 'Setup kurang dari 5 menit'],
        hero_access_label: 'Early access — gelombang peluncuran terbatas',
        hero_access_note: 'Kami sedang mengajak sejumlah pabrik terpilih, karena produk ini masih diuji langsung di lantai produksi.',
        hero_stats: [
            { v: '100%', l: 'Visibilitas progres real-time' },
            { v: '3 Menit', l: 'Setup pabrik & PO pertama' },
            { v: '0', l: 'Instalasi aplikasi (cukup browser)' },
            { v: '30 Hari', l: 'Uji coba gratis, tanpa kartu kredit' },
        ],

        marquee_label: 'Dirancang untuk lantai produksi & workshop di seluruh Indonesia',
        marquee_items: ['CNC & Machining', 'Fabrikasi & Sheet Metal', 'Stamping & Press', 'Karoseri', 'Perakitan / Assembly', 'Moulding', 'General Manufacturing', 'Workshop Engineering'],

        logo_strip_label: 'Memperkuat workshop di seluruh Indonesia',

        pain_eyebrow: 'Masalah Nyata',
        pain_title: 'Masalah klasik di bengkel & lantai produksi yang bikin pusing owner',
        pain_sub: 'Setiap pemilik pabrik & tim purchasing pasti akrab dengan masalah ini:',
        pain_tag: 'Tantangan',
        pain_items: [
            { q: '"Pak, barang saya urutan berapa? Kok belum dikirim?"', a: 'Setiap sore HP Anda berdering dikomplain pemesan. Anda bingung menjawab karena data di lantai produksi masih tebak-tebakan.' },
            { q: 'Tahu-tahu telat di hari-H kirim & kena denda penalti', a: 'Tidak ada warning dari awal. Keterlambatan baru ketahuan saat armada siap muat, berujung denda atau pembatalan order.' },
            { q: 'Progres pengerjaan cuma dicatat di kertas & papan tulis', a: 'Surat jalan/SPK lecek, hilang, atau operator lupa update. Owner kesulitan memantau progres riil di lapangan.' },
            { q: 'Menjanjikan estimasi kirim cuma berdasarkan "firasat"', a: 'Tanpa data real-time tiap tahapan (potong, bubut, CNC, welding, QC), Anda berisiko salah janji tanggal kirim ke pelanggan.' },
        ],
        pain_solution: 'POgrid.id hadir untuk satu tujuan: menghilangkan kecemasan owner soal status pengerjaan PO dan memastikan pengiriman tepat waktu bebas denda penalti.',

        how_eyebrow: 'Cara Kerja',
        how_title: '3 langkah simpel: operator update dari HP, owner lihat hasilnya',
        how_sub: 'Operator tidak perlu paham komputer rumit. Cukup 3 klik dari HP di meja kerja.',
        steps: [
            { n: '1', title: 'Operator input progres pakai PIN (3 detik)', desc: 'Tanpa email atau password. Operator di meja kerja (CNC, Bubut, Las, QC) cukup pilih nama, ketik PIN 4 digit, dan masukkan unit selesai.' },
            { n: '2', title: 'Sistem kalkulasi progres & sisa waktu otomatis', desc: 'POgrid otomatis menghitung persentase progres lintas tahapan (Drafter → Machining → Assembly → QC → Delivery) secara real-time.' },
            { n: '3', title: 'Owner pantau status & dapat alert dini', desc: 'Buka dashboard dari laptop atau HP. Dapatkan peringatan dini sebelum PO melewati tenggat pengiriman.' },
        ],
        how_outcome: 'Hasilnya: Anda tahu persis PO mana yang Aman, Rawan, atau Terlambat, lengkap dengan estimasi jadwal kirim.',

        feat_eyebrow: 'Fitur',
        feat_title: 'Fitur utama kontrol produksi',
        feat_sub: 'Pantau status PO dengan cepat & akurat, tanpa ribetnya sistem ERP.',
        features: [
            { t: 'Live Dashboard Status PO', d: 'Sekali lirik dari HP/laptop, langsung paham mana PO yang On-Time, Macet di QC, atau Mendekati Deadline.' },
            { t: 'Login PIN Operator (Bebas Email)', d: 'Operator lantai produksi tidak butuh email. Cukup 4 digit PIN seperti ATM, dijamin cepat & anti-ribet.' },
            { t: 'Sistem Alert Penalti Keterlambatan', d: 'Peringatan otomatis untuk item PO yang berjalan lambat di salah satu tahapan sebelum terlambat dikirim.' },
            { t: 'Mode Presentasi / Layar TV Pabrik', d: 'Tampilkan grafik & status PO di TV lantai produksi atau ruang rapat untuk mendorong keterbukaan tim.' },
            { t: 'Bukan ERP Rumit', d: 'Tidak perlu bayar konsultan mahal atau setup berbulan-bulan. Cepat dikonfigurasi dan langsung dipakai hari ini.' },
            { t: 'Multi-Tenant Terisolasi & Aman', d: 'Data order, nama klien, dan kerahasiaan proses pengerjaan pabrik Anda terjamin terisolasi penuh.' },
        ],

        compare_eyebrow: 'Perbandingan',
        compare_title: 'Kenapa bukan spreadsheet atau WhatsApp?',
        compare_sub: 'Mengandalkan Excel & grup chat untuk kontrol produksi itu mahal tanpa disadari — dan sangat berisiko.',
        compare_aspect: 'Aspek',
        compare_cols: ['Spreadsheet / WA', 'POgrid.id'],
        compare_rows: [
            { label: 'Update progres dari lantai produksi', bad: 'Manual, harus diinput ulang oleh staf kantor', good: 'Operator sendiri input via HP, 3 detik' },
            { label: 'Status PO otomatis (Aman / Rawan / Terlambat)', bad: 'Harus dihitung & diinterpretasi manual', good: 'Otomatis terhitung dari data real-time' },
            { label: 'Peringatan dini sebelum tenggat kirim', bad: 'Tidak ada — telat baru ketahuan', good: 'Alert otomatis saat tahapan macet' },
            { label: 'Visibilitas tiap tahapan kerja', bad: 'Tergantung update file yang bisa basi', good: 'Lintas Drafter → Machining → QC → Kirim' },
            { label: 'Operator tanpa email & password', bad: 'Operator tidak punya akses sama sekali', good: 'Login PIN 4 digit di kiosk lantai' },
            { label: 'Data pabrik Anda terisolasi & aman', bad: 'File bertebaran di HP & laptop pribadi', good: 'Multi-tenant terisolasi penuh (row-level)' },
        ],

        sector_eyebrow: 'Sektor',
        sector_title: 'Dirancang khusus untuk berbagai sektor manufaktur Indonesia',
        sector_sub: 'CNC · Fabrikasi · Machining · Perakitan · Stamping · Karoseri · Manufaktur Umum',
        sector_tag: 'Sektor',
        proof_items: [
            { t: 'Pabrik CNC & Machining', d: 'Lacak alur pengerjaan part spesifik: Drafter → Turning/Milling → CNC Router → QC Dimension → Kirim.' },
            { t: 'Workshop Fabrikasi & Sheet Metal', d: 'Pantau progres Cutting/Laser → Bending → Welding → Coating → Assembly hingga pengiriman.' },
            { t: 'Perakitan, Stamping & Moulding', d: 'Hilangkan bottleneck produksi dan pastikan stok part siap rakit tepat waktu bebas keterlambatan.' },
        ],

        testimonials: [
            { name: 'Hendra Gunawan', role: 'Owner Workshop Fabrikasi & Machining', initial: 'HG', quote: 'Dulu tiap jam 4 sore saya keliling bengkel nanya satu-satu barang yang sudah selesai QC. Sekarang sambil luar kota pun saya tahu persis PO mana yang siap kirim.' },
            { name: 'Ratna Kusuma', role: 'Owner Workshop Stamping & Press', initial: 'RK', quote: 'Dulu saya baru tahu order telat pas barang mau dimuat. Sekarang peringatan sudah masuk sejak tahapan machining berjalan lambat. Beda banget.' },
            { name: 'Dedi Firmansyah', role: 'General Manager, Fabrikasi Baja', initial: 'DF', quote: 'Operator yang gaptek pun bisa pakai. PIN 4 digit, ketik angka, selesai. Data masuk ke dashboard tanpa saya harus keliling lantai.' },
        ],

        trust_items: [
            { t: 'Row-Level Security', d: 'Data tiap pabrik terisolasi penuh antar tenant.' },
            { t: 'Cloud Aman & Terenkripsi', d: 'Tersimpan aman di cloud dengan backup otomatis.' },
            { t: 'Setup Kurang dari 5 Menit', d: 'Tanpa konsultan & kontrak panjang, langsung pakai.' },
            { t: 'Tanpa Kartu Kredit', d: 'Uji coba gratis 30 hari, upgrade kapan pun.' },
        ],

        price_eyebrow: 'Harga',
        price_title: 'Mulai lacak PO pabrik Anda hari ini',
        price_sub: 'Gratis 30 hari untuk pabrik baru. Tanpa kartu kredit.',
        plan_name: 'Paket Pemula',
        plan_price: 'Gratis',
        plan_period: 'selama 30 hari',
        plan_badge: 'Akses Penuh',
        price_feature_label: 'Semua paket sudah termasuk akses penuh:',
        price_features: [
            'Dashboard Owner real-time & Presentation Mode (TV Pabrik)',
            'Update progres via HP operator (Login PIN 4 digit)',
            'Alert keterlambatan otomatis & ringkasan status harian',
            'Akses instan dari browser HP/Laptop, tanpa instalasi',
            'Tampilan simpel & cocok untuk operator lapangan',
        ],
        price_cta: 'Coba Gratis 30 Hari Sekarang',
        price_note: ['Tanpa kartu kredit', 'Batalkan kapan saja'],

        faq_eyebrow: 'FAQ',
        faq_title: 'Tanya jawab (FAQ)',
        faqs: [
            { q: 'Apakah ini software ERP atau akuntansi pabrik?', a: 'Bukan. POgrid.id fokus 100% pada pelacakan progres Purchase Order dan ketepatan pengiriman (On-Time Delivery). Kami sengaja tidak membebani Anda dengan modul akuntansi atau stok bahan baku yang rumit agar sistem bisa langsung dipakai hari ini.' },
            { q: 'Gimana kalau operator saya kurang paham teknologi?', a: 'Sangat bisa. Operator tidak perlu mengetik huruf sama sekali. Cukup pilih nama mereka, ketik PIN 4 digit, lalu masukkan angka unit selesai. Bisa dipakai operator dalam 1 menit pelatihan.' },
            { q: 'Apakah harus install aplikasi tertentu di HP?', a: 'Tidak perlu. Cukup buka lewat browser (Chrome/Safari) di HP atau laptop apa saja. Data tersimpan aman di cloud dan selalu terupdate real-time.' },
            { q: 'Berapa lama waktu setup sampai bisa buat PO?', a: 'Sangat cepat, kurang dari 3 menit. Begitu selesai registrasi, Anda bisa langsung mengatur tahapan pengerjaan pabrik dan membuat PO pertama.' },
            { q: 'Apakah tersedia dalam Bahasa Indonesia dan Inggris?', a: 'Ya. Antarmuka produk mendukung Bahasa Indonesia dan English, dengan istilah yang akrab di lantai produksi lokal (PO, Rework, Milling, CNC, Progress, Delayed).' },
            { q: 'Apakah data pabrik kami aman?', a: 'Terjamin aman. Data setiap perusahaan dipisahkan secara ketat menggunakan Row-Level Security, sehingga tidak akan bercampur atau diakses oleh pihak luar.' },
        ],

        final_eyebrow: 'Mulai Hari Ini',
        final_title: 'Pantau langsung, tanpa tebak-tebakan.',
        final_sub: 'Daftarkan pabrik Anda sekarang dan buat PO pertama dalam 3 menit.',
        final_cta: 'Coba Gratis 30 Hari',

        footer_tag: 'Pelacakan PO real-time & kontrol produksi untuk pabrik manufaktur & tim procurement.',
        footer_product: 'Produk',
        footer_company: 'Perusahaan',
        footer_legal: 'Legal',
        footer_links_product: ['Fitur', 'Cara Kerja', 'Harga', 'FAQ'],
        footer_links_company: ['Masuk', 'Daftar', 'Bantuan'],
        footer_terms: 'Syarat & Ketentuan',
        footer_privacy: 'Kebijakan Privasi',
        footer_copy: 'POgrid.id — Dibuat untuk pabrik manufaktur Indonesia.',

        // Simulator
        sim_url: 'app.pogrid.id/dashboard',
        sim_client_tracker: 'Client Tracker',
        sim_po_code: 'Kode PO',
        sim_progress_label: 'Progres pengerjaan item:',
        sim_status_risk: 'Rawan (Welder Delay)',
        sim_status_ok: 'On Track (Aman)',
        sim_activity_label: 'Aktivitas terakhir:',
        sim_activity_initial: 'QC Station checked — OK: 48, NG: 2',
        sim_activity_done: 'Joko Susilo menyelesaikan Welder (10/10) — Baru saja',
        sim_terminal: 'Floor Terminal',
        sim_kiosk_title: 'Kiosk PIN Operator',
        sim_operator_label: 'Operator:',
        sim_operator_value: 'Joko Susilo (Welding)',
        sim_enter_pin: 'Masukkan PIN 4 digit Anda:',
        sim_update_title: 'Update Welder',
        sim_po_label: 'Purchase Order',
        sim_progress: 'Progres Welder:',
        sim_units: 'Unit',
        sim_add2: '+2 Unit (Capai 80%)',
        sim_finish: 'Selesaikan (Capai 100%)',
        sim_sending: 'Mengirim…',
        sim_send: 'Kirim Update Real-Time',
        sim_back: 'Kembali ke PIN',
        sim_sent_title: 'Update Terkirim',
        sim_sent_body: 'Progres Welder diperbarui ke {pct}% secara instan di dashboard Owner.',
        sim_reset: 'Reset Demo Kiosk',
        sim_see_monitor: 'Lihat perubahan status PO di monitor dashboard.',
    },
} as const;

type Dict = (typeof translations)['en'];

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

const SectionHead: React.FC<{ num?: string; eyebrow: string; title: React.ReactNode; sub?: string }> = ({ num, eyebrow, title, sub }) => (
    <Reveal className="mb-12 md:mb-16">
        <div className="flex items-center gap-4 mb-7">
            {num && <span className="mono text-[11px] font-semibold tracking-[0.18em] text-blue-700 uppercase whitespace-nowrap">{num}</span>}
            <span className="mono text-[11px] font-medium tracking-[0.22em] text-slate-400 uppercase whitespace-nowrap">{eyebrow}</span>
            <span className="flex-1 h-px line-grad-fade" />
        </div>
        <h2 className="landing-display text-3xl md:text-4xl lg:text-[44px] leading-[1.08] font-bold text-slate-900 tracking-[-0.02em] max-w-3xl">{title}</h2>
        {sub && <p className="text-base md:text-lg text-slate-500 leading-relaxed mt-5 max-w-2xl">{sub}</p>}
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

const GlobeIcon: React.FC<IconProps> = ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

const WhatsAppIcon: React.FC<IconProps> = ({ size = 18, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
);

const CncIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        <path d="M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0 -6 0" />
    </svg>
);

const FabrikasiIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

const PerakitanIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
    </svg>
);

const DashboardIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
);

const PinIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const AlertIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const TvIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

const ErpIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
);

const LockIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const ShieldIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

const ServerIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
);

const ClockIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const CardIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
        <path d="M5 14h4" />
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

/* ============================================================
   Language toggle
   ============================================================ */

const LangToggle: React.FC<{ lang: Lang; onChange: (l: Lang) => void; dark?: boolean }> = ({ lang, onChange, dark = false }) => (
    <div
        className={`mono inline-flex items-center text-[11px] font-semibold border ${dark ? 'border-white/20 bg-white/5' : 'border-slate-300 bg-white'}`}
        style={{ padding: 2, gap: 2 }}
        role="group"
        aria-label="Language"
    >
        {(['en', 'id'] as Lang[]).map((l) => (
            <button
                key={l}
                type="button"
                onClick={() => onChange(l)}
                className={`uppercase tracking-[0.12em] transition-all duration-150 ${lang === l ? (dark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white') : dark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 5, paddingBottom: 5, minWidth: 36 }}
            >
                {l}
            </button>
        ))}
    </div>
);

/* ============================================================
   Main page
   ============================================================ */

export default function Landing() {
    const [lang, setLang] = useState<Lang>(() => detectLang());
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const t: Dict = translations[lang];

    // Interactive simulator state
    const [simPin, setSimPin] = useState<string>('');
    const [simStep, setSimStep] = useState<'pin' | 'update' | 'success'>('pin');
    const [simProgress, setSimProgress] = useState<number>(60);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [poStatus, setPoStatus] = useState<'rawan' | 'aman'>('rawan');
    const [simDone, setSimDone] = useState(false);

    useEffect(() => {
        try {
            window.localStorage.setItem('pogrid_landing_lang', lang);
        } catch {
            /* ignore */
        }
        document.documentElement.lang = lang === 'id' ? 'id' : 'en';
    }, [lang]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 24);
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
        setTimeout(() => {
            setIsSending(false);
            setSimStep('success');
            setPoStatus('aman');
            setSimDone(true);
        }, 700);
    };

    const resetSimulator = () => {
        setSimPin('');
        setSimStep('pin');
        setSimProgress(60);
        setPoStatus('rawan');
        setSimDone(false);
        setIsSending(false);
    };

    const navLinks = [
        { label: t.nav_features, href: '#fitur' },
        { label: t.nav_how, href: '#cara' },
        { label: t.nav_price, href: '#harga' },
        { label: t.nav_faq, href: '#faq' },
    ];

    const trustIcons = [<ShieldIcon className="text-blue-700" />, <ServerIcon className="text-blue-700" />, <ClockIcon className="text-blue-700" />, <CardIcon className="text-blue-700" />];
    const featureIcons = [<DashboardIcon className="text-blue-700" />, <PinIcon className="text-blue-700" />, <AlertIcon className="text-blue-700" />, <TvIcon className="text-blue-700" />, <ErpIcon className="text-blue-700" />, <LockIcon className="text-blue-700" />];
    const sectorIcons = [
        <CncIcon className="text-blue-700" />,
        <FabrikasiIcon className="text-blue-700" />,
        <PerakitanIcon className="text-blue-700" />,
    ];

    return (
        <div className="min-h-screen bg-white text-slate-600 font-sans antialiased landing-root">
            <Head>
                <title>{t.meta_title}</title>
                <meta name="title" content={t.meta_title} />
                <meta name="description" content={t.meta_desc} />
                <meta name="keywords" content={t.meta_keywords} />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://pogrid.id/" />

                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://pogrid.id/" />
                <meta property="og:title" content={t.og_title} />
                <meta property="og:description" content={t.og_desc} />
                <meta property="og:image" content="https://pogrid.id/pogrid-logo.png" />
                <meta property="og:locale" content={lang === 'id' ? 'id_ID' : 'en_US'} />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:url" content="https://pogrid.id/" />
                <meta name="twitter:title" content={t.tw_title} />
                <meta name="twitter:description" content={t.tw_desc} />
                <meta name="twitter:image" content="https://pogrid.id/pogrid-logo.png" />

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
                        "description": "Free 30-day trial"
                    },
                    "description": t.schema_desc
                })}
                </script>
            </Head>

            {/* Top gradient rule */}
            <div className="h-[2px] w-full line-grad" />

            {/* ===== NAV ===== */}
            <header className={`sticky top-0 z-50 backdrop-blur-sm border-b transition-all duration-300 ${scrolled ? 'bg-transparent border-transparent shadow-[0_4px_20px_rgba(15,23,42,0.06)]' : 'bg-white/95 border-slate-200'}`}>
                <div className={`max-w-[1200px] mx-auto px-4 md:px-6 flex items-center justify-between gap-6 transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <img
                            src="/pogrid-logo.png"
                            alt="POgrid.id Logo"
                            style={{ height: scrolled ? '34px' : '44px', width: 'auto', objectFit: 'contain', transition: 'height 300ms' }}
                        />
                        <span className={`mono font-bold tracking-tight text-slate-900 transition-all duration-300 ${scrolled ? 'text-lg' : 'text-xl'}`}>
                            POgrid<span className="text-slate-400">.id</span>
                        </span>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-8">
                        {navLinks.map((l) => (
                            <a key={l.href} href={l.href} className="mono text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 hover:text-slate-900 transition-colors duration-150">
                                {l.label}
                            </a>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2.5">
                        <div className="hidden sm:block">
                            <LangToggle lang={lang} onChange={setLang} />
                        </div>

                        <a
                            href={appUrl('/login')}
                            className="hidden md:inline-block text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors duration-150 whitespace-nowrap"
                        >
                            {t.login}
                        </a>

                        <a
                            href={appUrl('/register')}
                            className="hidden md:inline-flex items-center gap-2 btn-dark text-white font-semibold text-sm px-4 py-2.5 whitespace-nowrap"
                        >
                            {t.cta}
                            <ArrowRight size={14} />
                        </a>

                        <button
                            type="button"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="lg:hidden inline-flex items-center justify-center w-10 h-10 border border-slate-300 bg-white text-slate-700"
                            aria-label="Menu"
                        >
                            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                <div className={`lg:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[480px]' : 'max-h-0'}`}>
                    <div className="mx-4 mt-2 mb-4 p-5 border border-slate-200 bg-white flex flex-col gap-1">
                        {navLinks.map((l) => (
                            <a
                                key={l.href}
                                href={l.href}
                                onClick={() => setMobileOpen(false)}
                                className="mono px-3 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                            >
                                {l.label}
                            </a>
                        ))}
                        <div className="mt-3 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                            <div className="flex justify-center pb-1">
                                <LangToggle lang={lang} onChange={setLang} />
                            </div>
                            <a href={appUrl('/register')} onClick={() => setMobileOpen(false)} className="btn-dark text-white font-semibold text-sm py-3 text-center flex items-center justify-center gap-2">
                                {t.cta}
                                <ArrowRight size={14} />
                            </a>
                            <a href={appUrl('/login')} onClick={() => setMobileOpen(false)} className="text-sm font-semibold text-slate-700 py-2.5 text-center border border-slate-300 hover:bg-slate-50 transition-colors">
                                {t.login}
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            {/* ===== HERO ===== */}
            <section className="border-b border-slate-200 bg-slate-950">
                <div className="relative max-w-[1200px] mx-auto border-x border-white/10 px-4 md:px-10">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 hero-grid" />
                    </div>
                    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center pt-14 lg:pt-20 pb-16 md:pb-24">

                        {/* Copy */}
                        <div className="lg:col-span-6 text-left flex flex-col items-start">
                            <Reveal>
                                <div className="flex items-center gap-3 mb-8">
                                    <span className="mono text-[10px] font-semibold tracking-[0.18em] uppercase text-blue-300 border border-blue-400/30 px-2 py-1">
                                        {lang === 'id' ? 'ID' : 'EN'}
                                    </span>
                                    <span className="mono text-[11px] font-medium tracking-[0.16em] uppercase text-slate-400">
                                        {t.hero_eyebrow}
                                    </span>
                                </div>
                            </Reveal>

                            <Reveal delay={80}>
                                <h1 className="landing-display hero-h1 text-white mb-7">
                                    {t.hero_title_1}{' '}
                                    <span className="grad-text">{t.hero_title_2}</span>{' '}
                                    {t.hero_title_3}
                                </h1>
                            </Reveal>

                            <Reveal delay={160}>
                                <p className="text-lg md:text-xl text-slate-400 leading-relaxed mb-9 max-w-xl">
                                    {t.hero_sub}
                                </p>
                            </Reveal>

                            <Reveal delay={240}>
                                <div className="flex flex-wrap items-center gap-3.5 w-full mb-6">
                                    <a
                                        href={appUrl('/register')}
                                        className="btn-white inline-flex items-center justify-center gap-2.5 whitespace-nowrap font-semibold text-[15px] px-7 py-4"
                                    >
                                        {t.hero_cta_primary}
                                        <ArrowRight size={16} />
                                    </a>

                                    <a
                                        href={waUrl(lang)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2.5 whitespace-nowrap border border-white/25 hover:border-white/60 text-white font-semibold text-[15px] px-7 py-4 transition-colors duration-150"
                                    >
                                        <WhatsAppIcon size={16} className="text-emerald-400" />
                                        {t.hero_cta_demo}
                                    </a>

                                    <a
                                        href="#cara"
                                        className="hero-link inline-flex items-center justify-center gap-2 whitespace-nowrap text-blue-300 hover:text-blue-200 font-semibold text-[15px] px-2 py-4 transition-colors duration-150"
                                    >
                                        <PlayCircle size={16} />
                                        {t.hero_cta_secondary}
                                    </a>
                                </div>
                            </Reveal>

                            <Reveal delay={300}>
                                <div className="mono text-[12px] text-slate-400 mb-10 w-full flex flex-wrap gap-x-6 gap-y-1.5">
                                    {t.hero_notes.map((n, i) => (
                                        <span key={i} className="inline-flex items-center gap-1.5">
                                            <span className="text-blue-400 font-semibold">+</span>
                                            {n}
                                        </span>
                                    ))}
                                </div>
                            </Reveal>

                            <Reveal delay={360} className="w-full">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="text-left">
                                        <div className="mono text-[11px] text-slate-400 uppercase tracking-[0.14em] mb-1.5">{t.hero_access_label}</div>
                                        <p className="text-[12.5px] text-slate-400 font-medium">{t.hero_access_note}</p>
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal delay={420} className="w-full">
                                <div className="grid grid-cols-2 md:grid-cols-4 w-full border-t border-white/10">
                                    {t.hero_stats.map((s, i) => (
                                        <div key={i} className={`pt-6 pr-4 ${i > 0 ? 'md:border-l md:border-white/10 md:pl-5' : ''}`}>
                                            <div className="mono text-2xl md:text-[28px] font-semibold text-white tracking-tight">{s.v}</div>
                                            <div className="text-[12px] text-slate-400 mt-1.5 leading-snug">{s.l}</div>
                                        </div>
                                    ))}
                                </div>
                            </Reveal>
                        </div>

                        {/* Product visual: dashboard + kiosk */}
                        <div className="lg:col-span-6 relative flex items-center justify-center lg:justify-end w-full sm:min-h-[460px] pt-2 lg:pt-0">
                            <Reveal delay={200} style={{ transform: 'none' }} className="w-full flex items-center justify-center lg:justify-end">

                            {/* Dashboard mock */}
                            <div className="dashboard-mockup relative z-10 w-full max-w-[520px] bg-white border border-slate-200 rounded-md shadow-[0_24px_60px_rgba(0,0,0,0.45)] overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-[2px] line-grad z-20" />
                                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                    <div className="mono mx-auto w-[60%] h-5 rounded-[2px] bg-white border border-slate-200 text-[9px] text-slate-500 flex items-center justify-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {t.sim_url}
                                    </div>
                                </div>

                                <div className="p-3.5 grid grid-cols-12 gap-3 min-h-[290px]">
                                    <div className="col-span-3 border-r border-slate-100 pr-2 flex flex-col gap-1.5">
                                        <div className="landing-display font-bold text-[10px] text-blue-700 tracking-wider mb-1.5">POgrid.id</div>
                                        <div className="w-full h-5 rounded-[2px] bg-blue-50 border border-blue-100 flex items-center px-1.5 text-[8.5px] text-blue-800 font-semibold">Dashboard</div>
                                        <div className="w-full h-5 rounded-[2px] flex items-center px-1.5 text-[8.5px] text-slate-400">Purchase Orders</div>
                                        <div className="w-full h-5 rounded-[2px] flex items-center px-1.5 text-[8.5px] text-slate-400">Trouble Alerts</div>
                                        <div className="w-full h-5 rounded-[2px] flex items-center px-1.5 text-[8.5px] text-slate-400">Performance</div>
                                    </div>

                                    <div className="col-span-9 flex flex-col gap-2.5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="mono text-[7.5px] text-slate-400 uppercase tracking-widest block font-medium">{t.sim_client_tracker}</span>
                                                <span className="text-[11px] font-bold text-slate-800">PT Astra Otoparts</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="mono text-[7.5px] text-slate-400 block uppercase">{t.sim_po_code}</span>
                                                <span className="text-[10px] font-bold text-slate-700">PO-2026-089</span>
                                            </div>
                                        </div>

                                        <div className="border border-slate-200 bg-slate-50/60 rounded-[2px] p-2.5 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[8px] text-slate-500 font-medium">{t.sim_progress_label}</span>
                                                {poStatus === 'rawan' ? (
                                                    <span className="mono text-[8.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-[2px]">
                                                        {t.sim_status_risk}
                                                    </span>
                                                ) : (
                                                    <span className="mono text-[8.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-[2px] flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                                        {t.sim_status_ok}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between text-[8px] text-slate-500">
                                                    <span>1. Milling &amp; Turning</span>
                                                    <span className="mono text-emerald-600 font-semibold">100%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-200 overflow-hidden">
                                                    <div className="h-full bg-emerald-500 w-full" />
                                                </div>

                                                <div className="flex items-center justify-between text-[8px] text-slate-500">
                                                    <span>2. CNC Router</span>
                                                    <span className="mono text-emerald-600 font-semibold">100%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-200 overflow-hidden">
                                                    <div className="h-full bg-emerald-500 w-full" />
                                                </div>

                                                <div className="flex items-center justify-between text-[8px] text-slate-500">
                                                    <span>3. Welder &amp; Joining</span>
                                                    <span className={`mono font-semibold transition-colors duration-300 ${simProgress === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {simProgress}%
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-200 overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${simProgress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${simProgress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/60 border border-slate-200 p-2 rounded-[2px]">
                                            <div className="mono text-[7.5px] font-medium text-slate-400 uppercase tracking-wider mb-1">{t.sim_activity_label}</div>
                                            <div className="flex items-center gap-1.5 text-[8.5px] text-slate-700">
                                                <span className={`w-1.5 h-1.5 rounded-full ${poStatus === 'aman' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                <span className="transition-all duration-300">{simDone ? t.sim_activity_done : t.sim_activity_initial}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Phone kiosk mock */}
                            <div className="phone-mockup-wrapper absolute -right-3 -bottom-6 z-20 w-[215px] md:w-[230px] hidden sm:block">
                                <div className="relative w-full aspect-[9/18.5] bg-slate-800 border-[5px] border-slate-600 rounded-[28px] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.6)] overflow-hidden">
                                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-900 rounded-full z-30" />

                                    <div className="w-full h-full bg-white rounded-[20px] overflow-hidden flex flex-col p-3 pt-8 select-none">
                                        {simStep === 'pin' && (
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div className="text-center">
                                                    <span className="mono text-[7.5px] font-medium text-slate-400 uppercase tracking-widest block mb-0.5">{t.sim_terminal}</span>
                                                    <h4 className="text-[11px] font-extrabold text-slate-900">{t.sim_kiosk_title}</h4>

                                                    <div className="bg-slate-50 border border-slate-200 rounded-[2px] p-1.5 my-2 text-left">
                                                        <span className="mono text-[7px] text-slate-400 block uppercase">{t.sim_operator_label}</span>
                                                        <span className="text-[9px] font-bold text-slate-800">{t.sim_operator_value}</span>
                                                    </div>

                                                    <div className="text-[8.5px] text-slate-500 mt-2">{t.sim_enter_pin}</div>

                                                    <div className="flex justify-center gap-2.5 my-2.5">
                                                        {[0, 1, 2, 3].map((i) => (
                                                            <div
                                                                key={i}
                                                                className={`w-2.5 h-2.5 rounded-[1px] border transition-all duration-200 ${
                                                                    simPin.length > i
                                                                        ? 'bg-blue-600 border-blue-600 scale-110'
                                                                        : 'border-slate-300 bg-transparent'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 rounded-[2px] border border-slate-200 mb-1">
                                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                                                        <button
                                                            key={n}
                                                            onClick={() => handleNumClick(n)}
                                                            className="mono h-8 rounded-[2px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-semibold active:scale-95 transition-all flex items-center justify-center"
                                                        >
                                                            {n}
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={handleClearPin}
                                                        className="mono h-8 rounded-[2px] bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[9.5px] font-semibold flex items-center justify-center"
                                                    >
                                                        C
                                                    </button>
                                                    <button
                                                        onClick={() => handleNumClick('0')}
                                                        className="mono h-8 rounded-[2px] bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-semibold flex items-center justify-center"
                                                    >
                                                        0
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (simPin.length === 4) setSimStep('update');
                                                        }}
                                                        className="mono h-8 rounded-[2px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 text-[9.5px] font-semibold flex items-center justify-center"
                                                    >
                                                        OK
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {simStep === 'update' && (
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                                        <span className="text-[10px] font-extrabold text-slate-900">{t.sim_update_title}</span>
                                                        <span className="mono text-[8.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-[2px]">Joko S.</span>
                                                    </div>

                                                    <div className="bg-slate-50 border border-slate-200 rounded-[2px] p-2.5 text-left mb-3">
                                                        <span className="mono text-[7px] text-slate-400 block uppercase font-medium">{t.sim_po_label}</span>
                                                        <span className="text-[9.5px] font-bold text-slate-800 block">PO-2026-089</span>
                                                        <span className="text-[8.5px] text-slate-500">PT Astra Otoparts</span>
                                                    </div>

                                                    <div className="mb-4">
                                                        <div className="flex items-center justify-between text-[9px] text-slate-700 font-bold mb-1.5">
                                                            <span>{t.sim_progress}</span>
                                                            <span className="mono">{simProgress === 100 ? '10 / 10' : simProgress === 80 ? '8 / 10' : '6 / 10'} {t.sim_units}</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-200 overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all duration-300 ${simProgress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                                                style={{ width: `${simProgress}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            onClick={() => setSimProgress(80)}
                                                            className={`w-full py-2.5 rounded-[2px] border text-[10px] font-bold transition-all flex items-center justify-center ${
                                                                simProgress === 80
                                                                    ? 'bg-blue-700 border-blue-700 text-white'
                                                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                                            }`}
                                                        >
                                                            {t.sim_add2}
                                                        </button>
                                                        <button
                                                            onClick={() => setSimProgress(100)}
                                                            className={`w-full py-2.5 rounded-[2px] border text-[10px] font-bold transition-all flex items-center justify-center ${
                                                                simProgress === 100
                                                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                                            }`}
                                                        >
                                                            {t.sim_finish}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-1.5">
                                                    <button
                                                        onClick={triggerUpdateSend}
                                                        disabled={isSending}
                                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white border-none rounded-[2px] text-[10.5px] font-bold text-center cursor-pointer flex items-center justify-center gap-1 transition-colors"
                                                    >
                                                        {isSending ? t.sim_sending : t.sim_send}
                                                    </button>
                                                    <button
                                                        onClick={resetSimulator}
                                                        className="w-full py-2 bg-transparent hover:bg-slate-50 text-[8.5px] text-slate-400 border-none font-semibold text-center rounded-[2px]"
                                                    >
                                                        {t.sim_back}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {simStep === 'success' && (
                                            <div className="flex-1 flex flex-col justify-between text-center pt-4">
                                                <div className="flex-1 flex flex-col items-center justify-center">
                                                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </div>
                                                    <h4 className="text-[12px] font-extrabold text-slate-900 mb-2">{t.sim_sent_title}</h4>
                                                    <p className="text-[9.5px] text-slate-500 leading-relaxed px-1">
                                                        {t.sim_sent_body.replace('{pct}', String(simProgress))}
                                                    </p>
                                                </div>

                                                <div className="flex flex-col gap-1.5">
                                                    <button
                                                        onClick={resetSimulator}
                                                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white border-none rounded-[2px] text-[10px] font-bold transition-colors"
                                                    >
                                                        {t.sim_reset}
                                                    </button>
                                                    <span className="text-[7.5px] text-slate-400">{t.sim_see_monitor}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            </Reveal>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== SECTORS MARQUEE ===== */}
            <section className="border-b border-slate-200 bg-slate-50 py-6 overflow-hidden">
                <p className="mono text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400 text-center mb-4">
                    {t.marquee_label}
                </p>
                <div className="marquee-mask">
                    <div className="marquee-track flex items-center gap-0 w-max">
                        {[...t.marquee_items, ...t.marquee_items].map((m, i) => (
                            <span key={i} className="inline-flex items-center gap-5 mx-5 whitespace-nowrap">
                                <span className="w-6 h-px bg-slate-300" />
                                <span className="mono text-[12px] font-medium uppercase tracking-[0.14em] text-slate-500">{m}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== PAIN ===== */}
            <section className="border-b border-slate-200 bg-slate-50">
                <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-16 md:py-24">
                    <SectionHead num="01" eyebrow={t.pain_eyebrow} title={t.pain_title} sub={t.pain_sub} />

                    <Reveal>
                        <div className="border-t border-slate-200 mb-12">
                            {t.pain_items.map((p, i) => (
                                <div key={i} className="grid md:grid-cols-12 gap-3 md:gap-8 py-7 md:py-8 border-b border-slate-200">
                                    <div className="md:col-span-1 mono text-[13px] font-medium text-slate-400">0{i + 1}</div>
                                    <h3 className="md:col-span-5 text-base md:text-lg font-bold text-slate-900 leading-snug">{p.q}</h3>
                                    <p className="md:col-span-6 text-sm text-slate-500 leading-relaxed">{p.a}</p>
                                </div>
                            ))}
                        </div>
                    </Reveal>

                    <Reveal>
                        <div className="border border-slate-200 border-l-2 border-l-blue-700 bg-white p-6 md:p-8">
                            <div className="mono text-[10px] font-medium tracking-[0.2em] text-blue-700 uppercase mb-3">POgrid.id</div>
                            <p className="text-sm md:text-base font-semibold text-slate-800 leading-relaxed max-w-3xl">
                                {t.pain_solution}
                            </p>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ===== HOW IT WORKS ===== */}
            <section id="cara" className="border-b border-slate-200">
                <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-16 md:py-24">
                    <SectionHead num="02" eyebrow={t.how_eyebrow} title={t.how_title} sub={t.how_sub} />

                    <Reveal>
                        <div className="line-grid grid grid-cols-1 lg:grid-cols-3 border border-slate-200">
                            {t.steps.map((s, i) => (
                                <div key={i} className="cell-hover relative p-7 md:p-9">
                                    <div className="flex items-center justify-between mb-8">
                                        <span className="mono text-4xl font-semibold text-slate-900">0{s.n}</span>
                                        <span className="block h-[2px] w-8 bg-blue-700" />
                                    </div>
                                    <h3 className="text-base md:text-lg font-bold text-slate-900 mb-3">{s.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </Reveal>

                    <Reveal>
                        <div className="flex items-center gap-4 mt-10">
                            <span className="block h-px w-10 bg-blue-700" />
                            <p className="text-sm md:text-base text-slate-700 font-semibold">{t.how_outcome}</p>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ===== FEATURES ===== */}
            <section id="fitur" className="border-b border-slate-200 bg-slate-50">
                <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-16 md:py-24">
                    <SectionHead num="03" eyebrow={t.feat_eyebrow} title={t.feat_title} sub={t.feat_sub} />

                    <Reveal>
                        <div className="line-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-slate-200 bg-white">
                            {t.features.map((f, i) => (
                                <div key={i} className="cell-hover relative p-7 md:p-8">
                                    <div className="flex items-start justify-between mb-6">
                                        <span className="inline-flex items-center justify-center w-10 h-10 border border-slate-200 bg-white">
                                            {featureIcons[i] || <Check size={18} className="text-blue-700" />}
                                        </span>
                                        <span className="mono text-[11px] font-medium tracking-[0.14em] text-slate-400">F.0{i + 1}</span>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">{f.t}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{f.d}</p>
                                </div>
                            ))}
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ===== COMPARISON ===== */}
            <section className="border-b border-slate-200">
                <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-16 md:py-24">
                    <SectionHead num="04" eyebrow={t.compare_eyebrow} title={t.compare_title} sub={t.compare_sub} />

                    <Reveal>
                        <div className="overflow-x-auto border border-slate-200 bg-white">
                            <table className="w-full min-w-[640px] text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="mono py-4 px-6 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 w-[34%]">{t.compare_aspect}</th>
                                        <th className="mono py-4 px-6 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                                            {t.compare_cols[0]}
                                        </th>
                                        <th className="mono py-4 px-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-800 border-l-2 border-l-blue-700">
                                            {t.compare_cols[1]}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {t.compare_rows.map((r, i) => (
                                        <tr key={i} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                                            <td className="py-4 px-6 text-sm font-semibold text-slate-800">{r.label}</td>
                                            <td className="py-4 px-6 text-sm text-slate-500">
                                                <span className="inline-flex items-start gap-2.5">
                                                    <span className="mt-0.5 w-5 h-5 rounded-[2px] bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                                                        <Cross size={10} className="text-red-500" />
                                                    </span>
                                                    {r.bad}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-slate-700 border-l-2 border-l-blue-700">
                                                <span className="inline-flex items-start gap-2.5">
                                                    <span className="mt-0.5 w-5 h-5 rounded-[2px] bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                                                        <Check size={10} className="text-emerald-600" />
                                                    </span>
                                                    {r.good}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ===== SECTORS + TESTIMONIALS ===== */}
            <section className="border-b border-slate-200 bg-slate-50">
                <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-16 md:py-24">
                    <SectionHead num="05" eyebrow={t.sector_eyebrow} title={t.sector_title} sub={t.sector_sub} />

                    <Reveal>
                        <div className="line-grid grid grid-cols-1 lg:grid-cols-3 border border-slate-200 bg-white mb-14">
                            {t.proof_items.map((p, i) => (
                                <div key={i} className="cell-hover relative p-7 md:p-9 overflow-hidden">
                                    <span className="mono absolute -top-2 right-4 text-6xl font-semibold text-slate-100 select-none pointer-events-none">0{i + 1}</span>
                                    <div className="relative">
                                        <span className="inline-flex items-center justify-center w-11 h-11 border border-slate-200 bg-white mb-6">
                                            {sectorIcons[i]}
                                        </span>
                                        <div className="mono text-[10px] font-medium tracking-[0.18em] text-slate-400 uppercase mb-2">{t.sector_tag} 0{i + 1}</div>
                                        <h3 className="text-base md:text-lg font-bold text-slate-900 mb-3">{p.t}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{p.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ===== TRUST BAND ===== */}
            <section className="border-b border-slate-200">
                <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-12 md:py-16">
                    <Reveal>
                        <div className="line-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 bg-white">
                            {t.trust_items.map((item, i) => (
                                <div key={i} className="cell-hover flex items-start gap-3.5 px-5 py-5">
                                    <span className="flex-shrink-0 w-10 h-10 border border-slate-200 bg-white flex items-center justify-center">
                                        {trustIcons[i]}
                                    </span>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 mb-1">{item.t}</div>
                                        <div className="text-[12px] text-slate-500 leading-snug">{item.d}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ===== PRICING ===== */}
            <section id="harga" className="border-b border-slate-200 bg-slate-50">
                <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-16 md:py-24">
                    <SectionHead num="06" eyebrow={t.price_eyebrow} title={t.price_title} sub={t.price_sub} />

                    <Reveal>
                        <div className="relative max-w-[620px] mx-auto bg-white border border-slate-200">
                            <span className="absolute top-0 left-0 right-0 h-[2px] line-grad" />
                            <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-slate-900" />
                            <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-slate-900" />
                            <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-slate-900" />
                            <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-slate-900" />

                            <div className="p-8 md:p-12">
                                <div className="flex items-start justify-between gap-4 mb-8 pb-8 border-b border-slate-100">
                                    <div>
                                        <div className="mono text-[11px] font-medium uppercase tracking-[0.18em] text-blue-700 mb-3">{t.plan_name}</div>
                                        <div className="flex items-baseline gap-3">
                                            <span className="landing-display text-6xl font-extrabold text-slate-900 tracking-[-0.03em]">{t.plan_price}</span>
                                            <span className="mono text-[13px] text-slate-500 font-medium">{t.plan_period}</span>
                                        </div>
                                    </div>
                                    <span className="mono inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 uppercase tracking-[0.1em]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {t.plan_badge}
                                    </span>
                                </div>

                                <p className="text-[15px] text-slate-600 font-medium mb-7">{t.price_feature_label}</p>

                                <ul className="flex flex-col gap-3.5 mb-10">
                                    {t.price_features.map((f, i) => (
                                        <li key={i} className="flex items-start gap-3 text-[14px] text-slate-700">
                                            <span className="mono flex-shrink-0 text-blue-700 font-semibold mt-px">+</span>
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                <a
                                    href={appUrl('/register')}
                                    className="btn-dark w-full py-4 text-white font-semibold text-base flex items-center justify-center gap-2"
                                >
                                    {t.price_cta}
                                    <ArrowRight size={17} />
                                </a>
                                <div className="mono flex items-center justify-center gap-6 text-[11px] text-slate-400 mt-5 uppercase tracking-[0.1em]">
                                    {t.price_note.map((n, i) => (
                                        <span key={i} className="inline-flex items-center gap-1.5">
                                            <Check size={12} className="text-emerald-600" />
                                            {n}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ===== FAQ ===== */}
            <section id="faq" className="border-b border-slate-200">
                <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-16 md:py-24">
                    <div className="max-w-[840px] mx-auto">
                        <SectionHead num="07" eyebrow={t.faq_eyebrow} title={t.faq_title} />

                        <div className="border-t border-slate-200">
                            {t.faqs.map((f, i) => {
                                const open = openFaq === i;
                                return (
                                    <Reveal key={i} delay={i * 40}>
                                        <div className="border-b border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => setOpenFaq(open ? null : i)}
                                                className="w-full text-left bg-transparent border-none cursor-pointer py-5 md:py-6 flex justify-between items-center gap-6 text-slate-800 hover:text-slate-900 font-bold text-sm md:text-[15px]"
                                            >
                                                <span className="flex items-baseline gap-4">
                                                    <span className="mono text-[11px] font-medium text-slate-400">0{i + 1}</span>
                                                    <span>{f.q}</span>
                                                </span>
                                                <span className={`flex-shrink-0 w-8 h-8 border flex items-center justify-center transition-all duration-200 ${open ? 'border-blue-700 bg-blue-700 text-white rotate-180' : 'border-slate-300 bg-white text-slate-400'}`}>
                                                    <ChevronDownIcon size={15} />
                                                </span>
                                            </button>

                                            <div className={`transition-all duration-300 ease-in-out ${open ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                                <p className="text-xs md:text-sm text-slate-500 leading-relaxed pb-6 pl-8 md:pl-10 pr-4 max-w-2xl">{f.a}</p>
                                            </div>
                                        </div>
                                    </Reveal>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== FINAL CTA ===== */}
            <section className="bg-slate-950">
                <div className="relative max-w-[1200px] mx-auto border-x border-white/10 px-4 md:px-10 py-20 md:py-28 overflow-hidden">
                    <span className="absolute top-0 left-0 right-0 h-[2px] line-grad" />
                    <div className="absolute inset-0 pointer-events-none cta-grid" />
                    <div className="relative">
                        <Reveal>
                            <div className="flex items-center gap-4 mb-8">
                                <span className="mono text-[11px] font-medium tracking-[0.22em] text-blue-300 uppercase whitespace-nowrap">{t.final_eyebrow}</span>
                                <span className="h-px w-24 bg-white/20" />
                            </div>
                            <h2 className="landing-display text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-5 tracking-tight max-w-3xl">{t.final_title}</h2>
                            <p className="text-sm md:text-base text-slate-400 max-w-xl mb-12">{t.final_sub}</p>

                            <div className="flex flex-wrap gap-3.5 items-center">
                                <a href={appUrl('/register')} className="btn-white inline-flex items-center gap-2.5 font-semibold text-base px-8 py-4">
                                    {t.final_cta}
                                    <ArrowRight size={17} />
                                </a>
                                <a
                                    href={waUrl(lang)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2.5 text-white font-semibold text-base px-8 py-4 border border-white/25 hover:bg-white/10 transition-colors"
                                >
                                    <WhatsAppIcon size={17} />
                                    {t.hero_cta_demo}
                                </a>
                                <div className="w-full mt-6">
                                    <LangToggle lang={lang} onChange={setLang} dark />
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="bg-white">
                <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-5 flex flex-col items-start">
                        <img
                            src="/pogrid-logo.png"
                            alt="POgrid.id Logo"
                            style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
                            className="mb-5"
                        />
                        <p className="text-xs md:text-sm text-slate-500 leading-relaxed max-w-[320px] mb-6">{t.footer_tag}</p>
                        <div className="flex gap-2.5">
                            <a href={waUrl(lang)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-9 h-9 border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:border-emerald-300 transition-colors duration-150 flex items-center justify-center">
                                <WhatsAppIcon size={16} />
                            </a>
                            <a href="#" aria-label="LinkedIn" className="w-9 h-9 border border-slate-200 bg-white text-slate-500 hover:text-blue-700 hover:border-blue-300 transition-colors duration-150 flex items-center justify-center">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                            </a>
                            <a href="#" aria-label="Instagram" className="w-9 h-9 border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-colors duration-150 flex items-center justify-center">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                            </a>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <h4 className="mono text-[11px] font-semibold text-slate-900 uppercase tracking-[0.18em] mb-5">{t.footer_product}</h4>
                        <ul className="flex flex-col gap-3.5">
                            {t.footer_links_product.map((l, i) => (
                                <li key={i}>
                                    <a href={hrefFor(i)} className="text-xs md:text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150">{l}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="lg:col-span-2">
                        <h4 className="mono text-[11px] font-semibold text-slate-900 uppercase tracking-[0.18em] mb-5">{t.footer_company}</h4>
                        <ul className="flex flex-col gap-3.5">
                            {t.footer_links_company.map((l, i) => (
                                <li key={i}>
                                    <a href={appUrl(i === 0 ? '/login' : '/register')} className="text-xs md:text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150">{l}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="lg:col-span-3">
                        <h4 className="mono text-[11px] font-semibold text-slate-900 uppercase tracking-[0.18em] mb-5">{t.footer_legal}</h4>
                        <ul className="flex flex-col gap-3.5">
                            <li>
                                <Link href="/terms" className="text-xs md:text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150">{t.footer_terms}</Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="text-xs md:text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150">{t.footer_privacy}</Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="max-w-[1200px] mx-auto border-x border-t border-slate-200 px-4 md:px-10 py-6">
                    <div className="mono text-[11px] text-slate-400 tracking-[0.06em]">© {new Date().getFullYear()} {t.footer_copy}</div>
                </div>
            </footer>

            {/* ===== Landing CSS ===== */}
            <style>{`
                .landing-root {
                    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
                    -webkit-font-smoothing: antialiased;
                }
                .landing-display {
                    font-family: 'Oswald', 'Inter', ui-sans-serif, system-ui, sans-serif;
                    letter-spacing: -0.02em;
                }
                .mono {
                    font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
                }

                /* ---- Hero (dark control room) ---- */
                .hero-grid {
                    background-image:
                        linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
                    background-size: 44px 44px;
                }
                .hero-h1 {
                    font-size: clamp(2.6rem, 5vw + 1rem, 4.5rem);
                    line-height: 1.02;
                    letter-spacing: -0.03em;
                    font-weight: 800;
                }
                .hero-link {
                    box-shadow: inset 0 -1px 0 rgba(147, 197, 253, 0.4);
                    transition: box-shadow 0.15s ease, color 0.15s ease;
                }
                .hero-link:hover {
                    box-shadow: inset 0 -2px 0 #60a5fa;
                }

                /* ---- Gradient lines ---- */
                .line-grad {
                    background: linear-gradient(90deg, transparent 0%, #1d4ed8 25%, #0ea5e9 50%, #1d4ed8 75%, transparent 100%);
                }
                .line-grad-fade {
                    background: linear-gradient(90deg, rgba(29, 78, 216, 0.45), rgba(148, 163, 184, 0.28) 50%, transparent);
                }

                /* ---- Gradient text ---- */
                .grad-text {
                    background: linear-gradient(94deg, #f8fafc 5%, #60a5fa 60%, #38bdf8 100%);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                }

                /* ---- Buttons ---- */
                .btn-dark {
                    background: #0f172a;
                    transition: background 0.15s ease, transform 0.15s ease;
                }
                .btn-dark:hover {
                    background: #1e293b;
                    transform: translateY(-1px);
                }
                .btn-dark:active { transform: translateY(0); }

                .btn-white {
                    background: #ffffff;
                    color: #0f172a;
                    transition: background 0.15s ease, transform 0.15s ease;
                }
                .btn-white:hover {
                    background: #e2e8f0;
                    transform: translateY(-1px);
                }
                .btn-white:active { transform: translateY(0); }

                /* ---- Hairline grid cells ---- */
                .line-grid > * {
                    border: 0 solid #e2e8f0;
                    border-top-width: 1px;
                    border-left-width: 1px;
                    margin-left: -1px;
                    margin-top: -1px;
                }
                .cell-hover {
                    transition: box-shadow 0.18s ease, background 0.18s ease;
                }
                .cell-hover:hover {
                    box-shadow: inset 0 2px 0 #1d4ed8;
                    background: #f8fafc;
                }

                /* ---- Reveal on scroll ---- */
                .reveal {
                    opacity: 0;
                    transform: translateY(22px);
                    transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: opacity, transform;
                }
                .reveal-visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                @media (prefers-reduced-motion: reduce) {
                    .reveal { opacity: 1; transform: none; transition: none; }
                    .marquee-track { animation: none !important; }
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
                    animation: marqueeScroll 32s linear infinite;
                }
                .marquee-mask:hover .marquee-track { animation-play-state: paused; }

                /* ---- CTA grid pattern ---- */
                .cta-grid {
                    background-image:
                        linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
                    background-size: 44px 44px;
                    mask-image: linear-gradient(to bottom, transparent, black 60%);
                    -webkit-mask-image: linear-gradient(to bottom, transparent, black 60%);
                }

                /* ---- Mockup responsive ---- */
                @media (max-width: 1023px) {
                    .dashboard-mockup { display: none !important; }
                    .phone-mockup-wrapper {
                        position: relative !important;
                        right: auto !important;
                        bottom: auto !important;
                        margin: 0 auto;
                    }
                }

                html { scroll-behavior: smooth; }
                section[id] { scroll-margin-top: 5rem; }
                /* overflow-x: hidden on body breaks position: sticky; clip does not */
                html, body { overflow-x: clip !important; }
            `}</style>
        </div>
    );
}
