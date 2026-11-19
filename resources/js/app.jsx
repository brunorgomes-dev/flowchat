import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import AppLayout from './components/AppLayout';
import { ToasterFlowChat } from './components/ToasterFlowChat';

// Páginas aninhadas: o import dinâmico com template literal cobre apenas
// ./Pages/*.jsx. As telas promovidas vivem em ./Pages/V2 e são resolvidas por
// um mapa, sem alterar a resolução das páginas existentes.
const paginasV2 = import.meta.glob('./Pages/V2/*.jsx');

createInertiaApp({
    resolve: (name) => {
        if (name.startsWith('V2/')) {
            const pagina = paginasV2[`./Pages/${name}.jsx`];

            if (pagina) {
                return pagina();
            }
        }

        return import(`./Pages/${name}.jsx`);
    },
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
