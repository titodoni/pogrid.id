import React from 'react';

interface Telemetry {
    otdr: number;
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
}: Props) {
    const prev = (telemetry.previous || {}) as any;
    const rangeLabel = selected_range === 'week' ? t.this_week : selected_range === 'year' ? t.this_year : t.this_month;
    const otdrDelta: number | null = prev.otdr != null ? Math.round((telemetry.otdr - prev.otdr) * 10) / 10 : null;
    const deliveredCurr: number = telemetry.manufacture?.delivered ?? telemetry.manufacture?.completed ?? 0;
    const deliveredPrev: number = prev.manufacture?.delivered ?? 0;
    const deliveredDelta: number | null = deliveredPrev > 0 ? Math.round(((deliveredCurr - deliveredPrev) / deliveredPrev) * 100) : null;
    const delayDelta: number | null = prev.avg_delay_days != null ? Math.round((telemetry.avg_delay_days - prev.avg_delay_days) * 10) / 10 : null;

    const topStuck = [...(telemetry.stage_metrics || [])]
        .sort((a: any, b: any) => b.stuck_count - a.stuck_count)
        .find((m: any) => m.stuck_count > 0);

    let narrativeText = '';
    if (language === 'id') {
        narrativeText = `Periode ini, pabrik menyelesaikan ${telemetry.otdr}% pesanan tepat waktu`;
        if (otdrDelta != null) {
            narrativeText += otdrDelta >= 0
                ? ` — naik ${Math.abs(otdrDelta)}% dari periode lalu`
                : ` — turun ${Math.abs(otdrDelta)}% dari periode lalu`;
        }
        narrativeText += '. ';
        if (topStuck) {
            narrativeText += `Bottleneck utama ada di tahap ${topStuck.stage} (${topStuck.stuck_count} macet, rata-rata ${topStuck.avg_cycle_time} hari/item). `;
        } else {
            narrativeText += 'Semua tahap produksi berjalan normal. ';
        }
        if ((telemetry.urgent_active || 0) > 0) {
            narrativeText += `Terdapat ${telemetry.urgent_active} PO mendesak yang masih aktif. `;
        }
        if ((telemetry.finance_health?.uninvoiced_count || 0) > 0) {
            narrativeText += `${telemetry.finance_health.uninvoiced_count} item selesai belum difakturkan.`;
        }
    } else {
        narrativeText = `This period, the factory completed ${telemetry.otdr}% of orders on time`;
        if (otdrDelta != null) {
            narrativeText += otdrDelta >= 0
                ? ` — up ${Math.abs(otdrDelta)}% vs last period`
                : ` — down ${Math.abs(otdrDelta)}% vs last period`;
        }
        narrativeText += '. ';
        if (topStuck) {
            narrativeText += `Top bottleneck: ${topStuck.stage} stage (${topStuck.stuck_count} stuck, avg ${topStuck.avg_cycle_time} days/item). `;
        } else {
            narrativeText += 'All production stages running normally. ';
        }
        if ((telemetry.urgent_active || 0) > 0) {
            narrativeText += `${telemetry.urgent_active} urgent PO(s) still active. `;
        }
        if ((telemetry.finance_health?.uninvoiced_count || 0) > 0) {
            narrativeText += `${telemetry.finance_health.uninvoiced_count} completed item(s) not yet invoiced.`;
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
                            <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                                {language === 'id' ? 'RINGKASAN OPERASIONAL' : 'OPERATIONAL SUMMARY'}
                            </div>
                            <p style={{ fontSize: '20px', color: '#e4e4e7', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>
                                {narrativeText}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                            <div style={{ backgroundColor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    {t.on_time_delivery}
                                </div>
                                <div style={{ fontSize: '48px', fontWeight: 900, color: telemetry.otdr >= 80 ? '#34d399' : telemetry.otdr >= 60 ? '#fbbf24' : '#ef4444' }}>
                                    {telemetry.otdr}%
                                </div>
                                {otdrDelta != null && (
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: otdrDelta >= 0 ? '#34d399' : '#ef4444', marginTop: '6px' }}>
                                        {otdrDelta >= 0 ? '▲' : '▼'} {Math.abs(otdrDelta)}% vs prev
                                    </div>
                                )}
                            </div>

                            <div style={{ backgroundColor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    {t.parts_manufactured}
                                </div>
                                <div style={{ fontSize: '38px', fontWeight: 900, color: '#3b82f6', marginTop: '10px' }}>
                                    {deliveredCurr} <span style={{ fontSize: '18px', color: '#52525b', fontWeight: 700 }}>/ {telemetry.manufacture?.target ?? 0}</span>
                                </div>
                                {deliveredDelta != null && (
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: deliveredDelta >= 0 ? '#34d399' : '#ef4444', marginTop: '12px' }}>
                                        {deliveredDelta >= 0 ? '▲' : '▼'} {Math.abs(deliveredDelta)}% vs prev
                                    </div>
                                )}
                            </div>

                            <div style={{ backgroundColor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    {t.avg_delay}
                                </div>
                                <div style={{ fontSize: '38px', fontWeight: 900, color: telemetry.avg_delay_days === 0 ? '#34d399' : telemetry.avg_delay_days <= 3 ? '#fbbf24' : '#ef4444', marginTop: '10px' }}>
                                    {telemetry.avg_delay_days} <span style={{ fontSize: '18px', color: '#52525b', fontWeight: 700 }}>{language === 'id' ? 'Hari' : 'Days'}</span>
                                </div>
                                {delayDelta != null && (
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: delayDelta <= 0 ? '#34d399' : '#ef4444', marginTop: '12px' }}>
                                        {delayDelta >= 0 ? '▲' : '▼'} {Math.abs(delayDelta)} vs prev
                                    </div>
                                )}
                            </div>

                            <div style={{ backgroundColor: 'rgba(15,23,42,0.6)', border: `1px solid ${(telemetry.urgent_active || 0) > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    {language === 'id' ? 'PO Mendesak' : 'Urgent Active POs'}
                                </div>
                                <div style={{ fontSize: '48px', fontWeight: 900, color: (telemetry.urgent_active || 0) > 0 ? '#ef4444' : '#34d399' }}>
                                    {telemetry.urgent_active || 0}
                                </div>
                                <div style={{ fontSize: '12px', color: '#52525b', marginTop: '6px', fontWeight: 600 }}>
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
                                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                                                {metric.stage}
                                            </div>
                                            <div style={{ fontSize: '32px', fontWeight: 900, color: health.label, lineHeight: 1 }}>
                                                {metric.active_items}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#52525b', marginTop: '4px' }}>
                                                {language === 'id' ? 'item aktif' : 'active items'}
                                            </div>
                                            {metric.avg_cycle_time > 0 && (
                                                <div style={{ fontSize: '11px', color: health.label, marginTop: '8px', fontWeight: 700, borderTop: `1px solid ${health.border}`, paddingTop: '8px' }}>
                                                    {metric.avg_cycle_time}d avg
                                                </div>
                                            )}
                                        </div>
                                        {idx < pipelineStages.length - 1 && (
                                            <div style={{ color: '#27272a', fontSize: '36px', userSelect: 'none' }}>→</div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        <div style={{ backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px' }}>
                            <div style={{ width: '100%', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px 16px', color: '#71717a' }}>{t.stage}</th>
                                        <th style={{ textAlign: 'center', padding: '12px 16px', color: '#71717a' }}>{t.active_items}</th>
                                        <th style={{ textAlign: 'center', padding: '12px 16px', color: '#71717a' }}>{t.stuck_incidents}</th>
                                        <th style={{ textAlign: 'center', padding: '12px 16px', color: '#71717a' }}>{t.rework_count}</th>
                                        <th style={{ textAlign: 'right', padding: '12px 16px', color: '#71717a' }}>{t.avg_cycle_time}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {telemetry.stage_metrics?.map((metric: any, idx: number) => (
                                        <tr key={`slide-detail-stage-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e4e4e7' }}>
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
                        <div style={{ backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px' }}>
                            <div style={{ width: '100%', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ textAlign: 'left', padding: '14px 16px', color: '#71717a' }}>{language === 'id' ? 'Klien' : 'Client'}</th>
                                        <th style={{ textAlign: 'center', padding: '14px 16px', color: '#71717a' }}>{language === 'id' ? 'PO Aktif' : 'Active POs'}</th>
                                        <th style={{ textAlign: 'center', padding: '14px 16px', color: '#71717a' }}>{language === 'id' ? 'Ketepatan Waktu' : 'On-Time Rate'}</th>
                                        <th style={{ textAlign: 'center', padding: '14px 16px', color: '#71717a' }}>{language === 'id' ? 'Item Terlambat' : 'Overdue Items'}</th>
                                        <th style={{ textAlign: 'center', padding: '14px 16px', color: '#71717a' }}>{language === 'id' ? 'Belum Faktur' : 'Uninvoiced'}</th>
                                        <th style={{ textAlign: 'center', padding: '14px 16px', color: '#71717a' }}>{language === 'id' ? 'Belum Bayar' : 'Unpaid'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {telemetry.client_health?.map((client: any, idx: number) => {
                                        const otdrColor = client.on_time_rate == null ? '#71717a' : client.on_time_rate >= 80 ? '#34d399' : client.on_time_rate >= 60 ? '#fbbf24' : '#ef4444';
                                        return (
                                            <tr key={`slide-client-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e4e4e7' }}>
                                                <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: '15px' }}>{client.client_name}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center', color: '#a1a1aa' }}>{client.active_pos}</td>
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
                        <div style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ef4444', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>⚠️</span> {language === 'id' ? 'Hambatan & Keterlambatan' : 'Stuck & Overdue Items'}
                            </h4>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                                {stuckItems.length === 0 ? (
                                    <div style={{ color: '#71717a', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>{language === 'id' ? 'Tidak ada hambatan aktif.' : 'No active delays.'}</div>
                                ) : stuckItems.map((item: any, idx: number) => (
                                    <div key={`slide-action-stuck-${idx}`} style={{ backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 800, color: '#fafafa', fontSize: '13px' }}>{item.po_number} · {item.client_name}</span>
                                            <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>{item.days_overdue}d delay</span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>{item.item_name} ({Math.round(item.progress_percent)}%)</div>
                                        <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px', fontStyle: 'italic', fontWeight: 500 }}>{item.reason}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#fbbf24', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>💼</span> {language === 'id' ? 'Pekerjaan Selesai Belum Difakturkan' : 'Finished Items Not Yet Invoiced'}
                            </h4>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                                {((telemetry.finance_health?.uninvoiced_count || 0) === 0) ? (
                                    <div style={{ color: '#71717a', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>
                                        {language === 'id' ? 'Semua pekerjaan selesai sudah difakturkan.' : 'All finished items have been invoiced.'}
                                    </div>
                                ) : (
                                    <div style={{ color: '#a1a1aa', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
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
            backgroundColor: '#09090b',
            zIndex: 99999,
            color: '#fafafa',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>POgrid.id</span>
                        <span style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                            {rangeLabel}
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px', fontWeight: 500 }}>
                        {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' · '}
                        {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {presentationSlide === 0 ? (language === 'id' ? 'Ringkasan Kinerja' : 'Performance Summary') :
                         presentationSlide === 1 ? (language === 'id' ? 'Alur Produksi' : 'Production Pipeline') :
                         presentationSlide === 2 ? (language === 'id' ? 'Kinerja Klien' : 'Client Board') :
                         (language === 'id' ? 'Tindakan Diperlukan' : 'Action Items')}
                    </div>
                    <button
                        onClick={togglePresentationMode}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            color: '#a1a1aa',
                            border: '1px solid rgba(255,255,255,0.08)',
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => setPresentationSlide(prev => (prev - 1 + 4) % 4)}
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                        ◀ {language === 'id' ? 'Sebelumnya' : 'Prev'}
                    </button>
                    <button
                        onClick={() => setPresentationSlide(prev => (prev + 1) % 4)}
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                    >
                        {language === 'id' ? 'Selanjutnya' : 'Next'} ▶
                    </button>
                    <button
                        onClick={() => setPresentationAutoPlay(prev => !prev)}
                        style={{
                            background: presentationAutoPlay ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                            color: presentationAutoPlay ? '#34d399' : '#a1a1aa',
                            border: presentationAutoPlay ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
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
                    {[0, 1, 2, 3].map(slideIdx => (
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

                <div style={{ fontSize: '12px', color: '#71717a', fontWeight: 500 }}>
                    {language === 'id' ? 'Gunakan tombol panah untuk navigasi' : 'Use controls or slide indicators to navigate'}
                </div>
            </div>
        </div>
    );
}
