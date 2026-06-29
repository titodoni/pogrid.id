import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

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

const formatDeadline = (deadlineDateStr: string) => {
    if (!deadlineDateStr) return '';
    const deadline = new Date(deadlineDateStr);
    const deadlineClean = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    const today = new Date();
    const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = deadlineClean.getTime() - todayClean.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dateFormatted = deadlineClean.toLocaleDateString();

    if (diffDays === 0) {
        return `${dateFormatted} (Today)`;
    } else if (diffDays > 0) {
        if (diffDays === 7) return `${dateFormatted} (1 week)`;
        if (diffDays === 30) return `${dateFormatted} (1 month)`;
        return `${dateFormatted} (${diffDays} days)`;
    } else {
        return `${dateFormatted} (delayed ${Math.abs(diffDays)} days)`;
    }
};

interface Alert {
    id: number;
    item_id: number;
    severity: string; // RED, YELLOW, BLUE
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
    status: string; // UNPAID, PAID
    due_date: string;
    invoice_type: string; // STANDARD, SUNK_COST
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
        broadcast_new_po: "📢 Broadcast New PO",
        no_pos: "No Purchase Orders found.",
        active_items: "Active Production Items",
        no_active_items: "No active production items currently on the floor.",
        unresolved_alerts: "Unresolved Floor Alerts",
        validation_error: "Validation Error",
        production_tab: "Production Progress & POs",
        users_tab: "User Directory & Access",
        name: "Full Name",
        role: "Role",
        auth_method: "Authentication Method",
        actions: "Actions",
        no_users: "No users found.",
        edit: "Edit",
        delete: "Delete",
        create_new_user: "➕ Create New User",
        edit_user_details: "Edit User Details",
        create_user_title: "Create New User",
        user_subtitle: "Configure system roles and authentication keys for operators.",
        full_name_label: "Full Name",
        user_role_label: "User Role",
        login_method_label: "Login Method",
        username_label: "Username",
        password_label: "Password",
        pin_label: "4-Digit Login PIN",
        pin_note: "Operators log in via path-based worker auth using this numeric PIN.",
        cancel: "Cancel",
        submit: "Submit",
        save_changes: "Save Changes",
        broadcast_po_title: "Broadcast New Purchase Order",
        broadcast_po_subtitle: "Input internal/external PO metadata and schedule parallel item stages.",
        po_number_label: "PO Number (Internal)",
        client_po_number_label: "Client PO Number (External)",
        client_name_label: "Client Name",
        delivery_date_label: "Delivery Date",
        urgent_label: "🚨 Urgent PO (Mark this PO as highly urgent with red highlights)",
        items_po_title: "Items in this PO",
        add_another_item: "➕ Add Another Item",
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
        add_client_btn: "➕ Add",
        custom_role_label: "Custom Role Name",
        floor_terminal_url: "Floor Terminal URL",
        floor_terminal_desc: "Share this URL with floor operators to let them log in with their PINs:",
    },
    id: {
        owner_command_center: "Pusat Kendali Pemilik",
        subtitle_realtime: "Pemantauan produksi real-time & batasan risiko",
        po_directory: "Direktori Surat Perintah Kerja (PO)",
        broadcast_new_po: "📢 Siarkan PO Baru",
        no_pos: "Tidak ada PO yang ditemukan.",
        active_items: "Barang Produksi Aktif",
        no_active_items: "Tidak ada barang produksi aktif di pabrik saat ini.",
        unresolved_alerts: "Peringatan Pabrik Belum Selesai",
        validation_error: "Kesalahan Validasi",
        production_tab: "Progres Produksi & PO",
        users_tab: "Direktori Pengguna & Akses",
        name: "Nama Lengkap",
        role: "Peran",
        auth_method: "Metode Autentikasi",
        actions: "Aksi",
        no_users: "Pengguna tidak ditemukan.",
        edit: "Ubah",
        delete: "Hapus",
        create_new_user: "➕ Tambah Pengguna Baru",
        edit_user_details: "Ubah Detail Pengguna",
        create_user_title: "Tambah Pengguna Baru",
        user_subtitle: "Konfigurasikan peran sistem dan kunci autentikasi untuk operator.",
        full_name_label: "Nama Lengkap",
        user_role_label: "Peran Pengguna",
        login_method_label: "Metode Masuk",
        username_label: "Nama Pengguna",
        password_label: "Kata Sandi",
        pin_label: "PIN Masuk 4-Digit",
        pin_note: "Operator masuk melalui autentikasi pekerja berbasis path menggunakan PIN numerik ini.",
        cancel: "Batal",
        submit: "Kirim",
        save_changes: "Simpan Perubahan",
        broadcast_po_title: "Siarkan PO Baru",
        broadcast_po_subtitle: "Masukkan data PO internal/external dan jadwalkan tahapan barang secara paralel.",
        po_number_label: "Nomor PO (Internal)",
        client_po_number_label: "Nomor PO Klien (Eksternal)",
        client_name_label: "Nama Klien",
        delivery_date_label: "Tanggal Pengiriman",
        urgent_label: "🚨 PO Mendesak (Tandai PO ini sebagai sangat mendesak dengan sorotan merah)",
        items_po_title: "Barang dalam PO ini",
        add_another_item: "➕ Tambah Barang Lain",
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
        add_client_btn: "➕ Tambah",
        custom_role_label: "Nama Peran Kustom",
        floor_terminal_url: "URL Terminal Pabrik",
        floor_terminal_desc: "Bagikan URL ini ke operator pabrik untuk login dengan PIN mereka:",
    }
};

