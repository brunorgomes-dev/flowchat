import { useEffect, useRef } from 'react';

export function ModalFlowChat({ open, onClose, labelledBy, children, className = 'max-w-xl' }) {
    const elemento = useRef(null);

    useEffect(() => {
        const dialog = elemento.current;

        if (!dialog) {
            return;
        }

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={elemento}
            data-flowchat-dialog
            aria-labelledby={labelledBy}
            onCancel={(evento) => {
                evento.preventDefault();
                onClose();
            }}
            onClose={() => {
                if (open) {
                    onClose();
                }
            }}
            onClick={(evento) => {
                if (evento.target === evento.currentTarget) {
                    onClose();
                }
            }}
            className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl ${className}`}
        >
            {children}
        </dialog>
    );
}
