import { useState, useEffect } from 'react';
import en from './locales/en.json';
import id from './locales/id.json';

type Language = 'en' | 'id';
type Namespace = keyof typeof en;

const dictionaries = { en, id };
let currentLanguage: Language = 'en';

if (typeof window !== 'undefined') {
    const savedLang = localStorage.getItem('pogrid_lang') as Language;
    if (savedLang === 'en' || savedLang === 'id') {
        currentLanguage = savedLang;
    }
}

const listeners: Set<(lang: Language) => void> = new Set();

export const changeLanguage = (lang: Language) => {
    currentLanguage = lang;
    if (typeof window !== 'undefined') {
        localStorage.setItem('pogrid_lang', lang);
    }
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

    // @ts-ignore
    const t = (dictionaries[language] && dictionaries[language][namespace]) || {};

    return { t, language, changeLanguage };
}
