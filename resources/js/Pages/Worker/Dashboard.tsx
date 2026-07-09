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

const renderWarningPill = (deadlineDateStr: string | undefined, hasRework: boolean, lang: 'en' | 'id') => {
    if (!deadlineDateStr) return null;
    
    // Check Rework first (takes precedence or is a high priority status)
    if (hasRework) {
        return (
            <span className="badge" style={{
                backgroundColor: 'rgba(249, 115, 22, 0.15)', // Orange background
                color: '#f97316', // Orange text
                border: '1px solid rgba(249, 115, 22, 0.2)',
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
            }}>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#f97316', borderRadius: '50%' }} />
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
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
            }}>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#ef4444', borderRadius: '50%' }} />
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
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
            }}>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#eab308', borderRadius: '50%' }} />
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
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
            }}>
                <span style={{ width: '4px', height: '4px', backgroundColor: '#10b981', borderRadius: '50%' }} />
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
        role: string;
    };
}

const translations = {
    en: {
        floor_terminal: "Floor Terminal",
        subtitle_realtime: "Log production progress in real-time",
        exit_terminal: "Exit",
        active_items: "Active Production Items",
        no_active_items: "No active items on the floor.",
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
        invoice_label: "Invoicing Status",
        payment_label: "Payment Status",
        save: "Save",
        off_state: "Off State: Inactive for this production type",
        role_mismatch: "Read Only: Unauthorized operator role",
    },
    id: {
        floor_terminal: "Terminal Operator",
        subtitle_realtime: "Input progres produksi secara langsung",
        exit_terminal: "Keluar",
        active_items: "Pekerjaan Aktif",
        no_active_items: "Tidak ada pekerjaan aktif.",
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
        invoice_label: "Status Invoice",
        payment_label: "Status Pembayaran",
        save: "Simpan",
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
    if ((stageLower.includes('machining') || stageLower.includes('cnc')) && (role !== 'MACHINING' && role !== 'CNC')) return true;
    if ((stageLower.includes('fabrication') || stageLower.includes('fabrikasi')) && role !== 'FABRICATION') return true;
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
        if (stageLower === 'qc') {
            const prodStages = item.item_progresses.filter(s => originalStages.includes(s.stage_name));
            const allProdFinished = prodStages.length > 0 && prodStages.every(s => s.status === 'COMPLETED');
            if (!allProdFinished) return true;
        }

        if (stageLower === 'delivery' || stageLower === 'pengiriman') {
            const qcStage = item.item_progresses.find(s => s.stage_name === 'QC');
            if (!qcStage || qcStage.completed_qty === 0) return true;
        }

        if (stageLower === 'finance') {
            const deliveryStage = item.item_progresses.find(s => s.stage_name === 'Delivery' || s.stage_name === 'Pengiriman');
            if (!deliveryStage || deliveryStage.status !== 'COMPLETED') return true;
        }
    }

    return false;
};

