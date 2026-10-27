import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { MensagemBubble } from '@/components/MensagemBubble';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';

export default function HistoricoContato({ contato, mensagens }) {
    const nome = contato.nome?.trim() || contato.psid || 'Contato sem identificação';

    return (
        <div className="min-h-full w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-5xl">
                <PageHeader
                    eyebrow="Histórico da conversa"
                    title={nome}
                    description={contato.psid ? `PSID ${contato.psid}` : 'Identificador não disponível'}
                    actions={(
                        <Button asChild variant="outline" className="h-10">
                            <Link href={`/conversas?contato=${contato.id}`}>
                                <ArrowLeft />
                                Voltar à conversa
                            </Link>
                        </Button>
                    )}
                />

                <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">Mensagens</h2>
                            <p className="mt-1 text-xs text-muted-foreground">Exibidas em ordem cronológica.</p>
                        </div>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                            {mensagens.length}
                        </span>
                    </div>

                    {mensagens.length > 0 ? (
                        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
                            {mensagens.map((mensagem) => (
                                <MensagemBubble key={mensagem.id} mensagem={mensagem} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center">
                            <p className="text-sm font-medium text-foreground">Nenhuma mensagem registrada</p>
                            <p className="mt-1 text-xs text-muted-foreground">As mensagens deste contato aparecerão aqui.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
