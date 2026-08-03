import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { AppLayout } from '../../Components/AppLayout';
import { formatDateTimeDDMMYYYY } from '../../Utils/date';

interface LogEntry {
    id: number;
    action: string;
    description: string;
    metadata: Record<string, unknown> | null;
    created_at: string | null;
    user: { id: number; name: string } | null;
    project: { id: number; po_number: string; client_name: string } | null;
    item: { id: number; item_name: string } | null;
}

interface ProjectOption {
    id: number;
    po_number: string;
    client_name: string;
}

interface PaginatorProps {
    data: LogEntry[];
    current_page: number;
    last_page: number;
    total: number;
    from: number;
    to: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    logs: PaginatorProps;
    projects: ProjectOption[];
    selected_project: number | null;
}

const ACTION_LABELS: Record<string, { en: string; id: string; tone: string }> = {
    project_created: { en: 'Project created', id: 'Proyek dibuat', tone: 'primary' },
    item_created: { en: 'Item added', id: 'Item ditambahkan', tone: 'primary' },
    item_status_changed: { en: 'Status changed', id: 'Status berubah', tone: 'warning' },
    progress_logged: { en: 'Progress logged', id: 'Progress dicatat', tone: 'success' },
    alert_created: { en: 'Alert raised', id: 'Alert dibuat', tone: 'danger' },
    user_created: { en: 'User created', id: 'User dibuat', tone: 'neutral' },
};

const translations = {
    en: {
        page_title: 'Project Logs',
        subtitle: 'Audit trail — every action across projects & items',
        all_projects: 'All Projects',
        filter: 'Filter by project',
        user: 'User',
        action: 'Action',
        details: 'Details',
        project: 'Project',
        item: 'Item',
        date: 'Date & Time',
        no_logs: 'No activity found.',
        prev: 'Prev',
        next: 'Next',
        showing: 'Showing',
        to: 'to',
        of: 'of',
        entries: 'entries',
    },
    id: {
        page_title: 'Log Proyek',
        subtitle: 'Jejak audit — setiap aksi di seluruh proyek & item',
        all_projects: 'Semua Proyek',
        filter: 'Saring berdasarkan proyek',
        user: 'Pengguna',
        action: 'Aksi',
        details: 'Rincian',
        project: 'Proyek',
        item: 'Item',
        date: 'Waktu',
        no_logs: 'Belum ada aktivitas.',
        prev: 'Sebelumnya',
        next: 'Berikutnya',
        showing: 'Menampilkan',
        total: 'dari',
        of: 'dari',
        entries: 'entri',
    },
};

