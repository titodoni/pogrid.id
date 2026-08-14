import React from 'react';
import { Reveal } from './Reveal';
import { LangToggle } from './LangToggle';
import { ArrowRight, WhatsAppIcon } from './icons';
import type { Lang, LandingTranslations } from './shared';
import { appUrl, waUrl } from './shared';

interface FinalCtaProps {
    t: LandingTranslations;
    lang: Lang;
    setLang: (l: Lang) => void;
}

export const FinalCta: React.FC<FinalCtaProps> = ({ t, lang, setLang }) => (
    <section className="bg-slate-50">
        <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-16 md:py-24">
            <div className="relative rounded-3xl bg-slate-950 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-3xl" />
                </div>

                <div className="relative px-6 md:px-16 py-14 md:py-20">
                    <Reveal>
                        <div className="flex items-center gap-4 mb-8">
                            <span className="mono text-[11px] font-medium tracking-[0.22em] text-blue-400 uppercase whitespace-nowrap">{t.final_eyebrow}</span>
                            <span className="h-px w-24 bg-white/20" aria-hidden="true" />
                        </div>
                        <h2 className="landing-display text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-5 tracking-tight max-w-3xl">{t.final_title}</h2>
                        <p className="text-sm md:text-base text-slate-400 max-w-xl mb-12">{t.final_sub}</p>

                        <div className="flex flex-wrap gap-3.5 items-center">
                            <a href={appUrl('/register')} className="btn-primary inline-flex items-center gap-2.5 font-semibold text-base px-8 py-4">
                                {t.final_cta}
                                <ArrowRight size={17} />
                            </a>
                            <a
                                href={waUrl(lang)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2.5 text-white font-semibold text-base px-8 py-4 rounded-xl border border-white/20 hover:bg-white/10 transition-colors"
                            >
                                <WhatsAppIcon size={17} />
                                {t.hero_cta_demo}
                            </a>
                            <div className="w-full mt-6">
                                <LangToggle lang={lang} onChange={setLang} dark />
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </div>
    </section>
);
