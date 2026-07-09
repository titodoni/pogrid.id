import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ChevronLeft, Plus, Close, Check, Broadcast } from '../../Components/Icons';

interface Props {
    tenant?: {
        company_name: string;
        slug: string;
    };
    auth_user?: {
        id: number;
        name: string;
        username: string | null;
        role: string;
    };
}

const translations = {
    en: {
        back: 'Back to Dashboard',
        title: 'New Purchase Order',
        subtitle: 'Create a purchase order with multiple line items and production stages.',
        po_number: 'PO Number',
        client_po_number: 'Client PO Number',
        client_name: 'Client Name',
        select_client: 'Select client...',
        other_client: 'Other Client...',
        add_client: 'Add Client',
        enter_client_name: 'Enter client name',
        delivery_date: 'Delivery Date',
        urgent: 'Mark as urgent',
        line_items: 'Line Items',
        add_item: 'Add Item',
        remove_item: 'Remove Item',
        item_name: 'Item Name',
        item_type: 'Item Type',
        quantity: 'Quantity',
        stages: 'Production Stages',
        cnc: 'Machining',
        fabrication: 'Fabrication',
        vendor: 'Vendor',
        vendor_name: 'Vendor Name',
        vendor_phone: 'Vendor Phone',
        cancel: 'Cancel',
        submit: 'Submit PO',
        save: 'Save',
        type_manufacture: 'Manufacture',
        type_buyout: 'Buy Out',
        type_service: 'Service',
        err_fill_header: 'Please fill out all PO header fields.',
        err_item_name: 'Please enter a name for Item #{num}.',
        err_select_stage: 'Please select at least one stage for Item "{name}".',
        err_vendor_info: 'Item "{name}" has a Vendor stage. Please provide the vendor name and phone.',
        access_restricted: 'Access Restricted',
        owner_restrict_desc: 'Owners cannot create POs. Please assign an Admin user.',
    },
    id: {
        back: 'Kembali ke Dasbor',
        title: 'Buat PO Baru',
        subtitle: 'Buat purchase order dengan beberapa barang dan tahapan produksi.',
        po_number: 'Nomor PO',
        client_po_number: 'No. PO Klien (Opsional)',
        client_name: 'Nama Klien / Pelanggan',
        select_client: 'Pilih Klien...',
        other_client: 'Klien Lainnya...',
        add_client: 'Tambah Klien Baru',
        enter_client_name: 'Masukkan nama klien',
        delivery_date: 'Tanggal Pengiriman / Deadline',
        urgent: 'Tandai Prioritas Tinggi (Mendesak)',
        line_items: 'Daftar Barang (Line Items)',
        add_item: 'Tambah Barang',
        remove_item: 'Hapus Barang',
        item_name: 'Nama Barang',
        item_type: 'Kategori / Tipe Barang',
        quantity: 'Jumlah (Qty)',
        stages: 'Tahapan Produksi',
        cnc: 'Machining (Bubut/CNC)',
        fabrication: 'Fabrikasi (Fab)',
        vendor: 'Vendor',
        vendor_name: 'Nama Vendor',
        vendor_phone: 'No. Telepon Vendor',
        cancel: 'Batal',
        submit: 'Rilis PO Baru',
        save: 'Simpan',
        type_manufacture: 'Buat Sendiri (Manufacture)',
        type_buyout: 'Beli Jadi (Buy Out)',
        type_service: 'Jasa Maklon (Service)',
        err_fill_header: 'Harap lengkapi semua kolom informasi utama PO.',
        err_item_name: 'Harap isi nama untuk Item #{num}.',
        err_select_stage: 'Harap pilih minimal satu tahapan untuk Item "{name}".',
        err_vendor_info: 'Item "{name}" memiliki tahapan Vendor. Harap isi nama dan nomor telepon vendor.',
        access_restricted: 'Akses Dibatasi',
        owner_restrict_desc: 'Owner tidak dapat membuat PO. Harap tugaskan akun Admin.',
    }
};

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
    backgroundColor: '#090d16',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: '44px',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '6px',
    fontWeight: 600,
};

