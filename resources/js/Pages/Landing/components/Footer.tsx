import React from 'react';
import { Link } from '@inertiajs/react';
import { WhatsAppIcon } from './icons';
import type { Lang, LandingTranslations } from './shared';
import { appUrl, hrefFor, waUrl } from './shared';

interface FooterProps {
    t: LandingTranslations;
    lang: Lang;
}

export const Footer: React.FC<FooterProps> = ({ t, lang }) => (
    <footer className="bg-white">
        <div className="max-w-[1200px] mx-auto border-x border-slate-200 px-4 md:px-10 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 flex flex-col items-start">
                <img
                    src="/pogrid-logo.png"
                    alt="POgrid.id Logo"
                    style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
                    className="mb-5"
                    loading="lazy"
                />
                <p className="text-xs md:text-sm text-slate-500 leading-relaxed max-w-[320px] mb-6">{t.footer_tag}</p>
                <div className="flex gap-2.5 mb-6">
                    <a href={waUrl(lang)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-9 h-9 border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:border-emerald-300 transition-colors duration-150 flex items-center justify-center">
                        <WhatsAppIcon size={16} />
                    </a>
                </div>
                <div className="text-xs md:text-sm text-slate-500 space-y-2">
                    <p className="font-semibold text-slate-700">Contact Support</p>
                    <p>Email: <a href="mailto:admin@pogrid.id" className="hover:text-slate-900 transition-colors">admin@pogrid.id</a></p>
                    <p>Phone: <a href="tel:+628154198101" className="hover:text-slate-900 transition-colors">+62 815-4198-101</a></p>
                    <p>Address: Jalan Sakura, Rajabasa,<br/>Bandar Lampung, Indonesia</p>
                </div>
            </div>

            <div className="lg:col-span-2">
                <h4 className="mono text-[11px] font-semibold text-slate-900 uppercase tracking-[0.18em] mb-5">{t.footer_product}</h4>
                <ul className="flex flex-col gap-3.5">
                    {t.footer_links_product.map((l, i) => (
                        <li key={i}>
                            <a href={hrefFor(i)} className="text-xs md:text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150">{l}</a>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="lg:col-span-2">
                <h4 className="mono text-[11px] font-semibold text-slate-900 uppercase tracking-[0.18em] mb-5">{t.footer_company}</h4>
                <ul className="flex flex-col gap-3.5">
                    {t.footer_links_company.map((l, i) => (
                        <li key={i}>
                            <a href={appUrl(i === 0 ? '/login' : '/register')} className="text-xs md:text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150">{l}</a>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="lg:col-span-3">
                <h4 className="mono text-[11px] font-semibold text-slate-900 uppercase tracking-[0.18em] mb-5">{t.footer_legal}</h4>
                <ul className="flex flex-col gap-3.5">
                    <li>
                        <Link href="/terms" className="text-xs md:text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150">{t.footer_terms}</Link>
                    </li>
                    <li>
                        <Link href="/privacy" className="text-xs md:text-sm text-slate-500 hover:text-slate-900 transition-colors duration-150">{t.footer_privacy}</Link>
                    </li>
                </ul>
            </div>
        </div>

        <div className="max-w-[1200px] mx-auto border-x border-t border-slate-200 px-4 md:px-10 py-6">
            <div className="mono text-[11px] text-slate-400 tracking-[0.06em]">© {new Date().getFullYear()} {t.footer_copy}</div>
        </div>
    </footer>
);
