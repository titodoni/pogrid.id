import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import FlashMessages from './Components/FlashMessages';
import { initializeEcho } from './bootstrap';

const defaultLayout = (page: React.ReactNode) => (
    <>
        <FlashMessages />
        {page}
    </>
);

createInertiaApp({
    title: (title) => `${title} - POgrid.id`,
    resolve: async (name) => {
        const page = (await resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx'))) as any;
        page.default.layout = page.default.layout || defaultLayout;
        return page;
    },
    setup({ el, App, props }) {
        const pusherConfig = props.initialPage.props.pusher as { key: string; cluster: string } | undefined;
        if (pusherConfig?.key) {
            initializeEcho(pusherConfig.key, pusherConfig.cluster);
        }
        createRoot(el).render(<App {...props} />);
    },
});

