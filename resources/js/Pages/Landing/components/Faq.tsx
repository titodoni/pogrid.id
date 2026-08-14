import React from 'react';
import { Reveal } from './Reveal';
import { SectionHead } from './SectionHead';
import { ChevronDownIcon } from './icons';
import type { LandingTranslations } from './shared';

interface FaqProps {
    t: LandingTranslations;
    openFaq: number | null;
    setOpenFaq: (v: number | null) => void;
}

export const Faq: React.FC<FaqProps> = ({ t, openFaq, setOpenFaq }) => (
    <section id="faq" className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-16 md:py-24">
            <div className="max-w-[840px] mx-auto">
                <SectionHead num="07" eyebrow={t.faq_eyebrow} title={t.faq_title} />

                <div className="flex flex-col gap-3 md:gap-4">
                    {t.faqs.map((f, i) => {
                        const open = openFaq === i;
                        return (
                            <Reveal key={i} delay={i * 40}>
                                <div className={`rounded-2xl bg-white border transition-all duration-200 shadow-sm hover:shadow-md ${open ? 'border-blue-200 shadow-md' : 'border-slate-200'}`}>
                                    <button
                                        type="button"
                                        id={`faq-btn-${i}`}
                                        onClick={() => setOpenFaq(open ? null : i)}
                                        aria-expanded={open}
                                        aria-controls={`faq-answer-${i}`}
                                        className="w-full text-left bg-transparent border-none cursor-pointer px-5 md:px-7 py-5 md:py-6 flex justify-between items-center gap-6 text-slate-800 hover:text-slate-900 font-bold text-sm md:text-[15px]"
                                    >
                                        <span className="flex items-baseline gap-4">
                                            <span className="mono text-[11px] font-medium text-slate-400">0{i + 1}</span>
                                            <span>{f.q}</span>
                                        </span>
                                        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${open ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 text-slate-400'}`} aria-hidden="true">
                                            <ChevronDownIcon size={15} />
                                        </span>
                                    </button>

                                    <div
                                        id={`faq-answer-${i}`}
                                        role="region"
                                        aria-labelledby={`faq-btn-${i}`}
                                        className={`transition-all duration-300 ease-in-out ${open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                                    >
                                        <p className="text-xs md:text-sm text-slate-500 leading-relaxed pb-6 pl-[3.75rem] md:pl-[4.75rem] pr-6 max-w-2xl">{f.a}</p>
                                    </div>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>
            </div>
        </div>
    </section>
);
