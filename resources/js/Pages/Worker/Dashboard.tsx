import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, Settings } from '../../Components/Icons';

interface Stage {
    id: number;
    stage_name: string;
    completed_qty: number;
    progress_percent: string;
    status: string;
    previous_completed_qty?: number | null;
    previous_progress_percent?: string | null;
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
    invoice_status?: string;
    payment_status?: string;
    po?: {
        po_number: string;
        external_po_number?: string | null;
        client_name: string;
        global_deadline: string;
        is_urgent?: boolean | null;
    };
    item_progresses: Stage[];
}

const formatDeadline = (deadlineDateStr: string | undefined, lang: 'en' | 'id') => {
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
                backgroundColor: 'rgba(251, 146, 60, 0.12)', // Orange background
                color: '#fb923c', // Orange text
                border: '1px solid rgba(251, 146, 60, 0.2)',
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
            }}>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#fb923c', borderRadius: '50%' }} />
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
                backgroundColor: 'rgba(248, 113, 113, 0.12)', // Red background
                color: '#f87171', // Red text
                border: '1px solid rgba(248, 113, 113, 0.2)',
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
            }}>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#f87171', borderRadius: '50%' }} />
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
                backgroundColor: 'rgba(251, 191, 36, 0.12)', // Yellow background
                color: '#fbbf24', // Yellow text
                border: '1px solid rgba(251, 191, 36, 0.2)',
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
            }}>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#fbbf24', borderRadius: '50%' }} />
                {text}
            </span>
        );
    } else {
        // Green warning (normal/on track)
        return (
            <span className="badge" style={{
                backgroundColor: 'rgba(52, 211, 153, 0.12)', // Green background
                color: '#34d399', // Green text
                border: '1px solid rgba(52, 211, 153, 0.2)',
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
            }}>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#34d399', borderRadius: '50%' }} />
                {lang === 'id' ? 'Normal' : 'Normal'}
            </span>
        );
    }
};

interface Props {
    items: Item[];
    auth_user?: {
        id: number;
        name: string;
        role_name: string;
        role_level: string;
        post_name: string | null;
    };
}

const translations = {
    en: {
        floor_terminal: "Floor Terminal",
        subtitle_realtime: "Log production progress in real-time",
        exit_terminal: "Exit",
        active_items: "Active Production Items",
        no_active_items: "No active items on the floor.",
        no_qc_items: "No items require QC inspection yet.",
        no_delivery_items: "No items delivered / finished yet.",
        no_finance_items: "No items delivered / finished yet.",
        client: "Client",
        deadline: "Deadline",
        qty: "Qty",
        completed: "Completed",
        progress: "Progress",
        log_rework: "Rework",
        report_failure: "Kendala",
        cancel: "Cancel",
        submit: "Submit",
        rework_dialog_title: "QC Rework",
        reject_qty_label: "Rejected Qty",
        failure_dialog_title: "Report Kendala",
        failure_type_label: "Cause",
        machine_broken: "Machine Broken",
        material_delay: "Material Delay",
        power_outage: "Power Outage",
        human_error: "Human Error",
        operator_sick: "Operator Sick",
        locked_qc: "Locked: Requires Machining & Fabrication to finish",
        locked_delivery: "Locked: Requires QC completed quantity > 0",
        locked_finance: "Locked: Requires Delivery to finish",
        finance_status: "Finance Status",
        invoiced: "Invoiced",
        uninvoiced: "Uninvoiced",
        paid: "Paid",
        unpaid: "Unpaid",
        invoice_label: "Invoice",
        payment_label: "Payment",
        save: "Save",
        issue_invoice: "Issue Invoice",
        record_payment: "Record Payment",
        revoke: "Revoke",
        finance_completed: "Completed",
        off_state: "Off State: Inactive for this production type",
        role_mismatch: "Read Only: Unauthorized operator role",
    },
    id: {
        floor_terminal: "Terminal Operator",
        subtitle_realtime: "Input progres produksi secara langsung",
        exit_terminal: "Keluar",
        active_items: "Pekerjaan Aktif",
        no_active_items: "Tidak ada pekerjaan aktif.",
        no_qc_items: "Belum ada barang yang perlu inspeksi QC.",
        no_delivery_items: "Belum ada barang yang dikirim / selesai.",
        no_finance_items: "Belum ada barang yang dikirim / selesai.",
        client: "Klien",
        deadline: "Batas Waktu",
        qty: "Jumlah",
        completed: "Selesai",
        progress: "Progres",
        log_rework: "Rework",
        report_failure: "Kendala",
        cancel: "Batal",
        submit: "Kirim",
        rework_dialog_title: "Rework QC",
        reject_qty_label: "Jumlah Reject",
        failure_dialog_title: "Lapor Kendala",
        failure_type_label: "Penyebab",
        machine_broken: "Mesin Rusak",
        material_delay: "Keterlambatan Material",
        power_outage: "Listrik Padam",
        human_error: "Kesalahan Operator",
        operator_sick: "Operator Sakit",
        locked_qc: "Terkunci: Menunggu Machining & Fabrikasi selesai",
        locked_delivery: "Terkunci: Menunggu QC selesai > 0",
        locked_finance: "Terkunci: Menunggu Pengiriman (Delivery) selesai",
        finance_status: "Status Keuangan",
        invoiced: "Sudah Difakturkan",
        uninvoiced: "Belum Difakturkan",
        paid: "Lunas",
        unpaid: "Belum Bayar",
        invoice_label: "Invoice",
        payment_label: "Pembayaran",
        save: "Simpan",
        issue_invoice: "Terbitkan Invoice",
        record_payment: "Catat Pembayaran",
        revoke: "Batalkan",
        finance_completed: "Selesai",
        off_state: "Nonaktif: Tidak digunakan untuk jenis produksi ini",
        role_mismatch: "Hanya Baca: Role Anda tidak diizinkan melakukan input",
    }
};

