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
    purchasing_status?: string | null;
    drafter_status?: string | null;
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

const renderWarningPill = (deadlineDateStr: string | undefined, reworkMessage: string | null | boolean, lang: 'en' | 'id') => {
    if (!deadlineDateStr) return null;
    
    // Check Rework first (takes precedence or is a high priority status)
    if (reworkMessage) {
        const displayMsg = typeof reworkMessage === 'string'
            ? reworkMessage
            : (lang === 'id' ? 'Rework' : 'Rework');

        return (
            <span className="badge" style={{
                backgroundColor: 'rgba(249, 115, 22, 0.15)', // Orange background
                color: '#fb923c', // Orange text
                border: '1px solid rgba(249, 115, 22, 0.2)',
                fontSize: '11px',
                padding: '3px 8px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#fb923c', borderRadius: '50%' }} />
                {displayMsg}
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
                color: '#fbbf24', // Yellow text
                border: '1px solid rgba(234, 179, 8, 0.2)',
                fontSize: '11px',
                padding: '3px 8px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#fbbf24', borderRadius: '50%' }} />
                {text}
            </span>
        );
    } else {
        // Green warning (normal/on track)
        return (
            <span className="badge" style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)', // Green background
                color: '#34d399', // Green text
                border: '1px solid rgba(16, 185, 129, 0.2)',
                fontSize: '11px',
                padding: '3px 8px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#34d399', borderRadius: '50%' }} />
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
    role_name: string;
    role_level: string;
    post_name: string | null;
    is_owner: boolean;
}

interface Props {
    pos: Po[];
    alerts: Alert[];
    users: User[];
    roles: Array<{ id: number; name: string; display_name: string; level: string }>;
    posts: Array<{ id: number; name: string; display_name: string }>;
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
        // User Management
        team_tab: "Team",
        team_title: "Team Members",
        team_subtitle: "Manage floor operators and admin accounts",
        user_name_label: "Full Name",
        user_role_label: "Role",
        user_login_label: "Login Method",
        edit_user: "Edit User",
        delete_user: "Delete User",
        delete_user_confirm: "Are you sure you want to delete this user? This action cannot be undone.",
        filter_all_roles: "All Roles",
        login_method_password: "Password",
        login_method_pin: "PIN",
        new_pin_label: "New PIN (4-6 digits, leave blank to keep)",
        new_password_label: "New Password (leave blank to keep)",
        save_user: "Save Changes",
        reset_pin: "Reset PIN",
        no_users: "No users found.",
        user_self_badge: "(You)",
        add_user: "Add User",
        add_user_title: "New User",
        add_user_subtitle: "Create a new account for floor operator or office staff.",
        tab_alerts: "Alerts",
        tab_active: "Active",
        tab_completed: "Done",
        tab_matrix: "Matrix",
        tab_team: "Team",
    },
    id: {
        owner_command_center: "Dasbor Utama",
        subtitle_realtime: "Pantauan langsung produksi & kelola risiko",
        po_directory: "Daftar PO",
        broadcast_new_po: "Buat PO",
        no_pos: "Belum ada data PO.",
        unresolved_alerts: "Kendala Aktif",
        validation_error: "Data Tidak Valid",
        floor_terminal_url: "Akses Terminal Pekerja",
        floor_terminal_desc: "Bagikan link ini agar pekerja bisa masuk menggunakan PIN:",
        settings: "Pengaturan",
        change_password: "Ganti Password",
        add_admin: "Tambah Admin",
        color_themes: "Tema Tampilan",
        coming_soon: "Segera Hadir",
        language_label: "Bahasa",
        lang_en: "English",
        lang_id: "Bahasa Indonesia",
        current_password: "Password Saat Ini",
        new_password: "Password Baru",
        confirm_password: "Konfirmasi Password",
        cancel: "Batal",
        submit: "Kirim",
        save_changes: "Simpan Perubahan",
        admin_name: "Nama Lengkap",
        admin_username: "Username",
        admin_password: "Password",
        create_admin: "Tambah Admin Baru",
        admin_subtitle: "Daftarkan akun admin baru dengan akses penuh ke sistem.",
        performance_matrix: "Rangkuman Kinerja",
        on_time_delivery: "Ketepatan Pengiriman (%)",
        parts_manufactured: "Jumlah Produksi",
        active_risks: "Kendala Aktif",
        avg_delay: "Rata-rata Terlambat",
        this_week: "Minggu Ini",
        this_month: "Bulan Ini",
        this_year: "Tahun Ini",
        bottleneck_analyzer: "Analisis Titik Hambat Produksi",
        stage: "Tahap",
        active_items: "Barang Sedang Diproses",
        stuck_incidents: "Kejadian Macet",
        rework_count: "Total Rework",
        avg_cycle_time: "Rata-rata Durasi Produksi (Hari)",
        production_overdue_trends: "Tren Hasil & Keterlambatan Produksi",
        why_delayed_reasons: "Penyebab Terlambat",
        export_pdf: "Ekspor PDF",
        presentation_mode: "Mode Presentasi",
        exit_presentation: "Keluar Mode Presentasi",
        no_incidents: "Operasional lancar, tidak ada kendala.",
        legend_completed: "Selesai",
        legend_overdue: "Terlambat",
        active_delays_directory: "Daftar Hambatan & Risiko Aktif",
        po_number_label: "Nomor PO",
        client_label: "Klien",
        item_name_label: "Nama Barang",
        progress_label: "Progres",
        deadline_label: "Tenggat Waktu",
        delay_reason_label: "Penyebab Macet / Terlambat",
        days_overdue_label: "Terlambat",
        days_suffix: "hari",
        no_delays: "Tidak ada keterlambatan atau hambatan.",
        // User Management
        team_tab: "Tim",
        team_title: "Anggota Tim",
        team_subtitle: "Kelola operator lantai dan akun admin",
        user_name_label: "Nama Lengkap",
        user_role_label: "Role",
        user_login_label: "Metode Login",
        edit_user: "Edit Pengguna",
        delete_user: "Hapus Pengguna",
        delete_user_confirm: "Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.",
        filter_all_roles: "Semua Role",
        login_method_password: "Password",
        login_method_pin: "PIN",
        new_pin_label: "PIN Baru (4-6 digit, kosongkan untuk tidak mengubah)",
        new_password_label: "Password Baru (kosongkan untuk tidak mengubah)",
        save_user: "Simpan Perubahan",
        reset_pin: "Reset PIN",
        no_users: "Tidak ada pengguna.",
        user_self_badge: "(Anda)",
        add_user: "Tambah Pengguna",
        add_user_title: "Pengguna Baru",
        add_user_subtitle: "Buat akun baru untuk operator lantai atau staf kantor.",
        tab_alerts: "Kendala",
        tab_active: "Aktif",
        tab_completed: "Selesai",
        tab_matrix: "Kinerja",
        tab_team: "Tim",
    }
};

