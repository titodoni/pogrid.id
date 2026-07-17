import React, { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, AlertTriangle, Settings } from '../../Components/Icons';

interface CompletedStage {
    id: number;
    stage_name: string;
    completed_qty: number;
    progress_percent: number;
    cycle_days: number | null;
    completed_at: string | null;
    created_at: string | null;
    item: {
        id: number;
        item_name: string;
        target_qty: number;
        po_number: string;
        client_name: string;
    } | null;
}

interface Breakdown {
    stage: string;
    count: number;
    avg_cycle_days: number;
}

interface MonthlyTrend {
    month: string;
    count: number;
}

interface Props {
    completed_stages: CompletedStage[];
    summary: {
        total_completed: number;
        avg_cycle_days: number;
        fastest_cycle_days: number;
        slowest_cycle_days: number;
    };
    stage_breakdown: Breakdown[];
    monthly_trend: MonthlyTrend[];
    auth_user?: {
        id: number;
        name: string;
        role_name: string;
        post_name: string | null;
    };
    tenant?: {
        company_name: string;
        slug: string;
    };
}

const translations = {
    en: {
        title: 'My Completed Tasks',
        subtitle: 'Your completed stage history & cycle time performance',
        back: 'Back to Dashboard',
        total_completed: 'Completed',
        avg_cycle: 'Avg Cycle',
        fastest_cycle: 'Fastest',
        slowest_cycle: 'Slowest',
        days: 'days',
        no_data: 'No completed stages yet.',
        stage: 'Stage',
        item: 'Item',
        qty: 'Qty',
        po: 'PO',
        client: 'Client',
        cycle_days: 'Cycle (Days)',
        completed_at: 'Completed At',
        stage_breakdown: 'By Stage',
        monthly_trend: 'Monthly Trend',
        exit_terminal: 'Exit',
    },
    id: {
        title: 'Tugasku Selesai',
        subtitle: 'Riwayat tahapan selesai & performa waktu siklus',
        back: 'Kembali ke Dasbor',
        total_completed: 'Selesai',
        avg_cycle: 'Rata Siklus',
        fastest_cycle: 'Tercepat',
        slowest_cycle: 'Terlama',
        days: 'hari',
        no_data: 'Belum ada tahapan selesai.',
        stage: 'Tahap',
        item: 'Item',
        qty: 'Jml',
        po: 'PO',
        client: 'Klien',
        cycle_days: 'Siklus (Hari)',
        completed_at: 'Selesai Pada',
        stage_breakdown: 'Per Tahap',
        monthly_trend: 'Tren Bulanan',
        exit_terminal: 'Keluar',
    }
};

