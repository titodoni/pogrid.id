import React from 'react';
import { Link } from '@inertiajs/react';
import { LangToggle } from './LangToggle';
import { ArrowRight, CloseIcon, MenuIcon } from './icons';
import type { Lang, LandingTranslations } from './shared';
import { appUrl } from './shared';

interface NavigationProps {
    t: LandingTranslations;
    lang: Lang;
    setLang: (l: Lang) => void;
    scrolled: boolean;
    mobileOpen: boolean;
    setMobileOpen: (v: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ t, lang, setLang, scrolled, mobileOpen, setMobileOpen }) => {
    const navLinks = [
        { label: t.nav_features, href: '#fitur' },
        { label: t.nav_how, href: '#cara' },
        { label: t.nav_price, href: '#harga' },
        { label: t.nav_faq, href: '#faq' },
    ];

    return (
        <header className={`sticky top-0 z-50 border-b transition-all duration-300 ${scrolled ? 'bg-white shadow-sm border-slate-100' : 'bg-white border-transparent'}`}>
            <div className={`max-w-[1200px] mx-auto px-4 md:px-6 flex items-center justify-between gap-6 transition-all duration-300 ${scrolled ? 'h-[56px]' : 'h-[64px]'}`}>
                <Link href="/" className="flex items-center gap-2.5 group">
                    <img
                        src="/pogrid-logo.png"
                        alt="POgrid.id Logo"
                        style={{ height: scrolled ? '32px' : '38px', width: 'auto', objectFit: 'contain', transition: 'height 300ms' }}
                    />
                    <span className={`mono font-bold tracking-tight text-slate-900 ${scrolled ? 'text-base' : 'text-[17px]'}`}>
                        POgrid<span className="text-slate-400">.id</span>
                    </span>
                </Link>

                <nav className="hidden lg:flex items-center gap-7">
                    {navLinks.map((l) => (
                        <a key={l.href} href={l.href} className="mono text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 hover:text-slate-900 transition-colors duration-150">
                            {l.label}
                        </a>
                    ))}
                </nav>

                <div className="flex items-center gap-2.5">
                    <div className="hidden sm:block">
                        <LangToggle lang={lang} onChange={setLang} />
                    </div>

                    <a
                        href={appUrl('/login')}
                        className="hidden md:inline-block text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors duration-150 whitespace-nowrap"
                    >
                        {t.login}
                    </a>

                    <a
                        href={appUrl('/register')}
                        className="hidden md:inline-flex items-center gap-2 btn-primary text-sm px-5 py-2.5 whitespace-nowrap"
                    >
                        {t.cta}
                        <ArrowRight size={14} />
                    </a>

                    <button
                        type="button"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700"
                        aria-label="Menu"
                        aria-expanded={mobileOpen}
                        aria-controls="landing-mobile-menu"
                    >
                        {mobileOpen ? <CloseIcon /> : <MenuIcon />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            <div
                id="landing-mobile-menu"
                className={`lg:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[480px]' : 'max-h-0'}`}
            >
                <div className="mx-4 mt-2 mb-4 p-5 rounded-2xl border border-slate-200 bg-white shadow-lg flex flex-col gap-1">
                    {navLinks.map((l) => (
                        <a
                            key={l.href}
                            href={l.href}
                            onClick={() => setMobileOpen(false)}
                            className="mono px-3 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            {l.label}
                        </a>
                    ))}
                    <div className="mt-3 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                        <div className="flex justify-center pb-1">
                            <LangToggle lang={lang} onChange={setLang} />
                        </div>
                        <a href={appUrl('/register')} onClick={() => setMobileOpen(false)} className="btn-primary py-3 text-center flex items-center justify-center gap-2">
                            {t.cta}
                            <ArrowRight size={14} />
                        </a>
                        <a href={appUrl('/login')} onClick={() => setMobileOpen(false)} className="text-sm font-semibold text-slate-700 py-2.5 text-center border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                            {t.login}
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
};
