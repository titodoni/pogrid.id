import React from 'react';
import { Reveal } from './Reveal';
import { SectionHead } from './SectionHead';
import { ArrowRight, Check } from './icons';
import { appUrl } from './shared';
import type { LandingTranslations } from './shared';

interface PricingProps { t: LandingTranslations; }

export const Pricing: React.FC<PricingProps> = ({ t }) => (
    <section id="harga" className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-16 md:py-24">
            <SectionHead num="06" eyebrow={t.price_eyebrow} title={t.price_title} sub={t.price_sub} />

            <Reveal>
                <div className="price-card relative max-w-[620px] mx-auto overflow-hidden">
                    <div className="p-6 sm:p-8 md:p-12">
                        <div className="mb-8 pb-8 border-b border-slate-100">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                                <div className="mono text-[11px] font-medium uppercase tracking-[0.18em] text-blue-700">{t.plan_name}</div>
                                <span className="mono inline-flex items-center gap-1.5 text-[10px] font-semibold text-white bg-blue-600 rounded-full px-3 py-1.5 uppercase tracking-[0.1em] whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/90" aria-hidden="true" />
                                    {t.plan_badge}
                                </span>
                            </div>
                            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                                <span className="price-amt max-sm:text-[2.5rem] leading-none">{t.plan_price}</span>
                                <span className="mono text-[12px] sm:text-[14px] text-slate-500 font-medium leading-relaxed sm:leading-normal">
                                    {t.plan_period}
                                </span>
                            </div>
                        </div>

                        <p className="text-[15px] text-slate-600 font-medium mb-2">{t.price_feature_label}</p>
                        <p className="text-[13px] text-slate-500 mb-7">{t.plan_trial_note}</p>

                        <ul className="flex flex-col gap-3.5 mb-10">
                            {t.price_features.map((f, i) => (
                                <li key={i} className="flex items-start gap-3 text-[14px] text-slate-700">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mt-px" aria-hidden="true">
                                        <Check size={13} />
                                    </span>
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <a
                            href={appUrl('/register')}
                            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
                        >
                            {t.price_cta}
                            <ArrowRight size={17} />
                        </a>
                        <p className="text-center text-[12px] text-slate-500 mt-4 leading-relaxed px-1">{t.price_annual_note}</p>
                        <div className="mono flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-[10px] sm:text-[11px] text-slate-400 mt-3 uppercase tracking-[0.08em] sm:tracking-[0.1em] text-center">
                            {t.price_note.map((n, i) => (
                                <span key={i} className="inline-flex items-center justify-center gap-1.5">
                                    <Check size={12} className="text-blue-600 shrink-0" />
                                    {n}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </Reveal>
        </div>
    </section>
);
