import React, { useState } from 'react';
import { Reveal } from './Reveal';
import { ArrowRight, PlayCircle, WhatsAppIcon, Check } from './icons';
import type { Lang, LandingTranslations } from './shared';
import { appUrl, waUrl } from './shared';

interface HeroProps { t: LandingTranslations; lang: Lang; }

const MobileHeroVisual: React.FC<{ t: LandingTranslations }> = ({ t }) => (
    <div className="hero-visual-mobile w-full max-w-[380px] mb-8">
        <div className="mock-frame">
            <div className="mock-bar">
                <div className="mock-dot" aria-hidden="true" />
                <div className="mock-dot" aria-hidden="true" />
                <div className="mock-dot" aria-hidden="true" />
                <span className="mock-url">{t.sim_url}</span>
            </div>
            <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <span className="mono text-[7px] text-slate-400 uppercase tracking-wider block">{t.sim_client_tracker}</span>
                        <span className="text-[9px] font-bold text-slate-800">PT Astra Otoparts</span>
                    </div>
                    <span className="mono text-[7px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">{t.sim_status_risk}</span>
                </div>
                <div className="flex flex-col gap-1">
                    {[
                        { label: '1. Milling & Turning', pct: 100, safe: true },
                        { label: '2. CNC Router', pct: 100, safe: true },
                        { label: '3. Welder & Joining', pct: 60, safe: false },
                    ].map((stage) => (
                        <div key={stage.label}>
                            <div className="flex items-center justify-between text-[7px] text-slate-500">
                                <span>{stage.label}</span>
                                <span className={`mono font-semibold ${stage.safe ? 'text-emerald-600' : 'text-amber-600'}`}>{stage.pct}%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${stage.safe ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${stage.pct}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

export const Hero: React.FC<HeroProps> = ({ t, lang }) => {
    const [simPin, setSimPin] = useState<string>('');
    const [simStep, setSimStep] = useState<'pin' | 'update' | 'success'>('pin');
    const [simProgress, setSimProgress] = useState<number>(60);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [poStatus, setPoStatus] = useState<'rawan' | 'aman'>('rawan');
    const [simDone, setSimDone] = useState(false);

    const handleNumClick = (num: string) => {
        if (simPin.length < 4) {
            const nextPin = simPin + num;
            setSimPin(nextPin);
            if (nextPin.length === 4) setTimeout(() => setSimStep('update'), 400);
        }
    };
    const handleClearPin = () => setSimPin('');
    const triggerUpdateSend = () => { setIsSending(true); setTimeout(() => { setIsSending(false); setSimStep('success'); setPoStatus('aman'); setSimDone(true); }, 700); };
    const resetSimulator = () => { setSimPin(''); setSimStep('pin'); setSimProgress(60); setPoStatus('rawan'); setSimDone(false); setIsSending(false); };

    return (
        <section className="hero">
            <div className="max-w-[1200px] mx-auto px-4 md:px-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center pt-16 lg:pt-24 pb-20 md:pb-28">
                    {/* Copy */}
                    <div className="lg:col-span-6 text-left flex flex-col items-start">
                        <Reveal>
                            <div className="flex items-center gap-3 mb-6">
                                <span className="mono text-[10px] font-semibold tracking-[0.18em] uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md">
                                    {lang === 'id' ? 'ID' : 'EN'}
                                </span>
                                <span className="mono text-[11px] font-medium tracking-[0.16em] uppercase text-slate-400">{t.hero_eyebrow}</span>
                            </div>
                        </Reveal>

                        <Reveal delay={80}>
                            <h1 className="landing-display hero-h1 mb-6">
                                {t.hero_title_1}{' '}
                                <span className="accent">{t.hero_title_2}</span>{' '}
                                {t.hero_title_3}
                            </h1>
                        </Reveal>

                        <Reveal delay={160}>
                            <p className="text-lg md:text-xl hero-sub leading-relaxed mb-8 max-w-xl">
                                {t.hero_sub}
                            </p>
                        </Reveal>

                        <MobileHeroVisual t={t} />

                        <Reveal delay={240}>
                            <div className="flex flex-wrap items-center gap-3 w-full mb-6">
                                <a href={appUrl('/register')} className="btn-primary inline-flex items-center justify-center gap-2 text-[15px] px-7 py-4">
                                    {t.hero_cta_primary}
                                    <ArrowRight size={16} />
                                </a>
                                <a href={waUrl(lang)} target="_blank" rel="noopener noreferrer" className="btn-ghost inline-flex items-center justify-center gap-2 text-[15px] px-7 py-4">
                                    <WhatsAppIcon size={16} className="text-emerald-500" />
                                    {t.hero_cta_demo}
                                </a>
                                <a href="#cara" className="inline-flex items-center justify-center gap-2 text-blue-700 hover:text-blue-800 font-semibold text-[15px] px-2 py-4 transition-colors">
                                    <PlayCircle size={16} />
                                    {t.hero_cta_secondary}
                                </a>
                            </div>
                        </Reveal>

                        <Reveal delay={300}>
                            <div className="mono text-[12px] text-slate-400 mb-10 w-full flex flex-wrap gap-x-6 gap-y-1.5">
                                {t.hero_notes.map((n, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5">
                                        <span className="text-blue-600 font-semibold">+</span>
                                        {n}
                                    </span>
                                ))}
                            </div>
                        </Reveal>

                        <Reveal delay={420} className="w-full">
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-x-6 gap-y-5 w-full border-t border-slate-200 pt-6">
                                {t.hero_stats.map((s, i) => (
                                    <div key={i} className="min-w-0 flex flex-col">
                                        <div className="landing-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                                            {s.v}
                                        </div>
                                        <div className="text-[12px] sm:text-[13px] text-slate-500 mt-1 leading-snug">
                                            {s.l}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Reveal>
                    </div>

                    {/* Product visual: dashboard + kiosk (desktop only) */}
                    <div className="lg:col-span-6 relative items-center justify-center lg:justify-end w-full pt-2 lg:pt-0 hidden lg:flex">
                        <Reveal delay={200} className="w-full flex items-center justify-center lg:justify-end">
                            {/* Dashboard mock — desktop */}
                            <div className="dashboard-mockup relative z-10 w-full max-w-[520px] mock-frame">
                                <div className="mock-bar">
                                    <div className="mock-dot" aria-hidden="true" />
                                    <div className="mock-dot" aria-hidden="true" />
                                    <div className="mock-dot" aria-hidden="true" />
                                    <div className="mock-url w-[60%] h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {t.sim_url}
                                    </div>
                                </div>

                                <div className="p-3.5 grid grid-cols-12 gap-3 min-h-[290px]">
                                    <div className="col-span-3 border-r border-slate-100 pr-2 flex flex-col gap-1.5">
                                        <div className="landing-display font-bold text-[10px] text-blue-700 tracking-wider mb-1.5">POgrid.id</div>
                                        <div className="w-full h-5 rounded-md bg-blue-50 border border-blue-100 flex items-center px-1.5 text-[8.5px] text-blue-800 font-semibold">Dashboard</div>
                                        <div className="w-full h-5 rounded-md flex items-center px-1.5 text-[8.5px] text-slate-400">Purchase Orders</div>
                                        <div className="w-full h-5 rounded-md flex items-center px-1.5 text-[8.5px] text-slate-400">Trouble Alerts</div>
                                        <div className="w-full h-5 rounded-md flex items-center px-1.5 text-[8.5px] text-slate-400">Performance</div>
                                    </div>

                                    <div className="col-span-9 flex flex-col gap-2.5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="mono text-[7.5px] text-slate-400 uppercase tracking-widest block font-medium">{t.sim_client_tracker}</span>
                                                <span className="text-[11px] font-bold text-slate-800">PT Astra Otoparts</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="mono text-[7.5px] text-slate-400 block uppercase">{t.sim_po_code}</span>
                                                <span className="text-[10px] font-bold text-slate-700">PO-2026-089</span>
                                            </div>
                                        </div>

                                        <div className="border border-slate-200 bg-slate-50/60 rounded-lg p-2.5 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[8px] text-slate-500 font-medium">{t.sim_progress_label}</span>
                                                {poStatus === 'rawan' ? (
                                                    <span className="mono text-[8.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">{t.sim_status_risk}</span>
                                                ) : (
                                                    <span className="mono text-[8.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                                        {t.sim_status_ok}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                {[
                                                    { label: '1. Milling & Turning', pct: 100, color: 'emerald' },
                                                    { label: '2. CNC Router', pct: 100, color: 'emerald' },
                                                    { label: '3. Welder & Joining', pct: simProgress, color: simProgress === 100 ? 'emerald' : 'amber' },
                                                ].map((stage, i) => (
                                                    <div key={i}>
                                                        <div className="flex items-center justify-between text-[8px] text-slate-500">
                                                            <span>{stage.label}</span>
                                                            <span className={`mono font-semibold ${stage.color === 'emerald' ? 'text-emerald-600' : 'text-amber-600'}`}>{stage.pct}%</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-500 ${stage.color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${stage.pct}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50/60 border border-slate-200 p-2 rounded-lg">
                                            <div className="mono text-[7.5px] font-medium text-slate-400 uppercase tracking-wider mb-1">{t.sim_activity_label}</div>
                                            <div className="flex items-center gap-1.5 text-[8.5px] text-slate-700">
                                                <span className={`w-1.5 h-1.5 rounded-full ${poStatus === 'aman' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                <span className="transition-all duration-300">{simDone ? t.sim_activity_done : t.sim_activity_initial}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Phone kiosk mock */}
                            <div className="absolute -right-3 -bottom-6 z-20 w-[215px] md:w-[230px] hidden sm:block">
                                <div className="relative w-full aspect-[9/18.5] bg-slate-800 border-[5px] border-slate-600 rounded-[28px] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.6)] overflow-hidden" role="img" aria-label={t.sim_kiosk_title}>
                                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-900 rounded-full z-30" />

                                    <div className="w-full h-full bg-white rounded-[20px] overflow-hidden flex flex-col p-3 pt-8 select-none">
                                        {simStep === 'pin' && (
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div className="text-center">
                                                    <span className="mono text-[7.5px] font-medium text-slate-400 uppercase tracking-widest block mb-0.5">{t.sim_terminal}</span>
                                                    <h4 className="text-[11px] font-extrabold text-slate-900">{t.sim_kiosk_title}</h4>
                                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 my-2 text-left">
                                                        <span className="mono text-[7px] text-slate-400 block uppercase">{t.sim_operator_label}</span>
                                                        <span className="text-[9px] font-bold text-slate-800">{t.sim_operator_value}</span>
                                                    </div>
                                                    <div className="text-[8.5px] text-slate-500 mt-2">{t.sim_enter_pin}</div>
                                                    <div className="flex justify-center gap-2.5 my-2.5" aria-label="PIN input dots">
                                                        {[0, 1, 2, 3].map((i) => (
                                                            <div key={i} className={`w-2.5 h-2.5 rounded-[2px] border transition-all duration-200 ${simPin.length > i ? 'bg-blue-600 border-blue-600 scale-110' : 'border-slate-300 bg-transparent'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-200 mb-1">
                                                    {['1','2','3','4','5','6','7','8','9'].map((n) => (
                                                        <button key={n} onClick={() => handleNumClick(n)}
                                                            className="mono h-8 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-semibold active:scale-95 transition-all flex items-center justify-center focus:outline-2 focus:outline-blue-500"
                                                            aria-label={`Digit ${n}`}>{n}</button>
                                                    ))}
                                                    <button onClick={handleClearPin} className="mono h-8 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[9.5px] font-semibold flex items-center justify-center focus:outline-2 focus:outline-blue-500" aria-label="Clear PIN">C</button>
                                                    <button onClick={() => handleNumClick('0')} className="mono h-8 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-semibold flex items-center justify-center focus:outline-2 focus:outline-blue-500" aria-label="Digit 0">0</button>
                                                    <button onClick={() => { if (simPin.length === 4) setSimStep('update'); }} className="mono h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 text-[9.5px] font-semibold flex items-center justify-center focus:outline-2 focus:outline-blue-500" aria-label="OK">OK</button>
                                                </div>
                                            </div>
                                        )}
                                        {simStep === 'update' && (
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                                        <span className="text-[10px] font-extrabold text-slate-900">{t.sim_update_title}</span>
                                                        <span className="mono text-[8.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">Joko S.</span>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-left mb-3">
                                                        <span className="mono text-[7px] text-slate-400 block uppercase font-medium">{t.sim_po_label}</span>
                                                        <span className="text-[9.5px] font-bold text-slate-800 block">PO-2026-089</span>
                                                        <span className="text-[8.5px] text-slate-500">PT Astra Otoparts</span>
                                                    </div>
                                                    <div className="mb-4">
                                                        <div className="flex items-center justify-between text-[9px] text-slate-700 font-bold mb-1.5">
                                                            <span>{t.sim_progress}</span>
                                                            <span className="mono">{simProgress === 100 ? '10 / 10' : simProgress === 80 ? '8 / 10' : '6 / 10'} {t.sim_units}</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-300 ${simProgress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${simProgress}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <button onClick={() => setSimProgress(80)} className={`w-full py-2.5 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center focus:outline-2 focus:outline-blue-500 ${simProgress === 80 ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`} aria-label={t.sim_add2}>{t.sim_add2}</button>
                                                        <button onClick={() => setSimProgress(100)} className={`w-full py-2.5 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center focus:outline-2 focus:outline-blue-500 ${simProgress === 100 ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`} aria-label={t.sim_finish}>{t.sim_finish}</button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <button onClick={triggerUpdateSend} disabled={isSending} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white border-none rounded-lg text-[10.5px] font-bold text-center cursor-pointer flex items-center justify-center gap-1 transition-colors focus:outline-2 focus:outline-blue-500">{isSending ? t.sim_sending : t.sim_send}</button>
                                                    <button onClick={resetSimulator} className="w-full py-2 bg-transparent hover:bg-slate-50 text-[8.5px] text-slate-400 border-none font-semibold text-center rounded-lg focus:outline-2 focus:outline-blue-500">{t.sim_back}</button>
                                                </div>
                                            </div>
                                        )}
                                        {simStep === 'success' && (
                                            <div className="flex-1 flex flex-col justify-between text-center pt-4">
                                                <div className="flex-1 flex flex-col items-center justify-center">
                                                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4" aria-hidden="true"><Check size={24} className="text-emerald-600" /></div>
                                                    <h4 className="text-[12px] font-extrabold text-slate-900 mb-2">{t.sim_sent_title}</h4>
                                                    <p className="text-[9.5px] text-slate-500 leading-relaxed px-1">{t.sim_sent_body.replace('{pct}', String(simProgress))}</p>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <button onClick={resetSimulator} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white border-none rounded-lg text-[10px] font-bold transition-colors focus:outline-2 focus:outline-blue-500">{t.sim_reset}</button>
                                                    <span className="text-[7.5px] text-slate-400">{t.sim_see_monitor}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </div>
        </section>
    );
};