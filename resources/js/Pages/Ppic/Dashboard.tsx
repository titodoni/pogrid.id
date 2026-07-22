import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Settings } from '../../Components/Icons';
import { formatDeadline } from '../../Utils/deadline';
import { localizedDisplay, getLanguage } from '../../Utils/locale';
import { WarningPill } from '../../Components/WarningPill';
import { StatusBadge } from '../../Components/StatusBadge';
import echo from '../../bootstrap';

interface ScheduleItem {
    id: number;
    item_name: string;
    target_qty: number;
    item_type: string;
    progress_percent: number;
    status: string;
    current_stage: string | null;
    purchasing_status: string | null;
    drafter_status: string | null;
    delivered_qty: number;
    has_alert: boolean;
    severity: string | null;
}

interface ScheduleEntry {
    id: number;
    po_number: string;
    client_name: string;
    global_deadline: string;
    status: string;
    is_urgent: boolean;
    days_until_deadline: number;
    is_overdue: boolean;
    total_items: number;
    completed_items: number;
    active_items: number;
    items: ScheduleItem[];
}

interface WorkCenterLoad {
    work_center: string;
    active: number;
    completed: number;
    total: number;
}

interface MaterialEntry {
    item_id: number;
    item_name: string;
    po_number: string;
    client_name: string;
    target_qty: number;
    purchasing_status: string | null;
    status: string;
    progress_percent: number;
}

interface MaterialReadiness {
    ready: MaterialEntry[];
    in_progress: MaterialEntry[];
    pending: MaterialEntry[];
    ready_count: number;
    in_progress_count: number;
    pending_count: number;
}

interface BottleneckStuckItem {
    item_id: number;
    item_name: string;
    po_number: string;
    reason: string;
    created_at: string;
}

interface BottleneckEntry {
    work_center: string;
    stuck_count: number;
    stuck_items: BottleneckStuckItem[];
}

interface ForecastItem {
    id: number;
    item_name: string;
    po_number: string;
    client_name: string;
    deadline: string;
    target_qty: number;
    delivered_qty: number;
    progress_percent: number;
    days_remaining?: number;
}

interface DeliveryForecast {
    overdue: ForecastItem[];
    due_soon: ForecastItem[];
    overdue_count: number;
    due_soon_count: number;
}

interface CapacityEntry {
    work_center: string;
    active_item_count: number;
    total_target_qty: number;
    total_completed_qty: number;
    load_percent: number;
}

interface Props {
    auth_user?: {
        id: number;
        name: string;
        role_name: string;
        role_level: string;
        post_name: string | null;
        role_display_name: string;
        role_display_name_id?: string | null;
        post_display_name?: string | null;
        post_display_name_id?: string | null;
    };
    tenant?: {
        id: number;
        company_name: string;
        slug: string;
    };
    schedule: ScheduleEntry[];
    work_center_load: WorkCenterLoad[];
    material_readiness: MaterialReadiness;
    bottlenecks: BottleneckEntry[];
    delivery_forecast: DeliveryForecast;
    capacity_view: CapacityEntry[];
}

