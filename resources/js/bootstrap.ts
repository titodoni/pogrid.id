import Pusher from 'pusher-js';
import Echo from 'laravel-echo';

declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY || '',
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || '',
    forceTLS: true,
});

// Attach the Pusher socket id to same-origin requests so broadcast()->toOthers()
// excludes the sender's own connection. Without this, the tab that triggers a
// kendala/terminate would also receive its own real-time event. Inertia v2 issues
// requests via fetch (not axios), so we wrap window.fetch.
const originalFetch = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const socketId = echo.socketId?.();
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
