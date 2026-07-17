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
        export_csv: "Export CSV",
        export_xlsx: "Export Excel",
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
        stage_templates: "Stage Templates",
        stage_templates_subtitle: "Manage custom stage templates for quick PO creation.",
        add_template: "Add Template",
        template_name: "Template Name",
        template_description: "Description (optional)",
        template_stages: "Stages",
        template_name_placeholder: "e.g. CNC + Welding",
        template_desc_placeholder: "e.g. Standard CNC job with welding",
        save_template: "Save Template",
        delete_template: "Delete",
        delete_template_confirm: "Are you sure you want to delete this template?",
        edit_template: "Edit Template",
        no_templates: "No custom templates yet.",
        select_stages_hint: "Select the stages this template includes:",
        template_saved: "Template saved successfully.",
        template_deleted: "Template deleted successfully.",
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
        export_csv: "Ekspor CSV",
        export_xlsx: "Ekspor Excel",
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
        stage_templates: "Template Tahapan",
        stage_templates_subtitle: "Kelola template tahapan kustom untuk pembuatan PO cepat.",
        add_template: "Tambah Template",
        template_name: "Nama Template",
        template_description: "Deskripsi (opsional)",
        template_stages: "Tahapan",
        template_name_placeholder: "Contoh: CNC + Las",
        template_desc_placeholder: "Contoh: Pekerjaan CNC standar dengan pengelasan",
        save_template: "Simpan Template",
        delete_template: "Hapus",
        delete_template_confirm: "Apakah Anda yakin ingin menghapus template ini?",
        edit_template: "Edit Template",
        no_templates: "Belum ada template kustom.",
        select_stages_hint: "Pilih tahapan yang termasuk dalam template ini:",
        template_saved: "Template berhasil disimpan.",
        template_deleted: "Template berhasil dihapus.",
    }
};

