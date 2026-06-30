import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ChevronDown, Settings, Lock, Plus, Palette, Stop, Broadcast, Globe, Copy, DotGreen } from '../../Components/Icons';

interface Stage {
    id: number;
    stage_name: string;
    completed_qty: number;
    progress_percent: string;
    status: string;
}

interface Item {
    id: number;
    item_name: string;
    target_qty: number;
    item_type: string;
    progress_percent: string;
    status: string;
    item_progresses: Stage[];
    delivered_qty: number;
    vendor_name?: string | null;
    vendor_phone?: string | null;
}

interface Po {
    id: number;
    po_number: string;
    external_po_number?: string | null;
    client_name: string;
    global_deadline: string;
    status: string;
    items: Item[];
    is_urgent?: boolean | null;
}

const formatDeadline = (deadlineDateStr: string, lang: 'en' | 'id') => {
    if (!deadlineDateStr) return '';
    const deadline = new Date(deadlineDateStr);
    const deadlineClean = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    const today = new Date();
    const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = deadlineClean.getTime() - todayClean.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dateFormatted = deadlineClean.toLocaleDateString();

    if (diffDays === 0) {
        return lang === 'id' ? `${dateFormatted} (Hari Ini)` : `${dateFormatted} (Today)`;
    } else if (diffDays > 0) {
        if (diffDays === 7) return lang === 'id' ? `${dateFormatted} (1 minggu)` : `${dateFormatted} (1 week)`;
        if (diffDays === 30) return lang === 'id' ? `${dateFormatted} (1 bulan)` : `${dateFormatted} (1 month)`;
        return lang === 'id' ? `${dateFormatted} (${diffDays} hari)` : `${dateFormatted} (${diffDays} days)`;
    } else {
        return lang === 'id' ? `${dateFormatted} (terlambat ${Math.abs(diffDays)} hari)` : `${dateFormatted} (delayed ${Math.abs(diffDays)} days)`;
    }
};

const renderWarningPill = (deadlineDateStr: string | undefined, hasRework: boolean, lang: 'en' | 'id') => {
    if (!deadlineDateStr) return null;
    
    // Check Rework first (takes precedence or is a high priority status)
    if (hasRework) {
        return (
            <span className="badge" style={{
                backgroundColor: 'rgba(249, 115, 22, 0.15)', // Orange background
                color: '#f97316', // Orange text
                border: '1px solid rgba(249, 115, 22, 0.2)',
                fontSize: '11px',
                padding: '3px 8px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#f97316', borderRadius: '50%' }} />
                {lang === 'id' ? 'Rework' : 'Rework'}
            </span>
        );
    }

    const deadline = new Date(deadlineDateStr);
    const deadlineClean = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    const today = new Date();
    const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = deadlineClean.getTime() - todayClean.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        // Red warning (delayed)
        const days = Math.abs(diffDays);
        const text = lang === 'id' 
            ? `Terlambat ${days} hari` 
            : `Delayed ${days} day${days > 1 ? 's' : ''}`;
        return (
            <span className="badge" style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)', // Red background
                color: '#ef4444', // Red text
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontSize: '11px',
                padding: '3px 8px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#ef4444', borderRadius: '50%' }} />
                {text}
            </span>
        );
    } else if (diffDays <= 3) {
        // Yellow warning (deadline close)
        let text = '';
        if (diffDays === 0) {
            text = lang === 'id' ? 'Hari Ini' : 'Today';
        } else {
            text = lang === 'id' 
                ? `${diffDays} hari lagi` 
                : `${diffDays} more day${diffDays > 1 ? 's' : ''}`;
        }
        return (
            <span className="badge" style={{
                backgroundColor: 'rgba(234, 179, 8, 0.15)', // Yellow background
                color: '#eab308', // Yellow text
                border: '1px solid rgba(234, 179, 8, 0.2)',
                fontSize: '11px',
                padding: '3px 8px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#eab308', borderRadius: '50%' }} />
                {text}
            </span>
        );
    } else {
        // Green warning (normal/on track)
        return (
            <span className="badge" style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)', // Green background
                color: '#10b981', // Green text
                border: '1px solid rgba(16, 185, 129, 0.2)',
                fontSize: '11px',
                padding: '3px 8px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' }} />
                {lang === 'id' ? 'Normal' : 'Normal'}
            </span>
        );
    }
};

const getItemStateColor = (deadlineDateStr: string | undefined, hasRework: boolean, itemStatus: string): { bg: string; border: string; glow: string } => {
    if (!deadlineDateStr) return { bg: 'transparent', border: 'transparent', glow: 'transparent' };
    if (itemStatus === 'TERMINATED' || itemStatus === 'CANCELLED') return { bg: 'rgba(239, 68, 68, 0.03)', border: 'rgba(239, 68, 68, 0.15)', glow: 'rgba(239, 68, 68, 0.06)' };
    
    // Check Rework first (takes precedence or is a high priority status)
    if (hasRework) {
        return { bg: 'rgba(249, 115, 22, 0.04)', border: 'rgba(249, 115, 22, 0.2)', glow: 'rgba(249, 115, 22, 0.08)' };
    }

    const deadline = new Date(deadlineDateStr);
    const deadlineClean = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    const today = new Date();
    const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = deadlineClean.getTime() - todayClean.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        // Red warning (delayed)
        return { bg: 'rgba(239, 68, 68, 0.04)', border: 'rgba(239, 68, 68, 0.2)', glow: 'rgba(239, 68, 68, 0.08)' };
    } else if (diffDays <= 3) {
        // Orange warning (deadline close)
        return { bg: 'rgba(249, 115, 22, 0.04)', border: 'rgba(249, 115, 22, 0.2)', glow: 'rgba(249, 115, 22, 0.08)' };
    }
    return { bg: 'transparent', border: 'transparent', glow: 'transparent' };
};

interface Alert {
    id: number;
    item_id: number;
    severity: string;
    message: string;
    is_resolved: boolean;
    item?: {
        id: number;
        po_id: number;
    };
}

interface DoItem {
    id: number;
    delivery_order_id: number;
    item_id: number;
    delivered_qty: number;
    item?: Item;
}

