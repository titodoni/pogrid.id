import React from 'react';
import { router } from '@inertiajs/react';
import { Plus } from '../../Components/Icons';
import { localizedDisplay } from '../../Utils/locale';

/**
 * Team / User Management tab — extracted verbatim from Owner/Dashboard.tsx.
 * Behavior-preserving; receives its state via props from the page.
 */
export default function TeamTab({
    users,
    roles,
    auth_user,
    isOwner,
    language,
    t,
    userRoleFilter,
    setUserRoleFilter,
    openAddUser,
    openAddAdmin,
    openEditUser,
    workflowMode,
    setWorkflowMode,
    saveWorkflowSettings,
    isSavingSettings,
    reqDesign,
    setReqDesign,
    reqMaterial,
    setReqMaterial,
    reqProductionForQc,
    setReqProductionForQc,
    reqQcForDelivery,
    setReqQcForDelivery,
    reqDeliveryForFinance,
    setReqDeliveryForFinance,
    stageTemplates,
    setStageTemplates,
    setEditingTemplate,
    setShowTemplateModal,
    setTemplateFormName,
    setTemplateFormDesc,
    setTemplateFormStages,
}: any) {
    return (<>
{(() => {
                const ALL_ROLES = (roles ?? []).map(r => r.name);
                const filteredUsers = userRoleFilter === 'ALL'
                    ? [...users]
                    : users.filter(u => u.role_name === userRoleFilter);

                const roleColorMap: Record<string, { bg: string; color: string }> = {
                    DRAFTER:      { bg: 'rgba(168,85,247,0.12)',   color: '#a855f7' },
                    PURCHASING:   { bg: 'rgba(249,115,22,0.12)',   color: 'var(--color-pg-orange)' },
                    MACHINING:    { bg: 'rgba(20,184,166,0.12)',   color: '#14b8a6' },
                    FABRICATION:  { bg: 'rgba(99,102,241,0.12)',   color: 'var(--color-pg-primary)' },
                    PRODUCTION:   { bg: 'rgba(100,116,139,0.12)',  color: 'var(--color-pg-text-muted)' },
                    QC:           { bg: 'rgba(248,113,113,0.12)',    color: 'var(--color-pg-danger)' },
                    DELIVERY:     { bg: 'rgba(16,185,129,0.12)',   color: 'var(--color-pg-success)' },
                    STAFF:        { bg: 'rgba(99,102,241,0.12)',   color: 'var(--color-pg-primary-hover)' },
                    FINANCE:      { bg: 'rgba(236,72,153,0.12)',   color: '#ec4899' },
                };

                return (
                <div>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <div>
                                <h2 className="text-lg font-bold m-0 mb-0.5">{t.team_title}</h2>
                                <p className="text-xs text-pg-text-muted m-0">{t.team_subtitle}</p>
                            </div>
                            <button
                                onClick={isOwner ? openAddAdmin : openAddUser}
                                className="px-3.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-pg-success text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                                <Plus size={14} /> {t.add_user}
                            </button>
                        </div>

                        {/* Role Filters: Dropdown for Mobile, Pills for Desktop (Rule: No side scrolling on mobile) */}
                        <div style={{ marginBottom: '16px' }}>
                            {/* Mobile Dropdown View */}
                            <div className="show-mobile-only">
                                <label className="block text-[11px] text-pg-text-muted mb-1.5 font-semibold uppercase">
                                    {language === 'en' ? 'Filter by Role' : 'Saring berdasarkan Role'}
                                </label>
                                <select
                                    value={userRoleFilter}
                                    onChange={e => setUserRoleFilter(e.target.value)}
                                    className="w-full p-2.5 px-3.5 bg-pg-surface border border-pg-border rounded-lg text-pg-text text-sm font-semibold outline-none"
                                >
                                    <option value="ALL">{t.filter_all_roles}</option>
                                    {ALL_ROLES.map(role => (
                                        users.some(u => u.role_name === role) ? (
                                            <option key={role} value={role}>{role}</option>
                                        ) : null
                                    ))}
                                </select>
                            </div>

                            {/* Desktop Pills View */}
                            <div className="hide-mobile-only flex gap-1.5 flex-wrap items-center">
                                <button
                                    onClick={() => setUserRoleFilter('ALL')}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: '1px solid',
                                        borderColor: userRoleFilter === 'ALL' ? 'var(--color-pg-primary)' : 'var(--color-pg-border)',
                                        backgroundColor: userRoleFilter === 'ALL' ? 'var(--color-pg-primary-glow)' : 'var(--color-pg-border-subtle)',
                                        color: userRoleFilter === 'ALL' ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-text-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        flexShrink: 0,
                                    }}
                                >
                                    {t.filter_all_roles}
                                </button>
                                {ALL_ROLES.map(role => (
                                    users.some(u => u.role_name === role) ? (
                                        <button
                                            key={role}
                                            onClick={() => setUserRoleFilter(role)}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '9999px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                border: '1px solid',
                                                borderColor: userRoleFilter === role
                                                    ? (roleColorMap[role]?.color || 'var(--color-pg-text-muted)')
                                                    : 'var(--color-pg-border)',
                                                backgroundColor: userRoleFilter === role
                                                    ? (roleColorMap[role]?.bg || 'var(--color-pg-surface)')
                                                    : 'var(--color-pg-border-subtle)',
                                                color: userRoleFilter === role
                                                    ? (roleColorMap[role]?.color || 'var(--color-pg-text-muted)')
                                                    : 'var(--color-pg-text-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {role}
                                        </button>
                                    ) : null
                                ))}
                            </div>
                        </div>

                        {/* User cards grid */}
                        {filteredUsers.length === 0 ? (
                            <div className="text-center p-10 text-pg-text-muted text-sm">
                                {t.no_users}
                            </div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                                    {filteredUsers.map(user => {
                                        const isSelf = user.id === auth_user?.id;
                                        const loginMethod = user.username ? 'PASSWORD' : 'PIN';
                                        const roleStyle = roleColorMap[user.role_name] || { bg: 'rgba(100,116,139,0.12)', color: 'var(--color-pg-text-muted)' };
                                        return (
                                            <div
                                                key={user.id}
                                                className="user-card bg-pg-surface border border-pg-border rounded-xl p-4 flex flex-col gap-2.5"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0"
                                                        style={{
                                                            backgroundColor: roleStyle.bg,
                                                            border: `1px solid ${roleStyle.color}30`,
                                                            color: roleStyle.color,
                                                        }}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-sm font-bold text-pg-text">
                                                                {user.name}
                                                            </span>
                                                            {isSelf && (
                                                                <span className="text-[10px] bg-blue-500/15 text-blue-500 px-1.5 py-px rounded font-bold">
                                                                    {t.user_self_badge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {user.username && (
                                                            <div className="text-[11px] text-pg-text-muted mt-px">@{user.username}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-1.5 flex-wrap">
                                                    <span className="text-[10px] font-bold px-2 py-[3px] rounded-md"
                                                        style={{ backgroundColor: roleStyle.bg, color: roleStyle.color }}>
                                                        {localizedDisplay({ display_name: user.role_display_name, display_name_id: user.role_display_name_id }, language)}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-[3px] rounded-md"
                                                        style={{
                                                            backgroundColor: loginMethod === 'PASSWORD'
                                                                ? 'rgba(99,102,241,0.12)'
                                                                : 'rgba(16,185,129,0.1)',
                                                            color: loginMethod === 'PASSWORD' ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-success)',
                                                        }}>
                                                        {loginMethod === 'PASSWORD' ? '🔑 ' + t.login_method_password : '🔢 ' + t.login_method_pin}
                                                    </span>
                                                </div>

                                                {!(isOwner && user.is_owner && !isSelf) && (
                                                    <button
                                                        id={`edit-user-${user.id}`}
                                                        onClick={() => openEditUser(user)}
                                                        className="py-2 bg-white/4 border border-white/8 rounded-lg text-pg-text-secondary text-xs font-semibold cursor-pointer w-full text-center"
                                                    >
                                                        ✏️ {t.edit_user}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                        {/* ── Workflow & Validation Settings ────────────────────── */}
                        <div className="mt-8 bg-pg-surface border border-pg-border rounded-2xl p-6">
                            <div className="mb-4">
                                <h3 className="text-base font-extrabold text-pg-text m-0 mb-1">
                                    {language === 'en' ? 'Workflow & Validation Rules' : 'Aturan Alur Kerja & Validasi'}
                                </h3>
                                <p className="text-xs text-pg-text-muted m-0">
                                    {language === 'en' 
                                        ? 'Define rules and locks between design, material purchasing, production, QC, and delivery stages.' 
                                        : 'Tentukan aturan dan kuncian antara tahap desain, pembelian bahan, produksi, QC, dan pengiriman.'}
                                </p>
                            </div>

                            <form onSubmit={saveWorkflowSettings}>
                                {/* Mode Selection Group */}
                                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 mb-5">
                                    {[
                                        { value: 'loose', label: language === 'en' ? 'Loose Mode' : 'Mode Longgar', desc: language === 'en' ? 'Production is not blocked by design/material readiness.' : 'Produksi tidak dikunci oleh kesiapan desain/bahan.' },
                                        { value: 'strict', label: language === 'en' ? 'Strict Mode' : 'Mode Ketat', desc: language === 'en' ? 'Design and material must be 100% ready to start production.' : 'Desain dan bahan harus 100% siap untuk mulai produksi.' },
                                        { value: 'custom', label: language === 'en' ? 'Custom Mode' : 'Mode Kustom', desc: language === 'en' ? 'Configure individual gate locks manually.' : 'Atur kuncian gerbang secara manual.' }
                                    ].map(mode => {
                                        const isSelected = workflowMode === mode.value;
                                        return (
                                            <div
                                                key={mode.value}
                                                onClick={() => {
                                                    setWorkflowMode(mode.value as any);
                                                    if (mode.value === 'strict') {
                                                        setReqDesign(true);
                                                        setReqMaterial(true);
                                                        setReqProductionForQc(true);
                                                        setReqQcForDelivery(true);
                                                        setReqDeliveryForFinance(true);
                                                    } else if (mode.value === 'loose') {
                                                        setReqDesign(false);
                                                        setReqMaterial(false);
                                                        setReqProductionForQc(true);
                                                        setReqQcForDelivery(true);
                                                        setReqDeliveryForFinance(true);
                                                    }
                                                }}
                                                className="rounded-xl p-4 cursor-pointer transition-all duration-200"
                                                style={{
                                                    backgroundColor: isSelected ? 'var(--color-pg-primary-glow)' : 'var(--color-pg-border-subtle)',
                                                    border: '1px solid',
                                                    borderColor: isSelected ? 'var(--color-pg-primary)' : 'var(--color-pg-border)',
                                                }}
                                            >
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className="w-4 h-4 rounded-full box-border"
                                                        style={{
                                                            border: isSelected ? '5px solid var(--color-pg-primary)' : '2px solid var(--color-pg-border)',
                                                            backgroundColor: isSelected ? '#fff' : 'transparent',
                                                        }} />
                                                    <span className="text-sm font-bold" style={{ color: isSelected ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-text)' }}>
                                                        {mode.label}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-pg-text-secondary m-0">{mode.desc}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Custom Toggles Box */}
                                {workflowMode === 'custom' && (
                                    <div className="bg-black/20 rounded-xl p-4 mb-5 flex flex-col gap-3 border border-white/4">
                                        {[
                                            { state: reqDesign, setter: setReqDesign, label: language === 'en' ? 'Require Design Approved (APPROVED) to start Production' : 'Wajib Desain Disetujui (APPROVED) untuk memulai Produksi' },
                                            { state: reqMaterial, setter: setReqMaterial, label: language === 'en' ? 'Require Material Ready (READY) to start Production' : 'Wajib Bahan Siap (READY) untuk memulai Produksi' },
                                            { state: reqProductionForQc, setter: setReqProductionForQc, label: language === 'en' ? 'Require Production Completed to start QC' : 'Wajib Produksi Selesai untuk memulai QC' },
                                            { state: reqQcForDelivery, setter: setReqQcForDelivery, label: language === 'en' ? 'Require QC Completed to start Delivery' : 'Wajib QC Selesai untuk memulai Pengiriman' },
                                            { state: reqDeliveryForFinance, setter: setReqDeliveryForFinance, label: language === 'en' ? 'Require Delivery Completed to start Finance stage' : 'Wajib Pengiriman Selesai untuk memulai Keuangan' }
                                        ].map((rule, idx) => (
                                            <label key={idx} className="flex items-center gap-2.5 cursor-pointer text-sm text-pg-text">
                                                <input
                                                    type="checkbox"
                                                    checked={rule.state}
                                                    onChange={e => rule.setter(e.target.checked)}
                                                    style={{
                                                        width: '16px', height: '16px', borderRadius: '4px',
                                                        accentColor: 'var(--color-pg-primary)', cursor: 'pointer'
                                                    }}
                                                />
                                                {rule.label}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingSettings}
                                        className="px-4.5 py-2 rounded-lg text-white text-sm font-bold border-none transition-all duration-200"
                                        style={{
                                            backgroundColor: isSavingSettings ? 'rgba(99,102,241,0.5)' : 'var(--color-pg-primary)',
                                            cursor: isSavingSettings ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {isSavingSettings 
                                            ? (language === 'en' ? 'Saving...' : 'Menyimpan...') 
                                            : (language === 'en' ? 'Save Settings' : 'Simpan Pengaturan')}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* ── Stage Templates Section ───────────────────────── */}
                        <div className="mt-8 bg-pg-surface border border-pg-border rounded-2xl p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-extrabold text-pg-text m-0 mb-1">{t.stage_templates}</h3>
                                    <p className="text-xs text-pg-text-muted m-0">{t.stage_templates_subtitle}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingTemplate(null);
                                        setTemplateFormName('');
                                        setTemplateFormDesc('');
                                        setTemplateFormStages([]);
                                        setShowTemplateModal(true);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-white text-xs font-bold border-none transition-all duration-200 cursor-pointer"
                                    style={{ backgroundColor: 'var(--color-pg-primary)' }}
                                >
                                    + {t.add_template}
                                </button>
                            </div>

                            {stageTemplates.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-pg-text-muted m-0">{t.no_templates}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {stageTemplates.map(tmpl => (
                                        <div key={tmpl.id} className="flex items-center justify-between bg-black/20 rounded-xl p-3 border border-white/4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-bold text-pg-text">{tmpl.name}</span>
                                                    {tmpl.description && (
                                                        <span className="text-xs text-pg-text-muted truncate">{tmpl.description}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {tmpl.stages.map(s => (
                                                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded"
                                                            style={{ backgroundColor: 'var(--color-pg-primary-glow)', color: 'var(--color-pg-primary-hover)' }}>
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-3 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingTemplate(tmpl);
                                                        setTemplateFormName(tmpl.name);
                                                        setTemplateFormDesc(tmpl.description || '');
                                                        setTemplateFormStages([...tmpl.stages]);
                                                        setShowTemplateModal(true);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-white/8 cursor-pointer transition-all duration-200"
                                                    style={{ color: 'var(--color-pg-text)', backgroundColor: 'var(--color-pg-border-subtle)' }}
                                                >
                                                    {t.edit_template}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm(` ${t.delete_template_confirm}`)) {
                                                            router.post(`/stage-templates/${tmpl.id}/delete`, {}, {
                                                                preserveState: true,
                                                                preserveScroll: true,
                                                                onSuccess: () => {
                                                                    setStageTemplates(prev => prev.filter(st => st.id !== tmpl.id));
                                                                },
                                                            });
                                                        }
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold border-none cursor-pointer transition-all duration-200"
                                                    style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}
                                                >
                                                    {t.delete_template}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
    </>);
}
