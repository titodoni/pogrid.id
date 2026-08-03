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
    ScrollText,
    Palette,
    MenuIcon,
    Close,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Search,
    Settings,
} from './Icons';

type Lang = 'en' | 'id';

export interface AppShellUser {
    name?: string;
    role?: string;
    role_name?: string;
    role_level?: string;
    post_name?: string;
    post_display_name?: string;
    post_display_name_id?: string;
    is_owner?: boolean;
}

type IconComp = React.FC<{ size?: number; className?: string }>;

interface NavItem {
    key: string;
    labelEn: string;
    labelId: string;
    href: string;
    icon: IconComp;
    badgeEn?: string;
    badgeId?: string;
}

interface BottomItem {
    key: string;
    labelEn: string;
    labelId: string;
    href: string;
    icon: IconComp;
}

interface RoleConfig {
    badgeLabel: string;
    navItems: NavItem[];
    bottomItems: BottomItem[];
    primaryCta: { labelEn: string; labelId: string; href: string; icon: IconComp };
}

function getRoleConfig(variant: 'office' | 'worker', user: AppShellUser, slug: string): RoleConfig {
    if (variant === 'office') {
        const officeRole = (user.role_name || user.role || '').toUpperCase();
        // Owners, Managers, and Sales are denied PO creation/broadcast (POST /pos → 403),
        // so they must not see PO-creation entry points in the chrome.
        const cannotPo = user.is_owner === true || officeRole === 'MANAGER' || officeRole === 'SALES';

        const navItems: NavItem[] = [
            { key: 'dashboard', labelEn: 'Dashboard', labelId: 'Dasbor Utama', href: '/dashboard', icon: LayoutDashboard },
            ...(cannotPo ? [] : [
                { key: 'create-po', labelEn: 'Broadcast PO', labelId: 'Broadcast PO', href: '/pos/create', icon: Broadcast, badgeEn: 'New', badgeId: 'Baru' } as NavItem,
            ]),
            { key: 'rework', labelEn: 'Rework Logbook', labelId: 'Logbook Rework', href: '/rework-logbook', icon: Repeat },
            { key: 'logs', labelEn: 'Project Logs', labelId: 'Log Proyek', href: '/logs', icon: ScrollText },
            { key: 'archive', labelEn: 'PO Archive', labelId: 'Arsip PO', href: slug ? `/c/${slug}?tab=completed` : '/dashboard', icon: FolderArchive },
            { key: 'billing', labelEn: 'Billing & Plan', labelId: 'Langganan & Paket', href: '/billing', icon: CreditCard },
            { key: 'profile', labelEn: 'Settings & Team', labelId: 'Pengaturan & Tim', href: slug ? `/c/${slug}?tab=team` : '/profile', icon: UserIcon },
        ];

        const bottomItems: BottomItem[] = [
            { key: 'dashboard', labelEn: 'Dashboard', labelId: 'Dasbor', href: '/dashboard', icon: LayoutDashboard },
            ...(cannotPo ? [] : [
                { key: 'create-po', labelEn: 'New PO', labelId: 'Buat PO', href: '/pos/create', icon: Broadcast },
            ]),
            { key: 'rework', labelEn: 'Rework', labelId: 'Rework', href: '/rework-logbook', icon: Repeat },
            { key: 'profile', labelEn: 'Settings', labelId: 'Pengaturan', href: slug ? `/c/${slug}?tab=team` : '/profile', icon: Settings },
        ];

        const primaryCta = cannotPo
            ? { labelEn: 'Dashboard', labelId: 'Dasbor', href: '/dashboard', icon: LayoutDashboard }
            : { labelEn: 'Broadcast PO', labelId: 'Broadcast PO', href: '/pos/create', icon: Broadcast };

        return { badgeLabel: 'OFFICE', navItems, bottomItems, primaryCta };
    }

    const role = (user.role_name || user.role || '').toUpperCase();
    const isFinance = role === 'FINANCE';
    let cta: RoleConfig['primaryCta'];
    switch (role) {
        case 'DRAFTER':
            cta = { labelEn: 'Drafter Status', labelId: 'Status Drafter', href: `/c/${slug}`, icon: Settings };
            break;
        case 'PURCHASING':
            cta = { labelEn: 'Update Purchasing', labelId: 'Update Purchasing', href: `/c/${slug}`, icon: Settings };
            break;
        case 'QC':
            cta = { labelEn: 'Inspect / Rework', labelId: 'Periksa / Rework', href: `/c/${slug}`, icon: AlertTriangle };
            break;
        case 'DELIVERY':
            cta = { labelEn: 'Delivery Status', labelId: 'Status Kirim', href: `/c/${slug}`, icon: ChevronRight };
            break;
        case 'FINANCE':
            cta = { labelEn: 'Finance Ledger', labelId: 'Ledger Finansial', href: `/c/${slug}/finance-ledger`, icon: Coins };
            break;
        case 'MACHINING':
        case 'FABRICATION':
        case 'PRODUCTION':
        case 'ASSEMBLY':
        case 'SURFACE':
            cta = { labelEn: 'Log Progress', labelId: 'Catat Progress', href: `/c/${slug}`, icon: TrendingUp };
            break;
        default:
            cta = { labelEn: 'Open Station', labelId: 'Buka Stasiun', href: `/c/${slug}`, icon: LayoutDashboard };
    }

    const navItems: NavItem[] = [
        { key: 'dashboard', labelEn: 'Production Station', labelId: 'Stasiun Produksi', href: `/c/${slug}`, icon: LayoutDashboard },
        { key: 'my-kpi', labelEn: 'My Performance / KPI', labelId: 'Performa / KPI Saya', href: `/c/${slug}/my-kpi`, icon: TrendingUp },
        { key: 'trouble-reports', labelEn: 'Trouble Reports', labelId: 'Laporan Kendala', href: `/c/${slug}/trouble-reports`, icon: AlertTriangle, badgeEn: 'Alert', badgeId: 'Alert' },
        { key: 'archive', labelEn: 'PO Archive', labelId: 'Arsip PO', href: `/c/${slug}/archive`, icon: FolderArchive },
        ...(isFinance
            ? [{ key: 'finance-ledger', labelEn: 'Finance Ledger', labelId: 'Ledger Finansial', href: `/c/${slug}/finance-ledger`, icon: Coins }]
            : []),
    ];

    const bottomItems: BottomItem[] = isFinance
        ? [
            { key: 'dashboard', labelEn: 'Station', labelId: 'Stasiun', href: `/c/${slug}`, icon: LayoutDashboard },
            { key: 'finance-ledger', labelEn: 'Ledger', labelId: 'Ledger', href: `/c/${slug}/finance-ledger`, icon: Coins },
            { key: 'my-kpi', labelEn: 'My KPI', labelId: 'KPI Saya', href: `/c/${slug}/my-kpi`, icon: TrendingUp },
            { key: 'trouble-reports', labelEn: 'Alerts', labelId: 'Kendala', href: `/c/${slug}/trouble-reports`, icon: AlertTriangle },
        ]
        : [
            { key: 'dashboard', labelEn: 'Station', labelId: 'Stasiun', href: `/c/${slug}`, icon: LayoutDashboard },
            { key: 'my-kpi', labelEn: 'My KPI', labelId: 'KPI Saya', href: `/c/${slug}/my-kpi`, icon: TrendingUp },
            { key: 'trouble-reports', labelEn: 'Alerts', labelId: 'Kendala', href: `/c/${slug}/trouble-reports`, icon: AlertTriangle },
            { key: 'archive', labelEn: 'Archive', labelId: 'Arsip', href: `/c/${slug}/archive`, icon: FolderArchive },
        ];

    return { badgeLabel: 'FLOOR', navItems, bottomItems, primaryCta: cta };
}

