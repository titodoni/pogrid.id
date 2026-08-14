import React from 'react';
import type { LandingTranslations } from './shared';

interface MarqueeProps { t: LandingTranslations; }

export const Marquee: React.FC<MarqueeProps> = ({ t }) => (
    <section className="overflow-hidden border-b border-slate-200 bg-white py-8" aria-label={t.marquee_label} role="region">
        <p className="mono mb-5 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
            {t.marquee_label}
        </p>
        <div className="marquee-mask">
            <div className="marquee-track flex w-max items-center gap-3 px-2">
                {[...t.marquee_items, ...t.marquee_items].map((m, i) => (
                    <span
                        key={i}
                        className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 shadow-sm"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
                        <span className="mono text-[12px] font-medium uppercase tracking-[0.14em] text-slate-600">{m}</span>
                    </span>
                ))}
            </div>
        </div>
    </section>
);
