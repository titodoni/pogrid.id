import React from 'react';
import type { Lang } from './shared';

export const LangToggle: React.FC<{ lang: Lang; onChange: (l: Lang) => void; dark?: boolean }> = ({ lang, onChange, dark = false }) => (
    <div
        className={`mono inline-flex items-center text-[11px] font-semibold border ${dark ? 'border-white/20 bg-white/5' : 'border-slate-300 bg-white'}`}
        style={{ padding: 2, gap: 2 }}
        role="group"
        aria-label="Language"
    >
        {(['en', 'id'] as Lang[]).map((l) => (
            <button
                key={l}
                type="button"
                onClick={() => onChange(l)}
                aria-pressed={lang === l}
                className={`uppercase tracking-[0.12em] transition-all duration-150 ${lang === l ? (dark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white') : dark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 5, paddingBottom: 5, minWidth: 36 }}
            >
                {l}
            </button>
        ))}
    </div>
);
