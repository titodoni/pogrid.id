import React from 'react';
import { Reveal } from './Reveal';
import { ShieldIcon, ServerIcon, ClockIcon, CardIcon } from './icons';
import type { LandingTranslations } from './shared';

interface TrustBandProps { t: LandingTranslations; }

export const TrustBand: React.FC<TrustBandProps> = ({ t }) => {
    const trustIcons = [
        <ShieldIcon className="text-blue-700" />,
        <ServerIcon className="text-blue-700" />,
        <ClockIcon className="text-blue-700" />,
        <CardIcon className="text-blue-700" />,
    ];

    return (
        <section className="border-b border-slate-200">
            <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-12 md:py-16">
                <Reveal>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                        {t.trust_items.map((item, i) => (
                            <div key={i} className="flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                                <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center" aria-hidden="true">
                                    {trustIcons[i]}
                                </span>
                                <div>
                                    <div className="text-sm font-bold text-slate-900 mb-1">{item.t}</div>
                                    <div className="text-[12px] text-slate-500 leading-snug">{item.d}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Reveal>
            </div>
        </section>
    );
};