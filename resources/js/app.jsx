import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import AppLayout from './components/AppLayout';
import { ToasterFlowChat } from './components/ToasterFlowChat';

createInertiaApp({
    resolve: (name) => import(`./Pages/${name}.jsx`),
    layout: () => AppLayout,
    setup({ el, App, props }) {
        createRoot(el).render(
            <>
                <ToasterFlowChat />
                <App {...props} />
            </>
        );
    },
});
