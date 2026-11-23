import { LoaderCircle, SendHorizontal } from 'lucide-react';

/**
 * Compositor de resposta do contato selecionado. Envia com Enter e mantém a
 * quebra de linha com Shift+Enter.
 */
export default function CompositorMensagem({ form, aoEnviar }) {
    return (
        <div className="v2-thread__compositor">
            <form
                className="mx-auto flex w-full max-w-2xl flex-col gap-1.5"
                onSubmit={(evento) => {
                    evento.preventDefault();
                    aoEnviar();
                }}
            >
                <div className="v2-compositor">
                    <div className="min-w-0 flex-1">
                        <label htmlFor="resposta-conversa" className="v2-oculto-visual">
                            Escrever mensagem para o contato
                        </label>
                        <textarea
                            id="resposta-conversa"
                            className="v2-entrada text-[0.8125rem]"
                            rows={1}
                            maxLength={640}
                            value={form.data.texto}
                            onChange={(evento) => form.setData('texto', evento.target.value)}
                            onKeyDown={(evento) => {
                                if (evento.key === 'Enter' && !evento.shiftKey) {
                                    evento.preventDefault();
                                    aoEnviar();
                                }
                            }}
                            placeholder="Escrever mensagem…"
                            aria-invalid={Boolean(form.errors.texto)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="v2-btn v2-btn--primario v2-enviar"
                        disabled={form.processing || !form.data.texto.trim()}
                        aria-label="Enviar mensagem"
                    >
                        {form.processing ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <SendHorizontal aria-hidden="true" />}
                    </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <span className="v2-micro">{form.data.texto.length}/640 caracteres · Enter envia, Shift+Enter quebra linha</span>
                    <span className="v2-micro">A resposta é enviada pelo Messenger</span>
                </div>
                {form.errors.texto && (
                    <span className="v2-campo__erro" role="alert">{form.errors.texto}</span>
                )}
            </form>
        </div>
    );
}
