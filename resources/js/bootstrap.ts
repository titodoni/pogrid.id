import Pusher from 'pusher-js';
import Echo from 'laravel-echo';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        LaravelEchoInstance?: Echo;
    }
}

window.Pusher = Pusher;

let actualEcho: Echo | null = null;

export function initializeEcho(key: string, cluster: string) {
    if (actualEcho) {
        if (actualEcho.options.key === key && actualEcho.options.cluster === cluster) {
            return actualEcho;
        }
        try {
            actualEcho.disconnect();
        } catch (e) {}
    }

    actualEcho = new Echo({
        broadcaster: 'pusher',
        key: key || import.meta.env.VITE_PUSHER_APP_KEY || '',
        cluster: cluster || import.meta.env.VITE_PUSHER_APP_CLUSTER || '',
        forceTLS: true,
    });
    window.LaravelEchoInstance = actualEcho;
    return actualEcho;
}

// Initial fallback initialization
initializeEcho('', '');

const echo = new Proxy({} as Echo, {
    get(target, prop, receiver) {
        if (!actualEcho) {
            initializeEcho('', '');
        }
        const value = Reflect.get(actualEcho!, prop);
        if (typeof value === 'function') {
            return value.bind(actualEcho);
        }
        return value;
    },
    set(target, prop, value, receiver) {
        if (!actualEcho) {
            initializeEcho('', '');
        }
        return Reflect.set(actualEcho!, prop, value);
    }
});

// Attach the Pusher socket id to same-origin requests so broadcast()->toOthers()
// excludes the sender's own connection. Without this, the tab that triggers a
// kendala/terminate would also receive its own real-time event. Inertia v2 issues
// requests via fetch (not axios), so we wrap window.fetch.
const originalFetch = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const socketId = actualEcho?.socketId?.() || (echo as any).socketId?.();
    const url = typeof input === 'string'
        ? input
        : input instanceof URL
            ? input.href
            : input.url;

    if (socketId && typeof url === 'string' && url.startsWith(window.location.origin)) {
        const headers = new Headers(init.headers);
        headers.set('X-Socket-ID', socketId);
        init = { ...init, headers };
    }

    return originalFetch(input, init);
};

export default echo;

