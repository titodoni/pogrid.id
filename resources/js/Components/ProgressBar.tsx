import React from 'react';

interface ProgressBarProps {
    /** 0–100 */
    percent: number;
    color: string;
    /** Track markup is caller-styled to preserve each surface's visual language */
    trackClassName?: string;
    trackStyle?: React.CSSProperties;
    fillStyle?: React.CSSProperties;
}

/**
 * Shared horizontal track+fill progress bar. Replaces 9 inline copies across
 * Owner Dashboard, SearchModal, PPIC Dashboard and MyKpi.
 */
export default function ProgressBar({ percent, color, trackClassName, trackStyle, fillStyle }: ProgressBarProps) {
    return (
        <div className={trackClassName} style={trackStyle}>
            <div style={{ width: `${Math.min(100, Math.max(0, percent))}%`, height: '100%', backgroundColor: color, ...fillStyle }} />
        </div>
    );
}
