import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '../css/superpowers.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';

createInertiaApp({
    title: (title) => (title ? `${title} — Superpowers` : 'Superpowers'),

    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),

    setup({ el, App, props }) {
        createRoot(el).render(
            <StrictMode>
                <App {...props} />
            </StrictMode>,
        );
    },
});
