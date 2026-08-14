import React from 'react';
import { DotGreen } from '../../Components/Icons';

/**
 * Alerts tab — extracted verbatim from Owner/Dashboard.tsx.
 */
export default function AlertsTab({
    language,
    t,
    alerts,
    getUnifiedIssuesList,
    formatAlertTime,
    formatReasonType,
    changeTab,
    setExpandedPOs,
    setExpandedItems,
}: any) {
    return (<>
{(() => {
                const unifiedIssues = getUnifiedIssuesList();
                return (
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{t.unresolved_alerts}</span>
                            <span style={{
                                fontSize: '12px',
                                backgroundColor: unifiedIssues.length > 0 ? '#ef4444' : 'var(--color-pg-success)',
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '12px'
                            }}>
                                {unifiedIssues.length} Triggered
                            </span>
                        </h2>

                        {unifiedIssues.length === 0 ? (
                            <div style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                                border: '1px solid rgba(16, 185, 129, 0.15)',
                                borderRadius: '12px',
                                padding: '16px',
                                color: 'var(--color-pg-success)',
                                fontSize: '14px',
                                fontWeight: 500
                            }}>
                                <DotGreen size={10} /> All manufacturing timelines are healthy and no operational failures are reported.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                {unifiedIssues.map((issue) => {
                                    const isEscalated = !!issue.escalated_at;
                                    const bgColor = issue.severity === 'RED' ? 'rgba(239, 68, 68, 0.08)' 
                                        : issue.severity === 'BLUE' ? 'rgba(59, 130, 246, 0.08)' 
                                        : issue.severity === 'ORANGE' ? 'rgba(249, 115, 22, 0.08)'
                                        : 'rgba(234, 179, 8, 0.08)';
                                    const bdColor = issue.severity === 'RED' 
                                        ? (isEscalated ? '#ef4444' : 'rgba(239, 68, 68, 0.2)')
                                        : issue.severity === 'BLUE' ? 'rgba(59, 130, 246, 0.2)' 
                                        : issue.severity === 'ORANGE' ? 'rgba(249, 115, 22, 0.2)'
                                        : 'rgba(234, 179, 8, 0.2)';
                                    const badgeBg = issue.severity === 'RED' ? '#ef4444' 
                                        : issue.severity === 'BLUE' ? '#3b82f6' 
                                        : issue.severity === 'ORANGE' ? 'var(--color-pg-orange)'
                                        : 'var(--color-pg-warning)';
                                    const badgeText = issue.title;

                                    return (
                                        <div
                                            key={issue.id}
                                            id={`alert-card-${issue.id}`}
                                            onClick={() => {
                                                if (issue.po_id) {
                                                    changeTab('active');
                                                    setExpandedPOs(prev => {
                                                        const next = new Set(prev);
                                                        next.add(issue.po_id);
                                                        return next;
                                                    });
                                                    if (issue.item_id) {
                                                        setExpandedItems(prev => {
                                                            const next = new Set(prev);
                                                            next.add(issue.item_id);
                                                            return next;
                                                        });
                                                        setTimeout(() => {
                                                            const el = document.getElementById(`item-card-${issue.item_id}`);
                                                            if (el) {
                                                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            }
                                                        }, 120);
                                                    }
                                                }
                                            }}
                                            style={{
                                                backgroundColor: bgColor,
                                                border: '1px solid',
                                                borderColor: bdColor,
                                                borderRadius: '10px',
                                                padding: '14px 18px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                flexWrap: 'wrap',
                                                cursor: issue.po_id ? 'pointer' : 'default',
                                                transition: 'all 0.2s',
                                            }}
                                            className={issue.po_id ? 'hover-grow' : ''}
                                        >
                                            <div style={{ flex: 1, minWidth: '200px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span className="badge" style={{
                                                            color: '#fff',
                                                            backgroundColor: badgeBg,
                                                            fontSize: '10px',
                                                            fontWeight: 800,
                                                            padding: '3px 8px',
                                                            borderRadius: '4px',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {badgeText}
                                                        </span>
                                                        {isEscalated && (
                                                            <span className="badge" style={{
                                                                color: '#000',
                                                                backgroundColor: 'var(--color-pg-warning)',
                                                                fontSize: '10px',
                                                                fontWeight: 800,
                                                                padding: '3px 8px',
                                                                borderRadius: '4px',
                                                                whiteSpace: 'nowrap',
                                                                animation: 'pulse 1.5s ease-in-out infinite',
                                                            }}>
                                                                ESCALATED
                                                            </span>
                                                        )}
                                                        {issue.poNumber && (
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-pg-text)' }}>
                                                                {issue.poNumber} {issue.client_name ? `(${issue.client_name})` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {issue.created_at && (
                                                        <span style={{ fontSize: '11px', color: 'var(--color-pg-text-secondary)', fontWeight: 500 }}>
                                                            {formatAlertTime(issue.created_at, language)}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {issue.itemName ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ fontSize: '14px', color: 'var(--color-pg-text)', fontWeight: 600 }}>
                                                            {issue.itemName} &middot; <span style={{ color: 'var(--color-pg-orange)', fontWeight: 700 }}>Stage: {issue.stage}</span>
                                                        </div>
                                                        {issue.reason ? (
                                                            <div style={{ fontSize: '13px', color: 'var(--color-pg-text-secondary)' }}>
                                                                <strong style={{ color: 'var(--color-pg-danger)' }}>
                                                                    {language === 'id' ? 'Penyebab: ' : 'Why: '}
                                                                </strong>
                                                                {formatReasonType(issue.reason, language)}
                                                                {issue.note ? ` (${issue.note})` : ''}
                                                            </div>
                                                        ) : (
                                                            <div style={{ fontSize: '13px', color: 'var(--color-pg-text-secondary)' }}>
                                                                {issue.message}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '14px', color: 'var(--color-pg-text)' }}>
                                                        {issue.message}
                                                    </div>
                                                )}
                                            </div>
                                            {issue.action && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        issue.action?.();
                                                    }}
                                                    style={{
                                                        padding: '6px 14px',
                                                        backgroundColor: '#3b82f6',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontWeight: 600,
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {language === 'en' ? 'Approve & Generate PIN' : 'Setujui & Buat PIN'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })()}
    </>);
}
