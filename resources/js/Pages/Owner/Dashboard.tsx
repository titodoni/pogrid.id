import React, { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, Settings, Lock, Plus, Palette, Stop, Broadcast, Globe, Copy, DotGreen, Search } from '../../Components/Icons';
import { formatDeadline, calculateDeadlineDiff } from '../../Utils/deadline';
import { WarningPill } from '../../Components/WarningPill';
import { localizedDisplay } from '../../Utils/locale';
import { StatusBadge } from '../../Components/StatusBadge';
import PresentationMode from '../../Components/OwnerDashboard/PresentationMode';
import SearchModal from '../../Components/OwnerDashboard/SearchModal';
import { useImperativeAlertDialog } from '@astryxdesign/core';
import echo from '../../bootstrap';

const formatAlertTime = (dateStr: string, lang: 'en' | 'id') => {
    try {
        const date = new Date(dateStr);
        const day = date.getDate();
        const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthNamesId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = lang === 'en' ? monthNamesEn[date.getMonth()] : monthNamesId[date.getMonth()];
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        const today = new Date();
        const isToday = date.getDate() === today.getDate() &&
                        date.getMonth() === today.getMonth() &&
                        date.getFullYear() === today.getFullYear();
        
        if (isToday) {
            return lang === 'id' ? `Hari ini, ${hours}:${minutes}` : `Today, ${hours}:${minutes}`;
        }
        return `${day} ${month}, ${hours}:${minutes}`;
    } catch (e) {
        return '';
    }
};

const formatReasonType = (reason: string, lang: 'en' | 'id') => {
    if (!reason) return '';
    const clean = reason.trim();
    if (lang === 'id') {
        switch (clean.toLowerCase()) {
            case 'machine broken':
            case 'machine_broken':
                return 'Mesin Rusak';
            case 'material delay':
            case 'material_delay':
                return 'Bahan Baku Terlambat';
            case 'operator sick':
            case 'operator_sick':
                return 'Operator Sakit';
            case 'power outage':
            case 'power_outage':
                return 'Mati Listrik';
            case 'human error':
            case 'human_error':
                return 'Kesalahan Operator';
            case 'qc rework':
            case 'qc_rework':
                return 'Rework QC';
            case 'pin reset':
            case 'pin_reset':
                return 'Reset PIN';
            case 'other':
                return 'Lainnya';
            default:
                return reason;
        }
    }
    return reason;
};


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
    delivery_status?: string | null;
    invoice_status?: string | null;
    payment_status?: string | null;
    invoiced_qty?: number;
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
    escalated_at?: string | null;
    created_at?: string;
    reason_type?: string | null;
    item?: {
        id: number;
        po_id: number;
        item_name?: string;
        po?: {
            po_number: string;
            client_name: string;
        };
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
    role_display_name: string;
    role_display_name_id?: string | null;
    post_display_name?: string | null;
    post_display_name_id?: string | null;
    is_owner: boolean;
}

interface Props {
    pos: Po[];
    alerts: Alert[];
    users: User[];
    roles: Array<{ id: number; name: string; display_name: string; display_name_id?: string | null; level: string }>;
    posts: Array<{ id: number; name: string; display_name: string; display_name_id?: string | null }>;
    tenant?: {
        company_name: string;
        slug: string;
        workflow_settings?: {
            workflow_mode: 'strict' | 'loose' | 'custom';
            require_design_approved_for_production: boolean;
            require_material_ready_for_production: boolean;
            require_production_completed_for_qc: boolean;
            require_qc_completed_for_delivery: boolean;
            require_delivery_for_finance: boolean;
        } | null;
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
        cancel_item_confirm: "Are you sure you want to cancel this item?",
        terminate_item_confirm: "WARNING: This will immediately HALT all floor operator operations for this item. Proceed?",
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
        tab_archive: "Archive",
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
        cancel_item_confirm: "Apakah Anda yakin ingin membatalkan item ini?",
        terminate_item_confirm: "PERINGATAN: Ini akan MENGENTIKAN semua operasi lantai produksi untuk item ini. Lanjutkan?",
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
        tab_archive: "Arsip",
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

    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [workflowMode, setWorkflowMode] = useState<'strict' | 'loose' | 'custom'>(() => {
        return tenant?.workflow_settings?.workflow_mode || 'loose';
    });
    const [reqDesign, setReqDesign] = useState<boolean>(() => {
        return tenant?.workflow_settings?.require_design_approved_for_production ?? false;
    });
    const [reqMaterial, setReqMaterial] = useState<boolean>(() => {
        return tenant?.workflow_settings?.require_material_ready_for_production ?? false;
    });
    const [reqProductionForQc, setReqProductionForQc] = useState<boolean>(() => {
        return tenant?.workflow_settings?.require_production_completed_for_qc ?? true;
    });
    const [reqQcForDelivery, setReqQcForDelivery] = useState<boolean>(() => {
        return tenant?.workflow_settings?.require_qc_completed_for_delivery ?? true;
    });
    const [reqDeliveryForFinance, setReqDeliveryForFinance] = useState<boolean>(() => {
        return tenant?.workflow_settings?.require_delivery_for_finance ?? true;
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const saveWorkflowSettings = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingSettings(true);
        router.post('/company/workflow-settings', {
            workflow_mode: workflowMode,
            require_design_approved_for_production: reqDesign,
            require_material_ready_for_production: reqMaterial,
            require_production_completed_for_qc: reqProductionForQc,
            require_qc_completed_for_delivery: reqQcForDelivery,
            require_delivery_for_finance: reqDeliveryForFinance,
        }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setIsSavingSettings(false),
        });
    };

    const handleSearchItemClick = (poId: number, itemId?: number) => {
        const targetPo = pos.find(p => p.id === poId);
        if (!targetPo) return;

        changeTab(targetPo.status === 'COMPLETED' ? 'completed' : 'active');

        setExpandedPOs(prev => {
            const next = new Set(prev);
            next.add(poId);
            return next;
        });

        if (itemId) {
            setExpandedItems(prev => {
                const next = new Set(prev);
                next.add(itemId);
                return next;
            });
        }

        setShowSearchModal(false);

        setTimeout(() => {
            const element = document.getElementById(`po-card-${poId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.style.transition = 'background-color 0.3s ease';
                element.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                setTimeout(() => {
                    element.style.backgroundColor = '';
                }, 1200);
            }
        }, 150);
    };

    const handleSearchAlertClick = (alertId: string) => {
        changeTab('alerts');
        setShowSearchModal(false);

        setTimeout(() => {
            const element = document.getElementById(`alert-card-${alertId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.style.transition = 'background-color 0.3s ease';
                element.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                setTimeout(() => {
                    element.style.backgroundColor = '';
                }, 1200);
            }
        }, 150);
    };

    const getSearchResults = () => {
        if (!searchQuery.trim()) return { pos: [], items: [], clients: [], alerts: [] };

        const query = searchQuery.toLowerCase();
        const matchedPos: any[] = [];
        const matchedItems: any[] = [];
        const matchedClients = new Set<string>();
        const matchedAlerts: any[] = [];

        pos.forEach(po => {
            const poMatch = po.po_number.toLowerCase().includes(query) || 
                            (po.external_po_number && po.external_po_number.toLowerCase().includes(query));
            const clientMatch = po.client_name.toLowerCase().includes(query);

            if (poMatch || clientMatch) {
                matchedPos.push(po);
            }
            if (clientMatch) {
                matchedClients.add(po.client_name);
            }

            po.items.forEach(item => {
                const itemMatch = item.item_name.toLowerCase().includes(query) || 
                                  (item.item_type && item.item_type.toLowerCase().includes(query));
                if (itemMatch || poMatch || clientMatch) {
                    matchedItems.push({ ...item, po_id: po.id, po_number: po.po_number, client_name: po.client_name, po_status: po.status });
                }
            });
        });

        const unifiedIssues = getUnifiedIssuesList();
        unifiedIssues.forEach(issue => {
            const alertMatch = issue.message.toLowerCase().includes(query) || 
                               issue.title.toLowerCase().includes(query);
            if (alertMatch) {
                matchedAlerts.push(issue);
            }
        });

        return {
            pos: matchedPos,
            items: matchedItems,
            clients: Array.from(matchedClients),
            alerts: matchedAlerts
        };
    };

    const [activeTab, setActiveTab] = useState<'alerts' | 'active' | 'completed' | 'matrix' | 'team'>(() => {
        const isOwner = auth_user?.is_owner === true;
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const tabParam = urlParams.get('tab');
            if (tabParam && ['alerts', 'active', 'completed', 'matrix', 'team'].includes(tabParam)) {
                if (tabParam === 'team' && isOwner) return 'alerts';
                return tabParam as any;
            }
            const localSaved = localStorage.getItem('owner_active_tab');
            if (localSaved && ['alerts', 'active', 'completed', 'matrix', 'team'].includes(localSaved)) {
                if (localSaved === 'team' && isOwner) return 'alerts';
                return localSaved as any;
            }
        }
        return 'alerts';
    });

    const changeTab = (tab: 'alerts' | 'active' | 'completed' | 'matrix' | 'team') => {
        const isOwner = auth_user?.is_owner === true;
        if (tab === 'team' && isOwner) return;
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
    const [toastQueue, setToastQueue] = useState<Array<{ message: string; severity: string; id: number; timestamp: number }>>([]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const tenantId = (tenant as any)?.id;
        if (!tenantId) return;

        const channel = echo.private(`tenant.${tenantId}.dashboard`);
        channel.listen('kendala.reported', (e: any) => {
            const alert = e.alert;
            const entry = { message: alert.message || '', severity: alert.severity || 'RED', id: alert.id, timestamp: Date.now() };
            setToastQueue(prev => [...prev, entry]);
            setTimeout(() => {
                setToastQueue(prev => prev.filter(t => t.timestamp !== entry.timestamp));
            }, 8000);
        });
        channel.listen('alert.escalated', (e: any) => {
            const alert = e.alert;
            const entry = { message: alert.message || '', severity: 'ALERT', id: alert.id, timestamp: Date.now() };
            setToastQueue(prev => [...prev, entry]);
            setTimeout(() => {
                setToastQueue(prev => prev.filter(t => t.timestamp !== entry.timestamp));
            }, 12000);
        });
        channel.listen('production.terminated', () => {
            router.reload({ preserveState: true, preserveScroll: true });
        });

        return () => {
            echo.leave(`tenant.${tenantId}.dashboard`);
        };
    }, [(tenant as any)?.id]);

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
            item_id?: number;
            severity: 'RED' | 'YELLOW' | 'BLUE' | 'ORANGE';
            type: 'DELAYED' | 'URGENT' | 'REWORK' | 'TROUBLE' | 'STUCK' | 'PIN_RESET' | 'OTHER';
            title: string;
            message: string;
            created_at?: string;
            escalated_at?: string | null;
            itemName?: string;
            poNumber?: string;
            stage?: string;
            note?: string;
            reason?: string;
            client_name?: string;
            action?: () => void;
        }[] = [];

