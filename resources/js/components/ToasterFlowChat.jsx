import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

// Único ponto global de notificações; acompanha o modo escuro pela classe .dark do <html>
export function ToasterFlowChat() {
    const [escuro, setEscuro] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const observar = new MutationObserver(() => {
            setEscuro(document.documentElement.classList.contains('dark'));
        });
        observar.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observar.disconnect();
    }, []);

    return (
        <Toaster
            position="top-right"
            theme={escuro ? 'dark' : 'light'}
            richColors
            closeButton
            style={{ '--width': 'min(420px, calc(100vw - 2rem))' }}
        />
    );
}
