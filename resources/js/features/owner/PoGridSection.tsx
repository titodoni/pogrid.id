import React from 'react';
import { ChevronDown, Copy, Stop } from '../../Components/Icons';
import { StatusBadge } from '../../Components/StatusBadge';
import { WarningPill } from '../../Components/WarningPill';
import ProgressBar from '../../Components/ProgressBar';
import PillFilter from '../../Components/PillFilter';
import { calculateDeadlineDiff, formatDeadline } from '../../Utils/deadline';

/**
 * PO Grid section (Active + Completed tabs) — extracted verbatim from
 * Owner/Dashboard.tsx. All state/handlers arrive via props; business
 * formulas stay in the page-level helpers passed in.
 */
export default function PoGridSection({
    activeTab,
    filteredPos,
    activePoFilter,
    setActivePoFilter,
    expandedPOs,
    expandedItems,
    togglePO,
    toggleItem,
    language,
    t,
    alerts,
    telemetry,
    workflow,
    isOwner,
    handleCancel,
    handleTerminate,
    renderStatusBadge,
    getItemStateColor,
    getPieceLocations,
    calculateDynamicETA,
    formatAlertTime,
    copyItemStatusToClipboard,
    copiedItemId,
}: any) {
    return (<>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{t.po_directory}</h2>
                    </div>
                    {activeTab === 'active' && (
<PillFilter
                                options={[
                                    { value: 'all', label: <><span className="filter-label-full">{language === 'id' ? 'Semua PO (Default)' : 'All POs (Default)'}</span><span className="filter-label-short">{language === 'id' ? 'Semua' : 'All'}</span></> },
                                    { value: 'marked', label: <><span className="filter-label-full">{language === 'id' ? 'Ditandai (Rework/Kendala)' : 'Marked (Rework / Trouble)'}</span><span className="filter-label-short">{language === 'id' ? 'Ditandai' : 'Marked'}</span></> },
                                    { value: 'delayed', label: <><span className="filter-label-full">{language === 'id' ? 'Terlambat' : 'Delayed'}</span><span className="filter-label-short">{language === 'id' ? 'Terlambat' : 'Delayed'}</span></> },
                                    { value: 'ontime', label: <><span className="filter-label-full">{language === 'id' ? 'Tepat Waktu' : 'On Time'}</span><span className="filter-label-short">{language === 'id' ? 'Tepat Waktu' : 'On Time'}</span></> },
                                    { value: 'close_due', label: <><span className="filter-label-full">{language === 'id' ? 'Mendekati Deadline' : 'Close Due Date'}</span><span className="filter-label-short">{language === 'id' ? 'Mendekati' : 'Near Due'}</span></> },
                                ]}
                                value={activePoFilter}
                                onChange={setActivePoFilter}
                                className="po-filter-row"
                                style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}
                            />
                    )}
                    {filteredPos.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-pg-text-muted)' }}>
                            {activeTab === 'completed' ? 'No completed POs yet.' : t.no_pos}
                        </div>
                    ) : (
                        <div>
                            {/* Compact summary strip for mobile */}
                            <div style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', marginBottom: '12px', padding: '0 4px' }}>
                                {filteredPos.length} PO{filteredPos.length > 1 ? 's' : ''} &middot; {filteredPos.reduce((sum, po) => sum + po.items.length, 0)} items
                            </div>
                            {filteredPos.map((po) => {
                                const isExpanded = expandedPOs.has(po.id);
                                const poProgress = po.items.length > 0
                                    ? Math.round(po.items.reduce((sum, item) => sum + parseFloat(item.progress_percent), 0) / po.items.length)
                                    : 0;
                                return (
                                    <div key={po.id} id={`po-card-${po.id}`} className="po-accordion">
                                        <button className="po-accordion-header" onClick={() => togglePO(po.id)}>
                                            <ChevronDown size={16} expanded={isExpanded} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-pg-text)' }}>{po.client_name}</span>
                                                    <StatusBadge status={po.status} />
                                                    {po.is_urgent && <StatusBadge status="URGENT" />}
                                                    {(() => {
                                                        const poItemIds = po.items.map(i => i.id);
                                                        const poAlerts = alerts.filter(a => poItemIds.includes(a.item_id) && !a.is_resolved);
                                                        const hasRework = poAlerts.some(a => a.severity === 'YELLOW');
                                                        return <WarningPill deadlineDateStr={po.global_deadline} reworkMessage={hasRework} lang={language} />;
                                                    })()}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginTop: '3px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                                                    <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-pg-text-muted)' }}>{po.po_number}</span>
                                                    <span style={{ color: 'var(--color-pg-border)' }}>&middot;</span>
                                                    <span style={{ fontSize: '12px', fontWeight: 500 }}>{formatDeadline(po.global_deadline, language)}</span>
                                                    {!isExpanded && po.items.length > 0 && (
                                                        <>
                                                            <span style={{ color: 'var(--color-pg-border)' }}>&middot;</span>
                                                            <span style={{ color: '#3b82f6', fontWeight: 500 }}>
                                                                {po.items.length} item{po.items.length > 1 ? 's' : ''} &middot; {poProgress}%
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="po-accordion-body">
                                                {po.items.length === 0 ? (
                                                    <div style={{ fontSize: '14px', color: 'var(--color-pg-text-muted)', padding: '12px 0' }}>No items in this PO.</div>
                                                ) : (
                                                    po.items.map((item) => {
                                                        const progress = parseFloat(item.progress_percent);
                                                        const hasProgress = progress > 0;
                                                        const isCancelled = item.status === 'CANCELLED';
                                                        const isTerminated = item.status === 'TERMINATED';
                                                        const itemExpanded = expandedItems.has(item.id);

                                                        const itemAlerts = alerts.filter(a => a.item_id === item.id && !a.is_resolved);
                                                        const hasRework = itemAlerts.some(a => a.severity === 'YELLOW');
                                                        const sc = getItemStateColor(po.global_deadline, hasRework, item.status);

                                                        return (
                                                            <div 
                                                                key={item.id} 
                                                                id={`item-card-${item.id}`} 
                                                                className="item-compact" 
                                                                style={{
                                                                    opacity: (isCancelled || isTerminated) ? 0.6 : 1,
                                                                    borderLeft: '3px solid ' + sc.border,
                                                                    backgroundColor: sc.bg,
                                                                    boxShadow: sc.glow !== 'transparent' ? '0 0 12px ' + sc.glow : 'none',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    marginBottom: '8px',
                                                                    borderRadius: '12px',
                                                                    border: '1px solid var(--color-pg-border)',
                                                                    overflow: 'hidden'
                                                                }}
                                                            >
                                                                {/* Summary row - Clickable to expand */}
                                                                <button 
                                                                    className="item-compact-summary" 
                                                                    onClick={() => toggleItem(item.id)} 
                                                                    style={{ 
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '12px',
                                                                        width: '100%',
                                                                        padding: '12px 16px',
                                                                        background: 'transparent',
                                                                        border: 'none',
                                                                        color: 'var(--color-pg-text)',
                                                                        cursor: 'pointer',
                                                                        textAlign: 'left'
                                                                    }}
                                                                >
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-pg-text)' }}>{item.item_name}</span>
                                                                            
                                                                            {/* Clean, minimalist primary status badges only */}
                                                                            {renderStatusBadge(
                                                                                item.item_type === 'MANUFACTURE' 
                                                                                    ? (language === 'id' ? 'Produksi' : 'Manufactured') 
                                                                                    : (language === 'id' ? 'Beli Jadi' : 'Buyout'),
                                                                                'var(--color-pg-text-muted)'
                                                                            )}

                                                                            {renderStatusBadge(
                                                                                (() => {
                                                                                    switch (item.status) {
                                                                                        case 'IN_PRODUCTION': return language === 'id' ? 'Proses Produksi' : 'In Production';
                                                                                        case 'IN_PROGRESS': return language === 'id' ? 'Tahap Persiapan' : 'In Progress';
                                                                                        case 'PENDING': return language === 'id' ? 'Belum Mulai' : 'Pending';
                                                                                        case 'COMPLETED': return language === 'id' ? 'Selesai' : 'Completed';
                                                                                        case 'CANCELLED': return language === 'id' ? 'Dibatalkan' : 'Cancelled';
                                                                                        case 'TERMINATED': return language === 'id' ? 'Dihentikan' : 'Terminated';
                                                                                        case 'DELIVERED': return language === 'id' ? 'Terkirim' : 'Delivered';
                                                                                        case 'CLOSED': return language === 'id' ? 'Selesai & Lunas' : 'Closed';
                                                                                        default: return item.status;
                                                                                    }
                                                                                })(),
                                                                                isCancelled ? 'var(--color-pg-danger)'
                                                                                    : isTerminated ? 'var(--color-pg-danger)'
                                                                                    : progress >= 100 ? 'var(--color-pg-success)' : '#3b82f6'
                                                                            )}

                                                                            {(() => {
                                                                                const reworkAlert = itemAlerts.find(a => a.severity === 'YELLOW');
                                                                                const reworkVal = reworkAlert ? (reworkAlert.message || true) : null;
                                                                                return <WarningPill deadlineDateStr={po.global_deadline} reworkMessage={reworkVal} lang={language} />;
                                                                            })()}
                                                                        </div>
                                                                    </div>

                                                                    <div className="progress-bar-mini" style={{ maxWidth: '100px', flexShrink: 0 }}>
                                                                        <div className="progress-bar-mini-fill" style={{
                                                                            width: `${progress}%`,
                                                                            backgroundColor: isCancelled ? 'var(--color-pg-danger)' : 'var(--color-pg-primary)'
                                                                        }} />
                                                                    </div>

                                                                    <span className="item-pct-label" style={{ 
                                                                        fontSize: '12px', 
                                                                        fontWeight: 700, 
                                                                        color: 'var(--color-pg-primary-hover)',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: '2px',
                                                                        alignItems: 'flex-end',
                                                                        flexShrink: 0
                                                                    }}>
                                                                        <span>{progress.toFixed(0)}%</span>
                                                                        <span style={{ fontSize: '10px', color: 'var(--color-pg-text-muted)', fontWeight: 'normal' }}>
                                                                            ({item.delivered_qty || 0} / {item.target_qty || 0} pcs)
                                                                        </span>
                                                                    </span>

                                                                    <ChevronDown size={14} expanded={itemExpanded} style={{ flexShrink: 0 }} />
                                                                </button>

                                                                {/* Expanded detail section - placed directly inside the main card container, below the summary */}
                                                                {itemExpanded && (
                                                                    <div className="item-compact-detail" style={{ padding: '0 16px 16px' }}>
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'flex-start',
                                                                            flexWrap: 'wrap',
                                                                            gap: '12px',
                                                                            marginBottom: '12px',
                                                                            paddingBottom: '12px',
                                                                            borderBottom: '1px solid var(--color-pg-border)'
                                                                        }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-pg-primary-hover)' }}>
                                                                                    Client: {po.client_name}
                                                                                </div>
                                                                                {(() => {
                                                                                    const { diffDays } = calculateDeadlineDiff(po.global_deadline);
                                                                                    // PO-level risk mirrors the server rule: any active item
                                                                                    // under risk_progress with the deadline inside risk_days.
                                                                                    const minActiveProgress = Math.min(...po.items
                                                                                        .filter(i => !['COMPLETED', 'CANCELLED', 'TERMINATED'].includes(i.status))
                                                                                        .map(i => parseFloat(i.progress_percent)), 100);
                                                                                    let color = 'var(--color-pg-text-secondary)';
                                                                                    let label = '';

                                                                                    if (diffDays < 0) {
                                                                                        color = '#ef4444'; // Delayed: Red
                                                                                        label = language === 'id' ? 'Terlambat' : 'Delayed';
                                                                                    } else if (diffDays <= workflow.deadline.risk_days && minActiveProgress < workflow.deadline.risk_progress) {
                                                                                        color = 'var(--color-pg-warning)'; // Close: Yellow
                                                                                        label = language === 'id' ? 'Mendekati Tenggat' : 'Closing In';
                                                                                    }
                                                                                    
                                                                                    return (
                                                                                        <div style={{ 
                                                                                            fontSize: '13px', 
                                                                                            fontWeight: 600, 
                                                                                            color: 'var(--color-pg-text)',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '6px'
                                                                                        }}>
                                                                                            <span style={{ color: 'var(--color-pg-text-muted)', fontWeight: 'normal' }}>Deadline:</span>
                                                                                            <span style={{ color }}>{formatDeadline(po.global_deadline, language)}</span>
                                                                                            {label && (
                                                                                                <span style={{ 
                                                                                                    fontSize: '9px', 
                                                                                                    padding: '2px 6px', 
                                                                                                    borderRadius: '4px', 
                                                                                                    backgroundColor: `${color}1a`,
                                                                                                    color, 
                                                                                                    border: `1px solid ${color}33`,
                                                                                                    fontWeight: 800,
                                                                                                    textTransform: 'uppercase'
                                                                                                }}>
                                                                                                    {label}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                                <div style={{ fontSize: '12px', fontWeight: 500, color: '#a5b4fc', marginTop: '2px' }}>
                                                                                    Qty: {item.target_qty} pcs {item.delivered_qty > 0 ? `| Delivered: ${item.delivered_qty} pcs` : ''}
                                                                                </div>
                                                                            </div>

                                                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        copyItemStatusToClipboard(item, po, language);
                                                                                    }}
                                                                                    className="btn-status-copy"
                                                                                    style={{
                                                                                        padding: '5px 10px',
                                                                                        backgroundColor: 'var(--color-pg-surface)',
                                                                                        color: '#fff',
                                                                                        border: '1px solid var(--color-pg-border)',
                                                                                        borderRadius: '6px',
                                                                                        cursor: 'pointer',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: 600,
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '4px'
                                                                                    }}
                                                                                >
                                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                                                    </svg>
                                                                                    {copiedItemId === item.id 
                                                                                        ? (language === 'id' ? 'Tersalin!' : 'Copied!') 
                                                                                        : (language === 'id' ? 'Salin Status' : 'Copy Status')}
                                                                                </button>

                                                                                {!isOwner && !isCancelled && !isTerminated && (
                                                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); handleCancel(item.id); }}
                                                                                            disabled={hasProgress}
                                                                                            title={hasProgress ? "Cannot cancel. Progress has started." : ""}
                                                                                            style={{
                                                                                                padding: '5px 10px',
                                                                                                backgroundColor: hasProgress ? 'var(--color-pg-border)' : 'rgba(239, 68, 68, 0.1)',
                                                                                                color: hasProgress ? 'var(--color-pg-text-muted)' : '#ef4444',
                                                                                                border: 'none',
                                                                                                borderRadius: '6px',
                                                                                                cursor: hasProgress ? 'not-allowed' : 'pointer',
                                                                                                fontSize: '11px',
                                                                                                fontWeight: 600,
                                                                                            }}
                                                                                        >
                                                                                            Cancel
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); handleTerminate(item.id); }}
                                                                                            style={{
                                                                                                padding: '5px 10px',
                                                                                                backgroundColor: '#ef4444',
                                                                                                color: '#fff',
                                                                                                border: 'none',
                                                                                                borderRadius: '6px',
                                                                                                cursor: 'pointer',
                                                                                                fontSize: '11px',
                                                                                                fontWeight: 600,
                                                                                                display: 'flex',
                                                                                                alignItems: 'center',
                                                                                                gap: '4px'
                                                                                            }}
                                                                                        >
                                                                                            <Stop size={10} /> HALT
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Secondary Statuses Micro-Dashboard Grid */}
                                                                        <div style={{
                                                                            display: 'grid',
                                                                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                                                            gap: '10px',
                                                                            margin: '12px 0',
                                                                            padding: '12px',
                                                                            backgroundColor: 'var(--color-pg-surface)',
                                                                            border: '1px solid var(--color-pg-border)',
                                                                            borderRadius: '8px'
                                                                        }}>
                                                                            {/* Design / Draft */}
                                                                            {item.drafter_status && (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                                    <span style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                                        {language === 'id' ? 'Gambar/Draft' : 'Design/Draft'}
                                                                                    </span>
                                                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: item.drafter_status === 'APPROVED' ? 'var(--color-pg-success)' : 'var(--color-pg-primary-hover)' }}>
                                                                                        {item.drafter_status === 'APPROVED' ? (language === 'id' ? 'Disetujui' : 'Approved') : item.drafter_status}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            
                                                                            {/* Material Readiness */}
                                                                            {item.purchasing_status && (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                                    <span style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                                        {language === 'id' ? 'Bahan Baku' : 'Material'}
                                                                                    </span>
                                                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: item.purchasing_status === 'READY' ? 'var(--color-pg-success)' : item.purchasing_status === 'PROSES' ? 'var(--color-pg-warning)' : 'var(--color-pg-primary-hover)' }}>
                                                                                        {item.purchasing_status === 'READY' ? (language === 'id' ? 'Siap' : 'Ready') : item.purchasing_status === 'PROSES' ? (language === 'id' ? 'Dipesan' : 'Ordered') : item.purchasing_status}
                                                                                    </span>
                                                                                </div>
                                                                            )}

                                                                            {/* Delivery State */}
                                                                            {item.delivery_status && (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                                    <span style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                                        {language === 'id' ? 'Pengiriman' : 'Delivery'}
                                                                                    </span>
                                                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: item.delivery_status === 'DELIVERED' ? 'var(--color-pg-success)' : item.delivery_status === 'PARTIAL' ? 'var(--color-pg-warning)' : 'var(--color-pg-text-muted)' }}>
                                                                                        {item.delivery_status === 'DELIVERED' ? (language === 'id' ? 'Terkirim' : 'Delivered') : item.delivery_status === 'PARTIAL' ? (language === 'id' ? 'Sebagian' : 'Partial') : (language === 'id' ? 'Belum Dikirim' : 'Pending')}
                                                                                    </span>
                                                                                </div>
                                                                            )}

                                                                            {/* Invoicing State */}
                                                                            {item.invoice_status && (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                                    <span style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                                        {language === 'id' ? 'Faktur' : 'Invoicing'}
                                                                                    </span>
                                                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: item.invoice_status === 'INVOICED' ? 'var(--color-pg-success)' : item.invoice_status === 'PARTIAL' ? 'var(--color-pg-orange)' : 'var(--color-pg-text-muted)' }}>
                                                                                        {item.invoice_status === 'INVOICED' ? (language === 'id' ? 'Difakturkan' : 'Invoiced') : item.invoice_status === 'PARTIAL' ? (language === 'id' ? 'Sebagian' : 'Partial') : (language === 'id' ? 'Belum Difakturkan' : 'Pending')}
                                                                                    </span>
                                                                                </div>
                                                                            )}

                                                                            {/* Payment State */}
                                                                            {item.payment_status && (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                                    <span style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                                        {language === 'id' ? 'Pembayaran' : 'Payment'}
                                                                                    </span>
                                                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: item.payment_status === 'PAID' ? 'var(--color-pg-success)' : item.payment_status === 'PARTIAL_PAID' ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-text-muted)' }}>
                                                                                        {item.payment_status === 'PAID' ? (language === 'id' ? 'Lunas' : 'Paid') : item.payment_status === 'PARTIAL_PAID' ? (language === 'id' ? 'Sebagian' : 'Partial') : (language === 'id' ? 'Belum Bayar' : 'Unpaid')}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Piece Distribution & Forecast */}
                                                                        {item.item_type === 'MANUFACTURE' && !isCancelled && !isTerminated && (
                                                                            <div style={{
                                                                                marginTop: '12px',
                                                                                padding: '10px',
                                                                                backgroundColor: 'var(--color-pg-surface)',
                                                                                border: '1px solid var(--color-pg-border)',
                                                                                borderRadius: '8px',
                                                                            }}>
                                                                                {/* Piece Locations Header */}
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                                                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                                        {language === 'id' ? 'Distribusi Bagian' : 'Piece Distribution'}
                                                                                    </span>
                                                                                    {/* Dynamic Forecast (ETA) */}
                                                                                    {(() => {
                                                                                        const eta = calculateDynamicETA(item, telemetry, language);
                                                                                        if (!eta) return null;
                                                                                        return (
                                                                                            <span style={{ fontSize: '11px', fontWeight: 600, color: eta.totalEstimatedDays <= 3 ? 'var(--color-pg-warning)' : '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '14px', height: '14px', display: 'inline-block' }}>
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                                </svg>
                                                                                                ETA: {eta.relativeText} ({eta.formattedDate.split(',')[0]})
                                                                                            </span>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                                
                                                                                {/* Pipeline Segment Bar */}
                                                                                {(() => {
                                                                                    const locations = getPieceLocations(item);
                                                                                    if (locations.length === 0) return null;
                                                                                    
                                                                                    return (
                                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                                            {/* Segmented bar */}
                                                                                            <div style={{
                                                                                                display: 'flex',
                                                                                                height: '10px',
                                                                                                borderRadius: '5px',
                                                                                                overflow: 'hidden',
                                                                                                backgroundColor: 'var(--color-pg-surface)',
                                                                                                width: '100%'
                                                                                            }}>
                                                                                                {locations.map((loc: any, lIdx: number) => {
                                                                                                    const pct = (loc.qty / item.target_qty) * 100;
                                                                                                    return (
                                                                                                        <div 
                                                                                                            key={`seg-${lIdx}`} 
                                                                                                            style={{
                                                                                                                width: `${pct}%`,
                                                                                                                backgroundColor: loc.color === '#ef4444' ? '#ef4444' : loc.color === 'var(--color-pg-success)' ? 'var(--color-pg-success)' : '#3b82f6',
                                                                                                                height: '100%',
                                                                                                                transition: 'all 0.3s ease'
                                                                                                            }}
                                                                                                            title={`${loc.stage_name}: ${loc.qty} pcs`}
                                                                                                        />
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                            
                                                                                            {/* Labels list */}
                                                                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                                                {locations.map((loc: any, lIdx: number) => (
                                                                                                    <span 
                                                                                                        key={`lbl-${lIdx}`} 
                                                                                                        className="badge"
                                                                                                        style={{
                                                                                                            backgroundColor: loc.bg,
                                                                                                            color: loc.color,
                                                                                                            fontSize: '10px',
                                                                                                            padding: '2px 6px',
                                                                                                            borderRadius: '4px',
                                                                                                            border: 'none',
                                                                                                            fontWeight: 600
                                                                                                        }}
                                                                                                    >
                                                                                                        {loc.stage_name}: {loc.qty} pcs
                                                                                                    </span>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        )}

                                                                        {/* Alerts & Operational Troubles Section */}
                                                                        {(() => {
                                                                            if (itemAlerts.length === 0) return null;
                                                                            
                                                                            return (
                                                                                <div style={{
                                                                                    marginTop: '12px',
                                                                                    padding: '10px',
                                                                                    backgroundColor: 'rgba(239, 68, 68, 0.03)',
                                                                                    border: '1px solid rgba(239, 68, 68, 0.1)',
                                                                                    borderRadius: '8px',
                                                                                }}>
                                                                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '14px', height: '14px', display: 'inline-block' }}>
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                                        </svg>
                                                                                        {language === 'id' ? 'Laporan Kendala & Rework' : 'Trouble Reports & Rework'}
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                                        {itemAlerts.map((alert: any) => {
                                                                                            const isRework = alert.severity === 'YELLOW' || alert.reason_type === 'QC Rework';
                                                                                            const severityColor = isRework ? 'var(--color-pg-warning)' : '#ef4444';
                                                                                            const badgeText = isRework 
                                                                                                ? (language === 'id' ? 'Rework QC' : 'QC Rework')
                                                                                                : (language === 'id' ? 'Kendala' : 'Trouble');
                                                                                            
                                                                                            return (
                                                                                                <div 
                                                                                                    key={alert.id}
                                                                                                    style={{
                                                                                                        fontSize: '12px',
                                                                                                        color: 'var(--color-pg-text)',
                                                                                                        display: 'flex',
                                                                                                        flexDirection: 'column',
                                                                                                        gap: '3px',
                                                                                                        padding: '8px',
                                                                                                        backgroundColor: 'var(--color-pg-surface)',
                                                                                                        border: '1px solid var(--color-pg-border)',
                                                                                                        borderRadius: '6px',
                                                                                                        borderLeft: `3px solid ${severityColor}`,
                                                                                                        textAlign: 'left'
                                                                                                    }}
                                                                                                >
                                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                                        <span className="badge" style={{ backgroundColor: `${severityColor}22`, color: severityColor, fontSize: '10px', padding: '1px 5px', border: 'none', fontWeight: 700 }}>
                                                                                                            {badgeText}
                                                                                                        </span>
                                                                                                        <span style={{ fontSize: '10px', color: 'var(--color-pg-text-muted)' }}>
                                                                                                            {formatAlertTime(alert.created_at, language)}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <div style={{ fontWeight: 500 }}>
                                                                                                        {alert.message}
                                                                                                    </div>
                                                                                                    {alert.rework_reason && (
                                                                                                        <div style={{ 
                                                                                                            marginTop: '4px', 
                                                                                                            padding: '6px', 
                                                                                                            backgroundColor: 'rgba(251, 191, 36, 0.08)', 
                                                                                                            border: '1px solid rgba(251, 191, 36, 0.15)',
                                                                                                            borderRadius: '4px',
                                                                                                            color: 'var(--color-pg-warning)',
                                                                                                            fontSize: '11px',
                                                                                                            fontWeight: 500,
                                                                                                        }}>
                                                                                                            <strong>{language === 'id' ? 'Alasan: ' : 'Reason: '}</strong>{alert.rework_reason}
                                                                                                        </div>
                                                                                                    )}
                                                                                                    {alert.user?.name && (
                                                                                                        <div style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '12px', height: '12px', display: 'inline-block' }}>
                                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                                                            </svg>
                                                                                                            {language === 'id' ? 'Dilaporkan oleh' : 'Reported by'}: <span style={{ fontWeight: 600, color: 'var(--color-pg-text)' }}>{alert.user.name}</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })()}

                                                                        {/* Stages display */}
                                                                        {item.item_progresses && item.item_progresses.length > 0 && (
                                                                            <div style={{ marginTop: '12px' }}>
                                                                                <div style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                                                                                    Stages
                                                                                </div>
                                                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                                    {item.item_progresses.map((stage) => (
                                                                                        <span key={stage.id} className="badge" style={{
                                                                                            backgroundColor: stage.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)'
                                                                                                : stage.status === 'STUCK' ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-pg-border-subtle)',
                                                                                            color: stage.status === 'COMPLETED' ? 'var(--color-pg-success)'
                                                                                                : stage.status === 'STUCK' ? '#ef4444' : 'var(--color-pg-text-secondary)',
                                                                                            border: '1px solid var(--color-pg-border)',
                                                                                            fontSize: '11px',
                                                                                            padding: '3px 8px'
                                                                                        }}>
                                                                                            {(() => {
                                                                                                const nameLower = stage.stage_name.toLowerCase();
                                                                                                const isDesign = nameLower.includes('design') || nameLower.includes('gambar') || nameLower.includes('draft');
                                                                                                const isMaterial = nameLower.includes('material') || nameLower.includes('bahan') || nameLower.includes('vendor') || nameLower.includes('purchasing');

                                                                                                let progressText = '';
                                                                                                if (isDesign) {
                                                                                                    const pct = parseFloat(stage.progress_percent);
                                                                                                    if (stage.status === 'COMPLETED' || pct >= 100) {
                                                                                                        progressText = language === 'id' ? 'Approved' : 'Approved';
                                                                                                    } else if (pct > 0) {
                                                                                                        progressText = language === 'id' ? 'Digambar' : 'Drawing';
                                                                                                    } else {
                                                                                                        progressText = 'Pending';
                                                                                                    }
                                                                                                } else if (isMaterial) {
                                                                                                    const pct = parseFloat(stage.progress_percent);
                                                                                                    if (stage.status === 'COMPLETED' || pct >= 100) {
                                                                                                        progressText = language === 'id' ? 'Ready' : 'Ready';
                                                                                                    } else if (pct >= 60) {
                                                                                                        progressText = language === 'id' ? 'Terkirim' : 'Process';
                                                                                                    } else if (pct >= 30) {
                                                                                                        progressText = language === 'id' ? 'Dipesan' : 'Ordered';
                                                                                                    } else {
                                                                                                        progressText = 'Pending';
                                                                                                    }
                                                                                                } else {
                                                                                                    progressText = item.target_qty > 1
                                                                                                        ? `${stage.completed_qty}/${item.target_qty} pcs`
                                                                                                        : (stage.completed_qty > 0 ? `${stage.completed_qty} pcs` : `${parseFloat(stage.progress_percent).toFixed(0)}%`);
                                                                                                }

                                                                                                return `${stage.stage_name}: ${progressText}`;
                                                                                            })()}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                             </div>
                                                         );
                                                     })
                                                 )
                                             }
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
    </>);
}
