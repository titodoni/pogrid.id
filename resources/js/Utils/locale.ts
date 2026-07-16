export type Language = 'en' | 'id';

interface LocalizedItem {
    display_name: string;
    display_name_id?: string | null;
}

export function getLanguage(): Language {
    if (typeof window !== 'undefined') {
        return (localStorage.getItem('pogrid_lang') as Language) || 'en';
    }
    return 'en';
}

export function setLanguage(lang: Language): void {
    localStorage.setItem('pogrid_lang', lang);
}

export function localizedDisplay(item: LocalizedItem | undefined | null, lang: Language): string {
    if (!item) return '';
    if (lang === 'id' && item.display_name_id) return item.display_name_id;
    return item.display_name;
}
