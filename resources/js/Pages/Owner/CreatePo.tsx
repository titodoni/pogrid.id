import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import { ChevronLeft, Plus, Close, Check, Broadcast } from '../../Components/Icons';
import { AppLayout } from '../../Components/AppLayout';
import { useUnsavedChanges } from '../../Hooks/useUnsavedChanges';
import { formatDDMMYYYY } from '../../Utils/date';
import { useTranslation } from "@/i18n/useTranslation";

export interface HistoricalItem {
    client_name: string;
    item_name: string;
    item_type: ItemType;
    target_qty: number;
    required_stages: string[];
    vendor_name?: string | null;
    vendor_phone?: string | null;
}

interface Props {
    tenant?: {
        company_name: string;
        slug: string;
        logo_path?: string | null;
    };
    auth_user?: {
        id: number;
        name: string;
        username: string | null;
        role_name: string;
        role_level: string;
        is_owner: boolean;
    };
    recent_pos?: RecentPo[];
    stage_templates?: { id: number; name: string; description: string | null; stages: string[] }[];
    historical_items?: HistoricalItem[];
}

interface RecentPo {
    id: number;
    po_number: string;
    client_name: string;
    is_urgent: boolean;
    created_at: string | null;
    items: PoItem[];
}

const FULL_PRODUCTION_STAGES = ['Design', 'Material', 'Machining', 'Fabrication', 'Assembly', 'QC', 'Delivery'];

const TEMPLATES: { key: string; labelEn: string; labelId: string; stages: string[] }[] = [
    { key: 'full-prod', labelEn: 'Full Production', labelId: 'Teknik Lengkap', stages: FULL_PRODUCTION_STAGES },
    { key: 'cnc', labelEn: 'CNC Workshop', labelId: 'Bubut/CNC', stages: ['Machining'] },
    { key: 'fab', labelEn: 'Fabrication Workshop', labelId: 'Fabrikasi', stages: ['Fabrication'] },
    { key: 'eng', labelEn: 'Engineering Workshop', labelId: 'Teknik', stages: ['Design', 'Machining'] },
    { key: 'assembly', labelEn: 'Assembly Workshop', labelId: 'Perakitan', stages: ['Machining', 'Fabrication', 'Assembly'] },
    { key: 'finishing', labelEn: 'With Finishing', labelId: '+ Finishing', stages: ['Design', 'Material', 'Machining', 'Fabrication', 'Surface Treatment', 'QC', 'Delivery'] },
    { key: 'procure', labelEn: 'Procurement Only', labelId: 'Pembelian Saja', stages: ['Material', 'Vendor'] },
    { key: 'service', labelEn: 'Service / Design Only', labelId: 'Jasa / Desain Saja', stages: ['Design'] },
];

const ALL_STAGES = ['Design', 'Material', 'Machining', 'Fabrication', 'Assembly', 'Surface Treatment', 'QC', 'Delivery', 'Vendor'];
type ItemType = 'MANUFACTURE' | 'BUY_OUT' | 'SERVICE';

interface PoItem {
    item_name: string;
    item_type: ItemType;
    target_qty: number;
    required_stages: string[];
    vendor_name?: string;
    vendor_phone?: string;
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'var(--color-pg-input)',
    border: '1px solid var(--color-pg-border)',
    borderRadius: '10px',
    color: 'var(--color-pg-text)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: '44px',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    color: 'var(--color-pg-text-secondary)',
    marginBottom: '6px',
    fontWeight: 600,
};

const DRAFT_KEY = 'pogrid_po_draft';

const createDefaultItem = (): PoItem => ({
    item_name: '',
    item_type: 'MANUFACTURE',
    target_qty: 1,
    required_stages: [],
    vendor_name: '',
    vendor_phone: '',
});

const sameStages = (a: string[], b: string[]) =>
    a.length === b.length && b.every(s => a.includes(s));

const toDDMMYYYY = (isoStr: string) => {
    if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
};

const toISO = (dmyStr: string) => {
    const cleaned = dmyStr.replace(/[^\d]/g, '');
    if (cleaned.length === 8) {
        const d = parseInt(cleaned.substring(0, 2), 10);
        const m = parseInt(cleaned.substring(2, 4), 10);
        const y = parseInt(cleaned.substring(4, 8), 10);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
            return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        }
    }
    return '';
};

