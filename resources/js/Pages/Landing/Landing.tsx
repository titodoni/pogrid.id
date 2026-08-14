import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { useTranslation } from '@/i18n/useTranslation';
import type { LandingTranslations } from './components/shared';
import './landing.css';

import { Navigation } from './components/Navigation';
import { Hero } from './components/Hero';
import { Marquee } from './components/Marquee';
import { PainPoints } from './components/PainPoints';
import { HowItWorks } from './components/HowItWorks';
import { Features } from './components/Features';
import { Comparison } from './components/Comparison';
import { Sectors } from './components/Sectors';
import { TrustBand } from './components/TrustBand';
import { Pricing } from './components/Pricing';
import { Faq } from './components/Faq';
import { FinalCta } from './components/FinalCta';
import { Footer } from './components/Footer';

export default function Landing() {
    const { t: rawT, language: lang, changeLanguage: setLang } = useTranslation('Landing_Landing');
    const t = rawT as LandingTranslations;
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    // <html lang> is kept in sync centrally by useTranslation (on mount and on
    // every changeLanguage), so no per-page effect is needed here.

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const faqs = t.faqs;

    const softwareSchema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'POgrid.id',
        operatingSystem: 'Web Browser',
        applicationCategory: 'BusinessApplication',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'IDR',
            description: 'Free 30-day trial',
        },
        description: t.schema_desc,
    };

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: {
                '@type': 'Answer',
                text: f.a,
            },
        })),
    };

    return (
        <div className="min-h-screen bg-white text-slate-600 font-sans antialiased landing-root">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:border focus:border-slate-300 focus:shadow-lg">
                Skip to main content
            </a>

            <Head>
                <title>{t.meta_title}</title>
                <meta name="title" content={t.meta_title} />
                <meta name="description" content={t.meta_desc} />
                <meta name="keywords" content={t.meta_keywords} />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://pogrid.id/" />

                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://pogrid.id/" />
                <meta property="og:title" content={t.og_title} />
                <meta property="og:description" content={t.og_desc} />
                <meta property="og:image" content="https://pogrid.id/og-image.png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:locale" content={lang === 'id' ? 'id_ID' : 'en_US'} />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:url" content="https://pogrid.id/" />
                <meta name="twitter:title" content={t.tw_title} />
                <meta name="twitter:description" content={t.tw_desc} />
                <meta name="twitter:image" content="https://pogrid.id/og-image.png" />

                <link rel="alternate" hrefLang="id" href="https://pogrid.id/" />
                <link rel="alternate" hrefLang="en" href="https://pogrid.id/" />
                <link rel="alternate" hrefLang="x-default" href="https://pogrid.id/" />

                <script type="application/ld+json">{JSON.stringify(softwareSchema)}</script>
                <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
            </Head>

            {/* Top gradient rule */}
            <div className="h-[3px] w-full bg-blue-600" aria-hidden="true" />

            <Navigation
                t={t}
                lang={lang}
                setLang={setLang}
                scrolled={scrolled}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            <main id="main-content">
                <Hero t={t} lang={lang} />
                <Marquee t={t} />
                <PainPoints t={t} />
                <HowItWorks t={t} />
                <Features t={t} />
                <Comparison t={t} />
                <Sectors t={t} />
                <TrustBand t={t} />
                <Pricing t={t} />
                <Faq t={t} openFaq={openFaq} setOpenFaq={setOpenFaq} />
                <FinalCta t={t} lang={lang} setLang={setLang} />
            </main>

            <Footer t={t} lang={lang} />
        </div>
    );
}
