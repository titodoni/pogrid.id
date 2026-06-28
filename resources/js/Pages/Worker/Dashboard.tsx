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
    po?: {
        po_number: string;
        external_po_number?: string | null;
        client_name: string;
        global_deadline: string;
        is_urgent?: boolean | null;
    };
    item_progresses: Stage[];
}

const formatDeadline = (deadlineDateStr?: string) => {
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

interface Props {
    items: Item[];
}

const translations = {
    en: {
        floor_terminal: "Floor Operation Terminal",
        subtitle_realtime: "Log production progress in real-time",
        exit_terminal: "Exit Terminal",
        active_items: "Active Production Items",
        no_active_items: "No active items on the floor.",
        client: "Client",
        deadline: "Deadline",
        qty: "Qty",
        item_stages: "Item Stages",
        select_stage: "Select an active stage on the left to start logging progress.",
        completed: "Completed",
        progress: "Progress",
        log_rework: "Log QC Rework",
        report_failure: "Report Failure / Kendala",
        increase_progress: "Increase Progress",
        decrease_progress: "Decrease Progress",
        log_progress_percentage: "Log Progress Percentage",
        cancel: "Cancel",
        submit: "Submit",
        rework_dialog_title: "Log QC Rework / Failure Reject",
        rework_dialog_subtitle: "Enter the number of rejected pieces that require rework. This will reset their progress.",
        reject_qty_label: "Rejected Quantity (requires rework)",
        failure_dialog_title: "Report Failure / Kendala",
        failure_dialog_subtitle: "Flag this stage with an alert block. Supervisors will be notified.",
        failure_type_label: "Failure Cause / Type",
        machine_broken: "Machine Broken / Error",
        material_delay: "Material / Drawing Delay",
        power_outage: "Power Outage / Technical",
        human_error: "Operator / Human Error",
    },
    id: {
        floor_terminal: "Terminal Operasi Pabrik",
        subtitle_realtime: "Catat progres produksi secara real-time",
        exit_terminal: "Keluar Terminal",
        active_items: "Barang Produksi Aktif",
        no_active_items: "Tidak ada barang aktif di pabrik saat ini.",
        client: "Klien",
        deadline: "Tenggat Waktu",
        qty: "Jumlah",
        item_stages: "Tahapan Barang",
        select_stage: "Pilih tahapan aktif di sebelah kiri untuk mulai mencatat progres.",
        completed: "Selesai",
        progress: "Progres",
        log_rework: "Catat Rework QC",
        report_failure: "Laporkan Kendala / Kegagalan",
        increase_progress: "Tambah Progres",
        decrease_progress: "Kurangi Progres",
        log_progress_percentage: "Catat Persentase Progres",
        cancel: "Batal",
        submit: "Kirim",
        rework_dialog_title: "Catat Rework QC / Penolakan Gagal",
        rework_dialog_subtitle: "Masukkan jumlah barang yang ditolak yang membutuhkan rework. Ini akan mengulang kembali progres mereka.",
        reject_qty_label: "Jumlah Ditolak (membutuhkan rework)",
        failure_dialog_title: "Laporkan Kendala / Kegagalan",
        failure_dialog_subtitle: "Tandai tahapan ini dengan blokir peringatan. Pengawas akan segera diberitahu.",
        failure_type_label: "Penyebab / Tipe Kendala",
        machine_broken: "Mesin Rusak / Error",
        material_delay: "Keterlambatan Bahan / Gambar",
        power_outage: "Mati Lampu / Teknis",
        human_error: "Kesalahan Operator / Manusia",
    }
};

export default function WorkerDashboard({ items }: Props) {
    const { url } = usePage();
    // Resolve tenant slug from current path
    const pathParts = url.split('/');
    const slug = pathParts[2] || '';

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

    const [activeStage, setActiveStage] = useState<Stage | null>(null);
    const [activeItem, setActiveItem] = useState<Item | null>(null);
    const [showKendalaModal, setShowKendalaModal] = useState(false);
    const [showQcModal, setShowQcModal] = useState(false);
    
    // Form inputs
    const [kendalaType, setKendalaType] = useState('Machine Broken');
    const [rejectQty, setRejectQty] = useState('1');

    const selectStage = (item: Item, stage: Stage) => {
        setActiveItem(item);
        setActiveStage(stage);
    };

    const handleStep = (amount: number) => {
        if (!activeStage || !activeItem) return;
        const newQty = Math.max(0, Math.min(activeItem.target_qty, activeStage.completed_qty + amount));
        
        router.post(`/c/${slug}/progress/${activeStage.id}/update`, {
            completed_qty: newQty
        }, {
            onSuccess: (page) => {
                // Update local state from response
                const updatedItem = (page.props.items as Item[]).find(i => i.id === activeItem.id);
                if (updatedItem) {
                    const updatedStage = updatedItem.item_progresses.find(s => s.id === activeStage.id);
                    if (updatedStage) {
                        setActiveStage(updatedStage);
                    }
                }
            }
        });
    };

    const handlePercentSelect = (percent: number) => {
        if (!activeStage || !activeItem) return;
        router.post(`/c/${slug}/progress/${activeStage.id}/update`, {
            progress_percent: percent
        }, {
            onSuccess: (page) => {
                const updatedItem = (page.props.items as Item[]).find(i => i.id === activeItem.id);
                if (updatedItem) {
                    const updatedStage = updatedItem.item_progresses.find(s => s.id === activeStage.id);
                    if (updatedStage) {
                        setActiveStage(updatedStage);
                    }
                }
            }
        });
    };

    const submitKendala = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeStage) return;
        router.post(`/c/${slug}/progress/${activeStage.id}/kendala`, {
            kendala_type: kendalaType
        }, {
            onSuccess: () => {
                setShowKendalaModal(false);
                setActiveStage(null);
                setActiveItem(null);
            }
        });
    };

    const submitQcRework = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeStage) return;
        router.post(`/c/${slug}/progress/${activeStage.id}/rework`, {
            reject_qty: parseInt(rejectQty, 10)
        }, {
            onSuccess: () => {
                setShowQcModal(false);
                setActiveStage(null);
                setActiveItem(null);
            }
        });
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#090d16',
            fontFamily: 'Inter, sans-serif',
            color: '#f8fafc',
            padding: '24px'
        }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '16px',
                marginBottom: '24px'
            }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>{t.floor_terminal}</h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>{t.subtitle_realtime}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                    <button
                        onClick={() => router.post('/logout')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        {t.exit_terminal}
                    </button>
                </div>
            </header>

            <div className="responsive-grid responsive-grid-split" style={{ gap: '24px' }}>
                {/* Active Items & Stages List */}
                <div style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '20px'
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>{t.active_items}</h2>
                    {items.length === 0 ? (
                        <p style={{ color: '#64748b', padding: '16px', textAlign: 'center' }}>{t.no_active_items}</p>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} style={{
                                backgroundColor: '#0f172a',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '12px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {/* 1st Headline: Item Name */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>{item.item_name}</h3>
                                            {item.po?.is_urgent && (
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
                                            {t.client}: {item.po?.client_name || 'N/A'} {item.po?.po_number ? `(PO: ${item.po.po_number}${item.po.external_po_number ? ` / ${item.po.external_po_number}` : ''})` : ''}
                                        </div>
                                        {/* 3rd Headline: Deadline */}
                                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                                            {t.deadline}: {formatDeadline(item.po?.global_deadline)}
                                        </div>
                                        {/* 4th Headline: Qty */}
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                                            {t.qty}: {item.target_qty} pcs
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 800,
                                        color: '#3b82f6',
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        padding: '4px 8px',
                                        borderRadius: '6px'
                                    }}>
                                        {parseFloat(item.progress_percent).toFixed(1)}%
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {item.item_progresses.map((stage) => (
                                        <button
                                            key={stage.id}
                                            onClick={() => selectStage(item, stage)}
                                            style={{
                                                padding: '10px 14px',
                                                border: '1px solid',
                                                borderColor: activeStage?.id === stage.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                                                borderRadius: '8px',
                                                backgroundColor: stage.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)'
                                                    : stage.status === 'STUCK' ? 'rgba(239, 68, 68, 0.1)'
                                                    : activeStage?.id === stage.id ? '#1e3a8a' : '#090d16',
                                                color: stage.status === 'COMPLETED' ? '#10b981'
                                                    : stage.status === 'STUCK' ? '#ef4444'
                                                    : activeStage?.id === stage.id ? '#38bdf8' : '#e2e8f0',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {stage.stage_name}
                                            <span style={{ display: 'block', fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                                {item.target_qty > 1 ? `${stage.completed_qty}/${item.target_qty} pcs` : `${parseFloat(stage.progress_percent).toFixed(0)}%`}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Progress Control Panel */}
                <div>
                    {activeStage && activeItem ? (
                        <div style={{
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '16px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            position: 'sticky',
                            top: '24px'
                        }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', textAlign: 'center' }}>
                                Log Progress for {activeStage.stage_name}
                            </h2>
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', textAlign: 'center' }}>
                                Item: {activeItem.item_name}
                            </p>

                            {/* Stepper Buttons for Qty > 1 */}
                            {activeItem.target_qty > 1 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
                                    <button
                                        onClick={() => handleStep(-1)}
                                        style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '28px',
                                            border: 'none',
                                            backgroundColor: '#ef4444',
                                            color: '#fff',
                                            fontSize: '24px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)'
                                        }}
                                    >
                                        -
                                    </button>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '36px', fontWeight: 800 }}>{activeStage.completed_qty}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>of {activeItem.target_qty} completed</div>
                                    </div>
                                    <button
                                        onClick={() => handleStep(1)}
                                        style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '28px',
                                            border: 'none',
                                            backgroundColor: '#10b981',
                                            color: '#fff',
                                            fontSize: '24px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                            ) : (
                                /* Percentage Blocks for Qty == 1 */
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', width: '100%', marginBottom: '28px' }}>
                                    {[0, 25, 50, 75, 100].map((pct) => (
                                        <button
                                            key={pct}
                                            onClick={() => handlePercentSelect(pct)}
                                            style={{
                                                padding: '16px 8px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                backgroundColor: parseFloat(activeStage.progress_percent) === pct ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                                                color: '#fff',
                                                fontSize: '14px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'background-color 0.15s'
                                            }}
                                        >
                                            {pct}%
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Danger and QC Action Center */}
                            <div style={{ display: 'flex', gap: '12px', width: '100%', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
                                <button
                                    onClick={() => setShowKendalaModal(true)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    ⚠️ {t.report_failure}
                                </button>
                                <button
                                    onClick={() => setShowQcModal(true)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        backgroundColor: 'rgba(234, 179, 8, 0.15)',
                                        color: '#eab308',
                                        border: '1px solid rgba(234, 179, 8, 0.3)',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    🔍 {t.log_rework}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            backgroundColor: 'rgba(15, 23, 42, 0.3)',
                            border: '1px dashed rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            padding: '48px 24px',
                            textAlign: 'center',
                            color: '#64748b'
                        }}>
                            {t.select_stage}
                        </div>
                    )}
                </div>
            </div>

            {/* Kendala Modal */}
            {showKendalaModal && activeStage && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50
                }}>
                    <form onSubmit={submitKendala} style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '100%',
                        maxWidth: '400px'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0' }}>{t.failure_dialog_title}</h3>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>{t.failure_type_label}</label>
                        <select
                            value={kendalaType}
                            onChange={(e) => setKendalaType(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#090d16',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                outline: 'none'
                            }}
                        >
                            <option value="Machine Broken">{t.machine_broken}</option>
                            <option value="Material Delay">{t.material_delay}</option>
                            <option value="Operator Sick">Operator Sick / Absen</option>
                            <option value="Power Outage">{t.power_outage}</option>
                        </select>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setShowKendalaModal(false)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'transparent',
                                    color: '#94a3b8',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {t.cancel}
                            </button>
                            <button
                                type="submit"
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#ef4444',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                {t.submit}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* QC Modal */}
            {showQcModal && activeStage && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50
                }}>
                    <form onSubmit={submitQcRework} style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '100%',
                        maxWidth: '400px'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0' }}>{t.rework_dialog_title}</h3>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>{t.rework_dialog_subtitle}</p>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>{t.reject_qty_label}</label>
                        <input
                            type="number"
                            min="1"
                            value={rejectQty}
                            onChange={(e) => setRejectQty(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#090d16',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                outline: 'none'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setShowQcModal(false)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'transparent',
                                    color: '#94a3b8',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {t.cancel}
                            </button>
                            <button
                                type="submit"
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#eab308',
                                    color: '#000',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                {t.submit}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