export default function CreatePo({ tenant, auth_user }: Props) {
    const { errors } = usePage().props;

    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
        }
        return 'en';
    });
    const t = translations[language];

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
    const [items, setItems] = useState<PoItem[]>([
        { item_name: '', item_type: 'MANUFACTURE', target_qty: 1, required_stages: [], vendor_name: '', vendor_phone: '' }
    ]);

    const goBack = () => {
        if (tenant?.slug) {
            router.visit(`/c/${tenant.slug}`);
        }
    };

    const addItem = () => {
        setItems(prev => [...prev, { item_name: '', item_type: 'MANUFACTURE', target_qty: 1, required_stages: [], vendor_name: '', vendor_phone: '' }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!poNumber.trim() || !clientName.trim() || !deliveryDate) {
            alert(t.err_fill_header);
            return;
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.item_name.trim()) {
                alert(t.err_item_name.replace('{num}', String(i + 1)));
                return;
            }
            if (item.required_stages.length === 0) {
                alert(t.err_select_stage.replace('{name}', item.item_name));
                return;
            }
            if (item.required_stages.includes('Vendor')) {
                if (!item.vendor_name?.trim() || !item.vendor_phone?.trim()) {
                    alert(t.err_vendor_info.replace('{name}', item.item_name));
                    return;
                }
            }
        }

        router.post('/pos', {
            po_number: poNumber,
            external_po_number: externalPoNumber,
            client_name: clientName,
            global_deadline: deliveryDate,
            is_urgent: isUrgent,
            items,
        });
    };

    if (auth_user?.role === 'OWNER') {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', maxWidth: '420px', padding: '40px 20px' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 12px 0' }}>{t.access_restricted}</h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' }}>
                        {t.owner_restrict_desc}
                    </p>
                    <button onClick={goBack} style={{ padding: '10px 20px', backgroundColor: '#2563eb', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                        {t.back}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                position: 'sticky',
                top: 0,
                backgroundColor: '#090d16',
                zIndex: 40,
            }}>
                <button onClick={goBack} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#94a3b8',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                }}>
                    <ChevronLeft size={16} />
                    <span>{t.back}</span>
                </button>
                <button type="submit" form="po-form" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    backgroundColor: '#2563eb',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px',
                }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                >
                    <Broadcast size={16} />
                    {t.submit}
                </button>
            </header>

            {/* Form */}
            <form id="po-form" onSubmit={handleSubmit} style={{
                maxWidth: '850px',
                margin: '0 auto',
                padding: '24px 16px 120px',
            }}>
                {/* Title */}
                <div style={{ marginBottom: '28px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>{t.title}</h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{t.subtitle}</p>
                </div>

                {/* Validation errors */}
                {errors && Object.keys(errors).length > 0 && (
                    <div style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                        color: '#ef4444',
                    }}>
                        <h4 style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Validation Error</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {Object.entries(errors).map(([key, val]) => (
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
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
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
                                color: '#60a5fa',
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
                                    color: '#fff',
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
                    </div>
                    <div>
                        <label style={labelStyle}>{t.delivery_date}</label>
                        <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="is_urgent" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#ef4444', cursor: 'pointer' }} />
                        <label htmlFor="is_urgent" style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}>{t.urgent}</label>
                    </div>
                </div>

                {/* Line Items */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#60a5fa', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.line_items}</h3>
                        <button type="button" onClick={addItem} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: 'rgba(96, 165, 250, 0.1)',
                            border: '1px solid rgba(96, 165, 250, 0.2)',
                            color: '#60a5fa',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}>
                            <Plus size={14} /> {t.add_item}
                        </button>
                    </div>

                    {items.map((item, index) => (
                        <div key={index} style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
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
                                    color: '#ef4444',
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

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                gap: '12px',
                                marginBottom: '16px',
                            }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{t.item_name}</label>
                                    <input type="text" value={item.item_name} onChange={(e) => updateItem(index, 'item_name', e.target.value)} required placeholder="e.g. Shaft Steel" style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        backgroundColor: '#090d16',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        fontSize: '13px',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        minHeight: '40px',
                                    }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{t.item_type}</label>
                                    <select value={item.item_type} onChange={(e) => updateItem(index, 'item_type', e.target.value)} style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        backgroundColor: '#090d16',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        fontSize: '13px',
                                        outline: 'none',
                                        minHeight: '40px',
                                    }}>
                                        <option value="MANUFACTURE">{t.type_manufacture}</option>
                                        <option value="BUY_OUT">{t.type_buyout}</option>
                                        <option value="SERVICE">{t.type_service}</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{t.quantity}</label>
                                    <input type="number" min={1} value={item.target_qty} onChange={(e) => updateItem(index, 'target_qty', parseInt(e.target.value) || 1)} style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        backgroundColor: '#090d16',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        fontSize: '13px',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        minHeight: '40px',
                                    }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{t.stages}</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                        {['Machining', 'Fabrication', 'Vendor'].map(stage => {
                                            const stageKey = stage.toLowerCase();
                                            return (
                                                <label key={stage} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#e2e8f0', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={item.required_stages.includes(stage)} onChange={() => {
                                                        const stages = item.required_stages.includes(stage)
                                                            ? item.required_stages.filter(s => s !== stage)
                                                            : [...item.required_stages, stage];
                                                        updateItem(index, 'required_stages', stages);
                                                    }} />
                                                    {stage === 'Machining' ? t.cnc : stage === 'Fabrication' ? t.fabrication : t.vendor}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {item.required_stages.includes('Vendor') && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                    gap: '12px',
                                    paddingTop: '12px',
                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{t.vendor_name}</label>
                                        <input type="text" value={item.vendor_name || ''} onChange={(e) => updateItem(index, 'vendor_name', e.target.value)} placeholder={t.vendor_name} style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            backgroundColor: '#090d16',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            fontSize: '13px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            minHeight: '40px',
                                        }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{t.vendor_phone}</label>
                                        <input type="text" value={item.vendor_phone || ''} onChange={(e) => updateItem(index, 'vendor_phone', e.target.value)} placeholder={t.vendor_phone} style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            backgroundColor: '#090d16',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            fontSize: '13px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            minHeight: '40px',
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
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingTop: '20px',
                }}>
                    <button type="button" onClick={goBack} style={{
                        padding: '10px 20px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#e2e8f0',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}>
                        {t.cancel}
                    </button>
                    <button type="submit" style={{
                        padding: '10px 24px',
                        backgroundColor: '#2563eb',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                    >
                        <Broadcast size={16} /> {t.submit}
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
                backgroundColor: '#0f172a',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                zIndex: 50,
            }}>
                <button type="button" onClick={goBack} style={{
                    flex: 1,
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#e2e8f0',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px',
                }}>
                    {t.cancel}
                </button>
                <button type="submit" form="po-form" style={{
                    flex: 2,
                    padding: '12px 16px',
                    backgroundColor: '#2563eb',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                >
                    <Broadcast size={16} /> {t.submit}
                </button>
            </div>
        </div>
    );
}