interface DeliveryOrder {
    id: number;
    po_id: number;
    do_number: string;
    delivery_date: string;
    po?: Po;
    do_items: DoItem[];
}

interface Invoice {
    id: number;
    delivery_order_id: number | null;
    invoice_number: string;
    total_amount: string;
    status: string;
    due_date: string;
    invoice_type: string;
    delivery_order?: DeliveryOrder;
}

interface User {
    id: number;
    name: string;
    username: string | null;
    role: string;
}

interface Props {
    pos: Po[];
    alerts: Alert[];
    users: User[];
    tenant?: {
        company_name: string;
        slug: string;
    };
    auth_user?: User;
    telemetry?: any;
    selected_range?: string;
}

const translations = {
    en: {
        owner_command_center: "Command Center",
        subtitle_realtime: "Real-time production monitoring & risk control",
        po_directory: "PO Directory",
        broadcast_new_po: "New PO",
        no_pos: "No POs found.",
        unresolved_alerts: "Open Alerts",
        validation_error: "Validation Error",
        floor_terminal_url: "Worker Terminal URL",
        floor_terminal_desc: "Share this link with workers to log in using their PIN:",
        settings: "Settings",
        change_password: "Change Password",
        add_admin: "Add Admin",
        color_themes: "Themes",
        coming_soon: "Coming Soon",
        language_label: "Language",
        lang_en: "English",
        lang_id: "Bahasa Indonesia",
        current_password: "Current Password",
        new_password: "New Password",
        confirm_password: "Confirm Password",
        cancel: "Cancel",
        submit: "Submit",
        save_changes: "Save Changes",
        admin_name: "Full Name",
        admin_username: "Username",
        admin_password: "Password",
        create_admin: "Create Admin",
        admin_subtitle: "Create an administrator account with full system access.",
        performance_matrix: "Performance Matrix",
        on_time_delivery: "On-Time Deliv. %",
        parts_manufactured: "Parts Manufactured",
        active_risks: "Active Risks",
        avg_delay: "Avg Delay",
        this_week: "This Week",
        this_month: "This Month",
        this_year: "This Year",
        bottleneck_analyzer: "Bottleneck Stage Analyzer",
        stage: "Stage",
        active_items: "Active Items",
        stuck_incidents: "Stuck Incidents",
        rework_count: "Rework Count",
        avg_cycle_time: "Avg. Cycle Time (Days)",
        production_overdue_trends: "Production Output & Overdue Trends",
        why_delayed_reasons: "\"Why Delayed\" Reasons",
        export_pdf: "Export PDF",
        presentation_mode: "Presentation Mode",
        exit_presentation: "Exit Presentation Mode",
        no_incidents: "No operational failures logged.",
        legend_completed: "Completed Qty",
        legend_overdue: "Overdue Count",
        active_delays_directory: "Active Delay & Risk Directory",
        po_number_label: "PO Number",
        client_label: "Client",
        item_name_label: "Item",
        progress_label: "Progress",
        deadline_label: "Deadline",
        delay_reason_label: "Stuck / Delay Reason",
        days_overdue_label: "Overdue",
        days_suffix: "days",
        no_delays: "No active delays or overdue items.",
    },
    id: {
        owner_command_center: "Pusat Kendali",
        subtitle_realtime: "Pemantauan produksi real-time & kendali risiko",
        po_directory: "Direktori PO",
        broadcast_new_po: "PO Baru",
        no_pos: "Tidak ada PO.",
        unresolved_alerts: "Peringatan Aktif",
        validation_error: "Kesalahan Validasi",
        floor_terminal_url: "URL Terminal Pekerja",
        floor_terminal_desc: "Bagikan tautan ini ke pekerja untuk masuk menggunakan PIN mereka:",
        settings: "Pengaturan",
        change_password: "Ubah Kata Sandi",
        add_admin: "Tambah Admin",
        color_themes: "Tema",
        coming_soon: "Segera Hadir",
        language_label: "Bahasa",
        lang_en: "English",
        lang_id: "Bahasa Indonesia",
        current_password: "Kata Sandi Saat Ini",
        new_password: "Kata Sandi Baru",
        confirm_password: "Konfirmasi Kata Sandi",
        cancel: "Batal",
        submit: "Kirim",
        save_changes: "Simpan Perubahan",
        admin_name: "Nama Lengkap",
        admin_username: "Nama Pengguna",
        admin_password: "Kata Sandi",
        create_admin: "Buat Admin",
        admin_subtitle: "Buat akun administrator dengan akses penuh ke sistem.",
        performance_matrix: "Matriks Kinerja",
        on_time_delivery: "% Pengiriman Tepat Waktu",
        parts_manufactured: "Bagian Diproduksi",
        active_risks: "Risiko Aktif",
        avg_delay: "Rata-rata Keterlambatan",
        this_week: "Minggu Ini",
        this_month: "Bulan Ini",
        this_year: "Tahun Ini",
        bottleneck_analyzer: "Analisis Tahap Hambatan (Bottleneck)",
        stage: "Tahap",
        active_items: "Item Aktif",
        stuck_incidents: "Insiden Stuck",
        rework_count: "Jumlah Rework",
        avg_cycle_time: "Rata-rata Waktu Siklus (Hari)",
        production_overdue_trends: "Tren Output Produksi & Keterlambatan",
        why_delayed_reasons: "Alasan Keterlambatan",
        export_pdf: "Ekspor PDF",
        presentation_mode: "Mode Presentasi",
        exit_presentation: "Keluar Mode Presentasi",
        no_incidents: "Tidak ada kegagalan operasional yang tercatat.",
        legend_completed: "Selesai",
        legend_overdue: "Terlambat",
        active_delays_directory: "Direktori Keterlambatan & Risiko Aktif",
        po_number_label: "Nomor PO",
        client_label: "Klien",
        item_name_label: "Item",
        progress_label: "Progres",
        deadline_label: "Tenggat Waktu",
        delay_reason_label: "Alasan Stuck / Terlambat",
        days_overdue_label: "Terlambat",
        days_suffix: "hari",
        no_delays: "Tidak ada keterlambatan atau item yang stuck.",
    }
};

