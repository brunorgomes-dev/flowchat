import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, LoaderCircle, MessagesSquare } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';

export default function SelecionarPaginaMessenger({ paginas = [] }) {
    const erro = usePage().props.errors?.page_id;
    const [selecionando, setSelecionando] = useState(null);

    const selecionar = (pagina) => {
        setSelecionando(pagina.id);
        router.post('/configuracoes/messenger/paginas', { page_id: pagina.id }, {
            onFinish: () => setSelecionando(null),
        });
    };

    return (
        <div className="min-h-full w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-3xl">
                <PageHeader
                    eyebrow="Integração"
                    title="Escolha uma Página"
                    description="Selecione a Página do Facebook que será conectada à sua conta FlowChat."
                />

                {erro && (
                    <p role="alert" className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {erro}
                    </p>
                )}

                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border px-5 py-4 sm:px-6">
                        <h2 className="text-sm font-semibold text-foreground">Páginas disponíveis</h2>
                        <p className="mt-1 text-xs text-muted-foreground">O FlowChat usará a Página escolhida para receber e enviar mensagens no Messenger.</p>
                    </div>

                    <div className="space-y-3 p-5 sm:p-6">
                        {paginas.map((pagina) => (
                            <article key={pagina.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <MessagesSquare className="size-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-foreground">{pagina.nome}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">ID {pagina.id}</p>
                                    </div>
                                </div>
                                <Button type="button" disabled={selecionando !== null} onClick={() => selecionar(pagina)} className="h-10">
                                    {selecionando === pagina.id && <LoaderCircle className="animate-spin" />}
                                    Conectar esta Página
                                </Button>
                            </article>
                        ))}

                        {paginas.length === 0 && (
                            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                Nenhuma Página foi disponibilizada pelo Facebook para esta autorização.
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
                        <Button type="button" variant="ghost" onClick={() => router.post('/configuracoes/messenger/cancelar-conexao')}>
                            <ArrowLeft />
                            Cancelar e voltar
                        </Button>
                        <Button type="button" variant="outline" onClick={() => window.location.assign('/configuracoes/messenger/conectar')}>
                            Escolher outra conta do Facebook
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    );
}