const THEME_CLASSES = ['theme-default', 'theme-linear', 'theme-vercel', 'theme-stripe', 'theme-github', 'theme-nordic', 'theme-light', 'theme-brand'];

export interface AppShellProps {
    children?: React.ReactNode;
    variant: 'office' | 'worker';
    user: AppShellUser;
    slug?: string;
    title?: string;
    subtitle?: string;
    activeNav?: string;
    language: Lang;
    changeLanguage: (l: Lang) => void;
    onSearchClick?: () => void;
    actionButton?: React.ReactNode;
    backUrl?: string;
    onlineUsersCount?: number;
    wsStatus?: string;
    showClock?: boolean;
    logoPath?: string | null;
}

export const AppShell: React.FC<AppShellProps> = ({
    children,
    variant,
    user,
    slug = '',
    title,
    subtitle,
    activeNav = 'dashboard',
    language,
    changeLanguage,
    onSearchClick,
    actionButton,
    backUrl,
    onlineUsersCount,
    wsStatus,
    showClock,
    logoPath,
}) => {
    const page = usePage();
    const sharedTenant = (page.props as any).tenant;
    const companyName = sharedTenant?.company_name || (variant === 'office' ? 'POgrid.id' : 'Factory Production');
    const activeLogoPath = logoPath ?? sharedTenant?.logo_path;

    const isOffice = variant === 'office';
    // Office chrome shows at md; worker chrome shows at lg (worker pages offset content with lg:ml-64).
    // Breakpoint classes are written as literals so Tailwind's scanner picks them up.
    const sidebarVisibility = isOffice ? 'hidden md:flex' : 'hidden lg:flex';
    const mobileOnly = isOffice ? 'md:hidden' : 'lg:hidden';

    const [showThemeDropdown, setShowThemeDropdown] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('pogrid_sidebar_collapsed') === 'true';
    });
    const [currentTime, setCurrentTime] = useState(() => new Date());

    useEffect(() => {
        const themeToApply = sharedTenant?.theme || localStorage.getItem('pogrid_theme') || 'theme-default';
        document.documentElement.className = themeToApply;
    }, [sharedTenant?.theme]);

    useEffect(() => {
        if (!showClock) return;
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, [showClock]);

    useEffect(() => {
        setMobileDrawerOpen(false);
        setShowThemeDropdown(false);
    }, [page.url]);

    const toggleSidebar = () => {
        const next = !sidebarCollapsed;
        setSidebarCollapsed(next);
        localStorage.setItem('pogrid_sidebar_collapsed', String(next));
    };

    const changeTheme = (newTheme: string) => {
        localStorage.setItem('pogrid_theme', newTheme);
        THEME_CLASSES.forEach((c) => document.documentElement.classList.remove(c));
        document.documentElement.classList.add(newTheme);
        setShowThemeDropdown(false);
    };

    const config = getRoleConfig(variant, user, slug);
    const homeHref = isOffice ? '/dashboard' : `/c/${slug}`;
    const settingsHref = isOffice ? '/profile' : `/c/${slug}/profile`;
    const roleLabel = language === 'id'
        ? (user.post_display_name_id || user.post_name || user.role_name || user.role || 'Member')
        : (user.post_display_name || user.post_name || user.role_name || user.role || 'Member');

    // Collapse only applies to office variant; worker sidebar is always w-64 expanded.
    const collapsed = isOffice && sidebarCollapsed;
    const sidebarWidthClass = isOffice
        ? (collapsed ? 'w-20' : 'w-64 lg:w-72')
        : 'w-64';

    const ThemeMenu: React.FC<{ collapsed: boolean }> = ({ collapsed: c }) => (
        <div className="relative">
            <button
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className={`${c ? 'w-9 h-9' : 'w-7 h-7'} rounded-[2px] border border-[var(--color-pg-nav-border)] bg-[var(--color-pg-nav-hover)] flex items-center justify-center text-[var(--color-pg-nav-muted)] hover:text-[var(--color-pg-nav-text)] transition-colors`}
                title="Theme"
            >
                <Palette size={c ? 16 : 14} />
            </button>
            {showThemeDropdown && (
                <div className={`absolute z-50 min-w-[10rem] bg-[var(--color-pg-nav)] border border-[var(--color-pg-nav-border)] rounded-[6px] shadow-xl p-1 ${c ? 'left-full ml-2 top-0' : 'bottom-full mb-2 left-0'}`}>
                    {THEME_CLASSES.map((th) => (
                        <button
                            key={th}
                            onClick={() => changeTheme(th)}
                            className="w-full text-left px-2.5 py-1.5 mono text-[11px] text-[var(--color-pg-nav-muted)] hover:bg-[var(--color-pg-nav-hover)] hover:text-[var(--color-pg-nav-text)] rounded-[4px] uppercase tracking-[0.1em] transition-colors"
                        >
                            {th.replace('theme-', '')}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    // ===== SIDEBAR =====
    const sidebar = (
        <aside
            className={`${sidebarVisibility} flex-col fixed top-0 left-0 bottom-0 z-40 bg-[var(--color-pg-nav)] border-r border-[var(--color-pg-nav-border)] transition-all duration-300 ${sidebarWidthClass}`}
        >
            <div className="absolute top-0 left-0 right-0 h-[2px] line-grad z-20" />

            {/* Brand */}
            <div className={`px-4 h-16 flex items-center border-b border-[var(--color-pg-nav-border)] ${collapsed ? 'justify-center' : 'justify-between'}`}>
                <Link href={homeHref} className={`flex items-center gap-2.5 overflow-hidden group ${collapsed ? 'justify-center' : ''}`}>
                    {activeLogoPath ? (
                        <img src={activeLogoPath} alt={companyName} className="h-8 w-auto max-w-[36px] object-contain flex-shrink-0" />
                    ) : (
                        <div className="mono w-9 h-9 rounded-[2px] border border-[var(--color-pg-nav-border)] bg-[var(--color-pg-nav-hover)] text-[var(--color-pg-accent)] flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {companyName.charAt(0)}
                        </div>
                    )}
                    {!collapsed && (
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm text-[var(--color-pg-nav-text)] truncate leading-tight">{companyName}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="mono text-[10px] text-[var(--color-pg-accent)] uppercase tracking-[0.14em]">POgrid.id</span>
                                <span className="mono text-[9px] font-semibold px-1.5 py-0.5 rounded-[2px] bg-[var(--color-pg-nav-hover)] text-[var(--color-pg-nav-muted)] border border-[var(--color-pg-nav-border)] uppercase tracking-[0.14em]">
                                    {config.badgeLabel}
                                </span>
                            </div>
                        </div>
                    )}
                </Link>
                {isOffice && !collapsed && (
                    <button
                        onClick={toggleSidebar}
                        className="w-7 h-7 rounded-[2px] flex items-center justify-center text-[var(--color-pg-nav-muted)] hover:text-[var(--color-pg-nav-text)] hover:bg-[var(--color-pg-nav-hover)] transition-colors"
                        title="Collapse"
                    >
                        <ChevronLeft size={16} />
                    </button>
                )}
            </div>
            {isOffice && collapsed && (
                <button
                    onClick={toggleSidebar}
                    className="mx-auto mt-2 w-7 h-7 rounded-[2px] flex items-center justify-center text-[var(--color-pg-nav-muted)] hover:text-[var(--color-pg-nav-text)] hover:bg-[var(--color-pg-nav-hover)]"
                    title="Expand"
                >
                    <ChevronRight size={16} />
                </button>
            )}

            {/* Role CTA */}
            <div className={collapsed ? 'px-2 py-2' : 'p-3'}>
                <Link
                    href={config.primaryCta.href}
                    className={`${collapsed ? 'w-10 h-10 mx-auto' : 'w-full py-2.5 px-3'} bg-[var(--color-pg-primary)] text-[var(--color-pg-primary-ink)] hover:bg-[var(--color-pg-primary-hover)] font-semibold rounded-[2px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]`}
                    title={language === 'en' ? config.primaryCta.labelEn : config.primaryCta.labelId}
                >
                    <config.primaryCta.icon size={16} />
                    {!collapsed && (
                        <span className="mono text-[11px] uppercase tracking-[0.12em]">
                            {language === 'en' ? config.primaryCta.labelEn : config.primaryCta.labelId}
                        </span>
                    )}
                </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-2 overflow-y-auto">
                <div className={`mono text-[10px] font-medium text-[var(--color-pg-nav-muted)] uppercase tracking-[0.18em] px-2 mb-2 ${collapsed ? 'text-center' : ''}`}>
                    {collapsed ? '•' : (language === 'en' ? 'Navigation' : 'Navigasi')}
                </div>
                <div className="space-y-0.5">
                    {config.navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeNav === item.key;
                        const label = language === 'en' ? item.labelEn : item.labelId;
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                title={collapsed ? label : undefined}
                                className={`relative flex items-center rounded-[2px] border transition-colors ${
                                    collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                                } ${
                                    isActive
                                        ? 'bg-[var(--color-pg-nav-active)] border-[var(--color-pg-nav-border)] text-[var(--color-pg-nav-text)]'
                                        : 'border-transparent text-[var(--color-pg-nav-muted)] hover:text-[var(--color-pg-nav-text)] hover:bg-[var(--color-pg-nav-hover)]'
                                }`}
                            >
                                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-[var(--color-pg-primary)]" />}
                                <Icon size={16} className="flex-shrink-0" />
                                {!collapsed && (
                                    <span className="mono text-[11px] uppercase tracking-[0.12em] truncate flex-1">{label}</span>
                                )}
                                {!collapsed && item.badgeEn && (
                                    <span className="mono text-[9px] font-semibold px-1.5 py-0.5 rounded-[2px] bg-[var(--color-pg-accent)]/15 text-[var(--color-pg-accent)] border border-[var(--color-pg-accent)]/30 uppercase">
                                        {language === 'en' ? item.badgeEn : item.badgeId}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--color-pg-nav-border)]">
                {!collapsed ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2.5 p-2 rounded-[2px] border border-[var(--color-pg-nav-border)] bg-[var(--color-pg-nav-hover)]">
                            <div className="mono w-7 h-7 rounded-[2px] bg-[var(--color-pg-accent)]/15 text-[var(--color-pg-accent)] border border-[var(--color-pg-accent)]/30 flex items-center justify-center font-bold text-[11px] flex-shrink-0 relative">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-pg-success)] ring-2 ring-[var(--color-pg-nav)]" />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs font-bold text-[var(--color-pg-nav-text)] truncate">{user.name || 'User'}</span>
                                <span className="mono text-[10px] text-[var(--color-pg-nav-muted)] truncate uppercase tracking-[0.1em]">{roleLabel}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="mono flex items-center border border-[var(--color-pg-nav-border)] rounded-[2px] bg-[var(--color-pg-nav-hover)]" style={{ padding: 2 }}>
                                {(['en', 'id'] as Lang[]).map((l) => (
                                    <button
                                        key={l}
                                        onClick={() => changeLanguage(l)}
                                        className={`uppercase tracking-[0.12em] transition-all ${language === l ? 'bg-[var(--color-pg-nav-text)] text-[var(--color-pg-nav)]' : 'text-[var(--color-pg-nav-muted)] hover:text-[var(--color-pg-nav-text)]'}`}
                                        style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 3, paddingBottom: 3, fontSize: 10 }}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                            <ThemeMenu collapsed={false} />
                            <button
                                onClick={() => router.post('/logout')}
                                className="ml-auto w-7 h-7 rounded-[2px] border border-[var(--color-pg-danger)]/25 bg-[var(--color-pg-danger)]/10 text-[var(--color-pg-danger)] hover:bg-[var(--color-pg-danger)]/20 flex items-center justify-center transition-colors"
                                title={language === 'en' ? 'Log out' : 'Keluar'}
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <div className="mono w-9 h-9 rounded-[2px] bg-[var(--color-pg-accent)]/15 text-[var(--color-pg-accent)] border border-[var(--color-pg-accent)]/30 flex items-center justify-center font-bold text-xs" title={user.name || 'User'}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <ThemeMenu collapsed />
                        <button
                            onClick={() => router.post('/logout')}
                            className="w-9 h-9 rounded-[2px] border border-[var(--color-pg-danger)]/25 bg-[var(--color-pg-danger)]/10 text-[var(--color-pg-danger)] hover:bg-[var(--color-pg-danger)]/20 flex items-center justify-center"
                            title={language === 'en' ? 'Log out' : 'Keluar'}
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );

    // ===== HEADER =====
    const header = (
        <header className="sticky top-0 z-30 bg-[var(--color-pg-surface)] border-b border-[var(--color-pg-nav-border)] px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
                <button
                    onClick={() => setMobileDrawerOpen(true)}
                    className={`${mobileOnly} w-9 h-9 rounded-[2px] border border-[var(--color-pg-border)] bg-[var(--color-pg-card-hover)] flex items-center justify-center text-[var(--color-pg-text)] active:scale-95 transition-transform`}
                    aria-label="Menu"
                >
                    <MenuIcon size={18} />
                </button>
                {backUrl && (
                    <Link
                        href={backUrl}
                        className="w-9 h-9 rounded-[2px] border border-[var(--color-pg-border)] bg-[var(--color-pg-card-hover)] flex items-center justify-center text-[var(--color-pg-text-secondary)] hover:text-[var(--color-pg-text)] transition-colors"
                        title={language === 'en' ? 'Back' : 'Kembali'}
                    >
                        <ChevronLeft size={18} />
                    </Link>
                )}
                {activeLogoPath && (
                    <img src={activeLogoPath} alt={companyName} className={`h-7 w-auto object-contain flex-shrink-0 ${mobileOnly}`} />
                )}
                <div className="flex flex-col min-w-0">
                    <h1 className="text-sm sm:text-base font-bold text-[var(--color-pg-text)] tracking-tight truncate leading-tight">
                        {title || companyName}
                    </h1>
                    {subtitle && (
                        <span className="mono text-[10px] text-[var(--color-pg-text-muted)] uppercase tracking-[0.1em] truncate">{subtitle}</span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {showClock && (
                    <span className="mono hidden sm:inline text-[11px] text-[var(--color-pg-text-secondary)] tracking-[0.1em]">
                        {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
                {wsStatus && (
                    <span className="mono hidden sm:inline-flex items-center gap-1.5 text-[10px] text-[var(--color-pg-success)] border border-[var(--color-pg-success)]/25 bg-[var(--color-pg-success)]/10 px-2 py-1 rounded-[2px] uppercase tracking-[0.1em]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-pg-success)]" />
                        {wsStatus}
                    </span>
                )}
                {typeof onlineUsersCount === 'number' && (
                    <span className="mono hidden sm:inline text-[10px] text-[var(--color-pg-text-muted)] border border-[var(--color-pg-border)] bg-[var(--color-pg-card-hover)] px-2 py-1 rounded-[2px] uppercase tracking-[0.1em]">
                        {onlineUsersCount} {language === 'en' ? 'online' : 'aktif'}
                    </span>
                )}
                {onSearchClick && (
                    <button
                        onClick={onSearchClick}
                        className="h-9 px-3 rounded-[2px] border border-[var(--color-pg-border)] bg-[var(--color-pg-card-hover)] text-[var(--color-pg-text-secondary)] hover:text-[var(--color-pg-text)] flex items-center gap-2 text-xs font-semibold transition-colors"
                    >
                        <Search size={15} />
                        <span className="hidden sm:inline">{language === 'en' ? 'Search' : 'Cari'}</span>
                    </button>
                )}
                <Link
                    href={settingsHref}
                    className="h-9 w-9 rounded-[2px] border border-[var(--color-pg-border)] bg-[var(--color-pg-card-hover)] flex items-center justify-center text-[var(--color-pg-text-secondary)] hover:text-[var(--color-pg-text)] transition-colors"
                    title={language === 'en' ? 'Settings' : 'Pengaturan'}
                >
                    <Settings size={16} />
                </Link>
                <button
                    onClick={() => router.post('/logout')}
                    className="h-9 px-3 rounded-[2px] bg-[var(--color-pg-danger)] text-white font-bold text-xs flex items-center gap-1.5 hover:brightness-110 transition-all"
                    title={language === 'en' ? 'Log out' : 'Keluar'}
                >
                    <LogOut size={15} />
                    <span className="hidden sm:inline">{language === 'en' ? 'Log out' : 'Keluar'}</span>
                </button>
                {actionButton}
            </div>
        </header>
    );

    // ===== MOBILE DRAWER =====
    const drawer = mobileDrawerOpen ? (
        <div className={`${mobileOnly} fixed inset-0 z-50 flex`}>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileDrawerOpen(false)} />
            <div className="relative w-4/5 max-w-xs bg-[var(--color-pg-nav)] border-r border-[var(--color-pg-nav-border)] flex flex-col h-full z-10 shadow-2xl">
                <div className="absolute top-0 left-0 right-0 h-[2px] line-grad" />
                <div className="h-16 px-4 flex items-center justify-between border-b border-[var(--color-pg-nav-border)]">
                    <div className="flex items-center gap-2 min-w-0">
                        {activeLogoPath ? (
                            <img src={activeLogoPath} alt={companyName} className="h-7 w-auto object-contain flex-shrink-0" />
                        ) : (
                            <div className="mono w-7 h-7 rounded-[2px] border border-[var(--color-pg-nav-border)] bg-[var(--color-pg-nav-hover)] text-[var(--color-pg-accent)] flex items-center justify-center font-bold text-xs">
                                {companyName.charAt(0)}
                            </div>
                        )}
                        <span className="font-bold text-sm text-[var(--color-pg-nav-text)] truncate">{companyName}</span>
                    </div>
                    <button
                        onClick={() => setMobileDrawerOpen(false)}
                        className="w-8 h-8 rounded-[2px] border border-[var(--color-pg-nav-border)] bg-[var(--color-pg-nav-hover)] flex items-center justify-center text-[var(--color-pg-nav-muted)]"
                        aria-label="Close"
                    >
                        <Close size={16} />
                    </button>
                </div>

                <div className="p-3">
                    <Link
                        href={config.primaryCta.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className="w-full py-2.5 px-3 bg-[var(--color-pg-primary)] text-[var(--color-pg-primary-ink)] font-semibold rounded-[2px] flex items-center justify-center gap-2"
                    >
                        <config.primaryCta.icon size={16} />
                        <span className="mono text-[11px] uppercase tracking-[0.12em]">
                            {language === 'en' ? config.primaryCta.labelEn : config.primaryCta.labelId}
                        </span>
                    </Link>
                </div>

                <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
                    {config.navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeNav === item.key;
                        const label = language === 'en' ? item.labelEn : item.labelId;
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                onClick={() => setMobileDrawerOpen(false)}
                                className={`relative flex items-center gap-3 px-3 py-3 rounded-[2px] border transition-colors ${
                                    isActive ? 'bg-[var(--color-pg-nav-active)] border-[var(--color-pg-nav-border)] text-[var(--color-pg-nav-text)]' : 'border-transparent text-[var(--color-pg-nav-muted)] hover:text-[var(--color-pg-nav-text)] hover:bg-[var(--color-pg-nav-hover)]'
                                }`}
                            >
                                {isActive && <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-[var(--color-pg-primary)]" />}
                                <Icon size={16} />
                                <span className="mono text-[11px] uppercase tracking-[0.12em]">{label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[var(--color-pg-nav-border)] space-y-2">
                    <Link
                        href={settingsHref}
                        onClick={() => setMobileDrawerOpen(false)}
                        className="w-full py-2.5 rounded-[2px] border border-[var(--color-pg-nav-border)] bg-[var(--color-pg-nav-hover)] text-[var(--color-pg-nav-text)] font-semibold text-xs flex items-center justify-center gap-2"
                    >
                        <Settings size={15} />
                        <span>{language === 'en' ? 'Account Settings' : 'Pengaturan Akun'}</span>
                    </Link>
                    <button
                        onClick={() => router.post('/logout')}
                        className="w-full py-2.5 rounded-[2px] bg-[var(--color-pg-danger)] text-white font-bold text-xs flex items-center justify-center gap-2"
                    >
                        <LogOut size={15} />
                        <span>{language === 'en' ? 'Log out' : 'Keluar'}</span>
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    // ===== MOBILE BOTTOM NAV =====
    const bottomNav = (
        <nav
            className={`${mobileOnly} fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-pg-surface)] border-t border-[var(--color-pg-nav-border)] flex items-stretch`}
            style={{ height: 64 }}
        >
{config.bottomItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.key;
                return (
                    <Link
                        key={item.key}
                        href={item.href}
                        className={`relative flex-1 flex flex-col items-center justify-center pt-1.5 transition-colors ${
                            isActive ? 'text-[var(--color-pg-primary)]' : 'text-[var(--color-pg-text-muted)] hover:text-[var(--color-pg-text-secondary)]'
                        }`}
                    >
                        {isActive && <span className="absolute top-0 left-3 right-3 h-[2px] bg-[var(--color-pg-primary)]" />}
                        <Icon size={18} />
                        <span className="mono text-[9px] font-semibold mt-1 uppercase tracking-[0.1em] truncate max-w-full px-1">
                            {language === 'en' ? item.labelEn : item.labelId}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );

    // ===== COMPOSE =====
    if (!isOffice) {
        // Worker: chrome-only fragment (sidebar + header + drawer + bottom-nav).
        // Worker pages provide their own content container (e.g. dashboard-root with lg:ml-64).
        return (
            <>
                {sidebar}
                {header}
                {drawer}
                {bottomNav}
            </>
        );
    }

    // Office: full shell wrapping children.
    return (
        <div className="min-h-screen bg-[var(--color-pg-bg)] text-[var(--color-pg-text)] flex flex-col font-sans max-w-full overflow-x-hidden relative">
            {sidebar}
            <div className={`flex-1 transition-all duration-300 min-w-0 max-w-full overflow-x-hidden flex flex-col ${collapsed ? 'md:ml-20' : 'md:ml-64 lg:ml-72'}`}>
                {header}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 min-w-0 max-w-full box-border overflow-x-hidden">
                    {children}
                </main>
            </div>
            {drawer}
            {bottomNav}
        </div>
    );
};

export default AppShell;