const translations = {
    en: {
        ppic_dashboard: 'PPIC Dashboard',
        production_planning: 'Production Planning View',
        exit_terminal: 'Exit',
        overdue_count: 'Overdue',
        stuck_total: 'Stuck',
        due_soon: 'Due Soon',
        active_pos: 'Active POs',
        total_active: 'Total Active',
        po: 'PO',
        items: 'Items',
        deadline: 'Deadline',
        qty: 'Qty',
        progress: 'Progress',
        client: 'Client',
        status: 'Status',
        urgent: 'URGENT',
        stage: 'Stage',
        schedule_tab: 'Schedule',
        load_tab: 'Load',
        material_tab: 'Material',
        bottlenecks_tab: 'Bottlenecks',
        forecast_tab: 'Forecast',
        capacity_tab: 'Capacity',
        no_data: 'No data available.',
        ready: 'Ready',
        in_progress: 'In Progress',
        pending: 'Pending',
        work_center: 'Work Center',
        active: 'Active',
        completed: 'Completed',
        total: 'Total',
        overloaded: 'Overloaded',
        reason: 'Reason',
        date: 'Date',
        archive: 'Archive',
        trouble: 'Trouble',
        profile: 'Profile',
        no_alerts_found: 'No bottlenecks detected.',
        all_good: 'All materials ready.',
        on_track: 'On Track',
        delayed: 'Delayed',
        days: 'day(s)',
        forecast: 'Delivery Forecast',
        capacity: 'Capacity View',
        schedule: 'Production Schedule',
        po_status: 'PO Status',
        item: 'Item',
    },
    id: {
        ppic_dashboard: 'Dashboard PPIC',
        production_planning: 'Tampilan Perencanaan Produksi',
        exit_terminal: 'Keluar',
        overdue_count: 'Terlambat',
        stuck_total: 'Tersendat',
        due_soon: 'Jatuh Tempo',
        active_pos: 'PO Aktif',
        total_active: 'Total Aktif',
        po: 'PO',
        items: 'Item',
        deadline: 'Batas Waktu',
        qty: 'Jml',
        progress: 'Progres',
        client: 'Klien',
        status: 'Status',
        urgent: 'URGEN',
        stage: 'Tahap',
        schedule_tab: 'Jadwal',
        load_tab: 'Beban',
        material_tab: 'Material',
        bottlenecks_tab: 'Hambatan',
        forecast_tab: 'Prakiraan',
        capacity_tab: 'Kapasitas',
        no_data: 'Tidak ada data.',
        ready: 'Siap',
        in_progress: 'Proses',
        pending: 'Tertunda',
        work_center: 'Pusat Kerja',
        active: 'Aktif',
        completed: 'Selesai',
        total: 'Total',
        overloaded: 'Kelebihan',
        reason: 'Alasan',
        date: 'Tanggal',
        archive: 'Arsip',
        trouble: 'Kendala',
        profile: 'Profil',
        no_alerts_found: 'Tidak ada hambatan terdeteksi.',
        all_good: 'Semua material siap.',
        on_track: 'Tepat Waktu',
        delayed: 'Terlambat',
        days: 'hari',
        forecast: 'Prakiraan Pengiriman',
        capacity: 'Tampilan Kapasitas',
        schedule: 'Jadwal Produksi',
        po_status: 'Status PO',
        item: 'Item',
    }
};

function getStageColor(stage: string | null): string {
    if (!stage) return '#71717a';
    const lower = stage.toLowerCase();
    if (lower.includes('design') || lower.includes('gambar')) return '#818cf8';
    if (lower.includes('material') || lower.includes('bahan') || lower.includes('vendor')) return '#fb923c';
    if (lower.includes('machining') || lower.includes('cnc')) return '#fbbf24';
    if (lower.includes('fabrication') || lower.includes('fabrikasi')) return '#a78bfa';
    if (lower.includes('assembly') || lower.includes('rakit')) return '#34d399';
    if (lower.includes('surface') || lower.includes('painting')) return '#f472b6';
    if (lower === 'qc') return '#06b6d4';
    if (lower.includes('delivery') || lower.includes('kirim')) return '#14b8a6';
    if (lower.includes('finance')) return '#10b981';
    return '#71717a';
}

type TabKey = 'schedule' | 'load' | 'material' | 'bottlenecks' | 'forecast' | 'capacity';

