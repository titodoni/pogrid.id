import React from 'react';
import { DashboardMetrics } from '../../Components/OwnerDashboard/DashboardMetrics';
import { ChartRow } from '../../Components/OwnerDashboard/ChartRow';
import { ClientPerformanceBoard } from '../../Components/OwnerDashboard/ClientPerformanceBoard';
import { BottleneckDetailTable } from '../../Components/OwnerDashboard/BottleneckDetailTable';
import { FinanceHealthStrip } from '../../Components/OwnerDashboard/FinanceHealthStrip';
import ActiveDelayDirectory from '../../Components/OwnerDashboard/ActiveDelayDirectory';
import ProductionPipeline from '../../Components/OwnerDashboard/ProductionPipeline';

/**
 * Matrix (performance telemetry) tab — extracted verbatim from Owner/Dashboard.tsx.
 */
export default function MatrixTab({
    telemetry,
    selected_range,
    handleRangeChange,
    matrixFilter,
    setMatrixFilter,
    language,
    t,
    tenant,
    togglePO,
    changeTab,
    isPresentationMode,
    togglePresentationMode,
    exportOpen,
    setExportOpen,
    alerts,
    setExpandedPOs,
    setExpandedItems,
    dirCollapsed,
    setDirCollapsed,
    directoryFilter,
    setDirectoryFilter,
}: any) {
    return (<>
{telemetry && (() => {
                // ── Per-render helpers ──────────────────────────────────────────
                const prev = (telemetry.previous || {}) as any;
                const rangeLabel = selected_range === 'week' ? t.this_week : selected_range === 'year' ? t.this_year : t.this_month;

                const otdrDelta: number | null = (telemetry.otdr != null && prev.otdr != null)
                    ? Math.round((telemetry.otdr - prev.otdr) * 10) / 10
                    : null;

                const deliveredCurr: number = telemetry.manufacture?.delivered ?? telemetry.manufacture?.completed ?? 0;
                const deliveredPrev: number = prev.manufacture?.delivered ?? 0;
                const deliveredDelta: number | null = deliveredPrev > 0
                    ? Math.round(((deliveredCurr - deliveredPrev) / deliveredPrev) * 100)
                    : null;

                const delayDelta: number | null = prev.avg_delay_days != null
                    ? Math.round((telemetry.avg_delay_days - prev.avg_delay_days) * 10) / 10
                    : null;

                // Top stuck stage for narrative
                const topStuck = [...(telemetry.stage_metrics || [])]
                    .sort((a: any, b: any) => b.stuck_count - a.stuck_count)
                    .find((m: any) => m.stuck_count > 0);

                const delayedPosCount: number = telemetry.delayed_pos_count ?? 0;
                const delayedItemsCount: number = telemetry.delayed_items?.length ?? 0;
                const avgDelay: number = telemetry.avg_delay_days ?? 0;
                const redAlerts: number = telemetry.risks?.red ?? 0;
                const yellowAlerts: number = telemetry.risks?.yellow ?? 0;
                const isAllNormal = !topStuck && delayedPosCount === 0 && delayedItemsCount === 0 && redAlerts === 0 && yellowAlerts === 0;

                // Auto-narrative (Bahasa Indonesia primary)
                let narrative = '';
                if (language === 'id') {
                    narrative = telemetry.otdr != null
                        ? `Periode ini, pabrik menyelesaikan ${telemetry.otdr}% pesanan tepat waktu`
                        : `Periode ini, belum ada pesanan yang selesai untuk dihitung ketepatan waktunya`;
                    if (otdrDelta != null && otdrDelta !== 0) {
                        narrative += otdrDelta > 0
                            ? ` — naik ${Math.abs(otdrDelta)}% dari periode lalu`
                            : ` — turun ${Math.abs(otdrDelta)}% dari periode lalu`;
                    }
                    narrative += '. ';
                    if (delayedPosCount > 0 || delayedItemsCount > 0 || avgDelay > 0) {
                        if (delayedPosCount > 0) {
                            narrative += `Terdapat ${delayedPosCount} PO aktif yang terlambat dari jadwal (rata-rata keterlambatan ${avgDelay} hari). `;
                        } else {
                            narrative += `Terdapat item produksi yang mengalami keterlambatan (rata-rata ${avgDelay} hari). `;
                        }
                    }
                    if (topStuck) {
                        narrative += `Bottleneck utama ada di tahap ${topStuck.stage} (${topStuck.stuck_count} item macet, rata-rata ${topStuck.avg_cycle_time} hari/item). `;
                    } else if (redAlerts > 0) {
                        narrative += `Terdapat ${redAlerts} kendala kritis (RED) yang aktif di lantai produksi. `;
                    } else if (isAllNormal) {
                        narrative += 'Semua tahap produksi dan waktu pengiriman berjalan normal sesuai jadwal. ';
                    }
                    if ((telemetry.urgent_active || 0) > 0) {
                        narrative += `Terdapat ${telemetry.urgent_active} PO mendesak (Urgent) yang sedang diproduksi. `;
                    }
                    if ((telemetry.finance_health?.uninvoiced_count || 0) > 0) {
                        narrative += `Perhatian keuangan: ${telemetry.finance_health.uninvoiced_count} item selesai belum dibuatkan faktur.`;
                    }
                } else {
                    narrative = telemetry.otdr != null
                        ? `This period, the factory completed ${telemetry.otdr}% of orders on time`
                        : `This period, no completed orders yet to evaluate on-time rate`;
                    if (otdrDelta != null && otdrDelta !== 0) {
                        narrative += otdrDelta > 0
                            ? ` — up ${Math.abs(otdrDelta)}% vs last period`
                            : ` — down ${Math.abs(otdrDelta)}% vs last period`;
                    }
                    narrative += '. ';
                    if (delayedPosCount > 0 || delayedItemsCount > 0 || avgDelay > 0) {
                        if (delayedPosCount > 0) {
                            narrative += `${delayedPosCount} active order(s) are delayed past deadline (avg delay ${avgDelay} days). `;
                        } else {
                            narrative += `Production items are behind schedule (avg delay ${avgDelay} days). `;
                        }
                    }
                    if (topStuck) {
                        narrative += `Top bottleneck: ${topStuck.stage} stage (${topStuck.stuck_count} stuck, avg ${topStuck.avg_cycle_time} days/item). `;
                    } else if (redAlerts > 0) {
                        narrative += `There are ${redAlerts} active critical (RED) alerts on the production floor. `;
                    } else if (isAllNormal) {
                        narrative += 'All production stages and delivery timelines running normally on schedule. ';
                    }
                    if ((telemetry.urgent_active || 0) > 0) {
                        narrative += `${telemetry.urgent_active} urgent order(s) currently in production. `;
                    }
                    if ((telemetry.finance_health?.uninvoiced_count || 0) > 0) {
                        narrative += `Finance alert: ${telemetry.finance_health.uninvoiced_count} completed item(s) pending invoice.`;
                    }
                }

                // Pipeline stage health color
                const getStageHealth = (metric: any) => {
                    if (metric.stuck_count > 0) return { border: 'rgba(239,68,68,0.6)', bg: 'rgba(239,68,68,0.08)', label: '#ef4444' };
                    if (metric.avg_cycle_time > 3) return { border: 'rgba(249,115,22,0.5)', bg: 'rgba(249,115,22,0.07)', label: 'var(--color-pg-orange)' };
                    if (metric.avg_cycle_time > 1) return { border: 'rgba(234,179,8,0.4)', bg: 'rgba(234,179,8,0.05)', label: 'var(--color-pg-warning)' };
                    return { border: 'rgba(16,185,129,0.35)', bg: 'rgba(16,185,129,0.05)', label: 'var(--color-pg-success)' };
                };

                const pipelineStages = (telemetry.stage_metrics || [])
                    .filter((m: any) => !m.stage.toLowerCase().includes('rework'));

                // ── Delay display fix (negative = ahead of schedule) ──
                const delayDays = telemetry.avg_delay_days;
                const delayColor = delayDays <= 0 ? 'var(--color-pg-success)'
                    : delayDays <= 3 ? 'var(--color-pg-warning)'
                    : '#ef4444';
                const delayDisplay = delayDays < 0
                    ? `${Math.abs(delayDays)} ${language === 'id' ? 'Hari Lebih Cepat' : 'Days Early'}`
                    : delayDays === 0
                    ? (language === 'id' ? 'Tepat Waktu' : 'On Time')
                    : `${delayDays} ${language === 'id' ? 'Hari' : 'Days'}`;

                // ── Status badge helper (dedup from table+mobile) ────
                const getStatusBadge = (item: any) => {
                    if (['COMPLETED', 'DELIVERED', 'CLOSED'].includes(item.po_status)) {
                        if (item.invoice_status === 'UNINVOICED')
                            return { label: language === 'id' ? 'Belum Difakturkan' : 'Finance: Uninvoiced', color: 'var(--color-pg-warning)', bg: 'rgba(234,179,8,0.1)' };
                        if (item.invoice_status === 'PARTIAL')
                            return { label: (language === 'id' ? 'Faktur Sebagian' : 'Finance: Partial Invoice') + ` (${item.invoiced_qty}/${item.target_qty})`, color: '#a855f7', bg: 'rgba(168,85,247,0.1)' };
                        if (item.payment_status === 'UNPAID')
                            return { label: language === 'id' ? 'Belum Dibayar' : 'Finance: Unpaid', color: 'var(--color-pg-orange)', bg: 'rgba(249,115,22,0.1)' };
                        if (item.payment_status === 'PARTIAL_PAID')
                            return { label: language === 'id' ? 'Dibayar Sebagian' : 'Finance: Partial Paid', color: 'var(--color-pg-primary)', bg: 'rgba(99,102,241,0.1)' };
                        return { label: language === 'id' ? 'Selesai & Lunas' : 'Closed / Settled', color: 'var(--color-pg-success)', bg: 'rgba(16,185,129,0.1)' };
                    }
                    return { label: item.current_stage || '-', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
                };

                // ── Pipeline health key ──────────────────────────────
                const getHealthKey = (metric: any): string => {
                    if (metric.stuck_count > 0) return 'stuck';
                    if (metric.avg_cycle_time > 3) return 'slow';
                    if (metric.avg_cycle_time > 1) return 'watch';
                    return 'normal';
                };
                
                return (
                    <div className="performance-matrix-container" style={{ marginBottom: '40px' }}>

                        {/* ── Control Row ──────────────────────────────────── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--color-pg-surface)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-pg-border)' }}>
                                {['week', 'month', 'year'].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => handleRangeChange(r)}
                                        style={{
                                            padding: '6px 12px',
                                            backgroundColor: selected_range === r ? 'var(--color-pg-primary)' : 'transparent',
                                            color: selected_range === r ? 'var(--color-pg-primary-ink)' : 'var(--color-pg-text-secondary)',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: 600,
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {r === 'week' ? t.this_week : r === 'month' ? t.this_month : t.this_year}
                                    </button>
                                ))}
                            </div>
                            <div className="export-dropdown-wrap">
                                <button
                                    onClick={() => setExportOpen(v => !v)}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: 'var(--color-pg-surface)',
                                        color: 'var(--color-pg-text)',
                                        border: '1px solid var(--color-pg-border)',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    {language === 'id' ? 'Ekspor' : 'Export'} ▾
                                </button>
                                {exportOpen && (
                                    <>
                                        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setExportOpen(false)} />
                                        <div className="export-dropdown-menu">
                                            <a href={`/c/${tenant?.slug}/export-csv?range=${selected_range || 'month'}`} onClick={() => setExportOpen(false)}>
                                                📄 CSV
                                            </a>
                                            <a href={`/c/${tenant?.slug}/export-xlsx?range=${selected_range || 'month'}`} onClick={() => setExportOpen(false)}>
                                                📊 Excel
                                            </a>
                                            <a href={`/c/${tenant?.slug}/export-pdf?range=${selected_range || 'month'}`} target="_blank" onClick={() => setExportOpen(false)}>
                                                📑 PDF
                                            </a>
                                            <hr />
                                            <button onClick={() => { togglePresentationMode(); setExportOpen(false); }}>
                                                🖥️ {isPresentationMode ? t.exit_presentation : t.presentation_mode}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <DashboardMetrics
                            language={language}
                            t={t}
                            rangeLabel={rangeLabel}
                            narrative={narrative}
                            telemetry={telemetry}
                            setMatrixFilter={setMatrixFilter}
                            matrixFilter={matrixFilter}
                            otdrDelta={otdrDelta}
                            deliveredCurr={deliveredCurr}
                            deliveredDelta={deliveredDelta}
                            delayDays={delayDays}
                            delayColor={delayColor}
                            delayDisplay={delayDisplay}
                            delayDelta={delayDelta}
                        />

                        
                        <ProductionPipeline
                            language={language}
                            pipelineStages={pipelineStages}
                            getStageHealth={getStageHealth}
                            getHealthKey={getHealthKey}
                            matrixFilter={matrixFilter}
                            setMatrixFilter={setMatrixFilter}
                        />

                        <ActiveDelayDirectory
                            matrixFilter={matrixFilter}
                            setMatrixFilter={setMatrixFilter}
                            language={language}
                            t={t}
                            changeTab={changeTab}
                            togglePO={togglePO}
                            getStatusBadge={getStatusBadge}
                            telemetry={telemetry}
                            alerts={alerts}
                            setExpandedPOs={setExpandedPOs}
                            setExpandedItems={setExpandedItems}
                            dirCollapsed={dirCollapsed}
                            setDirCollapsed={setDirCollapsed}
                            directoryFilter={directoryFilter}
                            setDirectoryFilter={setDirectoryFilter}
                        />

                        {/* ── Section 5: Finance Health Strip ──────────────────── */}
                        <FinanceHealthStrip
                            telemetry={telemetry}
                            language={language}
                            matrixFilter={matrixFilter}
                            setMatrixFilter={setMatrixFilter}
                        />

                        {/* ── Chart Row ─────────────────────────────────────────── */}
                        <ChartRow
                            t={t}
                            language={language}
                            telemetry={telemetry}
                            matrixFilter={matrixFilter}
                            setMatrixFilter={setMatrixFilter}
                        />

                        {/* ── Bottleneck Detail Table ───────────────────────────── */}
                        <BottleneckDetailTable
                            t={t}
                            language={language}
                            telemetry={telemetry}
                            matrixFilter={matrixFilter}
                            setMatrixFilter={setMatrixFilter}
                        />

                        {/* ── Section 4: Papan Kinerja Klien ───────────────────── */}
                        <ClientPerformanceBoard
                            language={language}
                            telemetry={telemetry}
                            matrixFilter={matrixFilter}
                            setMatrixFilter={setMatrixFilter}
                        />
                    </div>
                );
            })()}
    </>);
}
