import React from 'react';

export interface MatrixFilterType {
    type: string;
    value: string | number;
    label: string;
}

export interface DashboardMetricsProps {
    language: string;
    t: any;
    rangeLabel: string;
    narrative: string;
    telemetry: any;
    setMatrixFilter: React.Dispatch<React.SetStateAction<MatrixFilterType | null>>;
    matrixFilter: MatrixFilterType | null;
    otdrDelta: number | null;
    deliveredCurr: number;
    deliveredDelta: number | null;
    delayDays: number;
    delayColor: string;
    delayDisplay: string;
    delayDelta: number | null;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
    language,
    t,
    rangeLabel,
    narrative,
    telemetry,
    setMatrixFilter,
    matrixFilter,
    otdrDelta,
    deliveredCurr,
    deliveredDelta,
    delayDays,
    delayColor,
    delayDisplay,
    delayDelta
}) => {
    return (
        <>
            {/* ── Executive Banner ──────────────────────────────── */}
            <div className="exec-banner">
                <div className="exec-banner__accent" />
                <div className="exec-banner__body">
                    <div className="exec-banner__label">
                        {language === 'id' ? 'Ringkasan Kinerja' : 'Performance Summary'} · {rangeLabel.toUpperCase()}
                    </div>
                    <p className="exec-banner__text">{narrative}</p>
                </div>
            </div>

            {/* ── KPI Cards ─────────────────────────────────────── */}
            <div className="kpi-grid-v2">
                {/* OTDR */}
                <div
                    onClick={() => setMatrixFilter(prev =>
                        prev?.type === 'kpi_otdr' ? null : { type: 'kpi_otdr', value: telemetry.otdr != null ? `${telemetry.otdr}%` : 'N/A', label: language === 'id' ? 'Tepat Waktu' : 'On-Time' }
                    )}
                    className="kpi-card-v2"
                    data-variant={telemetry.otdr == null ? 'neutral' : telemetry.otdr >= 80 ? 'success' : telemetry.otdr >= 60 ? 'warning' : 'danger'}
                    data-selected={matrixFilter?.type === 'kpi_otdr' ? 'true' : undefined}
                >
                    <span className="kpi-label">{t.on_time_delivery}</span>
                    <span className="kpi-value" style={{ color: telemetry.otdr == null ? 'var(--color-pg-text-muted)' : telemetry.otdr >= 80 ? 'var(--color-pg-success)' : telemetry.otdr >= 60 ? 'var(--color-pg-warning)' : '#ef4444' }}>
                        {telemetry.otdr != null ? <>{telemetry.otdr}<span className="kpi-unit">%</span></> : (language === 'id' ? 'N/A' : 'N/A')}
                    </span>
                    {otdrDelta != null && otdrDelta !== 0 && (
                        <span className="kpi-delta" style={{ color: otdrDelta >= 0 ? 'var(--color-pg-success)' : '#ef4444' }}>
                            {otdrDelta >= 0 ? '▲' : '▼'} {Math.abs(otdrDelta)}%{' '}
                            <span className="kpi-delta-vs">vs {rangeLabel}</span>
                        </span>
                    )}
                </div>

                {/* Parts Delivered */}
                <div
                    onClick={() => setMatrixFilter(prev =>
                        prev?.type === 'kpi_parts' ? null : { type: 'kpi_parts', value: `${deliveredCurr} Pcs`, label: language === 'id' ? 'Selesai Diproduksi' : 'Delivered Manufactured' }
                    )}
                    className="kpi-card-v2"
                    data-variant="info"
                    data-selected={matrixFilter?.type === 'kpi_parts' ? 'true' : undefined}
                >
                    <span className="kpi-label">{t.parts_manufactured}</span>
                    <span className="kpi-value" style={{ color: '#3b82f6' }}>
                        {deliveredCurr} <span className="kpi-sub">/ {telemetry.manufacture?.target ?? 0} Pcs</span>
                    </span>
                    {deliveredDelta != null && deliveredDelta !== 0 && (
                        <span className="kpi-delta" style={{ color: deliveredDelta >= 0 ? 'var(--color-pg-success)' : '#ef4444' }}>
                            {deliveredDelta >= 0 ? '▲' : '▼'} {Math.abs(deliveredDelta)}%{' '}
                            <span className="kpi-delta-vs">vs {rangeLabel}</span>
                        </span>
                    )}
                </div>

                {/* Avg Delay */}
                <div
                    onClick={() => setMatrixFilter(prev =>
                        prev?.type === 'kpi_delay' ? null : { type: 'kpi_delay', value: `${telemetry.avg_delay_days} hari`, label: language === 'id' ? 'Keterlambatan' : 'Overdue' }
                    )}
                    className="kpi-card-v2"
                    data-variant={delayDays <= 0 ? 'success' : delayDays <= 3 ? 'warning' : 'danger'}
                    data-selected={matrixFilter?.type === 'kpi_delay' ? 'true' : undefined}
                >
                    <span className="kpi-label">{t.avg_delay}</span>
                    <span className="kpi-value" style={{ color: delayColor }}>
                        {delayDisplay}
                    </span>
                    {delayDelta != null && delayDelta !== 0 && (
                        <span className="kpi-delta" style={{ color: delayDelta <= 0 ? 'var(--color-pg-success)' : '#ef4444' }}>
                            {delayDelta >= 0 ? '▲' : '▼'} {Math.abs(delayDelta)}{' '}
                            <span className="kpi-delta-vs">vs {rangeLabel}</span>
                        </span>
                    )}
                </div>

                {/* Urgent Active POs */}
                <div
                    onClick={() => setMatrixFilter(prev =>
                        prev?.type === 'kpi_urgent' ? null : { type: 'kpi_urgent', value: `${telemetry.urgent_active || 0} PO`, label: language === 'id' ? 'Mendesak' : 'Urgent' }
                    )}
                    className="kpi-card-v2"
                    data-variant={(telemetry.urgent_active || 0) > 0 ? 'danger' : 'success'}
                    data-selected={matrixFilter?.type === 'kpi_urgent' ? 'true' : undefined}
                >
                    <span className="kpi-label">
                        {language === 'id' ? 'PO Mendesak Aktif' : 'Urgent Active POs'}
                    </span>
                    <span className="kpi-value" style={{ color: (telemetry.urgent_active || 0) > 0 ? '#ef4444' : 'var(--color-pg-success)' }}>
                        {telemetry.urgent_active || 0}
                    </span>
                    <span className="kpi-delta" style={{ color: 'var(--color-pg-text-muted)' }}>
                        {(telemetry.urgent_active || 0) > 0
                            ? (language === 'id' ? 'Butuh perhatian segera' : 'Needs immediate attention')
                            : (language === 'id' ? 'Tidak ada PO mendesak' : 'No urgent POs')}
                    </span>
                </div>
            </div>
        </>
    );
};
