import React, { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Settings, Palette } from '../../Components/Icons';
import { formatDeadline } from '../../Utils/deadline';
import { localizedDisplay } from '../../Utils/locale';
import { isStageLocked, getStageLockReason, getMatchingStages, getMatchingStageOrMock, getAllStages } from '../../Utils/permissions';
import { WarningPill } from '../../Components/WarningPill';
import echo from '../../bootstrap';

interface Stage {
    id: number;
    stage_name: string;
    completed_qty: number;
    progress_percent: string;
    status: string;
    previous_completed_qty?: number | null;
    previous_progress_percent?: string | null;
}

interface Alert {
    id: number;
    severity: string;
    reason_type?: string | null;
    message?: string | null;
    is_resolved: boolean;
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
    delivery_status?: string | null;
    delivered_qty?: number;
    invoiced_qty?: number;
    alerts: Alert[];
    po?: {
        po_number: string;
        external_po_number?: string | null;
        client_name: string;
        global_deadline: string;
        is_urgent?: boolean | null;
    };
    item_progresses: Stage[];
}



interface Props {
    items: Item[];
    auth_user?: {
        id: number;
        name: string;
        role_name: string;
        role_level: string;
        post_name: string | null;
        role_display_name: string;
        role_display_name_id?: string | null;
        post_display_name?: string | null;
        post_display_name_id?: string | null;
    };
    tenant_id?: number;
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
        partially_invoiced: "Partially Invoiced",
        uninvoiced: "Uninvoiced",
        paid: "Paid",
        partially_paid: "Partial Paid",
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
        partially_invoiced: "Faktur Sebagian",
        uninvoiced: "Belum Difakturkan",
        paid: "Lunas",
        partially_paid: "Bayar Sebagian",
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

// isStageLocked moved to ../../Utils/permissions

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
    const [loading, setLoading] = useState(false);

    const getAllStages = (item: Item): Stage[] => {
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
        return displayStages;
    };

    const getStageLockReason = (item: Item, stageName: string, userRole: string, lang: 'en' | 'id') => {
        const t = translations[lang];
        const stageLower = stageName.toLowerCase();

        // First check role permission
        if (isStageLocked(item, stageName, userRole)) {
            // Find if it's role mismatch
            const role = userRole.toUpperCase();
            const officeRoles = ['OWNER', 'ADMIN', 'SALES', 'MANAGER'];
            if (!officeRoles.includes(role)) {
                if ((stageLower.includes('design') || stageLower.includes('gambar') || stageLower.includes('draft')) && role !== 'DRAFTER') return t.role_mismatch;
                if ((stageLower.includes('material') || stageLower.includes('bahan')) && role !== 'PURCHASING') return t.role_mismatch;
                if ((stageLower.includes('machining') || stageLower.includes('cnc')) && (role !== 'MACHINING' && role !== 'CNC' && role !== 'PRODUCTION')) return t.role_mismatch;
                if ((stageLower.includes('fabrication') || stageLower.includes('fabrikasi')) && (role !== 'FABRICATION' && role !== 'PRODUCTION')) return t.role_mismatch;
                if ((stageLower.includes('vendor') || stageLower.includes('purchasing')) && role !== 'PURCHASING') return t.role_mismatch;
                if (stageLower === 'qc' && role !== 'QC') return t.role_mismatch;
                if ((stageLower === 'delivery' || stageLower === 'pengiriman') && role !== 'DELIVERY') return t.role_mismatch;
                if (stageLower === 'finance' && role !== 'FINANCE') return t.role_mismatch;
            }

            // Off-state locks
            const originalStages = item.item_progresses
                .map(s => s.stage_name)
                .filter(name => !['QC', 'Delivery', 'Finance', 'Pengiriman'].includes(name) && !name.endsWith('REWORK'));
            const isVendorJob = originalStages.some(name => name.toLowerCase().includes('vendor'));

            if (isVendorJob) {
                if (['machining', 'fabrication', 'fabrikasi', 'cnc', 'qc', 'delivery', 'pengiriman', 'finance'].some(v => stageLower.includes(v))) {
                    return t.off_state;
                }
            } else {
                if ((stageLower.includes('machining') || stageLower.includes('cnc')) && !originalStages.some(name => name.toLowerCase().includes('machining') || name.toLowerCase().includes('cnc'))) return t.off_state;
                if ((stageLower.includes('fabrication') || stageLower.includes('fabrikasi')) && !originalStages.some(name => name.toLowerCase().includes('fabrication') || name.toLowerCase().includes('fabrikasi'))) return t.off_state;
                if (stageLower.includes('vendor')) return t.off_state;



                if (stageLower === 'qc') {
                    const prodStages = item.item_progresses.filter(s => 
                        (s.stage_name.toLowerCase().includes('machining') || 
                         s.stage_name.toLowerCase().includes('cnc') || 
                         s.stage_name.toLowerCase().includes('fabrication') || 
                         s.stage_name.toLowerCase().includes('fabrikasi')) &&
                        !s.stage_name.toLowerCase().includes('rework')
                    );
                    if (prodStages.some(s => s.status !== 'COMPLETED')) return t.locked_qc;
                }

                if (stageLower === 'delivery' || stageLower === 'pengiriman') {
                    const qcStage = item.item_progresses.find(s => s.stage_name === 'QC');
                    if (!qcStage || (item.target_qty > 1 ? qcStage.completed_qty === 0 : parseFloat(qcStage.progress_percent) < 100)) {
                        return t.locked_delivery;
                    }
                }

                if (stageLower === 'finance') {
                    const deliveryStage = item.item_progresses.find(s => s.stage_name === 'Delivery' || s.stage_name === 'Pengiriman');
                    if (!deliveryStage || (item.target_qty > 1 ? deliveryStage.completed_qty === 0 : parseFloat(deliveryStage.progress_percent) < 100)) {
                        return t.locked_finance;
                    }
                }
            }
        }
        return null;
    };

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
    const [localCompletedQty, setLocalCompletedQty] = useState<number>(activeStage ? activeStage.stage.completed_qty : 0);
    const [localProgressPercent, setLocalProgressPercent] = useState<string>(activeStage ? activeStage.stage.progress_percent || '0' : '0');

