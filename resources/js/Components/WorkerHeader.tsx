import React from 'react';
import { AppShell, type AppShellUser } from './AppShell';

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
    logoPath,
}) => {
    const user: AppShellUser = {
        name: auth_user?.name,
        role: auth_user?.role || userRole,
        role_name: auth_user?.role_name,
        post_display_name: auth_user?.post_display_name,
        post_display_name_id: auth_user?.post_display_name_id,
    };

    return (
        <AppShell
            variant="worker"
            user={user}
            slug={slug}
            title={title}
            subtitle={subtitle}
            activeNav={currentView}
            language={language}
            changeLanguage={changeLanguage}
            backUrl={backUrl}
            onlineUsersCount={onlineUsersCount}
            wsStatus={wsStatus}
            showClock
            logoPath={logoPath}
        />
    );
};

export default WorkerHeader;