const getStageLockReason = (item: Item, stageName: string, userRole: string) => {
    const role = userRole.toUpperCase();
    const officeRoles = ['OWNER', 'ADMIN', 'SALES', 'MANAGER'];
    if (officeRoles.includes(role)) {
        return '';
    }

    const stageLower = stageName.toLowerCase();

    // Check off-state configuration
    const originalStages = item.item_progresses
        .map(s => s.stage_name)
        .filter(name => !['QC', 'Delivery', 'Finance', 'Pengiriman'].includes(name) && !name.endsWith('REWORK'));

    const isVendorJob = originalStages.some(name => name.toLowerCase().includes('vendor'));

    if (isVendorJob) {
        if (['machining', 'fabrication', 'fabrikasi', 'cnc', 'qc', 'delivery', 'pengiriman', 'finance'].some(v => stageLower.includes(v))) {
            return 'off_state';
        }
    } else {
        if ((stageLower.includes('machining') || stageLower.includes('cnc')) && !originalStages.some(name => name.toLowerCase().includes('machining') || name.toLowerCase().includes('cnc'))) return 'off_state';
        if ((stageLower.includes('fabrication') || stageLower.includes('fabrikasi')) && !originalStages.some(name => name.toLowerCase().includes('fabrication') || name.toLowerCase().includes('fabrikasi'))) return 'off_state';
        if (stageLower.includes('vendor')) return 'off_state';
    }

    // Role mismatch
    if ((stageLower.includes('machining') || stageLower.includes('cnc')) && (role !== 'MACHINING' && role !== 'CNC')) return 'role_mismatch';
    if ((stageLower.includes('fabrication') || stageLower.includes('fabrikasi')) && role !== 'FABRICATION') return 'role_mismatch';
    if ((stageLower.includes('vendor') || stageLower.includes('purchasing')) && role !== 'PURCHASING') return 'role_mismatch';
    if (stageLower === 'qc' && role !== 'QC') return 'role_mismatch';
    if ((stageLower === 'delivery' || stageLower === 'pengiriman') && role !== 'DELIVERY') return 'role_mismatch';
    if (stageLower === 'finance' && role !== 'FINANCE') return 'role_mismatch';

    // Dependency lockouts
    if (stageLower === 'qc') {
        const prodStages = item.item_progresses.filter(s => originalStages.includes(s.stage_name));
        const allProdFinished = prodStages.length > 0 && prodStages.every(s => s.status === 'COMPLETED');
        if (!allProdFinished) return 'locked_qc';
    }

    if (stageLower === 'delivery' || stageLower === 'pengiriman') {
        const qcStage = item.item_progresses.find(s => s.stage_name === 'QC');
        if (!qcStage || qcStage.completed_qty === 0) return 'locked_delivery';
    }

    if (stageLower === 'finance') {
        const deliveryStage = item.item_progresses.find(s => s.stage_name === 'Delivery' || s.stage_name === 'Pengiriman');
        if (!deliveryStage || deliveryStage.status !== 'COMPLETED') return 'locked_finance';
    }

    return '';
};

interface ItemCardProps {
    item: Item;
    userRole: string;
    slug: string;
    language: 'en' | 'id';
    translations: any;
    showRulesModal: boolean;
    setShowRulesModal: (show: boolean) => void;
}

