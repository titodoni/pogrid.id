import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Settings, Palette } from '../../Components/Icons';
import { formatDeadline } from '../../Utils/deadline';
import { localizedDisplay } from '../../Utils/locale';
import { isStageLocked, getStageLockReason, getMatchingStages, getMatchingStageOrMock, getAllStages, getFinanceStage } from '../../Utils/permissions';
import { WarningPill } from '../../Components/WarningPill';
import { WorkerHeader } from '../../Components/WorkerHeader';
import BroadcastToasts from '../../Components/BroadcastToasts';
import echo from '../../bootstrap';
import { useTranslation } from "@/i18n/useTranslation";
import { useEchoPresence } from '../../Hooks/useEchoPresence';
import FinancePanel from '../../features/worker/FinancePanel';
import KendalaForm from '../../features/worker/KendalaForm';
import ProgressControls from '../../features/worker/ProgressControls';
import QcReworkForm from '../../features/worker/QcReworkForm';
import DrafterRoutingModal from '../../features/worker/DrafterRoutingModal';

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
    vendor_name?: string | null;
    vendor_po?: string | null;
    eta_date?: string | null;
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
    tenant?: { id: number; company_name: string; slug: string; logo_path?: string | null; theme?: string };
}

// isStageLocked moved to ../../Utils/permissions

interface ItemCardProps {
    item: Item;
    userRole: string;
    slug: string;
    language: 'en' | 'id';
    onOpenDrafterModal?: (item: Item) => void;
}

