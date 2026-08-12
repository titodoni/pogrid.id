import React from 'react';

export default function ProductionPipeline({
    language,
    pipelineStages,
    getStageHealth,
    getHealthKey,
    matrixFilter,
    setMatrixFilter
}: any) {
    const healthDotColor: Record<string, string> = {
        stuck: '#ef4444',
        slow: 'var(--color-pg-orange)',
        watch: 'var(--color-pg-warning)',
        normal: 'var(--color-pg-success)',
    };

    return (
        <>
            {/* ── Production Pipeline ──────────────────────────── */}
                        <div style={{ backgroundColor: 'var(--color-pg-surface)', border: '1px solid var(--color-pg-border)', borderRadius: '16px', padding: '20px', marginBottom: '22px', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
                                <h3 className="section-label-v2" style={{ margin: 0 }}>
                                    {language === 'id' ? 'Alur Produksi' : 'Production Pipeline'}
                                </h3>
                                <span className="section-label-v2__sub">
                                    {language === 'id' ? 'klik tahap untuk filter direktori' : 'click stage to filter directory'}
                                </span>
                            </div>
                            <div className="pipeline-scroll-container" style={{ display: 'flex', overflowX: 'auto', alignItems: 'center', gap: '0', paddingBottom: '8px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                                {pipelineStages.length === 0 ? (
                                    <span style={{ color: 'var(--color-pg-text-muted)', fontSize: '13px' }}>
                                        {language === 'id' ? 'Belum ada data tahap produksi.' : 'No stage data yet.'}
                                    </span>
                                ) : pipelineStages.map((metric: any, idx: number) => {
                                    const health = getStageHealth(metric);
                                    const healthKey = getHealthKey(metric);
                                    const isSelected = matrixFilter?.type === 'stage' && matrixFilter?.value === metric.stage;
                                    return (
                                        <React.Fragment key={`pipeline-${idx}`}>
                                            <div
                                                onClick={() => setMatrixFilter(prev =>
                                                    prev?.type === 'stage' && prev?.value === metric.stage
                                                        ? null
                                                        : { type: 'stage', value: metric.stage, label: language === 'id' ? 'Tahap' : 'Stage' }
                                                )}
                                                className="pipeline-stage-v2"
                                                data-health={healthKey}
                                                data-selected={isSelected ? 'true' : undefined}
                                                style={{
                                                    backgroundColor: health.bg,
                                                    border: isSelected ? '2px solid #3b82f6' : `1px solid ${health.border}`,
                                                }}
                                            >
                                                {/* Mobile: health dot */}
                                                <span className="stage-health-dot-mobile" style={{ background: healthDotColor[healthKey] }} />
                                                {metric.stuck_count > 0 && (
                                                    <span style={{
                                                        position: 'absolute',
                                                        top: '-7px',
                                                        right: '-7px',
                                                        backgroundColor: '#ef4444',
                                                        color: '#fff',
                                                        borderRadius: '50%',
                                                        width: '18px',
                                                        height: '18px',
                                                        fontSize: '10px',
                                                        fontWeight: 800,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '2px solid var(--color-pg-bg)',
                                                    }}>{metric.stuck_count}</span>
                                                )}
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-pg-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                                    {metric.stage}
                                                </div>
                                                <div style={{ fontSize: '20px', fontWeight: 800, color: health.label, lineHeight: 1 }}>
                                                    {metric.active_items}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'var(--color-pg-text-muted)', marginTop: '2px' }}>
                                                    {language === 'id' ? 'item aktif' : 'active'}
                                                </div>
                                                <div style={{ fontSize: '10px', color: health.label, marginTop: '5px', fontWeight: 600, borderTop: `1px solid ${health.border}`, paddingTop: '5px' }}>
                                                    {language === 'id'
                                                        ? `Rata-rata: ${metric.avg_cycle_time > 0 ? `${metric.avg_cycle_time.toFixed(1)} Hari` : '-'}`
                                                        : `Avg: ${metric.avg_cycle_time > 0 ? `${metric.avg_cycle_time.toFixed(1)} Days` : '-'}`
                                                    }
                                                </div>
                                            </div>
                                            {idx < pipelineStages.length - 1 && (
                                                <div className="pipeline-chevron">
                                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                        <path d="M7.5 4.5L13 10L7.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        
        </>
    );
}
