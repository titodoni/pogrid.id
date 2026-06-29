import React, { useState } from 'react';
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

interface Alert {
    id: number;
    item_id: number;
    severity: string;
    message: string;
    is_resolved: boolean;
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
}

const translations = {
    en: {
        owner_command_center: "Owner Command Center",
        subtitle_realtime: "Real-time production monitoring & risk guardrail",
        po_directory: "Purchase Order (PO) Directory",
        broadcast_new_po: "Broadcast New PO",
        no_pos: "No Purchase Orders found.",
        unresolved_alerts: "Unresolved Floor Alerts",
        validation_error: "Validation Error",
        floor_terminal_url: "Floor Terminal URL",
        floor_terminal_desc: "Share this URL with floor operators to let them log in with their PINs:",
        settings: "Settings",
        change_password: "Change Password",
        add_admin: "Add Administrator",
        color_themes: "Color Themes",
        coming_soon: "Coming Soon",
        language_label: "Language",
        lang_en: "English",
        lang_id: "Indonesia",
        current_password: "Current Password",
        new_password: "New Password",
        confirm_password: "Confirm New Password",
        cancel: "Cancel",
        submit: "Submit",
        save_changes: "Save Changes",
        admin_name: "Full Name",
        admin_username: "Username",
        admin_password: "Password",
        create_admin: "Create Administrator",
        admin_subtitle: "Create a new administrator account with full access.",
        broadcast_po_title: "Broadcast New Purchase Order",
        broadcast_po_subtitle: "Input internal/external PO metadata and schedule parallel item stages.",
        po_number_label: "PO Number (Internal)",
        client_po_number_label: "Client PO Number (External)",
        client_name_label: "Client Name",
        delivery_date_label: "Delivery Date",
        urgent_label: "Urgent PO (Mark this PO as highly urgent with red highlights)",
        items_po_title: "Items in this PO",
        add_another_item: "Add Another Item",
        item_name_label: "Item Name",
        item_type_label: "Item Type",
        qty_label: "Qty",
        stages_label: "Required Production Stages",
        cnc_label: "CNC Production Stage",
        fab_label: "Fabrication Production Stage",
        vendor_label: "Vendor Production Stage",
        vendor_name_label: "Vendor Name",
        vendor_phone_label: "Vendor Phone Number",
        remove_item: "Remove Item",
        custom_client: "Custom / Other Client...",
        add_client_btn: "Add",
        select_client: "Select Client...",
    },
    id: {
        owner_command_center: "Pusat Kendali Pemilik",
        subtitle_realtime: "Pemantauan produksi real-time & batasan risiko",
        po_directory: "Direktori Surat Perintah Kerja (PO)",
        broadcast_new_po: "Siarkan PO Baru",
        no_pos: "Tidak ada PO yang ditemukan.",
        unresolved_alerts: "Peringatan Pabrik Belum Selesai",
        validation_error: "Kesalahan Validasi",
        floor_terminal_url: "URL Terminal Pabrik",
        floor_terminal_desc: "Bagikan URL ini ke operator pabrik untuk login dengan PIN mereka:",
        settings: "Pengaturan",
        change_password: "Ubah Kata Sandi",
        add_admin: "Tambah Administrator",
        color_themes: "Tema Warna",
        coming_soon: "Segera Hadir",
        language_label: "Bahasa",
        lang_en: "English",
        lang_id: "Indonesia",
        current_password: "Kata Sandi Saat Ini",
        new_password: "Kata Sandi Baru",
        confirm_password: "Konfirmasi Kata Sandi Baru",
        cancel: "Batal",
        submit: "Kirim",
        save_changes: "Simpan Perubahan",
        admin_name: "Nama Lengkap",
        admin_username: "Nama Pengguna",
        admin_password: "Kata Sandi",
        create_admin: "Buat Administrator",
        admin_subtitle: "Buat akun administrator baru dengan akses penuh.",
        broadcast_po_title: "Siarkan PO Baru",
        broadcast_po_subtitle: "Masukkan data PO internal/external dan jadwalkan tahapan barang secara paralel.",
        po_number_label: "Nomor PO (Internal)",
        client_po_number_label: "Nomor PO Klien (Eksternal)",
        client_name_label: "Nama Klien",
        delivery_date_label: "Tanggal Pengiriman",
        urgent_label: "PO Mendesak (Tandai PO ini sebagai sangat mendesak dengan sorotan merah)",
        items_po_title: "Barang dalam PO ini",
        add_another_item: "Tambah Barang Lain",
        item_name_label: "Nama Barang",
        item_type_label: "Tipe Barang",
        qty_label: "Jumlah",
        stages_label: "Tahapan Produksi yang Dibutuhkan",
        cnc_label: "Tahap Produksi CNC",
        fab_label: "Tahap Produksi Fabrikasi",
        vendor_label: "Tahap Produksi Vendor",
        vendor_name_label: "Nama Vendor",
        vendor_phone_label: "Nomor Telepon Vendor",
        remove_item: "Hapus Barang",
        custom_client: "Klien Kustom / Lainnya...",
        add_client_btn: "Tambah",
        select_client: "Pilih Klien...",
    }
};

