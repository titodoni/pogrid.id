import React, { useState, useEffect, useRef } from 'react';

export const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }> = ({ children, delay = 0, className = '', style }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        setShown(true);
                        obs.disconnect();
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`reveal ${shown ? 'reveal-visible' : ''} ${className}`}
            style={{ transitionDelay: `${delay}ms`, ...style }}
        >
            {children}
        </div>
    );
};
