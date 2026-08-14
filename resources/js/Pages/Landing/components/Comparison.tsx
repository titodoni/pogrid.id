import React from 'react';
import { Reveal } from './Reveal';
import { SectionHead } from './SectionHead';
import { Check, Cross } from './icons';
import type { LandingTranslations } from './shared';

interface ComparisonProps { t: LandingTranslations; }

export const Comparison: React.FC<ComparisonProps> = ({ t }) => (
    <section className="border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-16 md:py-24">
            <SectionHead num="04" eyebrow={t.compare_eyebrow} title={t.compare_title} sub={t.compare_sub} />

            <Reveal>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full min-w-[640px] text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="mono py-4 px-6 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 w-[34%]">{t.compare_aspect}</th>
                                <th className="mono py-4 px-6 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                                    {t.compare_cols[0]}
                                </th>
                                <th className="mono py-4 px-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-800 bg-blue-50/60 border-l-2 border-l-blue-700">
                                    {t.compare_cols[1]}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {t.compare_rows.map((r, i) => (
                                <tr key={i} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                                    <td className="py-4 px-6 text-sm font-semibold text-slate-800">{r.label}</td>
                                    <td className="py-4 px-6 text-sm text-slate-500">
                                        <span className="inline-flex items-start gap-2.5">
                                            <span className="mt-0.5 w-5 h-5 rounded-[2px] bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                                                <Cross size={10} className="text-red-500" />
                                            </span>
                                            {r.bad}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-slate-700 bg-blue-50/30 border-l-2 border-l-blue-700">
                                        <span className="inline-flex items-start gap-2.5">
                                            <span className="mt-0.5 w-5 h-5 rounded-[2px] bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                                                <Check size={10} className="text-emerald-600" />
                                            </span>
                                            {r.good}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Reveal>
        </div>
    </section>
);