export default function PpicDashboard({ auth_user, tenant, schedule, work_center_load, material_readiness, bottlenecks, delivery_forecast, capacity_view }: Props) {
    const { props, url } = usePage();
    const pathParts = url.split('/');
    const slug = pathParts[2] || '';

    const [language, setLanguage] = useState<'en' | 'id'>(getLanguage);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeTab, setActiveTab] = useState<TabKey>('schedule');

    const [editingPo, setEditingPo] = useState<ScheduleEntry | null>(null);
    const [deadlineVal, setDeadlineVal] = useState<string>('');
    const [isUrgentVal, setIsUrgentVal] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [toastQueue, setToastQueue] = useState<Array<{ message: string; severity: string; id: number; timestamp: number }>>([]);

    const t = translations[language];

    const handleSavePo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPo) return;

        setIsSaving(true);
        router.post(`/c/${slug}/ppic/pos/${editingPo.id}/update`, {
            global_deadline: deadlineVal,
            is_urgent: isUrgentVal,
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setEditingPo(null);
                setIsSaving(false);
            },
            onError: () => {
                setIsSaving(false);
            }
        });
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const [onlineUsers, setOnlineUsers] = useState<Array<{ id: number; name: string; post_name?: string; role?: string }>>([]);
    const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
    const reloadTimeoutRef = useRef<any>(null);

    const triggerScopedReload = useCallback(() => {
        if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = setTimeout(() => {
            router.reload({
                only: ['schedule', 'telemetry', 'delivery_forecast'],
                preserveState: true,
                preserveScroll: true,
            });
        }, 800);
    }, []);

    useEffect(() => {
        const id = tenant?.id ?? (props as any).tenant_id;
        if (!id) return;

        // Presence Channel
        const presenceChannel = echo.join(`tenant.${id}.presence`);
        presenceChannel
            .here((users: any[]) => setOnlineUsers(users))
            .joining((user: any) => setOnlineUsers(prev => [...prev.filter(u => u.id !== user.id), user]))
            .leaving((user: any) => setOnlineUsers(prev => prev.filter(u => u.id !== user.id)));

        // Connection State
        const pusherConn = (echo as any)?.connector?.pusher?.connection;
        let fallbackInterval: any = null;

        if (pusherConn) {
            const handleStateChange = (states: any) => {
                const current = states.current || pusherConn.state;
                if (current === 'connected') {
                    setWsStatus('connected');
                    if (states.previous && states.previous !== 'connected') {
                        router.reload({ preserveState: true, preserveScroll: true });
                    }
                } else if (current === 'connecting') {
                    setWsStatus('connecting');
                } else {
                    setWsStatus('disconnected');
                }
            };
            if (pusherConn.state) setWsStatus(pusherConn.state === 'connected' ? 'connected' : 'connecting');
            pusherConn.bind('state_change', handleStateChange);
        } else {
            setWsStatus('disconnected');
            fallbackInterval = setInterval(() => {
                triggerScopedReload();
            }, 30000);
        }

        const channel = echo.private(`tenant.${id}.dashboard`);
        channel.listen('production.terminated', () => {
            router.visit(`/c/${slug}`);
        });
        channel.listen('task.updated', (e: any) => {
            const entry = { message: e.message || '', severity: 'INFO', id: Date.now(), timestamp: Date.now() };
            setToastQueue(prev => [...prev, entry]);
            setTimeout(() => {
                setToastQueue(prev => prev.filter(t => t.timestamp !== entry.timestamp));
            }, 8000);
            triggerScopedReload();
        });
        channel.listen('kendala.reported', (e: any) => {
            const alert = e.alert;
            const entry = { message: alert?.message || '', severity: alert?.severity || 'RED', id: alert?.id || Date.now(), timestamp: Date.now() };
            setToastQueue(prev => [...prev, entry]);
            setTimeout(() => {
                setToastQueue(prev => prev.filter(t => t.timestamp !== entry.timestamp));
            }, 8000);
            triggerScopedReload();
        });
        channel.listen('qc.rework.logged', (e: any) => {
            const alert = e.alert;
            const entry = { message: alert?.message || '', severity: 'REWORK', id: alert?.id || Date.now(), timestamp: Date.now() };
            setToastQueue(prev => [...prev, entry]);
            setTimeout(() => {
                setToastQueue(prev => prev.filter(t => t.timestamp !== entry.timestamp));
            }, 8000);
            triggerScopedReload();
        });
        channel.listen('data.refreshed', () => {
            triggerScopedReload();
        });

        return () => {
            echo.leave(`tenant.${id}.dashboard`);
            echo.leave(`tenant.${id}.presence`);
            if (pusherConn) {
                pusherConn.unbind('state_change');
            }
            if (fallbackInterval) clearInterval(fallbackInterval);
            if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
        };
    }, [tenant?.id]);

    const changeLanguage = (lang: 'en' | 'id') => {
        setLanguage(lang);
        localStorage.setItem('pogrid_lang', lang);
    };

    const totalActive = schedule.reduce((sum, po) => sum + po.active_items, 0);
    const totalPos = schedule.filter(po => po.status !== 'COMPLETED' && po.status !== 'CLOSED').length;
    const overdueTotal = delivery_forecast.overdue_count;
    const stuckTotal = bottlenecks.reduce((sum, b) => sum + b.stuck_count, 0);
    const dueSoonTotal = delivery_forecast.due_soon_count;

    const tabs: { key: TabKey; label: string; count?: number }[] = [
        { key: 'schedule', label: t.schedule_tab, count: totalPos },
        { key: 'load', label: t.load_tab },
        { key: 'material', label: t.material_tab, count: material_readiness.pending_count },
        { key: 'bottlenecks', label: t.bottlenecks_tab, count: stuckTotal },
        { key: 'forecast', label: t.forecast_tab, count: overdueTotal },
        { key: 'capacity', label: t.capacity_tab },
    ];

    return (
        <div className="dashboard-root" style={{
            backgroundColor: 'var(--color-pg-bg)',
            fontFamily: 'Inter, sans-serif',
            color: '#fafafa',
        }}>
            {toastQueue.length > 0 && (
                <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {toastQueue.map(t => (
                        <div key={t.timestamp} onClick={() => setToastQueue(prev => prev.filter(x => x.timestamp !== t.timestamp))}
                            style={{
                                backgroundColor: t.severity === 'RED' ? 'rgba(239, 68, 68, 0.95)' : t.severity === 'ALERT' ? 'rgba(251, 191, 36, 0.95)' : t.severity === 'INFO' ? 'rgba(59, 130, 246, 0.95)' : 'rgba(251, 191, 36, 0.95)',
                                color: '#fff', padding: '12px 20px', borderRadius: '10px',
                                fontSize: '13px', fontWeight: 600, maxWidth: '360px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                animation: 'slideIn 0.3s ease-out', cursor: 'pointer',
                            }}>
                            <span style={{ fontSize: '18px' }}>{t.severity === 'RED' ? '🚨' : t.severity === 'ALERT' ? '🔴' : t.severity === 'INFO' ? 'ℹ️' : '⚠️'}</span>
                            <div>
                                <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                                    {t.severity === 'RED'
                                        ? (language === 'en' ? 'Kendala Reported' : 'Kendala Dilaporkan')
                                        : t.severity === 'ALERT'
                                        ? (language === 'en' ? 'Alert Escalated' : 'Peringatan Dinaikkan')
                                        : t.severity === 'INFO'
                                        ? (language === 'en' ? 'Task Updated' : 'Tugas Diperbarui')
                                        : (language === 'en' ? 'QC Rework' : 'Rework QC')}
                                </div>
                                <div style={{ opacity: 0.9, fontSize: '12px' }}>{t.message}</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setToastQueue(prev => prev.filter(x => x.timestamp !== t.timestamp)); }}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px', opacity: 0.7 }}>
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <header className="responsive-header p-3 border-b border-pg-border bg-pg-bg/60 backdrop-blur shrink-0">
                <div>
                    <div className="greeting-name text-sm text-pg-primary-hover font-semibold mb-0.5">
                        {auth_user?.name}
                        {auth_user?.post_display_name ? ` (${localizedDisplay({ display_name: auth_user.post_display_name, display_name_id: auth_user.post_display_name_id }, language)})` : ''}
                        {' · '}
                        <span style={{ color: '#34d399' }}>PPIC</span>
                    </div>
                    <h1 className="text-2xl font-extrabold m-0 tracking-tight">{t.ppic_dashboard}</h1>
                    <p className="text-xs text-pg-text-muted m-0 mt-0.5">
                        {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' · '}
                        {currentTime.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className="flex justify-between items-center gap-2 flex-wrap w-full md:w-auto mt-2 md:mt-0">
                    <div className="flex gap-1 bg-white/4 p-0.5 rounded-lg border border-pg-border">
                        <button onClick={() => changeLanguage('en')}
                            className="min-w-[44px] min-h-[44px] px-3 py-1.5 border-none rounded-md text-white font-bold text-xs cursor-pointer flex items-center justify-center"
                            style={{ backgroundColor: language === 'en' ? 'var(--color-pg-primary)' : 'transparent' }}>EN</button>
                        <button onClick={() => changeLanguage('id')}
                            className="min-w-[44px] min-h-[44px] px-3 py-1.5 border-none rounded-md text-white font-bold text-xs cursor-pointer flex items-center justify-center"
                            style={{ backgroundColor: language === 'id' ? 'var(--color-pg-primary)' : 'transparent' }}>ID</button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Link href={`/c/${slug}/trouble-reports`}
                            style={{
                                width: '44px', height: '44px',
                                backgroundColor: 'rgba(248, 113, 113, 0.12)',
                                color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.2)',
                                borderRadius: '8px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                textDecoration: 'none',
                            }}
                            title={language === 'en' ? 'Trouble Reports' : 'Laporan Kendala'}>
                            <AlertTriangle size={18} />
                        </Link>
                        <Link href={`/c/${slug}/archive`}
                            style={{
                                minHeight: '44px', padding: '0 12px',
                                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                                color: 'var(--color-pg-primary-hover)', border: '1px solid var(--color-pg-primary-glow)',
                                borderRadius: '8px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                textDecoration: 'none', gap: '4px',
                                fontSize: '12px', fontWeight: 700,
                            }}
                            title={language === 'en' ? 'Archive' : 'Arsip'}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
                            </svg>
                            {t.archive}
                        </Link>
                        <Link href={`/c/${slug}/profile`}
                            style={{
                                width: '44px', height: '44px',
                                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                color: '#a1a1aa', border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '8px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                textDecoration: 'none',
                            }}
                            title={language === 'en' ? 'Profile' : 'Profil'}>
                            <Settings size={18} />
                        </Link>
                        <button onClick={() => router.post('/logout')}
                            style={{
                                minHeight: '44px', padding: '0 16px',
                                backgroundColor: '#f87171', color: '#fff',
                                fontWeight: 700, border: 'none', borderRadius: '8px',
                                cursor: 'pointer', fontSize: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(248, 113, 113, 0.2)',
                            }}>
                            {t.exit_terminal}
                        </button>
                    </div>
                </div>
            </header>

            {/* KPI Summary */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                gap: '8px', padding: '12px 12px 0',
            }}>
                <KpiCard value={totalActive} label={t.total_active} color="#818cf8" bgColor="rgba(99,102,241,0.08)" borderColor="rgba(99,102,241,0.15)" />
                <KpiCard value={overdueTotal} label={t.overdue_count} color="#f87171" bgColor="rgba(248,113,113,0.08)" borderColor="rgba(248,113,113,0.15)" />
                <KpiCard value={stuckTotal} label={t.stuck_total} color="#fbbf24" bgColor="rgba(251,191,36,0.08)" borderColor="rgba(251,191,36,0.15)" />
                <KpiCard value={dueSoonTotal} label={t.due_soon} color="#fb923c" bgColor="rgba(251,146,60,0.08)" borderColor="rgba(251,146,60,0.15)" />
            </div>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex', gap: '4px', padding: '12px 12px 0',
                overflowX: 'auto', flexWrap: 'wrap',
            }}>
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className="focus:outline-none transition-all duration-150 active:scale-95"
                        style={{
                            padding: '8px 14px', borderRadius: '8px', border: '1px solid',
                            fontSize: '12px', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                            backgroundColor: activeTab === tab.key ? 'var(--color-pg-primary-glow)' : 'rgba(255,255,255,0.04)',
                            borderColor: activeTab === tab.key ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
                            color: activeTab === tab.key ? '#818cf8' : '#a1a1aa',
                        }}>
                        {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="dashboard-scroll" style={{ padding: '12px' }}>
                {activeTab === 'schedule' && (
                    <ScheduleTab 
                        schedule={schedule} 
                        language={language} 
                        t={t as any} 
                        slug={slug}
                        onEditPo={(po) => {
                            setEditingPo(po);
                            setDeadlineVal(po.global_deadline);
                            setIsUrgentVal(po.is_urgent);
                        }}
                    />
                )}
                {activeTab === 'load' && <LoadTab workCenterLoad={work_center_load} language={language} t={t as any} />}
                {activeTab === 'material' && <MaterialTab readiness={material_readiness} language={language} t={t as any} />}
                {activeTab === 'bottlenecks' && <BottlenecksTab bottlenecks={bottlenecks} language={language} t={t as any} />}
                {activeTab === 'forecast' && <ForecastTab forecast={delivery_forecast} language={language} t={t as any} />}
                {activeTab === 'capacity' && <CapacityTab capacities={capacity_view} language={language} t={t as any} />}
            </div>

            {/* Modal for PO Rescheduling */}
            {editingPo && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(9, 9, 11, 0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                }}>
                    <div style={{
                        backgroundColor: '#18181b',
                        border: '1px solid var(--color-pg-border)',
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '450px',
                        padding: '20px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f4f4f5', margin: '0 0 4px 0' }}>
                            {language === 'en' ? 'Reschedule PO' : 'Jadwal Ulang PO'}
                        </h3>
                        <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '0 0 16px 0' }}>
                            {editingPo.po_number} · {editingPo.client_name}
                        </p>

                        <form onSubmit={handleSavePo}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '6px' }}>
                                    {language === 'en' ? 'Global Deadline' : 'Batas Waktu Global'}
                                </label>
                                <input 
                                    type="date" 
                                    value={deadlineVal} 
                                    onChange={(e) => setDeadlineVal(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        backgroundColor: 'var(--color-pg-bg)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        color: '#fafafa',
                                        padding: '10px 12px',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input 
                                    type="checkbox" 
                                    id="is_urgent_checkbox"
                                    checked={isUrgentVal}
                                    onChange={(e) => setIsUrgentVal(e.target.checked)}
                                    style={{
                                        width: '18px',
                                        height: '18px',
                                        cursor: 'pointer',
                                    }}
                                />
                                <label htmlFor="is_urgent_checkbox" style={{ fontSize: '13px', fontWeight: 600, color: '#fafafa', cursor: 'pointer', userSelect: 'none' }}>
                                    {language === 'en' ? 'Mark PO as Urgent' : 'Tandai PO Urgen'}
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setEditingPo(null)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--color-pg-border)',
                                        backgroundColor: 'transparent',
                                        color: '#a1a1aa',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {language === 'en' ? 'Cancel' : 'Batal'}
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: 'var(--color-pg-primary)',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                        cursor: isSaving ? 'not-allowed' : 'pointer',
                                        opacity: isSaving ? 0.7 : 1,
                                        boxShadow: '0 4px 12px var(--color-pg-primary-glow)',
                                    }}
                                >
                                    {isSaving ? (language === 'en' ? 'Saving...' : 'Menyimpan...') : (language === 'en' ? 'Save Changes' : 'Simpan Perubahan')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function KpiCard({ value, label, color, bgColor, borderColor }: { value: number; label: string; color: string; bgColor: string; borderColor: string }) {
    return (
        <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 600, marginTop: '2px' }}>{label}</div>
        </div>
    );
}

