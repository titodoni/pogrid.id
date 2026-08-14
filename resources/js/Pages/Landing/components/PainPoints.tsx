import React from 'react';
import { Reveal } from './Reveal';
import { SectionHead } from './SectionHead';
import type { LandingTranslations } from './shared';

interface PainPointsProps { t: LandingTranslations; }

export const PainPoints: React.FC<PainPointsProps> = ({ t }) => (
    <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-10 md:py-24">
            <SectionHead num="01" eyebrow={t.pain_eyebrow} title={t.pain_title} sub={t.pain_sub} />

            <Reveal>
                <div className="mb-12 grid gap-4 md:grid-cols-3">
                    {t.pain_items.map((p, i) => (
                        <div key={i} className="card card-hover bg-surface rounded-2xl border border-slate-200 p-6 shadow-sm md:p-7">
                            <div className="mono mb-8 flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[12px] font-semibold text-blue-700">
                                0{i + 1}
                            </div>
                            <h3 className="mb-3 text-base font-bold leading-snug text-slate-900 md:text-lg">{p.q}</h3>
                            <p className="text-sm leading-relaxed text-slate-500">{p.a}</p>
                        </div>
                    ))}
                </div>
            </Reveal>

            <Reveal>
                <div className="card bg-surface rounded-2xl border border-blue-100 p-6 shadow-lg shadow-blue-900/5 md:p-8">
                    <div className="mono mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                        POgrid.id
                    </div>
                    <p className="max-w-3xl text-sm font-semibold leading-relaxed text-slate-800 md:text-base">
                        {t.pain_solution}
                    </p>
                </div>
            </Reveal>
        </div>
    </section>
);
