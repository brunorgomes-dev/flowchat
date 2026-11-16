import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import AppLayout from './components/AppLayout';
import { ToasterFlowChat } from './components/ToasterFlowChat';

// Páginas aninhadas: o import dinâmico com template literal cobre apenas
// ./Pages/*.jsx. As telas promovidas (V2/) e o preview vivem em subdiretórios
// próprios e são resolvidos por mapas, sem alterar a resolução das páginas
// existentes.
const paginasV2 = import.meta.glob('./Pages/V2/*.jsx');
const paginasPreviewDesignV2 = import.meta.glob('./Pages/Preview/DesignV2/*.jsx');

createInertiaApp({
    resolve: (name) => {
        if (name.startsWith('V2/')) {
            const pagina = paginasV2[`./Pages/${name}.jsx`];

            if (pagina) {
                return pagina();
            }
        }

        if (name.startsWith('Preview/DesignV2/')) {
            const pagina = paginasPreviewDesignV2[`./Pages/${name}.jsx`];

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
