import React from 'react';
import { router } from '@inertiajs/react';

interface StageTemplate {
    id: number;
    name: string;
    description: string | null;
    stages: string[];
}

interface StageTemplateModalProps {
    editingTemplate: StageTemplate | null;
    templateFormName: string;
    setTemplateFormName: (value: string) => void;
    templateFormDesc: string;
    setTemplateFormDesc: (value: string) => void;
    templateFormStages: string[];
    setTemplateFormStages: React.Dispatch<React.SetStateAction<string[]>>;
    isSavingTemplate: boolean;
    setIsSavingTemplate: (value: boolean) => void;
    allStages: string[];
    onClose: () => void;
    onSaved: (templates: StageTemplate[]) => void;
    t: Record<string, any>;
}

/**
 * Create/edit modal for tenant stage templates. Owns its own submit (create
 * vs update by `editingTemplate`) and post-save refetch, but all form state
 * is owned by the parent Owner dashboard. Behavior is a verbatim move.
 */
export default function StageTemplateModal({
    editingTemplate,
    templateFormName,
    setTemplateFormName,
    templateFormDesc,
    setTemplateFormDesc,
    templateFormStages,
    setTemplateFormStages,
    isSavingTemplate,
    setIsSavingTemplate,
    allStages,
    onClose,
    onSaved,
    t,
}: StageTemplateModalProps) {
    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[60]"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-pg-card border border-white/8 rounded-2xl p-6 shadow-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-base font-extrabold text-pg-text m-0">
                        {editingTemplate ? t.edit_template : t.add_template}
                    </h3>
                    <button onClick={onClose}
                        className="bg-transparent border-none text-pg-text-muted text-xl cursor-pointer leading-none px-1">&times;</button>
                </div>

                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!templateFormName.trim() || templateFormStages.length === 0) return;
                    setIsSavingTemplate(true);
                    const url = editingTemplate
                        ? `/stage-templates/${editingTemplate.id}/update`
                        : '/stage-templates';
                    router.post(url, {
                        name: templateFormName.trim(),
                        description: templateFormDesc.trim() || '',
                        stages: templateFormStages,
                    }, {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: () => {
                            onClose();
                            setTemplateFormName('');
                            setTemplateFormDesc('');
                            setTemplateFormStages([]);
                            setIsSavingTemplate(false);
                            fetch('/stage-templates')
                                .then(res => res.json())
                                .then(data => {
                                    if (data.templates) onSaved(data.templates);
                                })
                                .catch(() => {});
                        },
                        onError: () => setIsSavingTemplate(false),
                        onFinish: () => setIsSavingTemplate(false),
                    });
                }}>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs font-bold text-pg-text-muted mb-1.5">{t.template_name}</label>
                            <input type="text" value={templateFormName}
                                onChange={e => setTemplateFormName(e.target.value)}
                                placeholder={t.template_name_placeholder}
                                className="w-full px-3 py-2.5 bg-pg-bg border border-white/8 rounded-xl text-white text-sm outline-none box-border"
                                required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-pg-text-muted mb-1.5">{t.template_description}</label>
                            <input type="text" value={templateFormDesc}
                                onChange={e => setTemplateFormDesc(e.target.value)}
                                placeholder={t.template_desc_placeholder}
                                className="w-full px-3 py-2.5 bg-pg-bg border border-white/8 rounded-xl text-white text-sm outline-none box-border" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-pg-text-muted mb-2">{t.select_stages_hint}</label>
                            <div className="flex flex-wrap gap-2">
                                {allStages.map(stage => {
                                    const isSelected = templateFormStages.includes(stage);
                                    return (
                                        <button key={stage} type="button"
                                            onClick={() => {
                                                setTemplateFormStages(prev =>
                                                    prev.includes(stage)
                                                        ? prev.filter(s => s !== stage)
                                                        : [...prev, stage]
                                                );
                                            }}
                                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all duration-150 cursor-pointer"
                                            style={{
                                                borderColor: isSelected ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-border)',
                                                backgroundColor: isSelected ? 'rgba(99,102,241,0.2)' : 'transparent',
                                                color: isSelected ? 'var(--color-pg-primary-hover)' : 'var(--color-pg-text-secondary)',
                                            }}>
                                            {stage}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-6">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2.5 bg-pg-surface border border-pg-border text-pg-text rounded-lg font-semibold cursor-pointer">
                            {t.cancel}
                        </button>
                        <button type="submit" disabled={isSavingTemplate || !templateFormName.trim() || templateFormStages.length === 0}
                            className="px-5 py-2.5 border-none text-white rounded-xl font-semibold cursor-pointer"
                            style={{
                                background: isSavingTemplate ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                opacity: (isSavingTemplate || !templateFormName.trim() || templateFormStages.length === 0) ? 0.6 : 1,
                            }}>
                            {isSavingTemplate ? '...' : t.save_template}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