function formatDate(iso: string | null): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonth(month: string): string {
    const [y, m] = month.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function MyKpi({ completed_stages, summary, stage_breakdown, monthly_trend, auth_user, tenant }: Props) {
    const { url } = usePage();
    const pathParts = url.split('/');
    const slug = tenant?.slug || pathParts[2] || '';

    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'en';
        }
        return 'en';
    });

    useEffect(() => {
        localStorage.setItem('pogrid_lang', language);
    }, [language]);

    const t = translations[language];
    const maxTrendCount = Math.max(...monthly_trend.map(m => m.count), 1);
    const maxBreakdownCount = Math.max(...stage_breakdown.map(s => s.count), 1);

    return (
        <div className="dashboard-root" style={{
            backgroundColor: 'var(--color-pg-bg)',
            color: 'var(--color-pg-text)',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative',
        }}>
            <header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link
                        href={`/c/${slug}`}
                        style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                            color: '#a1a1aa',
                        }}
                    >
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{t.title}</h1>
                        <p style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', margin: '2px 0 0', opacity: 0.7 }}>{t.subtitle}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                        onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
                        style={{
                            minHeight: '44px',
                            padding: '0 12px',
                            backgroundColor: language === 'id' ? 'var(--color-pg-primary)' : 'transparent',
                            color: language === 'id' ? '#fff' : '#a1a1aa',
                            border: `1px solid ${language === 'id' ? '#6366f1' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '12px',
                        }}
                    >
                        {language === 'id' ? 'EN' : 'ID'}
                    </button>
                    <button
                        onClick={() => router.post('/logout')}
                        style={{
                            minHeight: '44px',
                            padding: '0 16px',
                            backgroundColor: '#f87171',
                            color: '#fff',
                            fontWeight: 700,
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            boxShadow: '0 4px 12px rgba(248, 113, 113, 0.2)',
                        }}
                    >
                        {t.exit_terminal}
                    </button>
                </div>
            </header>

            <div className="dashboard-scroll" style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
                {completed_stages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-pg-text-secondary)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>📊</div>
                        <div style={{ fontWeight: 600 }}>{t.no_data}</div>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', fontWeight: 600, marginBottom: '4px' }}>{t.total_completed}</div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>{summary.total_completed}</div>
                            </div>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', fontWeight: 600, marginBottom: '4px' }}>{t.avg_cycle}</div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: summary.avg_cycle_days > 7 ? '#f59e0b' : '#10b981' }}>
                                    {summary.avg_cycle_days} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-pg-text-secondary)' }}>{t.days}</span>
                                </div>
                            </div>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', fontWeight: 600, marginBottom: '4px' }}>{t.fastest_cycle}</div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
                                    {summary.fastest_cycle_days} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-pg-text-secondary)' }}>{t.days}</span>
                                </div>
                            </div>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', fontWeight: 600, marginBottom: '4px' }}>{t.slowest_cycle}</div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: summary.slowest_cycle_days > 14 ? '#ef4444' : summary.slowest_cycle_days > 7 ? '#f59e0b' : '#10b981' }}>
                                    {summary.slowest_cycle_days} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-pg-text-secondary)' }}>{t.days}</span>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Trend */}
                        {monthly_trend.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--color-pg-text-secondary)' }}>{t.monthly_trend}</h3>
                                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', justifyContent: 'space-around', minHeight: '80px' }}>
                                        {monthly_trend.map(m => {
                                            const pct = (m.count / maxTrendCount) * 100;
                                            return (
                                                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#10b981' }}>{m.count}</div>
                                                    <div style={{ height: '40px', width: '100%', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
                                                        <div style={{
                                                            position: 'absolute', bottom: 0, left: 0, width: '100%',
                                                            height: `${pct}%`, borderRadius: '4px',
                                                            backgroundColor: 'rgba(16, 185, 129, 0.6)',
                                                            transition: 'height 0.3s ease',
                                                        }} />
                                                    </div>
                                                    <div style={{ fontSize: '9px', color: 'var(--color-pg-text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatMonth(m.month)}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stage Breakdown */}
                        {stage_breakdown.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--color-pg-text-secondary)' }}>{t.stage_breakdown}</h3>
                                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    {stage_breakdown.map(s => {
                                        const pct = (s.count / maxBreakdownCount) * 100;
                                        return (
                                            <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.stage}</span>
                                                <div style={{ flex: 1, height: '16px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.6)', transition: 'width 0.3s ease' }} />
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-pg-primary-hover)', minWidth: '20px', textAlign: 'right' }}>{s.count}x</span>
                                                <span style={{ fontSize: '10px', color: 'var(--color-pg-text-secondary)', minWidth: '50px', textAlign: 'right' }}>
                                                    {s.avg_cycle_days}d
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Completed Stages Table */}
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.stage}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.item}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.po}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.client}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.qty}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.cycle_days}</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-pg-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.completed_at}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {completed_stages.map(stage => (
                                            <tr key={stage.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.15s' }}
                                                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                                        backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-pg-primary-hover)',
                                                    }}>
                                                        {stage.stage_name}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 12px', fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {stage.item?.item_name || '-'}
                                                </td>
                                                <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                                                    {stage.item?.po_number || '-'}
                                                </td>
                                                <td style={{ padding: '10px 12px', color: 'var(--color-pg-text-secondary)' }}>
                                                    {stage.item?.client_name || '-'}
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    {stage.completed_qty}/{stage.item?.target_qty || '-'}
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    {stage.cycle_days !== null ? (
                                                        <span style={{
                                                            fontWeight: 700,
                                                            color: stage.cycle_days > 14 ? '#ef4444' : stage.cycle_days > 7 ? '#f59e0b' : '#10b981',
                                                        }}>
                                                            {stage.cycle_days}d
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--color-pg-text-secondary)' }}>-</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-pg-text-secondary)', whiteSpace: 'nowrap' }}>
                                                    {formatDate(stage.completed_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
