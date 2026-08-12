import React, { useState } from 'react';

interface Props {
    language: 'en' | 'id';
    telemetry: any;
    matrixFilter: any;
    setMatrixFilter: React.Dispatch<React.SetStateAction<any>>;
}

export function ClientPerformanceBoard({ language, telemetry, matrixFilter, setMatrixFilter }: Props) {
    const [clientBoardCollapsed, setClientBoardCollapsed] = useState(false);
    const [clientSort, setClientSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'active_pos', direction: 'desc' });

    const handleClientSort = (key: string) => {
        setClientSort(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    if (!telemetry.client_health || telemetry.client_health.length === 0) return null;

    return (
        <div className="bg-pg-surface border border-pg-border rounded-2xl p-5 mb-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-baseline gap-2.5">
                    <h3 className="section-label-v2" style={{ margin: 0 }}>
                        {language === 'id' ? 'Papan Kinerja Klien' : 'Client Performance Board'}
                    </h3>
                    <span className="section-label-v2__sub">
                        {language === 'id' ? 'diurutkan berdasarkan risiko tertinggi' : 'sorted by highest risk'}
                    </span>
                </div>
                <button
                    onClick={() => setClientBoardCollapsed(!clientBoardCollapsed)}
                    className="text-xs font-semibold text-pg-text-secondary hover:text-white bg-transparent border border-white/10 hover:border-white/20 rounded-md px-2.5 py-1 cursor-pointer transition-colors"
                >
                    {clientBoardCollapsed
                        ? (language === 'id' ? '▼ Tampilkan' : '▼ Expand')
                        : (language === 'id' ? '▲ Sembunyikan' : '▲ Collapse')
                    }
                </button>
            </div>
            {!clientBoardCollapsed && (
                <div className="mt-4">
                    <div className="w-full overflow-x-auto">
                        <div className="client-table-container">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-white/8">
                                        <th onClick={() => handleClientSort('client_name')} className="text-left px-4 py-2.5 text-pg-text-muted font-semibold cursor-pointer select-none hover:text-white transition-colors">
                                            {language === 'id' ? 'Klien' : 'Client'} {clientSort.key === 'client_name' ? (clientSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                                        </th>
                                        <th onClick={() => handleClientSort('active_pos')} className="text-center px-4 py-2.5 text-pg-text-muted font-semibold cursor-pointer select-none hover:text-white transition-colors">
                                            {language === 'id' ? 'PO Aktif' : 'Active POs'} {clientSort.key === 'active_pos' ? (clientSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                                        </th>
                                        <th onClick={() => handleClientSort('on_time_rate')} className="text-center px-4 py-2.5 text-pg-text-muted font-semibold cursor-pointer select-none hover:text-white transition-colors">
                                            {language === 'id' ? 'Ketepatan Waktu' : 'On-Time Rate'} {clientSort.key === 'on_time_rate' ? (clientSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                                        </th>
                                        <th onClick={() => handleClientSort('overdue_items')} className="text-center px-4 py-2.5 text-pg-text-muted font-semibold cursor-pointer select-none hover:text-white transition-colors">
                                            {language === 'id' ? 'Item Terlambat' : 'Overdue Items'} {clientSort.key === 'overdue_items' ? (clientSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                                        </th>
                                        <th onClick={() => handleClientSort('uninvoiced_count')} className="text-center px-4 py-2.5 text-pg-text-muted font-semibold cursor-pointer select-none hover:text-white transition-colors">
                                            {language === 'id' ? 'Belum Faktur' : 'Uninvoiced'} {clientSort.key === 'uninvoiced_count' ? (clientSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                                        </th>
                                        <th onClick={() => handleClientSort('unpaid_count')} className="text-center px-4 py-2.5 text-pg-text-muted font-semibold cursor-pointer select-none hover:text-white transition-colors">
                                            {language === 'id' ? 'Belum Bayar' : 'Unpaid'} {clientSort.key === 'unpaid_count' ? (clientSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const sortedClients = [...(telemetry.client_health || [])].sort((a, b) => {
                                            const key = clientSort.key;
                                            let aVal = a[key] ?? 0;
                                            let bVal = b[key] ?? 0;
                                            if (typeof aVal === 'string') {
                                                return clientSort.direction === 'asc'
                                                    ? aVal.localeCompare(bVal)
                                                    : bVal.localeCompare(aVal);
                                            }
                                            return clientSort.direction === 'asc'
                                                ? aVal - bVal
                                                : bVal - aVal;
                                        });
                                        return sortedClients.map((client: any, idx: number) => {
                                            const otdrColor = client.on_time_rate == null
                                                ? 'var(--color-pg-text-muted)'
                                                : client.on_time_rate >= 80 ? 'var(--color-pg-success)'
                                                : client.on_time_rate >= 60 ? 'var(--color-pg-warning)'
                                                : '#ef4444';
                                            const hasRisk = client.overdue_items > 0 || client.uninvoiced_count > 0 || client.unpaid_count > 0;
                                            return (
                                                <tr key={`client-${idx}`} className="border-b border-pg-border text-pg-text"
                                                    style={{ backgroundColor: hasRisk ? 'rgba(239,68,68,0.015)' : 'transparent' }}>
                                                    <td
                                                        onClick={() => setMatrixFilter({ type: 'client', value: client.client_name, label: language === 'id' ? 'Klien' : 'Client' })}
                                                        className="px-4 py-2.75 font-bold cursor-pointer underline text-pg-primary-hover"
                                                    >
                                                        {client.client_name}
                                                    </td>
                                                    <td className="px-4 py-2.75 text-center text-pg-text-secondary">{client.active_pos}</td>
                                                    <td className="px-4 py-2.75 text-center">
                                                        {client.on_time_rate != null
                                                            ? <span className="font-bold" style={{ color: otdrColor }}>{client.on_time_rate}%</span>
                                                            : <span className="text-pg-text-muted text-[11px]">N/A</span>}
                                                    </td>
                                                    <td
                                                        onClick={() => client.overdue_items > 0 && setMatrixFilter({ type: 'client_overdue', value: client.client_name, label: language === 'id' ? 'Overdue Klien' : 'Client Overdue' })}
                                                        className="px-4 py-2.75 text-center"
                                                        style={{ cursor: client.overdue_items > 0 ? 'pointer' : 'default' }}
                                                    >
                                                        {client.overdue_items > 0
                                                            ? <span className="badge bg-red-500/15 text-red-500">{client.overdue_items}</span>
                                                            : <span className="text-pg-text-muted">-</span>}
                                                    </td>
                                                    <td
                                                        onClick={() => client.uninvoiced_count > 0 && setMatrixFilter({ type: 'client_uninvoiced', value: client.client_name, label: language === 'id' ? 'Belum Difakturkan Klien' : 'Client Uninvoiced' })}
                                                        className="px-4 py-2.75 text-center"
                                                        style={{ cursor: client.uninvoiced_count > 0 ? 'pointer' : 'default' }}
                                                    >
                                                        {client.uninvoiced_count > 0
                                                            ? <span className="badge bg-amber-500/15 text-pg-warning">{client.uninvoiced_count}</span>
                                                            : <span className="text-pg-text-muted">-</span>}
                                                    </td>
                                                    <td
                                                        onClick={() => client.unpaid_count > 0 && setMatrixFilter({ type: 'client_unpaid', value: client.client_name, label: language === 'id' ? 'Belum Dibayar Klien' : 'Client Unpaid' })}
                                                        className="px-4 py-2.75 text-center"
                                                        style={{ cursor: client.unpaid_count > 0 ? 'pointer' : 'default' }}
                                                    >
                                                        {client.unpaid_count > 0
                                                            ? <span className="badge bg-orange-500/15 text-pg-orange">{client.unpaid_count}</span>
                                                            : <span className="text-pg-text-muted">-</span>}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>

                        <div className="client-mobile-list">
                            {(() => {
                                const sortedClients = [...(telemetry.client_health || [])].sort((a, b) => {
                                    const key = clientSort.key;
                                    let aVal = a[key] ?? 0;
                                    let bVal = b[key] ?? 0;
                                    if (typeof aVal === 'string') {
                                        return clientSort.direction === 'asc'
                                            ? aVal.localeCompare(bVal)
                                            : bVal.localeCompare(aVal);
                                    }
                                    return clientSort.direction === 'asc'
                                        ? aVal - bVal
                                        : bVal - aVal;
                                });
                                return sortedClients.map((client: any, idx: number) => {
                                    const otdrColor = client.on_time_rate == null
                                        ? 'var(--color-pg-text-muted)'
                                        : client.on_time_rate >= 80 ? 'var(--color-pg-success)'
                                        : client.on_time_rate >= 60 ? 'var(--color-pg-warning)'
                                        : '#ef4444';
                                    return (
                                        <div
                                            key={`client-mobile-${idx}`}
                                            className="bg-pg-card border border-white/6 rounded-xl p-3 flex flex-col gap-2"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span
                                                    onClick={() => setMatrixFilter({ type: 'client', value: client.client_name, label: language === 'id' ? 'Klien' : 'Client' })}
                                                    className="font-extrabold text-sm cursor-pointer underline text-pg-primary-hover"
                                                >
                                                    {client.client_name}
                                                </span>
                                                <span className="text-xs font-bold" style={{ color: otdrColor }}>
                                                    {client.on_time_rate != null ? `${client.on_time_rate}% OTD` : 'N/A OTD'}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-pg-text-secondary">
                                                {language === 'id' ? 'PO Aktif' : 'Active POs'}: <strong>{client.active_pos}</strong>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-white/4 pt-2 text-[11px]">
                                                <div
                                                    onClick={() => client.overdue_items > 0 && setMatrixFilter({ type: 'client_overdue', value: client.client_name, label: language === 'id' ? 'Overdue Klien' : 'Client Overdue' })}
                                                    className="flex flex-col items-center gap-0.75 flex-1"
                                                    style={{ cursor: client.overdue_items > 0 ? 'pointer' : 'default' }}
                                                >
                                                    <span className="text-pg-text-muted text-[10px]">{language === 'id' ? 'Terlambat' : 'Overdue'}</span>
                                                    {client.overdue_items > 0 ? (
                                                        <span className="badge bg-red-500/15 text-red-500 px-1.5 py-0.5">{client.overdue_items}</span>
                                                    ) : (
                                                        <span className="text-pg-text-muted">-</span>
                                                    )}
                                                </div>
                                                <div
                                                    onClick={() => client.uninvoiced_count > 0 && setMatrixFilter({ type: 'client_uninvoiced', value: client.client_name, label: language === 'id' ? 'Belum Difakturkan Klien' : 'Client Uninvoiced' })}
                                                    className="flex flex-col items-center gap-0.75 flex-1"
                                                    style={{ cursor: client.uninvoiced_count > 0 ? 'pointer' : 'default' }}
                                                >
                                                    <span className="text-pg-text-muted text-[10px]">{language === 'id' ? 'Faktur' : 'Invoice'}</span>
                                                    {client.uninvoiced_count > 0 ? (
                                                        <span className="badge bg-amber-500/15 text-pg-warning px-1.5 py-0.5">{client.uninvoiced_count}</span>
                                                    ) : (
                                                        <span className="text-pg-text-muted">-</span>
                                                    )}
                                                </div>
                                                <div
                                                    onClick={() => client.unpaid_count > 0 && setMatrixFilter({ type: 'client_unpaid', value: client.client_name, label: language === 'id' ? 'Belum Dibayar Klien' : 'Client Unpaid' })}
                                                    className="flex flex-col items-center gap-0.75 flex-1"
                                                    style={{ cursor: client.unpaid_count > 0 ? 'pointer' : 'default' }}
                                                >
                                                    <span className="text-pg-text-muted text-[10px]">{language === 'id' ? 'Bayar' : 'Paid'}</span>
                                                    {client.unpaid_count > 0 ? (
                                                        <span className="badge bg-orange-500/15 text-pg-orange px-1.5 py-0.5">{client.unpaid_count}</span>
                                                    ) : (
                                                        <span className="text-pg-text-muted">-</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
