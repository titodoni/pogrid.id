import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { ModalShell } from '../../Components/Modal/ModalShell';
import { Check } from '../../Components/Icons';

interface DrafterRoutingModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: {
        id: number;
        item_name: string;
        item_type: string;
        target_qty: number;
        required_stages?: string[];
        drafter_status?: string | null;
    };
    slug?: string;
    language: 'en' | 'id';
    submitUrl?: string;
    title?: string;
    actionLabel?: string;
}

const AVAILABLE_PRODUCTION_STAGES = [
    { key: 'Machining', label: 'CNC / Machining' },
    { key: 'Bubut Manual', label: 'Bubut Manual / Milling' },
    { key: 'Fabrication', label: 'Fabrikasi / Las' },
    { key: 'Assembly', label: 'Perakitan / Assembly' },
    { key: 'Surface Treatment', label: 'Finishing / Cat' },
];

const PRESETS = [
    {
        nameEn: 'CNC Workshop (Single)',
        nameId: 'Bubut / CNC Saja',
        stages: ['Design', 'Material', 'Machining', 'QC', 'Delivery'],
    },
    {
        nameEn: 'Fabrication (Single)',
        nameId: 'Fabrikasi Saja',
        stages: ['Design', 'Material', 'Fabrication', 'QC', 'Delivery'],
    },
    {
        nameEn: 'Multi-Step (CNC + Bubut + Rakit)',
        nameId: 'Multi-Step (CNC + Bubut + Rakit)',
        stages: ['Design', 'Material', 'Machining', 'Bubut Manual', 'Assembly', 'QC', 'Delivery'],
    },
    {
        nameEn: 'Full Production (+ Painting)',
        nameId: 'Lengkap (+ Finishing/Cat)',
        stages: ['Design', 'Material', 'Machining', 'Fabrication', 'Surface Treatment', 'Assembly', 'QC', 'Delivery'],
    },
];

export default function DrafterRoutingModal({
    isOpen,
    onClose,
    item,
    slug = '',
    language,
    submitUrl,
    title,
    actionLabel,
}: DrafterRoutingModalProps) {
    const [stages, setStages] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (item.required_stages && item.required_stages.length > 0) {
            const hasProductionStage = item.required_stages.some(s =>
                !['design', 'gambar', 'draft', 'material', 'bahan', 'qc', 'delivery', 'pengiriman', 'vendor'].includes(s.toLowerCase())
            );
            if (hasProductionStage) {
                setStages([...item.required_stages]);
            } else {
                setStages(['Design', 'Material', 'Machining', 'QC', 'Delivery']);
            }
        } else {
            setStages(['Design', 'Material', 'Machining', 'QC', 'Delivery']);
        }
    }, [item, isOpen]);

    if (!isOpen) return null;

    const toggleProductionStage = (stageName: string) => {
        if (stages.includes(stageName)) {
            setStages(stages.filter(s => s !== stageName));
        } else {
            const next = [...stages];
            const qcIndex = next.findIndex(s => s.toLowerCase().includes('qc'));
            const deliveryIndex = next.findIndex(s => s.toLowerCase().includes('delivery') || s.toLowerCase().includes('pengiriman'));
            const insertIndex = qcIndex !== -1 ? qcIndex : (deliveryIndex !== -1 ? deliveryIndex : next.length);
            next.splice(insertIndex, 0, stageName);
            setStages(next);
        }
    };

    const applyPreset = (presetStages: string[]) => {
        setStages([...presetStages]);
    };

    const handleConfirm = () => {
        if (submitting) return;
        setSubmitting(true);

        const targetUrl = submitUrl || `/c/${slug}/items/${item.id}/drafter-status`;
        const payload: Record<string, any> = {
            required_stages: stages,
        };
        if (!submitUrl) {
            payload.drafter_status = 'APPROVED';
        }

        router.post(targetUrl, payload, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setSubmitting(false);
                onClose();
            },
        });
    };

    const modalTitle = title || (language === 'en' ? '📐 Technical Onboarding & Routing' : '📐 Setup & Verifikasi Rute Produksi');
    const confirmText = actionLabel || (submitting ? '...' : (language === 'en' ? 'Approve & Release to Floor' : 'Approve & Rilis ke Lantai'));

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            subtitle={`${item.item_name} • ${item.target_qty} pcs • ${item.item_type}`}
            size="lg"
            zIndex={100}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid var(--color-pg-primary-glow)',
                    fontSize: '12px',
                    color: 'var(--color-pg-text-secondary)',
                    lineHeight: 1.5,
                }}>
                    💡 {language === 'en'
                        ? 'Confirm or adjust the production sequence before releasing to the floor. Standard envelope (Design, Material, QC, Delivery) is preserved automatically.'
                        : 'Pastikan urutan pengerjaan mesin sudah tepat sebelum dirilis ke operator lantai. Amplop wajib (Gambar, Material, QC, Delivery) terjaga otomatis.'}
                </div>

                {/* Preset Buttons */}
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-pg-text-secondary)', marginBottom: '8px' }}>
                        {language === 'en' ? 'Quick Routing Presets' : 'Template Rute Cepat'}
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {PRESETS.map((p, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => applyPreset(p.stages)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    backgroundColor: 'var(--color-pg-card-hover)',
                                    border: '1px solid var(--color-pg-border)',
                                    color: 'var(--color-pg-text)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {language === 'en' ? p.nameEn : p.nameId}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active Routing Pipeline Preview */}
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-pg-text-secondary)', marginBottom: '8px' }}>
                        {language === 'en' ? 'Active Production Sequence' : 'Urutan Alur Produksi Aktif'}
                    </label>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 12px',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: '10px',
                        border: '1px solid var(--color-pg-border)',
                    }}>
                        {stages.map((st, i) => (
                            <React.Fragment key={st}>
                                {i > 0 && <span style={{ color: 'var(--color-pg-text-muted)', fontSize: '11px' }}>➔</span>}
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    backgroundColor: st.toLowerCase().includes('design') ? 'var(--color-pg-success-glow)' : 'var(--color-pg-surface)',
                                    color: st.toLowerCase().includes('design') ? 'var(--color-pg-success)' : 'var(--color-pg-text)',
                                    border: '1px solid var(--color-pg-border)',
                                }}>
                                    {st}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Toggle Production Steps */}
                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-pg-text-secondary)', marginBottom: '8px' }}>
                        {language === 'en' ? 'Toggle Production Steps' : 'Pilih Tahapan Mesin / Proses'}
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {AVAILABLE_PRODUCTION_STAGES.map((s) => {
                            const isSelected = stages.includes(s.key);
                            return (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => toggleProductionStage(s.key)}
                                    style={{
                                        padding: '7px 12px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        border: isSelected ? '1px solid #3b82f6' : '1px solid var(--color-pg-border)',
                                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                        color: isSelected ? '#60a5fa' : 'var(--color-pg-text-secondary)',
                                    }}
                                >
                                    {isSelected && <Check size={13} />}
                                    <span>{s.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--color-pg-border)' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '10px',
                            border: '1px solid var(--color-pg-border)',
                            backgroundColor: 'transparent',
                            color: 'var(--color-pg-text-secondary)',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        {language === 'en' ? 'Cancel' : 'Batal'}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={submitting}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: 'var(--color-pg-primary)',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                        }}
                    >
                        <Check size={14} />
                        <span>{confirmText}</span>
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}
