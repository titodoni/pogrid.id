import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, Search } from '../../Components/Icons';

interface ReworkEvent {
    id: number;
    reject_qty: number;
    stage: string;
    is_resolved: boolean;
    created_at: string;
    rework_reason?: string;
    item: {
        id: number;
        item_name: string;
        target_qty: number;
        status: string;
        progress_percent: number;
        po: {
            po_number: string;
            client_name: string;
            global_deadline: string;
        } | null;
    } | null;
    user: { name: string } | null;
}

interface MonthlyTrend {
    label: string;
    month: string;
    events: number;
    qty: number;
}

interface ClientBreakdown {
    client_name: string;
    events: number;
    qty: number;
}

interface ItemBreakdown {
    item_name: string;
    events: number;
    qty: number;
}

interface Props {
    rework_events: ReworkEvent[];
    summary: {
        total_events: number;
        total_rework_qty: number;
        resolved_count: number;
        unresolved_count: number;
        rework_rate_pct: number;
        inspected_items: number;
        top_stages: { stage: string; count: number }[];
        monthly_trend: MonthlyTrend[];
        client_breakdown: ClientBreakdown[];
        item_breakdown: ItemBreakdown[];
    };
    selected_range: string;
}

const translations = {
    en: {
        page_title: 'Rework Logbook',
        subtitle: 'QC rework analytics — 6-month trend, per-client & per-item breakdown',
        back_to_dashboard: 'Back to Dashboard',
        total_events: 'Total Events',
        total_rework_qty: 'Total Rejected Qty',
        unresolved: 'Unresolved',
        resolved: 'Resolved',
        rework_rate: 'Rework Rate',
        of_inspected: 'of inspected items',
        top_rework_stages: 'Top Rework Stages',
        stage: 'Stage',
        count: 'Count',
        monthly_trend: '6-Month Rework Trend',
        events_label: 'Events',
        qty_label: 'Rejected Qty',
        client_breakdown: 'Rework by Client',
        item_breakdown: 'Most Reworked Items',
        no_rework: 'No rework events found.',
        po_number: 'PO',
        client: 'Client',
        item_name: 'Item',
        qty: 'Rejected Qty',
        stage_label: 'Stage',
        inspector: 'Inspector',
        date: 'Date',
        status: 'Status',
        reason: 'Reason',
        filter_range: 'Period',
        this_week: 'This Week',
        this_month: 'This Month',
        this_year: 'This Year',
        all_time: 'All Time',
        yes: 'Yes',
        no: 'No',
        table_tab: 'Events',
        analytics_tab: 'Analytics',
    },
    id: {
        page_title: 'Logbook Rework',
        subtitle: 'Analitik rework QC — tren 6 bulan, per-klien & per-item',
        back_to_dashboard: 'Kembali ke Dasbor',
        total_events: 'Total Kejadian',
        total_rework_qty: 'Total Qty Ditolak',
        unresolved: 'Belum Selesai',
        resolved: 'Selesai',
        rework_rate: 'Tingkat Rework',
        of_inspected: 'dari item diperiksa',
        top_rework_stages: 'Tahap Rework Teratas',
        stage: 'Tahap',
        count: 'Jumlah',
        monthly_trend: 'Tren Rework 6 Bulan',
        events_label: 'Kejadian',
        qty_label: 'Jml Ditolak',
        client_breakdown: 'Rework per Klien',
        item_breakdown: 'Item Paling Sering Rework',
        no_rework: 'Belum ada kejadian rework.',
        po_number: 'PO',
        client: 'Klien',
        item_name: 'Barang',
        qty: 'Jml Ditolak',
        stage_label: 'Tahap',
        inspector: 'Inspektur',
        date: 'Tanggal',
        status: 'Status',
        reason: 'Alasan',
        filter_range: 'Periode',
        this_week: 'Minggu Ini',
        this_month: 'Bulan Ini',
        this_year: 'Tahun Ini',
        all_time: 'Semua',
        yes: 'Ya',
        no: 'Tidak',
        table_tab: 'Kejadian',
        analytics_tab: 'Analitik',
    },
};

const Bar: React.FC<{ value: number; max: number; color: string; height?: number }> = ({ value, max, color, height = 48 }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div style={{ height: `${height}px`, width: '100%', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute', bottom: 0, left: 0, width: '100%',
                height: `${pct}%`, borderRadius: '4px',
                backgroundColor: color, opacity: 0.7,
                transition: 'height 0.3s ease',
            }} />
        </div>
    );
};

