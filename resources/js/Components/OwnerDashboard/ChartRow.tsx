import React from 'react';

interface Props {
    t: any;
    language: 'en' | 'id';
    telemetry: any;
    matrixFilter: any;
    setMatrixFilter: React.Dispatch<React.SetStateAction<any>>;
}

export function ChartRow({ t, language, telemetry, matrixFilter, setMatrixFilter }: Props) {
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5 mb-5.5">
            {/* Output and Overdue Trends */}
            <div className="bg-pg-surface border border-pg-border rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.03)]">
                <h3 className="section-label-v2" style={{ marginBottom: '16px' }}>{t.production_overdue_trends}</h3>
                <div className="w-full overflow-x-auto">
                    <svg width="100%" height="200" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                        <line x1="40" y1="20" x2="480" y2="20" stroke="var(--color-pg-border-subtle)" strokeDasharray="3,3" />
                        <line x1="40" y1="70" x2="480" y2="70" stroke="var(--color-pg-border-subtle)" strokeDasharray="3,3" />
                        <line x1="40" y1="120" x2="480" y2="120" stroke="var(--color-pg-border-subtle)" strokeDasharray="3,3" />
                        <line x1="40" y1="170" x2="480" y2="170" stroke="var(--color-pg-border)" />
                        {(() => {
                            const trend = telemetry.trend_data || [];
                            const maxY = Math.max(...trend.map((d: any) => Math.max(d.output, d.overdue)), 5);
                            const count = trend.length;
                            const width = 440;
                            const chartHeight = 150;
                            const topOffset = 20;
                            const leftOffset = 40;
                            const bars = trend.map((d: any, idx: number) => {
                                const step = width / count;
                                const barWidth = Math.max(step * 0.4, 10);
                                const x = leftOffset + idx * step + (step - barWidth) / 2;
                                const barHeight = (d.output / maxY) * chartHeight;
                                const y = topOffset + chartHeight - barHeight;
                                return (
                                    <g key={`bar-${idx}`} className="group cursor-pointer">
                                        <rect x={x} y={y} width={barWidth} height={barHeight} fill="#3b82f6" rx="2" style={{ transition: 'all 0.3s' }} className="hover:opacity-80" />
                                        <title>{`${d.label}: ${d.output} Pcs`}</title>
                                        <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fill="var(--color-pg-text-secondary)" fontSize="8" fontWeight="600">{d.output}</text>
                                    </g>
                                );
                            });
                            const linePoints = trend.map((d: any, idx: number) => {
                                const step = width / count;
                                const x = leftOffset + idx * step + step / 2;
                                const y = topOffset + chartHeight - (d.overdue / maxY) * chartHeight;
                                return { x, y, val: d.overdue, label: d.label };
                            });
                            let pathD = '';
                            if (linePoints.length > 0) {
                                pathD = `M ${linePoints[0].x} ${linePoints[0].y} ` + linePoints.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(' ');
                            }
                            const lineAndPoints = (
                                <g>
                                    {pathD && <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />}
                                    {linePoints.map((p: any, idx: number) => (
                                        <g key={`pt-${idx}`} className="group cursor-pointer">
                                            <circle cx={p.x} cy={p.y} r="4" fill="#ef4444" stroke="var(--color-pg-bg)" strokeWidth="1" className="hover:scale-125" style={{ transformOrigin: `${p.x}px ${p.y}px`, transition: 'transform 0.15s ease' }} />
                                            <title>{`${p.label}: ${p.val} PO`}</title>
                                            <text x={p.x} y={p.y - 6} textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="600">{p.val}</text>
                                        </g>
                                    ))}
                                </g>
                            );
                            const labels = trend.map((d: any, idx: number) => {
                                const step = width / count;
                                const x = leftOffset + idx * step + step / 2;
                                return (
                                    <text key={`lbl-${idx}`} x={x} y={topOffset + chartHeight + 15} textAnchor="middle" fill="var(--color-pg-text-muted)" fontSize="9" fontWeight="600">
                                        {d.label}
                                    </text>
                                );
                            });
                            return (
                                <>
                                    {bars}
                                    {lineAndPoints}
                                    {labels}
                                </>
                            );
                        })()}
                    </svg>
                </div>
                <div className="flex gap-4 mt-4 justify-center text-[11px]">
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm" />
                        <span className="text-pg-text-secondary">{t.legend_completed}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-0.5 bg-red-500" />
                        <span className="text-pg-text-secondary">{t.legend_overdue}</span>
                    </div>
                </div>
            </div>
            
            {/* Why Delayed Pie */}
            <div className="bg-pg-surface border border-pg-border rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.03)]">
                <h3 className="section-label-v2" style={{ marginBottom: '16px' }}>{t.why_delayed_reasons}</h3>
                <div className="flex items-center justify-center gap-6 flex-wrap">
                    {(() => {
                        const reasons = telemetry.delay_reasons || {};
                        const total = Object.values(reasons).reduce((a: any, b: any) => a + b, 0) as number;
                        const colors = ['#ef4444', 'var(--color-pg-warning)', '#3b82f6', 'var(--color-pg-success)', '#a855f7', 'var(--color-pg-orange)', 'var(--color-pg-text-muted)'];
                        if (total === 0) {
                            return (
                                <div className="text-pg-text-muted text-sm py-10">
                                    {t.no_incidents}
                                </div>
                            );
                        }
                        const C = 314.159;
                        let accumulatedPercentage = 0;
                        const circles = Object.entries(reasons).map(([key, val]: any, idx: number) => {
                            if (val === 0) return null;
                            const pct = (val / total) * 100;
                            const strokeLength = C * (pct / 100);
                            const offset = C - (accumulatedPercentage / 100) * C;
                            accumulatedPercentage += pct;
                            const isSelected = matrixFilter?.type === 'reason' && matrixFilter?.value === key;
                            return (
                                <circle
                                    key={`slice-${idx}`}
                                    cx="60" cy="60" r="50"
                                    fill="transparent"
                                    stroke={colors[idx % colors.length]}
                                    strokeWidth={isSelected ? 18 : 14}
                                    strokeDasharray={`${strokeLength} ${C - strokeLength}`}
                                    strokeDashoffset={offset}
                                    transform="rotate(-90 60 60)"
                                    style={{ transition: 'all 0.3s', cursor: 'pointer', opacity: matrixFilter && !isSelected ? 0.45 : 1 }}
                                    onClick={() => setMatrixFilter((prev: any) =>
                                        prev?.type === 'reason' && prev?.value === key
                                            ? null
                                            : { type: 'reason', value: key, label: language === 'id' ? 'Alasan Kendala' : 'Delay Reason' }
                                    )}
                                />
                            );
                        });
                        return (
                            <>
                                <svg width="120" height="120" viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
                                    {circles}
                                </svg>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {Object.entries(reasons).map(([key, val]: any, idx: number) => {
                                        if (val === 0) return null;
                                        const isSelected = matrixFilter?.type === 'reason' && matrixFilter?.value === key;
                                        return (
                                            <div
                                                key={`legend-${idx}`}
                                                onClick={() => setMatrixFilter((prev: any) =>
                                                    prev?.type === 'reason' && prev?.value === key
                                                        ? null
                                                        : { type: 'reason', value: key, label: language === 'id' ? 'Alasan Kendala' : 'Delay Reason' }
                                                )}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    opacity: matrixFilter && !isSelected ? 0.4 : 1,
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    backgroundColor: isSelected ? 'rgba(37,99,235,0.15)' : 'transparent',
                                                    border: isSelected ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: colors[idx % colors.length], borderRadius: '50%' }} />
                                                <span style={{ color: 'var(--color-pg-text)', fontWeight: 600 }}>{key}: {val}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