export default function OwnerDashboard({ pos, alerts, users, roles, posts, tenant, auth_user, telemetry, selected_range }: Props) {
    const { errors } = usePage().props;

    const renderStatusBadge = (text: string, dotColor: string) => (
        <span className="badge animate-fade" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--color-pg-text-secondary)',
            border: '1px solid var(--color-pg-border)',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.01)',
        }}>
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: dotColor,
                display: 'inline-block',
                boxShadow: dotColor !== '#71717a' ? `0 0 6px ${dotColor}` : 'none'
            }} />
            {text}
        </span>
    );

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
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);

    const changeTheme = (newTheme: string) => {
        localStorage.setItem('pogrid_theme', newTheme);
        const classes = ['theme-default', 'theme-linear', 'theme-vercel', 'theme-stripe', 'theme-github', 'theme-nordic'];
        classes.forEach(c => document.documentElement.classList.remove(c));
        document.documentElement.classList.add(newTheme);
        setShowThemeDropdown(false);
    };

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

    // ── Stage Templates ────────────────────────────────────────────────────────
    const [stageTemplates, setStageTemplates] = useState<{ id: number; name: string; description: string | null; stages: string[] }[]>([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<{ id: number; name: string; description: string | null; stages: string[] } | null>(null);
    const [templateFormName, setTemplateFormName] = useState('');
    const [templateFormDesc, setTemplateFormDesc] = useState('');
    const [templateFormStages, setTemplateFormStages] = useState<string[]>([]);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);

    const ALL_STAGES_TEMPLATE = ['Design', 'Material', 'Machining', 'Fabrication', 'Assembly', 'Surface Treatment', 'QC', 'Delivery', 'Vendor'];

    useEffect(() => {
        fetch('/stage-templates')
            .then(res => res.json())
            .then(data => {
                if (data.templates) setStageTemplates(data.templates);
            })
            .catch(() => {});
    }, []);
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
            backgroundColor: 'var(--color-pg-bg)',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--color-pg-text)',
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
                        <span className="owner-header-datetime" style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)' }}>
                            {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {' · '}
                            {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <div className="owner-greeting" style={{ fontSize: '11px', color: 'var(--color-pg-primary-hover)', fontWeight: 600, marginTop: '1px' }}>
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
                            color: 'var(--color-pg-text-secondary)',
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
                            e.currentTarget.style.color = 'var(--color-pg-primary-hover)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.color = 'var(--color-pg-text-secondary)';
                        }}
                    >
                        <Search size={16} />
                    </button>
                    {/* Theme Picker */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                            style={{
                                padding: '8px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                color: 'var(--color-pg-text-secondary)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                lineHeight: '1',
                                display: 'flex',
                            }}
                            title={language === 'en' ? 'Switch Theme' : 'Ganti Tema'}
                        >
                            <Palette size={16} />
                        </button>
                        {showThemeDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: '40px',
                                right: '0',
                                width: '160px',
                                backgroundColor: 'var(--color-pg-card)',
                                border: '1px solid var(--color-pg-border)',
                                borderRadius: '10px',
                                padding: '6px',
                                zIndex: 100,
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                                display: 'grid',
                                gap: '4px',
                            }}>
                                {[
                                    { id: 'theme-default', name: 'Titanium Slate', color: '#6366f1' },
                                    { id: 'theme-linear', name: 'Obsidian Graphite', color: '#6366f1' },
                                    { id: 'theme-vercel', name: 'Monochrome Void', color: '#6366f1' },
                                    { id: 'theme-stripe', name: 'Stripe Navy', color: '#6366f1' },
                                    { id: 'theme-github', name: 'GitHub Slate', color: '#6366f1' },
                                    { id: 'theme-nordic', name: 'Nordic Polar', color: '#6366f1' },
                                ].map((tOption) => (
                                    <button
                                        key={tOption.id}
                                        onClick={() => changeTheme(tOption.id)}
                                        style={{
                                            padding: '6px 8px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: 'var(--color-pg-text)',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--color-pg-card-hover)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tOption.color }} />
                                        {tOption.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Profile - visible to all roles */}
                    <Link
                        href={'/c/' + (tenant?.slug || '') + '/profile'}
                        onClick={() => setShowSettingsDropdown(false)}
                        style={{
                            padding: '8px',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: 'var(--color-pg-text-secondary)',
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
                                color: 'var(--color-pg-text-secondary)',
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
                    color: 'var(--color-pg-text-secondary)',
                    flexWrap: 'nowrap',
                    minWidth: 0,
                }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-pg-primary-hover)' }}>{t.floor_terminal_url}</span>
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
                            color: 'var(--color-pg-primary-hover)',
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
                            color: 'var(--color-pg-text-secondary)',
                            padding: '1px 5px',
                            borderRadius: '8px'
                        }}>
                            {users.length}
                        </span>
                    </button>
                )}
                <Link
                    href="/dashboard/rework-logbook"
                    className="tab"
                    style={{ textDecoration: 'none' }}
                >
                    <span className="tab-label-full">Logbook</span>
                    <span className="tab-label-short">Logbook</span>
                </Link>
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
                                backgroundColor: unifiedIssues.length > 0 ? '#ef4444' : 'var(--color-pg-success)',
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
                                color: 'var(--color-pg-success)',
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
                                        : issue.severity === 'ORANGE' ? 'var(--color-pg-orange)'
                                        : 'var(--color-pg-warning)';
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
                                                                backgroundColor: 'var(--color-pg-warning)',
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
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-pg-text)' }}>
                                                                {issue.poNumber} {issue.client_name ? `(${issue.client_name})` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {issue.created_at && (
                                                        <span style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)', fontWeight: 500 }}>
                                                            {formatAlertTime(issue.created_at, language)}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {issue.itemName ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ fontSize: '14px', color: '#e4e4e7', fontWeight: 600 }}>
                                                            {issue.itemName} &middot; <span style={{ color: 'var(--color-pg-orange)', fontWeight: 700 }}>Stage: {issue.stage}</span>
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: 'var(--color-pg-text-secondary)' }}>
                                                            <strong style={{ color: 'var(--color-pg-danger)' }}>
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
                                    backgroundColor: activePoFilter === 'all' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.05)',
                                    color: activePoFilter === 'all' ? '#ffffff' : 'var(--color-pg-text-secondary)',
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
                                    backgroundColor: activePoFilter === 'marked' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.05)',
                                    color: activePoFilter === 'marked' ? '#ffffff' : 'var(--color-pg-text-secondary)',
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
                                    backgroundColor: activePoFilter === 'delayed' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.05)',
                                    color: activePoFilter === 'delayed' ? '#ffffff' : 'var(--color-pg-text-secondary)',
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
                                    backgroundColor: activePoFilter === 'ontime' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.05)',
                                    color: activePoFilter === 'ontime' ? '#ffffff' : 'var(--color-pg-text-secondary)',
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
                                    backgroundColor: activePoFilter === 'close_due' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.05)',
                                    color: activePoFilter === 'close_due' ? '#ffffff' : 'var(--color-pg-text-secondary)',
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
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-pg-text-muted)' }}>
                            {activeTab === 'completed' ? 'No completed POs yet.' : t.no_pos}
                        </div>
                    ) : (
                        <div>
                            {/* Compact summary strip for mobile */}
                            <div style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', marginBottom: '12px', padding: '0 4px' }}>
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
                                                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-pg-text)' }}>{po.client_name}</span>
                                                    <StatusBadge status={po.status} />
                                                    {po.is_urgent && <StatusBadge status="URGENT" />}
                                                    {(() => {
                                                        const poItemIds = po.items.map(i => i.id);
                                                        const poAlerts = alerts.filter(a => poItemIds.includes(a.item_id) && !a.is_resolved);
                                                        const hasRework = poAlerts.some(a => a.severity === 'YELLOW');
                                                        return <WarningPill deadlineDateStr={po.global_deadline} reworkMessage={hasRework} lang={language} />;
                                                    })()}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginTop: '3px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-pg-text-muted)' }}>{po.po_number}</span>
                                                    <span style={{ color: 'var(--color-pg-border)' }}>&middot;</span>
                                                    <span style={{ fontSize: '12px', fontWeight: 500 }}>{formatDeadline(po.global_deadline, language)}</span>
                                                    {!isExpanded && po.items.length > 0 && (
                                                        <>
                                                            <span style={{ color: 'var(--color-pg-border)' }}>&middot;</span>
                                                            <span style={{ color: '#3b82f6', fontWeight: 500 }}>
                                                                {po.items.length} item{po.items.length > 1 ? 's' : ''} &middot; {poProgress}%
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="po-accordion-body">
                                                {po.items.length === 0 ? (
                                                    <div style={{ fontSize: '14px', color: 'var(--color-pg-text-muted)', padding: '12px 0' }}>No items in this PO.</div>
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
                                                                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-pg-text)' }}>{item.item_name}</span>
                                                                        {renderStatusBadge(
                                                                            item.item_type === 'MANUFACTURE' 
                                                                                ? (language === 'id' ? 'Produksi Internal' : 'Manufactured') 
                                                                                : (language === 'id' ? 'Beli Jadi (Buyout)' : 'Buyout'),
                                                                            '#71717a'
                                                                        )}
                                                                        {item.drafter_status && renderStatusBadge(
                                                                            item.drafter_status === 'APPROVED' 
                                                                                ? (language === 'id' ? 'Gambar Disetujui' : 'Drawing Approved')
                                                                                : (language === 'id' ? `Gambar: ${item.drafter_status}` : `Drawing: ${item.drafter_status}`),
                                                                            item.drafter_status === 'APPROVED' ? 'var(--color-pg-success)' : 'var(--color-pg-primary)'
                                                                        )}
                                                                        {item.purchasing_status && renderStatusBadge(
                                                                            item.purchasing_status === 'READY'
                                                                                ? (language === 'id' ? 'Bahan Baku Siap' : 'Material Ready')
                                                                                : item.purchasing_status === 'PROSES'
                                                                                ? (language === 'id' ? 'Bahan Dipesan' : 'Material Ordered')
                                                                                : (language === 'id' ? `Material: ${item.purchasing_status}` : `Material: ${item.purchasing_status}`),
                                                                            item.purchasing_status === 'READY' ? 'var(--color-pg-success)' :
                                                                                item.purchasing_status === 'PROSES' ? 'var(--color-pg-warning)' :
                                                                                '#3b82f6'
                                                                        )}
                                                                        {item.delivery_status && renderStatusBadge(
                                                                            item.delivery_status === 'DELIVERED'
                                                                                ? (language === 'id' ? 'Terkirim' : 'Delivered')
                                                                                : item.delivery_status === 'PARTIAL'
                                                                                ? (language === 'id' ? `Terkirim Sebagian (${item.delivered_qty}/${item.target_qty})` : `Partially Delivered (${item.delivered_qty}/${item.target_qty})`)
                                                                                : (language === 'id' ? 'Belum Dikirim' : 'Pending Delivery'),
                                                                            item.delivery_status === 'DELIVERED' ? 'var(--color-pg-success)' :
                                                                                item.delivery_status === 'PARTIAL' ? 'var(--color-pg-warning)' :
                                                                                '#71717a'
                                                                        )}
                                                                        {item.invoice_status && renderStatusBadge(
                                                                            item.invoice_status === 'INVOICED'
                                                                                ? (language === 'id' ? 'Difakturkan' : 'Invoiced')
                                                                                : item.invoice_status === 'PARTIAL'
                                                                                ? (language === 'id' ? `Faktur Sebagian (${item.invoiced_qty}/${item.target_qty})` : `Partially Invoiced (${item.invoiced_qty}/${item.target_qty})`)
                                                                                : (language === 'id' ? 'Belum Difakturkan' : 'Uninvoiced'),
                                                                            item.invoice_status === 'INVOICED' ? 'var(--color-pg-success)' :
                                                                                item.invoice_status === 'PARTIAL' ? 'var(--color-pg-orange)' :
                                                                                '#71717a'
                                                                        )}
                                                                        {item.payment_status && renderStatusBadge(
                                                                            item.payment_status === 'PAID'
                                                                                ? (language === 'id' ? 'Lunas' : 'Paid')
                                                                                : item.payment_status === 'PARTIAL_PAID'
                                                                                ? (language === 'id' ? 'Bayar Sebagian' : 'Partial Paid')
                                                                                : (language === 'id' ? 'Belum Bayar' : 'Unpaid'),
                                                                            item.payment_status === 'PAID' ? 'var(--color-pg-success)' :
                                                                                item.payment_status === 'PARTIAL_PAID' ? 'var(--color-pg-primary-hover)' :
                                                                                '#71717a'
                                                                        )}
                                                                        {renderStatusBadge(
                                                                            (() => {
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
                                                                            })(),
                                                                            isCancelled ? 'var(--color-pg-danger)'
                                                                                : isTerminated ? 'var(--color-pg-danger)'
                                                                                : progress >= 100 ? 'var(--color-pg-success)' : '#3b82f6'
                                                                        )}
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
                                                                            backgroundColor: isCancelled ? 'var(--color-pg-danger)' : 'var(--color-pg-primary)'
                                                                        }} />
                                                                    </div>
                                                                    <span className="item-pct-label" style={{ 
                                                                        fontSize: '12px', 
                                                                        fontWeight: 700, 
                                                                        color: 'var(--color-pg-primary-hover)',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: '2px',
                                                                        alignItems: 'flex-end'
                                                                    }}>
                                                                        <span>{progress.toFixed(0)}%</span>
                                                                        <span style={{ fontSize: '10px', color: 'var(--color-pg-text-muted)', fontWeight: 'normal' }}>
                                                                            ({item.delivered_qty || 0} / {item.target_qty || 0} pcs)
                                                                        </span>
                                                                    </span>
                                                                    <ChevronDown size={14} expanded={itemExpanded} />
                                                                </button>
                                                                {itemExpanded && (
                                                                    <div className="item-compact-detail">
                                                                        <div className="responsive-split" style={{ marginBottom: '12px', gap: '8px' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-pg-primary-hover)' }}>
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
                                                                                    <div style={{ fontSize: '11px', color: 'var(--color-pg-success)' }}>
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
                                                                                            backgroundColor: hasProgress ? 'var(--color-pg-border)' : 'rgba(239, 68, 68, 0.1)',
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
                                                                                backgroundColor: 'var(--color-pg-bg)',
                                                                                borderRadius: '3px',
                                                                                overflow: 'hidden'
                                                                            }}>
                                                                                <div style={{
                                                                                    width: `${progress}%`,
                                                                                    height: '100%',
                                                                                    backgroundColor: isCancelled ? 'var(--color-pg-danger)' : 'var(--color-pg-primary)',
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
                                                                                <div style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)', marginBottom: '6px' }}>
                                                                                    Stages
                                                                                </div>
                                                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                                    {item.item_progresses.map((stage) => (
                                                                                        <span key={stage.id} className="badge" style={{
                                                                                            backgroundColor: stage.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)'
                                                                                                : stage.status === 'STUCK' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                                                                                            color: stage.status === 'COMPLETED' ? 'var(--color-pg-success)'
                                                                                                : stage.status === 'STUCK' ? '#ef4444' : 'var(--color-pg-text-secondary)',
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
                                                }
                                            </>
                                        )
                                    }
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
                    if (metric.avg_cycle_time > 3) return { border: 'rgba(249,115,22,0.5)', bg: 'rgba(249,115,22,0.07)', label: 'var(--color-pg-orange)' };
                    if (metric.avg_cycle_time > 1) return { border: 'rgba(234,179,8,0.4)', bg: 'rgba(234,179,8,0.05)', label: 'var(--color-pg-warning)' };
                    return { border: 'rgba(16,185,129,0.35)', bg: 'rgba(16,185,129,0.05)', label: 'var(--color-pg-success)' };
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
                                            backgroundColor: selected_range === r ? 'var(--color-pg-primary)' : 'transparent',
                                            color: selected_range === r ? '#fff' : 'var(--color-pg-text-secondary)',
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
                                    href={`/c/${tenant?.slug}/export-csv?range=${selected_range || 'month'}`}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: '#e4e4e7',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '12px',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    {t.export_csv}
                                </a>
                                <a
                                    href={`/c/${tenant?.slug}/export-xlsx?range=${selected_range || 'month'}`}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: '#e4e4e7',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '12px',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    {t.export_xlsx}
                                </a>
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
                                <div style={{ fontSize: '10px', color: 'var(--color-pg-primary-hover)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
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
                                <span style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{t.on_time_delivery}</span>
                                <span style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1.1, marginTop: '4px', color: telemetry.otdr >= 80 ? 'var(--color-pg-success)' : telemetry.otdr >= 60 ? 'var(--color-pg-warning)' : '#ef4444' }}>
                                    {telemetry.otdr}%
                                </span>
                                {otdrDelta != null && (
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: otdrDelta >= 0 ? 'var(--color-pg-success)' : '#ef4444', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
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
                                <span style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{t.parts_manufactured}</span>
                                <span style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.1, marginTop: '4px', color: '#3b82f6' }}>
                                    {deliveredCurr} <span style={{ fontSize: '15px', color: '#52525b', fontWeight: 500 }}>/ {telemetry.manufacture?.target ?? 0} Pcs</span>
                                </span>
                                {deliveredDelta != null && (
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: deliveredDelta >= 0 ? 'var(--color-pg-success)' : '#ef4444', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
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
                                <span style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{t.avg_delay}</span>
                                <span style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1.1, marginTop: '4px', color: telemetry.avg_delay_days === 0 ? 'var(--color-pg-success)' : telemetry.avg_delay_days <= 3 ? 'var(--color-pg-warning)' : '#ef4444' }}>
                                    {telemetry.avg_delay_days} <span style={{ fontSize: '15px', fontWeight: 500, color: '#52525b' }}>{language === 'id' ? 'Hari' : 'Days'}</span>
                                </span>
                                {delayDelta != null && (
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: delayDelta <= 0 ? 'var(--color-pg-success)' : '#ef4444', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
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
                                <span style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                                    {language === 'id' ? 'PO Mendesak Aktif' : 'Urgent Active POs'}
                                </span>
                                <span style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1.1, marginTop: '4px', color: (telemetry.urgent_active || 0) > 0 ? '#ef4444' : 'var(--color-pg-success)' }}>
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
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-pg-text)', margin: 0 }}>
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
                                                        border: '2px solid var(--color-pg-bg)',
                                                    }}>{metric.stuck_count}</span>
                                                )}
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
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
                                                <div className="pipeline-arrow" style={{ color: 'var(--color-pg-border)', fontSize: '22px', padding: '0 3px', flexShrink: 0, userSelect: 'none' }}>→</div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Active Delay & Risk Directory ────────────────────── */}
                        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 mb-5.5">
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <div className="flex items-center gap-2.5">
                                    <h3 className="text-base font-bold text-pg-text m-0">
                                        {matrixFilter ? (language === 'id' ? 'Hasil Filter Data' : 'Filtered Data Directory') : (language === 'id' ? 'Direktori PO & Item' : 'PO & Item Directory')}
                                    </h3>
                                    {matrixFilter && (
                                        <span className="bg-pg-primary text-white px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1.5">
                                            {matrixFilter.label}: {matrixFilter.value.toUpperCase()}
                                            <button
                                                onClick={() => setMatrixFilter(null)}
                                                className="bg-transparent border-none text-white cursor-pointer p-0.5 text-xs font-bold inline-flex items-center"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Pill Filters */}
                            <div className="flex gap-2 flex-wrap mb-4">
                                <button
                                    onClick={() => setDirectoryFilter('client')}
                                    className="cursor-pointer transition-all duration-200"
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        backgroundColor: directoryFilter === 'client' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.05)',
                                        color: directoryFilter === 'client' ? '#ffffff' : 'var(--color-pg-text-secondary)',
                                    }}
                                >
                                    {language === 'id' ? 'Per Klien (Default)' : 'Per Client (Default)'}
                                </button>
                                <button
                                    onClick={() => setDirectoryFilter('marked')}
                                    className="cursor-pointer transition-all duration-200"
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        backgroundColor: directoryFilter === 'marked' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.05)',
                                        color: directoryFilter === 'marked' ? '#ffffff' : 'var(--color-pg-text-secondary)',
                                    }}
                                >
                                    {language === 'id' ? 'Ditandai (Rework/Kendala)' : 'Marked (Rework / Trouble)'}
                                </button>
                                <button
                                    onClick={() => setDirectoryFilter('delayed')}
                                    className="cursor-pointer transition-all duration-200"
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        backgroundColor: directoryFilter === 'delayed' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.05)',
                                        color: directoryFilter === 'delayed' ? '#ffffff' : 'var(--color-pg-text-secondary)',
                                    }}
                                >
                                    {language === 'id' ? 'Terlambat' : 'Delayed'}
                                </button>
                                <button
                                    onClick={() => setDirectoryFilter('ontime')}
                                    className="cursor-pointer transition-all duration-200"
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        backgroundColor: directoryFilter === 'ontime' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.05)',
                                        color: directoryFilter === 'ontime' ? '#ffffff' : 'var(--color-pg-text-secondary)',
                                    }}
                                >
                                    {language === 'id' ? 'Tepat Waktu' : 'On Time'}
                                </button>
                                <button
                                    onClick={() => setDirectoryFilter('close_due')}
                                    className="cursor-pointer transition-all duration-200"
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        backgroundColor: directoryFilter === 'close_due' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.05)',
                                        color: directoryFilter === 'close_due' ? '#ffffff' : 'var(--color-pg-text-secondary)',
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
                                            <div className="text-pg-text-muted text-sm py-6 text-center">
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
                                                <table className="w-full border-collapse text-sm">
                                                    <thead>
                                                        <tr className="border-b border-white/8">
                                                            <th className="text-left px-4 py-3 text-pg-text-muted font-semibold">{t.po_number_label}</th>
                                                            <th className="text-left px-4 py-3 text-pg-text-muted font-semibold">{t.client_label}</th>
                                                            <th className="text-left px-4 py-3 text-pg-text-muted font-semibold">{t.item_name_label}</th>
                                                            <th className="text-center px-4 py-3 text-pg-text-muted font-semibold">{t.progress_label}</th>
                                                            <th className="text-center px-4 py-3 text-pg-text-muted font-semibold">{language === 'id' ? 'Status' : 'Status'}</th>
                                                            <th className="text-center px-4 py-3 text-pg-text-muted font-semibold">{t.deadline_label}</th>
                                                            <th className="text-center px-4 py-3 text-pg-text-muted font-semibold">{t.days_overdue_label}</th>
                                                            <th className="text-left px-4 py-3 text-pg-text-muted font-semibold">{t.delay_reason_label}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {Object.keys(groupedByClient).map((cName) => {
                                                            const clientItems = groupedByClient[cName];
                                                            return (
                                                                <React.Fragment key={`group-${cName}`}>
                                                                    <tr className="bg-blue-500/3 border-b border-white/6">
                                                                        <td colSpan={8} className="px-4 py-2 font-bold text-pg-primary-hover text-[11px] uppercase tracking-wider">
                                                                            🏢 CLIENT: {cName} ({clientItems.length} item{clientItems.length > 1 ? 's' : ''})
                                                                        </td>
                                                                    </tr>
                                                                    {clientItems.map((item: any, idx: number) => {
                                                                        const progress = parseFloat(item.progress_percent);
                                                                        
                                                                        // Determine status badge
                                                                        let displayStatus = item.current_stage || '-';
                                                                        let statusColor = 'var(--color-pg-text-secondary)';
                                                                        let statusBg = 'rgba(255,255,255,0.03)';
                                                                        
                                                                        if (item.po_status === 'COMPLETED' || item.po_status === 'DELIVERED' || item.po_status === 'CLOSED') {
                                                                            if (item.invoice_status === 'UNINVOICED') {
                                                                                displayStatus = language === 'id' ? 'Belum Difakturkan' : 'Finance: Uninvoiced';
                                                                                statusColor = 'var(--color-pg-warning)';
                                                                                statusBg = 'rgba(234,179,8,0.1)';
                                                                            } else if (item.invoice_status === 'PARTIAL') {
                                                                                displayStatus = (language === 'id' ? 'Faktur Sebagian' : 'Finance: Partial Invoice') + ` (${item.invoiced_qty}/${item.target_qty})`;
                                                                                statusColor = '#a855f7';
                                                                                statusBg = 'rgba(168,85,247,0.1)';
                                                                            } else if (item.payment_status === 'UNPAID') {
                                                                                displayStatus = language === 'id' ? 'Belum Dibayar' : 'Finance: Unpaid';
                                                                                statusColor = 'var(--color-pg-orange)';
                                                                                statusBg = 'rgba(249,115,22,0.1)';
                                                                            } else if (item.payment_status === 'PARTIAL_PAID') {
                                                                                displayStatus = language === 'id' ? 'Dibayar Sebagian' : 'Finance: Partial Paid';
                                                                                statusColor = 'var(--color-pg-primary)';
                                                                                statusBg = 'rgba(99,102,241,0.1)';
                                                                            } else {
                                                                                displayStatus = language === 'id' ? 'Selesai & Lunas' : 'Closed / Settled';
                                                                                statusColor = 'var(--color-pg-success)';
                                                                                statusBg = 'rgba(16,185,129,0.1)';
                                                                            }
                                                                        } else {
                                                                            statusColor = '#3b82f6';
                                                                            statusBg = 'rgba(59,130,246,0.1)';
                                                                        }

                                                                        return (
                                                                            <tr key={`delay-${cName}-${idx}`} className="border-b border-white/4 text-zinc-300">
                                                                                <td className="px-4 py-3 font-bold">
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
                                                                                        className="bg-transparent border-none text-blue-500 font-bold cursor-pointer p-0 text-left underline"
                                                                                    >
                                                                                        {item.po_number}
                                                                                    </button>
                                                                                </td>
                                                                                <td className="px-4 py-3">{item.client_name}</td>
                                                                                <td className="px-4 py-3 font-semibold">{item.item_name}</td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <div className="flex flex-col items-center gap-0.5">
                                                                                        <span className="badge" style={{
                                                                                            backgroundColor: progress >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                                                            color: progress >= 100 ? 'var(--color-pg-success)' : '#3b82f6',
                                                                                        }}>
                                                                                            {progress.toFixed(0)}%
                                                                                        </span>
                                                                                        {item.target_qty !== undefined && (
                                                                                            <span className="text-[10px] text-pg-text-muted">
                                                                                                ({item.total_delivered_qty || 0} / {item.target_qty} pcs)
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <span className="badge font-semibold"
                                                                                        style={{ backgroundColor: statusBg, color: statusColor }}>
                                                                                        {displayStatus}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center text-pg-text-secondary">{item.global_deadline}</td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    {item.days_overdue > 0 ? (
                                                                                        <span className="badge bg-red-500/15 text-red-500">
                                                                                            {item.days_overdue} {t.days_suffix}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-pg-text-muted">-</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-pg-danger italic">
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
                                                        <div key={`mobile-group-${cName}`} className="mb-3">
                                                            <div className="bg-blue-500/4 border border-white/6 rounded-lg px-3 py-2 font-bold text-pg-primary-hover text-[11px] uppercase tracking-wider mb-1.5">
                                                                🏢 CLIENT: {cName} ({clientItems.length} item{clientItems.length > 1 ? 's' : ''})
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                {clientItems.map((item: any, idx: number) => {
                                                                    const progress = parseFloat(item.progress_percent);
                                                                    
                                                                    // Determine status badge
                                                                    let displayStatus = item.current_stage || '-';
                                                                    let statusColor = 'var(--color-pg-text-secondary)';
                                                                    let statusBg = 'rgba(255,255,255,0.03)';
                                                                    
                                                                     if (item.po_status === 'COMPLETED' || item.po_status === 'DELIVERED' || item.po_status === 'CLOSED') {
                                                                         if (item.invoice_status === 'UNINVOICED') {
                                                                             displayStatus = language === 'id' ? 'Belum Difakturkan' : 'Finance: Uninvoiced';
                                                                             statusColor = 'var(--color-pg-warning)';
                                                                             statusBg = 'rgba(234,179,8,0.1)';
                                                                         } else if (item.invoice_status === 'PARTIAL') {
                                                                             displayStatus = (language === 'id' ? 'Faktur Sebagian' : 'Finance: Partial Invoice') + ` (${item.invoiced_qty}/${item.target_qty})`;
                                                                             statusColor = '#a855f7';
                                                                             statusBg = 'rgba(168,85,247,0.1)';
                                                                         } else if (item.payment_status === 'UNPAID') {
                                                                             displayStatus = language === 'id' ? 'Belum Dibayar' : 'Finance: Unpaid';
                                                                             statusColor = 'var(--color-pg-orange)';
                                                                             statusBg = 'rgba(249,115,22,0.1)';
                                                                         } else if (item.payment_status === 'PARTIAL_PAID') {
                                                                             displayStatus = language === 'id' ? 'Dibayar Sebagian' : 'Finance: Partial Paid';
                                                                             statusColor = 'var(--color-pg-primary)';
                                                                             statusBg = 'rgba(99,102,241,0.1)';
                                                                         } else {
                                                                             displayStatus = language === 'id' ? 'Selesai & Lunas' : 'Closed / Settled';
                                                                             statusColor = 'var(--color-pg-success)';
                                                                             statusBg = 'rgba(16,185,129,0.1)';
                                                                         }
                                                                     } else {
                                                                        statusColor = '#3b82f6';
                                                                        statusBg = 'rgba(59,130,246,0.1)';
                                                                    }

                                                                    return (
                                                                        <div key={`mobile-item-${cName}-${idx}`} className="bg-pg-card border border-white/6 rounded-xl p-2.5 flex flex-col gap-1.5">
                                                                            <div className="flex justify-between items-baseline">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        changeTab('active');
                                                                                        togglePO(item.po_id);
                                                                                    }}
                                                                                    className="bg-transparent border-none text-blue-500 font-bold cursor-pointer p-0 text-left underline text-xs"
                                                                                >
                                                                                    {item.po_number}
                                                                                </button>
                                                                                <span className="font-bold text-pg-text text-xs">{item.item_name}</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center">
                                                                                <div className="flex items-center gap-1">
                                                                                    <span className="badge text-[10px] px-1.5 py-0.5"
                                                                                        style={{
                                                                                            backgroundColor: progress >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                                                            color: progress >= 100 ? 'var(--color-pg-success)' : '#3b82f6',
                                                                                        }}>
                                                                                        {progress.toFixed(0)}%
                                                                                    </span>
                                                                                    {item.target_qty !== undefined && (
                                                                                        <span className="text-[10px] text-pg-text-muted">
                                                                                            ({item.total_delivered_qty || 0} / {item.target_qty} pcs)
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <span className="badge font-semibold text-[10px] px-1.5 py-0.5"
                                                                                    style={{ backgroundColor: statusBg, color: statusColor }}>
                                                                                    {displayStatus}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-[10px] text-pg-text-secondary border-t border-white/4 pt-1">
                                                                                <span>{t.deadline_label}: {item.global_deadline}</span>
                                                                                {item.days_overdue > 0 ? (
                                                                                    <span className="badge bg-red-500/15 text-red-500 text-[9px] px-1 py-px">
                                                                                        {item.days_overdue} {t.days_suffix}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-pg-text-muted">-</span>
                                                                                )}
                                                                            </div>
                                                                            {item.reason && (
                                                                                <div className="text-[10px] text-pg-danger italic mt-0.5">
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
                            <div className="flex bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden mb-5.5">
                                <div
                                    onClick={() => setMatrixFilter(prev =>
                                        prev?.type === 'finance_uninvoiced' ? null : { type: 'finance_uninvoiced', value: `${telemetry.finance_health.uninvoiced_count} Items`, label: language === 'id' ? 'Belum Difakturkan' : 'Uninvoiced Items' }
                                    )}
                                    className="flex-1 px-5 py-3.5 border-r border-white/5 flex items-center gap-3 cursor-pointer transition-all duration-200"
                                    style={{
                                        backgroundColor: matrixFilter?.type === 'finance_uninvoiced' ? 'rgba(37,99,235,0.1)' : 'transparent',
                                    }}
                                >
                                    <span className="text-xl">💼</span>
                                    <div>
                                        <div className="text-[10px] text-pg-text-muted font-bold uppercase tracking-wider mb-0.5">
                                            {language === 'id' ? 'Belum Difakturkan' : 'Uninvoiced Items'}
                                        </div>
                                        <div className="text-[22px] font-extrabold leading-none"
                                            style={{ color: telemetry.finance_health.uninvoiced_count > 0 ? 'var(--color-pg-warning)' : 'var(--color-pg-success)' }}>
                                            {telemetry.finance_health.uninvoiced_count}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setMatrixFilter(prev =>
                                        prev?.type === 'finance_unpaid' ? null : { type: 'finance_unpaid', value: `${telemetry.finance_health.unpaid_count} Items`, label: language === 'id' ? 'Belum Dibayar' : 'Unpaid Items' }
                                    )}
                                    className="flex-1 px-5 py-3.5 flex items-center gap-3 cursor-pointer transition-all duration-200"
                                    style={{
                                        backgroundColor: matrixFilter?.type === 'finance_unpaid' ? 'rgba(37,99,235,0.1)' : 'transparent',
                                    }}
                                >
                                    <span className="text-xl">💰</span>
                                    <div>
                                        <div className="text-[10px] text-pg-text-muted font-bold uppercase tracking-wider mb-0.5">
                                            {language === 'id' ? 'Belum Dibayar' : 'Unpaid Items'}
                                        </div>
                                        <div className="text-[22px] font-extrabold leading-none"
                                            style={{ color: telemetry.finance_health.unpaid_count > 0 ? 'var(--color-pg-orange)' : 'var(--color-pg-success)' }}>
                                            {telemetry.finance_health.unpaid_count}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Chart Row ─────────────────────────────────────────── */}
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5 mb-5.5">
                            {/* Output and Overdue Trends */}
                            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
                                <h3 className="text-sm font-bold text-pg-text mb-4">{t.production_overdue_trends}</h3>
                                <div className="w-full overflow-x-auto">
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
                                <div className="flex gap-4 mt-4 justify-center text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm" />
                                        <span className="text-pg-text-secondary">{t.legend_completed}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-block w-3 h-0.5 bg-red-500" />
                                        <span className="text-pg-text-secondary">{t.legend_overdue}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Why Delayed Pie */}
                            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
                                <h3 className="text-sm font-bold text-pg-text mb-4">{t.why_delayed_reasons}</h3>
                                <div className="flex items-center justify-center gap-6 flex-wrap">
                                    {(() => {
                                        const reasons = telemetry.delay_reasons || {};
                                        const total = Object.values(reasons).reduce((a: any, b: any) => a + b, 0) as number;
                                        const colors = ['#ef4444', 'var(--color-pg-warning)', '#3b82f6', 'var(--color-pg-success)', '#a855f7', 'var(--color-pg-orange)', 'var(--color-pg-text-muted)'];
                                        if (total === 0) {
                                            return (
                                                <div className="text-pg-text-muted text-sm py-10">
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
                        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 mb-5.5">
                            <h3 className="text-sm font-bold text-pg-text mb-4">{t.bottleneck_analyzer}</h3>
                            <div className="w-full overflow-x-auto">
                                <div className="bottleneck-table-container">
                                    <table className="w-full border-collapse text-sm">
                                        <thead>
                                            <tr className="border-b border-white/8">
                                                <th className="text-left px-4 py-2.5 text-pg-text-muted font-semibold">{t.stage}</th>
                                                <th className="text-center px-4 py-2.5 text-pg-text-muted font-semibold">{t.active_items}</th>
                                                <th className="text-center px-4 py-2.5 text-pg-text-muted font-semibold">{t.stuck_incidents}</th>
                                                <th className="text-center px-4 py-2.5 text-pg-text-muted font-semibold">{t.rework_count}</th>
                                                <th className="text-right px-4 py-2.5 text-pg-text-muted font-semibold">{t.avg_cycle_time}</th>
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
                                                    className="border-b border-white/4 text-zinc-300 cursor-pointer transition-all duration-200"
                                                    style={{
                                                        backgroundColor: matrixFilter?.type === 'stage' && matrixFilter?.value === metric.stage ? 'rgba(37,99,235,0.1)' : 'transparent',
                                                    }}
                                                >
                                                    <td className="px-4 py-2.5 font-bold">
                                                        <span style={{ color: matrixFilter?.type === 'stage' && matrixFilter?.value === metric.stage ? '#3b82f6' : 'inherit' }}>
                                                            {metric.stage.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">{metric.active_items}</td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        {metric.stuck_count > 0
                                                            ? <span className="badge bg-red-500/15 text-red-500">{metric.stuck_count} stuck</span>
                                                            : '0'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        {metric.rework_count > 0
                                                            ? <span className="badge bg-amber-500/15 text-pg-warning">{metric.rework_count} rework</span>
                                                            : '0'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-blue-500">{metric.avg_cycle_time.toFixed(2)}</td>
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
                                                className="rounded-xl p-3 flex flex-col gap-2 cursor-pointer"
                                                style={{
                                                    backgroundColor: isSelected ? 'rgba(37,99,235,0.1)' : 'var(--color-pg-card)',
                                                    border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.06)',
                                                }}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="font-extrabold text-sm" style={{ color: isSelected ? '#3b82f6' : 'var(--color-pg-text)' }}>
                                                        {metric.stage.toUpperCase()}
                                                    </span>
                                                    <span className="text-xs font-bold text-blue-500">
                                                        {metric.avg_cycle_time.toFixed(2)} {language === 'id' ? 'Hari' : 'Days'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-[11px] text-pg-text-secondary">
                                                    <span>{t.active_items}: <strong>{metric.active_items}</strong></span>
                                                    <span>•</span>
                                                    <span>
                                                        {t.stuck_incidents}: {metric.stuck_count > 0 ? (
                                                            <span className="badge bg-red-500/15 text-red-500 text-[10px] px-1.5 py-px">
                                                                {metric.stuck_count} stuck
                                                            </span>
                                                        ) : '0'}
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        {t.rework_count}: {metric.rework_count > 0 ? (
                                                            <span className="badge bg-amber-500/15 text-pg-warning text-[10px] px-1.5 py-px">
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
                            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 mb-4">
                                <div className="flex items-baseline gap-2.5 mb-4">
                                    <h3 className="text-base font-bold text-pg-text m-0">
                                        {language === 'id' ? 'Papan Kinerja Klien' : 'Client Performance Board'}
                                    </h3>
                                    <span className="text-[11px] text-zinc-600">
                                        {language === 'id' ? 'diurutkan berdasarkan risiko tertinggi' : 'sorted by highest risk'}
                                    </span>
                                </div>
                                <div className="w-full overflow-x-auto">
                                    <div className="client-table-container">
                                        <table className="w-full border-collapse text-sm">
                                            <thead>
                                                <tr className="border-b border-white/8">
                                                    <th className="text-left px-4 py-2.5 text-pg-text-muted font-semibold">
                                                        {language === 'id' ? 'Klien' : 'Client'}
                                                    </th>
                                                    <th className="text-center px-4 py-2.5 text-pg-text-muted font-semibold">
                                                        {language === 'id' ? 'PO Aktif' : 'Active POs'}
                                                    </th>
                                                    <th className="text-center px-4 py-2.5 text-pg-text-muted font-semibold">
                                                        {language === 'id' ? 'Ketepatan Waktu' : 'On-Time Rate'}
                                                    </th>
                                                    <th className="text-center px-4 py-2.5 text-pg-text-muted font-semibold">
                                                        {language === 'id' ? 'Item Terlambat' : 'Overdue Items'}
                                                    </th>
                                                    <th className="text-center px-4 py-2.5 text-pg-text-muted font-semibold">
                                                        {language === 'id' ? 'Belum Faktur' : 'Uninvoiced'}
                                                    </th>
                                                    <th className="text-center px-4 py-2.5 text-pg-text-muted font-semibold">
                                                        {language === 'id' ? 'Belum Bayar' : 'Unpaid'}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {telemetry.client_health.map((client: any, idx: number) => {
                                                    const otdrColor = client.on_time_rate == null
                                                        ? 'var(--color-pg-text-muted)'
                                                        : client.on_time_rate >= 80 ? 'var(--color-pg-success)'
                                                        : client.on_time_rate >= 60 ? 'var(--color-pg-warning)'
                                                        : '#ef4444';
                                                    const hasRisk = client.overdue_items > 0 || client.uninvoiced_count > 0 || client.unpaid_count > 0;
                                                    return (
                                                        <tr key={`client-${idx}`} className="border-b border-white/4 text-zinc-300"
                                                            style={{ backgroundColor: hasRisk ? 'rgba(239,68,68,0.015)' : 'transparent' }}>
                                                            <td
                                                                onClick={() => setMatrixFilter({ type: 'client', value: client.client_name, label: language === 'id' ? 'Klien' : 'Client' })}
                                                                className="px-4 py-2.75 font-bold cursor-pointer underline text-pg-primary-hover"
                                                            >
                                                                {client.client_name}
                                                            </td>
                                                            <td className="px-4 py-2.75 text-center text-pg-text-secondary">{client.active_pos}</td>
                                                            <td className="px-4 py-2.75 text-center">
                                                                {client.on_time_rate != null
                                                                    ? <span className="font-bold" style={{ color: otdrColor }}>{client.on_time_rate}%</span>
                                                                    : <span className="text-zinc-600 text-[11px]">N/A</span>}
                                                            </td>
                                                            <td
                                                                onClick={() => client.overdue_items > 0 && setMatrixFilter({ type: 'client_overdue', value: client.client_name, label: language === 'id' ? 'Overdue Klien' : 'Client Overdue' })}
                                                                className="px-4 py-2.75 text-center"
                                                                style={{ cursor: client.overdue_items > 0 ? 'pointer' : 'default' }}
                                                            >
                                                                {client.overdue_items > 0
                                                                    ? <span className="badge bg-red-500/15 text-red-500">{client.overdue_items}</span>
                                                                    : <span className="text-pg-text-muted">-</span>}
                                                            </td>
                                                            <td
                                                                onClick={() => client.uninvoiced_count > 0 && setMatrixFilter({ type: 'client_uninvoiced', value: client.client_name, label: language === 'id' ? 'Belum Difakturkan Klien' : 'Client Uninvoiced' })}
                                                                className="px-4 py-2.75 text-center"
                                                                style={{ cursor: client.uninvoiced_count > 0 ? 'pointer' : 'default' }}
                                                            >
                                                                {client.uninvoiced_count > 0
                                                                    ? <span className="badge bg-amber-500/15 text-pg-warning">{client.uninvoiced_count}</span>
                                                                    : <span className="text-pg-text-muted">-</span>}
                                                            </td>
                                                            <td
                                                                onClick={() => client.unpaid_count > 0 && setMatrixFilter({ type: 'client_unpaid', value: client.client_name, label: language === 'id' ? 'Belum Dibayar Klien' : 'Client Unpaid' })}
                                                                className="px-4 py-2.75 text-center"
                                                                style={{ cursor: client.unpaid_count > 0 ? 'pointer' : 'default' }}
                                                            >
                                                                {client.unpaid_count > 0
                                                                    ? <span className="badge bg-orange-500/15 text-pg-orange">{client.unpaid_count}</span>
                                                                    : <span className="text-pg-text-muted">-</span>}
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
                                                ? 'var(--color-pg-text-muted)'
                                                : client.on_time_rate >= 80 ? 'var(--color-pg-success)'
                                                : client.on_time_rate >= 60 ? 'var(--color-pg-warning)'
                                                : '#ef4444';
                                            return (
                                                <div
                                                    key={`client-mobile-${idx}`}
                                                    className="bg-pg-card border border-white/6 rounded-xl p-3 flex flex-col gap-2"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span
                                                            onClick={() => setMatrixFilter({ type: 'client', value: client.client_name, label: language === 'id' ? 'Klien' : 'Client' })}
                                                            className="font-extrabold text-sm cursor-pointer underline text-pg-primary-hover"
                                                        >
                                                            {client.client_name}
                                                        </span>
                                                        <span className="text-xs font-bold" style={{ color: otdrColor }}>
                                                            {client.on_time_rate != null ? `${client.on_time_rate}% OTD` : 'N/A OTD'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-pg-text-secondary">
                                                        {language === 'id' ? 'PO Aktif' : 'Active POs'}: <strong>{client.active_pos}</strong>
                                                    </div>
                                                    <div className="flex justify-between items-center border-t border-white/4 pt-2 text-[11px]">
                                                        <div
                                                            onClick={() => client.overdue_items > 0 && setMatrixFilter({ type: 'client_overdue', value: client.client_name, label: language === 'id' ? 'Overdue Klien' : 'Client Overdue' })}
                                                            className="flex flex-col items-center gap-0.75 flex-1"
                                                            style={{ cursor: client.overdue_items > 0 ? 'pointer' : 'default' }}
                                                        >
                                                            <span className="text-pg-text-muted text-[10px]">{language === 'id' ? 'Terlambat' : 'Overdue'}</span>
                                                            {client.overdue_items > 0 ? (
                                                                <span className="badge bg-red-500/15 text-red-500 px-1.5 py-0.5">{client.overdue_items}</span>
                                                            ) : (
                                                                <span className="text-pg-text-muted">-</span>
                                                            )}
                                                        </div>
                                                        <div
                                                            onClick={() => client.uninvoiced_count > 0 && setMatrixFilter({ type: 'client_uninvoiced', value: client.client_name, label: language === 'id' ? 'Belum Difakturkan Klien' : 'Client Uninvoiced' })}
                                                            className="flex flex-col items-center gap-0.75 flex-1"
                                                            style={{ cursor: client.uninvoiced_count > 0 ? 'pointer' : 'default' }}
                                                        >
                                                            <span className="text-pg-text-muted text-[10px]">{language === 'id' ? 'Faktur' : 'Invoice'}</span>
                                                            {client.uninvoiced_count > 0 ? (
                                                                <span className="badge bg-amber-500/15 text-pg-warning px-1.5 py-0.5">{client.uninvoiced_count}</span>
                                                            ) : (
                                                                <span className="text-pg-text-muted">-</span>
                                                            )}
                                                        </div>
                                                        <div
                                                            onClick={() => client.unpaid_count > 0 && setMatrixFilter({ type: 'client_unpaid', value: client.client_name, label: language === 'id' ? 'Belum Dibayar Klien' : 'Client Unpaid' })}
                                                            className="flex flex-col items-center gap-0.75 flex-1"
                                                            style={{ cursor: client.unpaid_count > 0 ? 'pointer' : 'default' }}
                                                        >
                                                            <span className="text-pg-text-muted text-[10px]">{language === 'id' ? 'Bayar' : 'Paid'}</span>
                                                            {client.unpaid_count > 0 ? (
                                                                <span className="badge bg-orange-500/15 text-pg-orange px-1.5 py-0.5">{client.unpaid_count}</span>
                                                            ) : (
                                                                <span className="text-pg-text-muted">-</span>
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
                    PURCHASING:   { bg: 'rgba(249,115,22,0.12)',   color: 'var(--color-pg-orange)' },
                    MACHINING:    { bg: 'rgba(20,184,166,0.12)',   color: '#14b8a6' },
                    FABRICATION:  { bg: 'rgba(99,102,241,0.12)',   color: 'var(--color-pg-primary)' },
                    PRODUCTION:   { bg: 'rgba(100,116,139,0.12)',  color: 'var(--color-pg-text-muted)' },
                    QC:           { bg: 'rgba(248,113,113,0.12)',    color: 'var(--color-pg-danger)' },
                    DELIVERY:     { bg: 'rgba(16,185,129,0.12)',   color: 'var(--color-pg-success)' },
                    STAFF:        { bg: 'rgba(99,102,241,0.12)',   color: 'var(--color-pg-primary-hover)' },
                    FINANCE:      { bg: 'rgba(236,72,153,0.12)',   color: '#ec4899' },
                };

                return (
                <div>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <div>
                                <h2 className="text-lg font-bold m-0 mb-0.5">{t.team_title}</h2>
                                <p className="text-xs text-pg-text-muted m-0">{t.team_subtitle}</p>
                            </div>
                            <button
                                onClick={openAddUser}
                                className="px-3.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-pg-success text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                                <Plus size={14} /> {t.add_user}
                            </button>
                        </div>

                        {/* Role Filters: Dropdown for Mobile, Pills for Desktop (Rule: No side scrolling on mobile) */}
                        <div style={{ marginBottom: '16px' }}>
                            {/* Mobile Dropdown View */}
                            <div className="show-mobile-only">
                                <label className="block text-[11px] text-pg-text-muted mb-1.5 font-semibold uppercase">
                                    {language === 'en' ? 'Filter by Role' : 'Saring berdasarkan Role'}
                                </label>
                                <select
                                    value={userRoleFilter}
                                    onChange={e => setUserRoleFilter(e.target.value)}
                                    className="w-full p-2.5 px-3.5 bg-slate-900/60 border border-white/8 rounded-lg text-pg-text text-sm font-semibold outline-none"
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
                            <div className="hide-mobile-only flex gap-1.5 flex-wrap items-center">
                                <button
                                    onClick={() => setUserRoleFilter('ALL')}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid',
                                        borderColor: userRoleFilter === 'ALL' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.08)',
                                        backgroundColor: userRoleFilter === 'ALL' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.05)',
                                        color: userRoleFilter === 'ALL' ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-text-secondary)',
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
                                                    ? (roleColorMap[role]?.color || 'var(--color-pg-text-muted)')
                                                    : 'rgba(255,255,255,0.08)',
                                                backgroundColor: userRoleFilter === role
                                                    ? (roleColorMap[role]?.bg || 'rgba(255,255,255,0.06)')
                                                    : 'rgba(255,255,255,0.05)',
                                                color: userRoleFilter === role
                                                    ? (roleColorMap[role]?.color || 'var(--color-pg-text-muted)')
                                                    : 'var(--color-pg-text-secondary)',
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
                            <div className="text-center p-10 text-pg-text-muted text-sm">
                                {t.no_users}
                            </div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                                    {filteredUsers.map(user => {
                                        const isSelf = user.id === auth_user?.id;
                                        const loginMethod = user.username ? 'PASSWORD' : 'PIN';
                                        const roleStyle = roleColorMap[user.role_name] || { bg: 'rgba(100,116,139,0.12)', color: 'var(--color-pg-text-muted)' };
                                        return (
                                            <div
                                                key={user.id}
                                                className="user-card bg-slate-900/60 border border-white/6 rounded-xl p-4 flex flex-col gap-2.5"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0"
                                                        style={{
                                                            backgroundColor: roleStyle.bg,
                                                            border: `1px solid ${roleStyle.color}30`,
                                                            color: roleStyle.color,
                                                        }}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-sm font-bold text-pg-text">
                                                                {user.name}
                                                            </span>
                                                            {isSelf && (
                                                                <span className="text-[10px] bg-blue-500/15 text-blue-500 px-1.5 py-px rounded font-bold">
                                                                    {t.user_self_badge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {user.username && (
                                                            <div className="text-[11px] text-pg-text-muted mt-px">@{user.username}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-1.5 flex-wrap">
                                                    <span className="text-[10px] font-bold px-2 py-[3px] rounded-md"
                                                        style={{ backgroundColor: roleStyle.bg, color: roleStyle.color }}>
                                                        {localizedDisplay({ display_name: user.role_display_name, display_name_id: user.role_display_name_id }, language)}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-[3px] rounded-md"
                                                        style={{
                                                            backgroundColor: loginMethod === 'PASSWORD'
                                                                ? 'rgba(99,102,241,0.12)'
                                                                : 'rgba(16,185,129,0.1)',
                                                            color: loginMethod === 'PASSWORD' ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-success)',
                                                        }}>
                                                        {loginMethod === 'PASSWORD' ? '🔑 ' + t.login_method_password : '🔢 ' + t.login_method_pin}
                                                    </span>
                                                </div>

                                                {!(isOwner && user.is_owner && !isSelf) && (
                                                    <button
                                                        id={`edit-user-${user.id}`}
                                                        onClick={() => openEditUser(user)}
                                                        className="py-2 bg-white/4 border border-white/8 rounded-lg text-pg-text-secondary text-xs font-semibold cursor-pointer w-full text-center"
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
                        <div className="mt-8 bg-slate-900/60 border border-white/6 rounded-2xl p-6">
                            <div className="mb-4">
                                <h3 className="text-base font-extrabold text-pg-text m-0 mb-1">
                                    {language === 'en' ? 'Workflow & Validation Rules' : 'Aturan Alur Kerja & Validasi'}
                                </h3>
                                <p className="text-xs text-pg-text-muted m-0">
                                    {language === 'en' 
                                        ? 'Define rules and locks between design, material purchasing, production, QC, and delivery stages.' 
                                        : 'Tentukan aturan dan kuncian antara tahap desain, pembelian bahan, produksi, QC, dan pengiriman.'}
                                </p>
                            </div>

                            <form onSubmit={saveWorkflowSettings}>
                                {/* Mode Selection Group */}
                                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 mb-5">
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
                                                className="rounded-xl p-4 cursor-pointer transition-all duration-200"
                                                style={{
                                                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)',
                                                    border: '1px solid',
                                                    borderColor: isSelected ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.06)',
                                                }}
                                            >
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className="w-4 h-4 rounded-full box-border"
                                                        style={{
                                                            border: isSelected ? '5px solid var(--color-pg-primary)' : '2px solid rgba(255,255,255,0.2)',
                                                            backgroundColor: isSelected ? '#fff' : 'transparent',
                                                        }} />
                                                    <span className="text-sm font-bold" style={{ color: isSelected ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-text)' }}>
                                                        {mode.label}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-pg-text-secondary m-0">{mode.desc}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Custom Toggles Box */}
                                {workflowMode === 'custom' && (
                                    <div className="bg-black/20 rounded-xl p-4 mb-5 flex flex-col gap-3 border border-white/4">
                                        {[
                                            { state: reqDesign, setter: setReqDesign, label: language === 'en' ? 'Require Design Approved (APPROVED) to start Production' : 'Wajib Desain Disetujui (APPROVED) untuk memulai Produksi' },
                                            { state: reqMaterial, setter: setReqMaterial, label: language === 'en' ? 'Require Material Ready (READY) to start Production' : 'Wajib Bahan Siap (READY) untuk memulai Produksi' },
                                            { state: reqProductionForQc, setter: setReqProductionForQc, label: language === 'en' ? 'Require Production Completed to start QC' : 'Wajib Produksi Selesai untuk memulai QC' },
                                            { state: reqQcForDelivery, setter: setReqQcForDelivery, label: language === 'en' ? 'Require QC Completed to start Delivery' : 'Wajib QC Selesai untuk memulai Pengiriman' },
                                            { state: reqDeliveryForFinance, setter: setReqDeliveryForFinance, label: language === 'en' ? 'Require Delivery Completed to start Finance stage' : 'Wajib Pengiriman Selesai untuk memulai Keuangan' }
                                        ].map((rule, idx) => (
                                            <label key={idx} className="flex items-center gap-2.5 cursor-pointer text-sm text-zinc-300">
                                                <input
                                                    type="checkbox"
                                                    checked={rule.state}
                                                    onChange={e => rule.setter(e.target.checked)}
                                                    style={{
                                                        width: '16px', height: '16px', borderRadius: '4px',
                                                        accentColor: 'var(--color-pg-primary)', cursor: 'pointer'
                                                    }}
                                                />
                                                {rule.label}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingSettings}
                                        className="px-4.5 py-2 rounded-lg text-white text-sm font-bold border-none transition-all duration-200"
                                        style={{
                                            backgroundColor: isSavingSettings ? 'rgba(99,102,241,0.5)' : 'var(--color-pg-primary)',
                                            cursor: isSavingSettings ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {isSavingSettings 
                                            ? (language === 'en' ? 'Saving...' : 'Menyimpan...') 
                                            : (language === 'en' ? 'Save Settings' : 'Simpan Pengaturan')}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* ── Stage Templates Section ───────────────────────── */}
                        <div className="mt-8 bg-slate-900/60 border border-white/6 rounded-2xl p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-extrabold text-pg-text m-0 mb-1">{t.stage_templates}</h3>
                                    <p className="text-xs text-pg-text-muted m-0">{t.stage_templates_subtitle}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingTemplate(null);
                                        setTemplateFormName('');
                                        setTemplateFormDesc('');
                                        setTemplateFormStages([]);
                                        setShowTemplateModal(true);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-white text-xs font-bold border-none transition-all duration-200 cursor-pointer"
                                    style={{ backgroundColor: 'var(--color-pg-primary)' }}
                                >
                                    + {t.add_template}
                                </button>
                            </div>

                            {stageTemplates.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-pg-text-muted m-0">{t.no_templates}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {stageTemplates.map(tmpl => (
                                        <div key={tmpl.id} className="flex items-center justify-between bg-black/20 rounded-xl p-3 border border-white/4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-bold text-pg-text">{tmpl.name}</span>
                                                    {tmpl.description && (
                                                        <span className="text-xs text-pg-text-muted truncate">{tmpl.description}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {tmpl.stages.map(s => (
                                                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded"
                                                            style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-3 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingTemplate(tmpl);
                                                        setTemplateFormName(tmpl.name);
                                                        setTemplateFormDesc(tmpl.description || '');
                                                        setTemplateFormStages([...tmpl.stages]);
                                                        setShowTemplateModal(true);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-white/8 cursor-pointer transition-all duration-200"
                                                    style={{ color: 'var(--color-pg-text)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                                                >
                                                    {t.edit_template}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm(` ${t.delete_template_confirm}`)) {
                                                            router.post(`/stage-templates/${tmpl.id}/delete`, {}, {
                                                                preserveState: true,
                                                                preserveScroll: true,
                                                                onSuccess: () => {
                                                                    setStageTemplates(prev => prev.filter(st => st.id !== tmpl.id));
                                                                },
                                                            });
                                                        }
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold border-none cursor-pointer transition-all duration-200"
                                                    style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}
                                                >
                                                    {t.delete_template}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {confirmAlert.element}

            {/* ── Edit User Modal (Task 1b / 1c / 1d) ────────────────────── */}
            {editingUser && (
                <div
                    id="edit-user-modal"
                    className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[60] p-5"
                    onClick={e => { if (e.target === e.currentTarget) closeEditUser(); }}
                >
                    <div className="bg-pg-card border border-white/8 rounded-2xl p-6 shadow-2xl w-full max-w-[460px] max-h-[90vh] overflow-y-auto">
                        {/* Modal header */}
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h2 className="text-lg font-extrabold m-0 mb-1">{t.edit_user}</h2>
                                <p className="text-xs text-pg-text-muted m-0">{editingUser.name}</p>
                            </div>
                            <button
                                onClick={closeEditUser}
                                className="bg-transparent border-none text-pg-text-muted text-xl cursor-pointer leading-none px-1"
                            >×</button>
                        </div>

                        <form onSubmit={submitEditUser}>
                            {/* Name */}
                            <div className="mb-3.5">
                                <label className="block text-xs text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.user_name_label}
                                </label>
                                <input
                                    id="edit-user-name"
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    required
                                    className="w-full p-2.5 px-3 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                />
                            </div>

                            {/* Role */}
                            <div className="mb-3.5">
                                <label className="block text-xs text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.user_role_label}
                                </label>
                                <select
                                    id="edit-user-role"
                                    value={editRole}
                                    onChange={e => setEditRole(e.target.value)}
                                    disabled={editingUser.is_owner}
                                    className="w-full p-2.5 px-3 bg-pg-bg border border-white/8 rounded-lg text-sm outline-none box-border"
                                    style={{ color: editingUser.is_owner ? 'var(--color-pg-text-muted)' : '#fff' }}
                                >
                                    {(roles ?? []).map(r => (
                                        <option key={r.id} value={r.id}>{localizedDisplay(r, language)} ({r.name})</option>
                                    ))}
                                </select>
                                {editingUser.is_owner && (
                                    <p className="text-[11px] text-pg-text-muted mt-1 m-0">Owner role cannot be changed.</p>
                                )}
                            </div>

                            {/* Post */}
                            <div className="mb-3.5">
                                <label className="block text-xs text-pg-text-secondary mb-1.5 font-semibold">
                                    Post
                                </label>
                                <select
                                    id="edit-user-post"
                                    value={editPostId}
                                    onChange={e => setEditPostId(e.target.value)}
                                    disabled={editingUser.is_owner}
                                    className="w-full p-2.5 px-3 bg-pg-bg border border-white/8 rounded-lg text-sm outline-none box-border"
                                    style={{ color: editingUser.is_owner ? 'var(--color-pg-text-muted)' : '#fff' }}
                                >
                                    <option value="">-- No post --</option>
                                    {(posts ?? []).map(p => (
                                        <option key={p.id} value={p.id}>{localizedDisplay(p, language)} ({p.name})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Login Method toggle */}
                            <div className="mb-3.5">
                                <label className="block text-xs text-pg-text-secondary mb-2 font-semibold">
                                    {t.user_login_label}
                                </label>
                                <div className="flex gap-2">
                                    {(['PASSWORD', 'PIN'] as const).map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setEditLoginMethod(method)}
                                            className="flex-1 py-2 rounded-lg border text-xs font-bold cursor-pointer"
                                            style={{
                                                borderColor: editLoginMethod === method ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                                                backgroundColor: editLoginMethod === method ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                                                color: editLoginMethod === method ? '#3b82f6' : 'var(--color-pg-text-secondary)',
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
                                    <div className="mb-3.5">
                                        <label className="block text-xs text-pg-text-secondary mb-1.5 font-semibold">
                                            {t.admin_username}
                                        </label>
                                        <input
                                            id="edit-user-username"
                                            type="text"
                                            value={editUsername}
                                            onChange={e => setEditUsername(e.target.value)}
                                            required
                                            className="w-full p-2.5 px-3 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                        />
                                    </div>
                                    <div className="mb-3.5">
                                        <label className="block text-xs text-pg-text-secondary mb-1.5 font-semibold">
                                            {t.new_password_label}
                                        </label>
                                        <input
                                            id="edit-user-password"
                                            type="password"
                                            value={editPassword}
                                            onChange={e => setEditPassword(e.target.value)}
                                            minLength={6}
                                            placeholder="••••••••"
                                            className="w-full p-2.5 px-3 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                        />
                                    </div>
                                </>
                            )}
                            
                            {/* PIN field */}
                            {editLoginMethod === 'PIN' && (
                                <div className="mb-3.5">
                                    <label className="block text-xs text-pg-text-secondary mb-1.5 font-semibold">
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
                                        className="w-full p-2.5 px-3 bg-pg-bg border border-white/8 rounded-lg text-white text-lg outline-none box-border"
                                        style={{ letterSpacing: '0.3em' }}
                                    />
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2.5 mt-5 flex-wrap">
                                {/* Delete — only if not self */}
                                {editingUser.id !== auth_user?.id && (
                                    <button
                                        type="button"
                                        id={`delete-user-${editingUser.id}`}
                                        onClick={() => handleDeleteUser(editingUser)}
                                        className="px-4 py-2.5 bg-red-500/10 border border-red-500/25 text-red-500 rounded-lg font-semibold text-sm cursor-pointer"
                                    >
                                        🗑️ {t.delete_user}
                                    </button>
                                )}
                                <div className="flex-1" />
                                <button
                                    type="button"
                                    onClick={closeEditUser}
                                    className="px-4 py-2.5 bg-white/5 border border-white/8 text-zinc-300 rounded-lg font-semibold text-sm cursor-pointer"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    id={`save-user-${editingUser.id}`}
                                    disabled={editSubmitting}
                                    className="px-5 py-2.5 border-none text-white rounded-xl font-semibold text-sm"
                                    style={{
                                        background: editSubmitting ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[50] p-5">
                    <div className="bg-pg-card border border-white/8 rounded-2xl p-6 shadow-2xl w-full max-w-[420px] max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-extrabold m-0 mb-2">
                            {t.add_user_title}
                        </h2>
                        <p className="text-sm text-pg-text-muted m-0 mb-6">
                            {t.add_user_subtitle}
                        </p>

                        <form onSubmit={submitAddUser}>
                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.user_name_label}
                                </label>
                                <input
                                    type="text"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    required
                                    placeholder="e.g. John Doe"
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.user_role_label}
                                </label>
                                <select
                                    value={newUserRoleId ?? ''}
                                    onChange={e => setNewUserRoleId(Number(e.target.value))}
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                >
                                    <option value="">-- Select role --</option>
                                    {(roles ?? []).map(r => (
                                        <option key={r.id} value={r.id}>{localizedDisplay(r, language)} ({r.name})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    Post
                                </label>
                                <select
                                    value={newUserPostId}
                                    onChange={e => setNewUserPostId(e.target.value)}
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                >
                                    <option value="">-- No post --</option>
                                    {(posts ?? []).map(p => (
                                        <option key={p.id} value={p.id}>{localizedDisplay(p, language)} ({p.name})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs text-pg-text-secondary mb-2 font-semibold">
                                    {t.user_login_label}
                                </label>
                                <div className="flex gap-2">
                                    {(['PASSWORD', 'PIN'] as const).map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setNewUserLoginMethod(method)}
                                            className="flex-1 py-2 rounded-lg border text-xs font-bold cursor-pointer"
                                            style={{
                                                borderColor: newUserLoginMethod === method ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                                                backgroundColor: newUserLoginMethod === method ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                                                color: newUserLoginMethod === method ? '#3b82f6' : 'var(--color-pg-text-secondary)',
                                            }}
                                        >
                                            {method === 'PASSWORD' ? '🔑 ' + t.login_method_password : '🔢 ' + t.login_method_pin}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newUserLoginMethod === 'PASSWORD' && (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                            {t.admin_username}
                                        </label>
                                        <input
                                            type="text"
                                            value={newUserUsername}
                                            onChange={(e) => setNewUserUsername(e.target.value)}
                                            required
                                            placeholder="e.g. john.worker"
                                            className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                        />
                                    </div>
                                    <div className="mb-6">
                                        <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                            {t.admin_password}
                                        </label>
                                        <input
                                            type="password"
                                            value={newUserPassword}
                                            onChange={(e) => setNewUserPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            placeholder="••••••••"
                                            className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none box-border"
                                        />
                                    </div>
                                </>
                            )}
                            
                            {newUserLoginMethod === 'PIN' && (
                                <div className="mb-6">
                                    <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
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
                                        className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-lg outline-none box-border"
                                        style={{ letterSpacing: '0.3em' }}
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowAddUserModal(false)}
                                    className="px-4 py-2.5 bg-white/5 border border-white/8 text-zinc-300 rounded-lg font-semibold cursor-pointer"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={addUserSubmitting}
                                    className="px-5 py-2.5 border-none text-white rounded-xl font-semibold"
                                    style={{
                                        background: addUserSubmitting ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[50] p-5">
                    <div className="bg-pg-card border border-white/8 rounded-2xl p-6 shadow-2xl w-full max-w-[420px]">
                        <h2 className="text-xl font-extrabold m-0 mb-2">
                            {t.create_admin}
                        </h2>
                        <p className="text-sm text-pg-text-muted m-0 mb-6">
                            {t.admin_subtitle}
                        </p>

                        <form onSubmit={submitAddAdmin}>
                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.admin_name}
                                </label>
                                <input
                                    type="text"
                                    value={adminName}
                                    onChange={(e) => setAdminName(e.target.value)}
                                    required
                                    placeholder="e.g. Joko Widodo"
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    Role
                                </label>
                                <select
                                    value={adminRoleId ?? ''}
                                    onChange={e => setAdminRoleId(Number(e.target.value))}
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                >
                                    <option value="">-- Select role --</option>
                                    {(roles ?? []).map(r => (
                                        <option key={r.id} value={r.id}>{localizedDisplay(r, language)} ({r.name})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    Post
                                </label>
                                <select
                                    id="add-admin-post"
                                    value={adminPostId ?? ''}
                                    onChange={e => setAdminPostId(Number(e.target.value))}
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                >
                                    <option value="">-- Select post --</option>
                                    {(posts ?? []).map(p => (
                                        <option key={p.id} value={p.id}>{localizedDisplay(p, language)} ({p.name})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.admin_username}
                                </label>
                                <input
                                    type="text"
                                    value={adminUsername}
                                    onChange={(e) => setAdminUsername(e.target.value)}
                                    required
                                    placeholder="e.g. joko.admin"
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                />
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-sm text-pg-text-secondary mb-1.5 font-semibold">
                                    {t.admin_password}
                                </label>
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="••••••••"
                                    className="w-full p-2.5 px-3.5 bg-pg-bg border border-white/8 rounded-lg text-white text-sm outline-none"
                                />
                            </div>
                            
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowAddAdminModal(false)}
                                    className="px-4 py-2.5 bg-white/5 border border-white/8 text-zinc-300 rounded-lg font-semibold cursor-pointer"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={adminSubmitting}
                                    className="px-5 py-2.5 border-none text-white rounded-xl font-semibold"
                                    style={{
                                        background: adminSubmitting ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
                        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-start justify-center z-[100] p-10 px-5"
                        onClick={e => { if (e.target === e.currentTarget) setShowSearchModal(false); }}
                    >
                        <div className="bg-pg-card border border-white/8 rounded-2xl p-6 shadow-2xl w-full max-w-[640px] max-h-[80vh] flex flex-col">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-extrabold m-0">
                                    {language === 'en' ? 'Search Directory' : 'Cari Data'}
                                </h3>
                                <button
                                    onClick={() => setShowSearchModal(false)}
                                    className="bg-transparent border-none text-pg-text-muted text-xl cursor-pointer leading-none px-1"
                                >×</button>
                            </div>
                            
                            {/* Search Input */}
                            <div className="relative mb-4 shrink-0">
                                <Search size={18} className="absolute left-3.5 top-3.5 text-pg-text-muted" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder={language === 'en' ? "Search POs, items, clients, or issues..." : "Cari nomor PO, barang, klien, atau kendala..."}
                                    autoFocus
                                    className="w-full py-3 px-4 pl-[42px] bg-pg-bg border border-white/8 rounded-xl text-white text-sm outline-none box-border"
                                />
                            </div>

                            {/* Results list */}
                            <div className="flex-1 overflow-y-auto pr-1">
                                {!searchQuery.trim() ? (
                                    <div className="text-center p-10 px-5 text-pg-text-muted">
                                        <div className="text-2xl mb-3">🔍</div>
                                        <p className="text-sm font-semibold m-0 mb-1">
                                            {language === 'en' ? 'Search POs, Items, Clients & Issues' : 'Cari PO, Barang, Klien & Kendala'}
                                        </p>
                                        <p className="text-xs m-0">
                                            {language === 'en' ? 'Type above to query client names, PO numbers, item statuses, and logged trouble reports.' : 'Ketik di atas untuk mencari nama klien, nomor PO, status barang, dan laporan kendala.'}
                                        </p>
                                    </div>
                                ) : totalResults === 0 ? (
                                    <div className="text-center p-10 px-5 text-pg-text-muted">
                                        <div className="text-2xl mb-3">📭</div>
                                        <p className="text-sm font-semibold m-0 mb-1">
                                            {language === 'en' ? 'No results found' : 'Tidak ada hasil'}
                                        </p>
                                        <p className="text-xs m-0">
                                            {language === 'en' ? `No matches found for "${searchQuery}"` : `Tidak ada hasil pencarian untuk "${searchQuery}"`}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-5">
                                        {/* 1. Alerts / Issues Section */}
                                        {results.alerts.length > 0 && (
                                            <div>
                                                <h4 className="text-[11px] text-pg-primary-hover font-bold uppercase mb-2 tracking-wider">
                                                    {language === 'en' ? 'Alerts & Operational Issues' : 'Kendala & Masalah Operasional'}
                                                </h4>
                                                <div className="flex flex-col gap-2">
                                                    {results.alerts.map((issue: any) => {
                                                        const badgeColor = issue.severity === 'RED' ? '#ef4444' 
                                                            : issue.severity === 'BLUE' ? '#3b82f6' 
                                                            : issue.severity === 'ORANGE' ? 'var(--color-pg-orange)'
                                                            : 'var(--color-pg-warning)';

                                                        return (
                                                            <div
                                                                key={issue.id}
                                                                onClick={() => handleSearchAlertClick(issue.id.replace('alert-db-', '').replace('alert-pin-', ''))}
                                                                className="bg-white/3 border border-white/6 rounded-lg p-3 cursor-pointer transition-all duration-150 hover-grow"
                                                            >
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded text-white"
                                                                        style={{ backgroundColor: badgeColor }}>
                                                                        {issue.title}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm m-0 text-pg-text">{issue.message}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* 2. Purchase Orders Section */}
                                        {results.pos.length > 0 && (
                                            <div>
                                                <h4 className="text-[11px] text-pg-primary-hover font-bold uppercase mb-2 tracking-wider">
                                                    {language === 'en' ? 'Purchase Orders (POs)' : 'Daftar PO'}
                                                </h4>
                                                <div className="flex flex-col gap-2">
                                                    {results.pos.map((po: any) => {
                                                        const itemsProgress = po.items.length > 0
                                                            ? Math.round(po.items.reduce((sum: number, item: any) => sum + parseFloat(item.progress_percent), 0) / po.items.length)
                                                            : 0;

                                                        return (
                                                            <div
                                                                key={po.id}
                                                                onClick={() => handleSearchItemClick(po.id)}
                                                                className="bg-white/3 border border-white/6 rounded-lg p-3 cursor-pointer hover-grow"
                                                            >
                                                                <div className="flex justify-between items-center mb-1.5">
                                                                    <span className="text-sm font-extrabold text-pg-text">{po.po_number}</span>
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                                        style={{
                                                                            color: po.status === 'COMPLETED' || po.status === 'DELIVERED' || po.status === 'CLOSED' ? 'var(--color-pg-success)' : 'var(--color-pg-warning)',
                                                                            backgroundColor: po.status === 'COMPLETED' || po.status === 'DELIVERED' || po.status === 'CLOSED' ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.12)',
                                                                        }}>
                                                                        {po.status}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between text-xs text-pg-text-secondary mb-1.5">
                                                                    <span>{po.client_name}</span>
                                                                    <span>{language === 'en' ? 'Deadline: ' : 'Tenggat: '} {new Date(po.global_deadline).toLocaleDateString()}</span>
                                                                </div>
                                                                {/* Progress Bar */}
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 h-1.5 bg-white/8 rounded-sm overflow-hidden">
                                                                        <div style={{ width: `${itemsProgress}%`, height: '100%', backgroundColor: po.status === 'COMPLETED' || po.status === 'DELIVERED' || po.status === 'CLOSED' ? '#10b981' : 'var(--color-pg-primary)', borderRadius: '3px' }} />
                                                                    </div>
                                                                    <span className="text-[11px] font-bold text-pg-text">{itemsProgress}%</span>
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
                                                <h4 className="text-[11px] text-pg-primary-hover font-bold uppercase mb-2 tracking-wider">
                                                    {language === 'en' ? 'Items & Components' : 'Barang & Komponen'}
                                                </h4>
                                                <div className="flex flex-col gap-2">
                                                    {results.items.map((item: any) => {
                                                        const progress = Math.round(parseFloat(item.progress_percent));

                                                        return (
                                                            <div
                                                                key={`${item.po_id}-${item.id}`}
                                                                onClick={() => handleSearchItemClick(item.po_id, item.id)}
                                                                className="bg-white/3 border border-white/6 rounded-lg p-3 cursor-pointer hover-grow"
                                                            >
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-sm font-bold text-pg-text">{item.item_name}</span>
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                                        style={{
                                                                            color: item.status === 'COMPLETED' ? 'var(--color-pg-success)' : '#a855f7',
                                                                            backgroundColor: item.status === 'COMPLETED' ? 'rgba(16,185,129,0.12)' : 'rgba(168,85,247,0.12)',
                                                                        }}>
                                                                        {item.status}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[11px] text-pg-text-secondary mb-2">
                                                                    {item.client_name} &middot; PO {item.po_number}
                                                                </div>
                                                                {/* Progress Bar */}
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 h-1 bg-white/8 rounded-sm overflow-hidden">
                                                                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: item.status === 'COMPLETED' ? '#10b981' : '#a855f7', borderRadius: '2px' }} />
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-pg-text">{progress}%</span>
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
                                                <h4 className="text-[11px] text-pg-primary-hover font-bold uppercase mb-2 tracking-wider">
                                                    {language === 'en' ? 'Clients' : 'Klien'}
                                                </h4>
                                                <div className="grid grid-cols-1 gap-2">
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
                                                                className="bg-white/3 border border-white/6 rounded-lg p-3 cursor-pointer flex justify-between items-center hover-grow"
                                                            >
                                                                <span className="text-sm font-bold text-pg-text">{clientName}</span>
                                                                <div className="flex gap-2">
                                                                    <span className="text-[10px] text-pg-warning bg-amber-500/12 px-1.5 py-0.5 rounded font-semibold">
                                                                        {activeCount} {language === 'en' ? 'Active' : 'Aktif'}
                                                                    </span>
                                                                    <span className="text-[10px] text-pg-success bg-emerald-500/12 px-1.5 py-0.5 rounded font-semibold">
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

            {/* ── Template Create/Edit Modal ─────────────────────────────── */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[60]"
                    onClick={e => { if (e.target === e.currentTarget) setShowTemplateModal(false); }}>
                    <div className="bg-pg-card border border-white/8 rounded-2xl p-6 shadow-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-base font-extrabold text-pg-text m-0">
                                {editingTemplate ? t.edit_template : t.add_template}
                            </h3>
                            <button onClick={() => setShowTemplateModal(false)}
                                className="bg-transparent border-none text-pg-text-muted text-xl cursor-pointer leading-none px-1">&times;</button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (!templateFormName.trim() || templateFormStages.length === 0) return;
                            setIsSavingTemplate(true);
                            const url = editingTemplate
                                ? `/stage-templates/${editingTemplate.id}/update`
                                : '/stage-templates';
                            router.post(url, {
                                name: templateFormName.trim(),
                                description: templateFormDesc.trim() || '',
                                stages: templateFormStages,
                            }, {
                                preserveState: true,
                                preserveScroll: true,
                                onSuccess: () => {
                                    setShowTemplateModal(false);
                                    setTemplateFormName('');
                                    setTemplateFormDesc('');
                                    setTemplateFormStages([]);
                                    setIsSavingTemplate(false);
                                    fetch('/stage-templates')
                                        .then(res => res.json())
                                        .then(data => {
                                            if (data.templates) setStageTemplates(data.templates);
                                        })
                                        .catch(() => {});
                                },
                                onError: () => setIsSavingTemplate(false),
                                onFinish: () => setIsSavingTemplate(false),
                            });
                        }}>
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-pg-text-muted mb-1.5">{t.template_name}</label>
                                    <input type="text" value={templateFormName}
                                        onChange={e => setTemplateFormName(e.target.value)}
                                        placeholder={t.template_name_placeholder}
                                        className="w-full px-3 py-2.5 bg-pg-bg border border-white/8 rounded-xl text-white text-sm outline-none box-border"
                                        required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-pg-text-muted mb-1.5">{t.template_description}</label>
                                    <input type="text" value={templateFormDesc}
                                        onChange={e => setTemplateFormDesc(e.target.value)}
                                        placeholder={t.template_desc_placeholder}
                                        className="w-full px-3 py-2.5 bg-pg-bg border border-white/8 rounded-xl text-white text-sm outline-none box-border" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-pg-text-muted mb-2">{t.select_stages_hint}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {ALL_STAGES_TEMPLATE.map(stage => {
                                            const isSelected = templateFormStages.includes(stage);
                                            return (
                                                <button key={stage} type="button"
                                                    onClick={() => {
                                                        setTemplateFormStages(prev =>
                                                            prev.includes(stage)
                                                                ? prev.filter(s => s !== stage)
                                                                : [...prev, stage]
                                                        );
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all duration-150 cursor-pointer"
                                                    style={{
                                                        borderColor: isSelected ? '#818cf8' : 'rgba(255,255,255,0.08)',
                                                        backgroundColor: isSelected ? 'rgba(99,102,241,0.2)' : 'transparent',
                                                        color: isSelected ? '#818cf8' : '#a1a1aa',
                                                    }}>
                                                    {stage}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <button type="button" onClick={() => setShowTemplateModal(false)}
                                    className="px-4 py-2.5 bg-white/5 border border-white/8 text-zinc-300 rounded-lg font-semibold cursor-pointer">
                                    {t.cancel}
                                </button>
                                <button type="submit" disabled={isSavingTemplate || !templateFormName.trim() || templateFormStages.length === 0}
                                    className="px-5 py-2.5 border-none text-white rounded-xl font-semibold cursor-pointer"
                                    style={{
                                        background: isSavingTemplate ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        opacity: (isSavingTemplate || !templateFormName.trim() || templateFormStages.length === 0) ? 0.6 : 1,
                                    }}>
                                    {isSavingTemplate ? '...' : t.save_template}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedItemIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] flex items-center gap-3 px-5 py-3 bg-gray-800 border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    <span className="text-gray-300 text-sm">
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
                        className="px-4 py-2 bg-red-500 text-white border-none rounded-lg font-semibold cursor-pointer"
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
                        className="px-4 py-2 bg-amber-500 text-white border-none rounded-lg font-semibold cursor-pointer"
                    >
                        Terminate Selected
                    </button>
                    <button
                        onClick={() => setSelectedItemIds(new Set())}
                        className="p-2 bg-transparent text-gray-400 border-none cursor-pointer text-lg"
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