export default function Logs({ logs, projects, selected_project }: Props) {
    const [language, setLanguage] = useState<'en' | 'id'>(() => {
        if (typeof window === 'undefined') return 'id';
        return (localStorage.getItem('pogrid_lang') as 'en' | 'id') || 'id';
    });
    const changeLanguage = (lang: 'en' | 'id') => {
        setLanguage(lang);
        localStorage.setItem('pogrid_lang', lang);
    };

    const t = translations[language];

    const applyProjectFilter = (value: string) => {
        router.reload({
            only: ['logs', 'selected_project'],
            data: { project_id: value },
            preserveState: true,
        });
    };

    const navigate = (url: string) => {
        router.visit(url, {
            only: ['logs'],
            data: selected_project ? { project_id: selected_project } : undefined,
            preserveState: true,
        });
    };

    const toneClass = (tone: string) => {
        switch (tone) {
            case 'primary': return 'bg-[var(--color-pg-primary)]/12 text-[var(--color-pg-primary)] border-[var(--color-pg-primary)]/25';
            case 'success': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25';
            case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/25';
            case 'danger': return 'bg-red-500/10 text-red-500 border-red-500/25';
            default: return 'bg-[var(--color-pg-text-muted)]/10 text-[var(--color-pg-text-secondary)] border-[var(--color-pg-border)]';
        }
    };

    const actionStyle = (action: string) => {
        const meta = ACTION_LABELS[action] || { label: action, id: action, tone: 'neutral' };
        const label = language === 'en' ? meta.en : meta.id;
        return { label, toneClass: toneClass(meta.tone) };
    };

    return (
        <AppLayout activeNav="logs" title={t.page_title} subtitle={t.subtitle}>
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <select
                            value={selected_project ?? ''}
                            onChange={(e) => applyProjectFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[var(--color-pg-border)] bg-[var(--color-pg-surface)] text-[var(--color-pg-text)] text-sm font-semibold outline-none"
                            aria-label={t.filter}
                        >
                            <option value="">{t.all_projects}</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.po_number} — {p.client_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="mono flex items-center border border-[var(--color-pg-nav-border)] rounded-[2px] bg-[var(--color-pg-nav-hover)]" style={{ padding: 2 }}>
                        {(['en', 'id'] as ('en' | 'id')[]).map((l) => (
                            <button
                                key={l}
                                onClick={() => changeLanguage(l)}
                                className={`uppercase tracking-[0.12em] transition-all ${language === l ? 'bg-[var(--color-pg-nav-text)] text-[var(--color-pg-nav)]' : 'text-[var(--color-pg-text-muted)] hover:text-[var(--color-pg-text)]'}`}
                                style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 3, paddingBottom: 3, fontSize: 10 }}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                {logs.total === 0 ? (
                    <div className="text-center py-16 text-[var(--color-pg-text-muted)] text-sm border border-[var(--color-pg-border)] rounded-2xl bg-[var(--color-pg-surface)]">
                        {t.no_logs}
                    </div>
                ) : (
                    <>
                        <div className="bg-[var(--color-pg-surface)] border border-[var(--color-pg-border)] rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[720px]">
                                    <thead>
                                        <tr className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-pg-text-muted)] border-b border-[var(--color-pg-border)]">
                                            <th className="text-left px-4 py-3 font-semibold">{t.date}</th>
                                            <th className="text-left px-4 py-3 font-semibold">{t.user}</th>
                                            <th className="text-left px-4 py-3 font-semibold">{t.action}</th>
                                            <th className="text-left px-4 py-3 font-semibold">{t.details}</th>
                                            <th className="text-left px-4 py-3 font-semibold">{t.project}</th>
                                            <th className="text-left px-4 py-3 font-semibold">{t.item}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.data.map((entry) => {
                                            const style = actionStyle(entry.action);
                                            return (
                                                <tr key={entry.id} className="border-b border-[var(--color-pg-border)] last:border-0 hover:bg-[var(--color-pg-card-hover)] transition-colors">
                                                    <td className="px-4 py-3 text-xs text-[var(--color-pg-text-secondary)] whitespace-nowrap">
                                                        {formatDateTimeDDMMYYYY(entry.created_at)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-[var(--color-pg-text)]">
                                                        {entry.user?.name || '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-block mono text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-1 rounded-md border ${style.tone}`}>
                                                            {style.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-[var(--color-pg-text-secondary)] min-w-[240px]">
                                                        {entry.description}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-[var(--color-pg-text-secondary)]">
                                                        {entry.project
                                                            ? <span className="font-semibold">{entry.project.po_number}</span>
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-[var(--color-pg-text-secondary)]">
                                                        {entry.item?.item_name || '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <span className="mono text-[10px] text-[var(--color-pg-text-muted)] uppercase tracking-[0.1em]">
                                {t.showing} {logs.from || 0}–{logs.to || 0} {t.of} {logs.total} {t.entries}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => logs.prev_page_url && navigate(logs.prev_page_url)}
                                    disabled={!logs.prev_page_url}
                                    className="px-3.5 py-1.5 rounded-lg border border-[var(--color-pg-border)] bg-[var(--color-pg-surface)] text-xs font-bold text-[var(--color-pg-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {t.prev}
                                </button>
                                <button
                                    onClick={() => logs.next_page_url && navigate(logs.next_page_url)}
                                    disabled={!logs.next_page_url}
                                    className="px-3.5 py-1.5 rounded-lg border border-[var(--color-pg-border)] bg-[var(--color-pg-surface)] text-xs font-bold text-[var(--color-pg-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {t.next}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}