export default function OwnerDashboard({ pos, alerts, users, tenant, auth_user }: Props) {
    const { errors } = usePage().props;

    const [activeTab, setActiveTab] = useState<'pos' | 'users'>('pos');

    // Language state
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

    // User Management state
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState<string>('CNC');
    const [loginMethod, setLoginMethod] = useState<'PASSWORD' | 'PIN'>('PIN');
    const [isCustomRole, setIsCustomRole] = useState(false);
    const [customRoleName, setCustomRoleName] = useState('');
    const [userUsername, setUserUsername] = useState('');
    const [userPassword, setUserPassword] = useState('');
    const [userPin, setUserPin] = useState('');

    const handleCancel = (itemId: number) => {
        if (confirm('Are you sure you want to cancel this item?')) {
            router.post(`/items/${itemId}/cancel`);
        }
    };

    const handleTerminate = (itemId: number) => {
        if (confirm('⚠️ WARNING: This will immediately HALT all floor operator operations for this item. Proceed?')) {
            router.post(`/items/${itemId}/terminate`);
        }
    };

    // User Management actions
    const openAddUser = () => {
        setEditingUser(null);
        setUserName('');
        setUserRole('CNC');
        setLoginMethod('PIN');
        setIsCustomRole(false);
        setCustomRoleName('');
        setUserUsername('');
        setUserPassword('');
        setUserPin('');
        setShowUserModal(true);
    };

    const openEditUser = (user: User) => {
        setEditingUser(user);
        setUserName(user.name);
        
        const standardRoles = ['ADMIN', 'SALES', 'DRAFTER', 'PURCHASING', 'CNC', 'FABRICATION', 'QC', 'DELIVERY', 'FINANCE', 'OWNER', 'WORKER'];
        const upperRole = user.role.toUpperCase();
        if (standardRoles.includes(upperRole)) {
            setUserRole(upperRole);
            setIsCustomRole(false);
            setCustomRoleName('');
        } else {
            setUserRole('CUSTOM');
            setIsCustomRole(true);
            setCustomRoleName(user.role);
        }

        const method = user.username ? 'PASSWORD' : 'PIN';
        setLoginMethod(method);

        setUserUsername(user.username || '');
        setUserPassword('');
        setUserPin('');
        setShowUserModal(true);
    };

    const submitUserForm = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalRole = isCustomRole ? customRoleName : userRole;

        if (!userName.trim()) {
            alert('Please enter a full name.');
            return;
        }
        if (isCustomRole && !customRoleName.trim()) {
            alert('Please enter custom role name.');
            return;
        }

        if (loginMethod === 'PASSWORD') {
            if (!userUsername.trim()) {
                alert('Username is required for password login.');
                return;
            }
            if (!editingUser && !userPassword) {
                alert('Password is required for new accounts.');
                return;
            }
        } else {
            if (!editingUser && !userPin) {
                alert('PIN is required.');
                return;
            }
            if (userPin && !/^[0-9]{4}$/.test(userPin)) {
                alert('PIN must be exactly 4 digits.');
                return;
            }
        }

        const dataPayload: any = {
            name: userName,
            role: finalRole,
            login_method: loginMethod,
            username: loginMethod === 'PASSWORD' ? userUsername : null,
            password: loginMethod === 'PASSWORD' && userPassword ? userPassword : null,
            pin: loginMethod === 'PIN' && userPin ? userPin : null,
        };

        if (editingUser) {
            router.post(`/users/${editingUser.id}/update`, dataPayload, {
                onSuccess: () => setShowUserModal(false)
            });
        } else {
            router.post('/users', dataPayload, {
                onSuccess: () => setShowUserModal(false)
            });
        }
    };

    const handleDeleteUser = (userId: number) => {
        if (confirm('Are you sure you want to delete this user? This cannot be undone.')) {
            router.post(`/users/${userId}/delete`);
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

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#090d16',
            fontFamily: 'Inter, sans-serif',
            color: '#f8fafc',
            padding: '28px'
        }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '20px',
                marginBottom: '28px'
            }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{t.owner_command_center}</h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>{t.subtitle_realtime}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <button
                            onClick={() => changeLanguage('en')}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: language === 'en' ? '#2563eb' : 'transparent',
                                border: 'none',
                                color: '#fff',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => changeLanguage('id')}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: language === 'id' ? '#2563eb' : 'transparent',
                                border: 'none',
                                color: '#fff',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            ID
                        </button>
                    </div>
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
                    <h4 style={{ margin: '0 0 8px 0', fontWeight: 700 }}>ValidationError</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {Object.entries(errors).map(([key, val]) => (
                            <li key={key}>{val}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Floor Terminal URL Information Box */}
            {tenant && (
                <div style={{
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
                        <span>🌐 {t.floor_terminal_url} ({tenant.company_name})</span>
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
                                transition: 'background-color 0.15s'
                            }}
                        >
                            Copy Link
                        </button>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '2px',
                marginBottom: '32px'
            }}>
                <button
                    onClick={() => setActiveTab('pos')}
                    style={{
                        padding: '12px 20px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'pos' ? '2px solid #2563eb' : 'none',
                        color: activeTab === 'pos' ? '#3b82f6' : '#64748b',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '15px',
                        transition: 'all 0.15s'
                    }}
                >
                    {t.production_tab}
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    style={{
                        padding: '12px 20px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'users' ? '2px solid #2563eb' : 'none',
                        color: activeTab === 'users' ? '#3b82f6' : '#64748b',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '15px',
                        transition: 'all 0.15s'
                    }}
                >
                    {t.users_tab}
                </button>
                {auth_user?.role === 'OWNER' && (
                    <button
                        onClick={() => setActiveTab('settings' as any)}
                        style={{
                            padding: '12px 20px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'settings' ? '2px solid #2563eb' : 'none',
                            color: activeTab === 'settings' ? '#3b82f6' : '#64748b',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '15px',
                            transition: 'all 0.15s'
                        }}
                    >
                        ⚙️ {language === 'en' ? 'Company Settings' : 'Pengaturan Perusahaan'}
                    </button>
                )}
            </div>

            {/* Content Tabs */}
            {activeTab === 'pos' && (
                <div>
                    {/* Alert Matrix Panel */}
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Active Alerts</span>
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
                                🟢 All manufacturing timelines are healthy and no operational failures are reported.
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
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                color: '#fff',
                                                backgroundColor: badgeBg,
                                                padding: '2px 6px',
                                                borderRadius: '4px'
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

                    {/* PO Grid Section */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Purchase Order (PO) Directory</h2>
                            {auth_user?.role !== 'OWNER' && (
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
                                        transition: 'background-color 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                                >
                                    📢 Broadcast New PO
                                </button>
                            )}
                        </div>
                        {pos.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No Purchase Orders found.</div>
                        ) : (
                            pos.map((po) => (
                                <div key={po.id} style={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    marginBottom: '20px'
                                }}>
                                    {/* PO Header */}
                                    <div className="responsive-split" style={{
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                        paddingBottom: '16px',
                                        marginBottom: '20px'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                                                    {po.po_number} {po.external_po_number ? `(${po.external_po_number})` : ''}
                                                </h3>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: po.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                                    color: po.status === 'COMPLETED' ? '#10b981' : '#eab308'
                                                }}>
                                                    {po.status}
                                                </span>
                                                {po.is_urgent && (
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                                        color: '#ef4444',
                                                        border: '1px solid rgba(239, 68, 68, 0.4)'
                                                    }}>
                                                        URGENT
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>Client: {po.client_name}</div>
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>DEADLINE</div>
                                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>{formatDeadline(po.global_deadline)}</div>
                                        </div>
                                    </div>

                                    {/* PO Items List */}
                                    <div>
                                        <h4 style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                                            Items In Production
                                        </h4>
                                        {po.items.length === 0 ? (
                                            <div style={{ fontSize: '14px', color: '#64748b' }}>No items in this PO.</div>
                                        ) : (
                                            po.items.map((item) => {
                                                const progress = parseFloat(item.progress_percent);
                                                const hasProgress = progress > 0;
                                                const isCancelled = item.status === 'CANCELLED';
                                                const isTerminated = item.status === 'TERMINATED';

                                                return (
                                                    <div key={item.id} style={{
                                                        backgroundColor: '#0f172a',
                                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                                        borderRadius: '12px',
                                                        padding: '16px',
                                                        marginBottom: '10px',
                                                        opacity: (isCancelled || isTerminated) ? 0.6 : 1
                                                    }}>
                                                        <div className="responsive-split" style={{ marginBottom: '12px', alignItems: 'flex-start' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                {/* 1st Headline: Item Name */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>{item.item_name}</span>
                                                                    <span style={{
                                                                        fontSize: '10px',
                                                                        backgroundColor: 'rgba(255,255,255,0.06)',
                                                                        padding: '2px 6px',
                                                                        borderRadius: '4px',
                                                                        color: '#94a3b8'
                                                                    }}>
                                                                        {item.item_type}
                                                                    </span>
                                                                    {po.is_urgent && (
                                                                        <span style={{
                                                                            fontSize: '10px',
                                                                            fontWeight: 700,
                                                                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                                                            color: '#ef4444',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '4px',
                                                                            border: '1px solid rgba(239, 68, 68, 0.4)'
                                                                        }}>
                                                                            URGENT
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {/* 2nd Headline: Client Name */}
                                                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#60a5fa' }}>
                                                                    Client: {po.client_name}
                                                                </div>
                                                                {/* 3rd Headline: Deadline */}
                                                                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                                                                    Deadline: {formatDeadline(po.global_deadline)}
                                                                </div>
                                                                {/* 4th Headline: Qty */}
                                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                                                                    Qty: {item.target_qty} pcs {item.delivered_qty > 0 && `| Delivered: ${item.delivered_qty} pcs`}
                                                                </div>
                                                                {item.vendor_name && (
                                                                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px' }}>
                                                                        Vendor: {item.vendor_name} ({item.vendor_phone})
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                                {/* Status Label */}
                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.15)'
                                                                        : isTerminated ? 'rgba(239, 68, 68, 0.15)'
                                                                        : progress >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                                    color: isCancelled ? '#ef4444'
                                                                        : isTerminated ? '#ef4444'
                                                                        : progress >= 100 ? '#10b981' : '#3b82f6'
                                                                }}>
                                                                    {item.status}
                                                                </span>

                                                                {/* Action Buttons */}
                                                                {(!isCancelled && !isTerminated) && (
                                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                                        <button
                                                                            onClick={() => handleCancel(item.id)}
                                                                            disabled={hasProgress}
                                                                            title={hasProgress ? "Cannot cancel. Progress has started. Use Terminate Midway instead." : ""}
                                                                            style={{
                                                                                padding: '6px 12px',
                                                                                backgroundColor: hasProgress ? '#1e293b' : 'rgba(239, 68, 68, 0.1)',
                                                                                color: hasProgress ? '#475569' : '#ef4444',
                                                                                border: 'none',
                                                                                borderRadius: '6px',
                                                                                cursor: hasProgress ? 'not-allowed' : 'pointer',
                                                                                fontSize: '12px',
                                                                                fontWeight: 600,
                                                                                transition: 'all 0.15s'
                                                                            }}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleTerminate(item.id)}
                                                                            style={{
                                                                                padding: '6px 12px',
                                                                                backgroundColor: '#ef4444',
                                                                                color: '#fff',
                                                                                border: 'none',
                                                                                borderRadius: '6px',
                                                                                cursor: 'pointer',
                                                                                fontSize: '12px',
                                                                                fontWeight: 600,
                                                                                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                                                                            }}
                                                                        >
                                                                            🛑 HALT
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{
                                                                flexGrow: 1,
                                                                height: '8px',
                                                                backgroundColor: '#090d16',
                                                                borderRadius: '4px',
                                                                overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    width: `${progress}%`,
                                                                    height: '100%',
                                                                    backgroundColor: isCancelled ? '#ef4444' : '#2563eb',
                                                                    borderRadius: '4px',
                                                                    transition: 'width 0.3s ease'
                                                                }} />
                                                            </div>
                                                            <span style={{ fontSize: '13px', fontWeight: 700, width: '40px', textAlign: 'right' }}>
                                                                {progress.toFixed(0)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            {/* User Directory Tab */}
            {activeTab === 'users' && (
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '24px'
                    }}>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>User & Operator Directory</h2>
                            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
                                Manage standard web logins (Owners) and worker path-based logins (Operators & QC)
                            </p>
                        </div>
                        <button
                            onClick={openAddUser}
                            style={{
                                padding: '10px 18px',
                                backgroundColor: '#2563eb',
                                color: '#fff',
                                fontWeight: 600,
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                        >
                            ➕ Add New User
                        </button>
                    </div>

                    <div style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '24px',
                        overflowX: 'auto'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Name</th>
                                    <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Role</th>
                                    <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Authentication Method</th>
                                    <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No users found.</td>
                                    </tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.15s' }}>
                                            <td style={{ padding: '16px', fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>{user.name}</td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: user.role === 'OWNER' ? 'rgba(59, 130, 246, 0.1)' : user.role === 'QC' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                    color: user.role === 'OWNER' ? '#3b82f6' : user.role === 'QC' ? '#eab308' : '#10b981'
                                                }}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', fontSize: '14px', color: '#94a3b8' }}>
                                                {user.role === 'OWNER' ? (
                                                    <span>Username: <strong style={{ color: '#f8fafc' }}>{user.username}</strong></span>
                                                ) : (
                                                    <span>4-digit PIN Authentication</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => openEditUser(user)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            color: '#e2e8f0',
                                                            borderRadius: '6px',
                                                            fontSize: '13px',
                                                            cursor: 'pointer',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                                            color: '#ef4444',
                                                            borderRadius: '6px',
                                                            fontSize: '13px',
                                                            cursor: 'pointer',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Company Settings Tab */}
            {activeTab === 'settings' && tenant && (
                <div style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '32px',
                    maxWidth: '600px'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: '#60a5fa' }}>
                        ⚙️ {language === 'en' ? 'Company Settings / Setup' : 'Pengaturan / Setup Perusahaan'}
                    </h2>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                        {language === 'en' 
                            ? 'Configure the POgrid settings for your company.' 
                            : 'Konfigurasikan pengaturan POgrid untuk perusahaan Anda.'}
                    </p>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        router.post('/company/update', {
                            company_name: formData.get('company_name') as string
                        }, {
                            onSuccess: () => alert(language === 'en' ? 'Company settings saved successfully!' : 'Pengaturan perusahaan berhasil disimpan!')
                        });
                    }}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
                                {language === 'en' ? 'COMPANY / FACTORY NAME' : 'NAMA PERUSAHAAN / PABRIK'}
                            </label>
                            <input
                                type="text"
                                name="company_name"
                                defaultValue={tenant.company_name}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: '#090d16',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '15px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#2563eb',
                                color: '#fff',
                                fontWeight: 700,
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            {language === 'en' ? 'Save Settings' : 'Simpan Pengaturan'}
                        </button>
                    </form>
                </div>
            )}

            {/* User Form Modal */}
            {showUserModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    padding: '20px'
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0' }}>
                            {editingUser ? 'Edit User Details' : 'Create New User'}
                        </h2>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px 0' }}>
                            Configure system roles and authentication keys for operators.
                        </p>

                        <form onSubmit={submitUserForm}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>Full Name</label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
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
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>{t.user_role_label}</label>
                                <select
                                    value={isCustomRole ? 'CUSTOM' : userRole}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === 'CUSTOM') {
                                            setIsCustomRole(true);
                                            setLoginMethod('PIN');
                                        } else {
                                            setIsCustomRole(false);
                                            setUserRole(val);
                                            const officeRoles = ['ADMIN', 'SALES', 'PURCHASING', 'FINANCE', 'OWNER'];
                                            if (officeRoles.includes(val)) {
                                                setLoginMethod('PASSWORD');
                                            } else {
                                                setLoginMethod('PIN');
                                            }
                                        }
                                    }}
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
                                >
                                    <optgroup label="Office Staff (Password Login)">
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="SALES">SALES</option>
                                        <option value="PURCHASING">PURCHASING</option>
                                        <option value="FINANCE">FINANCE</option>
                                    </optgroup>
                                    <optgroup label="Floor Staff (4-Digit PIN)">
                                        <option value="DRAFTER">Drafter</option>
                                        <option value="CNC">CNC</option>
                                        <option value="FABRICATION">Fabrication</option>
                                        <option value="QC">QC</option>
                                        <option value="DELIVERY">Delivery</option>
                                    </optgroup>
                                    <option value="CUSTOM">Custom / Other Role...</option>
                                </select>
                            </div>

                            {isCustomRole && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>{t.custom_role_label}</label>
                                    <input
                                        type="text"
                                        value={customRoleName}
                                        onChange={(e) => setCustomRoleName(e.target.value)}
                                        required
                                        placeholder="e.g. Supervisor"
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
                            )}

                            {isCustomRole && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>{t.login_method_label}</label>
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type="radio"
                                                name="login_method"
                                                checked={loginMethod === 'PASSWORD'}
                                                onChange={() => setLoginMethod('PASSWORD')}
                                            />
                                            Password (Office)
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type="radio"
                                                name="login_method"
                                                checked={loginMethod === 'PIN'}
                                                onChange={() => setLoginMethod('PIN')}
                                            />
                                            4-Digit PIN (Floor)
                                        </label>
                                    </div>
                                </div>
                            )}

                            {loginMethod === 'PASSWORD' ? (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>{t.username_label}</label>
                                        <input
                                            type="text"
                                            value={userUsername}
                                            onChange={(e) => setUserUsername(e.target.value)}
                                            required
                                            placeholder="e.g. joko.widodo"
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
                                            {t.password_label} {editingUser && '(Leave blank to keep current)'}
                                        </label>
                                        <input
                                            type="password"
                                            value={userPassword}
                                            onChange={(e) => setUserPassword(e.target.value)}
                                            required={!editingUser}
                                            placeholder="••••••••"
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
                                </>
                            ) : (
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                                        {t.pin_label} {editingUser && '(Leave blank to keep current)'}
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={4}
                                        value={userPin}
                                        onChange={(e) => setUserPin(e.target.value.replace(/[^0-9]/g, ''))}
                                        required={!editingUser}
                                        placeholder="e.g. 1234"
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            backgroundColor: '#090d16',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '14px',
                                            letterSpacing: '0.25em',
                                            outline: 'none'
                                        }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                                        {t.pin_note}
                                    </span>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowUserModal(false)}
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
                                    Cancel
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
                                    {editingUser ? 'Save Changes' : 'Create User'}
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
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
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
                                                    ✓ Save
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
                                                width: '18px',
                                                height: '18px',
                                                accentColor: '#ef4444',
                                                cursor: 'pointer'
                                            }}
                                        />
                                        <label htmlFor="is_urgent" style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}>
                                            🚨 Urgent PO (Mark this PO as highly urgent with red highlights)
                                        </label>
                                    </div>
                                </div>

                                {/* PO Items Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#60a5fa', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items in this PO</h3>
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
                                        ➕ Add Another Item
                                    </button>
                                </div>

                                {/* Item List */}
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
                                                    top: '12px',
                                                    right: '12px',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    color: '#ef4444',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✕ Remove Item
                                            </button>
                                        )}

                                        <div className="responsive-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Item Name</label>
                                                <input
                                                    type="text"
                                                    value={item.item_name}
                                                    onChange={(e) => updatePoItemField(itemIndex, 'item_name', e.target.value)}
                                                    required
                                                    placeholder="e.g. Shaft Steel Ø45mm"
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
                                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Item Type</label>
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
                                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Qty</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.target_qty}
                                                    onChange={(e) => updatePoItemField(itemIndex, 'target_qty', parseInt(e.target.value, 10) || 1)}
                                                    required
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
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: '#f87171', marginBottom: '8px', fontWeight: 600 }}>
                                                ⚠️ Required Production Stages (Check CNC, Fabrication, or both; or Vendor):
                                            </label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                                                {['CNC', 'Fabrication', 'Vendor'].map(stage => {
                                                    const isChecked = item.required_stages.includes(stage);
                                                    return (
                                                        <button
                                                            key={stage}
                                                            type="button"
                                                            onClick={() => {
                                                                let nextStages = [...item.required_stages];
                                                                if (stage === 'Vendor') {
                                                                    if (isChecked) {
                                                                        nextStages = nextStages.filter(s => s !== 'Vendor');
                                                                    } else {
                                                                        nextStages = ['Vendor'];
                                                                    }
                                                                } else {
                                                                    nextStages = nextStages.filter(s => s !== 'Vendor');
                                                                    if (isChecked) {
                                                                        nextStages = nextStages.filter(s => s !== stage);
                                                                    } else {
                                                                        nextStages.push(stage);
                                                                    }
                                                                }
                                                                updatePoItemField(itemIndex, 'required_stages', nextStages);
                                                            }}
                                                            style={{
                                                                padding: '8px 16px',
                                                                borderRadius: '20px',
                                                                border: isChecked ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                                                                backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                                color: isChecked ? '#60a5fa' : '#64748b',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            {isChecked ? '✓ ' : ''}{stage}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Vendor Details Form Fields */}
                                            {item.required_stages.includes('Vendor') && (
                                                <div className="responsive-grid responsive-grid-half" style={{ gap: '12px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Vendor Name</label>
                                                        <input
                                                            type="text"
                                                            value={item.vendor_name || ''}
                                                            onChange={(e) => updatePoItemField(itemIndex, 'vendor_name', e.target.value)}
                                                            required
                                                            placeholder="e.g. CV. Makmur Jaya"
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
                                                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Vendor Phone Number</label>
                                                        <input
                                                            type="text"
                                                            value={item.vendor_phone || ''}
                                                            onChange={(e) => updatePoItemField(itemIndex, 'vendor_phone', e.target.value)}
                                                            required
                                                            placeholder="e.g. 08123456789"
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
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
                                    Cancel
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
                                    📢 Broadcast & Save PO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