    useEffect(() => {
        if (activeStage) {
            setLocalCompletedQty(activeStage.stage.completed_qty);
            setLocalProgressPercent(activeStage.stage.progress_percent || '0');
        }
    }, [activeStage]);


    // Finance form states
    const [invoiceStatus, setInvoiceStatus] = useState<'UNINVOICED' | 'PARTIAL' | 'INVOICED'>(() => (item.invoice_status as any) || 'UNINVOICED');
    const [paymentStatus, setPaymentStatus] = useState<'UNPAID' | 'PARTIAL_PAID' | 'PAID'>(() => (item.payment_status as any) || 'UNPAID');
    const [invoicedQty, setInvoicedQty] = useState<number>(() => item.invoiced_qty || 0);

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
        setInvoicedQty(item.invoiced_qty || 0);
    }, [item.invoice_status, item.payment_status, item.invoiced_qty]);



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
            setInvoicedQty(item.invoiced_qty || 0);
        }
    };

    const handleFinanceSubmit = () => {
        if (loading) return;
        const currentItem = item;
        router.post(`/c/${slug}/items/${currentItem.id}/finance`, {
            invoice_status: invoiceStatus,
            payment_status: paymentStatus,
            invoiced_qty: invoicedQty,
        }, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
            onSuccess: (page) => {
                const updatedItem = (page.props.items as Item[]).find(i => i.id === currentItem.id);
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

    const revertLastUpdate = () => {
        if (!activeStage || loading) return;
        if (!confirm(language === 'id' ? 'Apakah Anda yakin ingin membatalkan progres terakhir?' : 'Are you sure you want to revert the last update?')) return;
        const currentStage = activeStage;
        const currentItem = item;
        router.post(`/c/${slug}/progress/${currentStage.stage.id}/cancel-last-update`, {}, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
            onSuccess: (page) => {
                const updatedItem = (page.props.items as Item[]).find(i => i.id === currentItem.id);
                if (updatedItem) {
                    const updatedStage = updatedItem.item_progresses.find(s => s.id === currentStage.stage.id);
                    if (updatedStage) {
                        setActiveStage({ stage: updatedStage, item: updatedItem });
                    }
                }
            }
        });
    };

    const handleDoneSubmit = () => {
        if (!activeStage || loading) return;
        const currentStage = activeStage;
        const currentItem = item;

        const initialQty = currentStage.stage.completed_qty;
        const initialPercent = currentStage.stage.progress_percent || '0';

        const isQtyChanged = currentItem.target_qty > 1 && localCompletedQty !== initialQty;
        const isPercentChanged = currentItem.target_qty === 1 && localProgressPercent !== initialPercent;

        if (!isQtyChanged && !isPercentChanged) {
            setActiveStage(null);
            setIsExpanded(false);
            setShowKendala(false);
            setShowQc(false);
            return;
        }

        const payload = currentItem.target_qty === 1
            ? { progress_percent: parseFloat(localProgressPercent) }
            : { completed_qty: localCompletedQty };

        router.post(`/c/${slug}/progress/${currentStage.stage.id}/update`, payload, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
            onSuccess: (page) => {
                const updatedItem = (page.props.items as Item[]).find(i => i.id === currentItem.id);
                if (updatedItem) {
                    const updatedStage = updatedItem.item_progresses.find(s => s.id === currentStage.stage.id);
                    if (updatedStage) {
                        setActiveStage({ stage: updatedStage, item: updatedItem });
                    }
                }
                setActiveStage(null);
                setIsExpanded(false);
                setShowKendala(false);
                setShowQc(false);
            }
        });
    };

    const submitKendala = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeStage || loading) return;
        const currentStage = activeStage;
        router.post(`/c/${slug}/progress/${currentStage.stage.id}/kendala`, {
            kendala_type: kendalaType,
            note: kendalaNote,
        }, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
            onSuccess: () => {
                setShowKendala(false);
                setKendalaNote('');
                setActiveStage(null);
            }
        });
    };

    const submitQcRework = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeStage || loading) return;
        const currentStage = activeStage;
        router.post(`/c/${slug}/progress/${currentStage.stage.id}/rework`, {
            reject_qty: parseInt(rejectQty, 10)
        }, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
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
                    backgroundColor: isHovered ? 'var(--color-pg-border-subtle)' : 'transparent',
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
                            fontSize: '13px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--color-pg-primary-glow)',
                            color: 'var(--color-pg-primary-hover)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}>
                            <span>{parseFloat(item.progress_percent).toFixed(0)}%</span>
                            <span style={{ fontSize: '16px', color: 'var(--color-pg-text-secondary)', fontWeight: 'normal' }}>
                                ({item.delivered_qty || 0}/{item.target_qty || 0})
                            </span>
                        </span>
                        {/* Chevron Indicator */}
                        <span style={{
                            color: 'var(--color-pg-text-muted)',
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

                {/* Row 2: Client Details (2nd Hierarchy) */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginTop: '6px',
                }}>
                    <span style={{ color: 'var(--color-pg-primary-hover)', fontWeight: 700, fontSize: '13.5px' }}>
                        {item.po?.client_name || 'N/A'}
                    </span>
                    <span style={{ color: '#a5b4fc', fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>
                        {item.target_qty} pcs
                    </span>
                </div>

                {/* Row 2.5: Deadline (3rd Hierarchy) & PO Number (4th Hierarchy) */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginTop: '2px',
                }}>
                    <span style={{ color: 'var(--color-pg-text-secondary)', fontSize: '12px', fontWeight: 500 }}>
                        {formatDeadline(item.po?.global_deadline, language)}
                    </span>
                    <span style={{ color: 'var(--color-pg-text-muted)', fontSize: '11px', fontWeight: 600, textAlign: 'right' }}>
                        {item.po?.po_number || ''}
                    </span>
                </div>

                {/* Row 3: Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                    {item.po?.is_urgent && (
                        <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(248, 113, 113, 0.12)',
                            color: 'var(--color-pg-danger)',
                            border: '1px solid rgba(248, 113, 113, 0.2)',
                            flexShrink: 0,
                        }}>
                            URGENT
                        </span>
                    )}
                    <span style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        color: 'var(--color-pg-text-secondary)',
                        flexShrink: 0,
                    }}>
                        {item.item_type === 'MANUFACTURE' 
                            ? (language === 'id' ? 'Produksi Internal' : 'Manufactured') 
                            : (language === 'id' ? 'Beli Jadi (Buyout)' : 'Buyout')}
                    </span>
                    {(() => {
                        const designStage = item.item_progresses.find(s => s.stage_name.toLowerCase().includes('design') || s.stage_name.toLowerCase().includes('gambar') || s.stage_name.toLowerCase().includes('draft'));
                        if (!designStage) return null;
                        const isApproved = item.drafter_status === 'APPROVED' || parseFloat(designStage.progress_percent) >= 100;
                        const label = isApproved ? 'Drafter: ✓' : `Drafter: ${language === 'id' ? 'Proses' : 'Processing'}`;
                        return (
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: isApproved ? 'rgba(52, 211, 153, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                                color: isApproved ? 'var(--color-pg-success)' : '#a78bfa',
                                flexShrink: 0,
                            }}>
                                {label}
                            </span>
                        );
                    })()}
                    {(() => {
                        const materialStage = item.item_progresses.find(s => s.stage_name.toLowerCase().includes('material') || s.stage_name.toLowerCase().includes('bahan'));
                        if (!materialStage) return null;
                        const isReady = item.purchasing_status === 'READY' || parseFloat(materialStage.progress_percent) >= 100;
                        const label = isReady ? 'Purchasing: ✓' : `Purchasing: ${language === 'id' ? 'Proses' : 'Processing'}`;
                        return (
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: isReady ? 'rgba(52, 211, 153, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                                color: isReady ? 'var(--color-pg-success)' : 'var(--color-pg-primary-hover)',
                                flexShrink: 0,
                            }}>
                                {label}
                            </span>
                        );
                    })()}
                    {(() => {
                        const reworkAlert = item.alerts?.find(a => a.severity === 'YELLOW' && !a.is_resolved);
                        let reworkVal = null;
                        if (reworkAlert) {
                            if (reworkAlert.message) {
                                const match = reworkAlert.message.match(/(\d+)\s+items?\s+rejected/i);
                                reworkVal = match ? `Rework (${match[1]} pcs)` : 'Rework';
                            } else {
                                reworkVal = 'Rework';
                            }
                        }
                        return <WarningPill deadlineDateStr={item.po?.global_deadline} reworkMessage={reworkVal} lang={language} />;
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
                                        let color = 'var(--color-pg-text-muted)';
                                        if (stageLower.includes('machining') || stageLower.includes('cnc')) color = 'var(--color-pg-primary)';
                                        else if (stageLower.includes('fabrication') || stageLower.includes('fabrikasi')) color = '#8b5cf6';
                                        else if (stageLower === 'qc') color = 'var(--color-pg-warning)';
                                        else if (stageLower === 'delivery' || stageLower === 'pengiriman') color = 'var(--color-pg-success)';

                                        return (
                                            <button
                                                key={stage.id}
                                                onClick={() => selectStage(stage)}
                                                className="focus:outline-none focus:ring-1 focus:ring-indigo-500/50 hover:brightness-105 active:scale-95 transition-all duration-150"
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: isActive ? '1px solid ' + color : '1px solid rgba(255,255,255,0.08)',
                                                    backgroundColor: isActive ? color + '20' : 'transparent',
                                                    color: isActive ? color : 'var(--color-pg-text-secondary)',
                                                    fontSize: '12px',
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
                                                                            if (isActive || loading) return;
                                                                            router.post(`/c/${slug}/items/${item.id}/drafter-status`, {
                                                                                drafter_status: status,
                                                                            }, {
                                                                                preserveScroll: true,
                                                                                preserveState: true,
                                                                                onStart: () => setLoading(true),
                                                                                onFinish: () => setLoading(false),
                                                                            });
                                                                        }}
                                                                        disabled={isDisabled || loading}
                                                                        style={{
                                                                            flex: 1,
                                                                            padding: '12px 4px',
                                                                            borderRadius: '8px',
                                                                            border: 'none',
                                                                            background: isActive ? 'var(--color-pg-primary)' : 'transparent',
                                                                            color: isActive ? 'var(--color-pg-text)' : 'var(--color-pg-text-secondary)',
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
                                                                            if (isActive || loading) return;
                                                                            router.post(`/c/${slug}/items/${item.id}/purchasing-status`, {
                                                                                purchasing_status: status,
                                                                            }, {
                                                                                preserveScroll: true,
                                                                                preserveState: true,
                                                                                onStart: () => setLoading(true),
                                                                                onFinish: () => setLoading(false),
                                                                            });
                                                                        }}
                                                                        disabled={isDisabled || loading}
                                                                        style={{
                                                                            flex: 1,
                                                                            padding: '12px 4px',
                                                                            borderRadius: '8px',
                                                                            border: 'none',
                                                                            background: isActive ? 'var(--color-pg-primary)' : 'transparent',
                                                                            color: isActive ? 'var(--color-pg-text)' : 'var(--color-pg-text-secondary)',
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

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {/* Delivery Status & Delivered Qty Display for Finance */}
                                            <div style={{
                                                padding: '12px',
                                                backgroundColor: 'var(--color-pg-border-subtle)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                borderRadius: '8px',
                                                marginBottom: '8px',
                                            }}>
                                                <div style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', marginBottom: '2px' }}>
                                                    {language === 'en' ? 'Item Delivery Status' : 'Status Pengiriman Barang'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span style={{
                                                        fontSize: '13px',
                                                        fontWeight: 700,
                                                        color: item.delivery_status === 'DELIVERED' ? 'var(--color-pg-success)' :
                                                            item.delivery_status === 'PARTIAL' ? 'var(--color-pg-warning)' : '#3b82f6'
                                                    }}>
                                                        {item.delivery_status === 'DELIVERED'
                                                            ? (language === 'id' ? 'Terkirim' : 'Delivered')
                                                            : item.delivery_status === 'PARTIAL'
                                                            ? (language === 'id' ? 'Terkirim Sebagian' : 'Partially Delivered')
                                                            : (language === 'id' ? 'Belum Dikirim' : 'Pending Delivery')}
                                                    </span>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-pg-text)' }}>
                                                        {item.delivered_qty ?? 0} / {item.target_qty} pcs
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: invoiceStatus === 'INVOICED' ? 'rgba(52, 211, 153, 0.12)' :
                                                        invoiceStatus === 'PARTIAL' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                                                    color: invoiceStatus === 'INVOICED' ? 'var(--color-pg-success)' :
                                                        invoiceStatus === 'PARTIAL' ? '#c084fc' : 'var(--color-pg-text-secondary)',
                                                    border: '1px solid ' + (invoiceStatus === 'INVOICED' ? 'rgba(52, 211, 153, 0.2)' :
                                                        invoiceStatus === 'PARTIAL' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.06)'),
                                                }}>
                                                    {t.invoice_label}: {invoiceStatus === 'INVOICED' ? t.invoiced : invoiceStatus === 'PARTIAL' ? `${t.partially_invoiced} (${invoicedQty}/${item.target_qty})` : t.uninvoiced}
                                                </span>
                                                <span style={{
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: paymentStatus === 'PAID' ? 'rgba(52, 211, 153, 0.12)' :
                                                        paymentStatus === 'PARTIAL_PAID' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                                                    color: paymentStatus === 'PAID' ? 'var(--color-pg-success)' :
                                                        paymentStatus === 'PARTIAL_PAID' ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-text-secondary)',
                                                    border: '1px solid ' + (paymentStatus === 'PAID' ? 'rgba(52, 211, 153, 0.2)' :
                                                        paymentStatus === 'PARTIAL_PAID' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.06)'),
                                                }}>
                                                    {t.payment_label}: {paymentStatus === 'PAID' ? t.paid : paymentStatus === 'PARTIAL_PAID' ? t.partially_paid : t.unpaid}
                                                </span>
                                            </div>

                                            {/* Status selectors and qty input */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', marginTop: '12px' }}>
                                                {/* Invoiced Status Selection */}
                                                <div>
                                                <                                                label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-pg-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                                                    {language === 'en' ? 'Invoice Status' : 'Status Invoice'}
                                                </label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                                        {(['UNINVOICED', 'PARTIAL', 'INVOICED'] as const).map(status => {
                                                            const isSel = invoiceStatus === status;
                                                            return (
                                                                <button
                                                                    key={status}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setInvoiceStatus(status);
                                                                        if (status === 'INVOICED') setInvoicedQty(item.delivered_qty ?? 0);
                                                                        if (status === 'UNINVOICED') setInvoicedQty(0);
                                                                    }}
                                                                    className="focus:outline-none transition-all duration-150"
                                                                    style={{
                                                                        padding: '10px 8px',
                                                                        fontSize: '12px',
                                                                        fontWeight: 700,
                                                                        borderRadius: '8px',
                                                                    border: '1px solid ' + (isSel ? 'var(--color-pg-primary)' : 'var(--color-pg-border)'),
                                                                    backgroundColor: isSel ? 'var(--color-pg-primary-glow)' : 'var(--color-pg-bg)',
                                                                    color: isSel ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-text-secondary)',
                                                                        cursor: 'pointer',
                                                                    }}
                                                                >
                                                                    {status === 'PARTIAL' ? (language === 'en' ? 'PARTIAL' : 'SEBAGIAN') : status}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Invoiced Qty (Shown when PARTIAL) */}
                                                {invoiceStatus === 'PARTIAL' && (
                                                    <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-pg-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                                                            {language === 'en' ? 'Invoiced Quantity' : 'Jumlah Diinvoice'}
                                                        </label>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={item.delivered_qty ?? 0}
                                                                value={invoicedQty}
                                                                onChange={e => {
                                                                    const val = Math.min(item.delivered_qty ?? 0, Math.max(0, parseInt(e.target.value) || 0));
                                                                    setInvoicedQty(val);
                                                                }}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '10px 12px',
                                                                    fontSize: '14px',
                                                                    backgroundColor: 'var(--color-pg-bg)',
                                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                                    borderRadius: '8px',
                                                                    color: '#fff',
                                                                    outline: 'none',
                                                                }}
                                                            />
                                                            <span style={{ fontSize: '13px', color: 'var(--color-pg-text-muted)' }}>
                                                                / {item.delivered_qty ?? 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Payment Status Selection */}
                                                <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-pg-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                                                    {language === 'en' ? 'Payment Status' : 'Status Pembayaran'}
                                                </label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                                        {(['UNPAID', 'PARTIAL_PAID', 'PAID'] as const).map(status => {
                                                            const isSel = paymentStatus === status;
                                                            return (
                                                                <button
                                                                    key={status}
                                                                    type="button"
                                                                    onClick={() => setPaymentStatus(status)}
                                                                    className="focus:outline-none transition-all duration-150"
                                                                    style={{
                                                                        padding: '10px 8px',
                                                                        fontSize: '12px',
                                                                        fontWeight: 700,
                                                                        borderRadius: '8px',
                                                                        border: '1px solid ' + (isSel ? '#10b981' : 'var(--color-pg-border)'),
                                                                        backgroundColor: isSel ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-pg-bg)',
                                                                        color: isSel ? 'var(--color-pg-success)' : 'var(--color-pg-text-secondary)',
                                                                        cursor: 'pointer',
                                                                    }}
                                                                >
                                                                    {status === 'PARTIAL_PAID' ? (language === 'en' ? 'PARTIAL' : 'SEBAGIAN') : status}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Submit Button */}
                                                <button
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={handleFinanceSubmit}
                                                    className="focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none transition-all duration-200"
                                                    style={{
                                                        width: '100%',
                                                        padding: '14px',
                                                        backgroundColor: '#10b981',
                                                        color: '#fff',
                                                        fontWeight: 700,
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        marginTop: '8px',
                                                    }}
                                                >
                                                    {language === 'en' ? 'Save Status' : 'Simpan Status'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                const stageNameLower = activeStage.stage.stage_name.toLowerCase();
                                const isQcStage = stageNameLower === 'qc';

                                // Determine the maximum allowed quantity for this stage
                                let maxQty = item.target_qty;
                                if (stageNameLower === 'delivery' || stageNameLower === 'pengiriman') {
                                    const qcStage = item.item_progresses.find(s => s.stage_name.toLowerCase() === 'qc');
                                    if (qcStage) {
                                        maxQty = qcStage.completed_qty;
                                    }
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
                                                backgroundColor: 'var(--color-pg-border-subtle)',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255, 255, 255, 0.04)',
                                            }}>
                                                <div style={{ marginRight: 'auto', paddingLeft: '4px' }}>
                                                <div style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                    {language === 'en' ? 'Completed' : 'Selesai'}
                                                </div>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                                                        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-pg-text)', lineHeight: '1' }}>
                                                            {localCompletedQty}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)' }}>
                                                            / {maxQty}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <select
                                                        value={localCompletedQty}
                                                        disabled={loading || activeStage.stage.completed_qty >= maxQty}
                                                        onChange={(e) => setLocalCompletedQty(parseInt(e.target.value, 10))}
                                                        className="focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 appearance-none text-center"
                                                        style={{
                                                            width: '70px',
                                                            height: '56px',
                                                            borderRadius: '14px',
                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                            backgroundColor: 'var(--color-pg-input)',
                                                            color: 'var(--color-pg-text)',
                                                            fontSize: '16px',
                                                            fontWeight: 700,
                                                            outline: 'none',
                                                            boxSizing: 'border-box',
                                                            cursor: 'pointer',
                                                            textAlignLast: 'center',
                                                            padding: '0 8px',
                                                        }}
                                                    >
                                                        {Array.from(
                                                            { length: maxQty - activeStage.stage.completed_qty + 1 },
                                                            (_, i) => activeStage.stage.completed_qty + i
                                                        ).map((val) => (
                                                            <option key={val} value={val} style={{ backgroundColor: 'var(--color-pg-input)', color: 'var(--color-pg-text)' }}>
                                                                {val}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => setLocalCompletedQty(prev => Math.min(maxQty, prev + 1))}
                                                        disabled={loading || localCompletedQty >= maxQty || activeStage.stage.completed_qty >= maxQty}
                                                        className="focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:brightness-105 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none transition-all duration-150"
                                                        style={{
                                                            width: '56px',
                                                            height: '56px',
                                                            borderRadius: '14px',
                                                            border: 'none',
                                                            backgroundColor: 'var(--color-pg-success)',
                                                            color: 'var(--color-pg-surface)',
                                                            fontSize: '24px',
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
                                                    disabled={loading}
                                                    onClick={() => {
                                                        if (!activeStage || loading) return;
                                                        router.post(`/c/${slug}/progress/${activeStage.stage.id}/rework`, {
                                                            reject_qty: 1
                                                        }, {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                            onStart: () => setLoading(true),
                                                            onFinish: () => setLoading(false),
                                                            onSuccess: () => {
                                                                setShowQc(false);
                                                                setActiveStage(null);
                                                            }
                                                        });
                                                    }}
                                                    className="focus:outline-none focus:ring-2 focus:ring-red-500/50 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
                                                    style={{
                                                        padding: '16px 8px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        backgroundColor: 'var(--color-pg-danger)',
                                                        color: '#ffffff',
                                                        fontSize: '14px',
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    NG
                                                </button>
                                                <button
                                                    disabled={loading || activeStage.stage.completed_qty >= item.target_qty}
                                                    onClick={() => {
                                                        if (!loading) {
                                                            setLocalProgressPercent('100');
                                                            setLocalCompletedQty(1);
                                                        }
                                                    }}
                                                    className="focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
                                                    style={{
                                                        padding: '16px 8px',
                                                        borderRadius: '8px',
                                                        border: localProgressPercent === '100' ? '2px solid #ffffff' : 'none',
                                                        backgroundColor: localProgressPercent === '100' ? '#10b981' : 'var(--color-pg-success)',
                                                        color: '#ffffff',
                                                        fontSize: '14px',
                                                        fontWeight: 800,
                                                        cursor: (loading || activeStage.stage.completed_qty >= item.target_qty) ? 'not-allowed' : 'pointer',
                                                        boxShadow: localProgressPercent === '100' ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none',
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
                                                    const currentPct = parseFloat(localProgressPercent || '0');
                                                    const savedPct = parseFloat(activeStage.stage.progress_percent || '0');
                                                    const isDisabled = pct < savedPct;
                                                    return (
                                                        <button
                                                            key={pct}
                                                            onClick={() => {
                                                                if (!isDisabled && !loading) {
                                                                    setLocalProgressPercent(pct.toString());
                                                                    setLocalCompletedQty(pct === 100 ? 1 : 0);
                                                                }
                                                            }}
                                                            disabled={isDisabled || loading}
                                                            className="focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:brightness-110 active:scale-[0.95] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
                                                            style={{
                                                                padding: '14px 4px',
                                                                borderRadius: '6px',
                                                                border: 'none',
                                                                backgroundColor: currentPct === pct
                                                                    ? 'var(--color-pg-primary)' : 'var(--color-pg-border-subtle)',
                                                                color: '#fff',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                cursor: (isDisabled || loading) ? 'not-allowed' : 'pointer',
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
                                                    disabled={loading}
                                                    onClick={revertLastUpdate}
                                                    className="focus:outline-none focus:ring-1 focus:ring-red-500/50 hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px',
                                                        backgroundColor: 'rgba(248, 113, 113, 0.12)',
                                                        color: 'var(--color-pg-danger)',
                                                        border: '1px solid rgba(248, 113, 113, 0.2)',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
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
                                                disabled={loading}
                                                onClick={() => !loading && setShowKendala(prev => !prev)}
                                                className="focus:outline-none focus:ring-1 focus:ring-red-500/50 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
                                                style={{
                                                    flex: 1,
                                                    padding: '12px 10px',
                                                    backgroundColor: showKendala ? 'rgba(248, 113, 113, 0.22)' : 'rgba(248, 113, 113, 0.1)',
                                                    color: 'var(--color-pg-danger)',
                                                    border: '1px solid rgba(248, 113, 113, 0.2)',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px',
                                                }}
                                            >
                                                <AlertTriangle size={14} /> {t.report_failure}
                                            </button>
                                            {(!isQcStage || item.target_qty > 1) && (
                                                <button
                                                    disabled={loading}
                                                    onClick={() => !loading && setShowQc(prev => !prev)}
                                                    className="focus:outline-none focus:ring-1 focus:ring-amber-500/50 active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
                                                    style={{
                                                        flex: 1,
                                                        padding: '12px 10px',
                                                        backgroundColor: showQc ? 'rgba(251, 191, 36, 0.22)' : 'rgba(251, 191, 36, 0.1)',
                                                        color: 'var(--color-pg-warning)',
                                                        border: '1px solid rgba(251, 191, 36, 0.2)',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
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
                                                backgroundColor: 'var(--color-pg-border-subtle)',
                                                borderRadius: '10px',
                                            }}>
                                                <label style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                                                    {t.failure_type_label}
                                                </label>
                                                <select
                                                    value={kendalaType}
                                                    onChange={(e) => setKendalaType(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 10px',
                                                        backgroundColor: 'var(--color-pg-input)',
                                                        color: 'var(--color-pg-text)',
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
                                                <label style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginTop: '8px', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                                                    {language === 'en' ? 'Note / Description' : 'Catatan / Deskripsi'}
                                                </label>
                                                <textarea
                                                    value={kendalaNote}
                                                    onChange={(e) => setKendalaNote(e.target.value)}
                                                    placeholder={language === 'en' ? 'Provide details about the issue...' : 'Berikan detail mengenai kendala...'}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 10px',
                                                        backgroundColor: 'var(--color-pg-input)',
                                                        color: 'var(--color-pg-text)',
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
                                                        disabled={loading}
                                                        className="focus:outline-none focus:ring-1 focus:ring-white/25 hover:bg-white/5 active:scale-95 disabled:opacity-50 transition-all duration-150"
                                                        style={{
                                                            padding: '10px 16px',
                                                            backgroundColor: 'transparent',
                                                            color: 'var(--color-pg-text-secondary)',
                                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                                            borderRadius: '8px',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {t.cancel}
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="focus:outline-none focus:ring-2 focus:ring-red-500/50 hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all duration-150"
                                                        style={{
                                                            padding: '10px 18px',
                                                            backgroundColor: 'var(--color-pg-danger)',
                                                            color: '#fff',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            fontWeight: 700,
                                                            fontSize: '12px',
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
                                                backgroundColor: 'var(--color-pg-border-subtle)',
                                                borderRadius: '10px',
                                            }}>
                                                <label style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                                                    {t.reject_qty_label}
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={rejectQty}
                                                    disabled={loading}
                                                    onChange={(e) => setRejectQty(e.target.value)}
                                                    className="focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 transition-all duration-150"
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 12px',
                                                        backgroundColor: 'var(--color-pg-input)',
                                                        color: 'var(--color-pg-text)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '8px',
                                                        fontSize: '14px',
                                                        outline: 'none',
                                                        marginBottom: '8px',
                                                    }}
                                                />
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowQc(false)}
                                                        disabled={loading}
                                                        className="focus:outline-none focus:ring-1 focus:ring-white/25 hover:bg-white/5 active:scale-95 disabled:opacity-50 transition-all duration-150"
                                                        style={{
                                                            padding: '10px 16px',
                                                            backgroundColor: 'transparent',
                                                            color: 'var(--color-pg-text-secondary)',
                                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                                            borderRadius: '8px',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {t.cancel}
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="focus:outline-none focus:ring-2 focus:ring-amber-500/50 hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all duration-150"
                                                        style={{
                                                            padding: '10px 18px',
                                                            backgroundColor: 'var(--color-pg-warning)',
                                                            color: 'var(--color-pg-surface)',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            fontWeight: 700,
                                                            fontSize: '12px',
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
                            {(() => {
                                const hasLocalChanges = (item.target_qty > 1 && localCompletedQty !== (activeStage?.stage.completed_qty ?? 0)) ||
                                                        (item.target_qty === 1 && localProgressPercent !== (activeStage?.stage.progress_percent ?? '0'));

                                const doneButtonText = hasLocalChanges
                                    ? (language === 'en' ? 'Save & Close' : 'Simpan & Selesai')
                                    : (language === 'en' ? 'Close' : 'Selesai');

                                return (
                                    <button
                                        onClick={handleDoneSubmit}
                                        disabled={loading}
                                        className="focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:brightness-105 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            marginTop: '12px',
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: hasLocalChanges ? '#10b981' : 'rgba(52, 211, 153, 0.12)',
                                            color: hasLocalChanges ? '#ffffff' : 'var(--color-pg-success)',
                                            border: hasLocalChanges ? 'none' : '1px solid rgba(52, 211, 153, 0.2)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            textAlign: 'center',
                                            boxShadow: hasLocalChanges ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        {loading && (
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style={{ color: 'currentColor' }}>
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        {doneButtonText}
                                    </button>
                                );
                            })()}
                        </div>
                    ) : (
                        // Fallback view when activeStage is null (locked stage or role mismatch)
                        <div style={{
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            padding: '12px',
                            backgroundColor: 'rgba(0, 0, 0, 0.15)',
                        }}>
                            {/* Role Mismatch Warning if role has no matching stages at all */}
                            {getMatchingStageOrMock(item, userRole) === null ? (
                                <div style={{
                                    padding: '8px 12px',
                                    backgroundColor: 'rgba(248, 113, 113, 0.08)',
                                    color: 'var(--color-pg-danger)',
                                    border: '1px solid rgba(248, 113, 113, 0.15)',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    justifyContent: 'center'
                                }}>
                                    <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: 'var(--color-pg-danger)', borderRadius: '50%' }} />
                                    {t.role_mismatch}
                                </div>
                            ) : (() => {
                                // Locked warning banner
                                const matched = getMatchingStageOrMock(item, userRole);
                                const lockReason = matched ? getStageLockReason(item, matched.stage_name, userRole, language) : null;
                                return lockReason ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 12px',
                                        backgroundColor: 'rgba(251, 191, 36, 0.08)',
                                        border: '1px solid rgba(251, 191, 36, 0.15)',
                                        borderRadius: '8px',
                                        color: 'var(--color-pg-warning)',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                    }}>
                                        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                                        <span>{lockReason}</span>
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function WorkerDashboard({ items, auth_user, tenant_id }: Props) {
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
    const [frozen, setFrozen] = useState<{ itemName: string } | null>(null);
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);

    const changeTheme = (newTheme: string) => {
        localStorage.setItem('pogrid_theme', newTheme);
        const classes = ['theme-default', 'theme-linear', 'theme-vercel', 'theme-stripe', 'theme-github', 'theme-nordic'];
        classes.forEach(c => document.documentElement.classList.remove(c));
        document.documentElement.classList.add(newTheme);
        setShowThemeDropdown(false);
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const id = tenant_id ?? (props as any).tenant_id;
        if (!id) return;

        const channel = echo.private(`tenant.${id}.workers`);
        channel.listen('production.terminated', (e: any) => {
            setFrozen({ itemName: e.item?.item_name || '' });
            setTimeout(() => {
                window.location.href = `/c/${slug}`;
            }, 10000);
        });

        return () => {
            echo.leave(`tenant.${id}.workers`);
        };
    }, [tenant_id, (props as any).tenant_id]);

    const changeLanguage = (lang: 'en' | 'id') => {
        setLanguage(lang);
        localStorage.setItem('pogrid_lang', lang);
    };

    if (frozen) {
        return (
            <div style={{
                backgroundColor: 'var(--color-pg-bg)', fontFamily: 'Inter, sans-serif',
                color: 'var(--color-pg-text)', height: '100vh', width: '100vw',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                position: 'fixed', top: 0, left: 0, zIndex: 99999,
            }}>
                <div style={{ fontSize: '64px', marginBottom: '24px' }}>⛔</div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', textAlign: 'center' }}>
                    {language === 'en' ? 'Production Terminated' : 'Produksi Dihentikan'}
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--color-pg-text-secondary)', margin: '0 0 4px', textAlign: 'center', maxWidth: '320px' }}>
                    {language === 'en'
                        ? `Owner has terminated production for "${frozen.itemName}".`
                        : `Owner telah menghentikan produksi untuk "${frozen.itemName}".`}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', margin: '0 0 24px', textAlign: 'center' }}>
                    {language === 'en' ? 'Redirecting to login...' : 'Mengalihkan ke halaman login...'}
                </p>
                <button onClick={() => { window.location.href = `/c/${slug}`; }}
                    style={{
                        padding: '12px 32px', backgroundColor: 'var(--color-pg-primary)', color: '#fff',
                        border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px',
                        cursor: 'pointer',
                    }}>
                    {language === 'en' ? 'Return to Login' : 'Kembali ke Login'}
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard-root" style={{
            backgroundColor: 'var(--color-pg-bg)',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--color-pg-text)',
        }}>
            {/* Header */}
        <header className="responsive-header p-3 border-b border-pg-border bg-pg-bg/60 backdrop-blur shrink-0">
                <div>
                    <div className="greeting-name text-sm text-pg-primary-hover font-semibold mb-0.5">
                        {language === 'en'
                            ? `Hello, ${auth_user?.name}${auth_user?.post_display_name ? ` (${localizedDisplay({ display_name: auth_user.post_display_name, display_name_id: auth_user.post_display_name_id }, language)})` : ''}`
                            : `Halo, ${auth_user?.name}${auth_user?.post_display_name ? ` (${localizedDisplay({ display_name: auth_user.post_display_name, display_name_id: auth_user.post_display_name_id }, language)})` : ''}`}
                    </div>
                    <h1 className="text-2xl font-extrabold m-0 tracking-tight">{t.floor_terminal}</h1>
                    <p className="text-xs text-pg-text-muted m-0 mt-0.5">
                        {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' · '}
                        {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className="flex justify-between items-center gap-2 flex-wrap w-full md:w-auto mt-2 md:mt-0">
                    {/* Left: Language switcher */}
                    <div className="flex gap-1 bg-white/4 p-0.5 rounded-lg border border-pg-border">
                        <button
                            onClick={() => changeLanguage('en')}
                            className="min-w-[44px] min-h-[44px] px-3 py-1.5 border-none rounded-md text-white font-bold text-xs cursor-pointer flex items-center justify-center"
                            style={{
                                backgroundColor: language === 'en' ? 'var(--color-pg-primary)' : 'transparent',
                            }}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => changeLanguage('id')}
                            className="min-w-[44px] min-h-[44px] px-3 py-1.5 border-none rounded-md text-white font-bold text-xs cursor-pointer flex items-center justify-center"
                            style={{
                                backgroundColor: language === 'id' ? 'var(--color-pg-primary)' : 'transparent',
                            }}
                        >
                            ID
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* Trouble Reports Button */}
                        <Link
                            href={`/c/${slug}/trouble-reports`}
                            style={{
                                width: '44px',
                                height: '44px',
                                backgroundColor: 'rgba(248, 113, 113, 0.12)',
                                color: 'var(--color-pg-danger)',
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
                        </Link>

                        {/* KPI Button */}
                        <Link
                            href={`/c/${slug}/my-kpi`}
                            style={{
                                minHeight: '44px',
                                padding: '0 12px',
                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none',
                                gap: '4px',
                                fontSize: '12px',
                                fontWeight: 700,
                            }}
                            title={language === 'en' ? 'My KPI' : 'KPI Saya'}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                            {language === 'en' ? 'My KPI' : 'KPI Saya'}
                        </Link>

                        {/* Archive Button */}
                        <Link
                            href={`/c/${slug}/archive`}
                            style={{
                                minHeight: '44px',
                                padding: '0 12px',
                                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                                color: 'var(--color-pg-primary-hover)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none',
                                gap: '4px',
                                fontSize: '12px',
                                fontWeight: 700,
                            }}
                            title={language === 'en' ? 'Archive' : 'Arsip'}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="21 8 21 21 3 21 3 8" />
                                <rect x="1" y="3" width="22" height="5" />
                                <line x1="10" y1="12" x2="14" y2="12" />
                            </svg>
                            {language === 'en' ? 'Archive' : 'Arsip'}
                        </Link>

                        {/* Theme Picker */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                    color: 'var(--color-pg-text-secondary)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                title={language === 'en' ? 'Switch Theme' : 'Ganti Tema'}
                            >
                                <Palette size={18} />
                            </button>
                            {showThemeDropdown && (
                                <div style={{
                                    position: 'absolute',
                                    top: '50px',
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
                                        { id: 'theme-default', name: 'Titanium Slate', color: 'var(--color-pg-primary)' },
                                        { id: 'theme-linear', name: 'Obsidian Graphite', color: 'var(--color-pg-primary)' },
                                        { id: 'theme-vercel', name: 'Monochrome Void', color: 'var(--color-pg-primary)' },
                                        { id: 'theme-stripe', name: 'Stripe Navy', color: 'var(--color-pg-primary)' },
                                        { id: 'theme-github', name: 'GitHub Slate', color: 'var(--color-pg-primary)' },
                                        { id: 'theme-nordic', name: 'Nordic Polar', color: 'var(--color-pg-primary)' },
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

                        {/* Profile Button */}
                        <Link
                            href={`/c/${slug}/profile`}
                            style={{
                                width: '44px',
                                height: '44px',
                                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                color: 'var(--color-pg-text-secondary)',
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
                        </Link>

                        <button
                            onClick={() => router.post('/logout')}
                            style={{
                                minHeight: '44px',
                                padding: '0 16px',
                                backgroundColor: 'var(--color-pg-danger)',
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
            <div className="dashboard-scroll" style={{
                padding: '12px',
            }}>
                    {items.length === 0 ? (
                    <p style={{ color: 'var(--color-pg-text-muted)', padding: '24px', textAlign: 'center', fontSize: '14px' }}>
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
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
