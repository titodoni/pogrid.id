import en from '@/i18n/locales/en.json';

export type Lang = 'en' | 'id';
export type LandingTranslations = typeof en.Landing_Landing;

export function appUrl(path: string): string {
    if (typeof window === 'undefined') return path;
    const search = window.location.search || '';
    if (window.location.hostname.endsWith('pogrid.id') || window.location.hostname.endsWith('www.pogrid.id')) {
        return `https://app.pogrid.id${path}${search}`;
    }
    return `${path}${search}`;
}

export function waUrl(lang: Lang): string {
    const text =
        lang === 'id'
            ? 'Halo, saya berminat dengan POgrid. Saya ingin meminta demo.'
            : 'Hello, I am interested in POgrid. I would like to request a demo.';
    return `https://wa.me/628154198101?text=${encodeURIComponent(text)}`;
}

export function hrefFor(i: number): string {
    const map = ['#fitur', '#cara', '#harga', '#faq'];
    return map[i] ?? '#';
}