function ScheduleTab({ schedule, language, t, onEditPo, slug }: { schedule: ScheduleEntry[]; language: 'en' | 'id'; t: Record<string, string>; onEditPo: (po: ScheduleEntry) => void; slug: string }) {
    if (schedule.length === 0) {
        return <p style={{ color: '#71717a', padding: '24px', textAlign: 'center', fontSize: '14px' }}>{t.no_data}</p>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {schedule.map(po => (
                <div key={po.id} style={{
                    backgroundColor: po.is_overdue ? 'rgba(239,68,68,0.03)' : 'transparent',
                    border: `1px solid ${po.is_overdue ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '10px', padding: '12px 14px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>{po.client_name}</h3>
                                {po.is_urgent && <StatusBadge status="URGENT" variant="dot" style={{ fontSize: '10px', padding: '1px 6px' }} />}
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', marginTop: '2px' }}>{po.po_number}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button 
                                    onClick={() => onEditPo(po)}
                                    title={language === 'en' ? 'Reschedule PO' : 'Jadwal Ulang PO'}
                                    style={{
                                        border: 'none',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        color: '#a1a1aa',
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.15)'; e.currentTarget.style.color = '#818cf8'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#a1a1aa'; }}
                                >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                    </svg>
                                    {language === 'en' ? 'Reschedule' : 'Jadwal'}
                                </button>
                                <WarningPill deadlineDateStr={po.global_deadline} reworkMessage={null} lang={language} />
                            </div>
                            <div style={{ fontSize: '11px', color: '#71717a' }}>
                                {po.completed_items}/{po.total_items} {t.items.toLowerCase()}
                            </div>
                        </div>
                    </div>
                    <div style={{
                        display: 'flex', gap: '4px', marginBottom: '8px',
                        height: '6px', borderRadius: '3px', overflow: 'hidden',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                    }}>
                        <div style={{
                            height: '100%', borderRadius: '3px',
                            backgroundColor: po.completed_items === po.total_items ? '#34d399' : '#818cf8',
                            width: `${(po.completed_items / Math.max(1, po.total_items)) * 100}%`,
                            transition: 'width 0.3s',
                        }} />
                    </div>
                    {po.items.map(item => (
                        <div key={item.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '6px 8px', marginTop: '4px',
                            backgroundColor: item.is_urgent ? 'rgba(251, 146, 60, 0.04)' : 'rgba(255,255,255,0.02)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            border: item.is_urgent ? '1px solid rgba(251, 146, 60, 0.15)' : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                <button
                                    onClick={() => router.post(`/c/${slug}/ppic/items/${item.id}/priority`, {
                                        is_urgent: !item.is_urgent,
                                    }, { preserveState: true, preserveScroll: true })}
                                    title={item.is_urgent
                                        ? (language === 'en' ? 'Remove Urgent' : 'Hapus Urgen')
                                        : (language === 'en' ? 'Mark Urgent' : 'Tandai Urgen')}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: item.is_urgent ? '#fb923c' : '#52525b',
                                        fontSize: '14px',
                                        flexShrink: 0,
                                        transition: 'color 0.2s',
                                    }}
                                    onMouseOver={(e) => { if (!item.is_urgent) e.currentTarget.style.color = '#fb923c'; }}
                                    onMouseOut={(e) => { if (!item.is_urgent) e.currentTarget.style.color = '#52525b'; }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill={item.is_urgent ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                        <line x1="12" y1="9" x2="12" y2="13" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                </button>
                                <span style={{ color: '#fafafa', fontWeight: 600, wordBreak: 'break-word' }}>{item.item_name}</span>
                                {item.current_stage && (
                                    <span style={{
                                        fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
                                        backgroundColor: `${getStageColor(item.current_stage)}20`,
                                        color: getStageColor(item.current_stage),
                                        border: `1px solid ${getStageColor(item.current_stage)}30`,
                                        flexShrink: 0,
                                    }}>
                                        {item.current_stage}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <span style={{ color: '#71717a' }}>{item.target_qty} pcs</span>
                                <span style={{
                                    fontWeight: 700,
                                    color: item.status === 'COMPLETED' ? '#34d399' : '#818cf8',
                                }}>
                                    {item.progress_percent.toFixed(0)}%
                                </span>
                                {item.has_alert && (
                                    <span style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        backgroundColor: item.severity === 'RED' ? '#f87171' : '#fbbf24',
                                    }} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function LoadTab({ workCenterLoad, language, t }: { workCenterLoad: WorkCenterLoad[]; language: 'en' | 'id'; t: Record<string, string> }) {
    const maxTotal = Math.max(...workCenterLoad.map(w => w.total), 1);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {workCenterLoad.map(wc => {
                const pct = maxTotal > 0 ? (wc.total / maxTotal) * 100 : 0;
                return (
                    <div key={wc.work_center} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fafafa' }}>{wc.work_center}</span>
                            <span style={{ fontSize: '12px', color: '#71717a' }}>
                                {wc.active} {t.active.toLowerCase()} / {wc.completed} {t.completed.toLowerCase()}
                            </span>
                        </div>
                        <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: '4px',
                                width: `${pct}%`,
                                backgroundColor: wc.active > wc.completed ? '#fbbf24' : '#34d399',
                                transition: 'width 0.3s',
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#71717a', fontWeight: 600 }}>
                            <span>{t.total}: {wc.total}</span>
                            <span>{wc.active > 0 ? `${Math.round((wc.active / Math.max(1, wc.total)) * 100)}% ${t.active.toLowerCase()}` : t.completed}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function MaterialTab({ readiness, language, t }: { readiness: MaterialReadiness; language: 'en' | 'id'; t: Record<string, string> }) {
    const total = readiness.ready_count + readiness.in_progress_count + readiness.pending_count;
    if (total === 0) {
        return <p style={{ color: '#71717a', padding: '24px', textAlign: 'center', fontSize: '14px' }}>{t.no_data}</p>;
    }

    const sections: { label: string; items: MaterialEntry[]; color: string }[] = [
        { label: t.ready, items: readiness.ready, color: '#34d399' },
        { label: t.in_progress, items: readiness.in_progress, color: '#fbbf24' },
        { label: t.pending, items: readiness.pending, color: '#f87171' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px', fontWeight: 700 }}>
                <span style={{ color: '#34d399' }}>{t.ready}: {readiness.ready_count}</span>
                <span style={{ color: '#fbbf24' }}>{t.in_progress}: {readiness.in_progress_count}</span>
                <span style={{ color: '#f87171' }}>{t.pending}: {readiness.pending_count}</span>
            </div>
            {sections.filter(s => s.items.length > 0).map(section => (
                <div key={section.label}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: section.color, margin: '0 0 6px 0' }}>{section.label}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {section.items.map(m => (
                            <div key={m.item_id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 10px', borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.06)',
                                fontSize: '12px',
                            }}>
                                 <div>
                                     <div style={{ fontWeight: 800, color: '#fafafa', fontSize: '13px' }}>{m.item_name}</div>
                                     <div style={{ color: 'var(--color-pg-text-secondary)', fontSize: '11px', marginTop: '1px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                         <span style={{ fontWeight: 600, color: 'var(--color-pg-primary-hover)' }}>{m.client_name}</span>
                                         <span style={{ color: 'var(--color-pg-text-muted)' }}>&middot;</span>
                                         <span style={{ color: 'var(--color-pg-text-muted)', fontSize: '10px' }}>{m.po_number}</span>
                                     </div>
                                 </div>
                                <span style={{ color: '#71717a', fontWeight: 600, flexShrink: 0 }}>{m.target_qty} pcs</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function BottlenecksTab({ bottlenecks, language, t }: { bottlenecks: BottleneckEntry[]; language: 'en' | 'id'; t: Record<string, string> }) {
    if (bottlenecks.length === 0) {
        return <p style={{ color: '#71717a', padding: '24px', textAlign: 'center', fontSize: '14px' }}>{t.no_alerts_found}</p>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bottlenecks.map(bn => (
                <div key={bn.work_center} style={{
                    border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '10px 12px',
                    backgroundColor: 'rgba(248,113,113,0.03)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f87171' }} />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#fafafa' }}>{bn.work_center}</span>
                        <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
                            backgroundColor: 'rgba(248,113,113,0.12)', color: '#f87171',
                        }}>
                            {bn.stuck_count}
                        </span>
                    </div>
                    {bn.stuck_items.map(si => (
                        <div key={si.item_id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '6px 8px', fontSize: '12px',
                            backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px', marginTop: '4px',
                        }}>
                            <div>
                                <span style={{ fontWeight: 600, color: '#fafafa' }}>{si.item_name}</span>
                                <span style={{ color: '#71717a', marginLeft: '6px' }}>{si.po_number}</span>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ color: '#f87171', fontSize: '11px' }}>{si.reason}</div>
                                <div style={{ color: '#71717a', fontSize: '10px' }}>{si.created_at}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function ForecastTab({ forecast, language, t }: { forecast: DeliveryForecast; language: 'en' | 'id'; t: Record<string, string> }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {forecast.overdue.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#f87171', margin: '0 0 8px 0' }}>
                        {t.delayed} ({forecast.overdue_count})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {forecast.overdue.map(item => (
                            <ForecastCard key={item.id} item={item} language={language} />
                        ))}
                    </div>
                </div>
            )}
            {forecast.due_soon.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#fbbf24', margin: '0 0 8px 0' }}>
                        {t.due_soon} ({forecast.due_soon_count})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {forecast.due_soon.map(item => (
                            <ForecastCard key={item.id} item={item} language={language} />
                        ))}
                    </div>
                </div>
            )}
            {forecast.overdue.length === 0 && forecast.due_soon.length === 0 && (
                <p style={{ color: '#34d399', padding: '24px', textAlign: 'center', fontSize: '14px', fontWeight: 700 }}>{t.on_track}</p>
            )}
        </div>
    );
}

function ForecastCard({ item, language }: { item: ForecastItem; language: 'en' | 'id' }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 10px', borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.06)', fontSize: '12px',
        }}>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 800, color: '#fafafa', fontSize: '13px' }}>{item.item_name}</div>
                <div style={{ color: 'var(--color-pg-text-secondary)', fontSize: '11px', marginTop: '1px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-pg-primary-hover)' }}>{item.client_name}</span>
                    <span style={{ color: 'var(--color-pg-text-muted)' }}>&middot;</span>
                    <span style={{ color: 'var(--color-pg-text-muted)', fontSize: '10px' }}>{item.po_number}</span>
                </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: '#fafafa', fontWeight: 600 }}>{item.progress_percent.toFixed(0)}%</div>
                <div style={{ color: '#71717a', fontSize: '11px' }}>{item.target_qty} pcs</div>
            </div>
        </div>
    );
}

function CapacityTab({ capacities, language, t }: { capacities: CapacityEntry[]; language: 'en' | 'id'; t: Record<string, string> }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {capacities.map(cap => {
                const isOverloaded = cap.load_percent < 50 && cap.active_item_count > 0;
                return (
                    <div key={cap.work_center} style={{
                        padding: '10px 14px', borderRadius: '8px',
                        border: `1px solid ${isOverloaded ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        backgroundColor: isOverloaded ? 'rgba(251,191,36,0.03)' : 'transparent',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fafafa' }}>{cap.work_center}</span>
                            <span style={{ fontSize: '12px', color: '#71717a' }}>
                                {cap.active_item_count} {t.active.toLowerCase()} · {cap.total_target_qty} pcs
                            </span>
                        </div>
                        <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: '4px',
                                width: `${Math.min(100, cap.load_percent)}%`,
                                backgroundColor: cap.load_percent >= 80 ? '#f87171' : cap.load_percent >= 50 ? '#fbbf24' : '#34d399',
                                transition: 'width 0.3s',
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#71717a', fontWeight: 600 }}>
                            <span>{cap.total_completed_qty}/{cap.total_target_qty} pcs</span>
                            <span>{cap.load_percent.toFixed(0)}%</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
