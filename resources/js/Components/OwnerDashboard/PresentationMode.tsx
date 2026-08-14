import React from 'react';

interface Telemetry {
    otdr: number | null;
    previous?: any;
    manufacture?: { delivered?: number; completed?: number; target?: number };
    avg_delay_days: number;
    urgent_active?: number;
    stage_metrics?: Array<{
        stage: string;
        active_items: number;
        stuck_count: number;
        rework_count: number;
        avg_cycle_time: number;
    }>;
    client_health?: Array<{
        client_name: string;
        active_pos: number;
        on_time_rate: number | null;
        overdue_items: number;
        uninvoiced_count: number;
        unpaid_count: number;
    }>;
    delayed_items?: Array<{
        po_number: string;
        client_name: string;
        item_name: string;
        progress_percent: number;
        days_overdue: number;
        reason: string;
    }>;
    finance_health?: { uninvoiced_count?: number };
    delayed_pos_count?: number;
    risks?: { red?: number; yellow?: number };
    all_items?: any[];
}

interface Props {
    telemetry: Telemetry;
    selected_range?: string;
    language: 'en' | 'id';
    t: Record<string, string>;
    currentTime: Date;
    presentationSlide: number;
    presentationAutoPlay: boolean;
    togglePresentationMode: () => void;
    setPresentationSlide: React.Dispatch<React.SetStateAction<number>>;
    setPresentationAutoPlay: React.Dispatch<React.SetStateAction<boolean>>;
    changeTab: (tab: string) => void;
    pos?: Array<any>;
    tenant?: { company_name?: string; slug?: string; logo_path?: string | null; theme?: string };
}