export default function OwnerDashboard({ pos, alerts, users, roles, posts, tenant, auth_user, telemetry, selected_range }: Props) {
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

    const [activeTab, setActiveTab] = useState<'alerts' | 'active' | 'completed' | 'matrix' | 'team'>(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const tabParam = urlParams.get('tab');
            if (tabParam && ['alerts', 'active', 'completed', 'matrix', 'team'].includes(tabParam)) {
                return tabParam as any;
            }
            const localSaved = localStorage.getItem('owner_active_tab');
            if (localSaved && ['alerts', 'active', 'completed', 'matrix', 'team'].includes(localSaved)) {
                return localSaved as any;
            }
        }
        return 'alerts';
    });

    const changeTab = (tab: 'alerts' | 'active' | 'completed' | 'matrix' | 'team') => {
        setActiveTab(tab);
        if (typeof window !== 'undefined') {
            localStorage.setItem('owner_active_tab', tab);
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            window.history.replaceState({}, '', url.toString());
        }
    };

    const [isPresentationMode, setIsPresentationMode] = useState(false);
    const [presentationSlide, setPresentationSlide] = useState(0);
    const [presentationAutoPlay, setPresentationAutoPlay] = useState(false);
    const [matrixFilter, setMatrixFilter] = useState<{ type: string; value: string; label: string } | null>(null);
    const [directoryFilter, setDirectoryFilter] = useState<'client' | 'marked' | 'delayed' | 'ontime' | 'close_due'>('client');
    const [activePoFilter, setActivePoFilter] = useState<'all' | 'marked' | 'delayed' | 'ontime' | 'close_due'>('all');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isPresentationMode) {
                togglePresentationMode();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPresentationMode]);

    useEffect(() => {
        if (!isPresentationMode || !presentationAutoPlay) return;
        const interval = setInterval(() => {
            setPresentationSlide(prev => (prev + 1) % 4);
        }, 10000);
        return () => clearInterval(interval);
    }, [isPresentationMode, presentationAutoPlay]);

    const togglePresentationMode = () => {
        setIsPresentationMode(prev => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                if (next) {
                    document.body.classList.add('presentation-mode');
                    setPresentationSlide(0);
                    setPresentationAutoPlay(false);
                } else {
                    document.body.classList.remove('presentation-mode');
                }
            }
            return next;
        });
    };

    const handleRangeChange = (newRange: string) => {
        router.get(window.location.pathname, { range: newRange, tab: activeTab }, { preserveState: true });
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

    const filteredPos = (() => {
        const basePos = pos.filter(po => {
            if (activeTab === 'active') return po.status !== 'COMPLETED';
            if (activeTab === 'completed') return po.status === 'COMPLETED';
            return true;
        });

        if (activeTab !== 'active' || activePoFilter === 'all') {
            return basePos;
        }

        const result: typeof pos = [];
        basePos.forEach(po => {
            const matchedItems = po.items.filter(item => {
                switch (activePoFilter) {
                    case 'marked': {
                        const itemAlerts = alerts.filter(a => a.item_id === item.id && !a.is_resolved);
                        return itemAlerts.some(a => a.severity === 'RED' || a.severity === 'YELLOW');
                    }
                    case 'delayed':
                        return item.days_overdue > 0 && item.status !== 'COMPLETED';
                    case 'ontime':
                        return (item.status === 'COMPLETED') || (item.status !== 'COMPLETED' && item.days_overdue === 0);
                    case 'close_due': {
                        if (!po.global_deadline || item.status === 'COMPLETED') return false;
                        const deadline = new Date(po.global_deadline);
                        const today = new Date();
                        const diffTime = deadline.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays >= 0 && diffDays <= 7;
                    }
                    default:
                        return true;
                }
            });

            if (matchedItems.length > 0) {
                result.push({
                    ...po,
                    items: matchedItems
                });
            }
        });

        return result;
    })();

    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

    // Add Admin modal
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [adminName, setAdminName] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminRoleId, setAdminRoleId] = useState<number | undefined>(undefined);
    const [adminPostId, setAdminPostId] = useState<number | undefined>(undefined);

    // Add User modal
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserRoleId, setNewUserRoleId] = useState<number | undefined>(undefined);
    const [newUserPostId, setNewUserPostId] = useState<string>('');
    const [newUserLoginMethod, setNewUserLoginMethod] = useState<'PASSWORD' | 'PIN'>('PIN');
    const [newUserUsername, setNewUserUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserPin, setNewUserPin] = useState('');

    // ── User Management (Task 1) ──────────────────────────────────────────────
    const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editPostId, setEditPostId] = useState<string>('');
    const [editLoginMethod, setEditLoginMethod] = useState<'PASSWORD' | 'PIN'>('PIN');
    const [editUsername, setEditUsername] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editPin, setEditPin] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);

    const openEditUser = (user: User) => {
        setEditingUser(user);
        setEditName(user.name);
        const userRole = (roles ?? []).find(r => r.name === user.role_name);
        setEditRole(userRole ? String(userRole.id) : '');
        setEditPostId(user.post_name || '');
        const method = user.role_level === 'office' ? 'PASSWORD' : 'PIN';
        setEditLoginMethod(method);
        setEditUsername(user.username || '');
        setEditPassword('');
        setEditPin('');
        setEditSubmitting(false);
    };

    const closeEditUser = () => {
        setEditingUser(null);
        setEditSubmitting(false);
    };

    const submitEditUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setEditSubmitting(true);
        router.post(`/users/${editingUser.id}/update`, {
            name: editName,
            role_id: parseInt(editRole),
            post_id: editPostId || null,
            login_method: editLoginMethod,
            username: editLoginMethod === 'PASSWORD' ? editUsername : null,
            password: editLoginMethod === 'PASSWORD' && editPassword ? editPassword : undefined,
            pin: editLoginMethod === 'PIN' && editPin ? editPin : undefined,
        }, {
            onSuccess: () => closeEditUser(),
            onError: () => setEditSubmitting(false),
        });
    };

    const handleDeleteUser = (user: User) => {
        if (!confirm(t.delete_user_confirm)) return;
        router.post(`/users/${user.id}/delete`, {}, {
            onSuccess: () => closeEditUser(),
        });
    };
    // ─────────────────────────────────────────────────────────────────────────

    const openAddAdmin = () => {
        setAdminName('');
        setAdminUsername('');
        setAdminPassword('');
        setAdminRoleId((roles ?? []).find(r => r.name === 'STAFF')?.id);
        setAdminPostId((posts ?? []).find(p => p.name === 'Admin')?.id);
        setShowSettingsDropdown(false);
        setShowAddAdminModal(true);
    };

    const submitAddAdmin = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/users', {
            name: adminName,
            role_id: adminRoleId,
            post_id: adminPostId,
            login_method: 'PASSWORD',
            username: adminUsername,
            password: adminPassword,
        }, {
            onSuccess: () => setShowAddAdminModal(false),
        });
    };

    const openAddUser = () => {
        setNewUserName('');
        setNewUserRoleId((roles ?? [])[0]?.id);
        setNewUserPostId('');
        setNewUserLoginMethod('PIN');
        setNewUserUsername('');
        setNewUserPassword('');
        setNewUserPin('');
        setShowAddUserModal(true);
    };

    const submitAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/users', {
            name: newUserName,
            role_id: newUserRoleId,
            post_id: newUserPostId || null,
            login_method: newUserLoginMethod,
            username: newUserLoginMethod === 'PASSWORD' ? newUserUsername : null,
            password: newUserLoginMethod === 'PASSWORD' && newUserPassword ? newUserPassword : undefined,
            pin: newUserLoginMethod === 'PIN' && newUserPin ? newUserPin : undefined,
        }, {
            onSuccess: () => {
                setShowAddUserModal(false);
                setNewUserName('');
                setNewUserRoleId(undefined);
                setNewUserPostId('');
                setNewUserUsername('');
                setNewUserPassword('');
                setNewUserPin('');
            },
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

    const isOwner = auth_user?.is_owner === true;
    const canBroadcastPo = auth_user?.is_owner !== true;

    if (isPresentationMode && telemetry) {
        const prev = (telemetry.previous || {}) as any;
        const rangeLabel = selected_range === 'week' ? t.this_week : selected_range === 'year' ? t.this_year : t.this_month;
        const otdrDelta: number | null = prev.otdr != null ? Math.round((telemetry.otdr - prev.otdr) * 10) / 10 : null;
        const deliveredCurr: number = telemetry.manufacture?.delivered ?? telemetry.manufacture?.completed ?? 0;
        const deliveredPrev: number = prev.manufacture?.delivered ?? 0;
        const deliveredDelta: number | null = deliveredPrev > 0 ? Math.round(((deliveredCurr - deliveredPrev) / deliveredPrev) * 100) : null;
        const delayDelta: number | null = prev.avg_delay_days != null ? Math.round((telemetry.avg_delay_days - prev.avg_delay_days) * 10) / 10 : null;

        // Top stuck stage for narrative
        const topStuck = [...(telemetry.stage_metrics || [])]
            .sort((a: any, b: any) => b.stuck_count - a.stuck_count)
            .find((m: any) => m.stuck_count > 0);

        // Narrative text
        let narrativeText = '';
        if (language === 'id') {
            narrativeText = `Periode ini, pabrik menyelesaikan ${telemetry.otdr}% pesanan tepat waktu`;
            if (otdrDelta != null) {
                narrativeText += otdrDelta >= 0
                    ? ` — naik ${Math.abs(otdrDelta)}% dari periode lalu`
                    : ` — turun ${Math.abs(otdrDelta)}% dari periode lalu`;
            }
            narrativeText += '. ';
            if (topStuck) {
                narrativeText += `Bottleneck utama ada di tahap ${topStuck.stage} (${topStuck.stuck_count} macet, rata-rata ${topStuck.avg_cycle_time} hari/item). `;
            } else {
                narrativeText += 'Semua tahap produksi berjalan normal. ';
            }
            if ((telemetry.urgent_active || 0) > 0) {
                narrativeText += `Terdapat ${telemetry.urgent_active} PO mendesak yang masih aktif. `;
            }
            if ((telemetry.finance_health?.uninvoiced_count || 0) > 0) {
                narrativeText += `${telemetry.finance_health.uninvoiced_count} item selesai belum difakturkan.`;
            }
        } else {
            narrativeText = `This period, the factory completed ${telemetry.otdr}% of orders on time`;
            if (otdrDelta != null) {
                narrativeText += otdrDelta >= 0
                    ? ` — up ${Math.abs(otdrDelta)}% vs last period`
                    : ` — down ${Math.abs(otdrDelta)}% vs last period`;
            }
            narrativeText += '. ';
            if (topStuck) {
                narrativeText += `Top bottleneck: ${topStuck.stage} stage (${topStuck.stuck_count} stuck, avg ${topStuck.avg_cycle_time} days/item). `;
            } else {
                narrativeText += 'All production stages running normally. ';
            }
            if ((telemetry.urgent_active || 0) > 0) {
                narrativeText += `${telemetry.urgent_active} urgent PO(s) still active. `;
            }
            if ((telemetry.finance_health?.uninvoiced_count || 0) > 0) {
                narrativeText += `${telemetry.finance_health.uninvoiced_count} completed item(s) not yet invoiced.`;
            }
        }

        const getStageHealth = (metric: any) => {
            if (metric.stuck_count > 0) return { border: 'rgba(239,68,68,0.6)', bg: 'rgba(239,68,68,0.12)', label: '#ef4444' };
            if (metric.avg_cycle_time > 3) return { border: 'rgba(249,115,22,0.5)', bg: 'rgba(249,115,22,0.08)', label: '#fb923c' };
            if (metric.avg_cycle_time > 1) return { border: 'rgba(234,179,8,0.4)', bg: 'rgba(234,179,8,0.06)', label: '#fbbf24' };
            return { border: 'rgba(16,185,129,0.35)', bg: 'rgba(16,185,129,0.06)', label: '#34d399' };
        };

        const pipelineStages = (telemetry.stage_metrics || [])
            .filter((m: any) => !m.stage.toLowerCase().includes('rework'));

        // Slide renderers
        const renderSlide = () => {
            switch (presentationSlide) {
                case 0: // Slide 1: Ringkasan
                    return (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '30px' }}>
                            <div style={{
                                backgroundColor: 'rgba(37,99,235,0.08)',
                                border: '1px solid rgba(37,99,235,0.25)',
                                borderRadius: '16px',
                                padding: '24px 30px',
                                maxWidth: '900px',
                                margin: '0 auto',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                                    {language === 'id' ? 'RINGKASAN OPERASIONAL' : 'OPERATIONAL SUMMARY'}
                                </div>
                                <p style={{ fontSize: '20px', color: '#e4e4e7', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>
                                    {narrativeText}
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                                {/* OTDR */}
                                <div style={{ backgroundColor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                        {t.on_time_delivery}
                                    </div>
                                    <div style={{ fontSize: '48px', fontWeight: 900, color: telemetry.otdr >= 80 ? '#34d399' : telemetry.otdr >= 60 ? '#fbbf24' : '#ef4444' }}>
                                        {telemetry.otdr}%
                                    </div>
                                    {otdrDelta != null && (
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: otdrDelta >= 0 ? '#34d399' : '#ef4444', marginTop: '6px' }}>
                                            {otdrDelta >= 0 ? '▲' : '▼'} {Math.abs(otdrDelta)}% vs prev
                                        </div>
                                    )}
                                </div>

                                {/* Delivered */}
                                <div style={{ backgroundColor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                        {t.parts_manufactured}
                                    </div>
                                    <div style={{ fontSize: '38px', fontWeight: 900, color: '#3b82f6', marginTop: '10px' }}>
                                        {deliveredCurr} <span style={{ fontSize: '18px', color: '#52525b', fontWeight: 700 }}>/ {telemetry.manufacture?.target ?? 0}</span>
                                    </div>
                                    {deliveredDelta != null && (
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: deliveredDelta >= 0 ? '#34d399' : '#ef4444', marginTop: '12px' }}>
                                            {deliveredDelta >= 0 ? '▲' : '▼'} {Math.abs(deliveredDelta)}% vs prev
                                        </div>
                                    )}
                                </div>

                                {/* Avg Delay */}
                                <div style={{ backgroundColor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                        {t.avg_delay}
                                    </div>
                                    <div style={{ fontSize: '38px', fontWeight: 900, color: telemetry.avg_delay_days === 0 ? '#34d399' : telemetry.avg_delay_days <= 3 ? '#fbbf24' : '#ef4444', marginTop: '10px' }}>
                                        {telemetry.avg_delay_days} <span style={{ fontSize: '18px', color: '#52525b', fontWeight: 700 }}>{language === 'id' ? 'Hari' : 'Days'}</span>
                                    </div>
                                    {delayDelta != null && (
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: delayDelta <= 0 ? '#34d399' : '#ef4444', marginTop: '12px' }}>
                                            {delayDelta >= 0 ? '▲' : '▼'} {Math.abs(delayDelta)} vs prev
                                        </div>
                                    )}
                                </div>

                                {/* Urgent Active POs */}
                                <div style={{ backgroundColor: 'rgba(15,23,42,0.6)', border: `1px solid ${(telemetry.urgent_active || 0) > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '12px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                        {language === 'id' ? 'PO Mendesak' : 'Urgent Active POs'}
                                    </div>
                                    <div style={{ fontSize: '48px', fontWeight: 900, color: (telemetry.urgent_active || 0) > 0 ? '#ef4444' : '#34d399' }}>
                                        {telemetry.urgent_active || 0}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#52525b', marginTop: '6px', fontWeight: 600 }}>
                                        {(telemetry.urgent_active || 0) > 0 ? (language === 'id' ? 'Tindakan segera' : 'Action required') : (language === 'id' ? 'Kondisi Aman' : 'Healthy')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                case 1: // Slide 2: Pipeline
                    return (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '30px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                {pipelineStages.map((metric: any, idx: number) => {
                                    const health = getStageHealth(metric);
                                    return (
                                        <React.Fragment key={`slide-pipeline-${idx}`}>
                                            <div style={{
                                                backgroundColor: health.bg,
                                                border: `2px solid ${health.border}`,
                                                borderRadius: '16px',
                                                padding: '20px 24px',
                                                textAlign: 'center',
                                                minWidth: '150px',
                                                position: 'relative',
                                            }}>
                                                {metric.stuck_count > 0 && (
                                                    <span style={{
                                                        position: 'absolute',
                                                        top: '-10px',
                                                        right: '-10px',
                                                        backgroundColor: '#ef4444',
                                                        color: '#fff',
                                                        borderRadius: '50%',
                                                        width: '24px',
                                                        height: '24px',
                                                        fontSize: '12px',
                                                        fontWeight: 900,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid #09090b',
                                                    }}>{metric.stuck_count}</span>
                                                )}
                                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                                                    {metric.stage}
                                                </div>
                                                <div style={{ fontSize: '32px', fontWeight: 900, color: health.label, lineHeight: 1 }}>
                                                    {metric.active_items}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#52525b', marginTop: '4px' }}>
                                                    {language === 'id' ? 'item aktif' : 'active items'}
                                                </div>
                                                {metric.avg_cycle_time > 0 && (
                                                    <div style={{ fontSize: '11px', color: health.label, marginTop: '8px', fontWeight: 700, borderTop: `1px solid ${health.border}`, paddingTop: '8px' }}>
                                                        {metric.avg_cycle_time}d avg
                                                    </div>
                                                )}
                                            </div>
                                            {idx < pipelineStages.length - 1 && (
                                                <div style={{ color: '#27272a', fontSize: '36px', userSelect: 'none' }}>→</div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            <div style={{ backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px' }}>
                                <div style={{ width: '100%', overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <th style={{ textAlign: 'left', padding: '12px 16px', color: '#71717a' }}>{t.stage}</th>
                                            <th style={{ textAlign: 'center', padding: '12px 16px', color: '#71717a' }}>{t.active_items}</th>
                                            <th style={{ textAlign: 'center', padding: '12px 16px', color: '#71717a' }}>{t.stuck_incidents}</th>
                                            <th style={{ textAlign: 'center', padding: '12px 16px', color: '#71717a' }}>{t.rework_count}</th>
                                            <th style={{ textAlign: 'right', padding: '12px 16px', color: '#71717a' }}>{t.avg_cycle_time}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {telemetry.stage_metrics?.map((metric: any, idx: number) => (
                                            <tr key={`slide-detail-stage-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e4e4e7' }}>
                                                <td style={{ padding: '10px 16px', fontWeight: 800 }}>{metric.stage.toUpperCase()}</td>
                                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>{metric.active_items}</td>
                                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                    {metric.stuck_count > 0 ? <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{metric.stuck_count} stuck</span> : '0'}
                                                </td>
                                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                    {metric.rework_count > 0 ? <span className="badge" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{metric.rework_count} rework</span> : '0'}
                                                </td>
                                                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#3b82f6' }}>{metric.avg_cycle_time.toFixed(2)}d</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </div>
                    );
                case 2: // Slide 3: Client Health
                    return (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                            <div style={{ backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px' }}>
                                <div style={{ width: '100%', overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <th style={{ textAlign: 'left', padding: '14px 16px', color: '#71717a' }}>{language === 'id' ? 'Klien' : 'Client'}</th>
                                            <th style={{ textAlign: 'center', padding: '14px 16px', color: '#71717a' }}>{language === 'id' ? 'PO Aktif' : 'Active POs'}</th>
                                            <th style={{ textAlign: 'center', padding: '14px 16px', color: '#71717a' }}>{language === 'id' ? 'Ketepatan Waktu' : 'On-Time Rate'}</th>
                                            <th style={{ textAlign: 'center', padding: '14px 16px', color: '#71717a' }}>{language === 'id' ? 'Item Terlambat' : 'Overdue Items'}</th>
                                            <th style={{ textAlign: 'center', padding: '14px 16px', color: '#71717a' }}>{language === 'id' ? 'Belum Faktur' : 'Uninvoiced'}</th>
                                            <th style={{ textAlign: 'center', padding: '14px 16px', color: '#71717a' }}>{language === 'id' ? 'Belum Bayar' : 'Unpaid'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {telemetry.client_health?.map((client: any, idx: number) => {
                                            const otdrColor = client.on_time_rate == null ? '#71717a' : client.on_time_rate >= 80 ? '#34d399' : client.on_time_rate >= 60 ? '#fbbf24' : '#ef4444';
                                            return (
                                                <tr key={`slide-client-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e4e4e7' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: '15px' }}>{client.client_name}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#a1a1aa' }}>{client.active_pos}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: otdrColor }}>
                                                        {client.on_time_rate != null ? `${client.on_time_rate}%` : 'N/A'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        {client.overdue_items > 0 ? <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 800 }}>{client.overdue_items}</span> : <span style={{ color: '#34d399', fontWeight: 800 }}>✓</span>}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        {client.uninvoiced_count > 0 ? <span className="badge" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontWeight: 800 }}>{client.uninvoiced_count}</span> : <span style={{ color: '#34d399', fontWeight: 800 }}>✓</span>}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        {client.unpaid_count > 0 ? <span className="badge" style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#fb923c', padding: '4px 8px', borderRadius: '4px', fontWeight: 800 }}>{client.unpaid_count}</span> : <span style={{ color: '#34d399', fontWeight: 800 }}>✓</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </div>
                    );
                case 3: // Slide 4: Action Items
                    const stuckItems = telemetry.delayed_items || [];
                    return (
                        <div style={{ flex: 1, display: 'flex', gap: '30px', maxWidth: '1100px', margin: '0 auto', width: '100%', height: '100%', overflow: 'hidden' }}>
                            {/* Left Column: Stuck & Overdue */}
                            <div style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ef4444', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⚠️</span> {language === 'id' ? 'Hambatan & Keterlambatan' : 'Stuck & Overdue Items'}
                                </h4>
                                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                                    {stuckItems.length === 0 ? (
                                        <div style={{ color: '#71717a', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>{language === 'id' ? 'Tidak ada hambatan aktif.' : 'No active delays.'}</div>
                                    ) : stuckItems.map((item: any, idx: number) => (
                                        <div key={`slide-action-stuck-${idx}`} style={{ backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 800, color: '#fafafa', fontSize: '13px' }}>{item.po_number} · {item.client_name}</span>
                                                <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>{item.days_overdue}d delay</span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>{item.item_name} ({Math.round(item.progress_percent)}%)</div>
                                            <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px', fontStyle: 'italic', fontWeight: 500 }}>{item.reason}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Column: Uninvoiced */}
                            <div style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#fbbf24', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>💼</span> {language === 'id' ? 'Pekerjaan Selesai Belum Difakturkan' : 'Finished Items Not Yet Invoiced'}
                                </h4>
                                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                                    {((telemetry.finance_health?.uninvoiced_count || 0) === 0) ? (
                                        <div style={{ color: '#71717a', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>
                                            {language === 'id' ? 'Semua pekerjaan selesai sudah difakturkan.' : 'All finished items have been invoiced.'}
                                        </div>
                                    ) : (
                                        <div style={{ color: '#a1a1aa', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                                            {language === 'id' ? (
                                                <p>Terdapat <strong>{telemetry.finance_health.uninvoiced_count}</strong> item pesanan selesai yang perlu diterbitkan invoice oleh bagian Keuangan.</p>
                                            ) : (
                                                <p>There are <strong>{telemetry.finance_health.uninvoiced_count}</strong> completed item(s) awaiting invoice issuance by Finance.</p>
                                            )}
                                            <button
                                                onClick={() => { togglePresentationMode(); changeTab('completed'); }}
                                                style={{ marginTop: '12px', backgroundColor: '#fbbf24', color: '#09090b', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                            >
                                                {language === 'id' ? 'Buka Status Keuangan' : 'Open Finance Status'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                default:
                    return null;
            }
        };

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#09090b',
                zIndex: 99999,
                color: '#fafafa',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'Inter, sans-serif'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>POgrid.id</span>
                            <span style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                                {rangeLabel}
                            </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px', fontWeight: 500 }}>
                            {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            {' · '}
                            {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {/* Slide Title */}
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {presentationSlide === 0 ? (language === 'id' ? 'Ringkasan Kinerja' : 'Performance Summary') :
                             presentationSlide === 1 ? (language === 'id' ? 'Alur Produksi' : 'Production Pipeline') :
                             presentationSlide === 2 ? (language === 'id' ? 'Kinerja Klien' : 'Client Board') :
                             (language === 'id' ? 'Tindakan Diperlukan' : 'Action Items')}
                        </div>

                        {/* Close button */}
                        <button
                            onClick={togglePresentationMode}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                color: '#a1a1aa',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            {language === 'id' ? 'Keluar' : 'Exit'} (ESC)
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 0' }}>
                    {renderSlide()}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => setPresentationSlide(prev => (prev - 1 + 4) % 4)}
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                        >
                            ◀ {language === 'id' ? 'Sebelumnya' : 'Prev'}
                        </button>
                        <button
                            onClick={() => setPresentationSlide(prev => (prev + 1) % 4)}
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                        >
                            {language === 'id' ? 'Selanjutnya' : 'Next'} ▶
                        </button>
                        <button
                            onClick={() => setPresentationAutoPlay(prev => !prev)}
                            style={{
                                background: presentationAutoPlay ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                                color: presentationAutoPlay ? '#34d399' : '#a1a1aa',
                                border: presentationAutoPlay ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <span style={{ width: '8px', height: '8px', backgroundColor: presentationAutoPlay ? '#34d399' : '#71717a', borderRadius: '50%', display: 'inline-block' }} />
                            Auto-Play (10s)
                        </button>
                    </div>

                    {/* Indicators */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[0, 1, 2, 3].map(slideIdx => (
                            <button
                                key={`slide-dot-${slideIdx}`}
                                onClick={() => setPresentationSlide(slideIdx)}
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: presentationSlide === slideIdx ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                            />
                        ))}
                    </div>

                    {/* App info */}
                    <div style={{ fontSize: '12px', color: '#71717a', fontWeight: 500 }}>
                        {language === 'id' ? 'Gunakan tombol panah untuk navigasi' : 'Use controls or slide indicators to navigate'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-root" style={{
            backgroundColor: '#09090b',
            fontFamily: 'Inter, sans-serif',
            color: '#fafafa',
        }}>
            <div className="dashboard-above-scroll">
            <header className="responsive-header owner-dashboard-header" style={{
                padding: '10px 16px 8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
                <div className="owner-header-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{t.owner_command_center}</h1>
                        <span className="owner-header-datetime" style={{ fontSize: '11px', color: '#71717a' }}>
                            {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {' · '}
                            {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <div className="owner-greeting" style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600, marginTop: '1px' }}>
                        {language === 'en' ? `Hello, ${auth_user?.name}` : `Halo, ${auth_user?.name}`}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }} className="owner-header-actions">
                    {/* Profile - visible to all roles */}
                    <a
                        href={'/c/' + (tenant?.slug || '') + '/profile'}
                        onClick={() => setShowSettingsDropdown(false)}
                        style={{
                            padding: '8px',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: '#a1a1aa',
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
                                color: '#a1a1aa',
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

            <div style={{ padding: '0 16px 6px' }}>
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

            {/* Floor Terminal URL — compact chip */}
            {tenant && (
                <div className="floor-terminal-row" style={{
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#71717a',
                    flexWrap: 'nowrap',
                    minWidth: 0,
                }}>
                    <span style={{ fontWeight: 600, color: '#818cf8' }}>{t.floor_terminal_url}</span>
                    <code className="floor-terminal-chip" style={{
                        backgroundColor: 'rgba(37,99,235,0.08)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid rgba(37,99,235,0.15)',
                        color: '#a5b4fc',
                        fontSize: '11px',
                        fontWeight: 600,
                    }}>
                        {typeof window !== 'undefined' ? `${window.location.origin}/c/${tenant.slug}` : `/c/${tenant.slug}`}
                    </code>
                    <button
                        className="floor-terminal-copy-btn"
                        onClick={() => {
                            const url = typeof window !== 'undefined' ? `${window.location.origin}/c/${tenant.slug}` : `/c/${tenant.slug}`;
                            navigator.clipboard.writeText(url);
                            alert('URL copied!');
                        }}
                        style={{
                            padding: '1px 6px',
                            backgroundColor: 'rgba(37,99,235,0.15)',
                            color: '#818cf8',
                            fontWeight: 600,
                            border: '1px solid rgba(37,99,235,0.2)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            lineHeight: '20px',
                        }}
                    >
                        Copy
                    </button>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="tab-bar">
                <button className={`tab ${activeTab === 'alerts' ? 'tab-active' : ''}`} onClick={() => changeTab('alerts')}>
                    <span className="tab-label-full">{t.unresolved_alerts}</span>
                    <span className="tab-label-short">{t.tab_alerts}</span>
                    {alerts.length > 0 && (
                        <span style={{
                            marginLeft: '4px',
                            fontSize: '10px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            padding: '1px 5px',
                            borderRadius: '8px'
                        }}>
                            {alerts.length}
                        </span>
                    )}
                </button>
                <button className={`tab ${activeTab === 'active' ? 'tab-active' : ''}`} onClick={() => changeTab('active')}>
                    <span className="tab-label-full">Active POs</span>
                    <span className="tab-label-short">{t.tab_active}</span>
                </button>
                <button className={`tab ${activeTab === 'completed' ? 'tab-active' : ''}`} onClick={() => changeTab('completed')}>
                    <span className="tab-label-full">Completed</span>
                    <span className="tab-label-short">{t.tab_completed}</span>
                </button>
                <button className={`tab ${activeTab === 'matrix' ? 'tab-active' : ''}`} onClick={() => changeTab('matrix')}>
                    <span className="tab-label-full">{t.performance_matrix}</span>
                    <span className="tab-label-short">{t.tab_matrix}</span>
                </button>
                <button className={`tab ${activeTab === 'team' ? 'tab-active' : ''}`} onClick={() => changeTab('team')}>
                    <span className="tab-label-full">{t.team_tab}</span>
                    <span className="tab-label-short">{t.tab_team}</span>
                    <span style={{
                        marginLeft: '4px',
                        fontSize: '10px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#a1a1aa',
                        padding: '1px 5px',
                        borderRadius: '8px'
                    }}>
                        {users.length}
                    </span>
                </button>
            </div>

            {/* State Summary Bar — compact */}
            <div style={{
                display: 'flex',
                gap: '4px',
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
                            <button
                                onClick={() => changeTab('alerts')}
                                className="summary-pill summary-pill-gray"
                            >
                                {total} {language === 'en' ? 'Issues' : 'Isu'}
                            </button>
                            {delayed > 0 && (
                                <button
                                    onClick={() => {
                                        changeTab('active');
                                        setActivePoFilter('delayed');
                                    }}
                                    className="summary-pill summary-pill-red"
                                >
                                    {delayed} {language === 'en' ? 'Delayed' : 'Terlambat'}
                                </button>
                            )}
                            {close > 0 && (
                                <button
                                    onClick={() => {
                                        changeTab('active');
                                        setActivePoFilter('close_due');
                                    }}
                                    className="summary-pill summary-pill-orange"
                                >
                                    {close} {language === 'en' ? 'Closing' : 'Dekat'}
                                </button>
                            )}
                            {reworks > 0 && (
                                <button
                                    onClick={() => {
                                        changeTab('active');
                                        setActivePoFilter('marked');
                                    }}
                                    className="summary-pill summary-pill-orange"
                                >
                                    {reworks} Rework
                                </button>
                            )}
                            {troubles > 0 && (
                                <button
                                    onClick={() => changeTab('alerts')}
                                    className="summary-pill summary-pill-red"
                                >
                                    {troubles} {language === 'en' ? 'Stuck' : 'Macet'}
                                </button>
                            )}
                        </>
                    );
                })()}
            </div>
            </div>
            </div>

            <div className="dashboard-scroll" style={{ padding: '16px' }}>
            {/* Alert Matrix Panel */}
            {activeTab === 'alerts' && (() => {
                const unifiedIssues = getUnifiedIssuesList();
                return (
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{t.unresolved_alerts}</span>
                            <span style={{
                                fontSize: '12px',
                                backgroundColor: unifiedIssues.length > 0 ? '#ef4444' : '#34d399',
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
                                color: '#34d399',
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
                                        : issue.severity === 'ORANGE' ? '#fb923c'
                                        : '#fbbf24';
                                    const badgeText = issue.title;

                                    return (
                                        <div
                                            key={issue.id}
                                            onClick={() => {
                                                if (issue.po_id) {
                                                    changeTab('active');
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
                                                flexWrap: 'wrap',
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
                                            <div style={{ fontSize: '14px', color: '#e4e4e7', flexGrow: 1 }}>
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
                                className="new-po-btn"
                                onClick={() => router.get('/pos/create')}
                                style={{
                                    padding: '10px 18px',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
                                onMouseOver={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)')}
                                onMouseOut={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)')}
                            >
                                <Broadcast size={16} /> {t.broadcast_new_po}
                            </button>
                        )}
                    </div>
                    {activeTab === 'active' && (
                        <div className="po-filter-row" style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                            <button
                                onClick={() => setActivePoFilter('all')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '9999px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    backgroundColor: activePoFilter === 'all' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                    color: activePoFilter === 'all' ? '#ffffff' : '#a1a1aa',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <span className="filter-label-full">{language === 'id' ? 'Semua PO (Default)' : 'All POs (Default)'}</span>
                                <span className="filter-label-short">{language === 'id' ? 'Semua' : 'All'}</span>
                            </button>
                            <button
                                onClick={() => setActivePoFilter('marked')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '9999px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    backgroundColor: activePoFilter === 'marked' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                    color: activePoFilter === 'marked' ? '#ffffff' : '#a1a1aa',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <span className="filter-label-full">{language === 'id' ? 'Ditandai (Rework/Kendala)' : 'Marked (Rework / Trouble)'}</span>
                                <span className="filter-label-short">{language === 'id' ? 'Ditandai' : 'Marked'}</span>
                            </button>
                            <button
                                onClick={() => setActivePoFilter('delayed')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '9999px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    backgroundColor: activePoFilter === 'delayed' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                    color: activePoFilter === 'delayed' ? '#ffffff' : '#a1a1aa',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <span className="filter-label-full">{language === 'id' ? 'Terlambat' : 'Delayed'}</span>
                                <span className="filter-label-short">{language === 'id' ? 'Terlambat' : 'Delayed'}</span>
                            </button>
                            <button
                                onClick={() => setActivePoFilter('ontime')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '9999px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    backgroundColor: activePoFilter === 'ontime' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                    color: activePoFilter === 'ontime' ? '#ffffff' : '#a1a1aa',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <span className="filter-label-full">{language === 'id' ? 'Tepat Waktu' : 'On Time'}</span>
                                <span className="filter-label-short">{language === 'id' ? 'Tepat Waktu' : 'On Time'}</span>
                            </button>
                            <button
                                onClick={() => setActivePoFilter('close_due')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '9999px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    backgroundColor: activePoFilter === 'close_due' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                    color: activePoFilter === 'close_due' ? '#ffffff' : '#a1a1aa',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <span className="filter-label-full">{language === 'id' ? 'Mendekati Deadline' : 'Close Due Date'}</span>
                                <span className="filter-label-short">{language === 'id' ? 'Mendekati' : 'Near Due'}</span>
                            </button>
                        </div>
                    )}
                    {filteredPos.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
                            {activeTab === 'completed' ? 'No completed POs yet.' : t.no_pos}
                        </div>
                    ) : (
                        <div>
                            {/* Compact summary strip for mobile */}
                            <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '12px', padding: '0 4px' }}>
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
                                                        color: po.status === 'COMPLETED' ? '#34d399' : '#fbbf24'
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
                                                <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '2px' }}>
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
                                                    <div style={{ fontSize: '14px', color: '#71717a', padding: '12px 0' }}>No items in this PO.</div>
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
                                                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa' }}>{item.item_name}</span>
                                                                        <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a1a1aa' }}>
                                                                            {item.item_type === 'MANUFACTURE' 
                                                                                ? (language === 'id' ? 'Produksi Internal' : 'Manufactured') 
                                                                                : (language === 'id' ? 'Beli Jadi (Buyout)' : 'Buyout')}
                                                                        </span>
                                                                        {item.drafter_status && (
                                                                            <span className="badge" style={{
                                                                                backgroundColor: item.drafter_status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                                                                                color: item.drafter_status === 'APPROVED' ? '#34d399' : '#a78bfa',
                                                                            }}>
                                                                                {item.drafter_status === 'APPROVED' 
                                                                                    ? (language === 'id' ? 'Gambar Disetujui' : 'Drawing Approved')
                                                                                    : (language === 'id' ? `Gambar: ${item.drafter_status}` : `Drawing: ${item.drafter_status}`)}
                                                                            </span>
                                                                        )}
                                                                        {item.purchasing_status && (
                                                                            <span className="badge" style={{
                                                                                backgroundColor: item.purchasing_status === 'READY' ? 'rgba(16, 185, 129, 0.15)' :
                                                                                    item.purchasing_status === 'PROSES' ? 'rgba(234, 179, 8, 0.15)' :
                                                                                    'rgba(59, 130, 246, 0.1)',
                                                                                color: item.purchasing_status === 'READY' ? '#34d399' :
                                                                                    item.purchasing_status === 'PROSES' ? '#fbbf24' :
                                                                                    '#3b82f6',
                                                                            }}>
                                                                                {item.purchasing_status === 'READY'
                                                                                    ? (language === 'id' ? 'Bahan Baku Siap' : 'Material Ready')
                                                                                    : item.purchasing_status === 'PROSES'
                                                                                    ? (language === 'id' ? 'Bahan Dipesan' : 'Material Ordered')
                                                                                    : (language === 'id' ? `Material: ${item.purchasing_status}` : `Material: ${item.purchasing_status}`)}
                                                                            </span>
                                                                        )}
                                                                        <span className="badge" style={{
                                                                            backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.15)'
                                                                                : isTerminated ? 'rgba(239, 68, 68, 0.15)'
                                                                                : progress >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                                            color: isCancelled ? '#ef4444'
                                                                                : isTerminated ? '#ef4444'
                                                                                : progress >= 100 ? '#34d399' : '#3b82f6'
                                                                        }}>
                                                                            {(() => {
                                                                                switch (item.status) {
                                                                                    case 'IN_PROGRESS': return language === 'id' ? 'Proses Produksi' : 'In Production';
                                                                                    case 'PENDING': return language === 'id' ? 'Belum Mulai' : 'Pending';
                                                                                    case 'COMPLETED': return language === 'id' ? 'Selesai' : 'Completed';
                                                                                    case 'CANCELLED': return language === 'id' ? 'Dibatalkan' : 'Cancelled';
                                                                                    case 'TERMINATED': return language === 'id' ? 'Dihentikan' : 'Terminated';
                                                                                    default: return item.status;
                                                                                }
                                                                            })()}
                                                                        </span>
                                                                            {(() => {
                                                                                const itemAlerts = alerts.filter(a => a.item_id === item.id && !a.is_resolved);
                                                                                const reworkAlert = itemAlerts.find(a => a.severity === 'YELLOW');
                                                                                const reworkVal = reworkAlert ? (reworkAlert.message ? `Rework: ${reworkAlert.message}` : 'Rework') : null;
                                                                                return renderWarningPill(po.global_deadline, reworkVal, language);
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                    <div className="progress-bar-mini" style={{ maxWidth: '100px' }}>
                                                                        <div className="progress-bar-mini-fill" style={{
                                                                            width: `${progress}%`,
                                                                            backgroundColor: isCancelled ? '#f87171' : '#6366f1'
                                                                        }} />
                                                                    </div>
                                                                    <span className="item-pct-label" style={{ 
                                                                        fontSize: '12px', 
                                                                        fontWeight: 700, 
                                                                        color: '#818cf8',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: '2px',
                                                                        alignItems: 'flex-end'
                                                                    }}>
                                                                        <span>{progress.toFixed(0)}%</span>
                                                                        <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 'normal' }}>
                                                                            ({item.delivered_qty || 0} / {item.target_qty || 0} pcs)
                                                                        </span>
                                                                    </span>
                                                                    <ChevronDown size={14} expanded={itemExpanded} />
                                                                </button>

                                                                {itemExpanded && (
                                                                    <div className="item-compact-detail">
                                                                        <div className="responsive-split" style={{ marginBottom: '12px', gap: '8px' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#818cf8' }}>
                                                                                    Client: {po.client_name}
                                                                                </div>
                                                                                <div style={{ fontSize: '12px', color: '#a1a1aa' }}>
                                                                                    Deadline: {formatDeadline(po.global_deadline, language)}
                                                                                </div>
                                                                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#a5b4fc' }}>
                                                                                    Qty: {item.target_qty} pcs {item.delivered_qty > 0 ? `| Delivered: ${item.delivered_qty} pcs` : ''}
                                                                                </div>
                                                                                {item.drafter_status && (
                                                                                    <div style={{ fontSize: '11px', color: item.drafter_status === 'APPROVED' ? '#34d399' : '#a78bfa' }}>
                                                                                        {language === 'en' ? 'Drafter' : 'Drafter'}: {item.drafter_status}
                                                                                    </div>
                                                                                )}
                                                                                {item.purchasing_status && (
                                                                                    <div style={{ fontSize: '11px', color: item.purchasing_status === 'READY' ? '#34d399' : item.purchasing_status === 'PROSES' ? '#fbbf24' : '#3b82f6' }}>
                                                                                        {language === 'en' ? 'Purchasing' : 'Pembelian'}: {item.purchasing_status}
                                                                                    </div>
                                                                                )}
                                                                                {item.vendor_name && (
                                                                                    <div style={{ fontSize: '11px', color: '#34d399' }}>
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
                                                                                            backgroundColor: hasProgress ? '#27272a' : 'rgba(239, 68, 68, 0.1)',
                                                                                            color: hasProgress ? '#52525b' : '#ef4444',
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
                                                                                backgroundColor: '#09090b',
                                                                                borderRadius: '3px',
                                                                                overflow: 'hidden'
                                                                            }}>
                                                                                <div style={{
                                                                                    width: `${progress}%`,
                                                                                    height: '100%',
                                                                                    backgroundColor: isCancelled ? '#f87171' : '#6366f1',
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
                                                                                <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '6px' }}>
                                                                                    Stages
                                                                                </div>
                                                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                                    {item.item_progresses.map((stage) => (
                                                                                        <span key={stage.id} className="badge" style={{
                                                                                            backgroundColor: stage.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)'
                                                                                                : stage.status === 'STUCK' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                                                                                            color: stage.status === 'COMPLETED' ? '#34d399'
                                                                                                : stage.status === 'STUCK' ? '#ef4444' : '#a1a1aa',
                                                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                                                            fontSize: '11px',
                                                                                            padding: '3px 8px'
                                                                                        }}>
                                                                                            {(() => {
                                                                                                const nameLower = stage.stage_name.toLowerCase();
                                                                                                const isDesign = nameLower.includes('design') || nameLower.includes('gambar') || nameLower.includes('draft');
                                                                                                const isMaterial = nameLower.includes('material') || nameLower.includes('bahan') || nameLower.includes('vendor') || nameLower.includes('purchasing');

                                                                                                let progressText = '';
                                                                                                if (isDesign) {
                                                                                                    const pct = parseFloat(stage.progress_percent);
                                                                                                    if (stage.status === 'COMPLETED' || pct >= 100) {
                                                                                                        progressText = language === 'id' ? 'Disetujui' : 'Approved';
                                                                                                    } else if (pct > 0) {
                                                                                                        progressText = language === 'id' ? 'Gambar' : 'Drawing';
                                                                                                    } else {
                                                                                                        progressText = 'Pending';
                                                                                                    }
                                                                                                } else if (isMaterial) {
                                                                                                    const pct = parseFloat(stage.progress_percent);
                                                                                                    if (stage.status === 'COMPLETED' || pct >= 100) {
                                                                                                        progressText = language === 'id' ? 'Selesai' : 'Complete';
                                                                                                    } else if (pct >= 60) {
                                                                                                        progressText = language === 'id' ? 'Proses' : 'Process';
                                                                                                    } else if (pct >= 30) {
                                                                                                        progressText = language === 'id' ? 'Pesan' : 'Order';
                                                                                                    } else {
                                                                                                        progressText = 'Pending';
                                                                                                    }
                                                                                                } else {
                                                                                                    progressText = stage.completed_qty > 0 ? `${stage.completed_qty} pcs` : `${parseFloat(stage.progress_percent).toFixed(0)}%`;
                                                                                                }

                                                                                                return `${stage.stage_name}: ${progressText}`;
                                                                                            })()}
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

            {activeTab === 'matrix' && telemetry && (() => {
                // ── Per-render helpers ──────────────────────────────────────────
                const prev = (telemetry.previous || {}) as any;
                const rangeLabel = selected_range === 'week' ? t.this_week : selected_range === 'year' ? t.this_year : t.this_month;

                const otdrDelta: number | null = prev.otdr != null
                    ? Math.round((telemetry.otdr - prev.otdr) * 10) / 10
                    : null;

                const deliveredCurr: number = telemetry.manufacture?.delivered ?? telemetry.manufacture?.completed ?? 0;
                const deliveredPrev: number = prev.manufacture?.delivered ?? 0;
                const deliveredDelta: number | null = deliveredPrev > 0
                    ? Math.round(((deliveredCurr - deliveredPrev) / deliveredPrev) * 100)
                    : null;

                const delayDelta: number | null = prev.avg_delay_days != null
                    ? Math.round((telemetry.avg_delay_days - prev.avg_delay_days) * 10) / 10
                    : null;

                // Top stuck stage for narrative
                const topStuck = [...(telemetry.stage_metrics || [])]
                    .sort((a: any, b: any) => b.stuck_count - a.stuck_count)
                    .find((m: any) => m.stuck_count > 0);

                // Auto-narrative (Bahasa Indonesia primary)
                let narrative = '';
                if (language === 'id') {
                    narrative = `Periode ini, pabrik menyelesaikan ${telemetry.otdr}% pesanan tepat waktu`;
                    if (otdrDelta != null) {
                        narrative += otdrDelta >= 0
                            ? ` — naik ${Math.abs(otdrDelta)}% dari periode lalu`
                            : ` — turun ${Math.abs(otdrDelta)}% dari periode lalu`;
                    }
                    narrative += '. ';
                    if (topStuck) {
                        narrative += `Bottleneck utama ada di tahap ${topStuck.stage} (${topStuck.stuck_count} macet, rata-rata ${topStuck.avg_cycle_time} hari/item). `;
                    } else {
                        narrative += 'Semua tahap produksi berjalan normal. ';
                    }
                    if ((telemetry.urgent_active || 0) > 0) {
                        narrative += `Terdapat ${telemetry.urgent_active} PO mendesak yang masih aktif. `;
                    }
                    if ((telemetry.finance_health?.uninvoiced_count || 0) > 0) {
                        narrative += `${telemetry.finance_health.uninvoiced_count} item selesai belum difakturkan.`;
                    }
                } else {
                    narrative = `This period, the factory completed ${telemetry.otdr}% of orders on time`;
                    if (otdrDelta != null) {
                        narrative += otdrDelta >= 0
                            ? ` — up ${Math.abs(otdrDelta)}% vs last period`
                            : ` — down ${Math.abs(otdrDelta)}% vs last period`;
                    }
                    narrative += '. ';
                    if (topStuck) {
                        narrative += `Top bottleneck: ${topStuck.stage} stage (${topStuck.stuck_count} stuck, avg ${topStuck.avg_cycle_time} days/item). `;
                    } else {
                        narrative += 'All production stages running normally. ';
                    }
                    if ((telemetry.urgent_active || 0) > 0) {
                        narrative += `${telemetry.urgent_active} urgent PO(s) still active. `;
                    }
                    if ((telemetry.finance_health?.uninvoiced_count || 0) > 0) {
                        narrative += `${telemetry.finance_health.uninvoiced_count} completed item(s) not yet invoiced.`;
                    }
                }

                // Pipeline stage health color
                const getStageHealth = (metric: any) => {
                    if (metric.stuck_count > 0) return { border: 'rgba(239,68,68,0.6)', bg: 'rgba(239,68,68,0.08)', label: '#ef4444' };
                    if (metric.avg_cycle_time > 3) return { border: 'rgba(249,115,22,0.5)', bg: 'rgba(249,115,22,0.07)', label: '#fb923c' };
                    if (metric.avg_cycle_time > 1) return { border: 'rgba(234,179,8,0.4)', bg: 'rgba(234,179,8,0.05)', label: '#fbbf24' };
                    return { border: 'rgba(16,185,129,0.35)', bg: 'rgba(16,185,129,0.05)', label: '#34d399' };
                };

                const pipelineStages = (telemetry.stage_metrics || [])
                    .filter((m: any) => !m.stage.toLowerCase().includes('rework'));

                return (
                    <div className="performance-matrix-container" style={{ marginBottom: '40px' }}>

                        {/* ── Filter Bar ───────────────────────────────────────── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {['week', 'month', 'year'].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => handleRangeChange(r)}
                                        style={{
                                            padding: '6px 12px',
                                            backgroundColor: selected_range === r ? '#6366f1' : 'transparent',
                                            color: selected_range === r ? '#fff' : '#a1a1aa',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: 600,
                                            fontSize: '12px',
                                            cursor: 'pointer',
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
                                        color: '#e4e4e7',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {isPresentationMode ? t.exit_presentation : t.presentation_mode}
                                </button>
                                <a
                                    href={`/c/${tenant?.slug}/export-pdf?range=${selected_range || 'month'}`}
                                    target="_blank"
                                    style={{
                                        padding: '8px 16px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '12px',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    {t.export_pdf}
                                </a>
                            </div>
                        </div>

                        {/* ── Section 0: Narasi Otomatis ────────────────────────── */}
                        <div style={{
                            backgroundColor: 'rgba(37,99,235,0.06)',
                            border: '1px solid rgba(37,99,235,0.2)',
                            borderRadius: '12px',
                            padding: '14px 18px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                        }}>
                            <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>📊</span>
                            <div>
                                <div style={{ fontSize: '10px', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                                    {language === 'id' ? 'Ringkasan Kinerja' : 'Performance Summary'} · {rangeLabel}
                                </div>
                                <p style={{ margin: 0, fontSize: '13px', color: '#e4e4e7', lineHeight: 1.65 }}>{narrative}</p>
                            </div>
                        </div>

                        {/* ── Section 1: KPI Cards with Period Delta ────────────── */}
                        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '22px' }}>

                            {/* OTDR */}
                            <div
                                onClick={() => setMatrixFilter(prev =>
                                    prev?.type === 'kpi_otdr' ? null : { type: 'kpi_otdr', value: `${telemetry.otdr}%`, label: language === 'id' ? 'Tepat Waktu' : 'On-Time' }
                                )}
                                className="kpi-card"
                                style={{
                                    backgroundColor: 'rgba(15,23,42,0.6)',
                                    border: matrixFilter?.type === 'kpi_otdr' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.06)',
                                    boxShadow: matrixFilter?.type === 'kpi_otdr' ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{t.on_time_delivery}</span>
                                <span style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1.1, marginTop: '4px', color: telemetry.otdr >= 80 ? '#34d399' : telemetry.otdr >= 60 ? '#fbbf24' : '#ef4444' }}>
                                    {telemetry.otdr}%
                                </span>
                                {otdrDelta != null && (
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: otdrDelta >= 0 ? '#34d399' : '#ef4444', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                        {otdrDelta >= 0 ? '▲' : '▼'} {Math.abs(otdrDelta)}%{' '}
                                        <span style={{ color: '#52525b', fontWeight: 400 }}>vs {rangeLabel}</span>
                                    </span>
                                )}
                            </div>

                            {/* Parts Delivered */}
                            <div
                                onClick={() => setMatrixFilter(prev =>
                                    prev?.type === 'kpi_parts' ? null : { type: 'kpi_parts', value: `${deliveredCurr} Pcs`, label: language === 'id' ? 'Selesai Diproduksi' : 'Delivered Manufactured' }
                                )}
                                className="kpi-card"
                                style={{
                                    backgroundColor: 'rgba(15,23,42,0.6)',
                                    border: matrixFilter?.type === 'kpi_parts' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.06)',
                                    boxShadow: matrixFilter?.type === 'kpi_parts' ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{t.parts_manufactured}</span>
                                <span style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.1, marginTop: '4px', color: '#3b82f6' }}>
                                    {deliveredCurr} <span style={{ fontSize: '15px', color: '#52525b', fontWeight: 500 }}>/ {telemetry.manufacture?.target ?? 0} Pcs</span>
                                </span>
                                {deliveredDelta != null && (
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: deliveredDelta >= 0 ? '#34d399' : '#ef4444', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                        {deliveredDelta >= 0 ? '▲' : '▼'} {Math.abs(deliveredDelta)}%{' '}
                                        <span style={{ color: '#52525b', fontWeight: 400 }}>vs {rangeLabel}</span>
                                    </span>
                                )}
                            </div>

                            {/* Avg Delay */}
                            <div
                                onClick={() => setMatrixFilter(prev =>
                                    prev?.type === 'kpi_delay' ? null : { type: 'kpi_delay', value: `${telemetry.avg_delay_days} hari`, label: language === 'id' ? 'Keterlambatan' : 'Overdue' }
                                )}
                                className="kpi-card"
                                style={{
                                    backgroundColor: 'rgba(15,23,42,0.6)',
                                    border: matrixFilter?.type === 'kpi_delay' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.06)',
                                    boxShadow: matrixFilter?.type === 'kpi_delay' ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{t.avg_delay}</span>
                                <span style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1.1, marginTop: '4px', color: telemetry.avg_delay_days === 0 ? '#34d399' : telemetry.avg_delay_days <= 3 ? '#fbbf24' : '#ef4444' }}>
                                    {telemetry.avg_delay_days} <span style={{ fontSize: '15px', fontWeight: 500, color: '#52525b' }}>{language === 'id' ? 'Hari' : 'Days'}</span>
                                </span>
                                {delayDelta != null && (
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: delayDelta <= 0 ? '#34d399' : '#ef4444', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                        {delayDelta >= 0 ? '▲' : '▼'} {Math.abs(delayDelta)}{' '}
                                        <span style={{ color: '#52525b', fontWeight: 400 }}>vs {rangeLabel}</span>
                                    </span>
                                )}
                            </div>

                            {/* Urgent Active POs */}
                            <div
                                onClick={() => setMatrixFilter(prev =>
                                    prev?.type === 'kpi_urgent' ? null : { type: 'kpi_urgent', value: `${telemetry.urgent_active || 0} PO`, label: language === 'id' ? 'Mendesak' : 'Urgent' }
                                )}
                                className="kpi-card"
                                style={{
                                    backgroundColor: 'rgba(15,23,42,0.6)',
                                    border: matrixFilter?.type === 'kpi_urgent' ? '2px solid #3b82f6' : (telemetry.urgent_active || 0) > 0 ? 'rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                    boxShadow: matrixFilter?.type === 'kpi_urgent' ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                                    {language === 'id' ? 'PO Mendesak Aktif' : 'Urgent Active POs'}
                                </span>
                                <span style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1.1, marginTop: '4px', color: (telemetry.urgent_active || 0) > 0 ? '#ef4444' : '#34d399' }}>
                                    {telemetry.urgent_active || 0}
                                </span>
                                <span style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>
                                    {(telemetry.urgent_active || 0) > 0
                                        ? (language === 'id' ? 'Butuh perhatian segera' : 'Needs immediate attention')
                                        : (language === 'id' ? 'Tidak ada PO mendesak' : 'No urgent POs')}
                                </span>
                            </div>
                        </div>

                        {/* ── Section 2: Pipeline Flow Visualization ───────────── */}
                        <div style={{ backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', marginBottom: '22px' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', margin: 0 }}>
                                    {language === 'id' ? 'Alur Produksi' : 'Production Pipeline'}
                                </h3>
                                <span className="pipeline-legend" style={{ fontSize: '11px', color: '#52525b' }}>
                                    {language === 'id'
                                        ? '🔴 macet · 🟠 lambat (>3 hari) · 🟡 pantau (>1 hari) · 🟢 normal'
                                        : '🔴 stuck · 🟠 slow (>3d) · 🟡 watch (>1d) · 🟢 normal'}
                                </span>
                            </div>
                            <div className="pipeline-scroll-container" style={{ display: 'flex', overflowX: 'auto', alignItems: 'center', gap: '0', paddingBottom: '8px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                                {pipelineStages.length === 0 ? (
                                    <span style={{ color: '#52525b', fontSize: '13px' }}>
                                        {language === 'id' ? 'Belum ada data tahap produksi.' : 'No stage data yet.'}
                                    </span>
                                ) : pipelineStages.map((metric: any, idx: number) => {
                                    const health = getStageHealth(metric);
                                    const isSelected = matrixFilter?.type === 'stage' && matrixFilter?.value === metric.stage;
                                    return (
                                        <React.Fragment key={`pipeline-${idx}`}>
                                            <div
                                                onClick={() => setMatrixFilter(prev =>
                                                    prev?.type === 'stage' && prev?.value === metric.stage
                                                        ? null
                                                        : { type: 'stage', value: metric.stage, label: language === 'id' ? 'Tahap' : 'Stage' }
                                                )}
                                                style={{
                                                    flexShrink: 0,
                                                    minWidth: '106px',
                                                    backgroundColor: health.bg,
                                                    border: isSelected ? '2px solid #3b82f6' : `1px solid ${health.border}`,
                                                    boxShadow: isSelected ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none',
                                                    transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                                                    borderRadius: '10px',
                                                    padding: '10px 12px',
                                                    textAlign: 'center',
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    scrollSnapAlign: 'start',
                                                }}
                                            >
                                                {metric.stuck_count > 0 && (
                                                    <span style={{
                                                        position: 'absolute',
                                                        top: '-7px',
                                                        right: '-7px',
                                                        backgroundColor: '#ef4444',
                                                        color: '#fff',
                                                        borderRadius: '50%',
                                                        width: '18px',
                                                        height: '18px',
                                                        fontSize: '10px',
                                                        fontWeight: 800,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid #09090b',
                                                    }}>{metric.stuck_count}</span>
                                                )}
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                                    {metric.stage}
                                                </div>
                                                <div style={{ fontSize: '20px', fontWeight: 800, color: health.label, lineHeight: 1 }}>
                                                    {metric.active_items}
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#52525b', marginTop: '2px' }}>
                                                    {language === 'id' ? 'item aktif' : 'active'}
                                                </div>
                                                {metric.avg_cycle_time > 0 && (
                                                    <div style={{ fontSize: '10px', color: health.label, marginTop: '5px', fontWeight: 600, borderTop: `1px solid ${health.border}`, paddingTop: '5px' }}>
                                                        {metric.avg_cycle_time}d avg
                                                    </div>
                                                )}
                                            </div>
                                            {idx < pipelineStages.length - 1 && (
                                                <div className="pipeline-arrow" style={{ color: '#27272a', fontSize: '22px', padding: '0 3px', flexShrink: 0, userSelect: 'none' }}>→</div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Active Delay & Risk Directory ────────────────────── */}
                        <div style={{ backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', marginBottom: '22px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fafafa', margin: 0 }}>
                                        {matrixFilter ? (language === 'id' ? 'Hasil Filter Data' : 'Filtered Data Directory') : (language === 'id' ? 'Direktori PO & Item' : 'PO & Item Directory')}
                                    </h3>
                                    {matrixFilter && (
                                        <span style={{
                                            backgroundColor: '#6366f1',
                                            color: '#fff',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            {matrixFilter.label}: {matrixFilter.value.toUpperCase()}
                                            <button
                                                onClick={() => setMatrixFilter(null)}
                                                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 2px', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center' }}
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Pill Filters */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                <button
                                    onClick={() => setDirectoryFilter('client')}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        backgroundColor: directoryFilter === 'client' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                        color: directoryFilter === 'client' ? '#ffffff' : '#a1a1aa',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {language === 'id' ? 'Per Klien (Default)' : 'Per Client (Default)'}
                                </button>
                                <button
                                    onClick={() => setDirectoryFilter('marked')}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        backgroundColor: directoryFilter === 'marked' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                        color: directoryFilter === 'marked' ? '#ffffff' : '#a1a1aa',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {language === 'id' ? 'Ditandai (Rework/Kendala)' : 'Marked (Rework / Trouble)'}
                                </button>
                                <button
                                    onClick={() => setDirectoryFilter('delayed')}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        backgroundColor: directoryFilter === 'delayed' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                        color: directoryFilter === 'delayed' ? '#ffffff' : '#a1a1aa',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {language === 'id' ? 'Terlambat' : 'Delayed'}
                                </button>
                                <button
                                    onClick={() => setDirectoryFilter('ontime')}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        backgroundColor: directoryFilter === 'ontime' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                        color: directoryFilter === 'ontime' ? '#ffffff' : '#a1a1aa',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {language === 'id' ? 'Tepat Waktu' : 'On Time'}
                                </button>
                                <button
                                    onClick={() => setDirectoryFilter('close_due')}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        backgroundColor: directoryFilter === 'close_due' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                        color: directoryFilter === 'close_due' ? '#ffffff' : '#a1a1aa',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {language === 'id' ? 'Mendekati Deadline' : 'Close Due Date'}
                                </button>
                            </div>

                            <div style={{ width: '100%', overflowX: 'auto' }}>
                                {(() => {
                                    const getFilteredItems = () => {
                                        let items = [];
                                        if (!matrixFilter) {
                                            items = telemetry.all_items || [];
                                        } else {
                                            const allItems = telemetry.all_items || [];
                                            const { type, value } = matrixFilter;

                                            switch (type) {
                                                case 'stage':
                                                    items = allItems.filter((item: any) =>
                                                        item.current_stage?.toLowerCase() === value.toLowerCase()
                                                    );
                                                    break;
                                                case 'kpi_otdr':
                                                    items = allItems.filter((item: any) =>
                                                        item.po_status === 'COMPLETED' && item.is_on_time
                                                    );
                                                    break;
                                                case 'kpi_parts':
                                                    items = allItems.filter((item: any) =>
                                                        item.delivered_qty > 0
                                                    );
                                                    break;
                                                case 'kpi_delay':
                                                    items = allItems.filter((item: any) =>
                                                        item.days_overdue > 0
                                                    );
                                                    break;
                                                case 'kpi_urgent':
                                                    items = allItems.filter((item: any) =>
                                                        item.is_urgent
                                                    );
                                                    break;
                                                case 'finance_uninvoiced':
                                                    items = allItems.filter((item: any) =>
                                                        item.po_status === 'COMPLETED' && item.invoice_status === 'UNINVOICED'
                                                    );
                                                    break;
                                                case 'finance_unpaid':
                                                    items = allItems.filter((item: any) =>
                                                        item.po_status === 'COMPLETED' && item.payment_status === 'UNPAID' && item.invoice_status !== 'UNINVOICED'
                                                    );
                                                    break;
                                                case 'client':
                                                    items = allItems.filter((item: any) =>
                                                        item.client_name?.toLowerCase() === value.toLowerCase()
                                                    );
                                                    break;
                                                case 'client_overdue':
                                                    items = allItems.filter((item: any) =>
                                                        item.client_name?.toLowerCase() === value.toLowerCase() && item.days_overdue > 0
                                                    );
                                                    break;
                                                case 'client_uninvoiced':
                                                    items = allItems.filter((item: any) =>
                                                        item.client_name?.toLowerCase() === value.toLowerCase() && item.po_status === 'COMPLETED' && item.invoice_status === 'UNINVOICED'
                                                    );
                                                    break;
                                                case 'client_unpaid':
                                                    items = allItems.filter((item: any) =>
                                                        item.client_name?.toLowerCase() === value.toLowerCase() && item.po_status === 'COMPLETED' && item.payment_status === 'UNPAID' && item.invoice_status !== 'UNINVOICED'
                                                    );
                                                    break;
                                                case 'reason':
                                                    items = allItems.filter((item: any) =>
                                                        item.reason?.toLowerCase().includes(value.toLowerCase())
                                                    );
                                                    break;
                                                default:
                                                    items = allItems;
                                            }
                                        }

                                        // Apply the pill filter directoryFilter
                                        switch (directoryFilter) {
                                            case 'marked':
                                                return items.filter((item: any) => {
                                                    const itemAlerts = alerts.filter(a => a.item_id === item.id && !a.is_resolved);
                                                    return itemAlerts.some(a => a.severity === 'RED' || a.severity === 'YELLOW');
                                                });
                                            case 'delayed':
                                                return items.filter((item: any) =>
                                                    item.days_overdue > 0 && item.po_status !== 'COMPLETED'
                                                );
                                            case 'ontime':
                                                return items.filter((item: any) =>
                                                    (item.po_status === 'COMPLETED' && item.is_on_time) || (item.po_status !== 'COMPLETED' && item.days_overdue === 0)
                                                );
                                            case 'close_due':
                                                return items.filter((item: any) => {
                                                    if (!item.global_deadline || item.po_status === 'COMPLETED') return false;
                                                    const deadline = new Date(item.global_deadline);
                                                    const today = new Date();
                                                    const diffTime = deadline.getTime() - today.getTime();
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                    return diffDays >= 0 && diffDays <= 7;
                                                });
                                            case 'client':
                                            default:
                                                return items;
                                        }
                                    };

                                    const filteredItems = getFilteredItems();

                                    if (filteredItems.length === 0) {
                                        return (
                                            <div style={{ color: '#71717a', fontSize: '13px', padding: '24px 0', textAlign: 'center' }}>
                                                {matrixFilter ? (language === 'id' ? `Tidak ada data untuk filter "${matrixFilter.label}: ${matrixFilter.value}".` : `No data found for filter "${matrixFilter.label}: ${matrixFilter.value}".`) : (language === 'id' ? 'Tidak ada data item PO.' : 'No PO items found.')}
                                            </div>
                                        );
                                    }

                                    // Group filteredItems by clientName
                                    const groupedByClient: { [key: string]: any[] } = {};
                                    filteredItems.forEach((item: any) => {
                                        const cName = item.client_name || 'Other';
                                        if (!groupedByClient[cName]) {
                                            groupedByClient[cName] = [];
                                        }
                                        groupedByClient[cName].push(item);
                                    });

                                    return (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#71717a', fontWeight: 600 }}>{t.po_number_label}</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#71717a', fontWeight: 600 }}>{t.client_label}</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#71717a', fontWeight: 600 }}>{t.item_name_label}</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 16px', color: '#71717a', fontWeight: 600 }}>{t.progress_label}</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 16px', color: '#71717a', fontWeight: 600 }}>{language === 'id' ? 'Status' : 'Status'}</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 16px', color: '#71717a', fontWeight: 600 }}>{t.deadline_label}</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 16px', color: '#71717a', fontWeight: 600 }}>{t.days_overdue_label}</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#71717a', fontWeight: 600 }}>{t.delay_reason_label}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.keys(groupedByClient).map((cName) => {
                                                    const clientItems = groupedByClient[cName];
                                                    return (
                                                        <React.Fragment key={`group-${cName}`}>
                                                            <tr style={{ backgroundColor: 'rgba(59,130,246,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                                <td colSpan={8} style={{ padding: '8px 16px', fontWeight: 700, color: '#818cf8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                    🏢 CLIENT: {cName} ({clientItems.length} item{clientItems.length > 1 ? 's' : ''})
                                                                </td>
                                                            </tr>
                                                            {clientItems.map((item: any, idx: number) => {
                                                                const progress = parseFloat(item.progress_percent);
                                                                
                                                                // Determine status badge
                                                                let displayStatus = item.current_stage || '-';
                                                                let statusColor = '#a1a1aa';
                                                                let statusBg = 'rgba(255,255,255,0.03)';
                                                                
                                                                if (item.po_status === 'COMPLETED') {
                                                                    if (item.invoice_status === 'UNINVOICED') {
                                                                        displayStatus = language === 'id' ? 'Belum Difakturkan' : 'Finance: Uninvoiced';
                                                                        statusColor = '#fbbf24';
                                                                        statusBg = 'rgba(234,179,8,0.1)';
                                                                    } else if (item.payment_status === 'UNPAID') {
                                                                        displayStatus = language === 'id' ? 'Belum Dibayar' : 'Finance: Unpaid';
                                                                        statusColor = '#fb923c';
                                                                        statusBg = 'rgba(249,115,22,0.1)';
                                                                    } else {
                                                                        displayStatus = language === 'id' ? 'Selesai & Lunas' : 'Closed / Settled';
                                                                        statusColor = '#34d399';
                                                                        statusBg = 'rgba(16,185,129,0.1)';
                                                                    }
                                                                } else {
                                                                    statusColor = '#3b82f6';
                                                                    statusBg = 'rgba(59,130,246,0.1)';
                                                                }

                                                                return (
                                                                    <tr key={`delay-${cName}-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#e4e4e7' }}>
                                                                        <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                                                                            <button
                                                                                onClick={() => {
                                                                                    changeTab('active');
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
                                                                                    textDecoration: 'underline',
                                                                                }}
                                                                            >
                                                                                {item.po_number}
                                                                            </button>
                                                                        </td>
                                                                        <td style={{ padding: '12px 16px' }}>{item.client_name}</td>
                                                                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.item_name}</td>
                                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                                                <span className="badge" style={{
                                                                                    backgroundColor: progress >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                                                    color: progress >= 100 ? '#34d399' : '#3b82f6',
                                                                                }}>
                                                                                    {progress.toFixed(0)}%
                                                                                </span>
                                                                                {item.target_qty !== undefined && (
                                                                                    <span style={{ fontSize: '10px', color: '#71717a' }}>
                                                                                        ({item.total_delivered_qty || 0} / {item.target_qty} pcs)
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                                            <span className="badge" style={{
                                                                                backgroundColor: statusBg,
                                                                                color: statusColor,
                                                                                fontWeight: 600,
                                                                            }}>
                                                                                {displayStatus}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#a1a1aa' }}>{item.global_deadline}</td>
                                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                                            {item.days_overdue > 0 ? (
                                                                                <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                                                                                    {item.days_overdue} {t.days_suffix}
                                                                                </span>
                                                                            ) : (
                                                                                <span style={{ color: '#71717a' }}>-</span>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ padding: '12px 16px', color: '#ef4444', fontStyle: 'italic' }}>
                                                                            {item.reason}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* ── Section 5: Finance Health Strip ──────────────────── */}
                        {telemetry.finance_health && (
                            <div style={{ display: 'flex', backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden', marginBottom: '22px' }}>
                                <div
                                    onClick={() => setMatrixFilter(prev =>
                                        prev?.type === 'finance_uninvoiced' ? null : { type: 'finance_uninvoiced', value: `${telemetry.finance_health.uninvoiced_count} Items`, label: language === 'id' ? 'Belum Difakturkan' : 'Uninvoiced Items' }
                                    )}
                                    style={{
                                        flex: 1,
                                        padding: '14px 20px',
                                        borderRight: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        backgroundColor: matrixFilter?.type === 'finance_uninvoiced' ? 'rgba(37,99,235,0.1)' : 'transparent',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <span style={{ fontSize: '20px' }}>💼</span>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                                            {language === 'id' ? 'Belum Difakturkan' : 'Uninvoiced Items'}
                                        </div>
                                        <div style={{ fontSize: '22px', fontWeight: 800, color: telemetry.finance_health.uninvoiced_count > 0 ? '#fbbf24' : '#34d399', lineHeight: 1 }}>
                                            {telemetry.finance_health.uninvoiced_count}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setMatrixFilter(prev =>
                                        prev?.type === 'finance_unpaid' ? null : { type: 'finance_unpaid', value: `${telemetry.finance_health.unpaid_count} Items`, label: language === 'id' ? 'Belum Dibayar' : 'Unpaid Items' }
                                    )}
                                    style={{
                                        flex: 1,
                                        padding: '14px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        backgroundColor: matrixFilter?.type === 'finance_unpaid' ? 'rgba(37,99,235,0.1)' : 'transparent',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <span style={{ fontSize: '20px' }}>💰</span>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                                            {language === 'id' ? 'Belum Dibayar' : 'Unpaid Items'}
                                        </div>
                                        <div style={{ fontSize: '22px', fontWeight: 800, color: telemetry.finance_health.unpaid_count > 0 ? '#fb923c' : '#34d399', lineHeight: 1 }}>
                                            {telemetry.finance_health.unpaid_count}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Chart Row ─────────────────────────────────────────── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '22px' }}>
                            {/* Output and Overdue Trends */}
                            <div style={{ backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', marginBottom: '16px' }}>{t.production_overdue_trends}</h3>
                                <div style={{ width: '100%', overflowX: 'auto' }}>
                                    <svg width="100%" height="200" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                        <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                                        <line x1="40" y1="70" x2="480" y2="70" stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                                        <line x1="40" y1="120" x2="480" y2="120" stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                                        <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.1)" />
                                        {(() => {
                                            const trend = telemetry.trend_data || [];
                                            const maxY = Math.max(...trend.map((d: any) => Math.max(d.output, d.overdue)), 5);
                                            const count = trend.length;
                                            const width = 440;
                                            const chartHeight = 150;
                                            const topOffset = 20;
                                            const leftOffset = 40;
                                            const bars = trend.map((d: any, idx: number) => {
                                                const step = width / count;
                                                const barWidth = Math.max(step * 0.4, 10);
                                                const x = leftOffset + idx * step + (step - barWidth) / 2;
                                                const barHeight = (d.output / maxY) * chartHeight;
                                                const y = topOffset + chartHeight - barHeight;
                                                return (
                                                    <g key={`bar-${idx}`}>
                                                        <rect x={x} y={y} width={barWidth} height={barHeight} fill="#3b82f6" rx="2" style={{ transition: 'all 0.3s' }} />
                                                        <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">{d.output}</text>
                                                    </g>
                                                );
                                            });
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
                                                            <circle cx={p.x} cy={p.y} r="4" fill="#ef4444" stroke="#09090b" strokeWidth="1" />
                                                            <text x={p.x} y={p.y - 6} textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="600">{p.val}</text>
                                                        </g>
                                                    ))}
                                                </g>
                                            );
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
                                        <span style={{ color: '#a1a1aa' }}>{t.legend_completed}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ display: 'inline-block', width: '12px', height: '2px', backgroundColor: '#ef4444' }} />
                                        <span style={{ color: '#a1a1aa' }}>{t.legend_overdue}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Why Delayed Pie */}
                            <div style={{ backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', marginBottom: '16px' }}>{t.why_delayed_reasons}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                                    {(() => {
                                        const reasons = telemetry.delay_reasons || {};
                                        const total = Object.values(reasons).reduce((a: any, b: any) => a + b, 0) as number;
                                        const colors = ['#ef4444', '#fbbf24', '#3b82f6', '#34d399', '#a855f7', '#fb923c', '#71717a'];
                                        if (total === 0) {
                                            return (
                                                <div style={{ color: '#71717a', fontSize: '13px', padding: '40px 0' }}>
                                                    {t.no_incidents}
                                                </div>
                                            );
                                        }
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
                                                        const isSelected = matrixFilter?.type === 'reason' && matrixFilter?.value === key;
                                                        return (
                                                            <div
                                                                key={`legend-${idx}`}
                                                                onClick={() => setMatrixFilter(prev =>
                                                                    prev?.type === 'reason' && prev?.value === key
                                                                        ? null
                                                                        : { type: 'reason', value: key, label: language === 'id' ? 'Alasan Kendala' : 'Delay Reason' }
                                                                )}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    fontSize: '12px',
                                                                    cursor: 'pointer',
                                                                    opacity: matrixFilter && !isSelected ? 0.4 : 1,
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: isSelected ? 'rgba(37,99,235,0.15)' : 'transparent',
                                                                    border: isSelected ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent',
                                                                    transition: 'all 0.2s ease',
                                                                }}
                                                            >
                                                                <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: colors[idx % colors.length], borderRadius: '50%' }} />
                                                                <span style={{ color: '#e4e4e7', fontWeight: 600 }}>{key}: {val}</span>
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

                        {/* ── Bottleneck Detail Table ───────────────────────────── */}
                        <div style={{ backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', marginBottom: '22px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa', marginBottom: '16px' }}>{t.bottleneck_analyzer}</h3>
                            <div style={{ width: '100%', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                            <th style={{ textAlign: 'left', padding: '10px 16px', color: '#71717a', fontWeight: 600 }}>{t.stage}</th>
                                            <th style={{ textAlign: 'center', padding: '10px 16px', color: '#71717a', fontWeight: 600 }}>{t.active_items}</th>
                                            <th style={{ textAlign: 'center', padding: '10px 16px', color: '#71717a', fontWeight: 600 }}>{t.stuck_incidents}</th>
                                            <th style={{ textAlign: 'center', padding: '10px 16px', color: '#71717a', fontWeight: 600 }}>{t.rework_count}</th>
                                            <th style={{ textAlign: 'right', padding: '10px 16px', color: '#71717a', fontWeight: 600 }}>{t.avg_cycle_time}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {telemetry.stage_metrics && telemetry.stage_metrics.map((metric: any, idx: number) => (
                                            <tr
                                                key={`stage-${idx}`}
                                                onClick={() => setMatrixFilter(prev =>
                                                    prev?.type === 'stage' && prev?.value === metric.stage
                                                        ? null
                                                        : { type: 'stage', value: metric.stage, label: language === 'id' ? 'Tahap' : 'Stage' }
                                                )}
                                                style={{
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                    color: '#e4e4e7',
                                                    cursor: 'pointer',
                                                    backgroundColor: matrixFilter?.type === 'stage' && matrixFilter?.value === metric.stage ? 'rgba(37,99,235,0.1)' : 'transparent',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                <td style={{ padding: '10px 16px', fontWeight: 700 }}>
                                                    <span style={{ color: matrixFilter?.type === 'stage' && matrixFilter?.value === metric.stage ? '#3b82f6' : 'inherit' }}>
                                                        {metric.stage.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>{metric.active_items}</td>
                                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                    {metric.stuck_count > 0
                                                        ? <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>{metric.stuck_count} stuck</span>
                                                        : '0'}
                                                </td>
                                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                    {metric.rework_count > 0
                                                        ? <span className="badge" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#fbbf24' }}>{metric.rework_count} rework</span>
                                                        : '0'}
                                                </td>
                                                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{metric.avg_cycle_time.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>



                        {/* ── Section 4: Papan Kinerja Klien ───────────────────── */}
                        {telemetry.client_health && telemetry.client_health.length > 0 && (
                            <div style={{ backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fafafa', margin: 0 }}>
                                        {language === 'id' ? 'Papan Kinerja Klien' : 'Client Performance Board'}
                                    </h3>
                                    <span style={{ fontSize: '11px', color: '#52525b' }}>
                                        {language === 'id' ? 'diurutkan berdasarkan risiko tertinggi' : 'sorted by highest risk'}
                                    </span>
                                </div>
                                <div style={{ width: '100%', overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#71717a', fontWeight: 600 }}>
                                                    {language === 'id' ? 'Klien' : 'Client'}
                                                </th>
                                                <th style={{ textAlign: 'center', padding: '10px 16px', color: '#71717a', fontWeight: 600 }}>
                                                    {language === 'id' ? 'PO Aktif' : 'Active POs'}
                                                </th>
                                                <th style={{ textAlign: 'center', padding: '10px 16px', color: '#71717a', fontWeight: 600 }}>
                                                    {language === 'id' ? 'Ketepatan Waktu' : 'On-Time Rate'}
                                                </th>
                                                <th style={{ textAlign: 'center', padding: '10px 16px', color: '#71717a', fontWeight: 600 }}>
                                                    {language === 'id' ? 'Item Terlambat' : 'Overdue Items'}
                                                </th>
                                                <th style={{ textAlign: 'center', padding: '10px 16px', color: '#71717a', fontWeight: 600 }}>
                                                    {language === 'id' ? 'Belum Faktur' : 'Uninvoiced'}
                                                </th>
                                                <th style={{ textAlign: 'center', padding: '10px 16px', color: '#71717a', fontWeight: 600 }}>
                                                    {language === 'id' ? 'Belum Bayar' : 'Unpaid'}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {telemetry.client_health.map((client: any, idx: number) => {
                                                const otdrColor = client.on_time_rate == null
                                                    ? '#71717a'
                                                    : client.on_time_rate >= 80 ? '#34d399'
                                                    : client.on_time_rate >= 60 ? '#fbbf24'
                                                    : '#ef4444';
                                                const hasRisk = client.overdue_items > 0 || client.uninvoiced_count > 0 || client.unpaid_count > 0;
                                                return (
                                                    <tr key={`client-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#e4e4e7', backgroundColor: hasRisk ? 'rgba(239,68,68,0.015)' : 'transparent' }}>
                                                        <td
                                                            onClick={() => setMatrixFilter({ type: 'client', value: client.client_name, label: language === 'id' ? 'Klien' : 'Client' })}
                                                            style={{ padding: '11px 16px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', color: '#818cf8' }}
                                                        >
                                                            {client.client_name}
                                                        </td>
                                                        <td style={{ padding: '11px 16px', textAlign: 'center', color: '#a1a1aa' }}>{client.active_pos}</td>
                                                        <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                                                            {client.on_time_rate != null
                                                                ? <span style={{ fontWeight: 700, color: otdrColor }}>{client.on_time_rate}%</span>
                                                                : <span style={{ color: '#52525b', fontSize: '11px' }}>N/A</span>}
                                                        </td>
                                                        <td
                                                            onClick={() => client.overdue_items > 0 && setMatrixFilter({ type: 'client_overdue', value: client.client_name, label: language === 'id' ? 'Overdue Klien' : 'Client Overdue' })}
                                                            style={{ padding: '11px 16px', textAlign: 'center', cursor: client.overdue_items > 0 ? 'pointer' : 'default' }}
                                                        >
                                                            {client.overdue_items > 0
                                                                ? <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>{client.overdue_items}</span>
                                                                : <span style={{ color: '#34d399', fontSize: '14px' }}>✓</span>}
                                                        </td>
                                                        <td
                                                            onClick={() => client.uninvoiced_count > 0 && setMatrixFilter({ type: 'client_uninvoiced', value: client.client_name, label: language === 'id' ? 'Belum Difakturkan Klien' : 'Client Uninvoiced' })}
                                                            style={{ padding: '11px 16px', textAlign: 'center', cursor: client.uninvoiced_count > 0 ? 'pointer' : 'default' }}
                                                        >
                                                            {client.uninvoiced_count > 0
                                                                ? <span className="badge" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#fbbf24' }}>{client.uninvoiced_count}</span>
                                                                : <span style={{ color: '#34d399', fontSize: '14px' }}>✓</span>}
                                                        </td>
                                                        <td
                                                            onClick={() => client.unpaid_count > 0 && setMatrixFilter({ type: 'client_unpaid', value: client.client_name, label: language === 'id' ? 'Belum Dibayar Klien' : 'Client Unpaid' })}
                                                            style={{ padding: '11px 16px', textAlign: 'center', cursor: client.unpaid_count > 0 ? 'pointer' : 'default' }}
                                                        >
                                                            {client.unpaid_count > 0
                                                                ? <span className="badge" style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>{client.unpaid_count}</span>
                                                                : <span style={{ color: '#34d399', fontSize: '14px' }}>✓</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}



                    </div>
                );
            })()}


            </div>

            {/* ── Team / User Management Tab ─────────────────────────────── */}
            {activeTab === 'team' && (() => {
                const ALL_ROLES = (roles ?? []).map(r => r.name);
                const filteredUsers = userRoleFilter === 'ALL'
                    ? [...users]
                    : users.filter(u => u.role_name === userRoleFilter);

                const roleColorMap: Record<string, { bg: string; color: string }> = {
                    DRAFTER:      { bg: 'rgba(168,85,247,0.12)',   color: '#a855f7' },
                    PURCHASING:   { bg: 'rgba(249,115,22,0.12)',   color: '#fb923c' },
                    MACHINING:    { bg: 'rgba(20,184,166,0.12)',   color: '#14b8a6' },
                    FABRICATION:  { bg: 'rgba(99,102,241,0.12)',   color: '#6366f1' },
                    PRODUCTION:   { bg: 'rgba(100,116,139,0.12)',  color: '#71717a' },
                    QC:           { bg: 'rgba(248,113,113,0.12)',    color: '#f87171' },
                    DELIVERY:     { bg: 'rgba(16,185,129,0.12)',   color: '#34d399' },
                    STAFF:        { bg: 'rgba(99,102,241,0.12)',   color: '#818cf8' },
                };

                return (
                <div>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 2px 0' }}>{t.team_title}</h2>
                                <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>{t.team_subtitle}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <button
                                    onClick={openAddUser}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(16,185,129,0.3)',
                                        backgroundColor: 'rgba(16,185,129,0.1)',
                                        color: '#34d399',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}
                                >
                                    <Plus size={12} /> {t.add_user}
                                </button>
                                <button
                                    onClick={() => setUserRoleFilter('ALL')}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid',
                                        borderColor: userRoleFilter === 'ALL' ? '#6366f1' : 'rgba(255,255,255,0.08)',
                                        backgroundColor: userRoleFilter === 'ALL' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                                        color: userRoleFilter === 'ALL' ? '#818cf8' : '#71717a',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {t.filter_all_roles}
                                </button>
                                {ALL_ROLES.map(role => (
                                    users.some(u => u.role_name === role) ? (
                                        <button
                                            key={role}
                                            onClick={() => setUserRoleFilter(role)}
                                            style={{
                                                padding: '5px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid',
                                                borderColor: userRoleFilter === role
                                                    ? (roleColorMap[role]?.color || '#71717a')
                                                    : 'rgba(255,255,255,0.08)',
                                                backgroundColor: userRoleFilter === role
                                                    ? (roleColorMap[role]?.bg || 'rgba(255,255,255,0.06)')
                                                    : 'rgba(255,255,255,0.03)',
                                                color: userRoleFilter === role
                                                    ? (roleColorMap[role]?.color || '#71717a')
                                                    : '#71717a',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {role}
                                        </button>
                                    ) : null
                                ))}
                            </div>
                        </div>

                        {/* User cards grid */}
                        {filteredUsers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#71717a', fontSize: '14px' }}>
                                {t.no_users}
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '12px',
                            }}>
                                    {filteredUsers.map(user => {
                                        const isSelf = user.id === auth_user?.id;
                                        const loginMethod = user.username ? 'PASSWORD' : 'PIN';
                                        const roleStyle = roleColorMap[user.role_name] || { bg: 'rgba(100,116,139,0.12)', color: '#71717a' };
                                        return (
                                            <div
                                                key={user.id}
                                                style={{
                                                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    borderRadius: '12px',
                                                    padding: '16px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '10px',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        backgroundColor: roleStyle.bg,
                                                        border: `1px solid ${roleStyle.color}30`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '14px',
                                                        fontWeight: 800,
                                                        color: roleStyle.color,
                                                        flexShrink: 0,
                                                    }}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fafafa' }}>
                                                                {user.name}
                                                            </span>
                                                            {isSelf && (
                                                                <span style={{
                                                                    fontSize: '10px',
                                                                    backgroundColor: 'rgba(59,130,246,0.15)',
                                                                    color: '#3b82f6',
                                                                    padding: '1px 6px',
                                                                    borderRadius: '4px',
                                                                    fontWeight: 700,
                                                                }}>
                                                                    {t.user_self_badge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {user.username && (
                                                            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '1px' }}>@{user.username}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        padding: '3px 8px',
                                                        borderRadius: '5px',
                                                        backgroundColor: roleStyle.bg,
                                                        color: roleStyle.color,
                                                    }}>
                                                        {user.role_name}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        padding: '3px 8px',
                                                        borderRadius: '5px',
                                                        backgroundColor: loginMethod === 'PASSWORD'
                                                            ? 'rgba(99,102,241,0.12)'
                                                            : 'rgba(16,185,129,0.1)',
                                                        color: loginMethod === 'PASSWORD' ? '#818cf8' : '#34d399',
                                                    }}>
                                                        {loginMethod === 'PASSWORD' ? '🔑 ' + t.login_method_password : '🔢 ' + t.login_method_pin}
                                                    </span>
                                                </div>

                                                {!(isOwner && user.is_owner && !isSelf) && (
                                                    <button
                                                        id={`edit-user-${user.id}`}
                                                        onClick={() => openEditUser(user)}
                                                        style={{
                                                            padding: '8px',
                                                            backgroundColor: 'rgba(255,255,255,0.04)',
                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                            borderRadius: '8px',
                                                            color: '#a1a1aa',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            width: '100%',
                                                            textAlign: 'center',
                                                        }}
                                                        onMouseOver={e => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.12)';
                                                            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
                                                            e.currentTarget.style.color = '#818cf8';
                                                        }}
                                                        onMouseOut={e => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                                            e.currentTarget.style.color = '#a1a1aa';
                                                        }}
                                                    >
                                                        ✏️ {t.edit_user}
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

            {/* ── Edit User Modal (Task 1b / 1c / 1d) ────────────────────── */}
            {editingUser && (
                <div
                    id="edit-user-modal"
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 60,
                        padding: '20px',
                    }}
                    onClick={e => { if (e.target === e.currentTarget) closeEditUser(); }}
                >
                    <div style={{
                        backgroundColor: '#18181b',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                        width: '100%',
                        maxWidth: '460px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                    }}>
                        {/* Modal header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0' }}>{t.edit_user}</h2>
                                <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>{editingUser.name}</p>
                            </div>
                            <button
                                onClick={closeEditUser}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#71717a',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    lineHeight: 1,
                                    padding: '0 4px',
                                }}
                            >×</button>
                        </div>

                        <form onSubmit={submitEditUser}>
                            {/* Name */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                    {t.user_name_label}
                                </label>
                                <input
                                    id="edit-user-name"
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: '#09090b',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            {/* Role */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                    {t.user_role_label}
                                </label>
                                <select
                                    id="edit-user-role"
                                    value={editRole}
                                    onChange={e => setEditRole(e.target.value)}
                                    disabled={editingUser.is_owner}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: '#09090b',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: editingUser.is_owner ? '#71717a' : '#fff',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    {(roles ?? []).map(r => (
                                        <option key={r.id} value={r.id}>{r.display_name} ({r.name})</option>
                                    ))}
                                </select>
                                {editingUser.is_owner && (
                                    <p style={{ fontSize: '11px', color: '#71717a', margin: '4px 0 0 0' }}>Owner role cannot be changed.</p>
                                )}
                            </div>

                            {/* Post */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                    Post
                                </label>
                                <select
                                    id="edit-user-post"
                                    value={editPostId}
                                    onChange={e => setEditPostId(e.target.value)}
                                    disabled={editingUser.is_owner}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: '#09090b',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: editingUser.is_owner ? '#71717a' : '#fff',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    <option value="">-- No post --</option>
                                    {(posts ?? []).map(p => (
                                        <option key={p.id} value={p.id}>{p.display_name} ({p.name})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Login Method toggle */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '8px', fontWeight: 600 }}>
                                    {t.user_login_label}
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {(['PASSWORD', 'PIN'] as const).map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setEditLoginMethod(method)}
                                            style={{
                                                flex: 1,
                                                padding: '9px',
                                                borderRadius: '8px',
                                                border: '1px solid',
                                                borderColor: editLoginMethod === method ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                                                backgroundColor: editLoginMethod === method ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                                                color: editLoginMethod === method ? '#3b82f6' : '#a1a1aa',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {method === 'PASSWORD' ? '🔑 ' + t.login_method_password : '🔢 ' + t.login_method_pin}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* PASSWORD fields */}
                            {editLoginMethod === 'PASSWORD' && (
                                <>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                            {t.admin_username}
                                        </label>
                                        <input
                                            id="edit-user-username"
                                            type="text"
                                            value={editUsername}
                                            onChange={e => setEditUsername(e.target.value)}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                backgroundColor: '#09090b',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                            {t.new_password_label}
                                        </label>
                                        <input
                                            id="edit-user-password"
                                            type="password"
                                            value={editPassword}
                                            onChange={e => setEditPassword(e.target.value)}
                                            minLength={6}
                                            placeholder="••••••••"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                backgroundColor: '#09090b',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                </>
                            )}

                            {/* PIN field */}
                            {editLoginMethod === 'PIN' && (
                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                        {t.new_pin_label}
                                    </label>
                                    <input
                                        id="edit-user-pin"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={editPin}
                                        onChange={e => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        minLength={4}
                                        maxLength={6}
                                        placeholder="e.g. 1234"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            backgroundColor: '#09090b',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '18px',
                                            letterSpacing: '0.3em',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                            )}

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                                {/* Delete — only if not self */}
                                {editingUser.id !== auth_user?.id && (
                                    <button
                                        type="button"
                                        id={`delete-user-${editingUser.id}`}
                                        onClick={() => handleDeleteUser(editingUser)}
                                        style={{
                                            padding: '10px 16px',
                                            backgroundColor: 'rgba(239,68,68,0.1)',
                                            border: '1px solid rgba(239,68,68,0.25)',
                                            color: '#ef4444',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        🗑️ {t.delete_user}
                                    </button>
                                )}
                                <div style={{ flex: 1 }} />
                                <button
                                    type="button"
                                    onClick={closeEditUser}
                                    style={{
                                        padding: '10px 16px',
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: '#e4e4e7',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    id={`save-user-${editingUser.id}`}
                                    disabled={editSubmitting}
                                    style={{
                                        padding: '10px 20px',
                                        background: editSubmitting ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        border: 'none',
                                        color: '#fff',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: editSubmitting ? 'not-allowed' : 'pointer',
                                        opacity: editSubmitting ? 0.7 : 1,
                                    }}
                                >
                                    {editSubmitting ? '...' : t.save_user}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {showAddUserModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    padding: '20px',
                }}>
                    <div style={{
                        backgroundColor: '#18181b',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        width: '100%',
                        maxWidth: '420px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                    }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0' }}>
                            {t.add_user_title}
                        </h2>
                        <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 24px 0' }}>
                            {t.add_user_subtitle}
                        </p>

                        <form onSubmit={submitAddUser}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                    {t.user_name_label}
                                </label>
                                <input
                                    type="text"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    required
                                    placeholder="e.g. John Doe"
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: '#09090b',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                    {t.user_role_label}
                                </label>
                                <select
                                    value={newUserRoleId ?? ''}
                                    onChange={e => setNewUserRoleId(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: '#09090b',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                >
                                    <option value="">-- Select role --</option>
                                    {(roles ?? []).map(r => (
                                        <option key={r.id} value={r.id}>{r.display_name} ({r.name})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                    Post
                                </label>
                                <select
                                    value={newUserPostId}
                                    onChange={e => setNewUserPostId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: '#09090b',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                >
                                    <option value="">-- No post --</option>
                                    {(posts ?? []).map(p => (
                                        <option key={p.id} value={p.id}>{p.display_name} ({p.name})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '8px', fontWeight: 600 }}>
                                    {t.user_login_label}
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {(['PASSWORD', 'PIN'] as const).map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setNewUserLoginMethod(method)}
                                            style={{
                                                flex: 1,
                                                padding: '9px',
                                                borderRadius: '8px',
                                                border: '1px solid',
                                                borderColor: newUserLoginMethod === method ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                                                backgroundColor: newUserLoginMethod === method ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                                                color: newUserLoginMethod === method ? '#3b82f6' : '#a1a1aa',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {method === 'PASSWORD' ? '🔑 ' + t.login_method_password : '🔢 ' + t.login_method_pin}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newUserLoginMethod === 'PASSWORD' && (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                            {t.admin_username}
                                        </label>
                                        <input
                                            type="text"
                                            value={newUserUsername}
                                            onChange={(e) => setNewUserUsername(e.target.value)}
                                            required
                                            placeholder="e.g. john.worker"
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                backgroundColor: '#09090b',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                            {t.admin_password}
                                        </label>
                                        <input
                                            type="password"
                                            value={newUserPassword}
                                            onChange={(e) => setNewUserPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            placeholder="••••••••"
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                backgroundColor: '#09090b',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                </>
                            )}

                            {newUserLoginMethod === 'PIN' && (
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                        {t.new_pin_label}
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={newUserPin}
                                        onChange={e => setNewUserPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        required
                                        minLength={4}
                                        maxLength={6}
                                        placeholder="e.g. 1234"
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            backgroundColor: '#09090b',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '18px',
                                            letterSpacing: '0.3em',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddUserModal(false)}
                                    style={{
                                        padding: '10px 16px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        color: '#e4e4e7',
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
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        border: 'none',
                                        color: '#fff',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t.add_user}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                    padding: '20px',
                }}>
                    <div style={{
                        backgroundColor: '#18181b',
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
                        <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 24px 0' }}>
                            {t.admin_subtitle}
                        </p>

                        <form onSubmit={submitAddAdmin}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
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
                                        backgroundColor: '#09090b',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                    Role
                                </label>
                                <select
                                    value={adminRoleId ?? ''}
                                    onChange={e => setAdminRoleId(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: '#09090b',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">-- Select role --</option>
                                    {(roles ?? []).map(r => (
                                        <option key={r.id} value={r.id}>{r.display_name} ({r.name})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                                    Post
                                </label>
                                <select
                                    id="add-admin-post"
                                    value={adminPostId ?? ''}
                                    onChange={e => setAdminPostId(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: '#09090b',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">-- Select post --</option>
                                    {(posts ?? []).map(p => (
                                        <option key={p.id} value={p.id}>{p.display_name} ({p.name})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
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
                                        backgroundColor: '#09090b',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
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
                                        backgroundColor: '#09090b',
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
                                        color: '#e4e4e7',
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
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        border: 'none',
                                        color: '#fff',
                                        borderRadius: '10px',
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





