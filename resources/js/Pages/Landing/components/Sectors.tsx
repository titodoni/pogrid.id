import React from 'react';
import { Reveal } from './Reveal';
import { SectionHead } from './SectionHead';
import { CncIcon, FabrikasiIcon, PerakitanIcon } from './icons';
import type { LandingTranslations } from './shared';

interface SectorsProps { t: LandingTranslations; }

export const Sectors: React.FC<SectorsProps> = ({ t }) => {
    const sectorIcons = [
        <CncIcon className="text-blue-700" />,
        <FabrikasiIcon className="text-blue-700" />,
        <PerakitanIcon className="text-blue-700" />,
    ];

    return (
        <section className="border-b border-slate-200 bg-slate-50">
            <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-16 md:py-24">
                <SectionHead num="05" eyebrow={t.sector_eyebrow} title={t.sector_title} sub={t.sector_sub} />

                <Reveal>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-14">
                        {t.proof_items.map((p, i) => (
                            <div key={i} className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow p-7 md:p-9">
                                <div>
                                    <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-blue-50 border border-blue-100 mb-6">
                                        {sectorIcons[i]}
                                    </span>
                                    <div className="mono text-[10px] font-medium tracking-[0.18em] text-slate-400 uppercase mb-2">{t.sector_tag} 0{i + 1}</div>
                                    <h3 className="text-base md:text-lg font-bold text-slate-900 mb-3">{p.t}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{p.d}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Reveal>
            </div>
        </section>
    );
};