function ItemCard({
    item,
    userRole,
    slug,
    language,
    translations,
    showRulesModal,
    setShowRulesModal,
}: ItemCardProps) {
    const t = translations[language];

    const getMatchingStageOrMock = (item: Item, role: string) => {
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

        const matchedActual = displayStages.find(stage => {
            const nameLower = stage.stage_name.toLowerCase();
            if ((roleUpper === 'CNC' || roleUpper === 'MACHINING') && (nameLower.includes('machining') || nameLower.includes('cnc'))) return true;
            if (roleUpper === 'FABRICATION' && (nameLower.includes('fabrication') || nameLower.includes('fabrikasi'))) return true;
            if (roleUpper === 'QC' && nameLower === 'qc') return true;
            if (roleUpper === 'DELIVERY' && (nameLower === 'delivery' || nameLower === 'pengiriman')) return true;
            if (roleUpper === 'FINANCE' && nameLower === 'finance') return true;
            if (roleUpper === 'PURCHASING' && (nameLower.includes('vendor') || nameLower.includes('purchasing'))) return true;
            return false;
        });

        if (matchedActual) {
            return matchedActual;
        }

        // Return mock stage to trigger off_state lock reason when mismatching
        if (roleUpper === 'CNC' || roleUpper === 'MACHINING') {
            return { id: 0, stage_name: 'Machining', completed_qty: 0, progress_percent: '0', status: 'PENDING' };
        }
        if (roleUpper === 'FABRICATION') {
            return { id: 0, stage_name: 'Fabrication', completed_qty: 0, progress_percent: '0', status: 'PENDING' };
        }
        if (roleUpper === 'QC') {
            return { id: 0, stage_name: 'QC', completed_qty: 0, progress_percent: '0', status: 'PENDING' };
        }
        if (roleUpper === 'DELIVERY') {
            return { id: 0, stage_name: 'Delivery', completed_qty: 0, progress_percent: '0', status: 'PENDING' };
        }
        if (roleUpper === 'FINANCE') {
            return { id: 0, stage_name: 'Finance', completed_qty: 0, progress_percent: '0', status: 'PENDING' };
        }
        if (roleUpper === 'PURCHASING') {
            return { id: 0, stage_name: 'Vendor', completed_qty: 0, progress_percent: '0', status: 'PENDING' };
        }

        return null;
    };

    const [activeStage, setActiveStage] = useState<{ stage: Stage; item: Item } | null>(() => {
        const matched = getMatchingStageOrMock(item, userRole);
        return matched ? { stage: matched, item } : null;
    });
    const [showKendala, setShowKendala] = useState(false);
    const [showQc, setShowQc] = useState(false);
    const [kendalaType, setKendalaType] = useState('Machine Broken');
    const [kendalaNote, setKendalaNote] = useState('');
    const [rejectQty, setRejectQty] = useState('1');

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
        }
    }, [item]);

    // Keep invoice/payment statuses in sync when item props update
    useEffect(() => {
        setInvoiceStatus((item.invoice_status as any) || 'UNINVOICED');
        setPaymentStatus((item.payment_status as any) || 'UNPAID');
    }, [item.invoice_status, item.payment_status]);

    const selectStage = (stage: Stage) => {
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
        <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            overflow: 'hidden',
        }}>
            {/* Card Header */}
            <div style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        margin: 0,
                        color: '#f8fafc',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {item.item_name}
                    </h3>
                    {item.po?.is_urgent && (
                        <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            flexShrink: 0,
                        }}>
                            URGENT
                        </span>
                    )}
                    {(() => {
                        const hasRework = item.alerts?.some(a => a.severity === 'YELLOW') || false;
                        return renderWarningPill(item.po?.global_deadline, hasRework, language);
                    })()}
                    <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        flexShrink: 0,
                    }}>
                        {parseFloat(item.progress_percent).toFixed(1)}%
                    </span>
                </div>

                {/* Meta Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1px 12px',
                    fontSize: '11px',
                    marginBottom: '8px',
                }}>
                    <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                        {item.po?.client_name || 'N/A'}
                    </span>
                    <span style={{ color: '#94a3b8', textAlign: 'right' }}>
                        {item.po?.po_number || ''}
                    </span>
                    <span style={{ color: '#94a3b8' }}>
                        {formatDeadline(item.po?.global_deadline, language)}
                    </span>
                    <span style={{ color: '#38bdf8', fontWeight: 600, textAlign: 'right' }}>
                        {item.target_qty} pcs
                    </span>
                </div>

                {/* Stage Pills */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {(() => {
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

                        return displayStages.map((stage) => {
                            const isStageActive = activeStage && activeStage.stage.stage_name === stage.stage_name;
                            const locked = isStageLocked(item, stage.stage_name, userRole);

                            return (
                                <button
                                    key={stage.id}
                                    onClick={() => selectStage(stage)}
                                    style={{
                                        padding: '5px 10px',
                                        border: locked ? '1px dashed' : '1px solid',
                                        borderColor: isStageActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                                        borderRadius: '6px',
                                        backgroundColor: stage.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)'
                                            : stage.status === 'STUCK' ? 'rgba(239, 68, 68, 0.1)'
                                            : isStageActive ? '#1e3a8a' : '#090d16',
                                        color: stage.status === 'COMPLETED' ? '#10b981'
                                            : stage.status === 'STUCK' ? '#ef4444'
                                            : isStageActive ? '#38bdf8' : '#e2e8f0',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        opacity: locked ? 0.6 : 1,
                                    }}
                                >
                                    {stage.stage_name}
                                    <span style={{
                                        display: 'block',
                                        fontSize: '9px',
                                        color: '#64748b',
                                        marginTop: '1px',
                                    }}>
                                        {stage.stage_name === 'Finance'
                                            ? (stage.status === 'COMPLETED'
                                                ? (language === 'id' ? 'Lunas & Invoice' : 'Paid & Invoiced')
                                                : 'Pending'
                                              )
                                            : (item.target_qty > 1
                                                ? `${stage.completed_qty}/${item.target_qty}`
                                                : `${parseFloat(stage.progress_percent).toFixed(0)}%`
                                              )
                                        }
                                    </span>
                                </button>
                            );
                        });
                    })()}
                </div>
            </div>

            {/* Inline Progress Controls */}
            {activeStage ? (
                <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.15)',
                }}>
                    {(() => {
                        const lockReason = getStageLockReason(item, activeStage.stage.stage_name, userRole);
                        if (lockReason) {
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        borderRadius: '6px',
                                        color: '#ef4444',
                                        fontSize: '12px',
                                        fontWeight: 600
                                    }}>
                                        <AlertTriangle size={14} />
                                        <span>{t[lockReason as keyof typeof t] || lockReason}</span>
                                    </div>
                                    <button
                                        onClick={() => setShowRulesModal(true)}
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                            color: '#3b82f6',
                                            border: '1px solid rgba(59, 130, 246, 0.2)',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            textAlign: 'center'
                                        }}
                                    >
                                        {language === 'en' ? 'View Update Rules' : 'Lihat Aturan Update'}
                                    </button>
                                </div>
                            );
                        }

                        if (activeStage.stage.stage_name === 'Finance') {
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                                            {t.finance_status}
                                        </h4>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>
                                                {t.invoice_label}
                                            </label>
                                            <select
                                                value={invoiceStatus}
                                                onChange={(e) => setInvoiceStatus(e.target.value as any)}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px 8px',
                                                    backgroundColor: '#090d16',
                                                    color: '#fff',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    outline: 'none',
                                                }}
                                            >
                                                <option value="UNINVOICED">{t.uninvoiced}</option>
                                                <option value="INVOICED">{t.invoiced}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>
                                                {t.payment_label}
                                            </label>
                                            <select
                                                value={paymentStatus}
                                                onChange={(e) => setPaymentStatus(e.target.value as any)}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px 8px',
                                                    backgroundColor: '#090d16',
                                                    color: '#fff',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    outline: 'none',
                                                }}
                                            >
                                                <option value="UNPAID">{t.unpaid}</option>
                                                <option value="PAID">{t.paid}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleFinanceSubmit}
                                        style={{
                                            marginTop: '4px',
                                            padding: '8px',
                                            backgroundColor: '#3b82f6',
                                            color: '#fff',
                                            fontWeight: 700,
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                        }}
                                    >
                                        {t.save}
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <>
                                {item.target_qty > 1 ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '24px',
                                        marginBottom: '8px',
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{
                                                fontSize: '22px',
                                                fontWeight: 800,
                                                lineHeight: 1,
                                                marginBottom: '2px',
                                            }}>
                                                {activeStage.stage.completed_qty}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#64748b' }}>
                                                / {item.target_qty}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleStep(1)}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                backgroundColor: '#10b981',
                                                color: '#fff',
                                                fontSize: '18px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                ) : (
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
                                                            ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
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
                                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                color: '#ef4444',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                borderRadius: '6px',
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
                                            backgroundColor: showKendala ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.25)',
                                            borderRadius: '6px',
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
                                    <button
                                        onClick={() => setShowQc(prev => !prev)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            backgroundColor: showQc ? 'rgba(234, 179, 8, 0.25)' : 'rgba(234, 179, 8, 0.1)',
                                            color: '#eab308',
                                            border: '1px solid rgba(234, 179, 8, 0.25)',
                                            borderRadius: '6px',
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
                                </div>

                                {showKendala && (
                                    <form onSubmit={submitKendala} style={{
                                        marginTop: '8px',
                                        padding: '10px',
                                        backgroundColor: 'rgba(0,0,0,0.2)',
                                        borderRadius: '8px',
                                    }}>
                                        <label style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>
                                            {t.failure_type_label}
                                        </label>
                                        <select
                                            value={kendalaType}
                                            onChange={(e) => setKendalaType(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                backgroundColor: '#090d16',
                                                color: '#fff',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '6px',
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
                                        <label style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px', marginBottom: '4px', display: 'block' }}>
                                            {language === 'en' ? 'Note / Description' : 'Catatan / Deskripsi'}
                                        </label>
                                        <textarea
                                            value={kendalaNote}
                                            onChange={(e) => setKendalaNote(e.target.value)}
                                            placeholder={language === 'en' ? 'Provide details about the issue...' : 'Berikan detail mengenai kendala...'}
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                backgroundColor: '#090d16',
                                                color: '#fff',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '6px',
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
                                                    color: '#94a3b8',
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
                                                    backgroundColor: '#ef4444',
                                                    color: '#fff',
                                                    borderRadius: '6px',
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
                                        backgroundColor: 'rgba(0,0,0,0.2)',
                                        borderRadius: '8px',
                                    }}>
                                        <label style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>
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
                                                backgroundColor: '#090d16',
                                                color: '#fff',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '6px',
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
                                                    color: '#94a3b8',
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
                                                    backgroundColor: '#eab308',
                                                    color: '#000',
                                                    borderRadius: '6px',
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
                    {/* Cancel Update Button */}
                    <button
                        onClick={() => {
                            setActiveStage(null);
                            setShowKendala(false);
                            setShowQc(false);
                        }}
                        style={{
                            marginTop: '12px',
                            width: '100%',
                            padding: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: '#94a3b8',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                        }}
                    >
                        {language === 'en' ? 'Cancel Update' : 'Batal Update'}
                    </button>
                </div>
            ) : (
                <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    color: '#64748b',
                    fontSize: '12px',
                    textAlign: 'center',
                }}>
                    {language === 'en' ? 'No matching stage for your role on this item' : 'Tidak ada tahap yang sesuai dengan role Anda pada item ini'}
                </div>
            )}
        </div>
    );
}

