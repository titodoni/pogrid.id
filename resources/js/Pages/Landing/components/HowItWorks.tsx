import React from 'react';
import { Reveal } from './Reveal';
import { SectionHead } from './SectionHead';
import { ArrowRight } from './icons';
import type { LandingTranslations } from './shared';

interface HowItWorksProps { t: LandingTranslations; }

export const HowItWorks: React.FC<HowItWorksProps> = ({ t }) => (
    <section id="cara" className="border-b border-slate-200 bg-surface">
        <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-20 md:py-28">
            <SectionHead num="02" eyebrow={t.how_eyebrow} title={t.how_title} sub={t.how_sub} />

            <Reveal>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    {t.steps.map((s, i) => (
                        <div key={i} className="relative">
                            <div className="card card-hover h-full rounded-2xl p-8 md:p-9">
                                <div className="flex items-center justify-between mb-8">
                                    <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 mono text-xl font-bold">
                                        0{s.n}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-3">{s.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                            </div>
                            {i < t.steps.length - 1 && (
                                <span
                                    className="hidden lg:flex absolute top-1/2 -right-4 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm text-blue-700"
                                    aria-hidden="true"
                                >
                                    <ArrowRight size={16} />
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </Reveal>

            <Reveal>
                <div className="flex items-center gap-4 mt-14">
                    <span className="block h-px flex-1 bg-gradient-to-r from-blue-200 to-transparent" aria-hidden="true" />
                    <p className="text-sm md:text-base text-slate-700 font-semibold">{t.how_outcome}</p>
                    <span className="block h-px flex-1 bg-gradient-to-l from-blue-200 to-transparent" aria-hidden="true" />
                </div>
            </Reveal>
        </div>
    </section>
);