function DateInputDDMMYYYY({ value, onChange, style }: { value: string; onChange: (val: string) => void; style: React.CSSProperties }) {
    const [displayVal, setDisplayVal] = useState(() => toDDMMYYYY(value));

    useEffect(() => {
        if (value) {
            const expected = toDDMMYYYY(value);
            if (displayVal !== expected && toISO(displayVal) !== value) {
                setDisplayVal(expected);
            }
        } else if (toISO(displayVal) !== '') {
            setDisplayVal('');
        }
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value;
        const digits = input.replace(/\D/g, '');
        let formatted = '';
        if (digits.length > 0) {
            formatted = digits.substring(0, 2);
            if (digits.length >= 3) {
                formatted += '/' + digits.substring(2, 4);
            }
            if (digits.length >= 5) {
                formatted += '/' + digits.substring(4, 8);
            }
        }
        setDisplayVal(formatted);

        if (digits.length === 8) {
            const iso = toISO(formatted);
            if (iso) {
                onChange(iso);
            } else {
                onChange('');
            }
        } else if (digits.length === 0) {
            onChange('');
        }
    };

    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
                type="text"
                value={displayVal}
                onChange={handleTextChange}
                placeholder="DD/MM/YYYY"
                maxLength={10}
                required
                style={{ ...style, width: '100%', paddingRight: '44px' }}
            />
            <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center', cursor: 'pointer', height: '100%' }}>
                <input
                    type="date"
                    value={value || ''}
                    onChange={(e) => {
                        const newIso = e.target.value;
                        if (newIso) {
                            onChange(newIso);
                            setDisplayVal(toDDMMYYYY(newIso));
                        }
                    }}
                    style={{
                        opacity: 0,
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer',
                        zIndex: 2,
                    }}
                    title="Pilih dari Kalender"
                />
                <span style={{ fontSize: '18px', zIndex: 1 }}>📅</span>
            </div>
        </div>
    );
}