function ItemCard({
    item,
    userRole,
    slug,
    language,
    onOpenDrafterModal,
}: ItemCardProps) {
    const { t } = useTranslation('Worker_Dashboard');
    const [isHovered, setIsHovered] = useState(false);
    const [loading, setLoading] = useState(false);


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
    const [reworkReason, setReworkReason] = useState('');
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
                // Virtual finance stage (single derivation: getFinanceStage)
                setActiveStage({ stage: getFinanceStage(item), item });
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
                    setActiveStage({ stage: getFinanceStage(updatedItem), item: updatedItem });
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
            reject_qty: parseInt(rejectQty, 10),
            rework_reason: reworkReason
        }, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
            onSuccess: () => {
                setShowQc(false);
                setReworkReason('');
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
                borderColor: (item.po?.is_urgent || item.alerts?.some(a => a.severity === 'YELLOW' && !a.is_resolved)) ? 'rgba(251, 146, 60, 0.3)' : 'var(--color-pg-border)',
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
                        color: 'var(--color-pg-text)',
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
                    <span className="mono" style={{ color: 'var(--color-pg-text-muted)', fontSize: '11px', fontWeight: 600, textAlign: 'right' }}>
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
                        backgroundColor: 'var(--color-pg-surface)',
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
                        const reworkVal = reworkAlert ? (reworkAlert.message || true) : null;
                        return <WarningPill deadlineDateStr={item.po?.global_deadline} reworkMessage={reworkVal} lang={language} />;
                    })()}
                </div>
            </div>

            {/* Expanded Drawer System */}
            {isExpanded && (
                <div style={{
                    borderTop: '1px solid var(--color-pg-border)',
                    backgroundColor: 'var(--color-pg-surface)',
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
                                    borderBottom: '1px solid var(--color-pg-border)',
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
                                                    border: isActive ? '1px solid ' + color : '1px solid var(--color-pg-border)',
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
                            borderTop: '1px solid var(--color-pg-border)',
                            padding: '10px 12px',
                            backgroundColor: 'var(--color-pg-surface)',
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
                                                        <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-pg-text)', margin: '0 0 2px 0' }}>
                                                            {language === 'en' ? 'Drafter Status' : 'Status Drafter'}
                                                        </h4>
                                                        <div style={{
                                                            display: 'flex',
                                                            backgroundColor: 'var(--color-pg-card-hover)',
                                                            padding: '4px',
                                                            borderRadius: '12px',
                                                            border: '1px solid var(--color-pg-border)',
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
                                                                            if (status === 'APPROVED') {
                                                                                onOpenDrafterModal?.(item);
                                                                                return;
                                                                            }
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
                                                        <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-pg-text)', margin: '0 0 2px 0' }}>
                                                            {language === 'en' ? 'Purchasing Status' : 'Status Pembelian'}
                                                        </h4>
                                                        <div style={{
                                                            display: 'flex',
                                                            backgroundColor: 'var(--color-pg-card-hover)',
                                                            padding: '4px',
                                                            borderRadius: '12px',
                                                            border: '1px solid var(--color-pg-border)',
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
                                            <div style={{
                                                display: 'flex',
                                                gap: '8px',
                                                marginTop: '4px',
                                                fontSize: '11px',
                                                color: 'var(--color-pg-text-secondary)',
                                                alignItems: 'center',
                                                backgroundColor: 'var(--color-pg-surface)',
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--color-pg-border)',
                                            }}>
                                                <span>🏷️ <strong>Vendor:</strong> {item.vendor_name || (language === 'en' ? 'Not specified' : 'Belum diisi')}</span>
                                                {item.vendor_po && <span>| <strong>PO:</strong> {item.vendor_po}</span>}
                                                {item.eta_date && <span>| <strong>ETA:</strong> {item.eta_date}</span>}
                                            </div>
                                        </div>
                                    );
                                }

                                if (activeStage.stage.stage_name === 'Finance') {
                                    return (
                                        <FinancePanel
                                            deliveryStatus={item.delivery_status}
                                            deliveredQty={item.delivered_qty ?? 0}
                                            targetQty={item.target_qty}
                                            invoiceStatus={invoiceStatus}
                                            setInvoiceStatus={setInvoiceStatus}
                                            invoicedQty={invoicedQty}
                                            setInvoicedQty={setInvoicedQty}
                                            paymentStatus={paymentStatus}
                                            setPaymentStatus={setPaymentStatus}
                                            onSubmit={handleFinanceSubmit}
                                            loading={loading}
                                            language={language}
                                            t={t}
                                        />
                                    );
                                }

                                const stageNameLower = activeStage.stage.stage_name.toLowerCase();
                                const isQcStage = stageNameLower === 'qc';
                                const isDeliveryStage = stageNameLower === 'delivery' || stageNameLower === 'pengiriman';

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
                                        <ProgressControls
                                            targetQty={item.target_qty}
                                            maxQty={maxQty}
                                            savedCompletedQty={activeStage.stage.completed_qty}
                                            savedProgressPercent={activeStage.stage.progress_percent}
                                            hasPreviousUpdate={((activeStage.stage.previous_completed_qty !== null && activeStage.stage.previous_completed_qty !== undefined) || (activeStage.stage.previous_progress_percent !== null && activeStage.stage.previous_progress_percent !== undefined))}
                                            localCompletedQty={localCompletedQty}
                                            setLocalCompletedQty={setLocalCompletedQty}
                                            localProgressPercent={localProgressPercent}
                                            setLocalProgressPercent={setLocalProgressPercent}
                                            isQcStage={isQcStage}
                                            isDeliveryStage={isDeliveryStage}
                                            showKendala={showKendala}
                                            setShowKendala={setShowKendala}
                                            showQc={showQc}
                                            setShowQc={setShowQc}
                                            onShowQcForSinglePiece={() => {
                                                setRejectQty('1');
                                                setShowQc(prev => !prev);
                                            }}
                                            onRevert={revertLastUpdate}
                                            loading={loading}
                                            language={language}
                                            t={t}
                                        />

                                        {showKendala && (
                                            <KendalaForm
                                                kendalaType={kendalaType}
                                                setKendalaType={setKendalaType}
                                                kendalaNote={kendalaNote}
                                                setKendalaNote={setKendalaNote}
                                                onCancel={() => setShowKendala(false)}
                                                onSubmit={submitKendala}
                                                loading={loading}
                                                language={language}
                                                t={t}
                                            />
                                        )}

                                        {showQc && (
                                            <QcReworkForm
                                                targetQty={item.target_qty}
                                                rejectQty={rejectQty}
                                                setRejectQty={setRejectQty}
                                                reworkReason={reworkReason}
                                                setReworkReason={setReworkReason}
                                                onCancel={() => setShowQc(false)}
                                                onSubmit={submitQcRework}
                                                loading={loading}
                                                t={t}
                                            />
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
                            borderTop: '1px solid var(--color-pg-border)',
                            padding: '12px',
                            backgroundColor: 'var(--color-pg-surface)',
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
                                const lockReason = matched ? getStageLockReason(item, matched.stage_name, userRole, t) : null;
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

export default function WorkerDashboard({ items, auth_user, tenant_id, tenant }: Props) {
    const { t, language, changeLanguage } = useTranslation('Worker_Dashboard');
    const { props, url } = usePage();
    const pathParts = url.split('/');
    const slug = pathParts[2] || '';
    const userRole = auth_user?.role_name ? auth_user.role_name.toUpperCase() : '';

    useEffect(() => {
        if (typeof window !== 'undefined' && tenant?.theme) {
            const classes = ['theme-default', 'theme-linear', 'theme-vercel', 'theme-stripe', 'theme-github', 'theme-nordic', 'theme-light', 'theme-brand'];
            classes.forEach(c => document.documentElement.classList.remove(c));
            document.documentElement.classList.add(tenant.theme);
        }
    }, [tenant?.theme]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [frozen, setFrozen] = useState<{ itemName: string } | null>(null);
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);
    const [drafterRoutingItem, setDrafterRoutingItem] = useState<Item | null>(null);
    const reloadTimeoutRef = useRef<any>(null);

    const triggerScopedReload = useCallback((onlyKeys: string[] = ['items']) => {
        if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = setTimeout(() => {
            router.reload({
                only: onlyKeys as any,
            });
        }, 800);
    }, []);

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

    const { toastQueue, setToastQueue, onlineUsers, wsStatus } = useEchoPresence({
        tenantId: tenant_id ?? (props as any).tenant_id,
        channel: 'workers',
        onRefresh: () => router.reload({ only: ['items'] as any }),
        registerListeners: (channel, pushToast) => {
            channel.listen('.production.terminated', (e: any) => {
                setFrozen({ itemName: e.item?.item_name || '' });
                setTimeout(() => {
                    router.visit(`/c/${slug}`);
                }, 10000);
            });
            channel.listen('.task.updated', (e: any) => {
                pushToast({ message: e.message || '', severity: 'INFO', id: Date.now(), timestamp: Date.now() });
                triggerScopedReload(['items']);
            });
            channel.listen('.kendala.reported', (e: any) => {
                const alert = e.alert;
                pushToast({ message: alert?.message || '', severity: alert?.severity || 'RED', id: alert?.id || Date.now(), timestamp: Date.now() });
                router.reload({ only: ['items'] as any });
            });
            channel.listen('.qc.rework.logged', (e: any) => {
                const alert = e.alert;
                pushToast({ message: alert?.message || '', severity: 'REWORK', id: alert?.id || Date.now(), timestamp: Date.now() });
                triggerScopedReload(['items']);
            });
            channel.listen('.data.refreshed', () => {
                triggerScopedReload(['items']);
            });
        },
    });

    // Cleanup for the page-level debounced reload timer
    useEffect(() => () => {
        if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
    }, []);
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
        <div className="dashboard-root lg:ml-64 pb-24 lg:pb-8" style={{
            backgroundColor: 'var(--color-pg-bg)',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--color-pg-text)',
        }}>
            <BroadcastToasts
                toasts={toastQueue}
                language={language}
                onDismiss={(timestamp) => setToastQueue((prev) => prev.filter((x) => x.timestamp !== timestamp))}
            />
            {/* Header */}
            <WorkerHeader
                slug={slug}
                auth_user={auth_user}
                userRole={userRole}
                title={t.floor_terminal}
                language={language}
                changeLanguage={changeLanguage}
                currentView="dashboard"
                onlineUsersCount={onlineUsers.length}
                wsStatus={wsStatus}
                logoPath={tenant?.logo_path}
            />

            {/* Connection Disconnected Warning Banner */}
            {wsStatus === 'disconnected' && (
                <div style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    margin: '12px 12px 0 12px',
                    fontSize: '12px',
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                }}>
                    <span>⚠️</span>
                    <span>{language === 'en' ? 'Connection lost — data may be stale. Retrying...' : 'Koneksi terputus — data mungkin tidak terbaru (mencoba ulang...)'}</span>
                </div>
            )}

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
                                onOpenDrafterModal={(it) => setDrafterRoutingItem(it)}
                            />
                        ))}
                    </div>
                )}

                {/* Version Footer */}
                <div style={{
                    textAlign: 'center',
                    padding: '24px 16px 8px',
                    fontSize: '11px',
                    color: 'var(--color-pg-text-muted)',
                    opacity: 0.6,
                    borderTop: '1px solid var(--color-pg-border-subtle)',
                    marginTop: '32px',
                }}>
                    beta1 (2026-07-17)
                </div>
            </div>

            {drafterRoutingItem && (
                <DrafterRoutingModal
                    isOpen={!!drafterRoutingItem}
                    onClose={() => setDrafterRoutingItem(null)}
                    item={drafterRoutingItem}
                    slug={slug}
                    language={language}
                />
            )}
        </div>
    );
}