const isStageLocked = (item: Item, stageName: string, userRole: string) => {
    const role = userRole.toUpperCase();
    const officeRoles = ['OWNER', 'ADMIN', 'SALES', 'MANAGER'];
    if (officeRoles.includes(role)) {
        return false;
    }

    const stageLower = stageName.toLowerCase();

    // Role-based permission mapping
    if ((stageLower.includes('design') || stageLower.includes('gambar') || stageLower.includes('draft')) && role !== 'DRAFTER') return true;
    if ((stageLower.includes('material') || stageLower.includes('bahan')) && role !== 'PURCHASING') return true;
    if ((stageLower.includes('machining') || stageLower.includes('cnc')) && (role !== 'MACHINING' && role !== 'CNC' && role !== 'PRODUCTION')) return true;
    if ((stageLower.includes('fabrication') || stageLower.includes('fabrikasi')) && (role !== 'FABRICATION' && role !== 'PRODUCTION')) return true;
    if ((stageLower.includes('vendor') || stageLower.includes('purchasing')) && role !== 'PURCHASING') return true;
    if (stageLower === 'qc' && role !== 'QC') return true;
    if ((stageLower === 'delivery' || stageLower === 'pengiriman') && role !== 'DELIVERY') return true;
    if (stageLower === 'finance' && role !== 'FINANCE') return true;

    // Check off-state configuration
    const originalStages = item.item_progresses
        .map(s => s.stage_name)
        .filter(name => !['QC', 'Delivery', 'Finance', 'Pengiriman'].includes(name) && !name.endsWith('REWORK'));

    const isVendorJob = originalStages.some(name => name.toLowerCase().includes('vendor'));

    if (isVendorJob) {
        if (['machining', 'fabrication', 'fabrikasi', 'cnc', 'qc', 'delivery', 'pengiriman', 'finance'].some(v => stageLower.includes(v))) {
            return true;
        }
    } else {
        if ((stageLower.includes('machining') || stageLower.includes('cnc')) && !originalStages.some(name => name.toLowerCase().includes('machining') || name.toLowerCase().includes('cnc'))) return true;
        if ((stageLower.includes('fabrication') || stageLower.includes('fabrikasi')) && !originalStages.some(name => name.toLowerCase().includes('fabrication') || name.toLowerCase().includes('fabrikasi'))) return true;
        if (stageLower.includes('vendor')) return true;

        // Dependency lockouts
        if (stageLower === 'delivery' || stageLower === 'pengiriman') {
            const qcStage = item.item_progresses.find(s => s.stage_name === 'QC');
            if (!qcStage || qcStage.completed_qty === 0) return true;
        }

        if (stageLower === 'finance') {
            const deliveryStage = item.item_progresses.find(s => s.stage_name === 'Delivery' || s.stage_name === 'Pengiriman');
            if (!deliveryStage || deliveryStage.completed_qty === 0) return true;
        }
    }

    return false;
};

interface ItemCardProps {
    item: Item;
    userRole: string;
    slug: string;
    language: 'en' | 'id';
    translations: any;
}

