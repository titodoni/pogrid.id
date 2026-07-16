import { useEffect, useRef } from 'react';

export function useUnsavedChanges(isDirty: boolean): void {
    const isDirtyRef = useRef(isDirty);

    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    useEffect(() => {
        if (!isDirty) return;

        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);
}
