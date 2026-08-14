import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from "@/i18n/useTranslation";

export default function Privacy() {
    const { t, language, changeLanguage } = useTranslation('Legal_Privacy');
    return (
        <div style={{
            backgroundColor: 'var(--color-pg-bg, #f4fff8)',
            color: 'var(--color-pg-text, #000f08)',
            minHeight: '100vh',
            fontFamily: 'Inter, sans-serif',
            padding: '24px 16px',
            boxSizing: 'border-box',
        }}>
            <Head title={`POgrid.id — ${t.title}`} />

            {/* Header Area */}
            <header style={{
                maxWidth: '1000px',
                margin: '0 auto 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--color-pg-border, rgba(0,0,0,0.08))',
                paddingBottom: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/" aria-label="POgrid.id — Home" style={{ textDecoration: 'none' }}>
                        <img src="/pogrid-logo.png" alt="POgrid.id Logo" style={{ height: '48px', width: 'auto' }} />
                    </Link>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Language Switcher */}
                    <div style={{
                        display: 'inline-flex',
                        borderRadius: '8px',
                        border: '1px solid var(--color-pg-border, rgba(0,0,0,0.08))',
                        backgroundColor: 'var(--color-pg-surface, #ffffff)',
                        padding: '2px',
                    }}>
                        <button
                            onClick={() => changeLanguage('en')}
                            style={{
                                padding: '4px 10px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: 600,
                                backgroundColor: language === 'en' ? 'var(--color-pg-primary, #1c3738)' : 'transparent',
                                color: language === 'en' ? 'var(--color-pg-primary-ink, #f4fff8)' : 'var(--color-pg-text-secondary, #4d4847)',
                            }}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => changeLanguage('id')}
                            style={{
                                padding: '4px 10px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: 600,
                                backgroundColor: language === 'id' ? 'var(--color-pg-primary, #1c3738)' : 'transparent',
                                color: language === 'id' ? 'var(--color-pg-primary-ink, #f4fff8)' : 'var(--color-pg-text-secondary, #4d4847)',
                            }}
                        >
                            ID
                        </button>
                    </div>

                    <Link href="/" style={{
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-pg-primary-hover, #254748)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-pg-border, rgba(0,0,0,0.08))',
                        backgroundColor: 'var(--color-pg-surface, #ffffff)',
                    }}>
                        {t.back_to_home}
                    </Link>
                </div>
            </header>

            {/* Content Body */}
            <main style={{
                maxWidth: '1000px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '32px',
                alignItems: 'start',
            }}>
                {/* Side Navigation / Table of Contents */}
                <aside style={{
                    backgroundColor: 'var(--color-pg-surface, #ffffff)',
                    border: '1px solid var(--color-pg-border, rgba(0,0,0,0.08))',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    position: 'sticky',
                    top: '24px',
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: 'var(--color-pg-text-secondary, #4d4847)' }}>
                        {t.table_of_contents}
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {t.sections.map((sec, i) => (
                            <li key={i}>
                                <a href={`#section-${i}`} style={{
                                    textDecoration: 'none',
                                    fontSize: '13.5px',
                                    fontWeight: 600,
                                    color: 'var(--color-pg-primary-hover, #254748)',
                                    lineHeight: '1.4',
                                }}>
                                    {sec.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </aside>

                {/* Main Legal Copy */}
                <section className="footer-brand-span" style={{
                    backgroundColor: 'var(--color-pg-surface, #ffffff)',
                    border: '1px solid var(--color-pg-border, rgba(0,0,0,0.08))',
                    borderRadius: '16px',
                    padding: '36px 28px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>{t.title}</h1>
                    <p style={{ fontSize: '13px', color: 'var(--color-pg-text-muted, #687d7b)', margin: '0 0 32px 0' }}>{t.subtitle}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        {t.sections.map((sec, i) => (
                            <div key={i} id={`section-${i}`} style={{ borderBottom: i < t.sections.length - 1 ? '1px solid var(--color-pg-border-subtle, rgba(0,0,0,0.04))' : 'none', paddingBottom: '20px' }}>
                                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--color-pg-text, #000f08)' }}>
                                    {sec.title}
                                </h2>
                                <p style={{ fontSize: '14.5px', lineHeight: '1.65', color: 'var(--color-pg-text-secondary, #4d4847)', margin: 0 }}>
                                    {sec.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
