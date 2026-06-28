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
}

interface Po {
    id: number;
    po_number: string;
    client_name: string;
    global_deadline: string;
    status: string;
    items: Item[];
}

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

interface Props {
    pos: Po[];
    alerts: Alert[];
    deliveryOrders: DeliveryOrder[];
    invoices: Invoice[];
}

export default function OwnerDashboard({ pos, alerts, deliveryOrders, invoices }: Props) {
    const { errors } = usePage().props;

    const [activeTab, setActiveTab] = useState<'pos' | 'dos' | 'invoices'>('pos');
    
    // Delivery Order creation state
    const [selectedPoId, setSelectedPoId] = useState<number | ''>('');
    const [doNumber, setDoNumber] = useState('');
    const [doDeliveryDate, setDoDeliveryDate] = useState('');
    const [doItemsQuantities, setDoItemsQuantities] = useState<Record<number, number>>({});

    // Invoice creation state
    const [selectedDoId, setSelectedDoId] = useState<number | ''>('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDueDate, setInvoiceDueDate] = useState('');

    const handleCancel = (itemId: number) => {
        if (confirm('Are you sure you want to cancel this item?')) {
            router.post(`/items/${itemId}/cancel`);
        }
    };

    const handleTerminate = (itemId: number) => {
        if (confirm('⚠️ WARNING: This will immediately HALT all floor operator operations for this item and spawn a Sunk-Cost invoice. Proceed?')) {
            router.post(`/items/${itemId}/terminate`);
        }
    };

    const handlePoChange = (poId: number | '') => {
        setSelectedPoId(poId);
        if (poId === '') {
            setDoItemsQuantities({});
            return;
        }
        const selectedPo = pos.find(p => p.id === poId);
        if (selectedPo) {
            const initialQuantities: Record<number, number> = {};
            selectedPo.items.forEach(item => {
                const remaining = item.target_qty - (item.delivered_qty || 0);
                initialQuantities[item.id] = remaining > 0 ? remaining : 0;
            });
            setDoItemsQuantities(initialQuantities);
        }
    };

    const handleQtyChange = (itemId: number, value: number, maxVal: number) => {
        const qty = Math.max(0, Math.min(maxVal, value));
        setDoItemsQuantities(prev => ({
            ...prev,
            [itemId]: qty
        }));
    };

    const submitDeliveryOrder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPoId) return;

        const items = Object.entries(doItemsQuantities)
            .map(([itemId, qty]) => ({
                item_id: parseInt(itemId, 10),
                delivered_qty: qty
            }))
            .filter(item => item.delivered_qty > 0);

        if (items.length === 0) {
            alert('Please specify delivered quantity for at least one item.');
            return;
        }

        router.post('/delivery-orders', {
            po_id: selectedPoId,
            do_number: doNumber,
            delivery_date: doDeliveryDate,
            items: items
        }, {
            onSuccess: () => {
                setSelectedPoId('');
                setDoNumber('');
                setDoDeliveryDate('');
                setDoItemsQuantities({});
                setActiveTab('dos');
            }
        });
    };

    const submitInvoice = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDoId) return;

        router.post('/invoices', {
            delivery_order_id: selectedDoId,
            invoice_number: invoiceNumber,
            due_date: invoiceDueDate
        }, {
            onSuccess: () => {
                setSelectedDoId('');
                setInvoiceNumber('');
                setInvoiceDueDate('');
                setActiveTab('invoices');
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
                    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Owner Command Center</h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Real-time production monitoring & risk guardrail</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
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
                            fontSize: '14px'
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

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
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
                    Production Progress & POs
                </button>
                <button
                    onClick={() => setActiveTab('dos')}
                    style={{
                        padding: '12px 20px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'dos' ? '2px solid #2563eb' : 'none',
                        color: activeTab === 'dos' ? '#3b82f6' : '#64748b',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '15px',
                        transition: 'all 0.15s'
                    }}
                >
                    Delivery Orders (DO)
                </button>
                <button
                    onClick={() => setActiveTab('invoices')}
                    style={{
                        padding: '12px 20px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'invoices' ? '2px solid #2563eb' : 'none',
                        color: activeTab === 'invoices' ? '#3b82f6' : '#64748b',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '15px',
                        transition: 'all 0.15s'
                    }}
                >
                    Invoices & PDF Billing
                </button>
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
                                {alerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        style={{
                                            backgroundColor: alert.severity === 'RED' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(234, 179, 8, 0.08)',
                                            border: '1px solid',
                                            borderColor: alert.severity === 'RED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
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
                                            backgroundColor: alert.severity === 'RED' ? '#ef4444' : '#eab308',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                        }}>
                                            {alert.severity}
                                        </span>
                                        <div style={{ fontSize: '14px', color: '#e2e8f0', flexGrow: 1 }}>{alert.message}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* PO Grid Section */}
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Purchase Order (PO) Directory</h2>
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
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                        paddingBottom: '16px',
                                        marginBottom: '20px'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{po.po_number}</h3>
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
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>Client: {po.client_name}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>DEADLINE</div>
                                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>{new Date(po.global_deadline).toLocaleDateString()}</div>
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
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontSize: '15px', fontWeight: 700 }}>{item.item_name}</span>
                                                                    <span style={{
                                                                        fontSize: '10px',
                                                                        backgroundColor: 'rgba(255,255,255,0.06)',
                                                                        padding: '2px 6px',
                                                                        borderRadius: '4px',
                                                                        color: '#94a3b8'
                                                                    }}>
                                                                        {item.item_type}
                                                                    </span>
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                                    Target Qty: {item.target_qty} pcs | Delivered: {item.delivered_qty || 0} pcs
                                                                </div>
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

            {activeTab === 'dos' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
                    {/* List DOs */}
                    <div style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '24px'
                    }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Delivery Orders (DO)</h2>
                        {deliveryOrders.length === 0 ? (
                            <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No Delivery Orders generated yet.</p>
                        ) : (
                            deliveryOrders.map(doOrder => (
                                <div key={doOrder.id} style={{
                                    backgroundColor: '#0f172a',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div>
                                            <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{doOrder.do_number}</h4>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                PO: {doOrder.po?.po_number} ({doOrder.po?.client_name})
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                                            Date: {new Date(doOrder.delivery_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{
                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                        paddingTop: '10px'
                                    }}>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>DELIVERED ITEMS</div>
                                        {doOrder.do_items.map(item => (
                                            <div key={item.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '13px',
                                                color: '#e2e8f0',
                                                padding: '3px 0'
                                            }}>
                                                <span>{item.item?.item_name}</span>
                                                <span style={{ fontWeight: 600 }}>{item.delivered_qty} pcs</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Create DO Form */}
                    <div style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '24px',
                        height: 'fit-content'
                    }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Create Delivery Order</h2>
                        <form onSubmit={submitDeliveryOrder}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Select Purchase Order (PO)</label>
                                <select
                                    value={selectedPoId}
                                    onChange={(e) => handlePoChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        backgroundColor: '#090d16',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">-- Choose PO --</option>
                                    {pos.filter(p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED').map(po => (
                                        <option key={po.id} value={po.id}>{po.po_number} - {po.client_name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedPoId && (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>DO Number</label>
                                        <input
                                            type="text"
                                            value={doNumber}
                                            onChange={(e) => setDoNumber(e.target.value)}
                                            required
                                            placeholder="e.g. DO-2026-001"
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                backgroundColor: '#090d16',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Delivery Date</label>
                                        <input
                                            type="date"
                                            value={doDeliveryDate}
                                            onChange={(e) => setDoDeliveryDate(e.target.value)}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                backgroundColor: '#090d16',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                                        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px', fontWeight: 600 }}>Specify Quantities to Deliver</div>
                                        {pos.find(p => p.id === selectedPoId)?.items.map(item => {
                                            const previouslyDelivered = item.delivered_qty || 0;
                                            const remaining = item.target_qty - previouslyDelivered;

                                            return (
                                                <div key={item.id} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '8px 0',
                                                    borderBottom: '1px solid rgba(255,255,255,0.02)'
                                                }}>
                                                    <div style={{ flexGrow: 1, marginRight: '16px' }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.item_name}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                            Target: {item.target_qty} | Remaining: {remaining}
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={doItemsQuantities[item.id] || 0}
                                                        onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value, 10) || 0, remaining)}
                                                        min="0"
                                                        max={remaining}
                                                        disabled={remaining <= 0}
                                                        style={{
                                                            width: '80px',
                                                            padding: '8px 10px',
                                                            backgroundColor: '#090d16',
                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                            borderRadius: '6px',
                                                            color: '#fff',
                                                            textAlign: 'center',
                                                            fontSize: '14px'
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="submit"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: '#2563eb',
                                            color: '#fff',
                                            fontWeight: 600,
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        Create DO
                                    </button>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'invoices' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
                    {/* List Invoices */}
                    <div style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '24px'
                    }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Invoices</h2>
                        {invoices.length === 0 ? (
                            <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No Invoices generated yet.</p>
                        ) : (
                            invoices.map(invoice => (
                                <div key={invoice.id} style={{
                                    backgroundColor: '#0f172a',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{invoice.invoice_number}</h4>
                                                <span style={{
                                                    fontSize: '9px',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: 800,
                                                    backgroundColor: invoice.invoice_type === 'SUNK_COST' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                    color: invoice.invoice_type === 'SUNK_COST' ? '#f59e0b' : '#3b82f6'
                                                }}>
                                                    {invoice.invoice_type === 'SUNK_COST' ? 'SUNK COST' : 'STANDARD'}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                {invoice.invoice_type === 'SUNK_COST' ? 'Midway termination compensation' : `DO: ${invoice.delivery_order?.do_number} (${invoice.delivery_order?.po?.client_name})`}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                backgroundColor: invoice.status === 'PAID' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: invoice.status === 'PAID' ? '#10b981' : '#ef4444'
                                            }}>
                                                {invoice.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                        paddingTop: '12px',
                                        marginTop: '12px'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>TOTAL AMOUNT</div>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9' }}>
                                                IDR {parseFloat(invoice.total_amount).toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
                                                <div>Due: {new Date(invoice.due_date).toLocaleDateString()}</div>
                                            </div>
                                            <a
                                                href={`/invoices/${invoice.id}/pdf`}
                                                style={{
                                                    padding: '8px 14px',
                                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    color: '#f8fafc',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    textDecoration: 'none',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                📥 PDF
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Generate Standard Invoice Form */}
                    <div style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '24px',
                        height: 'fit-content'
                    }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Generate Standard Invoice</h2>
                        
                        {deliveryOrders.length === 0 ? (
                            <div style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                borderRadius: '12px',
                                padding: '16px',
                                color: '#ef4444',
                                fontSize: '14px',
                                fontWeight: 500
                            }}>
                                ⚠️ Invoice generation is completely blocked unless at least one DO exists. Please create a Delivery Order first.
                            </div>
                        ) : (
                            <form onSubmit={submitInvoice}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Select Delivery Order (DO)</label>
                                    <select
                                        value={selectedDoId}
                                        onChange={(e) => setSelectedDoId(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            backgroundColor: '#090d16',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value="">-- Choose DO --</option>
                                        {deliveryOrders.map(doOrder => (
                                            <option key={doOrder.id} value={doOrder.id}>{doOrder.do_number} (PO: {doOrder.po?.po_number})</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Invoice Number</label>
                                    <input
                                        type="text"
                                        value={invoiceNumber}
                                        onChange={(e) => setInvoiceNumber(e.target.value)}
                                        required
                                        placeholder="e.g. INV-2026-001"
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            backgroundColor: '#090d16',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Due Date</label>
                                    <input
                                        type="date"
                                        value={invoiceDueDate}
                                        onChange={(e) => setInvoiceDueDate(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            backgroundColor: '#090d16',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#2563eb',
                                        color: '#fff',
                                        fontWeight: 600,
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    Generate Invoice
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
