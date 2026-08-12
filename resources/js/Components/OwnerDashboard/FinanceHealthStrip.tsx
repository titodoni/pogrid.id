import React from 'react';

interface Props {
    telemetry: any;
    language: 'en' | 'id';
    matrixFilter: any;
    setMatrixFilter: React.Dispatch<React.SetStateAction<any>>;
}

export function FinanceHealthStrip({ telemetry, language, matrixFilter, setMatrixFilter }: Props) {
    if (!telemetry.finance_health) return null;

    return (
        <div className="flex bg-pg-surface border border-pg-border rounded-xl overflow-hidden mb-5.5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_4px_12px_-2px_rgba(0,0,0,0.03)]">
            <div
                onClick={() => setMatrixFilter((prev: any) =>
                    prev?.type === 'finance_uninvoiced' ? null : { type: 'finance_uninvoiced', value: `${telemetry.finance_health.uninvoiced_count} Items`, label: language === 'id' ? 'Belum Difakturkan' : 'Uninvoiced Items' }
                )}
                className="flex-1 px-5 py-3.5 border-r border-pg-border flex items-center gap-3 cursor-pointer transition-all duration-200"
                style={{
                    backgroundColor: matrixFilter?.type === 'finance_uninvoiced' ? 'rgba(37,99,235,0.1)' : 'transparent',
                }}
              >
                <span className="finance-indicator" style={{ background: 'var(--color-pg-warning)' }} />
                <div>
                    <div className="text-[10px] text-pg-text-muted font-bold uppercase tracking-wider mb-0.5">
                        {language === 'id' ? 'Belum Difakturkan' : 'Uninvoiced Items'}
                    </div>
                    <div className="text-[22px] font-extrabold leading-none"
                        style={{ color: telemetry.finance_health.uninvoiced_count > 0 ? 'var(--color-pg-warning)' : 'var(--color-pg-success)' }}>
                        {telemetry.finance_health.uninvoiced_count}
                    </div>
                </div>
            </div>
            <div
                onClick={() => setMatrixFilter((prev: any) =>
                    prev?.type === 'finance_unpaid' ? null : { type: 'finance_unpaid', value: `${telemetry.finance_health.unpaid_count} Items`, label: language === 'id' ? 'Belum Dibayar' : 'Unpaid Items' }
                )}
                className="flex-1 px-5 py-3.5 flex items-center gap-3 cursor-pointer transition-all duration-200"
                style={{
                    backgroundColor: matrixFilter?.type === 'finance_unpaid' ? 'rgba(37,99,235,0.1)' : 'transparent',
                }}
            >
                <span className="finance-indicator" style={{ background: 'var(--color-pg-orange)' }} />
                <div>
                    <div className="text-[10px] text-pg-text-muted font-bold uppercase tracking-wider mb-0.5">
                        {language === 'id' ? 'Belum Dibayar' : 'Unpaid Items'}
                    </div>
                    <div className="text-[22px] font-extrabold leading-none"
                        style={{ color: telemetry.finance_health.unpaid_count > 0 ? 'var(--color-pg-orange)' : 'var(--color-pg-success)' }}>
                        {telemetry.finance_health.unpaid_count}
                    </div>
                </div>
            </div>
        </div>
    );
}
