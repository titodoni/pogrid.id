import React from 'react';
import { Reveal } from './Reveal';

export const SectionHead: React.FC<{ num?: string; eyebrow: string; title: React.ReactNode; sub?: string }> = ({ num, eyebrow, title, sub }) => (
    <Reveal className="mb-14 md:mb-20">
        <div className="flex items-center gap-4 mb-6">
            {num && <span className="mono text-[11px] font-bold tracking-[0.16em] text-white bg-blue-600 px-2 py-0.5 rounded-full whitespace-nowrap">{num}</span>}
            <span className="mono text-[11px] font-semibold tracking-[0.2em] text-blue-700 uppercase whitespace-nowrap">{eyebrow}</span>
            <span className="flex-1 h-px bg-slate-200" />
        </div>
        <h2 className="landing-display text-3xl md:text-4xl lg:text-[46px] leading-[1.05] font-bold text-slate-900 tracking-[-0.02em] max-w-3xl">{title}</h2>
        {sub && <p className="text-base md:text-lg text-slate-500 leading-relaxed mt-5 max-w-2xl">{sub}</p>}
    </Reveal>
);
