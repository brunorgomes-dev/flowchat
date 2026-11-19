import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { ToasterFlowChat } from './components/ToasterFlowChat';

// Todas as páginas vivem em ./Pages/V2 e são resolvidas por um mapa: o import
// dinâmico com template literal não cobre subdiretórios.
const paginas = import.meta.glob('./Pages/V2/*.jsx');

createInertiaApp({
    resolve: (name) => {
        const pagina = paginas[`./Pages/${name}.jsx`];

        if (!pagina) {
            throw new Error(`Página Inertia desconhecida: ${name}`);
        }

        return pagina();
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <>
                <ToasterFlowChat />
                <App {...props} />
            </>
        );
    },
});