export default function WorkerDashboard({ items, auth_user }: Props) {
    const { props, url } = usePage();
    const pathParts = url.split('/');
    const slug = pathParts[2] || '';
    const userRole = auth_user?.role ? auth_user.role.toUpperCase() : '';

    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
        }
        return 'en';
    });

    const t = translations[language];

    const [showRulesModal, setShowRulesModal] = useState(false);
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
        <div style={{
            minHeight: '100dvh',
            backgroundColor: '#090d16',
            fontFamily: 'Inter, sans-serif',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(9, 13, 22, 0.3)',
                backdropFilter: 'blur(8px)',
                flexShrink: 0,
            }}>
                <div>
                    <div className="greeting-name" style={{ fontSize: '13px', color: '#60a5fa', fontWeight: 600, marginBottom: '2px' }}>
                        {language === 'en' ? `Hello, ${auth_user?.name}` : `Halo, ${auth_user?.name}`}
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{t.floor_terminal}</h1>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                        {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' · '}
                        {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px', marginRight: '8px' }}>
                        <button
                            onClick={() => changeLanguage('en')}
                            style={{
                                padding: '4px 8px',
                                backgroundColor: language === 'en' ? '#2563eb' : 'transparent',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '10px',
                                cursor: 'pointer',
                            }}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => changeLanguage('id')}
                            style={{
                                padding: '4px 8px',
                                backgroundColor: language === 'id' ? '#2563eb' : 'transparent',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '10px',
                                cursor: 'pointer',
                            }}
                        >
                            ID
                        </button>
                    </div>

                    {/* Trouble Reports Button */}
                    <a
                        href={`/c/${slug}/trouble-reports`}
                        style={{
                            padding: '8px',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.15)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            lineHeight: '1',
                            display: 'flex',
                            textDecoration: 'none',
                        }}
                        title={language === 'en' ? 'Trouble Reports' : 'Laporan Kendala'}
                    >
                        <AlertTriangle size={16} />
                    </a>

                    {/* Profile Button */}
                    <a
                        href={`/c/${slug}/profile`}
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
                            fontSize: '12px',
                        }}
                    >
                        {t.exit_terminal}
                    </button>
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
                    <p style={{ color: '#64748b', padding: '24px', textAlign: 'center', fontSize: '14px' }}>
                        {t.no_active_items}
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
                                showRulesModal={showRulesModal}
                                setShowRulesModal={setShowRulesModal}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Rules Modal */}
            {showRulesModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px',
                }}>
                    <div style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '500px',
                        width: '100%',
                        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={20} />
                            {language === 'en' ? 'Stage Update Rules' : 'Aturan Pembaruan Tahap'}
                        </h3>
                        <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', display: 'grid', gap: '12px', marginBottom: '24px' }}>
                            <div>
                                <strong style={{ color: '#f8fafc' }}>
                                    {language === 'en' ? '1. Role Authorization:' : '1. Otorisasi Peran:'}
                                </strong>
                                <p style={{ margin: '4px 0 0 0', color: '#94a3b8' }}>
                                    {language === 'en'
                                        ? 'You can only update stages matching your role (e.g. MACHINING for Machining, FABRICATION for Fabrication, QC for QC, DELIVERY for Delivery, FINANCE for Finance, PURCHASING for Vendor).'
                                        : 'Anda hanya bisa mengubah tahap yang sesuai dengan role Anda (misal: role MACHINING hanya bisa mengubah Machining, FABRICATION untuk Fabrikasi, QC untuk QC, DELIVERY untuk Delivery, FINANCE untuk Finance, PURCHASING untuk Vendor).'}
                                </p>
                            </div>
                            <div>
                                <strong style={{ color: '#f8fafc' }}>
                                    {language === 'en' ? '2. QC Stage Lock:' : '2. Kunci Tahap QC:'}
                                </strong>
                                <p style={{ margin: '4px 0 0 0', color: '#94a3b8' }}>
                                    {language === 'en'
                                        ? 'QC requires Machining & Fabrication to finish first.'
                                        : 'QC membutuhkan tahap Machining & Fabrikasi selesai terlebih dahulu.'}
                                </p>
                            </div>
                            <div>
                                <strong style={{ color: '#f8fafc' }}>
                                    {language === 'en' ? '3. Delivery Stage Lock:' : '3. Kunci Tahap Pengiriman:'}
                                </strong>
                                <p style={{ margin: '4px 0 0 0', color: '#94a3b8' }}>
                                    {language === 'en'
                                        ? 'Delivery requires QC completed quantity > 0.'
                                        : 'Delivery membutuhkan jumlah selesai QC > 0.'}
                                </p>
                            </div>
                            <div>
                                <strong style={{ color: '#f8fafc' }}>
                                    {language === 'en' ? '4. Finance Stage Lock:' : '4. Kunci Tahap Keuangan:'}
                                </strong>
                                <p style={{ margin: '4px 0 0 0', color: '#94a3b8' }}>
                                    {language === 'en'
                                        ? 'Finance requires Delivery to finish first.'
                                        : 'Finance membutuhkan tahap Delivery selesai terlebih dahulu.'}
                                </p>
                            </div>
                            <div>
                                <strong style={{ color: '#f8fafc' }}>
                                    {language === 'en' ? '5. Inactive Stages:' : '5. Tahap Nonaktif:'}
                                </strong>
                                <p style={{ margin: '4px 0 0 0', color: '#94a3b8' }}>
                                    {language === 'en'
                                        ? 'Stages inactive for this item type cannot be updated.'
                                        : 'Tahap yang tidak aktif untuk jenis produksi item ini tidak dapat diubah.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowRulesModal(false)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                backgroundColor: '#2563eb',
                                color: '#fff',
                                fontWeight: 700,
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                            }}
                        >
                            {language === 'en' ? 'Close' : 'Tutup'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