        const today = new Date();
        const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // 1. Process active POs and items for delayed, close deadline
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
                        item_id: item.id,
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
                        item_id: item.id,
                        severity: 'YELLOW',
                        type: 'URGENT',
                        title: language === 'en' ? 'DEADLINE CLOSE' : 'TENGGAT DEKAT',
                        message: language === 'en'
                            ? `Item "${item.item_name}" for client "${po.client_name}" is approaching deadline (${daysText}).`
                            : `Item "${item.item_name}" untuk klien "${po.client_name}" mendekati tenggat waktu (${daysText}).`,
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
                    created_at: alert.created_at,
                    escalated_at: alert.escalated_at,
                    action: () => router.post(`/pin-reset/${alert.id}/approve`)
                });
            } else {
                const severity: 'RED' | 'YELLOW' | 'ORANGE' = alert.severity === 'RED' ? 'RED' : 'ORANGE';
                const type = alert.severity === 'RED' ? 'TROUBLE' : 'REWORK';
                const title = type === 'TROUBLE' 
                    ? (language === 'en' ? 'PRODUCTION TROUBLE' : 'KENDALA PRODUKSI')
                    : (language === 'en' ? 'QC REWORK ALERT' : 'PERINGATAN REWORK QC');

                // Custom parsed message logic to show exact trouble details
                let cleanMessage = alert.message;
                const itemName = alert.item?.item_name || 'Item';
                const poNumber = alert.item?.po?.po_number || '';
                const poInfo = poNumber ? `(PO: ${poNumber})` : '';

                if (type === 'REWORK') {
                    // Parse QC rework
                    const qtyMatch = alert.message.match(/QC Rework: (\d+)/);
                    const stageMatch = alert.message.match(/stage '([^']*)'/);
                    const qty = qtyMatch ? qtyMatch[1] : '';
                    const stage = stageMatch ? stageMatch[1] : '';
                    
                    if (language === 'id') {
                        cleanMessage = `${itemName} ${poInfo} — Rework QC: ${qty || 1} pcs ditolak di ${stage || 'QC'}`;
                    } else {
                        cleanMessage = `${itemName} ${poInfo} — QC Rework: ${qty || 1} pcs rejected on ${stage || 'QC'}`;
                    }

                    issues.push({
                        id: `alert-db-${alert.id}`,
                        po_id: alert.item?.po_id,
                        item_id: alert.item_id,
                        severity: severity,
                        type: type,
                        title: title,
                        message: cleanMessage,
                        created_at: alert.created_at,
                        escalated_at: alert.escalated_at,
                        itemName: itemName,
                        poNumber: poNumber,
                        stage: stage || 'QC',
                        reason: 'QC Rework',
                        note: qty ? `${qty} pcs` : '',
                        client_name: alert.item?.po?.client_name || '',
                    });
                } else {
                    // Parse Stuck/Trouble
                    const stageMatch = alert.message.match(/stage '([^']*)'/);
                    const noteMatch = alert.message.match(/\(Note: ([^\)]*)\)/);
                    const stage = stageMatch ? stageMatch[1] : '';
                    const note = noteMatch ? noteMatch[1] : '';
                    const reason = alert.reason_type || '';
                    const reasonDetail = note ? `${reason} (${note})` : reason;

                    if (language === 'id') {
                        cleanMessage = `${itemName} ${poInfo} — Terhambat di ${stage || 'Produksi'}: ${reasonDetail || 'Kendala'}`;
                    } else {
                        cleanMessage = `${itemName} ${poInfo} — Stuck on ${stage || 'Production'}: ${reasonDetail || 'Issue'}`;
                    }

                    issues.push({
                        id: `alert-db-${alert.id}`,
                        po_id: alert.item?.po_id,
                        item_id: alert.item_id,
                        severity: severity,
                        type: type,
                        title: title,
                        message: cleanMessage,
                        created_at: alert.created_at,
                        escalated_at: alert.escalated_at,
                        itemName: itemName,
                        poNumber: poNumber,
                        stage: stage || 'Production',
                        reason: reason,
                        note: note,
                        client_name: alert.item?.po?.client_name || '',
                    });
                }
            }
        });

        return issues;
    };
    const [expandedPOs, setExpandedPOs] = useState<Set<number>>(new Set());
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
    const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());

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

    const toggleItemSelection = (itemId: number) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    const toggleSelectAll = (items: Item[]) => {
        if (selectedItemIds.size === items.length) {
            setSelectedItemIds(new Set());
        } else {
            setSelectedItemIds(new Set(items.map(i => i.id)));
        }
    };

    const filteredPos = (() => {
        const basePos = pos.filter(po => {
            if (activeTab === 'active') return po.status !== 'COMPLETED' && po.status !== 'DELIVERED' && po.status !== 'CLOSED';
            if (activeTab === 'completed') return po.status === 'COMPLETED' || po.status === 'DELIVERED' || po.status === 'CLOSED';
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
                    case 'delayed': {
                        if (item.status === 'COMPLETED') return false;
                        const { diffDays } = calculateDeadlineDiff(po.global_deadline);
                        return diffDays < 0;
                    }
                    case 'ontime': {
                        if (item.status === 'COMPLETED') return true;
                        const { diffDays } = calculateDeadlineDiff(po.global_deadline);
                        return diffDays >= 0;
                    }
                    case 'close_due': {
                        if (item.status === 'COMPLETED') return false;
                        const { diffDays } = calculateDeadlineDiff(po.global_deadline);
                        return diffDays >= 0 && diffDays <= 3;
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

    useEffect(() => {
        if (activePoFilter !== 'all') {
            const matchingPoIds = filteredPos.map(po => po.id);
            setExpandedPOs(prev => {
                const next = new Set(prev);
                matchingPoIds.forEach(id => next.add(id));
                return next;
            });
        }
    }, [activePoFilter]);


    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
    const confirmAlert = useImperativeAlertDialog();

    // Add Admin modal
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [adminName, setAdminName] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminRoleId, setAdminRoleId] = useState<number | undefined>(undefined);
    const [adminPostId, setAdminPostId] = useState<number | undefined>(undefined);
    const [adminSubmitting, setAdminSubmitting] = useState(false);

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
        if (!editingUser || editSubmitting) return;
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
            onSuccess: () => {
                closeEditUser();
                setEditSubmitting(false);
            },
            onError: () => setEditSubmitting(false),
        });
    };

    const handleDeleteUser = (user: User) => {
        confirmAlert.show({
            title: language === 'en' ? 'Delete User' : 'Hapus Pengguna',
            description: t.delete_user_confirm,
            actionLabel: t.delete_user,
            onAction: () => {
                router.post(`/users/${user.id}/delete`, {}, {
                    onSuccess: () => { closeEditUser(); confirmAlert.hide(); },
                    onError: () => confirmAlert.hide(),
                });
            },
            cancelLabel: t.cancel,
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
        if (adminSubmitting) return;
        setAdminSubmitting(true);
        router.post('/users', {
            name: adminName,
            role_id: adminRoleId,
            post_id: adminPostId,
            login_method: 'PASSWORD',
            username: adminUsername,
            password: adminPassword,
        }, {
            onSuccess: () => {
                setShowAddAdminModal(false);
                setAdminSubmitting(false);
            },
            onError: () => setAdminSubmitting(false),
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

    const [addUserSubmitting, setAddUserSubmitting] = useState(false);

    const submitAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (addUserSubmitting) return;
        setAddUserSubmitting(true);
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
                setAddUserSubmitting(false);
            },
            onError: () => setAddUserSubmitting(false),
        });
    };

    // No client/PO creation state â€” moved to dedicated page at /pos/create

    const handleCancel = (itemId: number) => {
        confirmAlert.show({
            title: language === 'en' ? 'Cancel Item' : 'Batalkan Item',
            description: t.cancel_item_confirm,
            actionLabel: language === 'en' ? 'Cancel' : 'Batalkan',
            onAction: () => {
                router.post(`/items/${itemId}/cancel`);
                confirmAlert.hide();
            },
            cancelLabel: t.cancel,
        });
    };

    const handleTerminate = (itemId: number) => {
        confirmAlert.show({
            title: language === 'en' ? 'Terminate Production' : 'Hentikan Produksi',
            description: t.terminate_item_confirm,
            actionLabel: language === 'en' ? 'Terminate' : 'Hentikan',
            actionVariant: 'destructive',
            onAction: () => {
                router.post(`/items/${itemId}/terminate`);
                confirmAlert.hide();
            },
            cancelLabel: t.cancel,
        });
    };

    const isOwner = auth_user?.is_owner === true;
    const canBroadcastPo = auth_user?.is_owner !== true;

    if (isPresentationMode && telemetry) {
        return (
            <PresentationMode
                telemetry={telemetry}
                selected_range={selected_range}
                language={language}
                t={t}
                currentTime={currentTime}
                presentationSlide={presentationSlide}
                presentationAutoPlay={presentationAutoPlay}
                togglePresentationMode={togglePresentationMode}
                setPresentationSlide={setPresentationSlide}
                setPresentationAutoPlay={setPresentationAutoPlay}
                changeTab={changeTab}
            />
        );
    }

    return (
        <div className="dashboard-root" style={{
            backgroundColor: '#09090b',
            fontFamily: 'Inter, sans-serif',
            color: '#fafafa',
        }}>
            {toastQueue.length > 0 && (
                <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {toastQueue.map(t => (
                        <div key={t.timestamp} onClick={() => setToastQueue(prev => prev.filter(x => x.timestamp !== t.timestamp))}
                            style={{
                                backgroundColor: t.severity === 'RED' ? 'rgba(239, 68, 68, 0.95)' : t.severity === 'ALERT' ? 'rgba(251, 191, 36, 0.95)' : 'rgba(251, 191, 36, 0.95)',
                                color: '#fff', padding: '12px 20px', borderRadius: '10px',
                                fontSize: '13px', fontWeight: 600, maxWidth: '360px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                animation: 'slideIn 0.3s ease-out', cursor: 'pointer',
                            }}>
                            <span style={{ fontSize: '18px' }}>{t.severity === 'RED' ? '🚨' : t.severity === 'ALERT' ? '🔴' : '⚠️'}</span>
                            <div>
                                <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                                    {t.severity === 'RED'
                                        ? (language === 'en' ? 'Kendala Reported' : 'Kendala Dilaporkan')
                                        : t.severity === 'ALERT'
                                        ? (language === 'en' ? 'Alert Escalated' : 'Peringatan Dinaikkan')
                                        : (language === 'en' ? 'QC Rework' : 'Rework QC')}
                                </div>
                                <div style={{ opacity: 0.9, fontSize: '12px' }}>{t.message}</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setToastQueue(prev => prev.filter(x => x.timestamp !== t.timestamp)); }}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px', opacity: 0.7 }}>
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
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
                    {/* Search Modal Button */}
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setShowSearchModal(true);
                        }}
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
                        }}
                        title={language === 'en' ? 'Search POs, Items, Clients...' : 'Cari PO, Barang, Klien...'}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                            e.currentTarget.style.color = '#818cf8';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.color = '#a1a1aa';
                        }}
                    >
                        <Search size={16} />
                    </button>
                    {/* Profile - visible to all roles */}
                    <Link
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
                    </Link>

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
                {!isOwner && (
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
                )}
                <Link
                    href={`/c/${tenant?.slug || ''}/archive`}
                    className="tab"
                    style={{ textDecoration: 'none' }}
                >
                    <span className="tab-label-full">{t.tab_archive}</span>
                    <span className="tab-label-short">{t.tab_archive}</span>
                </Link>
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
                                    const isEscalated = !!issue.escalated_at;
                                    const bgColor = issue.severity === 'RED' ? 'rgba(239, 68, 68, 0.08)' 
                                        : issue.severity === 'BLUE' ? 'rgba(59, 130, 246, 0.08)' 
                                        : issue.severity === 'ORANGE' ? 'rgba(249, 115, 22, 0.08)'
                                        : 'rgba(234, 179, 8, 0.08)';
                                    const bdColor = issue.severity === 'RED' 
                                        ? (isEscalated ? '#ef4444' : 'rgba(239, 68, 68, 0.2)')
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
                                            id={`alert-card-${issue.id}`}
                                            onClick={() => {
                                                if (issue.po_id) {
                                                    changeTab('active');
                                                    setExpandedPOs(prev => {
                                                        const next = new Set(prev);
                                                        next.add(issue.po_id);
                                                        return next;
                                                    });
                                                    if (issue.item_id) {
                                                        setExpandedItems(prev => {
                                                            const next = new Set(prev);
                                                            next.add(issue.item_id);
                                                            return next;
                                                        });
                                                        setTimeout(() => {
                                                            const el = document.getElementById(`item-card-${issue.item_id}`);
                                                            if (el) {
                                                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            }
                                                        }, 120);
                                                    }
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
                                            <div style={{ flex: 1, minWidth: '200px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                                                        {isEscalated && (
                                                            <span className="badge" style={{
                                                                color: '#000',
                                                                backgroundColor: '#fbbf24',
                                                                fontSize: '10px',
                                                                fontWeight: 800,
                                                                padding: '3px 8px',
                                                                borderRadius: '4px',
                                                                whiteSpace: 'nowrap',
                                                                animation: 'pulse 1.5s ease-in-out infinite',
                                                            }}>
                                                                ESCALATED
                                                            </span>
                                                        )}
                                                        {issue.poNumber && (
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fafafa' }}>
                                                                {issue.poNumber} {issue.client_name ? `(${issue.client_name})` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {issue.created_at && (
                                                        <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 500 }}>
                                                            {formatAlertTime(issue.created_at, language)}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {issue.itemName ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ fontSize: '14px', color: '#e4e4e7', fontWeight: 600 }}>
                                                            {issue.itemName} &middot; <span style={{ color: '#fb923c', fontWeight: 700 }}>Stage: {issue.stage}</span>
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: '#a1a1aa' }}>
                                                            <strong style={{ color: '#f87171' }}>
                                                                {language === 'id' ? 'Penyebab: ' : 'Why: '}
                                                            </strong>
                                                            {issue.reason ? formatReasonType(issue.reason, language) : ''}
                                                            {issue.note ? ` (${issue.note})` : ''}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '14px', color: '#e4e4e7' }}>
                                                        {issue.message}
                                                    </div>
                                                )}
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
                                    <div key={po.id} id={`po-card-${po.id}`} className="po-accordion">
                                        <button className="po-accordion-header" onClick={() => togglePO(po.id)}>
                                            <ChevronDown size={16} expanded={isExpanded} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '16px', fontWeight: 800 }}>{po.po_number}</span>
                                                    <StatusBadge status={po.status} />
                                                    {po.is_urgent && <StatusBadge status="URGENT" />}
                                                    {(() => {
                                                        const poItemIds = po.items.map(i => i.id);
                                                        const poAlerts = alerts.filter(a => poItemIds.includes(a.item_id) && !a.is_resolved);
                                                        const hasRework = poAlerts.some(a => a.severity === 'YELLOW');
                                                        return <WarningPill deadlineDateStr={po.global_deadline} reworkMessage={hasRework} lang={language} />;
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
                                                    <>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px' }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9ca3af', cursor: 'pointer', userSelect: 'none' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedItemIds.size === po.items.length}
                                                                    onChange={() => toggleSelectAll(po.items)}
                                                                    className="mr-1 accent-indigo-500"
                                                                />
                                                                Select All
                                                            </label>
                                                        </div>
                                                        {po.items.map((item) => {
                                                        const progress = parseFloat(item.progress_percent);
                                                        const hasProgress = progress > 0;
                                                        const isCancelled = item.status === 'CANCELLED';
                                                        const isTerminated = item.status === 'TERMINATED';
                                                        const itemExpanded = expandedItems.has(item.id);

                                                        return (
                                                            <div key={item.id} id={`item-card-${item.id}`} className="item-compact" style={{
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
                                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedItemIds.has(item.id)}
                                                                    onChange={() => toggleItemSelection(item.id)}
                                                                    style={{ marginTop: '14px' }}
                                                                    className="accent-indigo-500"
                                                                />
                                                                <button className="item-compact-summary" onClick={() => toggleItem(item.id)} style={{ flex: 1 }}>
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
                                                                        {item.delivery_status && (
                                                                            <span className="badge" style={{
                                                                                backgroundColor: item.delivery_status === 'DELIVERED' ? 'rgba(16, 185, 129, 0.15)' :
                                                                                    item.delivery_status === 'PARTIAL' ? 'rgba(234, 179, 8, 0.15)' :
                                                                                    'rgba(59, 130, 246, 0.1)',
                                                                                color: item.delivery_status === 'DELIVERED' ? '#34d399' :
                                                                                    item.delivery_status === 'PARTIAL' ? '#fbbf24' :
                                                                                    '#3b82f6',
                                                                            }}>
                                                                                {item.delivery_status === 'DELIVERED'
                                                                                    ? (language === 'id' ? 'Terkirim' : 'Delivered')
                                                                                    : item.delivery_status === 'PARTIAL'
                                                                                    ? (language === 'id' ? `Terkirim Sebagian (${item.delivered_qty}/${item.target_qty})` : `Partially Delivered (${item.delivered_qty}/${item.target_qty})`)
                                                                                    : (language === 'id' ? 'Belum Dikirim' : 'Pending Delivery')}
                                                                            </span>
                                                                        )}
                                                                        {item.invoice_status && (
                                                                            <span className="badge" style={{
                                                                                backgroundColor: item.invoice_status === 'INVOICED' ? 'rgba(16, 185, 129, 0.15)' :
                                                                                    item.invoice_status === 'PARTIAL' ? 'rgba(168, 85, 247, 0.15)' :
                                                                                    'rgba(255, 255, 255, 0.04)',
                                                                                color: item.invoice_status === 'INVOICED' ? '#34d399' :
                                                                                    item.invoice_status === 'PARTIAL' ? '#c084fc' :
                                                                                    '#a1a1aa',
                                                                            }}>
                                                                                {item.invoice_status === 'INVOICED'
                                                                                    ? (language === 'id' ? 'Difakturkan' : 'Invoiced')
                                                                                    : item.invoice_status === 'PARTIAL'
                                                                                    ? (language === 'id' ? `Faktur Sebagian (${item.invoiced_qty}/${item.target_qty})` : `Partially Invoiced (${item.invoiced_qty}/${item.target_qty})`)
                                                                                    : (language === 'id' ? 'Belum Difakturkan' : 'Uninvoiced')}
                                                                            </span>
                                                                        )}
                                                                        {item.payment_status && (
                                                                            <span className="badge" style={{
                                                                                backgroundColor: item.payment_status === 'PAID' ? 'rgba(16, 185, 129, 0.15)' :
                                                                                    item.payment_status === 'PARTIAL_PAID' ? 'rgba(99, 102, 241, 0.15)' :
                                                                                    'rgba(255, 255, 255, 0.04)',
                                                                                color: item.payment_status === 'PAID' ? '#34d399' :
                                                                                    item.payment_status === 'PARTIAL_PAID' ? '#818cf8' :
                                                                                    '#a1a1aa',
                                                                            }}>
                                                                                {item.payment_status === 'PAID'
                                                                                    ? (language === 'id' ? 'Lunas' : 'Paid')
                                                                                    : item.payment_status === 'PARTIAL_PAID'
                                                                                    ? (language === 'id' ? 'Bayar Sebagian' : 'Partial Paid')
                                                                                    : (language === 'id' ? 'Belum Bayar' : 'Unpaid')}
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
                                                                                    case 'DELIVERED': return language === 'id' ? 'Terkirim' : 'Delivered';
                                                                                    case 'CLOSED': return language === 'id' ? 'Selesai & Lunas' : 'Closed';
                                                                                    default: return item.status;
                                                                                }
                                                                            })()}
                                                                        </span>
                                                                            {(() => {
                                                                                const itemAlerts = alerts.filter(a => a.item_id === item.id && !a.is_resolved);
                                                                                const reworkAlert = itemAlerts.find(a => a.severity === 'YELLOW');
                                                                                const reworkVal = reworkAlert ? (reworkAlert.message ? `Rework: ${reworkAlert.message}` : 'Rework') : null;
                                                                                return <WarningPill deadlineDateStr={po.global_deadline} reworkMessage={reworkVal} lang={language} />;
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
                                                                        {(() => {
                                                                                     const deadline = new Date(po.global_deadline);
                                                                                     const deadlineClean = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
                                                                                     const today = new Date();
                                                                                     const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                                                                     const diffTime = deadlineClean.getTime() - todayClean.getTime();
                                                                                     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                                                     
                                                                                     let color = '#34d399'; // Normal: Green
                                                                                     let label = language === 'id' ? 'Aman' : 'On Track';
                                                                                     if (diffDays < 0) {
                                                                                         color = '#ef4444'; // Delayed: Red
                                                                                         label = language === 'id' ? 'Terlambat' : 'Delayed';
                                                                                     } else if (diffDays <= 3) {
                                                                                         color = '#fbbf24'; // Close: Yellow
                                                                                         label = language === 'id' ? 'Mendekati Tenggat' : 'Closing In';
                                                                                     }
                                                                                     
                                                                                     return (
                                                                                         <div style={{ 
                                                                                             fontSize: '15px', 
                                                                                             fontWeight: 800, 
                                                                                             color: '#fafafa',
                                                                                             marginTop: '2px',
                                                                                             marginBottom: '4px',
                                                                                             display: 'flex',
                                                                                             alignItems: 'center',
                                                                                             gap: '6px',
                                                                                             flexWrap: 'wrap'
                                                                                         }}>
                                                                                             <span style={{ color: '#a1a1aa', fontWeight: 'normal', fontSize: '13px' }}>Deadline:</span>
                                                                                             <span style={{ color }}>{formatDeadline(po.global_deadline, language)}</span>
                                                                                             <span style={{ 
                                                                                                 fontSize: '9px', 
                                                                                                 padding: '2px 6px', 
                                                                                                 borderRadius: '4px', 
                                                                                                 backgroundColor: `${color}1a`, // ~10% opacity
                                                                                                 color, 
                                                                                                 border: `1px solid ${color}33`,
                                                                                                 fontWeight: 800,
                                                                                                 textTransform: 'uppercase',
                                                                                                 letterSpacing: '0.05em'
                                                                                             }}>
                                                                                                 {label}
                                                                                             </span>
                                                                                         </div>
                                                                                     );
                                                                                 })()}
                                                                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#a5b4fc' }}>
                                                                                    Qty: {item.target_qty} pcs {item.delivered_qty > 0 ? `| Delivered: ${item.delivered_qty} pcs` : ''}
                                                                                </div>
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
                                                                                                        progressText = language === 'id' ? 'Approved' : 'Approved';
                                                                                                    } else if (pct > 0) {
                                                                                                        progressText = language === 'id' ? 'Digambar' : 'Drawing';
                                                                                                    } else {
                                                                                                        progressText = 'Pending';
                                                                                                    }
                                                                                                } else if (isMaterial) {
                                                                                                    const pct = parseFloat(stage.progress_percent);
                                                                                                    if (stage.status === 'COMPLETED' || pct >= 100) {
                                                                                                        progressText = language === 'id' ? 'Ready' : 'Ready';
                                                                                                    } else if (pct >= 60) {
                                                                                                        progressText = language === 'id' ? 'Terkirim' : 'Process';
                                                                                                    } else if (pct >= 30) {
                                                                                                        progressText = language === 'id' ? 'Dipesan' : 'Ordered';
                                                                                                    } else {
                                                                                                        progressText = 'Pending';
                                                                                                    }
                                                                                                } else {
                                                                                                    progressText = item.target_qty > 1
                                                                                                        ? `${stage.completed_qty}/${item.target_qty} pcs`
                                                                                                        : (stage.completed_qty > 0 ? `${stage.completed_qty} pcs` : `${parseFloat(stage.progress_percent).toFixed(0)}%`);
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
                                                        (item.po_status === 'COMPLETED' || item.po_status === 'DELIVERED' || item.po_status === 'CLOSED') && item.invoice_status !== 'INVOICED'
                                                    );
                                                    break;
                                                case 'finance_unpaid':
                                                    items = allItems.filter((item: any) =>
                                                        (item.po_status === 'COMPLETED' || item.po_status === 'DELIVERED' || item.po_status === 'CLOSED') && item.payment_status !== 'PAID' && item.invoice_status !== 'UNINVOICED'
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
                                                        item.client_name?.toLowerCase() === value.toLowerCase() && item.po_status === 'COMPLETED' && item.invoice_status !== 'INVOICED'
                                                    );
                                                    break;
                                                case 'client_unpaid':
                                                    items = allItems.filter((item: any) =>
                                                        item.client_name?.toLowerCase() === value.toLowerCase() && item.po_status === 'COMPLETED' && item.payment_status !== 'PAID' && item.invoice_status !== 'UNINVOICED'
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
                                        <>
                                            <div className="directory-table-container">
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
                                                                        
                                                                        if (item.po_status === 'COMPLETED' || item.po_status === 'DELIVERED' || item.po_status === 'CLOSED') {
                                                                            if (item.invoice_status === 'UNINVOICED') {
                                                                                displayStatus = language === 'id' ? 'Belum Difakturkan' : 'Finance: Uninvoiced';
                                                                                statusColor = '#fbbf24';
                                                                                statusBg = 'rgba(234,179,8,0.1)';
                                                                            } else if (item.invoice_status === 'PARTIAL') {
                                                                                displayStatus = (language === 'id' ? 'Faktur Sebagian' : 'Finance: Partial Invoice') + ` (${item.invoiced_qty}/${item.target_qty})`;
                                                                                statusColor = '#a855f7';
                                                                                statusBg = 'rgba(168,85,247,0.1)';
                                                                            } else if (item.payment_status === 'UNPAID') {
                                                                                displayStatus = language === 'id' ? 'Belum Dibayar' : 'Finance: Unpaid';
                                                                                statusColor = '#fb923c';
                                                                                statusBg = 'rgba(249,115,22,0.1)';
                                                                            } else if (item.payment_status === 'PARTIAL_PAID') {
                                                                                displayStatus = language === 'id' ? 'Dibayar Sebagian' : 'Finance: Partial Paid';
                                                                                statusColor = '#6366f1';
                                                                                statusBg = 'rgba(99,102,241,0.1)';
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
                                                                                            if (item.po_id) {
                                                                                                changeTab('active');
                                                                                                setExpandedPOs(prev => {
                                                                                                    const next = new Set(prev);
                                                                                                    next.add(item.po_id);
                                                                                                    return next;
                                                                                                });
                                                                                                if (item.id) {
                                                                                                    setExpandedItems(prev => {
                                                                                                        const next = new Set(prev);
                                                                                                        next.add(item.id);
                                                                                                        return next;
                                                                                                    });
                                                                                                    setTimeout(() => {
                                                                                                        const el = document.getElementById(`item-card-${item.id}`);
                                                                                                        if (el) {
                                                                                                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                                                        }
                                                                                                    }, 120);
                                                                                                }
                                                                                            }
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
                                            </div>

                                            <div className="directory-mobile-list">
                                                {Object.keys(groupedByClient).map((cName) => {
                                                    const clientItems = groupedByClient[cName];
                                                    return (
                                                        <div key={`mobile-group-${cName}`} style={{ marginBottom: '12px' }}>
                                                            <div style={{
                                                                backgroundColor: 'rgba(59,130,246,0.04)',
                                                                border: '1px solid rgba(255,255,255,0.06)',
                                                                borderRadius: '8px',
                                                                padding: '8px 12px',
                                                                fontWeight: 700,
                                                                color: '#818cf8',
                                                                fontSize: '11px',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.05em',
                                                                marginBottom: '6px',
                                                            }}>
                                                                🏢 CLIENT: {cName} ({clientItems.length} item{clientItems.length > 1 ? 's' : ''})
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                {clientItems.map((item: any, idx: number) => {
                                                                    const progress = parseFloat(item.progress_percent);
                                                                    
                                                                    // Determine status badge
                                                                    let displayStatus = item.current_stage || '-';
                                                                    let statusColor = '#a1a1aa';
                                                                    let statusBg = 'rgba(255,255,255,0.03)';
                                                                    
                                                                     if (item.po_status === 'COMPLETED' || item.po_status === 'DELIVERED' || item.po_status === 'CLOSED') {
                                                                         if (item.invoice_status === 'UNINVOICED') {
                                                                             displayStatus = language === 'id' ? 'Belum Difakturkan' : 'Finance: Uninvoiced';
                                                                             statusColor = '#fbbf24';
                                                                             statusBg = 'rgba(234,179,8,0.1)';
                                                                         } else if (item.invoice_status === 'PARTIAL') {
                                                                             displayStatus = (language === 'id' ? 'Faktur Sebagian' : 'Finance: Partial Invoice') + ` (${item.invoiced_qty}/${item.target_qty})`;
                                                                             statusColor = '#a855f7';
                                                                             statusBg = 'rgba(168,85,247,0.1)';
                                                                         } else if (item.payment_status === 'UNPAID') {
                                                                             displayStatus = language === 'id' ? 'Belum Dibayar' : 'Finance: Unpaid';
                                                                             statusColor = '#fb923c';
                                                                             statusBg = 'rgba(249,115,22,0.1)';
                                                                         } else if (item.payment_status === 'PARTIAL_PAID') {
                                                                             displayStatus = language === 'id' ? 'Dibayar Sebagian' : 'Finance: Partial Paid';
                                                                             statusColor = '#6366f1';
                                                                             statusBg = 'rgba(99,102,241,0.1)';
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
                                                                        <div key={`mobile-item-${cName}-${idx}`} style={{
                                                                            backgroundColor: '#18181b',
                                                                            border: '1px solid rgba(255,255,255,0.06)',
                                                                            borderRadius: '10px',
                                                                            padding: '10px',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            gap: '6px',
                                                                        }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
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
                                                                                        fontSize: '12px',
                                                                                    }}
                                                                                >
                                                                                    {item.po_number}
                                                                                </button>
                                                                                <span style={{ fontWeight: 700, color: '#fafafa', fontSize: '12px' }}>{item.item_name}</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                    <span className="badge" style={{
                                                                                        backgroundColor: progress >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                                                        color: progress >= 100 ? '#34d399' : '#3b82f6',
                                                                                        fontSize: '10px',
                                                                                        padding: '2px 6px',
                                                                                    }}>
                                                                                        {progress.toFixed(0)}%
                                                                                    </span>
                                                                                    {item.target_qty !== undefined && (
                                                                                        <span style={{ fontSize: '10px', color: '#71717a' }}>
                                                                                            ({item.total_delivered_qty || 0} / {item.target_qty} pcs)
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <span className="badge" style={{
                                                                                    backgroundColor: statusBg,
                                                                                    color: statusColor,
                                                                                    fontWeight: 600,
                                                                                    fontSize: '10px',
                                                                                    padding: '2px 6px',
                                                                                }}>
                                                                                    {displayStatus}
                                                                                </span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#a1a1aa', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '4px' }}>
                                                                                <span>{t.deadline_label}: {item.global_deadline}</span>
                                                                                {item.days_overdue > 0 ? (
                                                                                    <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '9px', padding: '1px 4px' }}>
                                                                                        {item.days_overdue} {t.days_suffix}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span style={{ color: '#71717a' }}>-</span>
                                                                                )}
                                                                            </div>
                                                                            {item.reason && (
                                                                                <div style={{ fontSize: '10px', color: '#ef4444', fontStyle: 'italic', marginTop: '2px' }}>
                                                                                    {item.reason}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
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
                                <div className="bottleneck-table-container">
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

                                <div className="bottleneck-mobile-list">
                                    {telemetry.stage_metrics && telemetry.stage_metrics.map((metric: any, idx: number) => {
                                        const isSelected = matrixFilter?.type === 'stage' && matrixFilter?.value === metric.stage;
                                        return (
                                            <div
                                                key={`stage-mobile-${idx}`}
                                                onClick={() => setMatrixFilter(prev =>
                                                    prev?.type === 'stage' && prev?.value === metric.stage
                                                        ? null
                                                        : { type: 'stage', value: metric.stage, label: language === 'id' ? 'Tahap' : 'Stage' }
                                                )}
                                                style={{
                                                    backgroundColor: isSelected ? 'rgba(37,99,235,0.1)' : '#18181b',
                                                    border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.06)',
                                                    borderRadius: '10px',
                                                    padding: '12px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '13px', color: isSelected ? '#3b82f6' : '#fafafa' }}>
                                                        {metric.stage.toUpperCase()}
                                                    </span>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6' }}>
                                                        {metric.avg_cycle_time.toFixed(2)} {language === 'id' ? 'Hari' : 'Days'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: '#a1a1aa' }}>
                                                    <span>{t.active_items}: <strong>{metric.active_items}</strong></span>
                                                    <span>•</span>
                                                    <span>
                                                        {t.stuck_incidents}: {metric.stuck_count > 0 ? (
                                                            <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '10px', padding: '1px 5px' }}>
                                                                {metric.stuck_count} stuck
                                                            </span>
                                                        ) : '0'}
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        {t.rework_count}: {metric.rework_count > 0 ? (
                                                            <span className="badge" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#fbbf24', fontSize: '10px', padding: '1px 5px' }}>
                                                                {metric.rework_count} rework
                                                            </span>
                                                        ) : '0'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
                                    <div className="client-table-container">
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
                                                                    : <span style={{ color: '#71717a' }}>-</span>}
                                                            </td>
                                                            <td
                                                                onClick={() => client.uninvoiced_count > 0 && setMatrixFilter({ type: 'client_uninvoiced', value: client.client_name, label: language === 'id' ? 'Belum Difakturkan Klien' : 'Client Uninvoiced' })}
                                                                style={{ padding: '11px 16px', textAlign: 'center', cursor: client.uninvoiced_count > 0 ? 'pointer' : 'default' }}
                                                            >
                                                                {client.uninvoiced_count > 0
                                                                    ? <span className="badge" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#fbbf24' }}>{client.uninvoiced_count}</span>
                                                                    : <span style={{ color: '#71717a' }}>-</span>}
                                                            </td>
                                                            <td
                                                                onClick={() => client.unpaid_count > 0 && setMatrixFilter({ type: 'client_unpaid', value: client.client_name, label: language === 'id' ? 'Belum Dibayar Klien' : 'Client Unpaid' })}
                                                                style={{ padding: '11px 16px', textAlign: 'center', cursor: client.unpaid_count > 0 ? 'pointer' : 'default' }}
                                                            >
                                                                {client.unpaid_count > 0
                                                                    ? <span className="badge" style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>{client.unpaid_count}</span>
                                                                    : <span style={{ color: '#71717a' }}>-</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="client-mobile-list">
                                        {telemetry.client_health.map((client: any, idx: number) => {
                                            const otdrColor = client.on_time_rate == null
                                                ? '#71717a'
                                                : client.on_time_rate >= 80 ? '#34d399'
                                                : client.on_time_rate >= 60 ? '#fbbf24'
                                                : '#ef4444';
                                            return (
                                                <div
                                                    key={`client-mobile-${idx}`}
                                                    style={{
                                                        backgroundColor: '#18181b',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        borderRadius: '12px',
                                                        padding: '12px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '8px',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span
                                                            onClick={() => setMatrixFilter({ type: 'client', value: client.client_name, label: language === 'id' ? 'Klien' : 'Client' })}
                                                            style={{ fontWeight: 800, fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', color: '#818cf8' }}
                                                        >
                                                            {client.client_name}
                                                        </span>
                                                        <span style={{ fontSize: '12px', fontWeight: 700, color: otdrColor }}>
                                                            {client.on_time_rate != null ? `${client.on_time_rate}% OTD` : 'N/A OTD'}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                                                        {language === 'id' ? 'PO Aktif' : 'Active POs'}: <strong>{client.active_pos}</strong>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        borderTop: '1px solid rgba(255,255,255,0.04)',
                                                        paddingTop: '8px',
                                                        fontSize: '11px',
                                                    }}>
                                                        <div
                                                            onClick={() => client.overdue_items > 0 && setMatrixFilter({ type: 'client_overdue', value: client.client_name, label: language === 'id' ? 'Overdue Klien' : 'Client Overdue' })}
                                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flex: 1, cursor: client.overdue_items > 0 ? 'pointer' : 'default' }}
                                                        >
                                                            <span style={{ color: '#71717a', fontSize: '10px' }}>{language === 'id' ? 'Terlambat' : 'Overdue'}</span>
                                                            {client.overdue_items > 0 ? (
                                                                <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 6px' }}>{client.overdue_items}</span>
                                                            ) : (
                                                                <span style={{ color: '#71717a' }}>-</span>
                                                            )}
                                                        </div>
                                                        <div
                                                            onClick={() => client.uninvoiced_count > 0 && setMatrixFilter({ type: 'client_uninvoiced', value: client.client_name, label: language === 'id' ? 'Belum Difakturkan Klien' : 'Client Uninvoiced' })}
                                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flex: 1, cursor: client.uninvoiced_count > 0 ? 'pointer' : 'default' }}
                                                        >
                                                            <span style={{ color: '#71717a', fontSize: '10px' }}>{language === 'id' ? 'Faktur' : 'Invoice'}</span>
                                                            {client.uninvoiced_count > 0 ? (
                                                                <span className="badge" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#fbbf24', padding: '2px 6px' }}>{client.uninvoiced_count}</span>
                                                            ) : (
                                                                <span style={{ color: '#71717a' }}>-</span>
                                                            )}
                                                        </div>
                                                        <div
                                                            onClick={() => client.unpaid_count > 0 && setMatrixFilter({ type: 'client_unpaid', value: client.client_name, label: language === 'id' ? 'Belum Dibayar Klien' : 'Client Unpaid' })}
                                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flex: 1, cursor: client.unpaid_count > 0 ? 'pointer' : 'default' }}
                                                        >
                                                            <span style={{ color: '#71717a', fontSize: '10px' }}>{language === 'id' ? 'Bayar' : 'Paid'}</span>
                                                            {client.unpaid_count > 0 ? (
                                                                <span className="badge" style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#fb923c', padding: '2px 6px' }}>{client.unpaid_count}</span>
                                                            ) : (
                                                                <span style={{ color: '#71717a' }}>-</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}



                    </div>
                );
            })()}


            </div>

            {/* ── Team / User Management Tab ─────────────────────────────── */}
            {activeTab === 'team' && !isOwner && (() => {
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
                    FINANCE:      { bg: 'rgba(236,72,153,0.12)',   color: '#ec4899' },
                };

                return (
                <div>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 2px 0' }}>{t.team_title}</h2>
                                <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>{t.team_subtitle}</p>
                            </div>
                            <button
                                onClick={openAddUser}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    backgroundColor: 'rgba(16,185,129,0.1)',
                                    color: '#34d399',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    flexShrink: 0,
                                }}
                            >
                                <Plus size={14} /> {t.add_user}
                            </button>
                        </div>

                        {/* Role Filters: Dropdown for Mobile, Pills for Desktop (Rule: No side scrolling on mobile) */}
                        <div style={{ marginBottom: '16px' }}>
                            {/* Mobile Dropdown View */}
                            <div className="show-mobile-only">
                                <label style={{ display: 'block', fontSize: '11px', color: '#71717a', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>
                                    {language === 'en' ? 'Filter by Role' : 'Saring berdasarkan Role'}
                                </label>
                                <select
                                    value={userRoleFilter}
                                    onChange={e => setUserRoleFilter(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fafafa',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        outline: 'none',
                                    }}
                                >
                                    <option value="ALL">{t.filter_all_roles}</option>
                                    {ALL_ROLES.map(role => (
                                        users.some(u => u.role_name === role) ? (
                                            <option key={role} value={role}>{role}</option>
                                        ) : null
                                    ))}
                                </select>
                            </div>

                            {/* Desktop Pills View */}
                            <div className="hide-mobile-only" style={{ gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <button
                                    onClick={() => setUserRoleFilter('ALL')}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid',
                                        borderColor: userRoleFilter === 'ALL' ? '#6366f1' : 'rgba(255,255,255,0.08)',
                                        backgroundColor: userRoleFilter === 'ALL' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.05)',
                                        color: userRoleFilter === 'ALL' ? '#818cf8' : '#a1a1aa',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        flexShrink: 0,
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
                                                padding: '6px 14px',
                                                borderRadius: '9999px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                border: '1px solid',
                                                borderColor: userRoleFilter === role
                                                    ? (roleColorMap[role]?.color || '#71717a')
                                                    : 'rgba(255,255,255,0.08)',
                                                backgroundColor: userRoleFilter === role
                                                    ? (roleColorMap[role]?.bg || 'rgba(255,255,255,0.06)')
                                                    : 'rgba(255,255,255,0.05)',
                                                color: userRoleFilter === role
                                                    ? (roleColorMap[role]?.color || '#71717a')
                                                    : '#a1a1aa',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                flexShrink: 0,
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
                                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                gap: '12px',
                            }}>
                                    {filteredUsers.map(user => {
                                        const isSelf = user.id === auth_user?.id;
                                        const loginMethod = user.username ? 'PASSWORD' : 'PIN';
                                        const roleStyle = roleColorMap[user.role_name] || { bg: 'rgba(100,116,139,0.12)', color: '#71717a' };
                                        return (
                                            <div
                                                key={user.id}
                                                className="user-card"
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
                                                        {localizedDisplay({ display_name: user.role_display_name, display_name_id: user.role_display_name_id }, language)}
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

                        {/* ── Workflow & Validation Settings ────────────────────── */}
                        <div style={{
                            marginTop: '32px',
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '16px',
                            padding: '24px',
                        }}>
                            <div style={{ marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fafafa', margin: '0 0 4px 0' }}>
                                    {language === 'en' ? 'Workflow & Validation Rules' : 'Aturan Alur Kerja & Validasi'}
                                </h3>
                                <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>
                                    {language === 'en' 
                                        ? 'Define rules and locks between design, material purchasing, production, QC, and delivery stages.' 
                                        : 'Tentukan aturan dan kuncian antara tahap desain, pembelian bahan, produksi, QC, dan pengiriman.'}
                                </p>
                            </div>

                            <form onSubmit={saveWorkflowSettings}>
                                {/* Mode Selection Group */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                                    {[
                                        { value: 'loose', label: language === 'en' ? 'Loose Mode' : 'Mode Longgar', desc: language === 'en' ? 'Production is not blocked by design/material readiness.' : 'Produksi tidak dikunci oleh kesiapan desain/bahan.' },
                                        { value: 'strict', label: language === 'en' ? 'Strict Mode' : 'Mode Ketat', desc: language === 'en' ? 'Design and material must be 100% ready to start production.' : 'Desain dan bahan harus 100% siap untuk mulai produksi.' },
                                        { value: 'custom', label: language === 'en' ? 'Custom Mode' : 'Mode Kustom', desc: language === 'en' ? 'Configure individual gate locks manually.' : 'Atur kuncian gerbang secara manual.' }
                                    ].map(mode => {
                                        const isSelected = workflowMode === mode.value;
                                        return (
                                            <div
                                                key={mode.value}
                                                onClick={() => {
                                                    setWorkflowMode(mode.value as any);
                                                    if (mode.value === 'strict') {
                                                        setReqDesign(true);
                                                        setReqMaterial(true);
                                                        setReqProductionForQc(true);
                                                        setReqQcForDelivery(true);
                                                        setReqDeliveryForFinance(true);
                                                    } else if (mode.value === 'loose') {
                                                        setReqDesign(false);
                                                        setReqMaterial(false);
                                                        setReqProductionForQc(true);
                                                        setReqQcForDelivery(true);
                                                        setReqDeliveryForFinance(true);
                                                    }
                                                }}
                                                style={{
                                                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)',
                                                    border: '1px solid',
                                                    borderColor: isSelected ? '#6366f1' : 'rgba(255,255,255,0.06)',
                                                    borderRadius: '12px',
                                                    padding: '16px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <div style={{
                                                        width: '16px', height: '16px', borderRadius: '50%',
                                                        border: isSelected ? '5px solid #6366f1' : '2px solid rgba(255,255,255,0.2)',
                                                        backgroundColor: isSelected ? '#fff' : 'transparent',
                                                        boxSizing: 'border-box'
                                                    }} />
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? '#818cf8' : '#fafafa' }}>
                                                        {mode.label}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '11px', color: '#a1a1aa', margin: 0 }}>{mode.desc}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Custom Toggles Box */}
                                {workflowMode === 'custom' && (
                                    <div style={{
                                        backgroundColor: 'rgba(0,0,0,0.2)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px',
                                        border: '1px solid rgba(255,255,255,0.04)',
                                    }}>
                                        {[
                                            { state: reqDesign, setter: setReqDesign, label: language === 'en' ? 'Require Design Approved (APPROVED) to start Production' : 'Wajib Desain Disetujui (APPROVED) untuk memulai Produksi' },
                                            { state: reqMaterial, setter: setReqMaterial, label: language === 'en' ? 'Require Material Ready (READY) to start Production' : 'Wajib Bahan Siap (READY) untuk memulai Produksi' },
                                            { state: reqProductionForQc, setter: setReqProductionForQc, label: language === 'en' ? 'Require Production Completed to start QC' : 'Wajib Produksi Selesai untuk memulai QC' },
                                            { state: reqQcForDelivery, setter: setReqQcForDelivery, label: language === 'en' ? 'Require QC Completed to start Delivery' : 'Wajib QC Selesai untuk memulai Pengiriman' },
                                            { state: reqDeliveryForFinance, setter: setReqDeliveryForFinance, label: language === 'en' ? 'Require Delivery Completed to start Finance stage' : 'Wajib Pengiriman Selesai untuk memulai Keuangan' }
                                        ].map((rule, idx) => (
                                            <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#e4e4e7' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={rule.state}
                                                    onChange={e => rule.setter(e.target.checked)}
                                                    style={{
                                                        width: '16px', height: '16px', borderRadius: '4px',
                                                        accentColor: '#6366f1', cursor: 'pointer'
                                                    }}
                                                />
                                                {rule.label}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="submit"
                                        disabled={isSavingSettings}
                                        style={{
                                            padding: '8px 18px',
                                            borderRadius: '8px',
                                            backgroundColor: isSavingSettings ? 'rgba(99,102,241,0.5)' : '#6366f1',
                                            color: '#fff',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            border: 'none',
                                            cursor: isSavingSettings ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseOver={e => { if(!isSavingSettings) e.currentTarget.style.backgroundColor = '#4f46e5'; }}
                                        onMouseOut={e => { if(!isSavingSettings) e.currentTarget.style.backgroundColor = '#6366f1'; }}
                                    >
                                        {isSavingSettings 
                                            ? (language === 'en' ? 'Saving...' : 'Menyimpan...') 
                                            : (language === 'en' ? 'Save Settings' : 'Simpan Pengaturan')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {confirmAlert.element}

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
                                        <option key={r.id} value={r.id}>{localizedDisplay(r, language)} ({r.name})</option>
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
                                        <option key={p.id} value={p.id}>{localizedDisplay(p, language)} ({p.name})</option>
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
                                        <option key={r.id} value={r.id}>{localizedDisplay(r, language)} ({r.name})</option>
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
                                        <option key={p.id} value={p.id}>{localizedDisplay(p, language)} ({p.name})</option>
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
                                    disabled={addUserSubmitting}
                                    style={{
                                        padding: '10px 20px',
                                        background: addUserSubmitting ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        border: 'none',
                                        color: '#fff',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        cursor: addUserSubmitting ? 'not-allowed' : 'pointer',
                                        opacity: addUserSubmitting ? 0.7 : 1,
                                    }}
                                >
                                    {addUserSubmitting ? '...' : t.add_user}
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
                                        <option key={r.id} value={r.id}>{localizedDisplay(r, language)} ({r.name})</option>
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
                                        <option key={p.id} value={p.id}>{localizedDisplay(p, language)} ({p.name})</option>
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
                                    disabled={adminSubmitting}
                                    style={{
                                        padding: '10px 20px',
                                        background: adminSubmitting ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        border: 'none',
                                        color: '#fff',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        cursor: adminSubmitting ? 'not-allowed' : 'pointer',
                                        opacity: adminSubmitting ? 0.7 : 1,
                                    }}
                                >
                                    {adminSubmitting ? '...' : t.create_admin}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Search Modal ────────────────────────────────────────── */}
            {showSearchModal && (() => {
                const results = getSearchResults();
                const totalResults = results.pos.length + results.items.length + results.clients.length + results.alerts.length;

                return (
                    <div
                        id="search-modal"
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            zIndex: 100,
                            padding: '40px 20px',
                        }}
                        onClick={e => { if (e.target === e.currentTarget) setShowSearchModal(false); }}
                    >
                        <div style={{
                            backgroundColor: '#18181b',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                            width: '100%',
                            maxWidth: '640px',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                                    {language === 'en' ? 'Search Directory' : 'Cari Data'}
                                </h3>
                                <button
                                    onClick={() => setShowSearchModal(false)}
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

                            {/* Search Input */}
                            <div style={{ position: 'relative', marginBottom: '16px', flexShrink: 0 }}>
                                <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#71717a' }} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder={language === 'en' ? "Search POs, items, clients, or issues..." : "Cari nomor PO, barang, klien, atau kendala..."}
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px 12px 42px',
                                        backgroundColor: '#09090b',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            {/* Results list */}
                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                                {!searchQuery.trim() ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#71717a' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔍</div>
                                        <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>
                                            {language === 'en' ? 'Search POs, Items, Clients & Issues' : 'Cari PO, Barang, Klien & Kendala'}
                                        </p>
                                        <p style={{ fontSize: '12px', margin: 0 }}>
                                            {language === 'en' ? 'Type above to query client names, PO numbers, item statuses, and logged trouble reports.' : 'Ketik di atas untuk mencari nama klien, nomor PO, status barang, dan laporan kendala.'}
                                        </p>
                                    </div>
                                ) : totalResults === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#71717a' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '12px' }}>📭</div>
                                        <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>
                                            {language === 'en' ? 'No results found' : 'Tidak ada hasil'}
                                        </p>
                                        <p style={{ fontSize: '12px', margin: 0 }}>
                                            {language === 'en' ? `No matches found for "${searchQuery}"` : `Tidak ada hasil pencarian untuk "${searchQuery}"`}
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* 1. Alerts / Issues Section */}
                                        {results.alerts.length > 0 && (
                                            <div>
                                                <h4 style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                                                    {language === 'en' ? 'Alerts & Operational Issues' : 'Kendala & Masalah Operasional'}
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {results.alerts.map((issue: any) => {
                                                        const badgeColor = issue.severity === 'RED' ? '#ef4444' 
                                                            : issue.severity === 'BLUE' ? '#3b82f6' 
                                                            : issue.severity === 'ORANGE' ? '#fb923c'
                                                            : '#fbbf24';

                                                        return (
                                                            <div
                                                                key={issue.id}
                                                                onClick={() => handleSearchAlertClick(issue.id.replace('alert-db-', '').replace('alert-pin-', ''))}
                                                                style={{
                                                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                                    borderRadius: '8px',
                                                                    padding: '12px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s ease',
                                                                }}
                                                                className="hover-grow"
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                    <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: badgeColor, color: '#fff' }}>
                                                                        {issue.title}
                                                                    </span>
                                                                </div>
                                                                <p style={{ fontSize: '13px', margin: 0, color: '#fafafa' }}>{issue.message}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* 2. Purchase Orders Section */}
                                        {results.pos.length > 0 && (
                                            <div>
                                                <h4 style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                                                    {language === 'en' ? 'Purchase Orders (POs)' : 'Daftar PO'}
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {results.pos.map((po: any) => {
                                                        const itemsProgress = po.items.length > 0
                                                            ? Math.round(po.items.reduce((sum: number, item: any) => sum + parseFloat(item.progress_percent), 0) / po.items.length)
                                                            : 0;

                                                        return (
                                                            <div
                                                                key={po.id}
                                                                onClick={() => handleSearchItemClick(po.id)}
                                                                style={{
                                                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                                    borderRadius: '8px',
                                                                    padding: '12px',
                                                                    cursor: 'pointer',
                                                                }}
                                                                className="hover-grow"
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#fafafa' }}>{po.po_number}</span>
                                                                    <span style={{
                                                                        fontSize: '10px',
                                                                        fontWeight: 700,
                                                                        color: po.status === 'COMPLETED' || po.status === 'DELIVERED' || po.status === 'CLOSED' ? '#34d399' : '#fbbf24',
                                                                        backgroundColor: po.status === 'COMPLETED' || po.status === 'DELIVERED' || po.status === 'CLOSED' ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.12)',
                                                                        padding: '2px 6px',
                                                                        borderRadius: '4px'
                                                                    }}>
                                                                        {po.status}
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                                                                    <span>{po.client_name}</span>
                                                                    <span>{language === 'en' ? 'Deadline: ' : 'Tenggat: '} {new Date(po.global_deadline).toLocaleDateString()}</span>
                                                                </div>
                                                                {/* Progress Bar */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                        <div style={{ width: `${itemsProgress}%`, height: '100%', backgroundColor: po.status === 'COMPLETED' || po.status === 'DELIVERED' || po.status === 'CLOSED' ? '#10b981' : '#6366f1', borderRadius: '3px' }} />
                                                                    </div>
                                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#fafafa' }}>{itemsProgress}%</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* 3. Items Section */}
                                        {results.items.length > 0 && (
                                            <div>
                                                <h4 style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                                                    {language === 'en' ? 'Items & Components' : 'Barang & Komponen'}
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {results.items.map((item: any) => {
                                                        const progress = Math.round(parseFloat(item.progress_percent));

                                                        return (
                                                            <div
                                                                key={`${item.po_id}-${item.id}`}
                                                                onClick={() => handleSearchItemClick(item.po_id, item.id)}
                                                                style={{
                                                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                                    borderRadius: '8px',
                                                                    padding: '12px',
                                                                    cursor: 'pointer',
                                                                }}
                                                                className="hover-grow"
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fafafa' }}>{item.item_name}</span>
                                                                    <span style={{
                                                                        fontSize: '10px',
                                                                        fontWeight: 700,
                                                                        color: item.status === 'COMPLETED' ? '#34d399' : '#a855f7',
                                                                        backgroundColor: item.status === 'COMPLETED' ? 'rgba(16,185,129,0.12)' : 'rgba(168,85,247,0.12)',
                                                                        padding: '2px 6px',
                                                                        borderRadius: '4px'
                                                                    }}>
                                                                        {item.status}
                                                                    </span>
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '8px' }}>
                                                                    {item.client_name} &middot; PO {item.po_number}
                                                                </div>
                                                                {/* Progress Bar */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                                                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: item.status === 'COMPLETED' ? '#10b981' : '#a855f7', borderRadius: '2px' }} />
                                                                    </div>
                                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#fafafa' }}>{progress}%</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* 4. Clients Section */}
                                        {results.clients.length > 0 && (
                                            <div>
                                                <h4 style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                                                    {language === 'en' ? 'Clients' : 'Klien'}
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                                    {results.clients.map((clientName: string) => {
                                                        const clientPos = pos.filter(p => p.client_name === clientName);
                                                        const activeCount = clientPos.filter(p => p.status !== 'COMPLETED').length;
                                                        const doneCount = clientPos.filter(p => p.status === 'COMPLETED').length;

                                                        return (
                                                            <div
                                                                key={clientName}
                                                                onClick={() => {
                                                                    const firstPo = clientPos[0];
                                                                    if (firstPo) handleSearchItemClick(firstPo.id);
                                                                }}
                                                                style={{
                                                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                                    borderRadius: '8px',
                                                                    padding: '12px',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                }}
                                                                className="hover-grow"
                                                            >
                                                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fafafa' }}>{clientName}</span>
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <span style={{ fontSize: '10px', color: '#fbbf24', backgroundColor: 'rgba(234,179,8,0.12)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                                        {activeCount} {language === 'en' ? 'Active' : 'Aktif'}
                                                                    </span>
                                                                    <span style={{ fontSize: '10px', color: '#34d399', backgroundColor: 'rgba(16,185,129,0.12)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                                        {doneCount} {language === 'en' ? 'Done' : 'Selesai'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {selectedItemIds.size > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 20px',
                    background: '#1f2937',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                    <span style={{ color: '#d1d5db', fontSize: '14px' }}>
                        {selectedItemIds.size} selected
                    </span>
                    <button
                        onClick={() => {
                            if (confirm(`Cancel ${selectedItemIds.size} items?`)) {
                                router.post('/items/batch-action', {
                                    action: 'cancel',
                                    item_ids: Array.from(selectedItemIds),
                                });
                                setSelectedItemIds(new Set());
                            }
                        }}
                        style={{
                            padding: '8px 16px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Cancel Selected
                    </button>
                    <button
                        onClick={() => {
                            if (confirm(`Terminate ${selectedItemIds.size} items? This will trigger sunk-cost billing.`)) {
                                router.post('/items/batch-action', {
                                    action: 'terminate',
                                    item_ids: Array.from(selectedItemIds),
                                });
                                setSelectedItemIds(new Set());
                            }
                        }}
                        style={{
                            padding: '8px 16px',
                            background: '#f59e0b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Terminate Selected
                    </button>
                    <button
                        onClick={() => setSelectedItemIds(new Set())}
                        style={{
                            padding: '8px 12px',
                            background: 'transparent',
                            color: '#9ca3af',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '18px',
                        }}
                    >
                        &times;
                    </button>
                </div>
            )}

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}





