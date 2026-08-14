import React from 'react';

export interface PillOption<T extends string> {
    value: T;
    /** Full label (may contain the full/short responsive span pair) */
    label: React.ReactNode;
}

interface PillFilterProps<T extends string> {
    options: PillOption<T>[];
    value: T;
    onChange: React.Dispatch<React.SetStateAction<T>>;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Shared pill-style filter row. Replaces the duplicated inline pill-button
 * blocks in Owner Dashboard and ActiveDelayDirectory.
 */
export default function PillFilter<T extends string>({ options, value, onChange, className, style }: PillFilterProps<T>) {
    return (
        <div className={className} style={style}>
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className="cursor-pointer transition-all duration-200"
                        style={{
                            padding: '6px 14px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: '1px solid var(--color-pg-border)',
                            backgroundColor: active ? 'var(--color-pg-primary)' : 'var(--color-pg-border-subtle)',
                            color: active ? '#ffffff' : 'var(--color-pg-text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
