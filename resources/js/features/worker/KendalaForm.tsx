import React from 'react';

interface KendalaFormProps {
    kendalaType: string;
    setKendalaType: (value: string) => void;
    kendalaNote: string;
    setKendalaNote: (value: string) => void;
    onCancel: () => void;
    onSubmit: (e: React.FormEvent) => void;
    loading: boolean;
    language: 'en' | 'id';
    t: Record<string, any>;
}

/**
 * Trouble ("kendala") report form shown inside an expanded worker item card.
 * Presentation only — submit/cancel behavior stays owned by the card.
 */
export default function KendalaForm({
    kendalaType,
    setKendalaType,
    kendalaNote,
    setKendalaNote,
    onCancel,
    onSubmit,
    loading,
    language,
    t,
}: KendalaFormProps) {
    return (
        <form onSubmit={onSubmit} style={{
            marginTop: '8px',
            padding: '10px',
            backgroundColor: 'var(--color-pg-border-subtle)',
            borderRadius: '10px',
        }}>
            <label style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                {t.failure_type_label}
            </label>
            <select
                value={kendalaType}
                onChange={(e) => setKendalaType(e.target.value)}
                style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--color-pg-input)',
                    color: 'var(--color-pg-text)',
                    border: '1px solid var(--color-pg-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    outline: 'none',
                    marginBottom: '8px',
                }}
            >
                <option value="Machine Broken">{t.machine_broken}</option>
                <option value="Material Delay">{t.material_delay}</option>
                <option value="Operator Sick">{t.operator_sick}</option>
                <option value="Power Outage">{t.power_outage}</option>
            </select>
            <label style={{ fontSize: '12px', color: 'var(--color-pg-text-secondary)', marginTop: '8px', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                {language === 'en' ? 'Note / Description' : 'Catatan / Deskripsi'}
            </label>
            <textarea
                value={kendalaNote}
                onChange={(e) => setKendalaNote(e.target.value)}
                placeholder={language === 'en' ? 'Provide details about the issue...' : 'Berikan detail mengenai kendala...'}
                style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--color-pg-input)',
                    color: 'var(--color-pg-text)',
                    border: '1px solid var(--color-pg-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    outline: 'none',
                    marginBottom: '8px',
                    resize: 'vertical',
                    minHeight: '60px',
                    boxSizing: 'border-box',
                }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="focus:outline-none focus:ring-1 focus:ring-white/25 hover:bg-white/5 active:scale-95 disabled:opacity-50 transition-all duration-150"
                    style={{
                        padding: '10px 16px',
                        backgroundColor: 'transparent',
                        color: 'var(--color-pg-text-secondary)',
                        border: '1px solid var(--color-pg-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                    }}
                >
                    {t.cancel}
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="focus:outline-none focus:ring-2 focus:ring-red-500/50 hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all duration-150"
                    style={{
                        padding: '10px 18px',
                        backgroundColor: 'var(--color-pg-danger)',
                        color: 'var(--color-pg-text)',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                    }}
                >
                    {t.submit}
                </button>
            </div>
        </form>
    );
}
