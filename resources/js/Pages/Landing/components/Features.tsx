import React from 'react';
import { Reveal } from './Reveal';
import { SectionHead } from './SectionHead';
import { DashboardIcon, PinIcon, AlertIcon, TvIcon, ErpIcon, LockIcon, Check } from './icons';
import type { LandingTranslations } from './shared';

interface FeaturesProps { t: LandingTranslations; }

export const Features: React.FC<FeaturesProps> = ({ t }) => {
    const featureIcons = [
        <DashboardIcon />,
        <PinIcon />,
        <AlertIcon />,
        <TvIcon />,
        <ErpIcon />,
        <LockIcon />,
    ];

    return (
        <section id="fitur" className="border-b border-slate-200 bg-surface">
            <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-20 md:py-28">
                <SectionHead num="03" eyebrow={t.feat_eyebrow} title={t.feat_title} sub={t.feat_sub} />

                <Reveal>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {t.features.map((f, i) => (
                            <div key={i} className="card card-hover rounded-2xl p-8 md:p-9">
                                <div className="flex items-start justify-between mb-7">
                                    <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-700">
                                        {featureIcons[i] || <Check size={24} />}
                                    </span>
                                    <span className="mono text-[11px] font-medium tracking-[0.14em] text-slate-400">F.0{i + 1}</span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">{f.t}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{f.d}</p>
                            </div>
                        ))}
                    </div>
                </Reveal>
            </div>
        </section>
    );
};
