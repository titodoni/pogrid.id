import React from 'react';
import { Search } from '../Icons';

interface Props {
    showSearchModal: boolean;
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    setShowSearchModal: React.Dispatch<React.SetStateAction<boolean>>;
    getSearchResults: () => any;
    handleSearchItemClick: (poId: number, itemId?: number) => void;
    handleSearchAlertClick: (alertId: string) => void;
    language: 'en' | 'id';
    t: Record<string, string>;
    pos: any[];
}

export default function SearchModal({
    showSearchModal,
    searchQuery,
    setSearchQuery,
    setShowSearchModal,
    getSearchResults,
    handleSearchItemClick,
    handleSearchAlertClick,
    language,
    t,
    pos,
}: Props) {
    if (!showSearchModal) return null;

    const results = getSearchResults();
    const totalResults = results.pos.length + results.items.length + results.clients.length + results.alerts.length;

    return (
        <div
            id="search-modal"
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                zIndex: 100,
                padding: '40px 20px',
            }}
            onClick={e => { if (e.target === e.currentTarget) setShowSearchModal(false); }}
        >
            <div style={{
                backgroundColor: '#18181b',
                border: '1px solid var(--color-pg-border)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                width: '100%',
                maxWidth: '640px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                        {language === 'en' ? 'Search Directory' : 'Cari Data'}
                    </h3>
                    <button
                        onClick={() => setShowSearchModal(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#71717a',
                            fontSize: '20px',
                            cursor: 'pointer',
                            lineHeight: 1,
                            padding: '0 4px',
                        }}
                    >×</button>
                </div>

                <div style={{ position: 'relative', marginBottom: '16px', flexShrink: 0 }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#71717a' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={language === 'en' ? "Search POs, items, clients, or issues..." : "Cari nomor PO, barang, klien, atau kendala..."}
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '12px 16px 12px 42px',
                            backgroundColor: 'var(--color-pg-bg)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                    {!searchQuery.trim() ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#71717a' }}>
                            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔍</div>
                            <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>
                                {language === 'en' ? 'Search POs, Items, Clients & Issues' : 'Cari PO, Barang, Klien & Kendala'}
                            </p>
                            <p style={{ fontSize: '12px', margin: 0 }}>
                                {language === 'en' ? 'Type above to query client names, PO numbers, item statuses, and logged trouble reports.' : 'Ketik di atas untuk mencari nama klien, nomor PO, status barang, dan laporan kendala.'}
                            </p>
                        </div>
                    ) : totalResults === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#71717a' }}>
                            <div style={{ fontSize: '24px', marginBottom: '12px' }}>📭</div>
                            <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>
                                {language === 'en' ? 'No results found' : 'Tidak ada hasil'}
                            </p>
                            <p style={{ fontSize: '12px', margin: 0 }}>
                                {language === 'en' ? `No matches found for "${searchQuery}"` : `Tidak ada hasil pencarian untuk "${searchQuery}"`}
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {results.alerts.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '11px', color: 'var(--color-pg-primary-hover)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                                        {language === 'en' ? 'Alerts & Operational Issues' : 'Kendala & Masalah Operasional'}
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {results.alerts.map((issue: any) => {
                                            const badgeColor = issue.severity === 'RED' ? '#ef4444'
                                                : issue.severity === 'BLUE' ? '#3b82f6'
                                                : issue.severity === 'ORANGE' ? '#fb923c'
                                                : '#fbbf24';
                                            return (
                                                <div
                                                    key={issue.id}
                                                    onClick={() => handleSearchAlertClick(issue.id.replace('alert-db-', '').replace('alert-pin-', ''))}
                                                    style={{
                                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        borderRadius: '8px',
                                                        padding: '12px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                    className="hover-grow"
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: badgeColor, color: '#fff' }}>
                                                            {issue.title}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: '13px', margin: 0, color: '#fafafa' }}>{issue.message}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {results.pos.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '11px', color: 'var(--color-pg-primary-hover)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                                        {language === 'en' ? 'Purchase Orders (POs)' : 'Daftar PO'}
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {results.pos.map((po: any) => {
                                            const itemsProgress = po.items.length > 0
                                                ? Math.round(po.items.reduce((sum: number, item: any) => sum + parseFloat(item.progress_percent), 0) / po.items.length)
                                                : 0;
                                            return (
                                                <div
                                                    key={po.id}
                                                    onClick={() => handleSearchItemClick(po.id)}
                                                    style={{
                                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        borderRadius: '8px',
                                                        padding: '12px',
                                                        cursor: 'pointer',
                                                    }}
                                                    className="hover-grow"
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#fafafa' }}>{po.po_number}</span>
                                                        <span style={{
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            color: po.status === 'COMPLETED' || po.status === 'DELIVERED' || po.status === 'CLOSED' ? '#34d399' : '#fbbf24',
                                                            backgroundColor: po.status === 'COMPLETED' || po.status === 'DELIVERED' || po.status === 'CLOSED' ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.12)',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px'
                                                        }}>
                                                            {po.status}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                                                        <span>{po.client_name}</span>
                                                        <span>{language === 'en' ? 'Deadline: ' : 'Tenggat: '} {new Date(po.global_deadline).toLocaleDateString()}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${itemsProgress}%`, height: '100%', backgroundColor: po.status === 'COMPLETED' || po.status === 'DELIVERED' || po.status === 'CLOSED' ? '#10b981' : '#6366f1', borderRadius: '3px' }} />
                                                        </div>
                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fafafa' }}>{itemsProgress}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {results.items.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '11px', color: 'var(--color-pg-primary-hover)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                                        {language === 'en' ? 'Items & Components' : 'Barang & Komponen'}
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {results.items.map((item: any) => {
                                            const progress = Math.round(parseFloat(item.progress_percent));
                                            return (
                                                <div
                                                    key={`${item.po_id}-${item.id}`}
                                                    onClick={() => handleSearchItemClick(item.po_id, item.id)}
                                                    style={{
                                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        borderRadius: '8px',
                                                        padding: '12px',
                                                        cursor: 'pointer',
                                                    }}
                                                    className="hover-grow"
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#fafafa' }}>{item.item_name}</span>
                                                        <span style={{
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            color: item.status === 'COMPLETED' ? '#34d399' : '#a855f7',
                                                            backgroundColor: item.status === 'COMPLETED' ? 'rgba(16,185,129,0.12)' : 'rgba(168,85,247,0.12)',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px'
                                                        }}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '8px' }}>
                                                        {item.client_name} &middot; PO {item.po_number}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${progress}%`, height: '100%', backgroundColor: item.status === 'COMPLETED' ? '#10b981' : '#a855f7', borderRadius: '2px' }} />
                                                        </div>
                                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#fafafa' }}>{progress}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {results.clients.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: '11px', color: 'var(--color-pg-primary-hover)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                                        {language === 'en' ? 'Clients' : 'Klien'}
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                        {results.clients.map((clientName: string) => {
                                            const clientPos = pos.filter(p => p.client_name === clientName);
                                            const activeCount = clientPos.filter(p => p.status !== 'COMPLETED').length;
                                            const doneCount = clientPos.filter(p => p.status === 'COMPLETED').length;
                                            return (
                                                <div
                                                    key={clientName}
                                                    onClick={() => {
                                                        const firstPo = clientPos[0];
                                                        if (firstPo) handleSearchItemClick(firstPo.id);
                                                    }}
                                                    style={{
                                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        borderRadius: '8px',
                                                        padding: '12px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                    }}
                                                    className="hover-grow"
                                                >
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fafafa' }}>{clientName}</span>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <span style={{ fontSize: '10px', color: '#fbbf24', backgroundColor: 'rgba(234,179,8,0.12)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                            {activeCount} {language === 'en' ? 'Active' : 'Aktif'}
                                                        </span>
                                                        <span style={{ fontSize: '10px', color: '#34d399', backgroundColor: 'rgba(16,185,129,0.12)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                            {doneCount} {language === 'en' ? 'Done' : 'Selesai'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