export default function OwnerDashboard({ pos, alerts, users, tenant, auth_user, telemetry, selected_range }: Props) {
    const { errors } = usePage().props;

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

    const [activeTab, setActiveTab] = useState<'alerts' | 'active' | 'completed' | 'matrix'>('alerts');
    const [isPresentationMode, setIsPresentationMode] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const togglePresentationMode = () => {
        setIsPresentationMode(prev => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                if (next) {
                    document.body.classList.add('presentation-mode');
                } else {
                    document.body.classList.remove('presentation-mode');
                }
            }
            return next;
        });
    };

    const handleRangeChange = (newRange: string) => {
        router.get(window.location.pathname, { range: newRange }, { preserveState: true });
    };

    const getUnifiedIssuesList = () => {
        const issues: {
            id: string;
            po_id?: number;
            severity: 'RED' | 'YELLOW' | 'BLUE' | 'ORANGE';
            type: 'DELAYED' | 'URGENT' | 'REWORK' | 'TROUBLE' | 'STUCK' | 'PIN_RESET' | 'OTHER';
            title: string;
            message: string;
            action?: () => void;
        }[] = [];

        const today = new Date();
        const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // 1. Process active POs and items for delayed, close deadline, stuck, reworks, trouble
        pos.forEach(po => {
            if (po.status === 'COMPLETED') return;

            const deadline = new Date(po.global_deadline);
            const deadlineClean = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
            const diffTime = deadlineClean.getTime() - todayClean.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            po.items.forEach(item => {
                if (item.status === 'COMPLETED' || item.status === 'CANCELLED' || item.status === 'TERMINATED') return;

                // A. Check Delayed (deadline passed)
                if (diffDays < 0) {
                    issues.push({
                        id: `delayed-${item.id}`,
                        po_id: po.id,
                        severity: 'RED',
                        type: 'DELAYED',
                        title: language === 'en' ? 'DELAYED' : 'TERLAMBAT',
                        message: language === 'en' 
                            ? `Item "${item.item_name}" for client "${po.client_name}" is delayed by ${Math.abs(diffDays)} day(s).`
                            : `Item "${item.item_name}" untuk klien "${po.client_name}" terlambat ${Math.abs(diffDays)} hari.`,
                    });
                }
                // B. Check Close Deadline (within 3 days)
                else if (diffDays <= 3) {
                    const daysText = diffDays === 0 
                        ? (language === 'en' ? 'Today' : 'Hari Ini') 
                        : (language === 'en' ? `${diffDays} more day(s)` : `${diffDays} hari lagi`);
                    issues.push({
                        id: `close-${item.id}`,
                        po_id: po.id,
                        severity: 'YELLOW',
                        type: 'URGENT',
                        title: language === 'en' ? 'DEADLINE CLOSE' : 'TENGGAT DEKAT',
                        message: language === 'en'
                            ? `Item "${item.item_name}" for client "${po.client_name}" is approaching deadline (${daysText}).`
                            : `Item "${item.item_name}" untuk klien "${po.client_name}" mendekati tenggat waktu (${daysText}).`,
                    });
                }

                // C. Check Stuck stages
                if (item.item_progresses) {
                    item.item_progresses.forEach(progress => {
                        if (progress.status === 'STUCK') {
                            issues.push({
                                id: `stuck-stage-${progress.id}`,
                                po_id: po.id,
                                severity: 'RED',
                                type: 'STUCK',
                                title: language === 'en' ? 'STAGE STUCK' : 'TAHAP STUCK',
                                message: language === 'en'
                                    ? `Production stage "${progress.stage_name}" for item "${item.item_name}" is stuck.`
                                    : `Tahap produksi "${progress.stage_name}" untuk item "${item.item_name}" dalam kondisi stuck.`,
                            });
                        }
                    });
                }
            });
        });

        // 2. Process database alerts
        alerts.forEach(alert => {
            const isPinReset = alert.message.startsWith('PIN Reset Requested');
            
            if (isPinReset) {
                issues.push({
                    id: `alert-pin-${alert.id}`,
                    severity: 'BLUE',
                    type: 'PIN_RESET',
                    title: language === 'en' ? 'PIN RESET REQUEST' : 'PERMINTAAN RESET PIN',
                    message: alert.message,
                    action: () => router.post(`/pin-reset/${alert.id}/approve`)
                });
            } else {
                const severity: 'RED' | 'YELLOW' | 'ORANGE' = alert.severity === 'RED' ? 'RED' : 'ORANGE';
                const type = alert.severity === 'RED' ? 'TROUBLE' : 'REWORK';
                const title = type === 'TROUBLE' 
                    ? (language === 'en' ? 'PRODUCTION TROUBLE' : 'KENDALA PRODUKSI')
                    : (language === 'en' ? 'QC REWORK ALERT' : 'PERINGATAN REWORK QC');

                issues.push({
                    id: `alert-db-${alert.id}`,
                    po_id: alert.item?.po_id,
                    severity: severity,
                    type: type,
                    title: title,
                    message: alert.message,
                });
            }
        });

        return issues;
    };
    const [expandedPOs, setExpandedPOs] = useState<Set<number>>(new Set());
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

    const togglePO = (id: number) => {
        setExpandedPOs(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleItem = (id: number) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const filteredPos = pos.filter(po => {
        if (activeTab === 'active') return po.status !== 'COMPLETED';
        if (activeTab === 'completed') return po.status === 'COMPLETED';
        return true;
    });

    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

    // Change Password modal


    // Add Admin modal
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [adminName, setAdminName] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    const openAddAdmin = () => {
        setAdminName('');
        setAdminUsername('');
        setAdminPassword('');
        setShowSettingsDropdown(false);
        setShowAddAdminModal(true);
    };

    const submitAddAdmin = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/users', {
            name: adminName,
            role: 'ADMIN',
            login_method: 'PASSWORD',
            username: adminUsername,
            password: adminPassword,
        }, {
            onSuccess: () => setShowAddAdminModal(false),
        });
    };

    // No client/PO creation state â€” moved to dedicated page at /pos/create

    const handleCancel = (itemId: number) => {
        if (confirm('Are you sure you want to cancel this item?')) {
            router.post(`/items/${itemId}/cancel`);
        }
    };

    const handleTerminate = (itemId: number) => {
        if (confirm('WARNING: This will immediately HALT all floor operator operations for this item. Proceed?')) {
            router.post(`/items/${itemId}/terminate`);
        }
    };

    const isOwner = auth_user?.role === 'OWNER';
    const canBroadcastPo = auth_user?.role !== 'OWNER';

    return (
        <div className="responsive-container dashboard-root" style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#090d16',
            fontFamily: 'Inter, sans-serif',
            color: '#f8fafc'
        }}>
            <header className="responsive-header" style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '20px',
                marginBottom: '28px'
            }}>
                <div>
                        <div className="greeting-name" style={{ fontSize: '13px', color: '#60a5fa', fontWeight: 600, marginBottom: '2px' }}>
                            {language === 'en' ? `Hello, ${auth_user?.name}` : `Halo, ${auth_user?.name}`}
                        </div>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{t.owner_command_center}</h1>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                            {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            {' · '}
                            {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Profile - visible to all roles */}
                    <a
                        href={'/c/' + (tenant?.slug || '') + '/profile'}
                        onClick={() => setShowSettingsDropdown(false)}
                        style={{
                            padding: '8px',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: '#94a3b8',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            lineHeight: '1',
                            display: 'flex',
                            textDecoration: 'none',
                        }}
                        title={language === 'en' ? 'Profile' : 'Profil'}
                    >
                        <Settings size={16} />
                    </a>

                    {isOwner && (
                        <button
                            onClick={openAddAdmin}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                color: '#94a3b8',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Plus size={14} /> {t.add_admin}
                        </button>
                    )}

                    <button
                        onClick={() => router.post('/logout')}
                        style={{
                            padding: '8px 14px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {language === 'en' ? 'Exit' : 'Keluar'}
                    </button>
                </div>
            </header>

            <div className="dashboard-above-scroll">
            {/* Error Messages */}
            {errors && Object.keys(errors).length > 0 && (
                <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    color: '#ef4444'
                }}>
                    <h4 style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Validation Error</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {Object.entries(errors).map(([key, val]) => (
                            <li key={key}>{val as string}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Floor Terminal URL Information Box */}
            {tenant && (
                <div className="floor-terminal-box" style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.06)',
                    border: '1px dashed rgba(37, 99, 235, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', whiteSpace: 'nowrap' }}>
                        {t.floor_terminal_url}
                    </span>
                    <code style={{
                        backgroundColor: '#090d16',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: '#38bdf8',
                        fontSize: '12px',
                        fontWeight: 600,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {typeof window !== 'undefined' ? `${window.location.origin}/c/${tenant.slug}` : `/c/${tenant.slug}`}
                    </code>
                    <button
                        onClick={() => {
                            const url = typeof window !== 'undefined' ? `${window.location.origin}/c/${tenant.slug}` : `/c/${tenant.slug}`;
                            navigator.clipboard.writeText(url);
                            alert('URL copied!');
                        }}
                        style={{
                            padding: '4px 10px',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Copy
                    </button>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="tab-bar">
                <button className={`tab ${activeTab === 'alerts' ? 'tab-active' : ''}`} onClick={() => setActiveTab('alerts')}>
                    {t.unresolved_alerts}
                    {alerts.length > 0 && (
                        <span style={{
                            marginLeft: '6px',
                            fontSize: '10px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            padding: '1px 6px',
                            borderRadius: '8px'
                        }}>
                            {alerts.length}
                        </span>
                    )}
                </button>
                <button className={`tab ${activeTab === 'active' ? 'tab-active' : ''}`} onClick={() => setActiveTab('active')}>
                    Active POs
                </button>
                <button className={`tab ${activeTab === 'completed' ? 'tab-active' : ''}`} onClick={() => setActiveTab('completed')}>
                    Completed
                </button>
                <button className={`tab ${activeTab === 'matrix' ? 'tab-active' : ''}`} onClick={() => setActiveTab('matrix')}>
                    {t.performance_matrix}
                </button>
            </div>

            {/* State Summary Bar */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '0',
                flexWrap: 'wrap'
            }}>
                {(() => {
                    const issues = getUnifiedIssuesList();
                    const delayed = issues.filter(i => i.type === 'DELAYED').length;
                    const close = issues.filter(i => i.type === 'URGENT').length;
                    const reworks = issues.filter(i => i.type === 'REWORK').length;
                    const troubles = issues.filter(i => i.type === 'TROUBLE' || i.type === 'STUCK').length;
                    const total = issues.length;
                    return (
                        <>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {total} {language === 'en' ? 'Issues' : 'Isu'}
                            </span>
                            {delayed > 0 && (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', padding: '4px 10px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.15)' }}>
                                    {delayed} {language === 'en' ? 'Delayed' : 'Terlambat'}
                                </span>
                            )}
                            {close > 0 && (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#f97316', padding: '4px 10px', backgroundColor: 'rgba(249,115,22,0.08)', borderRadius: '6px', border: '1px solid rgba(249,115,22,0.15)' }}>
                                    {close} {language === 'en' ? 'Closing' : 'Dekat'}
                                </span>
                            )}
                            {reworks > 0 && (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#f97316', padding: '4px 10px', backgroundColor: 'rgba(249,115,22,0.08)', borderRadius: '6px', border: '1px solid rgba(249,115,22,0.15)' }}>
                                    {reworks} Rework
                                </span>
                            )}
                            {troubles > 0 && (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', padding: '4px 10px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.15)' }}>
                                    {troubles} {language === 'en' ? 'Stuck' : 'Macet'}
                                </span>
                            )}
                        </>
                    );
                })()}
            </div>
            </div>

            <div className="dashboard-scroll">
            {/* Alert Matrix Panel */}
            {activeTab === 'alerts' && (() => {
                const unifiedIssues = getUnifiedIssuesList();
                return (
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{t.unresolved_alerts}</span>
                            <span style={{
                                fontSize: '12px',
                                backgroundColor: unifiedIssues.length > 0 ? '#ef4444' : '#10b981',
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '12px'
                            }}>
                                {unifiedIssues.length} Triggered
                            </span>
                        </h2>

                        {unifiedIssues.length === 0 ? (
                            <div style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                                border: '1px solid rgba(16, 185, 129, 0.15)',
                                borderRadius: '12px',
                                padding: '16px',
                                color: '#10b981',
                                fontSize: '14px',
                                fontWeight: 500
                            }}>
                                <DotGreen size={10} /> All manufacturing timelines are healthy and no operational failures are reported.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                {unifiedIssues.map((issue) => {
                                    const bgColor = issue.severity === 'RED' ? 'rgba(239, 68, 68, 0.08)' 
                                        : issue.severity === 'BLUE' ? 'rgba(59, 130, 246, 0.08)' 
                                        : issue.severity === 'ORANGE' ? 'rgba(249, 115, 22, 0.08)'
                                        : 'rgba(234, 179, 8, 0.08)';
                                    const bdColor = issue.severity === 'RED' ? 'rgba(239, 68, 68, 0.2)' 
                                        : issue.severity === 'BLUE' ? 'rgba(59, 130, 246, 0.2)' 
                                        : issue.severity === 'ORANGE' ? 'rgba(249, 115, 22, 0.2)'
                                        : 'rgba(234, 179, 8, 0.2)';
                                    const badgeBg = issue.severity === 'RED' ? '#ef4444' 
                                        : issue.severity === 'BLUE' ? '#3b82f6' 
                                        : issue.severity === 'ORANGE' ? '#f97316'
                                        : '#eab308';
                                    const badgeText = issue.title;

                                    return (
                                        <div
                                            key={issue.id}
                                            onClick={() => {
                                                if (issue.po_id) {
                                                    setActiveTab('active');
                                                    togglePO(issue.po_id);
                                                }
                                            }}
                                            style={{
                                                backgroundColor: bgColor,
                                                border: '1px solid',
                                                borderColor: bdColor,
                                                borderRadius: '10px',
                                                padding: '14px 18px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                cursor: issue.po_id ? 'pointer' : 'default',
                                                transition: 'all 0.2s',
                                            }}
                                            className={issue.po_id ? 'hover-grow' : ''}
                                        >
                                            <span className="badge" style={{
                                                color: '#fff',
                                                backgroundColor: badgeBg,
                                                fontSize: '10px',
                                                fontWeight: 800,
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {badgeText}
                                            </span>
                                            <div style={{ fontSize: '14px', color: '#e2e8f0', flexGrow: 1 }}>
                                                {issue.message}
                                            </div>
                                            {issue.action && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        issue.action?.();
                                                    }}
                                                    style={{
                                                        padding: '6px 14px',
                                                        backgroundColor: '#3b82f6',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontWeight: 600,
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {language === 'en' ? 'Approve & Generate PIN' : 'Setujui & Buat PIN'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* PO Grid Section */}
            {(activeTab === 'active' || activeTab === 'completed') && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{t.po_directory}</h2>
                        {canBroadcastPo && (
                            <button
                                onClick={() => router.get('/pos/create')}
                                style={{
                                    padding: '10px 18px',
                                    backgroundColor: '#2563eb',
                                    color: '#fff',
                                    fontWeight: 600,
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                            >
                                <Broadcast size={16} /> {t.broadcast_new_po}
                            </button>
                        )}
                    </div>
                    {filteredPos.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                            {activeTab === 'completed' ? 'No completed POs yet.' : t.no_pos}
                        </div>
                    ) : (
                        <div>
                            {/* Compact summary strip for mobile */}
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', padding: '0 4px' }}>
                                {filteredPos.length} PO{filteredPos.length > 1 ? 's' : ''} &middot; {filteredPos.reduce((sum, po) => sum + po.items.length, 0)} items
                            </div>
                            {filteredPos.map((po) => {
                                const isExpanded = expandedPOs.has(po.id);
                                const poProgress = po.items.length > 0
                                    ? Math.round(po.items.reduce((sum, item) => sum + parseFloat(item.progress_percent), 0) / po.items.length)
                                    : 0;
                                return (
                                    <div key={po.id} className="po-accordion">
                                        <button className="po-accordion-header" onClick={() => togglePO(po.id)}>
                                            <ChevronDown size={16} expanded={isExpanded} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '16px', fontWeight: 800 }}>{po.po_number}</span>
                                                    <span className="badge" style={{
                                                        backgroundColor: po.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                                        color: po.status === 'COMPLETED' ? '#10b981' : '#eab308'
                                                    }}>
                                                        {po.status}
                                                    </span>
                                                    {po.is_urgent && (
                                                        <span className="badge" style={{
                                                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                                            color: '#ef4444',
                                                            border: '1px solid rgba(239, 68, 68, 0.4)'
                                                        }}>
                                                            URGENT
                                                        </span>
                                                    )}
                                                    {(() => {
                                                        const poItemIds = po.items.map(i => i.id);
                                                        const poAlerts = alerts.filter(a => poItemIds.includes(a.item_id) && !a.is_resolved);
                                                        const hasRework = poAlerts.some(a => a.severity === 'YELLOW');
                                                        return renderWarningPill(po.global_deadline, hasRework, language);
                                                    })()}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                                    {po.client_name} &middot; {formatDeadline(po.global_deadline, language)}
                                                    {!isExpanded && po.items.length > 0 && (
                                                        <span style={{ marginLeft: '8px', color: '#3b82f6' }}>
                                                            {po.items.length} item{po.items.length > 1 ? 's' : ''} &middot; {poProgress}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="po-accordion-body">
                                                {po.items.length === 0 ? (
                                                    <div style={{ fontSize: '14px', color: '#64748b', padding: '12px 0' }}>No items in this PO.</div>
                                                ) : (
                                                    po.items.map((item) => {
                                                        const progress = parseFloat(item.progress_percent);
                                                        const hasProgress = progress > 0;
                                                        const isCancelled = item.status === 'CANCELLED';
                                                        const isTerminated = item.status === 'TERMINATED';
                                                        const itemExpanded = expandedItems.has(item.id);

                                                        return (
                                                            <div key={item.id} className="item-compact" style={{
                                                        ...(() => {
                                                            const itemAlerts = alerts.filter(a => a.item_id === item.id && !a.is_resolved);
                                                            const hasRework = itemAlerts.some(a => a.severity === 'YELLOW');
                                                            const sc = getItemStateColor(po.global_deadline, hasRework, item.status);
                                                            return {
                                                                opacity: (isCancelled || isTerminated) ? 0.6 : 1,
                                                                borderLeft: '3px solid ' + sc.border,
                                                                backgroundColor: sc.bg,
                                                                boxShadow: sc.glow !== 'transparent' ? '0 0 12px ' + sc.glow : 'none'
                                                            };
                                                        })()
                                                    }}>
                                                                <button className="item-compact-summary" onClick={() => toggleItem(item.id)}>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{item.item_name}</span>
                                                                            <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                                                                                {item.item_type}
                                                                            </span>
                                                                            <span className="badge" style={{
                                                                                backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.15)'
                                                                                    : isTerminated ? 'rgba(239, 68, 68, 0.15)'
                                                                                    : progress >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                                                color: isCancelled ? '#ef4444'
                                                                                    : isTerminated ? '#ef4444'
                                                                                    : progress >= 100 ? '#10b981' : '#3b82f6'
                                                                            }}>
                                                                                {item.status}
                                                                            </span>
                                                                            {(() => {
                                                                                const itemAlerts = alerts.filter(a => a.item_id === item.id && !a.is_resolved);
                                                                                const hasRework = itemAlerts.some(a => a.severity === 'YELLOW');
                                                                                return renderWarningPill(po.global_deadline, hasRework, language);
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                    <div className="progress-bar-mini" style={{ maxWidth: '100px' }}>
                                                                        <div className="progress-bar-mini-fill" style={{
                                                                            width: `${progress}%`,
                                                                            backgroundColor: isCancelled ? '#ef4444' : '#2563eb'
                                                                        }} />
                                                                    </div>
                                                                    <span style={{ fontSize: '12px', fontWeight: 700, width: '36px', textAlign: 'right', color: '#3b82f6' }}>
                                                                        {progress.toFixed(0)}%
                                                                    </span>
                                                                    <ChevronDown size={14} expanded={itemExpanded} />
                                                                </button>

                                                                {itemExpanded && (
                                                                    <div className="item-compact-detail">
                                                                        <div className="responsive-split" style={{ marginBottom: '12px', gap: '8px' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#60a5fa' }}>
                                                                                    Client: {po.client_name}
                                                                                </div>
                                                                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                                                    Deadline: {formatDeadline(po.global_deadline, language)}
                                                                                </div>
                                                                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8' }}>
                                                                                    Qty: {item.target_qty} pcs {item.delivered_qty > 0 ? `| Delivered: ${item.delivered_qty} pcs` : ''}
                                                                                </div>
                                                                                {item.vendor_name && (
                                                                                    <div style={{ fontSize: '11px', color: '#10b981' }}>
                                                                                        Vendor: {item.vendor_name} ({item.vendor_phone})
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {(!isCancelled && !isTerminated) && (
                                                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleCancel(item.id); }}
                                                                                        disabled={hasProgress}
                                                                                        title={hasProgress ? "Cannot cancel. Progress has started. Use Terminate Midway instead." : ""}
                                                                                        style={{
                                                                                            padding: '5px 10px',
                                                                                            backgroundColor: hasProgress ? '#1e293b' : 'rgba(239, 68, 68, 0.1)',
                                                                                            color: hasProgress ? '#475569' : '#ef4444',
                                                                                            border: 'none',
                                                                                            borderRadius: '6px',
                                                                                            cursor: hasProgress ? 'not-allowed' : 'pointer',
                                                                                            fontSize: '11px',
                                                                                            fontWeight: 600,
                                                                                        }}
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleTerminate(item.id); }}
                                                                                        style={{
                                                                                            padding: '5px 10px',
                                                                                            backgroundColor: '#ef4444',
                                                                                            color: '#fff',
                                                                                            border: 'none',
                                                                                            borderRadius: '6px',
                                                                                            cursor: 'pointer',
                                                                                            fontSize: '11px',
                                                                                            fontWeight: 600,
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '4px'
                                                                                        }}
                                                                                    >
                                                                                        <Stop size={10} /> HALT
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Progress Bar */}
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <div style={{
                                                                                flexGrow: 1,
                                                                                height: '6px',
                                                                                backgroundColor: '#090d16',
                                                                                borderRadius: '3px',
                                                                                overflow: 'hidden'
                                                                            }}>
                                                                                <div style={{
                                                                                    width: `${progress}%`,
                                                                                    height: '100%',
                                                                                    backgroundColor: isCancelled ? '#ef4444' : '#2563eb',
                                                                                    borderRadius: '3px',
                                                                                    transition: 'width 0.3s ease'
                                                                                }} />
                                                                            </div>
                                                                            <span style={{ fontSize: '12px', fontWeight: 700, width: '36px', textAlign: 'right' }}>
                                                                                {progress.toFixed(0)}%
                                                                            </span>
                                                                        </div>

                                                                        {/* Stages display */}
                                                                        {item.item_progresses && item.item_progresses.length > 0 && (
                                                                            <div style={{ marginTop: '10px' }}>
                                                                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                                    Stages
                                                                                </div>
                                                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                                    {item.item_progresses.map((stage) => (
                                                                                        <span key={stage.id} className="badge" style={{
                                                                                            backgroundColor: stage.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)'
                                                                                                : stage.status === 'STUCK' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                                                                                            color: stage.status === 'COMPLETED' ? '#10b981'
                                                                                                : stage.status === 'STUCK' ? '#ef4444' : '#94a3b8',
                                                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                                                            fontSize: '11px',
                                                                                            padding: '3px 8px'
                                                                                        }}>
                                                                                            {stage.stage_name}: {stage.completed_qty > 0 ? `${stage.completed_qty} pcs` : `${parseFloat(stage.progress_percent).toFixed(0)}%`}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'matrix' && telemetry && (
                <div className="performance-matrix-container" style={{ marginBottom: '40px' }}>
                    {/* Timeframe Filter Bar */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '24px',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {['week', 'month', 'year'].map(r => (
                                <button
                                    key={r}
                                    onClick={() => handleRangeChange(r)}
                                    style={{
                                        padding: '6px 12px',
                                        backgroundColor: selected_range === r ? '#2563eb' : 'transparent',
                                        color: selected_range === r ? '#fff' : '#94a3b8',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {r === 'week' ? t.this_week : r === 'month' ? t.this_month : t.this_year}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={togglePresentationMode}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    color: '#e2e8f0',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                {isPresentationMode ? t.exit_presentation : t.presentation_mode}
                            </button>
                            <a
                                href={`/c/${tenant?.slug}/export-pdf?range=${selected_range || 'month'}`}
                                target="_blank"
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#2563eb',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                }}
                            >
                                {t.export_pdf}
                            </a>
                        </div>
                    </div>

                    {/* KPI Summary Cards */}
                    <div className="kpi-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '16px',
                        marginBottom: '24px'
                    }}>
                        <div className="kpi-card" style={{
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}>
                            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{t.on_time_delivery}</span>
                            <span style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>{telemetry.otdr}%</span>
                        </div>
                        <div className="kpi-card" style={{
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}>
                            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{t.parts_manufactured}</span>
                            <span style={{ fontSize: '24px', fontWeight: 800, color: '#3b82f6' }}>{telemetry.manufacture.completed} / {telemetry.manufacture.target} Pcs</span>
                        </div>
                        <div className="kpi-card" style={{
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}>
                            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{t.active_risks}</span>
                            <span style={{ fontSize: '20px', fontWeight: 800, color: telemetry.risks.red > 0 ? '#ef4444' : telemetry.risks.yellow > 0 ? '#f97316' : '#10b981' }}>
                                {(() => {
                                    const red = telemetry.risks.red;
                                    const yellow = telemetry.risks.yellow;
                                    if (red === 0 && yellow === 0) {
                                        return language === 'en' ? 'All Healthy' : 'Semua Aman';
                                    }
                                    const parts = [];
                                    if (red > 0) {
                                        parts.push(language === 'en' ? `${red} Stuck` : `${red} Macet`);
                                    }
                                    if (yellow > 0) {
                                        parts.push(language === 'en' ? `${yellow} Rework` : `${yellow} Rework`);
                                    }
                                    return parts.join(' / ');
                                })()}
                            </span>
                        </div>
                        <div className="kpi-card" style={{
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}>
                            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{t.avg_delay}</span>
                            <span style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>{telemetry.avg_delay_days} {language === 'en' ? 'Days' : 'Hari'}</span>
                        </div>
                    </div>

                    {/* Chart Row */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '20px',
                        marginBottom: '24px'
                    }}>
                        {/* Output and Overdue Trends Chart */}
                        <div style={{
                            backgroundColor: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '20px'
                        }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>{t.production_overdue_trends}</h3>
                            <div style={{ width: '100%', overflowX: 'auto' }}>
                                <svg width="100%" height="200" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                    {/* Grid Lines */}
                                    <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                                    <line x1="40" y1="70" x2="480" y2="70" stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                                    <line x1="40" y1="120" x2="480" y2="120" stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                                    <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.1)" />

                                    {/* Data Rendering */}
                                    {(() => {
                                        const trend = telemetry.trend_data || [];
                                        const maxY = Math.max(...trend.map((d: any) => Math.max(d.output, d.overdue)), 5);
                                        const count = trend.length;
                                        const width = 440;
                                        const chartHeight = 150;
                                        const topOffset = 20;
                                        const leftOffset = 40;

                                        // Render Bars (Output)
                                        const bars = trend.map((d: any, idx: number) => {
                                            const step = width / count;
                                            const barWidth = Math.max(step * 0.4, 10);
                                            const x = leftOffset + idx * step + (step - barWidth) / 2;
                                            const barHeight = (d.output / maxY) * chartHeight;
                                            const y = topOffset + chartHeight - barHeight;

                                            return (
                                                <g key={`bar-${idx}`}>
                                                    <rect x={x} y={y} width={barWidth} height={barHeight} fill="#3b82f6" rx="2" style={{ transition: 'all 0.3s' }} />
                                                    <text x={x + barWidth/2} y={y - 4} textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">{d.output}</text>
                                                </g>
                                            );
                                        });

                                        // Render Line (Overdue)
                                        const linePoints = trend.map((d: any, idx: number) => {
                                            const step = width / count;
                                            const x = leftOffset + idx * step + step / 2;
                                            const y = topOffset + chartHeight - (d.overdue / maxY) * chartHeight;
                                            return { x, y, val: d.overdue };
                                        });

                                        let pathD = '';
                                        if (linePoints.length > 0) {
                                            pathD = `M ${linePoints[0].x} ${linePoints[0].y} ` + linePoints.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(' ');
                                        }

                                        const lineAndPoints = (
                                            <g>
                                                {pathD && <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />}
                                                {linePoints.map((p: any, idx: number) => (
                                                    <g key={`pt-${idx}`}>
                                                        <circle cx={p.x} cy={p.y} r="4" fill="#ef4444" stroke="#090d16" strokeWidth="1" />
                                                        <text x={p.x} y={p.y - 6} textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="600">{p.val}</text>
                                                    </g>
                                                ))}
                                            </g>
                                        );

                                        // Labels
                                        const labels = trend.map((d: any, idx: number) => {
                                            const step = width / count;
                                            const x = leftOffset + idx * step + step / 2;
                                            return (
                                                <text key={`lbl-${idx}`} x={x} y={topOffset + chartHeight + 15} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">
                                                    {d.label}
                                                </text>
                                            );
                                        });

                                        return (
                                            <>
                                                {bars}
                                                {lineAndPoints}
                                                {labels}
                                            </>
                                        );
                                    })()}
                                </svg>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'center', fontSize: '11px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '3px' }} />
                                    <span style={{ color: '#94a3b8' }}>{t.legend_completed}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ display: 'inline-block', width: '12px', height: '2px', backgroundColor: '#ef4444' }} />
                                    <span style={{ color: '#94a3b8' }}>{t.legend_overdue}</span>
                                </div>
                            </div>
                        </div>

                        {/* Why Delayed Pie Chart */}
                        <div style={{
                            backgroundColor: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            padding: '20px'
                        }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>{t.why_delayed_reasons}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                                {(() => {
                                    const reasons = telemetry.delay_reasons || {};
                                    const total = Object.values(reasons).reduce((a: any, b: any) => a + b, 0) as number;
                                    const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#64748b'];

                                    if (total === 0) {
                                        return (
                                            <div style={{ color: '#64748b', fontSize: '13px', padding: '40px 0' }}>
                                                {t.no_incidents}
                                            </div>
                                        );
                                    }

                                    // Let's render circles using strokeDasharray
                                    const C = 314.159;
                                    let accumulatedPercentage = 0;

                                    const circles = Object.entries(reasons).map(([key, val]: any, idx: number) => {
                                        if (val === 0) return null;
                                        const pct = (val / total) * 100;
                                        const strokeLength = C * (pct / 100);
                                        const offset = C - (accumulatedPercentage / 100) * C;
                                        accumulatedPercentage += pct;

                                        return (
                                            <circle
                                                key={`slice-${idx}`}
                                                cx="60" cy="60" r="50"
                                                fill="transparent"
                                                stroke={colors[idx % colors.length]}
                                                strokeWidth="14"
                                                strokeDasharray={`${strokeLength} ${C - strokeLength}`}
                                                strokeDashoffset={offset}
                                                transform="rotate(-90 60 60)"
                                                style={{ transition: 'all 0.3s' }}
                                            />
                                        );
                                    });

                                    return (
                                        <>
                                            <svg width="120" height="120" viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
                                                {circles}
                                            </svg>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {Object.entries(reasons).map(([key, val]: any, idx: number) => {
                                                    if (val === 0) return null;
                                                    return (
                                                        <div key={`legend-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                                            <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: colors[idx % colors.length], borderRadius: '50%' }} />
                                                            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{key}: {val}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Bottleneck Analyzer Table */}
                    <div style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '16px',
                        padding: '20px'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>{t.bottleneck_analyzer}</h3>
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{t.stage}</th>
                                        <th style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{t.active_items}</th>
                                        <th style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{t.stuck_incidents}</th>
                                        <th style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{t.rework_count}</th>
                                        <th style={{ textAlign: 'right', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{t.avg_cycle_time}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {telemetry.stage_metrics && telemetry.stage_metrics.map((metric: any, idx: number) => {
                                        return (
                                            <tr key={`stage-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#e2e8f0' }}>
                                                <td style={{ padding: '12px 16px', fontWeight: 700 }}>{metric.stage.toUpperCase()}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{metric.active_items}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    {metric.stuck_count > 0 ? (
                                                        <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                                                            {metric.stuck_count} stuck
                                                        </span>
                                                    ) : (
                                                        '0'
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    {metric.rework_count > 0 ? (
                                                        <span className="badge" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                                                            {metric.rework_count} rework
                                                        </span>
                                                    ) : (
                                                        '0'
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>
                                                    {metric.avg_cycle_time.toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Active Delay & Risk Directory */}
                    <div style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.4)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '16px',
                        padding: '20px',
                        marginTop: '24px'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>{t.active_delays_directory}</h3>
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                            {telemetry.delayed_items && telemetry.delayed_items.length === 0 ? (
                                <div style={{ color: '#64748b', fontSize: '13px', padding: '24px 0', textAlign: 'center' }}>
                                    {t.no_delays}
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                            <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{t.po_number_label}</th>
                                            <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{t.client_label}</th>
                                            <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{t.item_name_label}</th>
                                            <th style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{t.progress_label}</th>
                                            <th style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{t.deadline_label}</th>
                                            <th style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{t.days_overdue_label}</th>
                                            <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>{t.delay_reason_label}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {telemetry.delayed_items && telemetry.delayed_items.map((item: any, idx: number) => {
                                            const progress = parseFloat(item.progress_percent);
                                            return (
                                                <tr key={`delay-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#e2e8f0' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                                                        <button 
                                                            onClick={() => {
                                                                setActiveTab('active');
                                                                togglePO(item.po_id);
                                                            }}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#3b82f6',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                padding: 0,
                                                                textAlign: 'left',
                                                                textDecoration: 'underline'
                                                            }}
                                                        >
                                                            {item.po_number}
                                                        </button>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>{item.client_name}</td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.item_name}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span className="badge" style={{
                                                            backgroundColor: progress >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                            color: progress >= 100 ? '#10b981' : '#3b82f6'
                                                        }}>
                                                            {progress.toFixed(0)}%
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8' }}>{item.global_deadline}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        {item.days_overdue > 0 ? (
                                                            <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                                                                {item.days_overdue} {t.days_suffix}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#64748b' }}>-</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: '#ef4444', fontStyle: 'italic' }}>
                                                        {item.reason}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            </div>

            {/* Add Admin Modal */}
            {showAddAdminModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        width: '100%',
                        maxWidth: '420px'
                    }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0' }}>
                            {t.create_admin}
                        </h2>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>
                            {t.admin_subtitle}
                        </p>

                        <form onSubmit={submitAddAdmin}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                                    {t.admin_name}
                                </label>
                                <input
                                    type="text"
                                    value={adminName}
                                    onChange={(e) => setAdminName(e.target.value)}
                                    required
                                    placeholder="e.g. Joko Widodo"
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: '#090d16',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                                    {t.admin_username}
                                </label>
                                <input
                                    type="text"
                                    value={adminUsername}
                                    onChange={(e) => setAdminUsername(e.target.value)}
                                    required
                                    placeholder="e.g. joko.admin"
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: '#090d16',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                                    {t.admin_password}
                                </label>
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: '#090d16',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddAdminModal(false)}
                                    style={{
                                        padding: '10px 16px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        color: '#e2e8f0',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#2563eb',
                                        border: 'none',
                                        color: '#fff',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t.create_admin}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}





