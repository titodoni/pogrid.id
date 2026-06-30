import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle } from '../../Components/Icons';

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
    },
    id: {
        floor_terminal: "Terminal Pabrik",
        subtitle_realtime: "Catat progres produksi secara real-time",
        exit_terminal: "Keluar",
        active_items: "Barang Produksi Aktif",
        no_active_items: "Tidak ada barang aktif.",
        client: "Klien",
        deadline: "Tenggat",
        qty: "Jml",
        completed: "Selesai",
        progress: "Progres",
        log_rework: "Rework",
        report_failure: "Kendala",
        cancel: "Batal",
        submit: "Kirim",
        rework_dialog_title: "Rework QC",
        reject_qty_label: "Jml Ditolak",
        failure_dialog_title: "Lapor Kendala",
        failure_type_label: "Penyebab",
        machine_broken: "Mesin Rusak",
        material_delay: "Material Telat",
        power_outage: "Mati Lampu",
        human_error: "Kesalahan Operator",
        operator_sick: "Operator Sakit",
    }
};

export default function WorkerDashboard({ items }: Props) {
    const { url } = usePage();
    const pathParts = url.split('/');
    const slug = pathParts[2] || '';

    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
        }
        return 'en';
    });

    const t = translations[language];

    const [activeStage, setActiveStage] = useState<{ stage: Stage; item: Item } | null>(null);
    const [showKendala, setShowKendala] = useState(false);
    const [showQc, setShowQc] = useState(false);
    const [kendalaType, setKendalaType] = useState('Machine Broken');
    const [rejectQty, setRejectQty] = useState('1');

    const selectStage = (item: Item, stage: Stage) => {
        if (activeStage?.stage.id === stage.id && activeStage?.item.id === item.id) {
            setActiveStage(null);
            setShowKendala(false);
            setShowQc(false);
            return;
        }
        setActiveStage({ stage, item });
        setShowKendala(false);
        setShowQc(false);
    };

    const handleStep = (amount: number) => {
        if (!activeStage) return;
        const newQty = Math.max(0, Math.min(activeStage.item.target_qty, activeStage.stage.completed_qty + amount));

        router.post(`/c/${slug}/progress/${activeStage.stage.id}/update`, {
            completed_qty: newQty
        }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const updatedItem = (page.props.items as Item[]).find(i => i.id === activeStage.item.id);
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
                const updatedItem = (page.props.items as Item[]).find(i => i.id === activeStage.item.id);
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
            kendala_type: kendalaType
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowKendala(false);
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
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
            }}>
                <div>
                    <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t.floor_terminal}</h1>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '1px 0 0 0' }}>{t.subtitle_realtime}</p>
                </div>
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
                        {items.map((item) => {
                            const isActive = activeStage?.item.id === item.id;
                            const processedStages = item.item_progresses.filter(s => s.status === 'COMPLETED' || s.status === 'STUCK');
                            const totalStages = item.item_progresses.length;
                            const stageProgress = totalStages > 0 ? Math.round((processedStages.length / totalStages) * 100) : 0;

                            return (
                                <div key={item.id} style={{
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
                                            {item.item_progresses.map((stage) => {
                                                const isStageActive = isActive && activeStage?.stage.id === stage.id;
                                                return (
                                                    <button
                                                        key={stage.id}
                                                        onClick={() => selectStage(item, stage)}
                                                        style={{
                                                            padding: '5px 10px',
                                                            border: '1px solid',
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
                                                        }}
                                                    >
                                                        {stage.stage_name}
                                                        <span style={{
                                                            display: 'block',
                                                            fontSize: '9px',
                                                            color: '#64748b',
                                                            marginTop: '1px',
                                                        }}>
                                                            {item.target_qty > 1
                                                                ? `${stage.completed_qty}/${item.target_qty}`
                                                                : `${parseFloat(stage.progress_percent).toFixed(0)}%`
                                                            }
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Inline Progress Controls */}
                                    {isActive && activeStage && (
                                        <div style={{
                                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                            padding: '10px 12px',
                                            backgroundColor: 'rgba(0, 0, 0, 0.15)',
                                        }}>
                                            {/* Stepper or Percentage */}
                                            {activeStage.item.target_qty > 1 ? (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '16px',
                                                    marginBottom: '8px',
                                                }}>
                                                    <button
                                                        onClick={() => handleStep(-1)}
                                                        style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '20px',
                                                            border: 'none',
                                                            backgroundColor: '#ef4444',
                                                            color: '#fff',
                                                            fontSize: '18px',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        -
                                                    </button>
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
                                                            / {activeStage.item.target_qty}
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
                                                    {[0, 25, 50, 75, 100].map((pct) => (
                                                        <button
                                                            key={pct}
                                                            onClick={() => handlePercentSelect(pct)}
                                                            style={{
                                                                padding: '10px 4px',
                                                                borderRadius: '6px',
                                                                border: 'none',
                                                                backgroundColor: parseFloat(activeStage.stage.progress_percent) === pct
                                                                    ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                                                                color: '#fff',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            {pct}%
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Kendala / QC Action Buttons */}
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

                                            {/* Inline Kendala Form */}
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

                                            {/* Inline QC Rework Form */}
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
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