export default function OwnerDashboard({ pos, alerts, users, tenant, auth_user }: Props) {
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

    const [activeTab, setActiveTab] = useState<'alerts' | 'active' | 'completed'>('alerts');
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
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [cpCurrentPassword, setCpCurrentPassword] = useState('');
    const [cpNewPassword, setCpNewPassword] = useState('');
    const [cpConfirmPassword, setCpConfirmPassword] = useState('');

    const openChangePassword = () => {
        setCpCurrentPassword('');
        setCpNewPassword('');
        setCpConfirmPassword('');
        setShowSettingsDropdown(false);
        setShowChangePasswordModal(true);
    };

    const submitChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/change-password', {
            current_password: cpCurrentPassword,
            new_password: cpNewPassword,
            new_password_confirmation: cpConfirmPassword,
        }, {
            onSuccess: () => setShowChangePasswordModal(false),
        });
    };

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

    // Client Selector State
    const [clients, setClients] = useState<string[]>([
        'PT Astra Otoparts',
        'PT Epson Indonesia',
        'PT Toyota Motor Manufacturing',
        'PT Honda Prospect Motor',
        'PT Panasonic Manufacturing'
    ]);
    const [showAddClientInput, setShowAddClientInput] = useState(false);
    const [newClientName, setNewClientName] = useState('');

    // Broadcast PO state
    const [showBroadcastPoModal, setShowBroadcastPoModal] = useState(false);
    const [poNumberInput, setPoNumberInput] = useState('');
    const [externalPoNumberInput, setExternalPoNumberInput] = useState('');
    const [clientNameInput, setClientNameInput] = useState('');
    const [isCustomClient, setIsCustomClient] = useState(false);
    const [deliveryDateInput, setDeliveryDateInput] = useState('');
    const [isUrgentInput, setIsUrgentInput] = useState(false);
    const [poItems, setPoItems] = useState<Array<{
        item_name: string;
        item_type: 'MANUFACTURE' | 'BUY_OUT' | 'SERVICE';
        target_qty: number;
        required_stages: string[];
        vendor_name?: string;
        vendor_phone?: string;
    }>>([
        { item_name: '', item_type: 'MANUFACTURE', target_qty: 1, required_stages: [], vendor_name: '', vendor_phone: '' }
    ]);

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

    // PO Broadcasting actions
    const addPoItemField = () => {
        setPoItems(prev => [...prev, { item_name: '', item_type: 'MANUFACTURE', target_qty: 1, required_stages: [], vendor_name: '', vendor_phone: '' }]);
    };

    const removePoItemField = (index: number) => {
        if (poItems.length === 1) return;
        setPoItems(prev => prev.filter((_, i) => i !== index));
    };

    const updatePoItemField = (index: number, field: string, value: any) => {
        setPoItems(prev => prev.map((item, i) => {
            if (i === index) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const submitBroadcastPo = (e: React.FormEvent) => {
        e.preventDefault();

        if (!poNumberInput.trim() || !clientNameInput.trim() || !deliveryDateInput) {
            alert('Please fill out all PO header fields.');
            return;
        }

        for (let i = 0; i < poItems.length; i++) {
            const item = poItems[i];
            if (!item.item_name.trim()) {
                alert(`Please enter a name for Item #${i + 1}.`);
                return;
            }
            if (item.required_stages.length === 0) {
                alert(`Please check at least one stage for Item "${item.item_name}" (Item #${i + 1}).`);
                return;
            }
            if (item.required_stages.includes('Vendor')) {
                if (!item.vendor_name?.trim() || !item.vendor_phone?.trim()) {
                    alert(`Item "${item.item_name}" has a Vendor stage selected. Please specify the Vendor Name and Phone Number.`);
                    return;
                }
            }
        }

        router.post('/pos', {
            po_number: poNumberInput,
            external_po_number: externalPoNumberInput,
            client_name: clientNameInput,
            global_deadline: deliveryDateInput,
            is_urgent: isUrgentInput,
            items: poItems
        }, {
            onSuccess: () => {
                setShowBroadcastPoModal(false);
                setPoNumberInput('');
                setExternalPoNumberInput('');
                setClientNameInput('');
                setDeliveryDateInput('');
                setIsUrgentInput(false);
                setPoItems([{ item_name: '', item_type: 'MANUFACTURE', target_qty: 1, required_stages: [], vendor_name: '', vendor_phone: '' }]);
            }
        });
    };

    const isOwner = auth_user?.role === 'OWNER';
    const canBroadcastPo = auth_user?.role !== 'OWNER';

    return (
        <div className="responsive-container" style={{
            minHeight: '100vh',
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
                    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{t.owner_command_center}</h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>{t.subtitle_realtime}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {isOwner && (
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowSettingsDropdown(prev => !prev)}
                                style={{
                                    padding: '10px 14px',
                                    backgroundColor: showSettingsDropdown ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                                    color: '#94a3b8',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    lineHeight: '1',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <Settings size={18} />
                            </button>

                            {showSettingsDropdown && (
                                <>
                                    <div
                                        onClick={() => setShowSettingsDropdown(false)}
                                        style={{
                                            position: 'fixed',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            zIndex: 40,
                                        }}
                                    />
                                    <div className="settings-dropdown" style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 6px)',
                                        right: 0,
                                        backgroundColor: '#0f172a',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '12px',
                                        padding: '6px',
                                        minWidth: '220px',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                        zIndex: 50,
                                    }}>
                                        <button
                                            onClick={openChangePassword}
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                padding: '10px 14px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                color: '#e2e8f0',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                borderRadius: '8px',
                                                textAlign: 'left'
                                            }}
                                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            <Lock size={14} /> {t.change_password}
                                        </button>
                                        <button
                                            onClick={openAddAdmin}
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                padding: '10px 14px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                color: '#e2e8f0',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                borderRadius: '8px',
                                                textAlign: 'left'
                                            }}
                                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            <Plus size={14} /> {t.add_admin}
                                        </button>
                                        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                                        <button
                                            disabled
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                padding: '10px 14px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                color: '#64748b',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                borderRadius: '8px',
                                                textAlign: 'left',
                                                cursor: 'not-allowed',
                                                opacity: 0.5,
                                            }}
                                        >
                                            <Palette size={14} /> {t.color_themes} <span style={{ fontSize: '11px', color: '#475569', marginLeft: '6px' }}>({t.coming_soon})</span>
                                        </button>
                                        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                                        <div style={{ padding: '8px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>
                                                <Globe size={14} />
                                                <span>{t.language_label}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px' }}>
                                                <button
                                                    onClick={() => changeLanguage('en')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '6px 8px',
                                                        backgroundColor: language === 'en' ? '#2563eb' : 'transparent',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        color: '#fff',
                                                        fontWeight: 600,
                                                        fontSize: '11px',
                                                        cursor: 'pointer',
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    {t.lang_en}
                                                </button>
                                                <button
                                                    onClick={() => changeLanguage('id')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '6px 8px',
                                                        backgroundColor: language === 'id' ? '#2563eb' : 'transparent',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        color: '#fff',
                                                        fontWeight: 600,
                                                        fontSize: '11px',
                                                        cursor: 'pointer',
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    {t.lang_id}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <a
                        href="/superadmin"
                        style={{
                            padding: '10px 18px',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: '#94a3b8',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            fontSize: '14px',
                            display: 'inline-flex',
                            alignItems: 'center'
                        }}
                    >
                        Super Admin Panel
                    </a>
                    <button
                        onClick={() => router.post('/logout')}
                        style={{
                            padding: '10px 18px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </header>

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
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span><Globe size={16} /> {t.floor_terminal_url} ({tenant.company_name})</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                        {t.floor_terminal_desc}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <code style={{
                            backgroundColor: '#090d16',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            color: '#38bdf8',
                            fontSize: '14px',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            wordBreak: 'break-all',
                            flex: 1
                        }}>
                            {typeof window !== 'undefined' ? `${window.location.origin}/c/${tenant.slug}` : `/c/${tenant.slug}`}
                        </code>
                            <button
                                className="copy-btn"
                                onClick={() => {
                                    const url = typeof window !== 'undefined' ? `${window.location.origin}/c/${tenant.slug}` : `/c/${tenant.slug}`;
                                    navigator.clipboard.writeText(url);
                                    alert('Copied Floor Terminal URL to clipboard!');
                                }}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#2563eb',
                                    color: '#fff',
                                    fontWeight: 600,
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                }}
                            >
                                Copy Link
                            </button>
                    </div>
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
            </div>

            {/* Alert Matrix Panel */}
            {activeTab === 'alerts' && (
                <div style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{t.unresolved_alerts}</span>
                        <span style={{
                            fontSize: '12px',
                            backgroundColor: alerts.length > 0 ? '#ef4444' : '#10b981',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '12px'
                        }}>
                            {alerts.length} Triggered
                        </span>
                    </h2>

                    {alerts.length === 0 ? (
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
                            {alerts.map((alert) => {
                                const isPinReset = alert.message.startsWith('PIN Reset Requested');
                                const bgColor = alert.severity === 'RED' ? 'rgba(239, 68, 68, 0.08)' : alert.severity === 'BLUE' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(234, 179, 8, 0.08)';
                                const bdColor = alert.severity === 'RED' ? 'rgba(239, 68, 68, 0.2)' : alert.severity === 'BLUE' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(234, 179, 8, 0.2)';
                                const badgeBg = alert.severity === 'RED' ? '#ef4444' : alert.severity === 'BLUE' ? '#3b82f6' : '#eab308';
                                return (
                                    <div
                                        key={alert.id}
                                        style={{
                                            backgroundColor: bgColor,
                                            border: '1px solid',
                                            borderColor: bdColor,
                                            borderRadius: '10px',
                                            padding: '14px 18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}
                                    >
                                        <span className="badge" style={{
                                            color: '#fff',
                                            backgroundColor: badgeBg,
                                        }}>
                                            {alert.severity}
                                        </span>
                                        <div style={{ fontSize: '14px', color: '#e2e8f0', flexGrow: 1 }}>{alert.message}</div>
                                        {isPinReset && (
                                            <button
                                                type="button"
                                                onClick={() => router.post(`/pin-reset/${alert.id}/approve`)}
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
                                                Approve & Generate PIN
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* PO Grid Section */}
            {(activeTab === 'active' || activeTab === 'completed') && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{t.po_directory}</h2>
                        {canBroadcastPo && (
                            <button
                                onClick={() => setShowBroadcastPoModal(true)}
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
                                                            <div key={item.id} className="item-compact" style={{ opacity: (isCancelled || isTerminated) ? 0.6 : 1 }}>
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

            {/* Change Password Modal */}
            {showChangePasswordModal && (
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
                            {t.change_password}
                        </h2>

                        <form onSubmit={submitChangePassword}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                                    {t.current_password}
                                </label>
                                <input
                                    type="password"
                                    value={cpCurrentPassword}
                                    onChange={(e) => setCpCurrentPassword(e.target.value)}
                                    required
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
                                    {t.new_password}
                                </label>
                                <input
                                    type="password"
                                    value={cpNewPassword}
                                    onChange={(e) => setCpNewPassword(e.target.value)}
                                    required
                                    minLength={6}
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
                                    {t.confirm_password}
                                </label>
                                <input
                                    type="password"
                                    value={cpConfirmPassword}
                                    onChange={(e) => setCpConfirmPassword(e.target.value)}
                                    required
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
                                    onClick={() => setShowChangePasswordModal(false)}
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
                                    {t.save_changes}
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

            {/* Broadcast PO Modal */}
            {showBroadcastPoModal && (
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
                    <div className="modal-content modal-content-wide" style={{
                        maxHeight: '90vh',
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0' }}>{t.broadcast_po_title}</h2>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                {t.broadcast_po_subtitle}
                            </p>
                        </div>

                        <form onSubmit={submitBroadcastPo} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                            <div style={{ overflowY: 'auto', paddingRight: '6px', flexGrow: 1, marginBottom: '24px' }}>
                                <div className="responsive-grid responsive-grid-half" style={{ gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>{t.po_number_label}</label>
                                        <input
                                            type="text"
                                            value={poNumberInput}
                                            onChange={(e) => setPoNumberInput(e.target.value)}
                                            required
                                            placeholder="e.g. PO-INT-042"
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
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>{t.client_po_number_label}</label>
                                        <input
                                            type="text"
                                            value={externalPoNumberInput}
                                            onChange={(e) => setExternalPoNumberInput(e.target.value)}
                                            placeholder="e.g. PO-EXT-CLIENT-99"
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
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>{t.client_name_label}</label>
                                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                            <select
                                                value={isCustomClient ? 'Custom Client' : clientNameInput}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === 'Custom Client') {
                                                        setIsCustomClient(true);
                                                        setClientNameInput('');
                                                    } else {
                                                        setIsCustomClient(false);
                                                        setClientNameInput(val);
                                                    }
                                                }}
                                                required
                                                style={{
                                                    flexGrow: 1,
                                                    padding: '10px 14px',
                                                    backgroundColor: '#090d16',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '8px',
                                                    color: '#fff',
                                                    fontSize: '14px',
                                                    outline: 'none'
                                                }}
                                            >
                                                <option value="">{t.select_client}</option>
                                                {clients.map(client => (
                                                    <option key={client} value={client}>{client}</option>
                                                ))}
                                                <option value="Custom Client">{t.custom_client}</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setShowAddClientInput(prev => !prev)}
                                                style={{
                                                    padding: '10px 14px',
                                                    backgroundColor: 'rgba(96, 165, 250, 0.1)',
                                                    border: '1px solid rgba(96, 165, 250, 0.2)',
                                                    color: '#60a5fa',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {t.add_client_btn}
                                            </button>
                                        </div>
                                        {showAddClientInput && (
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                <input
                                                    type="text"
                                                    value={newClientName}
                                                    onChange={(e) => setNewClientName(e.target.value)}
                                                    placeholder="Enter New Client Name"
                                                    style={{
                                                        flexGrow: 1,
                                                        padding: '8px 12px',
                                                        backgroundColor: '#090d16',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '8px',
                                                        color: '#fff',
                                                        fontSize: '13px',
                                                        outline: 'none'
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (newClientName.trim()) {
                                                            if (!clients.includes(newClientName.trim())) {
                                                                setClients(prev => [...prev, newClientName.trim()]);
                                                            }
                                                            setClientNameInput(newClientName.trim());
                                                            setIsCustomClient(false);
                                                            setNewClientName('');
                                                            setShowAddClientInput(false);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '8px 12px',
                                                        backgroundColor: '#10b981',
                                                        border: 'none',
                                                        color: '#fff',
                                                        borderRadius: '8px',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Check size={12} /> Save
                                                </button>
                                            </div>
                                        )}
                                        {isCustomClient && !showAddClientInput && (
                                            <input
                                                type="text"
                                                value={clientNameInput}
                                                onChange={(e) => setClientNameInput(e.target.value)}
                                                required
                                                placeholder="Enter Custom Client Name"
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    backgroundColor: '#090d16',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '8px',
                                                    color: '#fff',
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    marginTop: '8px'
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>{t.delivery_date_label}</label>
                                        <input
                                            type="date"
                                            value={deliveryDateInput}
                                            onChange={(e) => setDeliveryDateInput(e.target.value)}
                                            required
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
                                    <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <input
                                            type="checkbox"
                                            id="is_urgent"
                                            checked={isUrgentInput}
                                            onChange={(e) => setIsUrgentInput(e.target.checked)}
                                            style={{
                                                width: '18px', height: '18px',
                                                accentColor: '#ef4444', cursor: 'pointer'
                                            }}
                                        />
                                        <label htmlFor="is_urgent" style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}>
                                            {t.urgent_label}
                                        </label>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#60a5fa', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.items_po_title}</h3>
                                    <button
                                        type="button"
                                        onClick={addPoItemField}
                                        style={{
                                            padding: '6px 12px',
                                            backgroundColor: 'rgba(96, 165, 250, 0.1)',
                                            border: '1px solid rgba(96, 165, 250, 0.2)',
                                            color: '#60a5fa',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {t.add_another_item}
                                    </button>
                                </div>

                                {poItems.map((item, itemIndex) => (
                                    <div key={itemIndex} style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        marginBottom: '16px',
                                        position: 'relative'
                                    }}>
                                        {poItems.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removePoItemField(itemIndex)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '12px', right: '12px',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    color: '#ef4444',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Close size={12} /> {t.remove_item}
                                            </button>
                                        )}

                                        <div className="responsive-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{t.item_name_label}</label>
                                                <input
                                                    type="text"
                                                    value={item.item_name}
                                                    onChange={(e) => updatePoItemField(itemIndex, 'item_name', e.target.value)}
                                                    required
                                                    placeholder="e.g. Shaft Steel"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        backgroundColor: '#090d16',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '6px',
                                                        color: '#fff',
                                                        fontSize: '13px',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{t.item_type_label}</label>
                                                <select
                                                    value={item.item_type}
                                                    onChange={(e) => updatePoItemField(itemIndex, 'item_type', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        backgroundColor: '#090d16',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '6px',
                                                        color: '#fff',
                                                        fontSize: '13px',
                                                        outline: 'none'
                                                    }}
                                                >
                                                    <option value="MANUFACTURE">MANUFACTURE</option>
                                                    <option value="BUY_OUT">BUY OUT</option>
                                                    <option value="SERVICE">SERVICE</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{t.qty_label}</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.target_qty}
                                                    onChange={(e) => updatePoItemField(itemIndex, 'target_qty', parseInt(e.target.value) || 1)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        backgroundColor: '#090d16',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '6px',
                                                        color: '#fff',
                                                        fontSize: '13px',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{t.stages_label}</label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer' }}>
                                                        <input type="checkbox" checked={item.required_stages.includes('CNC')} onChange={() => {
                                                            const stages = item.required_stages.includes('CNC')
                                                                ? item.required_stages.filter(s => s !== 'CNC')
                                                                : [...item.required_stages, 'CNC'];
                                                            updatePoItemField(itemIndex, 'required_stages', stages);
                                                        }} />
                                                        {t.cnc_label}
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer' }}>
                                                        <input type="checkbox" checked={item.required_stages.includes('Fabrication')} onChange={() => {
                                                            const stages = item.required_stages.includes('Fabrication')
                                                                ? item.required_stages.filter(s => s !== 'Fabrication')
                                                                : [...item.required_stages, 'Fabrication'];
                                                            updatePoItemField(itemIndex, 'required_stages', stages);
                                                        }} />
                                                        {t.fab_label}
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer' }}>
                                                        <input type="checkbox" checked={item.required_stages.includes('Vendor')} onChange={() => {
                                                            const stages = item.required_stages.includes('Vendor')
                                                                ? item.required_stages.filter(s => s !== 'Vendor')
                                                                : [...item.required_stages, 'Vendor'];
                                                            updatePoItemField(itemIndex, 'required_stages', stages);
                                                        }} />
                                                        {t.vendor_label}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {item.required_stages.includes('Vendor') && (
                                            <div className="responsive-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{t.vendor_name_label}</label>
                                                    <input type="text" value={item.vendor_name || ''} onChange={(e) => updatePoItemField(itemIndex, 'vendor_name', e.target.value)} placeholder="Vendor Name" style={{ width: '100%', padding: '8px 12px', backgroundColor: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{t.vendor_phone_label}</label>
                                                    <input type="text" value={item.vendor_phone || ''} onChange={(e) => updatePoItemField(itemIndex, 'vendor_phone', e.target.value)} placeholder="Phone" style={{ width: '100%', padding: '8px 12px', backgroundColor: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none' }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowBroadcastPoModal(false)}
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
                                    {t.submit}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
