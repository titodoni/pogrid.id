import React, { useState } from 'react';

interface Props {
    t: any;
    language: 'en' | 'id';
    telemetry: any;
    matrixFilter: any;
    setMatrixFilter: React.Dispatch<React.SetStateAction<any>>;
}

export function BottleneckDetailTable({ t, language, telemetry, matrixFilter, setMatrixFilter }: Props) {
    const [bottleneckCollapsed, setBottleneckCollapsed] = useState(false);
    const [bottleneckSort, setBottleneckSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'stuck_count', direction: 'desc' });

    const handleBottleneckSort = (key: string) => {
        setBottleneckSort(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    return (
        <div className="bg-pg-surface border border-pg-border rounded-2xl p-5 mb-5.5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="section-label-v2" style={{ margin: 0 }}>{t.bottleneck_analyzer}</h3>
                <button
                    onClick={() => setBottleneckCollapsed(!bottleneckCollapsed)}
                    className="text-xs font-semibold text-pg-text-secondary hover:text-white bg-transparent border border-white/10 hover:border-white/20 rounded-md px-2.5 py-1 cursor-pointer transition-colors"
                >
                    {bottleneckCollapsed
                        ? (language === 'id' ? '▼ Tampilkan' : '▼ Expand')
                        : (language === 'id' ? '▲ Sembunyikan' : '▲ Collapse')
                    }
                </button>
            </div>
            {!bottleneckCollapsed && (
                <div className="mt-4">
                    <div className="w-full overflow-x-auto">
                        <div className="bottleneck-table-container">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-white/8">
                                        <th onClick={() => handleBottleneckSort('stage')} className="text-left px-4 py-2.5 text-pg-text-muted font-semibold cursor-pointer select-none hover:text-white transition-colors">
                                            {t.stage} {bottleneckSort.key === 'stage' ? (bottleneckSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                                        </th>
                                        <th onClick={() => handleBottleneckSort('active_items')} className="text-center px-4 py-2.5 text-pg-text-muted font-semibold cursor-pointer select-none hover:text-white transition-colors">
                                            {t.active_items} {bottleneckSort.key === 'active_items' ? (bottleneckSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                                        </th>
                                        <th onClick={() => handleBottleneckSort('stuck_count')} className="text-center px-4 py-2.5 text-pg-text-muted font-semibold cursor-pointer select-none hover:text-white transition-colors">
                                            {t.stuck_incidents} {bottleneckSort.key === 'stuck_count' ? (bottleneckSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                                        </th>
                                        <th onClick={() => handleBottleneckSort('rework_count')} className="text-center px-4 py-2.5 text-pg-text-muted font-semibold cursor-pointer select-none hover:text-white transition-colors">
                                            {t.rework_count} {bottleneckSort.key === 'rework_count' ? (bottleneckSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                                        </th>
                                        <th onClick={() => handleBottleneckSort('avg_cycle_time')} className="text-right px-4 py-2.5 text-pg-text-muted font-semibold cursor-pointer select-none hover:text-white transition-colors">
                                            {t.avg_cycle_time} {bottleneckSort.key === 'avg_cycle_time' ? (bottleneckSort.direction === 'asc' ? '▲' : '▼') : '↕'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const sortedMetrics = [...(telemetry.stage_metrics || [])].sort((a, b) => {
                                            const key = bottleneckSort.key;
                                            let aVal = a[key] ?? 0;
                                            let bVal = b[key] ?? 0;
                                            if (typeof aVal === 'string') {
                                                return bottleneckSort.direction === 'asc'
                                                    ? aVal.localeCompare(bVal)
                                                    : bVal.localeCompare(aVal);
                                            }
                                            return bottleneckSort.direction === 'asc'
                                                ? aVal - bVal
                                                : bVal - aVal;
                                        });
                                        return sortedMetrics.map((metric: any, idx: number) => (
                                            <tr
                                                key={`stage-${idx}`}
                                                onClick={() => setMatrixFilter((prev: any) =>
                                                    prev?.type === 'stage' && prev?.value === metric.stage
                                                        ? null
                                                        : { type: 'stage', value: metric.stage, label: language === 'id' ? 'Tahap' : 'Stage' }
                                                )}
                                                className="border-b border-pg-border text-pg-text cursor-pointer transition-all duration-200"
                                                style={{
                                                    backgroundColor: matrixFilter?.type === 'stage' && matrixFilter?.value === metric.stage ? 'rgba(37,99,235,0.1)' : 'transparent',
                                                }}
                                            >
                                                <td className="px-4 py-2.5 font-bold">
                                                    <span style={{ color: matrixFilter?.type === 'stage' && matrixFilter?.value === metric.stage ? '#3b82f6' : 'inherit' }}>
                                                        {metric.stage.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">{metric.active_items}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {metric.stuck_count > 0
                                                        ? <span className="badge bg-red-500/15 text-red-500">{metric.stuck_count} stuck</span>
                                                        : '0'}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {metric.rework_count > 0
                                                        ? <span className="badge bg-amber-500/15 text-pg-warning">{metric.rework_count} rework</span>
                                                        : '0'}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-bold text-blue-500">{metric.avg_cycle_time > 0 ? metric.avg_cycle_time.toFixed(1) : "-"}</td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>

                        <div className="bottleneck-mobile-list">
                            {telemetry.stage_metrics && telemetry.stage_metrics.map((metric: any, idx: number) => {
                                const isSelected = matrixFilter?.type === 'stage' && matrixFilter?.value === metric.stage;
                                return (
                                    <div
                                        key={`stage-mobile-${idx}`}
                                        onClick={() => setMatrixFilter((prev: any) =>
                                            prev?.type === 'stage' && prev?.value === metric.stage
                                                ? null
                                                : { type: 'stage', value: metric.stage, label: language === 'id' ? 'Tahap' : 'Stage' }
                                        )}
                                        className="rounded-xl p-3 flex flex-col gap-2 cursor-pointer"
                                        style={{
                                            backgroundColor: isSelected ? 'rgba(37,99,235,0.1)' : 'var(--color-pg-card)',
                                            border: isSelected ? '1px solid #3b82f6' : '1px solid var(--color-pg-border)',
                                        }}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-extrabold text-sm" style={{ color: isSelected ? '#3b82f6' : 'var(--color-pg-text)' }}>
                                                {metric.stage.toUpperCase()}
                                            </span>
                                            <span className="text-xs font-bold text-blue-500">
                                                {metric.avg_cycle_time > 0 ? `${metric.avg_cycle_time.toFixed(1)} ${language === 'id' ? 'Hari' : 'Days'}` : '-'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-[11px] text-pg-text-secondary">
                                            <span>{t.active_items}: <strong>{metric.active_items}</strong></span>
                                            <span>•</span>
                                            <span>
                                                {t.stuck_incidents}: {metric.stuck_count > 0 ? (
                                                    <span className="badge bg-red-500/15 text-red-500 text-[10px] px-1.5 py-px">
                                                        {metric.stuck_count} stuck
                                                    </span>
                                                ) : '0'}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {t.rework_count}: {metric.rework_count > 0 ? (
                                                    <span className="badge bg-amber-500/15 text-pg-warning text-[10px] px-1.5 py-px">
                                                        {metric.rework_count} rework
                                                    </span>
                                                ) : '0'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
