/**
 * Shared Echo presence + connection-state + fallback-polling hook.
 *
 * Extracted from the triplicated Echo blocks in Owner/Dashboard,
 * Worker/Dashboard and Ppic/Dashboard. Behavior-preserving: same presence
 * bookkeeping, same ws status transitions, same 30s polling fallback when
 * no Pusher connection exists, same reload-on-reconnect.
 *
 * Pages keep their own domain listeners via `registerListeners`.
 */
import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import echo from '../bootstrap';

export interface ToastEntry {
    message: string;
    severity: string;
    id: number;
    timestamp: number;
}

interface UseEchoPresenceOptions {
    tenantId: number | string | null | undefined;
    /** Channel suffix: 'dashboard' | 'workers' */
    channel: string;
    /** Page-specific scoped reload (e.g. router.reload({ only: [...] })) */
    onRefresh: () => void;
    /**
     * Register page-specific listeners. Use pushToast(entry, dismissMs) for
     * toast-queue semantics identical to the old inline copies.
     */
    registerListeners?: (channel: any, pushToast: (entry: ToastEntry, dismissMs?: number) => void) => void;
}

export function useEchoPresence({ tenantId, channel, onRefresh, registerListeners }: UseEchoPresenceOptions) {
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
    const [toastQueue, setToastQueue] = useState<ToastEntry[]>([]);
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;

    useEffect(() => {
        if (!tenantId) return;

        // Toast queue helper (dedup by message, auto-dismiss)
        const pushToast = (entry: ToastEntry, dismissMs = 8000) => {
            setToastQueue(prev => prev.some(t => t.message === entry.message) ? prev : [...prev, entry]);
            setTimeout(() => {
                setToastQueue(prev => prev.filter(t => t.timestamp !== entry.timestamp));
            }, dismissMs);
        };

        // Presence Channel
        const presenceChannel = echo.join(`tenant.${tenantId}.presence`);
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
                        router.reload();
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
                onRefreshRef.current();
            }, 30000);
        }

        const privateChannel = echo.private(`tenant.${tenantId}.${channel}`);
        registerListeners?.(privateChannel, pushToast);

        return () => {
            echo.leave(`tenant.${tenantId}.${channel}`);
            echo.leave(`tenant.${tenantId}.presence`);
            if (pusherConn) {
                pusherConn.unbind('state_change');
            }
            if (fallbackInterval) clearInterval(fallbackInterval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId]);

    return { onlineUsers, wsStatus, toastQueue, setToastQueue };
}