export default function ReworkLogbook({ rework_events, summary, selected_range }: Props) {
    const { errors } = usePage().props;

    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
        }
        return 'en';
    });

    const [search, setSearch] = useState('');
    const [view, setView] = useState<'analytics' | 'table'>('analytics');

    const t = translations[language];

    const handleRangeChange = (range: string) => {
        router.get('/dashboard/rework-logbook', { range }, { preserveState: true });
    };

    const filtered = rework_events.filter(e => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            e.item?.item_name.toLowerCase().includes(q) ||
            e.item?.po?.po_number.toLowerCase().includes(q) ||
            e.item?.po?.client_name.toLowerCase().includes(q) ||
            e.stage.toLowerCase().includes(q) ||
            e.user?.name.toLowerCase().includes(q)
        );
    });

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    const maxTrendEvents = Math.max(...summary.monthly_trend.map(m => m.events), 1);
    const maxTrendQty = Math.max(...summary.monthly_trend.map(m => m.qty), 1);
    const maxClientEvents = Math.max(...summary.client_breakdown.map(c => c.events), 1);

    return (
        <div className="dashboard-root" style={{
            backgroundColor: 'var(--color-pg-bg)',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--color-pg-text)',
            minHeight: '100vh',
        }}>
            <div className="dashboard-above-scroll">
                <header className="responsive-header owner-dashboard-header" style={{
                    padding: '10px 16px 8px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}>
                    <div className="owner-header-title">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Link href="/dashboard" style={{ color: 'var(--color-pg-text-secondary)', textDecoration: 'none', display: 'flex' }}>
                                <ChevronLeft size={18} />
                            </Link>
                            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{t.page_title}</h1>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)' }}>{t.subtitle}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                            onClick={() => {
                                const lang = language === 'en' ? 'id' : 'en';
                                setLanguage(lang);
                                localStorage.setItem('pogrid_lang', lang);
                            }}
                            style={{
                                padding: '6px 10px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                color: 'var(--color-pg-text-secondary)',
                                border: '1px solid var(--color-pg-border)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                            }}
                        >
                            {language === 'en' ? 'ID' : 'EN'}
                        </button>
                        <button
                            onClick={() => router.post('/logout')}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#ef4444',
                                color: '#fff',
                                fontWeight: 600,
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                            }}
                        >
                            {language === 'en' ? 'Exit' : 'Keluar'}
                        </button>
                    </div>
                </header>
            </div>

            <div className="dashboard-scroll" style={{ padding: '16px' }}>
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

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', fontWeight: 600, marginBottom: '4px' }}>{t.total_events}</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>{summary.total_events}</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', fontWeight: 600, marginBottom: '4px' }}>{t.total_rework_qty}</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444' }}>{summary.total_rework_qty}</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', fontWeight: 600, marginBottom: '4px' }}>{t.unresolved}</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#f97316' }}>{summary.unresolved_count}</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', fontWeight: 600, marginBottom: '4px' }}>{t.resolved}</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>{summary.resolved_count}</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', fontWeight: 600, marginBottom: '4px' }}>{t.rework_rate}</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: summary.rework_rate_pct > 20 ? '#ef4444' : summary.rework_rate_pct > 10 ? '#f59e0b' : '#10b981' }}>
                            {summary.rework_rate_pct}%
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', marginTop: '2px' }}>
                            {summary.total_events} / {summary.inspected_items} {t.of_inspected}
                        </div>
                    </div>
                </div>

                {/* View Toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button onClick={() => setView('analytics')} style={{
                        padding: '6px 14px',
                        backgroundColor: view === 'analytics' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.05)',
                        color: view === 'analytics' ? '#fff' : 'var(--color-pg-text-secondary)',
                        border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                    }}>{t.analytics_tab}</button>
                    <button onClick={() => setView('table')} style={{
                        padding: '6px 14px',
                        backgroundColor: view === 'table' ? 'var(--color-pg-primary)' : 'rgba(255,255,255,0.05)',
                        color: view === 'table' ? '#fff' : 'var(--color-pg-text-secondary)',
                        border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                    }}>{t.table_tab} ({rework_events.length})</button>
                </div>

                {/* Filter Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {[
                            { key: 'week', label: t.this_week },
                            { key: 'month', label: t.this_month },
                            { key: 'year', label: t.this_year },
                            { key: 'all', label: t.all_time },
                        ].map(r => (
                            <button
                                key={r.key}
                                onClick={() => handleRangeChange(r.key)}
                                style={{
                                    padding: '6px 10px',
                                    backgroundColor: selected_range === r.key ? 'var(--color-pg-primary)' : 'transparent',
                                    color: selected_range === r.key ? '#fff' : 'var(--color-pg-text-secondary)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                }}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={language === 'en' ? 'Search items, PO, client...' : 'Cari barang, PO, klien...'}
                            style={{
                                padding: '8px 12px 8px 32px',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                color: 'var(--color-pg-text)',
                                border: '1px solid var(--color-pg-border)',
                                borderRadius: '8px',
                                fontSize: '12px',
                                outline: 'none',
                                width: '220px',
                            }}
                        />
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-pg-text-secondary)', fontSize: '14px' }}>
                            <Search size={14} />
                        </span>
                    </div>
                </div>

                {/* ── Analytics View ────────────────────────────── */}
                {view === 'analytics' && (
                    <div>
                        {/* 6-Month Trend */}
                        {summary.monthly_trend.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--color-pg-text-secondary)' }}>{t.monthly_trend}</h3>
                                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', justifyContent: 'space-around', minHeight: '120px' }}>
                                        {summary.monthly_trend.map(m => (
                                            <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ fontSize: '10px', fontWeight: 600, color: '#f59e0b' }}>{m.events}</div>
                                                <Bar value={m.events} max={maxTrendEvents} color="#f59e0b" height={40} />
                                                <div style={{ fontSize: '10px', fontWeight: 600, color: '#ef4444' }}>{m.qty}</div>
                                                <Bar value={m.qty} max={maxTrendQty} color="#ef4444" height={28} />
                                                <div style={{ fontSize: '9px', color: 'var(--color-pg-text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{m.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '10px', color: 'var(--color-pg-text-secondary)' }}>
                                        <span><span style={{ color: '#f59e0b' }}>■</span> {t.events_label}</span>
                                        <span><span style={{ color: '#ef4444' }}>■</span> {t.qty_label}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Top Rework Stages & Rework by Client — side by side */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            {/* Top Stages */}
                            {summary.top_stages.length > 0 && (
                                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--color-pg-text-secondary)' }}>{t.top_rework_stages}</h3>
                                    {summary.top_stages.map(s => {
                                        const maxStage = Math.max(...summary.top_stages.map(x => x.count), 1);
                                        const pct = (s.count / maxStage) * 100;
                                        return (
                                            <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.stage}</span>
                                                <div style={{ flex: 1, height: '18px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.6)', transition: 'width 0.3s ease' }} />
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', minWidth: '24px', textAlign: 'right' }}>{s.count}x</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Client Breakdown */}
                            {summary.client_breakdown.length > 0 && (
                                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--color-pg-text-secondary)' }}>{t.client_breakdown}</h3>
                                    {summary.client_breakdown.slice(0, 8).map(c => {
                                        const pct = (c.events / maxClientEvents) * 100;
                                        return (
                                            <div key={c.client_name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.client_name}</span>
                                                <div style={{ flex: 1, height: '16px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', backgroundColor: 'rgba(129, 140, 248, 0.6)', transition: 'width 0.3s ease' }} />
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-pg-primary-hover)', minWidth: '48px', textAlign: 'right' }}>{c.events}ev / {c.qty}pcs</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Most Reworked Items */}
                        {summary.item_breakdown.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--color-pg-text-secondary)' }}>{t.item_breakdown}</h3>
                                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--color-pg-text-secondary)', fontWeight: 600, fontSize: '11px' }}>{t.item_name}</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--color-pg-text-secondary)', fontWeight: 600, fontSize: '11px' }}>{t.events_label}</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--color-pg-text-secondary)', fontWeight: 600, fontSize: '11px' }}>{t.qty_label}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summary.item_breakdown.slice(0, 15).map(item => (
                                                <tr key={item.item_name} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <td style={{ padding: '7px 10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{item.item_name}</td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                                            backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b',
                                                        }}>{item.events}x</span>
                                                    </td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{item.qty}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Table View ────────────────────────────────── */}
                {view === 'table' && (
                    <>
                        {filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-pg-text-secondary)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>📋</div>
                                <div style={{ fontWeight: 600 }}>{t.no_rework}</div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.date}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.po_number}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.client}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.item_name}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.stage_label}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.qty}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.inspector}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.reason}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.status}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(event => (
                                            <tr key={event.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.15s' }}
                                                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--color-pg-text-secondary)' }}>
                                                    {formatDate(event.created_at)}
                                                </td>
                                                <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                                                    {event.item?.po?.po_number || '-'}
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    {event.item?.po?.client_name || '-'}
                                                </td>
                                                <td style={{ padding: '10px 12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {event.item?.item_name || '-'}
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                                        backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-pg-primary-hover)',
                                                    }}>
                                                        {event.stage}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                                                    {event.reject_qty}
                                                </td>
                                                <td style={{ padding: '10px 12px', color: 'var(--color-pg-text-secondary)' }}>
                                                    {event.user?.name || '-'}
                                                </td>
                                                <td style={{ padding: '10px 12px', color: 'var(--color-pg-text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={event.rework_reason || ''}>
                                                    {event.rework_reason || '-'}
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                                                        backgroundColor: event.is_resolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                                                        color: event.is_resolved ? '#10b981' : '#f97316',
                                                    }}>
                                                        {event.is_resolved ? t.yes : t.no}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
