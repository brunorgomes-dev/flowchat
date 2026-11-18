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
            className="flowchat-toaster"
            position="top-right"
            theme={escuro ? 'dark' : 'light'}
            richColors
            closeButton
            toastOptions={{
                classNames: {
                    toast: 'flowchat-toast',
                    title: 'flowchat-toast__title',
                    description: 'flowchat-toast__description',
                    closeButton: 'flowchat-toast__close',
                    actionButton: 'flowchat-toast__action',
                    cancelButton: 'flowchat-toast__cancel',
                },
            }}
            style={{
                '--width': 'min(26rem, calc(100vw - 2rem))',
                '--normal-bg': 'var(--card)',
                '--normal-border': 'var(--border)',
                '--normal-border-hover': 'var(--border)',
                '--normal-bg-hover': 'var(--muted)',
                '--normal-text': 'var(--card-foreground)',
                '--success-bg': 'var(--card)',
                '--success-border': 'var(--border)',
                '--success-text': 'var(--card-foreground)',
                '--info-bg': 'var(--card)',
                '--info-border': 'var(--border)',
                '--info-text': 'var(--card-foreground)',
                '--warning-bg': 'var(--card)',
                '--warning-border': 'var(--border)',
                '--warning-text': 'var(--card-foreground)',
                '--error-bg': 'var(--card)',
                '--error-border': 'var(--border)',
                '--error-text': 'var(--card-foreground)',
                '--border-radius': '2px',
            }}
        />
    );
}
