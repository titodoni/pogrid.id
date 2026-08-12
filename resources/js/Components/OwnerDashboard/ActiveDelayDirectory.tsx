import React from 'react';

export default function ActiveDelayDirectory({
    matrixFilter,
    setMatrixFilter,
    language,
    t,
    getFilteredMatrix,
    changeTab,
    togglePO,
    getStatusBadge
}: any) {
    return (
        <>
            {/* ── Active Delay & Risk Directory ────────────────────── */}
                        <div className="bg-pg-surface border border-pg-border rounded-2xl p-5 mb-5.5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.03)]">
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <div className="flex items-center gap-2.5">
                                    <h3 className="section-label-v2" style={{ margin: 0 }}>
                                        {matrixFilter ? (language === 'id' ? 'Hasil Filter Data' : 'Filtered Data Directory') : (language === 'id' ? 'Direktori PO & Item' : 'PO & Item Directory')}
                                    </h3>
                                    {matrixFilter && (
                                        <span className="bg-pg-primary text-white px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1.5">
                                            {matrixFilter.label}: {matrixFilter.value.toUpperCase()}
                                            <button
                                                onClick={() => setMatrixFilter(null)}
                                                className="bg-transparent border-none text-white cursor-pointer p-0.5 text-xs font-bold inline-flex items-center"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setDirCollapsed(!dirCollapsed)}
                                    className="text-xs font-semibold text-pg-text-secondary hover:text-white bg-transparent border border-white/10 hover:border-white/20 rounded-md px-2.5 py-1 cursor-pointer transition-colors"
                                >
                                    {dirCollapsed
                                        ? (language === 'id' ? '▼ Tampilkan' : '▼ Expand')
                                        : (language === 'id' ? '▲ Sembunyikan' : '▲ Collapse')
                                    }
                                </button>
                            </div>
                            {!dirCollapsed && (
                                <div className="mt-4">
                            
                            {/* Pill Filters */}
                            <div className="flex gap-2 flex-wrap mb-4">
                                <button
                                    onClick={() => setDirectoryFilter('client')}
                                    className="cursor-pointer transition-all duration-200"
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid var(--color-pg-border)',
                                        backgroundColor: directoryFilter === 'client' ? 'var(--color-pg-primary)' : 'var(--color-pg-border-subtle)',
                                        color: directoryFilter === 'client' ? '#ffffff' : 'var(--color-pg-text-secondary)',
                                    }}
                                >
                                    {language === 'id' ? 'Per Klien (Default)' : 'Per Client (Default)'}
                                </button>
                                <button
                                    onClick={() => setDirectoryFilter('marked')}
                                    className="cursor-pointer transition-all duration-200"
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid var(--color-pg-border)',
                                        backgroundColor: directoryFilter === 'marked' ? 'var(--color-pg-primary)' : 'var(--color-pg-border-subtle)',
                                        color: directoryFilter === 'marked' ? '#ffffff' : 'var(--color-pg-text-secondary)',
                                    }}
                                >
                                    {language === 'id' ? 'Ditandai (Rework/Kendala)' : 'Marked (Rework / Trouble)'}
                                </button>
                                <button
                                    onClick={() => setDirectoryFilter('delayed')}
                                    className="cursor-pointer transition-all duration-200"
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid var(--color-pg-border)',
                                        backgroundColor: directoryFilter === 'delayed' ? 'var(--color-pg-primary)' : 'var(--color-pg-border-subtle)',
                                        color: directoryFilter === 'delayed' ? '#ffffff' : 'var(--color-pg-text-secondary)',
                                    }}
                                >
                                    {language === 'id' ? 'Terlambat' : 'Delayed'}
                                </button>
                                <button
                                    onClick={() => setDirectoryFilter('ontime')}
                                    className="cursor-pointer transition-all duration-200"
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid var(--color-pg-border)',
                                        backgroundColor: directoryFilter === 'ontime' ? 'var(--color-pg-primary)' : 'var(--color-pg-border-subtle)',
                                        color: directoryFilter === 'ontime' ? '#ffffff' : 'var(--color-pg-text-secondary)',
                                    }}
                                >
                                    {language === 'id' ? 'Tepat Waktu' : 'On Time'}
                                </button>
                                <button
                                    onClick={() => setDirectoryFilter('close_due')}
                                    className="cursor-pointer transition-all duration-200"
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid var(--color-pg-border)',
                                        backgroundColor: directoryFilter === 'close_due' ? 'var(--color-pg-primary)' : 'var(--color-pg-border-subtle)',
                                        color: directoryFilter === 'close_due' ? '#ffffff' : 'var(--color-pg-text-secondary)',
                                    }}
                                >
                                    {language === 'id' ? 'Mendekati Deadline' : 'Close Due Date'}
                                </button>
                            </div>

                            <div style={{ width: '100%', overflowX: 'auto' }}>
                                {(() => {
                                    const getFilteredItems = () => {
                                        let items = [];
                                        if (!matrixFilter) {
                                            items = telemetry.all_items || [];
                                        } else {
                                            const allItems = telemetry.all_items || [];
                                            const { type, value } = matrixFilter;

                                            switch (type) {
                                                case 'stage':
                                                    items = allItems.filter((item: any) =>
                                                        item.current_stage?.toLowerCase() === value.toLowerCase()
                                                    );
                                                    break;
                                                case 'kpi_otdr':
                                                    items = allItems.filter((item: any) =>
                                                        item.po_status === 'COMPLETED' && item.is_on_time
                                                    );
                                                    break;
                                                case 'kpi_parts':
                                                    items = allItems.filter((item: any) =>
                                                        item.delivered_qty > 0
                                                    );
                                                    break;
                                                case 'kpi_delay':
                                                    items = allItems.filter((item: any) =>
                                                        item.days_overdue > 0
                                                    );
                                                    break;
                                                case 'kpi_urgent':
                                                    items = allItems.filter((item: any) =>
                                                        item.is_urgent
                                                    );
                                                    break;
                                                case 'finance_uninvoiced':
                                                    items = allItems.filter((item: any) =>
                                                        (item.po_status === 'COMPLETED' || item.po_status === 'DELIVERED' || item.po_status === 'CLOSED') && item.invoice_status !== 'INVOICED'
                                                    );
                                                    break;
                                                case 'finance_unpaid':
                                                    items = allItems.filter((item: any) =>
                                                        (item.po_status === 'COMPLETED' || item.po_status === 'DELIVERED' || item.po_status === 'CLOSED') && item.payment_status !== 'PAID' && item.invoice_status !== 'UNINVOICED'
                                                    );
                                                    break;
                                                case 'client':
                                                    items = allItems.filter((item: any) =>
                                                        item.client_name?.toLowerCase() === value.toLowerCase()
                                                    );
                                                    break;
                                                case 'client_overdue':
                                                    items = allItems.filter((item: any) =>
                                                        item.client_name?.toLowerCase() === value.toLowerCase() && item.days_overdue > 0
                                                    );
                                                    break;
                                                case 'client_uninvoiced':
                                                    items = allItems.filter((item: any) =>
                                                        item.client_name?.toLowerCase() === value.toLowerCase() && item.po_status === 'COMPLETED' && item.invoice_status !== 'INVOICED'
                                                    );
                                                    break;
                                                case 'client_unpaid':
                                                    items = allItems.filter((item: any) =>
                                                        item.client_name?.toLowerCase() === value.toLowerCase() && item.po_status === 'COMPLETED' && item.payment_status !== 'PAID' && item.invoice_status !== 'UNINVOICED'
                                                    );
                                                    break;
                                                case 'reason':
                                                    items = allItems.filter((item: any) =>
                                                        item.reason_type === value ||
                                                        item.reason?.toLowerCase().includes(value.toLowerCase())
                                                    );
                                                    break;
                                                default:
                                                    items = allItems;
                                            }
                                        }

                                        // Apply the pill filter directoryFilter
                                        switch (directoryFilter) {
                                            case 'marked':
                                                return items.filter((item: any) => {
                                                    const itemAlerts = alerts.filter(a => a.item_id === item.id && !a.is_resolved);
                                                    return itemAlerts.some(a => a.severity === 'RED' || a.severity === 'YELLOW');
                                                });
                                            case 'delayed':
                                                return items.filter((item: any) =>
                                                    item.days_overdue > 0 && item.po_status !== 'COMPLETED'
                                                );
                                            case 'ontime':
                                                return items.filter((item: any) =>
                                                    (item.po_status === 'COMPLETED' && item.is_on_time) || (item.po_status !== 'COMPLETED' && item.days_overdue === 0)
                                                );
                                            case 'close_due':
                                                return items.filter((item: any) => {
                                                    if (!item.global_deadline || item.po_status === 'COMPLETED') return false;
                                                    const deadline = new Date(item.global_deadline);
                                                    const today = new Date();
                                                    const diffTime = deadline.getTime() - today.getTime();
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                    return diffDays >= 0 && diffDays <= 7;
                                                });
                                            case 'client':
                                            default:
                                                return items;
                                        }
                                    };

                                    const filteredItems = getFilteredItems();

                                    if (filteredItems.length === 0) {
                                        return (
                                            <div className="text-pg-text-muted text-sm py-6 text-center">
                                                {matrixFilter ? (language === 'id' ? `Tidak ada data untuk filter "${matrixFilter.label}: ${matrixFilter.value}".` : `No data found for filter "${matrixFilter.label}: ${matrixFilter.value}".`) : (language === 'id' ? 'Tidak ada data item PO.' : 'No PO items found.')}
                                            </div>
                                        );
                                    }

                                    // Group filteredItems by clientName
                                    const groupedByClient: { [key: string]: any[] } = {};
                                    filteredItems.forEach((item: any) => {
                                        const cName = item.client_name || 'Other';
                                        if (!groupedByClient[cName]) {
                                            groupedByClient[cName] = [];
                                        }
                                        groupedByClient[cName].push(item);
                                    });

                                    return (
                                        <>
                                            <div className="directory-table-container">
                                                <table className="w-full border-collapse text-sm">
                                                    <thead>
                                                        <tr className="border-b border-white/8">
                                                            <th className="text-left px-4 py-3 text-pg-text-muted font-semibold">{t.po_number_label}</th>
                                                            <th className="text-left px-4 py-3 text-pg-text-muted font-semibold">{t.client_label}</th>
                                                            <th className="text-left px-4 py-3 text-pg-text-muted font-semibold">{t.item_name_label}</th>
                                                            <th className="text-center px-4 py-3 text-pg-text-muted font-semibold">{t.progress_label}</th>
                                                            <th className="text-center px-4 py-3 text-pg-text-muted font-semibold">{language === 'id' ? 'Status' : 'Status'}</th>
                                                            <th className="text-center px-4 py-3 text-pg-text-muted font-semibold">{t.deadline_label}</th>
                                                            <th className="text-center px-4 py-3 text-pg-text-muted font-semibold">{t.days_overdue_label}</th>
                                                            <th className="text-left px-4 py-3 text-pg-text-muted font-semibold">{t.delay_reason_label}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {Object.keys(groupedByClient).map((cName) => {
                                                            const clientItems = groupedByClient[cName];
                                                            return (
                                                                <React.Fragment key={`group-${cName}`}>
                                                                    <tr className="bg-blue-500/3 border-b border-white/6">
                                                                        <td colSpan={8} className="px-4 py-2 font-bold text-pg-primary-hover text-[11px] uppercase tracking-wider">
                                                                            🏢 CLIENT: {cName} ({clientItems.length} item{clientItems.length > 1 ? 's' : ''})
                                                                        </td>
                                                                    </tr>
                                                                    {clientItems.map((item: any, idx: number) => {
                                                                        const progress = parseFloat(item.progress_percent);
                                                                        const { label: displayStatus, color: statusColor, bg: statusBg } = getStatusBadge(item);

                                                                        return (
                                                                            <tr key={`delay-${cName}-${idx}`} className="border-b border-pg-border text-pg-text">
                                                                                <td className="px-4 py-3 font-bold">
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            if (item.po_id) {
                                                                                                changeTab('active');
                                                                                                setExpandedPOs(prev => {
                                                                                                    const next = new Set(prev);
                                                                                                    next.add(item.po_id);
                                                                                                    return next;
                                                                                                });
                                                                                                if (item.id) {
                                                                                                    setExpandedItems(prev => {
                                                                                                        const next = new Set(prev);
                                                                                                        next.add(item.id);
                                                                                                        return next;
                                                                                                    });
                                                                                                    setTimeout(() => {
                                                                                                        const el = document.getElementById(`item-card-${item.id}`);
                                                                                                        if (el) {
                                                                                                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                                                        }
                                                                                                    }, 120);
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        className="bg-transparent border-none text-blue-500 font-bold cursor-pointer p-0 text-left underline"
                                                                                    >
                                                                                        {item.po_number}
                                                                                    </button>
                                                                                </td>
                                                                                <td className="px-4 py-3">{item.client_name}</td>
                                                                                <td className="px-4 py-3 font-semibold">{item.item_name}</td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <div className="flex flex-col items-center gap-0.5">
                                                                                        <span className="badge" style={{
                                                                                            backgroundColor: progress >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                                                            color: progress >= 100 ? 'var(--color-pg-success)' : '#3b82f6',
                                                                                        }}>
                                                                                            {progress.toFixed(0)}%
                                                                                        </span>
                                                                                        {item.target_qty !== undefined && (
                                                                                            <span className="text-[10px] text-pg-text-muted">
                                                                                                ({item.total_delivered_qty || 0} / {item.target_qty} pcs)
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <span className="badge font-semibold"
                                                                                        style={{ backgroundColor: statusBg, color: statusColor }}>
                                                                                        {displayStatus}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center text-pg-text-secondary">{item.global_deadline}</td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    {item.days_overdue > 0 ? (
                                                                                        <span className="badge bg-red-500/15 text-red-500">
                                                                                            {item.days_overdue} {t.days_suffix}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-pg-text-muted">-</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-pg-danger italic">
                                                                                    {item.reason}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="directory-mobile-list">
                                                {Object.keys(groupedByClient).map((cName) => {
                                                    const clientItems = groupedByClient[cName];
                                                    return (
                                                        <div key={`mobile-group-${cName}`} className="mb-3">
                                                            <div className="bg-blue-500/4 border border-white/6 rounded-lg px-3 py-2 font-bold text-pg-primary-hover text-[11px] uppercase tracking-wider mb-1.5">
                                                                🏢 CLIENT: {cName} ({clientItems.length} item{clientItems.length > 1 ? 's' : ''})
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                {clientItems.map((item: any, idx: number) => {
                                                                    const progress = parseFloat(item.progress_percent);
                                                                    
                                                                    const { label: displayStatus, color: statusColor, bg: statusBg } = getStatusBadge(item);

                                                                    return (
                                                                        <div key={`mobile-item-${cName}-${idx}`} className="bg-pg-card border border-white/6 rounded-xl p-2.5 flex flex-col gap-1.5">
                                                                            <div className="flex justify-between items-baseline">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        changeTab('active');
                                                                                        togglePO(item.po_id);
                                                                                    }}
                                                                                    className="bg-transparent border-none text-blue-500 font-bold cursor-pointer p-0 text-left underline text-xs"
                                                                                >
                                                                                    {item.po_number}
                                                                                </button>
                                                                                <span className="font-bold text-pg-text text-xs">{item.item_name}</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center">
                                                                                <div className="flex items-center gap-1">
                                                                                    <span className="badge text-[10px] px-1.5 py-0.5"
                                                                                        style={{
                                                                                            backgroundColor: progress >= 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                                                            color: progress >= 100 ? 'var(--color-pg-success)' : '#3b82f6',
                                                                                        }}>
                                                                                        {progress.toFixed(0)}%
                                                                                    </span>
                                                                                    {item.target_qty !== undefined && (
                                                                                        <span className="text-[10px] text-pg-text-muted">
                                                                                            ({item.total_delivered_qty || 0} / {item.target_qty} pcs)
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <span className="badge font-semibold text-[10px] px-1.5 py-0.5"
                                                                                    style={{ backgroundColor: statusBg, color: statusColor }}>
                                                                                    {displayStatus}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-[10px] text-pg-text-secondary border-t border-white/4 pt-1">
                                                                                <span>{t.deadline_label}: {item.global_deadline}</span>
                                                                                {item.days_overdue > 0 ? (
                                                                                    <span className="badge bg-red-500/15 text-red-500 text-[9px] px-1 py-px">
                                                                                        {item.days_overdue} {t.days_suffix}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-pg-text-muted">-</span>
                                                                                )}
                                                                            </div>
                                                                            {item.reason && (
                                                                                <div className="text-[10px] text-pg-danger italic mt-0.5">
                                                                                    {item.reason}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                                </div>
                            )}
                        </div>

                        
        </>
    );
}
