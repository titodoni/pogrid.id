import React, { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    TrendingUp,
    AlertTriangle,
    FolderArchive,
    Coins,
    Palette,
    ChevronLeft,
    LogOut,
    MenuIcon,
    Close,
    Settings,
    UserIcon
} from './Icons';
import { localizedDisplay } from '../Utils/locale';

export type WorkerHeaderView = 'dashboard' | 'finance-ledger' | 'my-kpi' | 'archive' | 'trouble-reports';

interface WorkerHeaderProps {
    slug: string;
    auth_user?: {
        id: number;
        name: string;
        role?: string;
        role_name?: string;
        post_display_name?: string;
        post_display_name_id?: string;
    };
    userRole?: string;
    title: string;
    subtitle?: string;
    language: 'en' | 'id';
    changeLanguage: (lang: 'en' | 'id') => void;
    currentView: WorkerHeaderView;
    onlineUsersCount?: number;
    wsStatus?: string;
    backUrl?: string;
    logoPath?: string | null;
}

export const WorkerHeader: React.FC<WorkerHeaderProps> = ({
    slug,
    auth_user,
    userRole,
    title,
    subtitle,
    language,
    changeLanguage,
    currentView,
    onlineUsersCount,
    wsStatus,
    backUrl,
    logoPath
}) => {
    const page = usePage();
    const sharedTenant = (page.props as any).tenant;
    const activeLogoPath = logoPath ?? sharedTenant?.logo_path;
    const companyName = sharedTenant?.company_name || 'Factory Production';

    const [currentTime, setCurrentTime] = useState(new Date());
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    useEffect(() => {
        const themeToApply = sharedTenant?.theme || localStorage.getItem('pogrid_theme');
        if (themeToApply) {
            document.documentElement.className = themeToApply;
        }
    }, [sharedTenant?.theme]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const changeTheme = (newTheme: string) => {
        localStorage.setItem('pogrid_theme', newTheme);
        const classes = ['theme-default', 'theme-linear', 'theme-vercel', 'theme-stripe', 'theme-github', 'theme-nordic', 'theme-light', 'theme-brand'];
        classes.forEach(c => document.documentElement.classList.remove(c));
        document.documentElement.classList.add(newTheme);
        setShowThemeDropdown(false);
    };

    const role = userRole || auth_user?.role || auth_user?.role_name || '';

    const navItems = [
        {
            key: 'dashboard',
            labelEn: 'Production Station',
            labelId: 'Stasiun Produksi',
            href: `/c/${slug}`,
            icon: LayoutDashboard,
        },
        {
            key: 'my-kpi',
            labelEn: 'My Performance / KPI',
            labelId: 'Performa / KPI Saya',
            href: `/c/${slug}/my-kpi`,
            icon: TrendingUp,
        },
        {
            key: 'trouble-reports',
            labelEn: 'Trouble Reports',
            labelId: 'Laporan Kendala',
            href: `/c/${slug}/trouble-reports`,
            icon: AlertTriangle,
            badge: 'Alert',
        },
        {
            key: 'archive',
            labelEn: 'PO Archive',
            labelId: 'Arsip PO',
            href: `/c/${slug}/archive`,
            icon: FolderArchive,
        },
        ...(role === 'FINANCE' ? [{
            key: 'finance-ledger',
            labelEn: 'Finance Ledger',
            labelId: 'Ledger Finansial',
            href: `/c/${slug}/finance-ledger`,
            icon: Coins,
        }] : []),
    ];

    const mobileBottomItems = [
        { key: 'dashboard', label: language === 'en' ? 'Station' : 'Stasiun', href: `/c/${slug}`, icon: LayoutDashboard },
        { key: 'my-kpi', label: language === 'en' ? 'My KPI' : 'KPI Saya', href: `/c/${slug}/my-kpi`, icon: TrendingUp },
        { key: 'trouble-reports', label: language === 'en' ? 'Alerts' : 'Kendala', href: `/c/${slug}/trouble-reports`, icon: AlertTriangle },
        { key: 'archive', label: language === 'en' ? 'Archive' : 'Arsip', href: `/c/${slug}/archive`, icon: FolderArchive },
    ];

    return (
        <>
            {/* DESKTOP SIDEBAR NAVIGATION */}
            <aside
                className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-64 z-40 bg-[var(--color-pg-surface,#18181b)] border-r border-[var(--color-pg-border,#27272a)]"
                style={{ backdropFilter: 'blur(20px)' }}
            >
                {/* Tenant Company Branding Header */}
                <div className="h-20 px-4 flex items-center gap-3 border-b border-[var(--color-pg-border-subtle,#1f1f23)]">
                    {activeLogoPath ? (
                        <img src={activeLogoPath} alt={companyName} className="h-10 w-auto object-contain flex-shrink-0" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-black flex items-center justify-center text-lg shadow-md shadow-indigo-500/20 flex-shrink-0">
                            {companyName.charAt(0)}
                        </div>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-extrabold text-sm tracking-tight text-[var(--color-pg-text,#fafafa)] truncate leading-tight">
                            {companyName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-indigo-400">POgrid.id</span>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                Factory Floor
                            </span>
                        </div>
                    </div>
                </div>

                {/* Worker Navigation Links */}
                <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                    <div className="text-[10px] font-extrabold text-[var(--color-pg-text-muted,#71717a)] uppercase tracking-wider px-3 mb-2">
                        {language === 'en' ? 'Factory Workstation' : 'Workstation Pabrik'}
                    </div>

                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.key;
                        const label = language === 'en' ? item.labelEn : item.labelId;

                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all text-decoration-none relative ${
                                    isActive
                                        ? 'bg-[var(--color-pg-primary-glow,rgba(99,102,241,0.15))] text-indigo-400 border border-indigo-500/30 shadow-sm'
                                        : 'text-[var(--color-pg-text-secondary,#a1a1aa)] hover:text-[var(--color-pg-text,#fafafa)] hover:bg-[var(--color-pg-card-hover,#27272a)] border border-transparent'
                                }`}
                            >
                                {isActive && (
                                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full shadow" />
                                )}

                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-current'
                                }`}>
                                    <Icon size={18} />
                                </div>

                                <span className="truncate flex-1">{label}</span>

                                {item.badge && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer User Info & Actions */}
                <div className="p-3 border-t border-[var(--color-pg-border-subtle,#1f1f23)] bg-[var(--color-pg-bg,#09090b)]/50">
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--color-pg-surface,#18181b)] border border-[var(--color-pg-border,#27272a)] mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xs flex-shrink-0 relative">
                            {auth_user?.name ? auth_user.name.charAt(0).toUpperCase() : 'W'}
                            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[var(--color-pg-surface,#18181b)]" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-bold text-[var(--color-pg-text,#fafafa)] truncate">
                                {auth_user?.name || 'Worker'}
                            </span>
                            <span className="text-[10px] text-[var(--color-pg-text-muted,#71717a)] truncate">
                                {auth_user?.post_display_name ? localizedDisplay({ display_name: auth_user.post_display_name, display_name_id: auth_user.post_display_name_id }, language) : (role || 'Operator')}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--color-pg-surface,#18181b)] border border-[var(--color-pg-border,#27272a)]">
                            <button
                                type="button"
                                onClick={() => changeLanguage('en')}
                                className={`px-2 py-1 rounded text-[10px] font-extrabold ${language === 'en' ? 'bg-indigo-600 text-white' : 'text-[var(--color-pg-text-muted,#71717a)]'}`}
                            >
                                EN
                            </button>
                            <button
                                type="button"
                                onClick={() => changeLanguage('id')}
                                className={`px-2 py-1 rounded text-[10px] font-extrabold ${language === 'id' ? 'bg-indigo-600 text-white' : 'text-[var(--color-pg-text-muted,#71717a)]'}`}
                            >
                                ID
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                            className="p-1.5 rounded-lg bg-[var(--color-pg-surface,#18181b)] border border-[var(--color-pg-border,#27272a)] text-[var(--color-pg-text-secondary,#a1a1aa)] hover:text-white"
                            title="Theme"
                        >
                            <Palette size={16} />
                        </button>

                        <button
                            type="button"
                            onClick={() => router.post('/logout')}
                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors ml-auto"
                            title={language === 'en' ? 'Exit / Log out' : 'Keluar'}
                        >
                            <LogOut size={16} />
                        </button>
                    </div>

                    {showThemeDropdown && (
                        <div className="mt-2 p-2 bg-[var(--color-pg-surface,#18181b)] border border-[var(--color-pg-border,#27272a)] rounded-xl grid grid-cols-2 gap-1 text-[10px] font-semibold">
                            {['theme-default', 'theme-linear', 'theme-vercel', 'theme-stripe', 'theme-github', 'theme-nordic', 'theme-light', 'theme-brand'].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => changeTheme(t)}
                                    className="px-2 py-1 rounded text-left hover:bg-[var(--color-pg-card-hover,#27272a)] text-[var(--color-pg-text-secondary,#a1a1aa)] hover:text-white"
                                >
                                    {t.replace('theme-', '')}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            {/* TOP HEADER BAR (Prominent Tenant Logo, Title, Settings & Exit / Logout Buttons) */}
            <header className="responsive-header shrink-0 sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-pg-border,rgba(255,255,255,0.08))] bg-[var(--color-pg-bg,rgba(9,9,11,0.85))] backdrop-blur-xl w-full min-w-0 max-w-full box-border">
                {/* Left Section: Logo, Title & Back Button */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setMobileDrawerOpen(true)}
                        className="lg:hidden w-9 h-9 rounded-xl bg-[var(--color-pg-surface,#18181b)] border border-[var(--color-pg-border,#27272a)] flex items-center justify-center text-[var(--color-pg-text,#fafafa)] active:scale-95 transition-transform"
                    >
                        <MenuIcon size={18} />
                    </button>

                    {currentView !== 'dashboard' && (
                        <Link
                            href={backUrl || `/c/${slug}`}
                            className="h-9 px-3 rounded-xl bg-[var(--color-pg-surface,#18181b)] text-[var(--color-pg-text,#fafafa)] border border-[var(--color-pg-border,#27272a)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--color-pg-card-hover,#27272a)] transition-colors text-decoration-none"
                        >
                            <ChevronLeft size={16} />
                            <span className="hidden sm:inline">{language === 'id' ? 'Kembali' : 'Back'}</span>
                        </Link>
                    )}

                    {activeLogoPath && (
                        <img src={activeLogoPath} alt={companyName} className="h-9 w-auto object-contain flex-shrink-0" />
                    )}

                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-base sm:text-lg font-extrabold text-[var(--color-pg-text,#fafafa)] tracking-tight margin-0 leading-tight">
                                {companyName} · <span className="text-indigo-400">{title}</span>
                            </h1>
                            {wsStatus && (
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                    wsStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                }`}>
                                    ● {onlineUsersCount !== undefined ? `${onlineUsersCount} Online` : wsStatus}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-[var(--color-pg-text-muted,#71717a)] margin-0">
                            {auth_user ? `${language === 'en' ? 'Hello' : 'Halo'}, ${auth_user.name} (${auth_user.post_display_name ? localizedDisplay({ display_name: auth_user.post_display_name, display_name_id: auth_user.post_display_name_id }, language) : (role || 'Operator')}) · ` : ''}
                            {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Right Action Toolbar: Language + Settings + Log Out */}
                <div className="flex items-center gap-2">
                    {/* Language Switcher */}
                    <div className="hidden sm:flex items-center gap-0.5 p-1 rounded-xl bg-[var(--color-pg-surface,#18181b)] border border-[var(--color-pg-border,#27272a)]">
                        <button
                            type="button"
                            onClick={() => changeLanguage('en')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${language === 'en' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--color-pg-text-muted,#71717a)]'}`}
                        >
                            EN
                        </button>
                        <button
                            type="button"
                            onClick={() => changeLanguage('id')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${language === 'id' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--color-pg-text-muted,#71717a)]'}`}
                        >
                            ID
                        </button>
                    </div>

                    {/* Trouble Reports Quick Link */}
                    {currentView !== 'trouble-reports' && (
                        <Link
                            href={`/c/${slug}/trouble-reports`}
                            className="h-9 w-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors text-decoration-none"
                            title={language === 'en' ? 'Trouble Reports' : 'Laporan Kendala'}
                        >
                            <AlertTriangle size={18} />
                        </Link>
                    )}

                    {/* Account Settings Link */}
                    <Link
                        href={`/c/${slug}/profile`}
                        className="h-9 px-3 rounded-xl bg-[var(--color-pg-surface,#18181b)] border border-[var(--color-pg-border,#27272a)] text-[var(--color-pg-text-secondary,#a1a1aa)] hover:text-white flex items-center gap-1.5 text-xs font-bold text-decoration-none transition-colors"
                        title={language === 'en' ? 'Account Settings' : 'Pengaturan Akun'}
                    >
                        <Settings size={16} />
                        <span className="hidden md:inline">{language === 'en' ? 'Settings' : 'Pengaturan'}</span>
                    </Link>

                    {/* Log Out / Exit Button */}
                    <button
                        type="button"
                        onClick={() => router.post('/logout')}
                        className="h-9 px-3.5 rounded-xl bg-red-500 text-white font-extrabold text-xs shadow-md shadow-red-500/20 hover:bg-red-600 active:scale-95 transition-all flex items-center gap-1.5"
                        title={language === 'en' ? 'Exit / Log out' : 'Keluar'}
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">{language === 'en' ? 'Exit' : 'Keluar'}</span>
                    </button>
                </div>
            </header>

            {/* MOBILE DRAWER SHEET (Slide-Over for Mobile) */}
            {mobileDrawerOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                        onClick={() => setMobileDrawerOpen(false)}
                    />
                    <div className="relative w-4/5 max-w-xs bg-[var(--color-pg-surface,#18181b)] border-r border-[var(--color-pg-border,#27272a)] flex flex-col h-full z-10 shadow-2xl">
                        <div className="p-4 flex items-center justify-between border-b border-[var(--color-pg-border,#27272a)]">
                            <div className="flex items-center gap-2">
                                {activeLogoPath ? (
                                    <img src={activeLogoPath} alt={companyName} className="h-7 w-auto object-contain" />
                                ) : (
                                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold flex items-center justify-center text-xs">
                                        {companyName.charAt(0)}
                                    </div>
                                )}
                                <span className="font-extrabold text-sm text-white truncate">{companyName}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMobileDrawerOpen(false)}
                                className="w-8 h-8 rounded-lg bg-[var(--color-pg-bg,#09090b)] flex items-center justify-center text-[var(--color-pg-text-muted,#71717a)]"
                            >
                                <Close size={18} />
                            </button>
                        </div>

                        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentView === item.key;
                                const label = language === 'en' ? item.labelEn : item.labelId;

                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        onClick={() => setMobileDrawerOpen(false)}
                                        className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs text-decoration-none ${
                                            isActive
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                                : 'text-[var(--color-pg-text-secondary,#a1a1aa)] hover:bg-[var(--color-pg-card-hover,#27272a)]'
                                        }`}
                                    >
                                        <Icon size={18} />
                                        <span>{label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="p-4 border-t border-[var(--color-pg-border,#27272a)] space-y-2">
                            <Link
                                href={`/c/${slug}/profile`}
                                onClick={() => setMobileDrawerOpen(false)}
                                className="w-full py-2.5 rounded-xl bg-[var(--color-pg-bg,#09090b)] border border-[var(--color-pg-border,#27272a)] text-white font-bold text-xs flex items-center justify-center gap-2 text-decoration-none"
                            >
                                <Settings size={16} />
                                <span>{language === 'en' ? 'Account Settings' : 'Pengaturan Akun'}</span>
                            </Link>

                            <button
                                type="button"
                                onClick={() => router.post('/logout')}
                                className="w-full py-2.5 rounded-xl bg-red-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                            >
                                <LogOut size={16} />
                                <span>{language === 'en' ? 'Exit / Log out' : 'Keluar'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MOBILE BOTTOM NAVIGATION BAR (Google Material 3 Navbar Bottom) */}
            <nav
                className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-pg-surface,#18181b)]/95 backdrop-blur-2xl border-t border-[var(--color-pg-border,#27272a)] px-2 py-2 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.4)]"
                style={{ height: '64px' }}
            >
                {mobileBottomItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.key;

                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 py-1 text-decoration-none group transition-all relative ${
                                isActive ? 'text-indigo-400' : 'text-[var(--color-pg-text-muted,#71717a)] hover:text-[var(--color-pg-text,#fafafa)]'
                            }`}
                        >
                            <div className={`px-4 py-1 rounded-full flex items-center justify-center transition-all ${
                                isActive
                                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-500/10 scale-105'
                                    : 'bg-transparent group-active:scale-95'
                            }`}>
                                <Icon size={20} />
                            </div>
                            <span className={`text-[10px] font-bold mt-1 tracking-tight truncate ${
                                isActive ? 'text-indigo-300 font-black' : 'text-[var(--color-pg-text-muted,#71717a)]'
                            }`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
};

export default WorkerHeader;