function ItemNameAutocomplete({
    value,
    clientName,
    historicalItems = [],
    onChange,
    onSelectMemory,
    placeholder = 'e.g. Shaft Arm',
}: {
    value: string;
    clientName: string;
    historicalItems?: HistoricalItem[];
    onChange: (val: string) => void;
    onSelectMemory: (item: HistoricalItem) => void;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const filtered = React.useMemo(() => {
        if (!open) return [];
        const q = (value || '').toLowerCase().trim();
        const clientMatches = historicalItems.filter(h =>
            clientName && h.client_name && h.client_name.toLowerCase() === clientName.toLowerCase()
        );
        const pool = clientMatches.length > 0 ? clientMatches : historicalItems;
        if (!q) return pool.slice(0, 4);
        return pool.filter(h => h.item_name.toLowerCase().includes(q)).slice(0, 6);
    }, [value, open, clientName, historicalItems]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <input
                type="text"
                value={value}
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                required
                placeholder={placeholder}
                style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'var(--color-pg-input)',
                    border: '1px solid var(--color-pg-border)',
                    borderRadius: '10px',
                    color: 'var(--color-pg-text)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: '42px',
                }}
            />
            {open && filtered.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    marginTop: '4px',
                    backgroundColor: 'var(--color-pg-surface)',
                    border: '1px solid var(--color-pg-border)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '4px',
                }}>
                    <div style={{ padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--color-pg-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        🧠 Riwayat Part Klien ({filtered.length})
                    </div>
                    {filtered.map((hist, i) => (
                        <div
                            key={i}
                            onMouseDown={() => {
                                onSelectMemory(hist);
                                setOpen(false);
                            }}
                            style={{
                                padding: '8px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-pg-card-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-pg-text)' }}>
                                    {hist.item_name}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--color-pg-accent)', fontWeight: 600 }}>
                                    {hist.target_qty} pcs • {hist.item_type}
                                </span>
                            </div>
                            {hist.required_stages && hist.required_stages.length > 0 && (
                                <div style={{ fontSize: '11px', color: 'var(--color-pg-text-muted)', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    <span>Alur:</span>
                                    <span style={{ color: 'var(--color-pg-primary-hover)' }}>
                                        {hist.required_stages.join(' ➔ ')}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function CreatePo({ tenant, auth_user, recent_pos = [], stage_templates = [], historical_items = [] }: Props) {
    const { t, language, changeLanguage } = useTranslation('Owner_CreatePo');
    const { errors } = usePage().props;

    const [localError, setLocalError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [repeatNotice, setRepeatNotice] = useState<string | null>(null);
    const [clients, setClients] = useState<string[]>([
        'PT Astra Otoparts',
        'PT Epson Indonesia',  
        'PT Toyota Motor Manufacturing',
        'PT Honda Prospect Motor',
        'PT Panasonic Manufacturing',
    ]);
    const [showAddClient, setShowAddClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');

    const [poNumber, setPoNumber] = useState('');
    const [externalPoNumber, setExternalPoNumber] = useState('');
    const [clientName, setClientName] = useState('');
    const [isCustomClient, setIsCustomClient] = useState(false);
    const [deliveryDate, setDeliveryDate] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);
    const [items, setItems] = useState<PoItem[]>(() => [createDefaultItem()]);
    const [draftRestored, setDraftRestored] = useState(false);
    const [customizingStages, setCustomizingStages] = useState<Record<number, boolean>>({});

    const toggleCustomizingStages = (index: number) => {
        setCustomizingStages(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const hasUnsavedData =
        poNumber.trim() !== '' ||
        externalPoNumber.trim() !== '' ||
        clientName.trim() !== '' ||
        deliveryDate !== '' ||
        isUrgent ||
        items.some(item =>
            item.item_name.trim() !== '' ||
            !sameStages(item.required_stages, FULL_PRODUCTION_STAGES) ||
            item.target_qty !== 1 ||
            (item.vendor_name?.trim() ?? '') !== '' ||
            (item.vendor_phone?.trim() ?? '') !== ''
        );

    useUnsavedChanges(hasUnsavedData);

    useEffect(() => {
        const draft = { poNumber, externalPoNumber, clientName, isCustomClient, deliveryDate, isUrgent, items, clients };
        const timer = setTimeout(() => {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }, 800);
        return () => clearTimeout(timer);
    }, [poNumber, externalPoNumber, clientName, isCustomClient, deliveryDate, isUrgent, items, clients]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                const draft = JSON.parse(raw);
                if (draft.poNumber) setPoNumber(draft.poNumber);
                if (draft.externalPoNumber) setExternalPoNumber(draft.externalPoNumber);
                if (draft.clientName) setClientName(draft.clientName);
                if (draft.isCustomClient !== undefined) setIsCustomClient(draft.isCustomClient);
                if (draft.deliveryDate) setDeliveryDate(draft.deliveryDate);
                if (draft.isUrgent !== undefined) setIsUrgent(draft.isUrgent);
                if (draft.items) setItems(draft.items);
                if (draft.clients) setClients(draft.clients);
                setDraftRestored(true);
            }
        } catch {
            // Invalid draft data, ignore
        }
    }, []);

    const applyRepeatOrder = (poId: string) => {
        if (!poId) return;
        const source = recent_pos.find(p => String(p.id) === poId);
        if (!source) return;
        setClientName(source.client_name);
        if (!clients.includes(source.client_name)) {
            setClients(prev => [...prev, source.client_name]);
        }
        setIsCustomClient(false);
        setIsUrgent(source.is_urgent);
        setItems(source.items.map(item => ({
            item_name: item.item_name,
            item_type: item.item_type,
            target_qty: item.target_qty,
            required_stages: [...(item.required_stages || [])],
            vendor_name: item.vendor_name || '',
            vendor_phone: item.vendor_phone || '',
        })));
        setRepeatNotice(t.repeat_applied.replace('{po}', source.po_number));
    };

    const goBack = () => {
        if (tenant?.slug) {
            router.visit(`/c/${tenant.slug}`);
        }
    };

    const addItem = () => {
        setItems(prev => [...prev, createDefaultItem()]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            
            const updated = { ...item, [field]: value };
            
            // Adjust stages when item_type changes
            if (field === 'item_type') {
                if (value === 'BUY_OUT') {
                    // Buy out cannot have Machining or Fabrication
                    updated.required_stages = item.required_stages.filter(s => s !== 'Machining' && s !== 'Fabrication');
                } else if (value === 'MANUFACTURE') {
                    // Manufacture cannot have Vendor
                    updated.required_stages = item.required_stages.filter(s => s !== 'Vendor');
                }
            }
            
            return updated;
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setLocalError(null);

        if (!poNumber.trim() || !clientName.trim() || !deliveryDate) {
            setLocalError(t.err_fill_header);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const sanitizedItems = items.map(item => {
            let stages = item.required_stages;
            if (!stages || stages.length === 0) {
                if (item.item_type === 'BUY_OUT') {
                    stages = ['Material', 'Vendor', 'QC', 'Delivery'];
                } else if (item.item_type === 'SERVICE') {
                    stages = ['Design'];
                } else {
                    stages = ['Design', 'Material', 'QC', 'Delivery'];
                }
            }
            return { ...item, required_stages: stages };
        });

        for (let i = 0; i < sanitizedItems.length; i++) {
            const item = sanitizedItems[i];
            if (!item.item_name.trim()) {
                setLocalError(t.err_item_name.replace('{num}', String(i + 1)));
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            if (item.required_stages.includes('Vendor')) {
                if (!item.vendor_name?.trim() || !item.vendor_phone?.trim()) {
                    setLocalError(t.err_vendor_info.replace('{name}', item.item_name));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                }
            }
        }

        setSubmitting(true);
        router.post('/pos', {
            po_number: poNumber,
            external_po_number: externalPoNumber,
            client_name: clientName,
            global_deadline: deliveryDate,
            is_urgent: isUrgent,
            // PoItem[] is structurally form-convertible; the inferred literal type
            // is not, so widen at the boundary rather than loosening PoItem.
            items: sanitizedItems as unknown as FormDataConvertible,
        }, {
            onSuccess: () => localStorage.removeItem(DRAFT_KEY),
            onFinish: () => setSubmitting(false),
        });
    };

    if (auth_user?.is_owner) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-pg-bg)', color: 'var(--color-pg-text)', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', maxWidth: '420px', padding: '40px 20px' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 12px 0' }}>{t.access_restricted}</h1>
                    <p style={{ fontSize: '14px', color: 'var(--color-pg-text-muted)', margin: '0 0 24px 0' }}>
                        {t.owner_restrict_desc}
                    </p>
                    <button onClick={goBack} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, var(--color-pg-primary-hover) 0%, var(--color-pg-primary) 100%)', border: 'none', color: '#fff', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px -2px rgba(99, 102, 241, 0.3)' }}>
                        {t.back}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <AppLayout
            activeNav="create-po"
            title={t.page_title}
            subtitle={t.subtitle}
            backUrl="/dashboard"
            actionButton={
                <button
                    type="submit"
                    form="po-form"
                    disabled={submitting}
                    className="h-9 px-4 rounded-[2px] bg-[var(--color-pg-primary)] text-[var(--color-pg-primary-ink)] font-bold text-xs flex items-center gap-1.5 hover:brightness-110 transition-all disabled:opacity-50"
                >
                    <Broadcast size={15} />
                    <span>{submitting ? '...' : t.submit}</span>
                </button>
            }
        >
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">


            {/* Form */}
            <form id="po-form" onSubmit={handleSubmit} style={{
                maxWidth: '850px',
                margin: '0 auto',
                padding: '24px 16px 120px',
            }}>
                {/* Title */}
                <div style={{ marginBottom: '28px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>{t.title}</h1>
                    <p style={{ fontSize: '14px', color: 'var(--color-pg-text-muted)', margin: 0 }}>{t.subtitle}</p>
                </div>

                {/* Draft restored indicator */}
                {draftRestored && (
                    <div style={{
                        backgroundColor: 'rgba(52, 211, 153, 0.1)',
                        border: '1px solid rgba(52, 211, 153, 0.2)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span style={{ color: 'var(--color-pg-success)', fontSize: '14px', fontWeight: 600 }}>
                            {t.draft_restored}
                        </span>
                        <button
                            type="button"
                            onClick={() => setDraftRestored(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-pg-success)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                opacity: 0.7,
                                padding: '4px 8px',
                            }}
                        >
                            {t.draft_dismiss}
                        </button>
                    </div>
                )}

                {/* Repeat order shortcut */}
                {recent_pos.length > 0 && (
                    <div style={{
                        backgroundColor: 'var(--color-pg-primary-glow)',
                        border: '1px solid var(--color-pg-primary-glow)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                    }}>
                        <label style={{ ...labelStyle, color: 'var(--color-pg-primary-hover)' }}>{t.repeat_order}</label>
                        <p style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', margin: '0 0 10px 0' }}>{t.repeat_order_desc}</p>
                        <select
                            defaultValue=""
                            onChange={(e) => applyRepeatOrder(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">{t.select_previous_po}</option>
                            {recent_pos.map(po => (
                                <option key={po.id} value={po.id}>
                                    {po.po_number} — {po.client_name}{po.created_at ? ` (${formatDDMMYYYY(po.created_at + 'T00:00:00')})` : ''}
                                </option>
                            ))}
                        </select>
                        {repeatNotice && (
                            <p style={{ fontSize: '13px', color: 'var(--color-pg-success)', margin: '10px 0 0 0', fontWeight: 600 }}>
                                {repeatNotice}
                            </p>
                        )}
                    </div>
                )}

                {/* Validation errors */}
                {((errors && Object.keys(errors).length > 0) || localError) && (
                    <div style={{
                        backgroundColor: 'rgba(248, 113, 113, 0.12)',
                        border: '1px solid rgba(248, 113, 113, 0.25)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                        color: 'var(--color-pg-danger)',
                    }}>
                        <h4 style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Validation Error</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {localError && <li>{localError}</li>}
                            {errors && Object.entries(errors).map(([key, val]) => (
                                <li key={key}>{val as string}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* PO Header Fields */}
                <div className="po-header-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '16px',
                    marginBottom: '24px',
                    paddingBottom: '24px',
                    borderBottom: '1px solid var(--color-pg-border)',
                }}>
                    <div>
                        <label style={labelStyle}>{t.po_number}</label>
                        <input type="text" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} required placeholder="e.g. PO-INT-042" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>{t.client_po_number}</label>
                        <input type="text" value={externalPoNumber} onChange={(e) => setExternalPoNumber(e.target.value)} placeholder="e.g. PO-EXT-99" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>{t.client_name}</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                value={isCustomClient ? 'other' : clientName}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'other') {
                                        setIsCustomClient(true);
                                        setClientName('');
                                    } else {
                                        setIsCustomClient(false);
                                        setClientName(val);
                                    }
                                }}
                                required
                                style={{ ...inputStyle, flex: 1 }}
                            >
                                <option value="">{t.select_client}</option>
                                {clients.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                                <option value="other">{t.other_client}</option>
                            </select>
                            <button type="button" onClick={() => setShowAddClient(prev => !prev)} style={{
                                padding: '10px 14px',
                                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                                border: '1px solid rgba(96, 165, 250, 0.2)',
                                color: 'var(--color-pg-accent)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                minHeight: '44px',
                            }}>
                                {t.add_client}
                            </button>
                        </div>
                        {showAddClient && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder={t.enter_client_name} style={{ ...inputStyle, flex: 1 }} />
                                <button type="button" onClick={() => {
                                    if (newClientName.trim()) {
                                        if (!clients.includes(newClientName.trim())) {
                                            setClients(prev => [...prev, newClientName.trim()]);
                                        }
                                        setClientName(newClientName.trim());
                                        setIsCustomClient(false);
                                        setNewClientName('');
                                        setShowAddClient(false);
                                    }
                                }} style={{
                                    padding: '10px 14px',
                                    backgroundColor: '#10b981',
                                    border: 'none',
                                    color: 'var(--color-pg-text)',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    minHeight: '44px',
                                }}>
                                    <Check size={14} /> {t.save}
                                </button>
                            </div>
                        )}
                        {isCustomClient && !showAddClient && (
                            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} required placeholder={t.enter_client_name} style={{ ...inputStyle, marginTop: '8px' }} />
                        )}
                        {clientName && recent_pos.some(p => p.client_name.toLowerCase() === clientName.toLowerCase()) && (
                            <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.12)', border: '1px solid var(--color-pg-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--color-pg-primary-hover)', fontWeight: 600 }}>
                                    ⚡ {language === 'id' ? `Ditemukan PO sebelumnya untuk ${clientName}` : `Found previous POs for ${clientName}`}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const prev = recent_pos.find(p => p.client_name.toLowerCase() === clientName.toLowerCase());
                                        if (prev) applyRepeatOrder(String(prev.id));
                                    }}
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        backgroundColor: 'var(--color-pg-primary)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {language === 'id' ? 'Salin Item PO Terakhir' : 'Copy Last PO Items'}
                                </button>
                            </div>
                        )}
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ ...labelStyle, margin: 0 }}>{t.delivery_date}</label>
                            {deliveryDate && (
                                <span style={{ fontSize: '11px', color: 'var(--color-pg-primary-hover)', fontWeight: 600 }}>
                                    📅 {formatDDMMYYYY(deliveryDate + 'T00:00:00')}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {[
                                { label: language === 'id' ? '+3 Hari' : '+3 Days', days: 3 },
                                { label: language === 'id' ? '+1 Minggu' : '+1 Week', days: 7 },
                                { label: language === 'id' ? '+1 Bulan' : '+1 Month', days: 30 }
                            ].map(preset => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + preset.days);
                                        const year = d.getFullYear();
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const day = String(d.getDate()).padStart(2, '0');
                                        setDeliveryDate(`${year}-${month}-${day}`);
                                    }}
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                        border: '1px solid rgba(99, 102, 241, 0.25)',
                                        color: 'var(--color-pg-primary-hover)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        <DateInputDDMMYYYY value={deliveryDate} onChange={(val) => setDeliveryDate(val)} style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="is_urgent" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#ef4444', cursor: 'pointer' }} />
                        <label htmlFor="is_urgent" style={{ fontSize: '13px', color: 'var(--color-pg-text)', fontWeight: 600, cursor: 'pointer' }}>{t.urgent}</label>
                    </div>
                </div>

                {/* Line Items */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-pg-accent)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.line_items}</h3>
                        <button type="button" onClick={addItem} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            backgroundColor: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid var(--color-pg-primary-glow)',
                            color: 'var(--color-pg-primary-hover)',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}>
                            <Plus size={14} /> {t.add_item}
                        </button>
                    </div>

                    {items.map((item, index) => (
                        <div key={index} style={{
                            backgroundColor: 'var(--color-pg-surface)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '14px',
                            padding: '20px',
                            marginBottom: '12px',
                            position: 'relative',
                        }}>
                            {items.length > 1 && (
                                <button type="button" onClick={() => removeItem(index)} style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: 'var(--color-pg-danger)',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}>
                                    <Close size={12} /> {t.remove_item}
                                </button>
                            )}

                            {/* Row 1: Item Basic Information */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '16px',
                                marginBottom: '22px',
                            }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-pg-text-secondary)', marginBottom: '6px' }}>{t.item_name}</label>
                                    <ItemNameAutocomplete
                                        value={item.item_name}
                                        clientName={clientName}
                                        historicalItems={historical_items}
                                        onChange={(val) => updateItem(index, 'item_name', val)}
                                        onSelectMemory={(hist) => {
                                            updateItem(index, 'item_name', hist.item_name);
                                            if (hist.item_type) updateItem(index, 'item_type', hist.item_type);
                                            if (hist.target_qty) updateItem(index, 'target_qty', hist.target_qty);
                                            if (hist.required_stages && hist.required_stages.length > 0) {
                                                updateItem(index, 'required_stages', hist.required_stages);
                                            }
                                            if (hist.vendor_name) updateItem(index, 'vendor_name', hist.vendor_name);
                                            if (hist.vendor_phone) updateItem(index, 'vendor_phone', hist.vendor_phone);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-pg-text-secondary)', marginBottom: '6px' }}>{t.item_type}</label>
                                    <select value={item.item_type} onChange={(e) => updateItem(index, 'item_type', e.target.value)} style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: 'var(--color-pg-input)',
                                        border: '1px solid var(--color-pg-border)',
                                        borderRadius: '10px',
                                        color: 'var(--color-pg-text)',
                                        fontSize: '13px',
                                        outline: 'none',
                                        minHeight: '42px',
                                    }}>
                                        <option value="MANUFACTURE">{t.type_manufacture}</option>
                                        <option value="BUY_OUT">{t.type_buyout}</option>
                                        <option value="SERVICE">{t.type_service}</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-pg-text-secondary)', marginBottom: '6px' }}>{t.quantity}</label>
                                    <input type="number" min={1} value={item.target_qty} onChange={(e) => updateItem(index, 'target_qty', parseInt(e.target.value) || 1)} style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: 'var(--color-pg-input)',
                                        border: '1px solid var(--color-pg-border)',
                                        borderRadius: '10px',
                                        color: 'var(--color-pg-text)',
                                        fontSize: '13px',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        minHeight: '42px',
                                    }} />
                                </div>
                            </div>

                            {/* Production Process: sleek compact bar by default, expandable drawer on demand */}
                            {(() => {
                                const allTemplates = [...TEMPLATES, ...stage_templates.map(st => ({ key: `tenant-${st.id}`, labelEn: st.name, labelId: st.name, stages: st.stages }))];
                                const hasStages = item.required_stages && item.required_stages.length > 0;
                                const matched = hasStages ? allTemplates.find(tmpl => sameStages(item.required_stages, tmpl.stages)) : null;
                                const matchedKey = matched?.key ?? null;
                                const matchedLabel = matched
                                    ? (language === 'en' ? matched.labelEn : matched.labelId)
                                    : hasStages
                                        ? (language === 'en' ? 'Custom Route' : 'Rute Kustom')
                                        : (language === 'en' ? 'Not Set (Drafter Setup)' : 'Belum Diatur (Drafter Setup)');
                                const isCustomSelection = hasStages && matchedKey === null;
                                const isExpanded = !!customizingStages[index];

                                const isStageDisabled = (stage: string) =>
                                    (item.item_type === 'BUY_OUT' && (stage === 'Machining' || stage === 'Fabrication')) ||
                                    (item.item_type === 'MANUFACTURE' && stage === 'Vendor');
                                const stageLabel = (stage: string) =>
                                    stage === 'Machining' ? t.cnc : stage === 'Fabrication' ? t.fabrication : stage === 'Design' ? t.design : stage === 'Material' ? t.material : stage === 'Assembly' ? t.assembly : stage === 'Surface Treatment' ? t.surface : stage === 'QC' ? t.qc : stage === 'Delivery' ? t.delivery : t.vendor;
                                const toggleStage = (stage: string) => {
                                    if (isStageDisabled(stage)) return;
                                    const stages = item.required_stages.includes(stage)
                                        ? item.required_stages.filter(s => s !== stage)
                                        : [...item.required_stages, stage].sort((a, b) => ALL_STAGES.indexOf(a) - ALL_STAGES.indexOf(b));
                                    updateItem(index, 'required_stages', stages);
                                };

                                return (
                                    <div style={{ marginBottom: item.required_stages.includes('Vendor') ? '16px' : 0 }}>
                                        {/* Compact Routing Summary Strip */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                            gap: '10px',
                                            padding: '10px 14px',
                                            backgroundColor: isExpanded ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)',
                                            border: '1px solid var(--color-pg-border)',
                                            borderRadius: isExpanded ? '12px 12px 0 0' : '10px',
                                            transition: 'all 0.2s ease',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-pg-text-secondary)' }}>
                                                    ⚙️ {language === 'en' ? 'Production Routing:' : 'Alur Produksi:'}
                                                </span>
                                                <span style={{
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    color: hasStages ? '#60a5fa' : 'var(--color-pg-text-muted)',
                                                    backgroundColor: hasStages ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                    padding: '3px 10px',
                                                    borderRadius: '6px',
                                                    border: hasStages ? '1px solid rgba(59, 130, 246, 0.3)' : '1px dashed var(--color-pg-border)',
                                                }}>
                                                    {matchedLabel} {hasStages && `(${item.required_stages.length} ${language === 'en' ? 'stages' : 'tahap'})`}
                                                </span>
                                                <span style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)' }}>
                                                    {hasStages
                                                        ? item.required_stages.map(s => stageLabel(s)).join(' ➔ ')
                                                        : (language === 'en' ? '(Drafter will determine internal steps during drawing approval)' : '(Drafter akan menentukan alur tahapan saat gambar approved)')}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {hasStages && (
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItem(index, 'required_stages', [])}
                                                        title={language === 'en' ? 'Reset to empty (delegate to Drafter)' : 'Kosongkan (serahkan ke Drafter)'}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--color-pg-text-muted)',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            padding: '4px 8px',
                                                        }}
                                                    >
                                                        ✕ {language === 'en' ? 'Clear' : 'Kosongkan'}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCustomizingStages(index)}
                                                    style={{
                                                        background: isExpanded ? 'var(--color-pg-card-hover)' : 'transparent',
                                                        border: '1px solid var(--color-pg-border)',
                                                        borderRadius: '8px',
                                                        padding: '6px 12px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        color: 'var(--color-pg-accent)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                >
                                                    {isExpanded
                                                        ? (language === 'en' ? '▲ Hide Customizer' : '▲ Selesai / Tutup')
                                                        : hasStages
                                                            ? (language === 'en' ? '⚙️ Edit Stages ▾' : '⚙️ Ubah Tahapan ▾')
                                                            : (language === 'en' ? '+ Set Routing (Optional) ▾' : '+ Atur Alur Produksi ▾')}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Customizer Panel */}
                                        {isExpanded && (
                                            <div style={{
                                                padding: '16px',
                                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                                border: '1px solid var(--color-pg-border)',
                                                borderTop: 'none',
                                                borderRadius: '0 0 12px 12px',
                                                animation: 'fadeIn 0.2s ease-in-out',
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-pg-text-secondary)' }}>
                                                        {t.process_title}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: 'var(--color-pg-text-muted)' }}>
                                                        💡 {language === 'en' ? 'Optional setup. Drafter can adjust this sequence during technical drawing approval.' : 'Opsional. Drafter dapat menyesuaikan alur ini saat approval gambar teknis.'}
                                                    </span>
                                                </div>

                                                {/* Step 1: Templates */}
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                                                    {allTemplates.map(tmpl => {
                                                        const isActive = matchedKey === tmpl.key;
                                                        return (
                                                            <button
                                                                key={tmpl.key}
                                                                type="button"
                                                                onClick={() => updateItem(index, 'required_stages', [...tmpl.stages])}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    fontSize: '12px',
                                                                    fontWeight: 600,
                                                                    border: isActive ? '1px solid #3b82f6' : '1px solid var(--color-pg-border)',
                                                                    borderRadius: '999px',
                                                                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'var(--color-pg-surface)',
                                                                    color: isActive ? '#60a5fa' : 'var(--color-pg-text-secondary)',
                                                                    boxShadow: isActive ? '0 0 12px rgba(59, 130, 246, 0.25)' : 'none',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s ease',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                }}
                                                            >
                                                                {language === 'en' ? tmpl.labelEn : tmpl.labelId}
                                                            </button>
                                                        );
                                                    })}
                                                    {isCustomSelection && (
                                                        <span style={{
                                                            padding: '6px 12px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            border: '1px dashed var(--color-pg-accent)',
                                                            borderRadius: '999px',
                                                            color: 'var(--color-pg-accent)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                        }}>
                                                            {t.custom_badge}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Step 2: Ordered pipeline */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                                                    {ALL_STAGES.map((stage, i) => {
                                                        const disabled = isStageDisabled(stage);
                                                        const selected = item.required_stages.includes(stage);
                                                        return (
                                                            <React.Fragment key={stage}>
                                                                {i > 0 && (
                                                                    <span style={{ color: 'var(--color-pg-text-muted)', fontSize: '12px', opacity: 0.6, userSelect: 'none' }}>→</span>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    disabled={disabled}
                                                                    onClick={() => toggleStage(stage)}
                                                                    title={disabled ? t.stage_disabled_hint : undefined}
                                                                    style={{
                                                                        padding: '7px 12px',
                                                                        fontSize: '12px',
                                                                        fontWeight: selected ? 700 : 500,
                                                                        border: selected ? '1px solid rgba(59, 130, 246, 0.6)' : '1px solid var(--color-pg-border)',
                                                                        borderRadius: '8px',
                                                                        backgroundColor: selected ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                                                                        color: disabled ? 'var(--color-pg-text-muted)' : selected ? '#ffffff' : 'var(--color-pg-text-muted)',
                                                                        cursor: disabled ? 'not-allowed' : 'pointer',
                                                                        opacity: disabled ? 0.35 : selected ? 1 : 0.7,
                                                                        transition: 'all 0.15s ease',
                                                                        boxShadow: selected ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none',
                                                                        textDecoration: disabled ? 'line-through' : 'none',
                                                                    }}
                                                                >
                                                                    {stageLabel(stage)}
                                                                </button>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>

                                                {/* Footer: reset */}
                                                {!sameStages(item.required_stages, FULL_PRODUCTION_STAGES) && (
                                                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-pg-border)' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateItem(index, 'required_stages', FULL_PRODUCTION_STAGES.filter(s => !isStageDisabled(s)))}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                padding: 0,
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                color: 'var(--color-pg-accent)',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            ↺ {t.reset_default}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {item.required_stages.includes('Vendor') && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '16px',
                                    marginTop: '20px',
                                    paddingTop: '20px',
                                    borderTop: '1px solid var(--color-pg-border)',
                                }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-pg-text-secondary)', marginBottom: '6px' }}>{t.vendor_name}</label>
                                        <input type="text" value={item.vendor_name || ''} onChange={(e) => updateItem(index, 'vendor_name', e.target.value)} placeholder={t.vendor_name} style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            backgroundColor: 'var(--color-pg-input)',
                                            border: '1px solid var(--color-pg-border)',
                                            borderRadius: '10px',
                                            color: 'var(--color-pg-text)',
                                            fontSize: '13px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            minHeight: '42px',
                                        }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-pg-text-secondary)', marginBottom: '6px' }}>{t.vendor_phone}</label>
                                        <input type="text" value={item.vendor_phone || ''} onChange={(e) => updateItem(index, 'vendor_phone', e.target.value)} placeholder={t.vendor_phone} style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            backgroundColor: 'var(--color-pg-input)',
                                            border: '1px solid var(--color-pg-border)',
                                            borderRadius: '10px',
                                            color: 'var(--color-pg-text)',
                                            fontSize: '13px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            minHeight: '42px',
                                        }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Desktop action buttons (hidden on very small screens via CSS) */}
                <div className="desktop-actions" style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                    borderTop: '1px solid var(--color-pg-border)',
                    paddingTop: '20px',
                }}>
                    <button type="button" onClick={goBack} style={{
                        padding: '10px 20px',
                        backgroundColor: 'var(--color-pg-border-subtle)',
                        border: '1px solid var(--color-pg-border)',
                        color: '#e2e8f0',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}>
                        {t.cancel}
                    </button>
                    <button type="submit" disabled={submitting} style={{
                        padding: '10px 24px',
                        backgroundColor: submitting ? '#1d4ed8' : '#2563eb',
                        border: 'none',
                        color: 'var(--color-pg-text)',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: submitting ? 0.7 : 1,
                    }}
                        onMouseOver={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                        onMouseOut={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = '#2563eb'; }}
                    >
                        <Broadcast size={16} /> {submitting ? '...' : t.submit}
                    </button>
                </div>
            </form>

            {/* Mobile sticky bottom action bar */}
            <div className="mobile-actions" style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                gap: '12px',
                padding: '16px',
                backgroundColor: 'var(--color-pg-surface)',
                borderTop: '1px solid var(--color-pg-border)',
                zIndex: 50,
            }}>
                <button type="button" onClick={goBack} style={{
                    flex: 1,
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-pg-border-subtle)',
                    border: '1px solid var(--color-pg-border)',
                    color: '#e2e8f0',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px',
                }}>
                    {t.cancel}
                </button>
                <button type="submit" form="po-form" disabled={submitting} style={{
                    flex: 2,
                    padding: '12px 16px',
                    backgroundColor: submitting ? '#1d4ed8' : '#2563eb',
                    border: 'none',
                    color: 'var(--color-pg-text)',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: submitting ? 0.7 : 1,
                }}
                    onMouseOver={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                    onMouseOut={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = '#2563eb'; }}
                >
                    <Broadcast size={16} /> {submitting ? '...' : t.submit}
                </button>
            </div>
            </div>
        </AppLayout>
    );
}
