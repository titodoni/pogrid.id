import { useState, useEffect } from 'react';
import en from './locales/en.json';
import id from './locales/id.json';

type Language = 'en' | 'id';
type Namespace = keyof typeof en;

const dictionaries = { en, id };
let currentLanguage: Language = 'id';

// Keep the <html lang> attribute in sync with the active language so screen
// readers, spellcheck, and SEO see the correct language on every page.
const syncHtmlLang = (lang: Language) => {
    if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
    }
};

if (typeof window !== 'undefined') {
    const savedLang = localStorage.getItem('pogrid_lang') as Language;
    if (savedLang === 'en' || savedLang === 'id') {
        currentLanguage = savedLang;
    }
    syncHtmlLang(currentLanguage);
}

const listeners: Set<(lang: Language) => void> = new Set();

export const changeLanguage = (lang: Language) => {
    currentLanguage = lang;
    if (typeof window !== 'undefined') {
        localStorage.setItem('pogrid_lang', lang);
    }
    syncHtmlLang(lang);
    listeners.forEach(listener => listener(lang));
};

export function useTranslation(namespace: Namespace) {
    const [language, setLanguage] = useState<Language>(currentLanguage);

    useEffect(() => {
        const listener = (lang: Language) => setLanguage(lang);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);

    // Typed as an open string map: namespaces hold string leaves and, for the
    // landing page, string arrays. Tighten per-namespace when strictness rises.
    const t = ((dictionaries[language] && dictionaries[language][namespace]) || {}) as Record<string, any>;

    return { t, language, changeLanguage };
}