function ItemCard({
    item,
    userRole,
    slug,
    language,
    translations,
}: ItemCardProps) {
    const t = translations[language];
    const [isHovered, setIsHovered] = useState(false);

    const getMatchingStages = (item: Item, role: string): Stage[] => {
        const roleUpper = role.toUpperCase();
        const isVendor = item.item_progresses.some(s => s.stage_name === 'Vendor');
        const isManufacture = !isVendor;

        const displayStages = [...item.item_progresses];
        if (isManufacture) {
            const isPaid = item.payment_status === 'PAID';
            const isInvoiced = item.invoice_status === 'INVOICED';
            const financeStatus = (isPaid && isInvoiced) ? 'COMPLETED' : 'PENDING';
            const financePercent = (isPaid && isInvoiced) ? '100' : '0';

            displayStages.push({
                id: -item.id,
                stage_name: 'Finance',
                completed_qty: 0,
                progress_percent: financePercent,
                status: financeStatus,
            });
        }

        return displayStages.filter(stage => {
            const nameLower = stage.stage_name.toLowerCase();
            if ((roleUpper === 'CNC' || roleUpper === 'MACHINING' || roleUpper === 'PRODUCTION') && (nameLower.includes('machining') || nameLower.includes('cnc'))) return true;
            if ((roleUpper === 'FABRICATION' || roleUpper === 'PRODUCTION') && (nameLower.includes('fabrication') || nameLower.includes('fabrikasi'))) return true;
            if (roleUpper === 'QC' && nameLower === 'qc') return true;
            if (roleUpper === 'DELIVERY' && (nameLower === 'delivery' || nameLower === 'pengiriman')) return true;
            if (roleUpper === 'FINANCE' && nameLower === 'finance') return true;
            if (roleUpper === 'DRAFTER' && (nameLower.includes('design') || nameLower.includes('gambar') || nameLower.includes('draft'))) return true;
            if (roleUpper === 'PURCHASING' && (nameLower.includes('vendor') || nameLower.includes('purchasing') || nameLower.includes('material') || nameLower.includes('bahan'))) return true;
            return false;
        });
    };

    const getMatchingStageOrMock = (item: Item, role: string) => {
        const stages = getMatchingStages(item, role);
        return stages.length > 0 ? stages[0] : null;
    };

    const [activeStage, setActiveStage] = useState<{ stage: Stage; item: Item } | null>(() => {
        const matched = getMatchingStageOrMock(item, userRole);
        if (matched && !isStageLocked(item, matched.stage_name, userRole)) {
            return { stage: matched, item };
        }
        return null;
    });
    const [isExpanded, setIsExpanded] = useState(false);
    const [showKendala, setShowKendala] = useState(false);
    const [showQc, setShowQc] = useState(false);
    const [kendalaType, setKendalaType] = useState('Machine Broken');
    const [kendalaNote, setKendalaNote] = useState('');
    const [rejectQty, setRejectQty] = useState('1');
    const [manualQtyInput, setManualQtyInput] = useState<string>('');

    // Finance form states
    const [invoiceStatus, setInvoiceStatus] = useState<'UNINVOICED' | 'INVOICED'>(() => (item.invoice_status as any) || 'UNINVOICED');
    const [paymentStatus, setPaymentStatus] = useState<'UNPAID' | 'PAID'>(() => (item.payment_status as any) || 'UNPAID');

    // Sync activeStage stage data when item updates from parent
    useEffect(() => {
        if (activeStage) {
            const updatedStage = item.item_progresses.find(s => s.id === activeStage.stage.id);
            if (updatedStage) {
                setActiveStage({ stage: updatedStage, item });
            } else if (activeStage.stage.id === -item.id) {
                // Virtual finance stage
                const isPaid = item.payment_status === 'PAID';
                const isInvoiced = item.invoice_status === 'INVOICED';
                const financeStatus = (isPaid && isInvoiced) ? 'COMPLETED' : 'PENDING';
                const financePercent = (isPaid && isInvoiced) ? '100' : '0';
                setActiveStage({
                    stage: {
                        id: -item.id,
                        stage_name: 'Finance',
                        completed_qty: 0,
                        progress_percent: financePercent,
                        status: financeStatus,
                    },
                    item
                });
            }
        } else {
            const matched = getMatchingStageOrMock(item, userRole);
            if (matched && !isStageLocked(item, matched.stage_name, userRole)) {
                setActiveStage({ stage: matched, item });
                setIsExpanded(true);
            }
        }
    }, [item]);

    // Keep invoice/payment statuses in sync when item props update
    useEffect(() => {
        setInvoiceStatus((item.invoice_status as any) || 'UNINVOICED');
        setPaymentStatus((item.payment_status as any) || 'UNPAID');
    }, [item.invoice_status, item.payment_status]);

    useEffect(() => {
        setManualQtyInput('');
    }, [activeStage]);

    const selectStage = (stage: Stage) => {
        if (isStageLocked(item, stage.stage_name, userRole)) return;
        if (activeStage?.stage.id === stage.id) {
            setActiveStage(null);
            setShowKendala(false);
            setShowQc(false);
            return;
        }
        setActiveStage({ stage, item });
        setShowKendala(false);
        setShowQc(false);

        if (stage.stage_name === 'Finance') {
            setInvoiceStatus((item.invoice_status as any) || 'UNINVOICED');
            setPaymentStatus((item.payment_status as any) || 'UNPAID');
        }
    };

    const handleFinanceSubmit = () => {
        router.post(`/c/${slug}/items/${item.id}/finance`, {
            invoice_status: invoiceStatus,
            payment_status: paymentStatus,
        }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const updatedItem = (page.props.items as Item[]).find(i => i.id === item.id);
                if (updatedItem) {
                    const finPercent = updatedItem.invoice_status === 'INVOICED' && updatedItem.payment_status === 'PAID' ? '100' : '0';
                    const finStatus = updatedItem.invoice_status === 'INVOICED' && updatedItem.payment_status === 'PAID' ? 'COMPLETED' : 'PENDING';
                    setActiveStage({
                        stage: {
                            id: -updatedItem.id,
                            stage_name: 'Finance',
                            completed_qty: 0,
                            progress_percent: finPercent,
                            status: finStatus,
                        },
                        item: updatedItem,
                    });
                }
            }
        });
    };

    const handleStep = (amount: number) => {
        if (!activeStage) return;
        const newQty = Math.max(0, Math.min(item.target_qty, activeStage.stage.completed_qty + amount));

        router.post(`/c/${slug}/progress/${activeStage.stage.id}/update`, {
            completed_qty: newQty
        }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const updatedItem = (page.props.items as Item[]).find(i => i.id === item.id);
                if (updatedItem) {
                    const updatedStage = updatedItem.item_progresses.find(s => s.id === activeStage.stage.id);
                    if (updatedStage) {
                        setActiveStage({ stage: updatedStage, item: updatedItem });
                    }
                }
            }
        });
    };

    const handleManualSubmit = () => {
        if (!activeStage || manualQtyInput === '') return;
        const qty = parseInt(manualQtyInput, 10);
        if (isNaN(qty)) return;
        const currentQty = activeStage.stage.completed_qty;
        if (qty < currentQty) return;
        const clampedQty = Math.min(item.target_qty, qty);

        router.post(`/c/${slug}/progress/${activeStage.stage.id}/update`, {
            completed_qty: clampedQty
        }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const updatedItem = (page.props.items as Item[]).find(i => i.id === item.id);
                if (updatedItem) {
                    const updatedStage = updatedItem.item_progresses.find(s => s.id === activeStage.stage.id);
                    if (updatedStage) {
                        setActiveStage({ stage: updatedStage, item: updatedItem });
                    }
                }
            }
        });
    };

    const revertLastUpdate = () => {
        if (!activeStage) return;
        router.post(`/c/${slug}/progress/${activeStage.stage.id}/cancel-last-update`, {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                const updatedItem = (page.props.items as Item[]).find(i => i.id === item.id);
                if (updatedItem) {
                    const updatedStage = updatedItem.item_progresses.find(s => s.id === activeStage.stage.id);
                    if (updatedStage) {
                        setActiveStage({ stage: updatedStage, item: updatedItem });
                    }
                }
            }
        });
    };

    const handlePercentSelect = (percent: number) => {
        if (!activeStage) return;
        router.post(`/c/${slug}/progress/${activeStage.stage.id}/update`, {
            progress_percent: percent
        }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const updatedItem = (page.props.items as Item[]).find(i => i.id === item.id);
                if (updatedItem) {
                    const updatedStage = updatedItem.item_progresses.find(s => s.id === activeStage.stage.id);
                    if (updatedStage) {
                        setActiveStage({ stage: updatedStage, item: updatedItem });
                    }
                }
            }
        });
    };

    const submitKendala = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeStage) return;
        router.post(`/c/${slug}/progress/${activeStage.stage.id}/kendala`, {
            kendala_type: kendalaType,
            note: kendalaNote,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowKendala(false);
                setKendalaNote('');
                setActiveStage(null);
            }
        });
    };

    const submitQcRework = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeStage) return;
        router.post(`/c/${slug}/progress/${activeStage.stage.id}/rework`, {
            reject_qty: parseInt(rejectQty, 10)
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowQc(false);
                setActiveStage(null);
            }
        });
    };

    const processedStages = item.item_progresses.filter(s => s.status === 'COMPLETED' || s.status === 'STUCK');
    const totalStages = item.item_progresses.length;
    const stageProgress = totalStages > 0 ? Math.round((processedStages.length / totalStages) * 100) : 0;
    const isActive = !!activeStage;

    return (
        <div 
            className="worker-item-card"
            style={{
                borderColor: (item.po?.is_urgent || item.alerts?.some(a => a.severity === 'YELLOW' && !a.is_resolved)) ? 'rgba(251, 146, 60, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                boxShadow: (item.po?.is_urgent || item.alerts?.some(a => a.severity === 'YELLOW' && !a.is_resolved)) ? '0 4px 15px rgba(251, 146, 60, 0.08)' : '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            }}
        >
            {/* Card Header (Clickable to Toggle Drawer) */}
            <div 
                onClick={() => {
                    const next = !isExpanded;
                    setIsExpanded(next);
                    if (next && !activeStage) {
                        const matched = getMatchingStageOrMock(item, userRole);
                        if (matched && !isStageLocked(item, matched.stage_name, userRole)) {
                            setActiveStage({ stage: matched, item });
                        }
                    }
                }}
                style={{ 
                    padding: '14px 16px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.2s',
                    backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Row 1: Item Name & Progress Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h3 style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        margin: 0,
                        color: '#f8fafc',
                        lineHeight: '1.35',
                        wordBreak: 'break-word',
                    }}>
                        {item.item_name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: '#818cf8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}>
                            <span>{parseFloat(item.progress_percent).toFixed(0)}%</span>
                            <span style={{ fontSize: '8px', color: '#a1a1aa', fontWeight: 'normal' }}>
                                ({item.delivered_qty || 0}/{item.target_qty || 0})
                            </span>
                        </span>
                        {/* Chevron Indicator */}
                        <span style={{
                            color: '#71717a',
                            display: 'flex',
                            alignItems: 'center',
                        }}>
                            {isExpanded ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="18 15 12 9 6 15"></polyline>
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            )}
                        </span>
                    </div>
                </div>

                {/* Row 2: Client & PO Details */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    fontSize: '11px',
                    marginTop: '6px',
                }}>
                    <span style={{ color: '#818cf8', fontWeight: 600 }}>
                        {item.po?.client_name || 'N/A'}
                    </span>
                    <span style={{ color: '#a1a1aa', textAlign: 'right' }}>
                        {item.po?.po_number || ''}
                    </span>
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    fontSize: '11px',
                    marginTop: '2px',
                    color: '#a1a1aa',
                }}>
                    <span>
                        {formatDeadline(item.po?.global_deadline, language)}
                    </span>
                    <span style={{ color: '#a5b4fc', fontWeight: 600, textAlign: 'right' }}>
                        {item.target_qty} pcs
                    </span>
                </div>

                {/* Row 3: Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                    {item.po?.is_urgent && (
                        <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(248, 113, 113, 0.12)',
                            color: '#f87171',
                            border: '1px solid rgba(248, 113, 113, 0.2)',
                            flexShrink: 0,
                        }}>
                            URGENT
                        </span>
                    )}
                    <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        color: '#a1a1aa',
                        flexShrink: 0,
                    }}>
                        {item.item_type === 'MANUFACTURE' 
                            ? (language === 'id' ? 'Produksi Internal' : 'Manufactured') 
                            : (language === 'id' ? 'Beli Jadi (Buyout)' : 'Buyout')}
                    </span>
                    {item.drafter_status && (
                        <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: item.drafter_status === 'APPROVED' ? 'rgba(52, 211, 153, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                            color: item.drafter_status === 'APPROVED' ? '#34d399' : '#a78bfa',
                            flexShrink: 0,
                        }}>
                            {item.drafter_status === 'APPROVED' 
                                ? (language === 'id' ? 'Gambar Disetujui' : 'Drawing Approved')
                                : (language === 'id' ? `Gambar: ${item.drafter_status}` : `Drawing: ${item.drafter_status}`)}
                        </span>
                    )}
                    {item.purchasing_status && (
                        <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: item.purchasing_status === 'READY' ? 'rgba(52, 211, 153, 0.12)' :
                                item.purchasing_status === 'PROSES' ? 'rgba(251, 191, 36, 0.12)' :
                                'rgba(99, 102, 241, 0.12)',
                            color: item.purchasing_status === 'READY' ? '#34d399' :
                                item.purchasing_status === 'PROSES' ? '#fbbf24' :
                                '#818cf8',
                            flexShrink: 0,
                        }}>
                            {item.purchasing_status === 'READY'
                                ? (language === 'id' ? 'Bahan Baku Siap' : 'Material Ready')
                                : item.purchasing_status === 'PROSES'
                                ? (language === 'id' ? 'Bahan Dipesan' : 'Material Ordered')
                                : (language === 'id' ? `Material: ${item.purchasing_status}` : `Material: ${item.purchasing_status}`)}
                        </span>
                    )}
                    {(() => {
                        const reworkAlert = item.alerts?.find(a => a.severity === 'YELLOW' && !a.is_resolved);
                        const reworkVal = reworkAlert ? (reworkAlert.message ? `Rework: ${reworkAlert.message}` : 'Rework') : null;
                        return renderWarningPill(item.po?.global_deadline, reworkVal, language);
                    })()}
                </div>
            </div>

            {/* Expanded Drawer System */}
            {isExpanded && (
                <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                }}>
                    {/* Stage selector for hybrid roles */}
                    {(() => {
                        const userStages = getMatchingStages(item, userRole).filter(s => s.stage_name !== 'Finance');
                        if (userStages.length > 1) {
                            return (
                                <div style={{
                                    display: 'flex',
                                    gap: '4px',
                                    padding: '8px 12px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                    flexWrap: 'wrap',
                                }}>
                                    {userStages.map(stage => {
                                        const isActive = activeStage?.stage.id === stage.id;
                                        const stageLower = stage.stage_name.toLowerCase();
                                        let color = '#71717a';
                                        if (stageLower.includes('machining') || stageLower.includes('cnc')) color = '#6366f1';
                                        else if (stageLower.includes('fabrication') || stageLower.includes('fabrikasi')) color = '#8b5cf6';
                                        else if (stageLower === 'qc') color = '#fbbf24';
                                        else if (stageLower === 'delivery' || stageLower === 'pengiriman') color = '#34d399';

                                        return (
                                            <button
                                                key={stage.id}
                                                onClick={() => selectStage(stage)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    border: isActive ? '1px solid ' + color : '1px solid rgba(255,255,255,0.08)',
                                                    backgroundColor: isActive ? color + '20' : 'transparent',
                                                    color: isActive ? color : '#a1a1aa',
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    cursor: isStageLocked(item, stage.stage_name, userRole) ? 'not-allowed' : 'pointer',
                                                    opacity: isStageLocked(item, stage.stage_name, userRole) ? 0.4 : 1,
                                                }}
                                            >
                                                {stage.stage_name}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        }
                        return null;
                    })()}
                    {/* Inline Progress Controls */}
                    {activeStage ? (
                        <div style={{
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            padding: '10px 12px',
                            backgroundColor: 'rgba(0, 0, 0, 0.15)',
                        }}>
                            {(() => {
                                const isDrafterStage = activeStage.stage.stage_name.toLowerCase().includes('design') ||
                                    activeStage.stage.stage_name.toLowerCase().includes('gambar') ||
                                    activeStage.stage.stage_name.toLowerCase().includes('draft');

                                if (isDrafterStage) {
                                    const currentStatus = item.drafter_status;
                                    const statuses = ['DRAWING', 'APPROVED'];
                                    const currentIdx = statuses.indexOf(currentStatus || '');

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', margin: '0 0 2px 0' }}>
                                                {language === 'en' ? 'Drafter Status' : 'Status Drafter'}
                                            </h4>
                                            <div style={{
                                                display: 'flex',
                                                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                                padding: '4px',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                                gap: '4px'
                                            }}>
                                                {statuses.map((status) => {
                                                    const isActive = currentStatus === status;
                                                    const isDisabled = currentIdx !== -1 && statuses.indexOf(status) < currentIdx;
                                                    return (
                                                        <button
                                                            key={status}
                                                            onClick={() => {
                                                                if (isActive) return;
                                                                router.post(`/c/${slug}/items/${item.id}/drafter-status`, {
                                                                    drafter_status: status,
                                                                }, {
                                                                    preserveScroll: true,
                                                                });
                                                            }}
                                                            disabled={isDisabled}
                                                            style={{
                                                                flex: 1,
                                                                padding: '12px 4px',
                                                                borderRadius: '8px',
                                                                border: 'none',
                                                                background: isActive ? '#6366f1' : 'transparent',
                                                                color: isActive ? '#fafafa' : '#a1a1aa',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                opacity: isDisabled ? 0.3 : 1,
                                                                boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                                                            }}
                                                        >
                                                            {status}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }

                                const isPurchasingStage = activeStage.stage.stage_name.toLowerCase().includes('vendor') ||
                                    activeStage.stage.stage_name.toLowerCase().includes('purchasing') ||
                                    activeStage.stage.stage_name.toLowerCase().includes('material') ||
                                    activeStage.stage.stage_name.toLowerCase().includes('bahan');

                                if (isPurchasingStage) {
                                    const currentStatus = item.purchasing_status;
                                    const statuses = ['ORDER', 'PROSES', 'READY']; // already ordered
                                    const currentIdx = statuses.indexOf(currentStatus || '');

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', margin: '0 0 2px 0' }}>
                                                {language === 'en' ? 'Purchasing Status' : 'Status Pembelian'}
                                            </h4>
                                            <div style={{
                                                display: 'flex',
                                                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                                padding: '4px',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                                gap: '4px'
                                            }}>
                                                {statuses.map((status) => {
                                                    const isActive = currentStatus === status;
                                                    const isDisabled = currentIdx !== -1 && statuses.indexOf(status) < currentIdx;
                                                    return (
                                                        <button
                                                            key={status}
                                                            onClick={() => {
                                                                if (isActive) return;
                                                                router.post(`/c/${slug}/items/${item.id}/purchasing-status`, {
                                                                    purchasing_status: status,
                                                                }, {
                                                                    preserveScroll: true,
                                                                });
                                                            }}
                                                            disabled={isDisabled}
                                                            style={{
                                                                flex: 1,
                                                                padding: '12px 4px',
                                                                borderRadius: '8px',
                                                                border: 'none',
                                                                background: isActive ? '#6366f1' : 'transparent',
                                                                color: isActive ? '#fafafa' : '#a1a1aa',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                opacity: isDisabled ? 0.3 : 1,
                                                                boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                                                            }}
                                                        >
                                                            {status}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }

                                if (activeStage.stage.stage_name === 'Finance') {
                                    const isInvoiced = invoiceStatus === 'INVOICED';
                                    const isPaid = paymentStatus === 'PAID';

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: isInvoiced ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                                                    color: isInvoiced ? '#34d399' : '#a1a1aa',
                                                    border: '1px solid ' + (isInvoiced ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.06)'),
                                                }}>
                                                    {t.invoice_label}: {isInvoiced ? t.invoiced : t.uninvoiced}
                                                </span>
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: isPaid ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                                                    color: isPaid ? '#34d399' : '#a1a1aa',
                                                    border: '1px solid ' + (isPaid ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.06)'),
                                                }}>
                                                    {t.payment_label}: {isPaid ? t.paid : t.unpaid}
                                                </span>
                                            </div>

                                            {!isInvoiced ? (
                                                <button
                                                    onClick={() => {
                                                        router.post(`/c/${slug}/items/${item.id}/finance`, {
                                                            invoice_status: 'INVOICED',
                                                            payment_status: 'UNPAID',
                                                        }, {
                                                            preserveScroll: true,
                                                            onSuccess: (page) => {
                                                                const updatedItem = (page.props.items as Item[]).find(i => i.id === item.id);
                                                                if (updatedItem) {
                                                                    setActiveStage({
                                                                        stage: {
                                                                            id: -updatedItem.id,
                                                                            stage_name: 'Finance',
                                                                            completed_qty: 0,
                                                                            progress_percent: '0',
                                                                            status: 'PENDING',
                                                                        },
                                                                        item: updatedItem,
                                                                    });
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    style={{
                                                        padding: '10px',
                                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                                        color: '#fafafa',
                                                        fontWeight: 700,
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    {t.issue_invoice}
                                                </button>
                                            ) : isPaid ? (
                                                <div style={{
                                                    padding: '10px',
                                                    backgroundColor: 'rgba(52, 211, 153, 0.12)',
                                                    color: '#34d399',
                                                    border: '1px solid rgba(52, 211, 153, 0.2)',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    textAlign: 'center',
                                                }}>
                                                    ✓ {t.finance_completed}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        router.post(`/c/${slug}/items/${item.id}/finance`, {
                                                            invoice_status: 'INVOICED',
                                                            payment_status: 'PAID',
                                                        }, {
                                                            preserveScroll: true,
                                                            onSuccess: (page) => {
                                                                const updatedItem = (page.props.items as Item[]).find(i => i.id === item.id);
                                                                if (updatedItem) {
                                                                    setActiveStage({
                                                                        stage: {
                                                                            id: -updatedItem.id,
                                                                            stage_name: 'Finance',
                                                                            completed_qty: 0,
                                                                            progress_percent: '100',
                                                                            status: 'COMPLETED',
                                                                        },
                                                                        item: updatedItem,
                                                                    });
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    style={{
                                                        padding: '10px',
                                                        backgroundColor: '#34d399',
                                                        color: '#fff',
                                                        fontWeight: 700,
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    {t.record_payment}
                                                </button>
                                            )}

                                            {(isInvoiced || isPaid) && (
                                                <button
                                                    onClick={() => {
                                                        const newInvoice = isInvoiced && !isPaid ? 'UNINVOICED' : 'UNINVOICED';
                                                        const newPayment = isPaid ? 'UNPAID' : 'UNPAID';
                                                        router.post(`/c/${slug}/items/${item.id}/finance`, {
                                                            invoice_status: newInvoice,
                                                            payment_status: newPayment,
                                                        }, {
                                                            preserveScroll: true,
                                                            onSuccess: (page) => {
                                                                const updatedItem = (page.props.items as Item[]).find(i => i.id === item.id);
                                                                if (updatedItem) {
                                                                    setActiveStage({
                                                                        stage: {
                                                                            id: -updatedItem.id,
                                                                            stage_name: 'Finance',
                                                                            completed_qty: 0,
                                                                            progress_percent: '0',
                                                                            status: 'PENDING',
                                                                        },
                                                                        item: updatedItem,
                                                                    });
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    style={{
                                                        padding: '6px',
                                                        backgroundColor: 'transparent',
                                                        color: '#71717a',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                        borderRadius: '8px',
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    {t.revoke}
                                                </button>
                                            )}
                                        </div>
                                    );
                                }

                                const stageNameLower = activeStage.stage.stage_name.toLowerCase();
                                const isDesignStage = stageNameLower.includes('design') || stageNameLower.includes('gambar') || stageNameLower.includes('draft');
                                const isMaterialStage = stageNameLower.includes('material') || stageNameLower.includes('bahan') || stageNameLower.includes('vendor') || stageNameLower.includes('purchasing');
                                const isQcStage = stageNameLower === 'qc';

                                if (isDesignStage) {
                                    const currentPct = parseFloat(activeStage.stage.progress_percent);
                                    const options = [
                                        { label: language === 'id' ? 'Drafting' : 'Drafting', pct: 50 },
                                        { label: language === 'id' ? 'Disetujui' : 'Approved', pct: 100 },
                                    ];

                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                            {options.map((opt) => {
                                                const isDisabled = opt.pct < currentPct;
                                                const isActive = Math.abs(currentPct - opt.pct) < 2;
                                                return (
                                                    <button
                                                        key={opt.pct}
                                                        onClick={() => !isDisabled && handlePercentSelect(opt.pct)}
                                                        disabled={isDisabled}
                                                        style={{
                                                            padding: '12px 6px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            backgroundColor: isActive ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                                                            color: '#fff',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                            opacity: isDisabled ? 0.3 : 1,
                                                        }}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                }

                                if (isMaterialStage) {
                                    const currentPct = parseFloat(activeStage.stage.progress_percent);
                                    const options = [
                                        { label: language === 'id' ? 'Pesan (Order)' : 'Order', pct: 33 },
                                        { label: language === 'id' ? 'Proses' : 'Process', pct: 66 },
                                        { label: language === 'id' ? 'Selesai' : 'Complete', pct: 100 },
                                    ];

                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                                            {options.map((opt) => {
                                                const isDisabled = opt.pct < currentPct;
                                                const isActive = Math.abs(currentPct - opt.pct) < 2;
                                                return (
                                                    <button
                                                        key={opt.pct}
                                                        onClick={() => !isDisabled && handlePercentSelect(opt.pct)}
                                                        disabled={isDisabled}
                                                        style={{
                                                            padding: '12px 4px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            backgroundColor: isActive ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                                                            color: '#fff',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                            opacity: isDisabled ? 0.3 : 1,
                                                        }}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                }

                                return (
                                    <>
                                        {item.target_qty > 1 && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '12px',
                                                marginBottom: '12px',
                                                padding: '8px 12px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255, 255, 255, 0.04)',
                                            }}>
                                                <div style={{ marginRight: 'auto', paddingLeft: '4px' }}>
                                                    <div style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                        {language === 'en' ? 'Completed' : 'Selesai'}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                                                        <span style={{ fontSize: '24px', fontWeight: 800, color: '#fafafa', lineHeight: '1' }}>
                                                            {activeStage.stage.completed_qty}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: '#71717a' }}>
                                                            / {item.target_qty}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStep(-1)}
                                                        style={{
                                                            width: '44px',
                                                            height: '44px',
                                                            borderRadius: '12px',
                                                            border: '1px solid rgba(248, 113, 113, 0.2)',
                                                            backgroundColor: 'rgba(248, 113, 113, 0.08)',
                                                            color: '#f87171',
                                                            fontSize: '20px',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                        title="Decrease"
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={item.target_qty}
                                                        value={manualQtyInput}
                                                        onChange={(e) => setManualQtyInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                                                        placeholder={`Set`}
                                                        style={{
                                                            width: '56px',
                                                            height: '44px',
                                                            borderRadius: '12px',
                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                            backgroundColor: '#0a0a0c',
                                                            color: '#fafafa',
                                                            fontSize: '14px',
                                                            fontWeight: 700,
                                                            textAlign: 'center',
                                                            outline: 'none',
                                                            boxSizing: 'border-box',
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStep(1)}
                                                        style={{
                                                            width: '44px',
                                                            height: '44px',
                                                            borderRadius: '12px',
                                                            border: 'none',
                                                            backgroundColor: '#34d399',
                                                            color: '#18181b',
                                                            fontSize: '20px',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)',
                                                        }}
                                                        title="Increase"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {item.target_qty === 1 && isQcStage && (
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '8px',
                                                marginBottom: '8px',
                                            }}>
                                                <button
                                                    onClick={() => {
                                                        if (!activeStage) return;
                                                        router.post(`/c/${slug}/progress/${activeStage.stage.id}/rework`, {
                                                            reject_qty: 1
                                                        }, {
                                                            preserveScroll: true,
                                                            onSuccess: () => {
                                                                setShowQc(false);
                                                                setActiveStage(null);
                                                            }
                                                        });
                                                    }}
                                                    style={{
                                                        padding: '16px 8px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        backgroundColor: '#f87171',
                                                        color: '#ffffff',
                                                        fontSize: '14px',
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    NG
                                                </button>
                                                <button
                                                    onClick={() => handlePercentSelect(100)}
                                                    style={{
                                                        padding: '16px 8px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        backgroundColor: '#34d399',
                                                        color: '#ffffff',
                                                        fontSize: '14px',
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    OK
                                                </button>
                                            </div>
                                        )}

                                        {item.target_qty === 1 && !isQcStage && (
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(5, 1fr)',
                                                gap: '6px',
                                                marginBottom: '8px',
                                            }}>
                                                {[0, 25, 50, 75, 100].map((pct) => {
                                                    const currentPct = parseFloat(activeStage.stage.progress_percent);
                                                    const isDisabled = pct < currentPct;
                                                    return (
                                                        <button
                                                            key={pct}
                                                            onClick={() => !isDisabled && handlePercentSelect(pct)}
                                                            disabled={isDisabled}
                                                            style={{
                                                                padding: '10px 4px',
                                                                borderRadius: '6px',
                                                                border: 'none',
                                                                backgroundColor: currentPct === pct
                                                                    ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                                                                color: '#fff',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                opacity: isDisabled ? 0.3 : 1,
                                                            }}
                                                        >
                                                            {pct}%
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Revert Last Update Button */}
                                        {((activeStage.stage.previous_completed_qty !== null && activeStage.stage.previous_completed_qty !== undefined) || 
                                          (activeStage.stage.previous_progress_percent !== null && activeStage.stage.previous_progress_percent !== undefined)) && (
                                            <div style={{ marginBottom: '8px' }}>
                                                <button
                                                    onClick={revertLastUpdate}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        backgroundColor: 'rgba(248, 113, 113, 0.12)',
                                                        color: '#f87171',
                                                        border: '1px solid rgba(248, 113, 113, 0.2)',
                                                        borderRadius: '8px',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    {language === 'en' ? 'Revert Last Update' : 'Batal / Revert Update Terakhir'}
                                                </button>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => setShowKendala(prev => !prev)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    backgroundColor: showKendala ? 'rgba(248, 113, 113, 0.22)' : 'rgba(248, 113, 113, 0.1)',
                                                    color: '#f87171',
                                                    border: '1px solid rgba(248, 113, 113, 0.2)',
                                                    borderRadius: '8px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px',
                                                }}
                                            >
                                                <AlertTriangle size={12} /> {t.report_failure}
                                            </button>
                                            {(!isQcStage || item.target_qty > 1) && (
                                                <button
                                                    onClick={() => setShowQc(prev => !prev)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px',
                                                        backgroundColor: showQc ? 'rgba(251, 191, 36, 0.22)' : 'rgba(251, 191, 36, 0.1)',
                                                        color: '#fbbf24',
                                                        border: '1px solid rgba(251, 191, 36, 0.2)',
                                                        borderRadius: '8px',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '4px',
                                                    }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="11" cy="11" r="8" />
                                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                                        <line x1="8" y1="11" x2="14" y2="11" />
                                                    </svg> {t.log_rework}
                                                </button>
                                            )}
                                        </div>

                                        {showKendala && (
                                            <form onSubmit={submitKendala} style={{
                                                marginTop: '8px',
                                                padding: '10px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                                borderRadius: '10px',
                                            }}>
                                                <label style={{ fontSize: '10px', color: '#a1a1aa', marginBottom: '4px', display: 'block' }}>
                                                    {t.failure_type_label}
                                                </label>
                                                <select
                                                    value={kendalaType}
                                                    onChange={(e) => setKendalaType(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 10px',
                                                        backgroundColor: '#0a0a0c',
                                                        color: '#fafafa',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        outline: 'none',
                                                        marginBottom: '8px',
                                                    }}
                                                >
                                                    <option value="Machine Broken">{t.machine_broken}</option>
                                                    <option value="Material Delay">{t.material_delay}</option>
                                                    <option value="Operator Sick">{t.operator_sick}</option>
                                                    <option value="Power Outage">{t.power_outage}</option>
                                                </select>
                                                <label style={{ fontSize: '10px', color: '#a1a1aa', marginTop: '8px', marginBottom: '4px', display: 'block' }}>
                                                    {language === 'en' ? 'Note / Description' : 'Catatan / Deskripsi'}
                                                </label>
                                                <textarea
                                                    value={kendalaNote}
                                                    onChange={(e) => setKendalaNote(e.target.value)}
                                                    placeholder={language === 'en' ? 'Provide details about the issue...' : 'Berikan detail mengenai kendala...'}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 10px',
                                                        backgroundColor: '#0a0a0c',
                                                        color: '#fafafa',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        outline: 'none',
                                                        marginBottom: '8px',
                                                        resize: 'vertical',
                                                        minHeight: '60px',
                                                        boxSizing: 'border-box',
                                                    }}
                                                />
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowKendala(false)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: 'transparent',
                                                            color: '#a1a1aa',
                                                            border: 'none',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {t.cancel}
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        style={{
                                                            padding: '6px 14px',
                                                            backgroundColor: '#f87171',
                                                            color: '#fff',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            fontWeight: 600,
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {t.submit}
                                                    </button>
                                                </div>
                                            </form>
                                        )}

                                        {showQc && (
                                            <form onSubmit={submitQcRework} style={{
                                                marginTop: '8px',
                                                padding: '10px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                                borderRadius: '10px',
                                            }}>
                                                <label style={{ fontSize: '10px', color: '#a1a1aa', marginBottom: '4px', display: 'block' }}>
                                                    {t.reject_qty_label}
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={rejectQty}
                                                    onChange={(e) => setRejectQty(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 10px',
                                                        backgroundColor: '#0a0a0c',
                                                        color: '#fafafa',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        outline: 'none',
                                                        marginBottom: '8px',
                                                    }}
                                                />
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowQc(false)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: 'transparent',
                                                            color: '#a1a1aa',
                                                            border: 'none',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {t.cancel}
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        style={{
                                                            padding: '6px 14px',
                                                            backgroundColor: '#fbbf24',
                                                            color: '#18181b',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            fontWeight: 700,
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {t.submit}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </>
                                );
                            })()}

                            {/* Done Button */}
                            <button
                                onClick={() => {
                                    setActiveStage(null);
                                    setIsExpanded(false);
                                    setShowKendala(false);
                                    setShowQc(false);
                                }}
                                style={{
                                    marginTop: '12px',
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: 'rgba(52, 211, 153, 0.12)',
                                    color: '#34d399',
                                    border: '1px solid rgba(52, 211, 153, 0.2)',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                }}
                            >
                                {language === 'en' ? 'Done' : 'Selesai'}
                            </button>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

export default function WorkerDashboard({ items, auth_user }: Props) {
    const { props, url } = usePage();
    const pathParts = url.split('/');
    const slug = pathParts[2] || '';
    const userRole = auth_user?.role_name ? auth_user.role_name.toUpperCase() : '';

    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
        }
        return 'en';
    });

    const t = translations[language];

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const changeLanguage = (lang: 'en' | 'id') => {
        setLanguage(lang);
        localStorage.setItem('pogrid_lang', lang);
    };

    return (
        <div className="dashboard-root" style={{
            backgroundColor: '#09090b',
            fontFamily: 'Inter, sans-serif',
            color: '#fafafa',
        }}>
            {/* Header */}
            <header className="responsive-header" style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                backgroundColor: 'rgba(9, 9, 11, 0.6)',
                backdropFilter: 'blur(8px)',
                flexShrink: 0,
            }}>
                <div>
                    <div className="greeting-name" style={{ fontSize: '13px', color: '#818cf8', fontWeight: 600, marginBottom: '2px' }}>
                        {language === 'en' ? `Hello, ${auth_user?.name}` : `Halo, ${auth_user?.name}`}
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{t.floor_terminal}</h1>
                    <p style={{ fontSize: '12px', color: '#71717a', margin: '2px 0 0 0' }}>
                        {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' · '}
                        {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%', marginTop: '4px' }}>
                    {/* Left: Language switcher */}
                    <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <button
                            onClick={() => changeLanguage('en')}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: language === 'en' ? '#6366f1' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '11px',
                                cursor: 'pointer',
                            }}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => changeLanguage('id')}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: language === 'id' ? '#6366f1' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '11px',
                                cursor: 'pointer',
                            }}
                        >
                            ID
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* Trouble Reports Button */}
                        <a
                            href={`/c/${slug}/trouble-reports`}
                            style={{
                                width: '38px',
                                height: '38px',
                                backgroundColor: 'rgba(248, 113, 113, 0.12)',
                                color: '#f87171',
                                border: '1px solid rgba(248, 113, 113, 0.2)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none',
                            }}
                            title={language === 'en' ? 'Trouble Reports' : 'Laporan Kendala'}
                        >
                            <AlertTriangle size={18} />
                        </a>

                        {/* Profile Button */}
                        <a
                            href={`/c/${slug}/profile`}
                            style={{
                                width: '38px',
                                height: '38px',
                                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                color: '#a1a1aa',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none',
                            }}
                            title={language === 'en' ? 'Profile' : 'Profil'}
                        >
                            <Settings size={18} />
                        </a>

                        <button
                            onClick={() => router.post('/logout')}
                            style={{
                                height: '38px',
                                padding: '0 16px',
                                backgroundColor: '#f87171',
                                color: '#fff',
                                fontWeight: 700,
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(248, 113, 113, 0.2)',
                            }}
                        >
                            {t.exit_terminal}
                        </button>
                    </div>
                </div>
            </header>

            {/* Items List */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                WebkitOverflowScrolling: 'touch',
            }}>
                {items.length === 0 ? (
                    <p style={{ color: '#71717a', padding: '24px', textAlign: 'center', fontSize: '14px' }}>
                        {userRole === 'QC' ? t.no_qc_items : userRole === 'DELIVERY' ? t.no_delivery_items : userRole === 'FINANCE' ? t.no_finance_items : t.no_active_items}
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map((item) => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                userRole={userRole}
                                slug={slug}
                                language={language}
                                translations={translations}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
