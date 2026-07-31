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
        namespace: '',
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
function getSocketId(): string | undefined {
    return actualEcho?.socketId?.() ||
        (echo as any)?.socketId?.() ||
        (actualEcho as any)?.connector?.pusher?.connection?.socket_id ||
        (window as any)?.LaravelEchoInstance?.connector?.pusher?.connection?.socket_id;
}

const originalFetch = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const socketId = getSocketId();
    let urlString = '';
    let requestHeaders: HeadersInit | undefined;

    if (typeof input === 'string') {
        urlString = input;
    } else if (input instanceof URL) {
        urlString = input.href;
    } else if (input && typeof (input as Request).url === 'string') {
        urlString = (input as Request).url;
        requestHeaders = (input as Request).headers;
    }

    let isSameOrigin = false;
    try {
        const parsed = new URL(urlString, window.location.origin);
        isSameOrigin = (parsed.origin === window.location.origin);
    } catch (e) {
        isSameOrigin = true;
    }

    if (socketId && isSameOrigin) {
        const newInit = { ...(init || {}) };
        const headers = new Headers(newInit.headers || requestHeaders || {});
        headers.set('X-Socket-ID', socketId);
        newInit.headers = headers;
        return originalFetch(input, newInit);
    }

    return originalFetch(input, init || {});
};

const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
    (this as any)._url = url;
    return (originalXhrOpen as any).apply(this, [method, url, ...args]);
};

XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    const socketId = getSocketId();
    if (socketId && (this as any)._url) {
        let isSameOrigin = false;
        try {
            const parsed = new URL(String((this as any)._url), window.location.origin);
            isSameOrigin = (parsed.origin === window.location.origin);
        } catch (e) {
            isSameOrigin = true;
        }
        if (isSameOrigin) {
            try {
                this.setRequestHeader('X-Socket-ID', socketId);
            } catch (e) {}
        }
    }
    return (originalXhrSend as any).apply(this, arguments as any);
};

export default echo;

