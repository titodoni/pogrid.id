import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { AppShell, type AppShellUser } from './AppShell';

export interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    activeNav?:
        | 'dashboard'
        | 'create-po'
        | 'rework'
        | 'billing'
        | 'profile'
        | 'kiosk'
        | 'finance-ledger'
        | 'my-kpi'
        | 'archive'
        | 'trouble-reports';
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
    const { auth, tenant } = page.props as any;
    const authUser = auth?.user || (page.props as any).auth_user;
    const slug = propSlug || tenant?.slug || authUser?.tenant_slug || '';

    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window === 'undefined') return 'id';
        return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'id';
    });
    const changeLanguage = (lang: 'en' | 'id') => {
        setLanguage(lang);
        localStorage.setItem('pogrid_lang', lang);
    };

    const user: AppShellUser = {
        name: authUser?.name,
        role: authUser?.role || userRole,
        role_name: authUser?.role_name,
        role_level: authUser?.role_level,
        post_name: authUser?.post_name,
        post_display_name: authUser?.post_display_name,
        post_display_name_id: authUser?.post_display_name_id,
        is_owner: authUser?.is_owner,
    };

    return (
        <AppShell
            variant="office"
            user={user}
            slug={slug}
            title={title}
            subtitle={subtitle}
            activeNav={activeNav}
            language={language}
            changeLanguage={changeLanguage}
            onSearchClick={onSearchClick}
            actionButton={actionButton}
        >
            {children}
        </AppShell>
    );
};

export default AppLayout;
