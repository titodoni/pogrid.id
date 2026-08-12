import React, { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, AlertTriangle, DotGreen, Settings } from '../../Components/Icons';
import echo from '../../bootstrap';
import { formatDateTimeDDMMYYYY } from '../../Utils/date';
import { WorkerHeader } from '../../Components/WorkerHeader';
import { useTranslation } from "@/i18n/useTranslation";

interface Alert {
    id: number;
    severity: string;
    message: string;
    is_resolved: boolean;
    escalated_at?: string | null;
    created_at: string;
    item?: {
        id: number;
        item_name: string;
        po?: {
            po_number: string;
            client_name: string;
        };
    };
}

interface Props {
    alerts: Alert[];
    auth_user?: {
        id: number;
        name: string;
        role: string;
    };
    tenant?: {
        company_name: string;
        slug: string;
    };
}

export default function TroubleReports({ alerts, auth_user, tenant }: Props) {
    const { t, language, changeLanguage } = useTranslation('Worker_TroubleReports');
    const { url } = usePage();
    const pathParts = url.split('/');
    const slug = tenant?.slug || pathParts[2] || '';
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const id = (tenant as any)?.id;
        if (!id) return;

        const channel = echo.private(`tenant.${id}.workers`);
        channel.listen('.kendala.reported', () => {
            router.reload({ only: ['alerts'], preserveState: true, preserveScroll: true });
        });
        channel.listen('.qc.rework.logged', () => {
            router.reload({ only: ['alerts'], preserveState: true, preserveScroll: true });
        });
        channel.listen('.alert.escalated', () => {
            router.reload({ only: ['alerts'], preserveState: true, preserveScroll: true });
        });
        channel.listen('.data.refreshed', () => {
            router.reload({ only: ['alerts'], preserveState: true, preserveScroll: true });
        });

        return () => {
            echo.leave(`tenant.${id}.workers`);
        };
    }, [(tenant as any)?.id]);
    const userRole = ((auth_user as any)?.role_name || (auth_user as any)?.role || '').toUpperCase();
    const userPost = ((auth_user as any)?.post_name || '').toUpperCase();
    const isOwner = (auth_user as any)?.is_owner;
    const canResolve = Boolean(isOwner || ['PPIC', 'ADMIN', 'MANAGER', 'OWNER'].includes(userRole) || ['PPIC', 'ADMIN', 'MANAGER'].includes(userPost));

    const handleResolve = (alertId: number) => {
        if (confirm(t.resolve_confirm)) {
            router.post(`/c/${slug}/alerts/${alertId}/resolve`, {}, {
                preserveScroll: true,
            });
        }
    };

    return (
        <div className="dashboard-root lg:ml-64 pb-24 lg:pb-8" style={{
            backgroundColor: 'var(--color-pg-bg)',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--color-pg-text)',
        }}>
            <WorkerHeader
                slug={slug}
                auth_user={auth_user}
                title={t.title}
                subtitle={t.subtitle}
                language={language}
                changeLanguage={changeLanguage}
                currentView="trouble-reports"
            />

            {/* Content Area */}
            <div className="dashboard-scroll" style={{
                padding: '24px',
                boxSizing: 'border-box',
                flex: 1,
            }}>
                <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
                <div className="glass-card" style={{
                    backgroundColor: 'var(--color-pg-card, var(--color-pg-surface))',
                    border: '1px solid var(--color-pg-border)',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
                    backdropFilter: 'blur(12px)',
                }}>

                    {alerts.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: 'var(--color-pg-text-muted)',
                            fontSize: '14px',
                            border: '1px dashed var(--color-pg-border)',
                            borderRadius: '10px',
                        }}>
                            {t.no_reports}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                textAlign: 'left',
                                fontSize: '13px',
                            }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-pg-border)' }}>
                                        <th style={{ padding: '12px 8px', color: 'var(--color-pg-text-secondary)', fontWeight: 600 }}>{t.date}</th>
                                        <th style={{ padding: '12px 8px', color: 'var(--color-pg-text-secondary)', fontWeight: 600 }}>{t.severity}</th>
                                        <th style={{ padding: '12px 8px', color: 'var(--color-pg-text-secondary)', fontWeight: 600 }}>{t.message}</th>
                                        <th style={{ padding: '12px 8px', color: 'var(--color-pg-text-secondary)', fontWeight: 600 }}>{t.status}</th>
                                        {canResolve && (
                                            <th style={{ padding: '12px 8px', color: 'var(--color-pg-text-secondary)', fontWeight: 600 }}>{t.action}</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.map((alert) => {
                                        const date = new Date(alert.created_at);
                                        const dateStr = formatDateTimeDDMMYYYY(alert.created_at);

                                        const sevColor = alert.severity === 'RED' ? 'var(--color-pg-danger)'
                                            : alert.severity === 'YELLOW' ? 'var(--color-pg-warning)'
                                            : alert.severity === 'BLUE' ? 'var(--color-pg-primary)'
                                            : 'var(--color-pg-orange)';

                                        return (
                                            <tr key={alert.id} style={{
                                                borderBottom: '1px solid var(--color-pg-border-subtle)',
                                                backgroundColor: alert.is_resolved ? 'transparent' : 'rgba(239, 68, 68, 0.02)',
                                            }}>
                                                <td style={{ padding: '14px 8px', color: 'var(--color-pg-text)', whiteSpace: 'nowrap' }}>
                                                    {dateStr}
                                                </td>
                                                <td style={{ padding: '14px 8px' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        backgroundColor: `${sevColor}20`,
                                                        color: sevColor,
                                                        border: `1px solid ${sevColor}40`,
                                                    }}>
                                                        {alert.severity}
                                                    </span>
                                                    {alert.escalated_at && (
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontSize: '9px',
                                                            fontWeight: 800,
                                                            backgroundColor: '#fbbf2440',
                                                            color: 'var(--color-pg-warning)',
                                                            border: '1px solid #fbbf2480',
                                                            marginLeft: '4px',
                                                            animation: 'pulse 1.5s ease-in-out infinite',
                                                        }}>
                                                            ESCALATED
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '14px 8px', color: 'var(--color-pg-text)', lineHeight: '1.4' }}>
                                                    {alert.message}
                                                </td>
                                                <td style={{ padding: '14px 8px' }}>
                                                    {alert.is_resolved ? (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            color: 'var(--color-pg-success)',
                                                            fontWeight: 600,
                                                            fontSize: '12px'
                                                        }}>
                                                            <DotGreen size={8} /> {t.resolved}
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            color: 'var(--color-pg-danger)',
                                                            fontWeight: 600,
                                                            fontSize: '12px'
                                                        }}>
                                                            <AlertTriangle size={12} /> {t.active}
                                                        </span>
                                                    )}
                                                </td>
                                                {canResolve && (
                                                    <td style={{ padding: '14px 8px' }}>
                                                        {!alert.is_resolved && (
                                                            <button
                                                                onClick={() => handleResolve(alert.id)}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    backgroundColor: 'var(--color-pg-primary, #3b82f6)',
                                                                    color: '#ffffff',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    transition: 'opacity 0.2s',
                                                                }}
                                                                onMouseOver={(e) => e.currentTarget.style.opacity = '0.85'}
                                                                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                                                            >
                                                                {t.resolve_action}
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
