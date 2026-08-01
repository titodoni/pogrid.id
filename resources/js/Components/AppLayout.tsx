import React, { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Broadcast,
    Repeat,
    CreditCard,
    UserIcon,
    AlertTriangle,
    TrendingUp,
    FolderArchive,
    Coins,
    Palette,
    MenuIcon,
    Close,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Search,
    Settings
} from './Icons';

export interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    activeNav?: 'dashboard' | 'create-po' | 'rework' | 'billing' | 'profile' | 'kiosk' | 'finance-ledger' | 'my-kpi' | 'archive' | 'trouble-reports';
    userRole?: string;
    slug?: string;
    onSearchClick?: () => void;
    actionButton?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
    children,
    title,
    subtitle,
    activeNav = 'dashboard',
    userRole,
    slug: propSlug,
    onSearchClick,
    actionButton,
}) => {
    const page = usePage();
    const { auth, tenant: sharedTenant } = page.props as any;

    const authUser = auth?.user || (page.props as any).auth_user;
    const currentSlug = propSlug || sharedTenant?.slug || authUser?.tenant_slug || '';
    const logoPath = sharedTenant?.logo_path;
    const companyName = sharedTenant?.company_name || 'POgrid.id';

    // Theme & Language State
    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'id';
    });
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        return localStorage.getItem('pogrid_sidebar_collapsed') === 'true';
    });

    useEffect(() => {
        const themeToApply = sharedTenant?.theme || localStorage.getItem('pogrid_theme') || 'theme-default';
        document.documentElement.className = themeToApply;
    }, [sharedTenant?.theme]);

    const changeLanguage = (lang: 'en' | 'id') => {
        setLanguage(lang);
        localStorage.setItem('pogrid_lang', lang);
    };

    const changeTheme = (newTheme: string) => {
        localStorage.setItem('pogrid_theme', newTheme);
        const classes = ['theme-default', 'theme-linear', 'theme-vercel', 'theme-stripe', 'theme-github', 'theme-nordic', 'theme-light', 'theme-brand'];
        classes.forEach(c => document.documentElement.classList.remove(c));
        document.documentElement.classList.add(newTheme);
        setShowThemeDropdown(false);
    };

    // Close mobile drawer & theme dropdown whenever page props change (Inertia nav)
    useEffect(() => {
        setMobileDrawerOpen(false);
        setShowThemeDropdown(false);
    }, [page.url]);

    const toggleSidebar = () => {
        const next = !sidebarCollapsed;
        setSidebarCollapsed(next);
        localStorage.setItem('pogrid_sidebar_collapsed', String(next));
    };

    // Determine if user is Owner/Office or Worker/Floor
    const isOwnerRole = !currentSlug || authUser?.role_level === 'office' || authUser?.is_owner || ['ADMIN', 'MANAGER', 'SALES', 'OWNER'].includes(authUser?.role?.toUpperCase() || '');

    // Owner Navigation Links
    const ownerNavItems = [
        {
            key: 'dashboard',
            labelEn: 'Dashboard',
            labelId: 'Dasbor Utama',
            href: '/dashboard',
            icon: LayoutDashboard,
        },
        {
            key: 'create-po',
            labelEn: 'Broadcast PO',
            labelId: 'Broadcast PO',
            href: '/pos/create',
            icon: Broadcast,
            badgeEn: 'New',
            badgeId: 'Baru',
        },
        {
            key: 'rework',
            labelEn: 'Rework Logbook',
            labelId: 'Logbook Rework',
            href: '/rework-logbook',
            icon: Repeat,
        },
        {
            key: 'archive',
            labelEn: 'PO Archive',
            labelId: 'Arsip PO',
            href: currentSlug ? `/c/${currentSlug}/archive` : '/dashboard',
            icon: FolderArchive,
        },
        {
            key: 'billing',
            labelEn: 'Billing & Plan',
            labelId: 'Langganan & Paket',
            href: '/billing',
            icon: CreditCard,
        },
        {
            key: 'profile',
            labelEn: 'Settings & Team',
            labelId: 'Pengaturan & Tim',
            href: '/profile',
            icon: UserIcon,
        },
    ];

    // Worker Navigation Links
    const workerNavItems = [
        {
            key: 'kiosk',
            labelEn: 'Station Kiosk',
            labelId: 'Kiosk Stasiun',
            href: `/c/${currentSlug}`,
            icon: LayoutDashboard,
        },
        {
            key: 'my-kpi',
            labelEn: 'My KPI',
            labelId: 'KPI Saya',
            href: `/c/${currentSlug}/my-kpi`,
            icon: TrendingUp,
        },
        {
            key: 'trouble-reports',
            labelEn: 'Trouble Alerts',
            labelId: 'Laporan Kendala',
            href: `/c/${currentSlug}/trouble-reports`,
            icon: AlertTriangle,
            badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        },
        {
            key: 'archive',
            labelEn: 'PO Archive',
            labelId: 'Arsip PO',
            href: `/c/${currentSlug}/archive`,
            icon: FolderArchive,
        },
        ...(authUser?.role === 'FINANCE' ? [{
            key: 'finance-ledger',
            labelEn: 'Finance Ledger',
            labelId: 'Ledger Finansial',
            href: `/c/${currentSlug}/finance-ledger`,
            icon: Coins,
        }] : []),
    ];

    const navItems = isOwnerRole ? ownerNavItems : workerNavItems;

    // Mobile Bottom Bar Navigation Items (Top 4 key items)
    const mobileBottomItems = isOwnerRole
        ? [
            { key: 'dashboard', label: language === 'en' ? 'Dashboard' : 'Dasbor', href: '/dashboard', icon: LayoutDashboard },
            { key: 'create-po', label: language === 'en' ? 'New PO' : 'Buat PO', href: '/pos/create', icon: Broadcast },
            { key: 'rework', label: language === 'en' ? 'Rework' : 'Rework', href: '/rework-logbook', icon: Repeat },
            { key: 'billing', label: language === 'en' ? 'Billing' : 'Paket', href: '/billing', icon: CreditCard },
        ]
        : [
            { key: 'kiosk', label: language === 'en' ? 'Kiosk' : 'Kiosk', href: `/c/${currentSlug}`, icon: LayoutDashboard },
            { key: 'my-kpi', label: language === 'en' ? 'My KPI' : 'KPI Saya', href: `/c/${currentSlug}/my-kpi`, icon: TrendingUp },
            { key: 'trouble-reports', label: language === 'en' ? 'Alerts' : 'Kendala', href: `/c/${currentSlug}/trouble-reports`, icon: AlertTriangle },
            { key: 'archive', label: language === 'en' ? 'Archive' : 'Arsip', href: `/c/${currentSlug}/archive`, icon: FolderArchive },
        ];

    return (
        <div className="min-h-screen bg-[var(--color-pg-bg,#09090b)] text-[var(--color-pg-text,#fafafa)] flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200 max-w-full overflow-x-hidden relative">
            
            {/* DESKTOP SIDEBAR NAVIGATION */}
            <aside
                className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-[var(--color-pg-surface,#18181b)] border-r border-[var(--color-pg-border,#27272a)] transition-all duration-300 ease-in-out ${
                    sidebarCollapsed ? 'w-20' : 'w-64 lg:w-72'
                }`}
                style={{
                    backdropFilter: 'blur(20px)',
                    boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
                }}
            >
                {/* Sidebar Brand Header */}
                <div className={`h-18 px-4 flex items-center border-b border-[var(--color-pg-border-subtle,#1f1f23)] ${sidebarCollapsed ? 'flex-col justify-center gap-1 py-3 h-auto' : 'justify-between'}`}>
                    <Link href={isOwnerRole ? '/dashboard' : `/c/${currentSlug}`} className={`flex items-center gap-3 overflow-hidden text-decoration-none group ${sidebarCollapsed ? 'justify-center' : ''}`}>
                        {logoPath ? (
                            <img src={logoPath} alt={companyName} className="h-9 w-auto max-w-[40px] object-contain flex-shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/25 flex-shrink-0 group-hover:scale-105 transition-transform">
                                {companyName.charAt(0)}
                            </div>
                        )}
                        {!sidebarCollapsed && (
                            <div className="flex flex-col truncate">
                                <span className="font-extrabold text-sm tracking-tight text-[var(--color-pg-text,#fafafa)] truncate leading-tight group-hover:text-indigo-400 transition-colors">
                                    {companyName}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] font-bold text-indigo-400">POgrid.id</span>
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                                        {isOwnerRole ? 'Owner' : 'Kiosk'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </Link>

                    <button
                        onClick={toggleSidebar}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-pg-text-muted,#71717a)] hover:text-[var(--color-pg-text,#fafafa)] hover:bg-[var(--color-pg-card-hover,#27272a)] transition-all"
                        title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                {/* Quick Action Broadcast Button (Owner) */}
                {isOwnerRole && !sidebarCollapsed && (
                    <div className="p-3">
                        <Link
                            href="/pos/create"
                            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-500/25 border border-indigo-400/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] text-decoration-none"
                        >
                            <Broadcast size={16} />
                            <span>{language === 'en' ? 'Broadcast New PO' : 'Broadcast PO Baru'}</span>
                        </Link>
                    </div>
                )}

                {/* Navigation Links */}
                <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                    <div className={`text-[10px] font-bold text-[var(--color-pg-text-muted,#71717a)] uppercase tracking-wider px-3 mb-2 ${sidebarCollapsed ? 'text-center' : ''}`}>
                        {sidebarCollapsed ? '•' : (language === 'en' ? 'Navigation' : 'Navigasi')}
                    </div>

                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeNav === item.key;
                        const label = language === 'en' ? item.labelEn : item.labelId;

                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`flex items-center rounded-xl font-semibold text-xs transition-all text-decoration-none relative group ${
                                    sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                                } ${
                                    isActive
                                        ? 'bg-[var(--color-pg-primary-glow,rgba(99,102,241,0.15))] text-indigo-400 border border-indigo-500/30 shadow-sm'
                                        : 'text-[var(--color-pg-text-secondary,#a1a1aa)] hover:text-[var(--color-pg-text,#fafafa)] hover:bg-[var(--color-pg-card-hover,#27272a)] border border-transparent'
                                }`}
                                title={sidebarCollapsed ? label : undefined}
                            >
                                {isActive && !sidebarCollapsed && (
                                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full shadow-sm" />
                                )}

                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isActive ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' : 'group-hover:bg-[var(--color-pg-surface,#18181b)] text-current'
                                }`}>
                                    <Icon size={18} />
                                </div>

                                {!sidebarCollapsed && (
                                    <span className="truncate flex-1">{label}</span>
                                )}

                                {!sidebarCollapsed && item.badgeEn && (
                                    <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'}`}>
                                        {language === 'en' ? item.badgeEn : item.badgeId}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer User Profile Card & Controls */}
                <div className="p-3 border-t border-[var(--color-pg-border-subtle,#1f1f23)] bg-[var(--color-pg-bg,#09090b)]/50">
                    {!sidebarCollapsed ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--color-pg-surface,#18181b)] border border-[var(--color-pg-border,#27272a)]">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-xs flex-shrink-0 relative">
                                    {authUser?.name ? authUser.name.charAt(0).toUpperCase() : 'U'}
                                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[var(--color-pg-surface,#18181b)]" />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-xs font-bold text-[var(--color-pg-text,#fafafa)] truncate">
                                        {authUser?.name || 'User'}
                                    </span>
                                    <span className="text-[10px] text-[var(--color-pg-text-muted,#71717a)] truncate">
                                        {authUser?.post_name || authUser?.role_name || authUser?.role || 'Member'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--color-pg-surface,#18181b)] border border-[var(--color-pg-border,#27272a)]">
                                    <button
                                        onClick={() => changeLanguage('en')}
                                        className={`px-2 py-1 rounded text-[10px] font-extrabold transition-all ${
                                            language === 'en' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--color-pg-text-muted,#71717a)] hover:text-white'
                                        }`}
                                    >
                                        EN
                                    </button>
                                    <button
                                        onClick={() => changeLanguage('id')}
                                        className={`px-2 py-1 rounded text-[10px] font-extrabold transition-all ${
                                            language === 'id' ? 'bg-indigo-600 text-white shadow' : 'text-[var(--color-pg-text-muted,#71717a)] hover:text-white'
                                        }`}
                                    >
                                        ID
                                    </button>
                                </div>

                                <button
                                    onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                                    className="p-1.5 rounded-lg bg-[var(--color-pg-surface,#18181b)] border border-[var(--color-pg-border,#27272a)] text-[var(--color-pg-text-secondary,#a1a1aa)] hover:text-white transition-all"
                                    title="Theme Picker"
                                >
                                    <Palette size={16} />
                                </button>

                                <button
                                    onClick={() => router.post('/logout')}
                                    className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all ml-auto"
                                    title={language === 'en' ? 'Log out' : 'Keluar'}
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <div
                                className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-xs relative cursor-default"
                                title={authUser?.name || 'User'}
                            >
                                {authUser?.name ? authUser.name.charAt(0).toUpperCase() : 'U'}
                                <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[var(--color-pg-surface,#18181b)]" />
                            </div>
                            <button
                                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                                className="w-10 h-10 rounded-xl bg-[var(--color-pg-surface,#18181b)] border border-[var(--color-pg-border,#27272a)] flex items-center justify-center text-[var(--color-pg-text-secondary,#a1a1aa)] hover:text-white"
                                title="Theme"
                            >
                                <Palette size={18} />
                            </button>
                            <button
                                onClick={() => router.post('/logout')}
                                className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20"
                                title={language === 'en' ? 'Log out' : 'Keluar'}
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN CONTENT WRAPPER */}
            <div className={`flex-1 transition-all duration-300 min-w-0 max-w-full overflow-x-hidden flex flex-col ${
                sidebarCollapsed ? 'md:ml-20 md:w-[calc(100%-5rem)]' : 'md:ml-64 md:w-[calc(100%-16rem)] lg:ml-72 lg:w-[calc(100%-18rem)]'
            }`}>
                {/* DESKTOP / TOP HEADER BAR */}
                <header className="sticky top-0 z-30 bg-[var(--color-pg-surface,#18181b)]/90 backdrop-blur-xl border-b border-[var(--color-pg-border,#27272a)] px-4 sm:px-6 py-3 flex items-center justify-between min-w-0 max-w-full box-border w-full">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileDrawerOpen(true)}
                            className="md:hidden w-9 h-9 rounded-xl bg-[var(--color-pg-bg,#09090b)] border border-[var(--color-pg-border,#27272a)] flex items-center justify-center text-[var(--color-pg-text,#fafafa)] active:scale-95 transition-transform"
                        >
                            <MenuIcon size={20} />
                        </button>

                        {logoPath && (
                            <img src={logoPath} alt={companyName} className="h-8 w-auto object-contain flex-shrink-0" />
                        )}

                        <div className="flex flex-col">
                            <h1 className="text-base sm:text-lg font-extrabold text-[var(--color-pg-text,#fafafa)] tracking-tight margin-0 leading-tight">
                                {companyName} {title ? `· ${title}` : ''}
                            </h1>
                            {subtitle && (
                                <span className="text-[11px] text-[var(--color-pg-text-muted,#71717a)] margin-0">
                                    {subtitle}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {onSearchClick && (
                            <button
                                onClick={onSearchClick}
                                className="h-9 px-3 rounded-xl bg-[var(--color-pg-bg,#09090b)] border border-[var(--color-pg-border,#27272a)] text-[var(--color-pg-text-secondary,#a1a1aa)] hover:text-white flex items-center gap-2 text-xs font-bold transition-colors"
                            >
                                <Search size={16} />
                                <span className="hidden sm:inline">{language === 'en' ? 'Search...' : 'Cari...'}</span>
                            </button>
                        )}

                        <Link
                            href="/profile"
                            className="h-9 px-3 rounded-xl bg-[var(--color-pg-surface,#18181b)] border border-[var(--color-pg-border,#27272a)] text-[var(--color-pg-text-secondary,#a1a1aa)] hover:text-white flex items-center gap-1.5 text-xs font-bold text-decoration-none transition-colors"
                            title={language === 'en' ? 'Settings' : 'Pengaturan'}
                        >
                            <Settings size={16} />
                            <span className="hidden sm:inline">{language === 'en' ? 'Settings' : 'Pengaturan'}</span>
                        </Link>

                        <button
                            onClick={() => router.post('/logout')}
                            className="h-9 px-3 rounded-xl bg-red-500 text-white font-extrabold text-xs shadow-md shadow-red-500/20 hover:bg-red-600 transition-all flex items-center gap-1.5"
                            title={language === 'en' ? 'Log out' : 'Keluar'}
                        >
                            <LogOut size={16} />
                            <span className="hidden sm:inline">{language === 'en' ? 'Log out' : 'Keluar'}</span>
                        </button>
                        {actionButton}
                    </div>
                </header>

                {/* CHILDREN CONTENT */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 min-w-0 max-w-full box-border overflow-x-hidden">
                    {children}
                </main>
            </div>

            {/* MOBILE DRAWER SHEET (Slide-Over for Mobile) */}
            {mobileDrawerOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                        onClick={() => setMobileDrawerOpen(false)}
                    />
                    <div className="relative w-4/5 max-w-xs bg-[var(--color-pg-surface,#18181b)] border-r border-[var(--color-pg-border,#27272a)] flex flex-col h-full z-10 shadow-2xl">
                        <div className="p-4 flex items-center justify-between border-b border-[var(--color-pg-border,#27272a)]">
                            <div className="flex items-center gap-2 min-w-0">
                                {logoPath ? (
                                    <img src={logoPath} alt={companyName} className="h-7 w-auto object-contain flex-shrink-0" />
                                ) : (
                                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold flex items-center justify-center text-xs flex-shrink-0">
                                        {companyName.charAt(0)}
                                    </div>
                                )}
                                <span className="font-extrabold text-sm text-[var(--color-pg-text,#fafafa)] truncate">{companyName}</span>
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
                                const isActive = activeNav === item.key;
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
                                href="/profile"
                                onClick={() => setMobileDrawerOpen(false)}
                                className="w-full py-2.5 rounded-xl bg-[var(--color-pg-bg,#09090b)] border border-[var(--color-pg-border,#27272a)] text-[var(--color-pg-text,#fafafa)] font-bold text-xs flex items-center justify-center gap-2 text-decoration-none"
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
                                <span>{language === 'en' ? 'Log out' : 'Keluar'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MOBILE BOTTOM NAVIGATION BAR */}
            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-pg-surface,#18181b)]/95 backdrop-blur-2xl border-t border-[var(--color-pg-border,#27272a)] px-2 py-2 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.4)]"
                style={{ height: '64px' }}
            >
                {mobileBottomItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeNav === item.key;

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
        </div>
    );
};

export default AppLayout;