export default function PresentationMode({
    telemetry,
    selected_range,
    language,
    t,
    currentTime,
    presentationSlide,
    presentationAutoPlay,
    togglePresentationMode,
    setPresentationSlide,
    setPresentationAutoPlay,
    changeTab,
    pos = [],
    tenant,
}: Props) {
    const prev = (telemetry.previous || {}) as any;
    const rangeLabel = selected_range === 'week' ? t.this_week : selected_range === 'year' ? t.this_year : t.this_month;
    const otdrDelta: number | null = (telemetry.otdr != null && prev.otdr != null) ? Math.round((telemetry.otdr - prev.otdr) * 10) / 10 : null;
    const deliveredCurr: number = telemetry.manufacture?.delivered ?? telemetry.manufacture?.completed ?? 0;
    const deliveredPrev: number = prev.manufacture?.delivered ?? 0;
    const deliveredDelta: number | null = deliveredPrev > 0 ? Math.round(((deliveredCurr - deliveredPrev) / deliveredPrev) * 100) : null;
    const delayDelta: number | null = prev.avg_delay_days != null ? Math.round((telemetry.avg_delay_days - prev.avg_delay_days) * 10) / 10 : null;

    const topStuck = [...(telemetry.stage_metrics || [])]
        .sort((a: any, b: any) => b.stuck_count - a.stuck_count)
        .find((m: any) => m.stuck_count > 0);

    const delayedPosCount: number = telemetry.delayed_pos_count ?? 0;
    const delayedItemsCount: number = telemetry.delayed_items?.length ?? 0;
    const avgDelay: number = telemetry.avg_delay_days ?? 0;
    const redAlerts: number = telemetry.risks?.red ?? 0;
    const yellowAlerts: number = telemetry.risks?.yellow ?? 0;
    const isAllNormal = !topStuck && delayedPosCount === 0 && delayedItemsCount === 0 && redAlerts === 0 && yellowAlerts === 0;

    let narrativeText = '';
    if (language === 'id') {
        narrativeText = telemetry.otdr != null
            ? `Periode ini, pabrik menyelesaikan ${telemetry.otdr}% pesanan tepat waktu`
            : `Periode ini, belum ada pesanan yang selesai untuk dihitung ketepatan waktunya`;
        if (otdrDelta != null) {
            narrativeText += otdrDelta >= 0
                ? ` — naik ${Math.abs(otdrDelta)}% dari periode lalu`
                : ` — turun ${Math.abs(otdrDelta)}% dari periode lalu`;
        }
        narrativeText += '. ';
        if (delayedPosCount > 0 || delayedItemsCount > 0 || avgDelay > 0) {
            if (delayedPosCount > 0) {
                narrativeText += `Terdapat ${delayedPosCount} PO aktif yang terlambat dari jadwal (rata-rata keterlambatan ${avgDelay} hari). `;
            } else {
                narrativeText += `Terdapat item produksi yang mengalami keterlambatan (rata-rata ${avgDelay} hari). `;
            }
        }
        if (topStuck) {
            narrativeText += `Bottleneck utama ada di tahap ${topStuck.stage} (${topStuck.stuck_count} item macet, rata-rata ${topStuck.avg_cycle_time} hari/item). `;
        } else if (redAlerts > 0) {
            narrativeText += `Terdapat ${redAlerts} kendala kritis (RED) yang aktif di lantai produksi. `;
        } else if (isAllNormal) {
            narrativeText += 'Semua tahap produksi dan waktu pengiriman berjalan normal sesuai jadwal. ';
        }
        if ((telemetry.urgent_active || 0) > 0) {
            narrativeText += `Terdapat ${telemetry.urgent_active} PO mendesak (Urgent) yang sedang diproduksi. `;
        }
        if ((telemetry.finance_health?.uninvoiced_count || 0) > 0) {
            narrativeText += `Perhatian keuangan: ${telemetry.finance_health.uninvoiced_count} item selesai belum dibuatkan faktur.`;
        }
    } else {
        narrativeText = telemetry.otdr != null
            ? `This period, the factory completed ${telemetry.otdr}% of orders on time`
            : `This period, no completed orders yet to evaluate on-time rate`;
        if (otdrDelta != null) {
            narrativeText += otdrDelta >= 0
                ? ` — up ${Math.abs(otdrDelta)}% vs last period`
                : ` — down ${Math.abs(otdrDelta)}% vs last period`;
        }
        narrativeText += '. ';
        if (delayedPosCount > 0 || delayedItemsCount > 0 || avgDelay > 0) {
            if (delayedPosCount > 0) {
                narrativeText += `${delayedPosCount} active order(s) are delayed past deadline (avg delay ${avgDelay} days). `;
            } else {
                narrativeText += `Production items are behind schedule (avg delay ${avgDelay} days). `;
            }
        }
        if (topStuck) {
            narrativeText += `Top bottleneck: ${topStuck.stage} stage (${topStuck.stuck_count} stuck, avg ${topStuck.avg_cycle_time} days/item). `;
        } else if (redAlerts > 0) {
            narrativeText += `There are ${redAlerts} active critical (RED) alerts on the production floor. `;
        } else if (isAllNormal) {
            narrativeText += 'All production stages and delivery timelines running normally on schedule. ';
        }
        if ((telemetry.urgent_active || 0) > 0) {
            narrativeText += `${telemetry.urgent_active} urgent order(s) currently in production. `;
        }
        if ((telemetry.finance_health?.uninvoiced_count || 0) > 0) {
            narrativeText += `Finance alert: ${telemetry.finance_health.uninvoiced_count} completed item(s) pending invoice.`;
        }
    }

    const getStageHealth = (metric: any) => {
        if (metric.stuck_count > 0) return { border: 'rgba(239,68,68,0.6)', bg: 'rgba(239,68,68,0.12)', label: '#ef4444' };
        if (metric.avg_cycle_time > 3) return { border: 'rgba(249,115,22,0.5)', bg: 'rgba(249,115,22,0.08)', label: '#fb923c' };
        if (metric.avg_cycle_time > 1) return { border: 'rgba(234,179,8,0.4)', bg: 'rgba(234,179,8,0.06)', label: '#fbbf24' };
        return { border: 'rgba(16,185,129,0.35)', bg: 'rgba(16,185,129,0.06)', label: '#34d399' };
    };

    const pipelineStages = (telemetry.stage_metrics || [])
        .filter((m: any) => !m.stage.toLowerCase().includes('rework'));

    const renderSlide = () => {
        switch (presentationSlide) {
            case 0:
                return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '30px' }}>
                        <div style={{
                            backgroundColor: 'rgba(37,99,235,0.08)',
                            border: '1px solid rgba(37,99,235,0.25)',
                            borderRadius: '16px',
                            padding: '24px 30px',
                            maxWidth: '900px',
                            margin: '0 auto',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '12px', color: 'var(--color-pg-primary-hover)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                                {language === 'id' ? 'RINGKASAN OPERASIONAL' : 'OPERATIONAL SUMMARY'}
                            </div>
                            <p style={{ fontSize: '20px', color: 'var(--color-pg-text)', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>
                                {narrativeText}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                            <div style={{ backgroundColor: 'var(--color-pg-surface)', border: '1px solid var(--color-pg-border)', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    {t.on_time_delivery}
                                </div>
                                <div style={{ fontSize: '48px', fontWeight: 900, color: telemetry.otdr == null ? 'var(--color-pg-text-muted)' : telemetry.otdr >= 80 ? 'var(--color-pg-success)' : telemetry.otdr >= 60 ? 'var(--color-pg-warning)' : 'var(--color-pg-danger)' }}>
                                    {telemetry.otdr != null ? `${telemetry.otdr}%` : 'N/A'}
                                </div>
                                {otdrDelta != null && (
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: otdrDelta >= 0 ? 'var(--color-pg-success)' : 'var(--color-pg-danger)', marginTop: '6px' }}>
                                        {otdrDelta >= 0 ? '▲' : '▼'} {Math.abs(otdrDelta)}% vs prev
                                    </div>
                                )}
                            </div>

                            <div style={{ backgroundColor: 'var(--color-pg-surface)', border: '1px solid var(--color-pg-border)', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    {t.parts_manufactured}
                                </div>
                                <div style={{ fontSize: '38px', fontWeight: 900, color: 'var(--color-pg-primary, #3b82f6)', marginTop: '10px' }}>
                                    {deliveredCurr} <span style={{ fontSize: '18px', color: 'var(--color-pg-text-muted)', fontWeight: 700 }}>/ {telemetry.manufacture?.target ?? 0}</span>
                                </div>
                                {deliveredDelta != null && (
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: deliveredDelta >= 0 ? 'var(--color-pg-success)' : 'var(--color-pg-danger)', marginTop: '12px' }}>
                                        {deliveredDelta >= 0 ? '▲' : '▼'} {Math.abs(deliveredDelta)}% vs prev
                                    </div>
                                )}
                            </div>

                            <div style={{ backgroundColor: 'var(--color-pg-surface)', border: '1px solid var(--color-pg-border)', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    {t.avg_delay}
                                </div>
                                <div style={{ fontSize: '38px', fontWeight: 900, color: telemetry.avg_delay_days === 0 ? 'var(--color-pg-success)' : telemetry.avg_delay_days <= 3 ? 'var(--color-pg-warning)' : 'var(--color-pg-danger)', marginTop: '10px' }}>
                                    {telemetry.avg_delay_days} <span style={{ fontSize: '18px', color: 'var(--color-pg-text-muted)', fontWeight: 700 }}>{language === 'id' ? 'Hari' : 'Days'}</span>
                                </div>
                                {delayDelta != null && (
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: delayDelta <= 0 ? 'var(--color-pg-success)' : 'var(--color-pg-danger)', marginTop: '12px' }}>
                                        {delayDelta >= 0 ? '▲' : '▼'} {Math.abs(delayDelta)} vs prev
                                    </div>
                                )}
                            </div>

                            <div style={{ backgroundColor: 'var(--color-pg-surface)', border: `1px solid ${(telemetry.urgent_active || 0) > 0 ? 'rgba(239,68,68,0.4)' : 'var(--color-pg-border)'}`, borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    {language === 'id' ? 'PO Mendesak' : 'Urgent Active POs'}
                                </div>
                                <div style={{ fontSize: '48px', fontWeight: 900, color: (telemetry.urgent_active || 0) > 0 ? '#ef4444' : '#34d399' }}>
                                    {telemetry.urgent_active || 0}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', marginTop: '6px', fontWeight: 600 }}>
                                    {(telemetry.urgent_active || 0) > 0 ? (language === 'id' ? 'Tindakan segera' : 'Action required') : (language === 'id' ? 'Kondisi Aman' : 'Healthy')}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 1:
                return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '30px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {pipelineStages.map((metric: any, idx: number) => {
                                const health = getStageHealth(metric);
                                return (
                                    <React.Fragment key={`slide-pipeline-${idx}`}>
                                        <div style={{
                                            backgroundColor: health.bg,
                                            border: `2px solid ${health.border}`,
                                            borderRadius: '16px',
                                            padding: '20px 24px',
                                            textAlign: 'center',
                                            minWidth: '150px',
                                            position: 'relative',
                                        }}>
                                            {metric.stuck_count > 0 && (
                                                <span style={{
                                                    position: 'absolute',
                                                    top: '-10px',
                                                    right: '-10px',
                                                    backgroundColor: '#ef4444',
                                                    color: '#fff',
                                                    borderRadius: '50%',
                                                    width: '24px',
                                                    height: '24px',
                                                    fontSize: '12px',
                                                    fontWeight: 900,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: '2px solid #09090b',
                                                }}>{metric.stuck_count}</span>
                                            )}
                                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                                                {metric.stage}
                                            </div>
                                            <div style={{ fontSize: '32px', fontWeight: 900, color: health.label, lineHeight: 1 }}>
                                                {metric.active_items}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--color-pg-text-muted)', marginTop: '4px' }}>
                                                {language === 'id' ? 'item aktif' : 'active items'}
                                            </div>
                                            {metric.avg_cycle_time > 0 && (
                                                <div style={{ fontSize: '11px', color: health.label, marginTop: '8px', fontWeight: 700, borderTop: `1px solid ${health.border}`, paddingTop: '8px' }}>
                                                    {metric.avg_cycle_time}d avg
                                                </div>
                                            )}
                                        </div>
                                        {idx < pipelineStages.length - 1 && (
                                            <div style={{ color: 'var(--color-pg-border)', fontSize: '36px', userSelect: 'none' }}>→</div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        <div style={{ backgroundColor: 'var(--color-pg-surface)', border: '1px solid var(--color-pg-border)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)' }}>
                            <div style={{ width: '100%', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-pg-border)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--color-pg-text-muted)' }}>{t.stage}</th>
                                        <th style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--color-pg-text-muted)' }}>{t.active_items}</th>
                                        <th style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--color-pg-text-muted)' }}>{t.stuck_incidents}</th>
                                        <th style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--color-pg-text-muted)' }}>{t.rework_count}</th>
                                        <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--color-pg-text-muted)' }}>{t.avg_cycle_time}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {telemetry.stage_metrics?.map((metric: any, idx: number) => (
                                        <tr key={`slide-detail-stage-${idx}`} style={{ borderBottom: '1px solid var(--color-pg-border)', color: 'var(--color-pg-text)' }}>
                                            <td style={{ padding: '10px 16px', fontWeight: 800 }}>{metric.stage.toUpperCase()}</td>
                                            <td style={{ padding: '10px 16px', textAlign: 'center' }}>{metric.active_items}</td>
                                            <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                {metric.stuck_count > 0 ? <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{metric.stuck_count} stuck</span> : '0'}
                                            </td>
                                            <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                {metric.rework_count > 0 ? <span className="badge" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{metric.rework_count} rework</span> : '0'}
                                            </td>
                                            <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#3b82f6' }}>{metric.avg_cycle_time.toFixed(2)}d</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                        <div style={{ backgroundColor: 'var(--color-pg-surface)', border: '1px solid var(--color-pg-border)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)' }}>
                            <div style={{ width: '100%', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-pg-border)' }}>
                                        <th style={{ textAlign: 'left', padding: '14px 16px', color: 'var(--color-pg-text-muted)' }}>{language === 'id' ? 'Klien' : 'Client'}</th>
                                        <th style={{ textAlign: 'center', padding: '14px 16px', color: 'var(--color-pg-text-muted)' }}>{language === 'id' ? 'PO Aktif' : 'Active POs'}</th>
                                        <th style={{ textAlign: 'center', padding: '14px 16px', color: 'var(--color-pg-text-muted)' }}>{language === 'id' ? 'Ketepatan Waktu' : 'On-Time Rate'}</th>
                                        <th style={{ textAlign: 'center', padding: '14px 16px', color: 'var(--color-pg-text-muted)' }}>{language === 'id' ? 'Item Terlambat' : 'Overdue Items'}</th>
                                        <th style={{ textAlign: 'center', padding: '14px 16px', color: 'var(--color-pg-text-muted)' }}>{language === 'id' ? 'Belum Faktur' : 'Uninvoiced'}</th>
                                        <th style={{ textAlign: 'center', padding: '14px 16px', color: 'var(--color-pg-text-muted)' }}>{language === 'id' ? 'Belum Bayar' : 'Unpaid'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {telemetry.client_health?.map((client: any, idx: number) => {
                                        const otdrColor = client.on_time_rate == null ? 'var(--color-pg-text-muted)' : client.on_time_rate >= 80 ? 'var(--color-pg-success)' : client.on_time_rate >= 60 ? 'var(--color-pg-warning)' : 'var(--color-pg-danger)';
                                        return (
                                            <tr key={`slide-client-${idx}`} style={{ borderBottom: '1px solid var(--color-pg-border)', color: 'var(--color-pg-text)' }}>
                                                <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: '15px' }}>{client.client_name}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--color-pg-text-secondary)' }}>{client.active_pos}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: otdrColor }}>
                                                    {client.on_time_rate != null ? `${client.on_time_rate}%` : 'N/A'}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    {client.overdue_items > 0 ? <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 800 }}>{client.overdue_items}</span> : <span style={{ color: '#34d399', fontWeight: 800 }}>✓</span>}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    {client.uninvoiced_count > 0 ? <span className="badge" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontWeight: 800 }}>{client.uninvoiced_count}</span> : <span style={{ color: '#34d399', fontWeight: 800 }}>✓</span>}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    {client.unpaid_count > 0 ? <span className="badge" style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#fb923c', padding: '4px 8px', borderRadius: '4px', fontWeight: 800 }}>{client.unpaid_count}</span> : <span style={{ color: '#34d399', fontWeight: 800 }}>✓</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                const stuckItems = telemetry.delayed_items || [];
                return (
                    <div style={{ flex: 1, display: 'flex', gap: '30px', maxWidth: '1100px', margin: '0 auto', width: '100%', height: '100%', overflow: 'hidden' }}>
                        <div style={{ flex: 1, backgroundColor: 'var(--color-pg-surface)', border: '1px solid var(--color-pg-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-pg-danger)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>⚠️</span> {language === 'id' ? 'Hambatan & Keterlambatan' : 'Stuck & Overdue Items'}
                            </h4>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                                {stuckItems.length === 0 ? (
                                    <div style={{ color: 'var(--color-pg-text-muted)', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>{language === 'id' ? 'Tidak ada hambatan aktif.' : 'No active delays.'}</div>
                                ) : stuckItems.map((item: any, idx: number) => (
                                    <div key={`slide-action-stuck-${idx}`} style={{ backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 800, color: 'var(--color-pg-text)', fontSize: '13px' }}>{item.po_number} · {item.client_name}</span>
                                            <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--color-pg-danger)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>{item.days_overdue}d delay</span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', fontWeight: 600 }}>{item.item_name} ({Math.round(item.progress_percent)}%)</div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-pg-danger)', marginTop: '6px', fontStyle: 'italic', fontWeight: 500 }}>{item.reason}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ flex: 1, backgroundColor: 'var(--color-pg-surface)', border: '1px solid var(--color-pg-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#fbbf24', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>💼</span> {language === 'id' ? 'Pekerjaan Selesai Belum Difakturkan' : 'Finished Items Not Yet Invoiced'}
                            </h4>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                                {((telemetry.finance_health?.uninvoiced_count || 0) === 0) ? (
                                    <div style={{ color: 'var(--color-pg-text-muted)', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>
                                        {language === 'id' ? 'Semua pekerjaan selesai sudah difakturkan.' : 'All finished items have been invoiced.'}
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--color-pg-text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                                        {language === 'id' ? (
                                            <p>Terdapat <strong>{telemetry.finance_health.uninvoiced_count}</strong> item pesanan selesai yang perlu diterbitkan invoice oleh bagian Keuangan.</p>
                                        ) : (
                                            <p>There are <strong>{telemetry.finance_health.uninvoiced_count}</strong> completed item(s) awaiting invoice issuance by Finance.</p>
                                        )}
                                        <button
                                            onClick={() => { togglePresentationMode(); changeTab('completed'); }}
                                            style={{ marginTop: '12px', backgroundColor: '#fbbf24', color: '#09090b', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                        >
                                            {language === 'id' ? 'Buka Status Keuangan' : 'Open Finance Status'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 4:
                const ongoingPos = [...pos]
                    .filter((p: any) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED')
                    .sort((a: any, b: any) => new Date(a.global_deadline).getTime() - new Date(b.global_deadline).getTime());

                return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '1300px', margin: '0 auto', width: '100%', height: '100%', overflow: 'hidden' }}>
                        <div style={{
                            flex: 1,
                            backgroundColor: 'var(--color-pg-surface)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '20px',
                            padding: '28px',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(16px)',
                            overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-pg-border)', paddingBottom: '14px' }}>
                                <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-pg-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span>⚙️</span>
                                    <span>{language === 'id' ? 'Daftar PO Berjalan & Status Pengerjaan Pabrik' : 'Ongoing POs & Live Factory Status'}</span>
                                </h4>
                                <span style={{ backgroundColor: 'var(--color-pg-primary, #6366f1)22', color: 'var(--color-pg-primary, #818cf8)', border: '1px solid var(--color-pg-primary, #6366f1)44', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
                                    {ongoingPos.length} {language === 'id' ? 'PO Aktif' : 'Active POs'}
                                </span>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
                                {ongoingPos.length === 0 ? (
                                    <div style={{ color: 'var(--color-pg-text-muted)', fontSize: '15px', padding: '60px 0', textAlign: 'center', fontWeight: 600 }}>
                                        {language === 'id' ? 'Tidak ada PO aktif saat ini.' : 'No ongoing POs at this time.'}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {ongoingPos.map((po: any, idx: number) => {
                                            const progress = Math.round(po.items?.length > 0 ? po.items.reduce((sum: number, item: any) => sum + (parseFloat(item.progress_percent) || 0), 0) / po.items.length : 0);
                                            const deadline = new Date(po.global_deadline);
                                            const diffTime = deadline.getTime() - new Date().setHours(0,0,0,0);
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                            let statusBadge = { label: language === 'id' ? 'AMAN' : 'ON TRACK', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '#10b98155' };
                                            if (diffDays < 0) {
                                                statusBadge = { label: language === 'id' ? 'TERLAMBAT' : 'DELAYED', bg: 'rgba(239, 68, 68, 0.18)', color: '#ef4444', border: '#ef444455' };
                                            } else if (diffDays <= 3) {
                                                statusBadge = { label: language === 'id' ? 'RAWAN' : 'AT RISK', bg: 'rgba(245, 158, 11, 0.18)', color: '#f59e0b', border: '#f59e0b55' };
                                            }

                                            return (
                                                <div key={`slide-po-${po.id || idx}`} style={{
                                                    backgroundColor: 'var(--color-pg-bg)',
                                                    border: '1px solid var(--color-pg-border)',
                                                    borderRadius: '14px',
                                                    padding: '16px 20px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '20px',
                                                    transition: 'all 0.2s',
                                                }}>
                                                    {/* Left: PO & Client */}
                                                    <div style={{ flex: '1 1 30%', minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-pg-text)' }}>
                                                                {po.po_number}
                                                            </span>
                                                            {po.is_urgent && (
                                                                <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase' }}>
                                                                    {language === 'id' ? 'KRITIS / URGENT' : 'URGENT'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: 'var(--color-pg-text-secondary)', fontWeight: 600 }}>
                                                            🏢 {po.client_name}
                                                        </div>
                                                    </div>

                                                    {/* Middle: Deadline & Countdown */}
                                                    <div style={{ flex: '1 1 25%', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-pg-text-muted)', fontWeight: 700, marginBottom: '2px' }}>
                                                            {language === 'id' ? 'Deadline Kirim' : 'Delivery Deadline'}
                                                        </div>
                                                        <div style={{ fontSize: '14px', fontWeight: 800, color: diffDays < 0 ? '#ef4444' : diffDays <= 3 ? '#f59e0b' : 'var(--color-pg-text)' }}>
                                                            {deadline.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            <span style={{ fontSize: '12px', marginLeft: '6px', opacity: 0.9 }}>
                                                                ({diffDays < 0 ? `${Math.abs(diffDays)} ${language === 'id' ? 'hari telat' : 'd late'}` : diffDays === 0 ? (language === 'id' ? 'Hari ini' : 'Today') : `${diffDays} ${language === 'id' ? 'hari lagi' : 'd left'}`})
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Middle: Progress bar */}
                                                    <div style={{ flex: '1 1 25%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                                                            <span style={{ color: 'var(--color-pg-text-secondary)' }}>{language === 'id' ? 'Progres Order' : 'Progress'}</span>
                                                            <span style={{ color: 'var(--color-pg-primary, #818cf8)' }}>{progress}%</span>
                                                        </div>
                                                        <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--color-pg-border)', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{
                                                                height: '100%',
                                                                width: `${progress}%`,
                                                                background: progress >= 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
                                                                borderRadius: '4px',
                                                                transition: 'width 0.5s ease'
                                                            }} />
                                                        </div>
                                                    </div>

                                                    {/* Right: Condition Status Badge */}
                                                    <div style={{ flex: '0 0 120px', textAlign: 'right' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            backgroundColor: statusBadge.bg,
                                                            color: statusBadge.color,
                                                            border: `1px solid ${statusBadge.border}`,
                                                            padding: '6px 14px',
                                                            borderRadius: '8px',
                                                            fontSize: '12px',
                                                            fontWeight: 800,
                                                            letterSpacing: '0.04em',
                                                            textAlign: 'center',
                                                            boxShadow: `0 0 12px ${statusBadge.color}22`
                                                        }}>
                                                            {statusBadge.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--color-pg-bg)',
            zIndex: 99999,
            color: 'var(--color-pg-text)',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-pg-border)', paddingBottom: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {tenant?.logo_path && (
                            <img src={tenant.logo_path} alt="Logo" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
                        )}
                        <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>
                            {tenant?.company_name || 'POgrid.id'}
                        </span>
                        <span style={{ backgroundColor: 'var(--color-pg-surface)', border: '1px solid var(--color-pg-border)', color: 'var(--color-pg-text-secondary)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                            {rangeLabel}
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', marginTop: '4px', fontWeight: 500 }}>
                        {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' · '}
                        {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-pg-primary-hover)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {presentationSlide === 0 ? (language === 'id' ? 'Ringkasan Kinerja' : 'Performance Summary') :
                         presentationSlide === 1 ? (language === 'id' ? 'Alur Produksi' : 'Production Pipeline') :
                         presentationSlide === 2 ? (language === 'id' ? 'Kinerja Klien' : 'Client Board') :
                         presentationSlide === 3 ? (language === 'id' ? 'Tindakan Diperlukan' : 'Action Items') :
                         (language === 'id' ? 'Status PO Berjalan' : 'Ongoing PO Status')}
                    </div>
                    <button
                        onClick={togglePresentationMode}
                        style={{
                            background: 'var(--color-pg-surface)',
                            color: 'var(--color-pg-text-secondary)',
                            border: '1px solid var(--color-pg-border)',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                        }}
                    >
                        {language === 'id' ? 'Keluar' : 'Exit'} (ESC)
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 0' }}>
                {renderSlide()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-pg-border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => setPresentationSlide(prev => (prev - 1 + 4) % 4)}
                        style={{ background: 'var(--color-pg-surface)', color: '#fff', border: '1px solid var(--color-pg-border)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                        ◀ {language === 'id' ? 'Sebelumnya' : 'Prev'}
                    </button>
                    <button
                        onClick={() => setPresentationSlide(prev => (prev + 1) % 4)}
                        style={{ background: 'var(--color-pg-surface)', color: '#fff', border: '1px solid var(--color-pg-border)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                        {language === 'id' ? 'Selanjutnya' : 'Next'} ▶
                    </button>
                    <button
                        onClick={() => setPresentationAutoPlay(prev => !prev)}
                        style={{
                            background: presentationAutoPlay ? 'rgba(16,185,129,0.15)' : 'var(--color-pg-surface)',
                            color: presentationAutoPlay ? '#34d399' : 'var(--color-pg-text-secondary)',
                            border: presentationAutoPlay ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--color-pg-border)',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span style={{ width: '8px', height: '8px', backgroundColor: presentationAutoPlay ? '#34d399' : '#71717a', borderRadius: '50%', display: 'inline-block' }} />
                        Auto-Play (10s)
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {[0, 1, 2, 3, 4].map(slideIdx => (
                        <button
                            key={`slide-dot-${slideIdx}`}
                            onClick={() => setPresentationSlide(slideIdx)}
                            style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: presentationSlide === slideIdx ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0
                            }}
                        />
                    ))}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--color-pg-text-muted)', fontWeight: 500 }}>
                    {language === 'id' ? 'Gunakan tombol panah untuk navigasi' : 'Use controls or slide indicators to navigate'}
                </div>
            </div>
        </div>
    );
}
