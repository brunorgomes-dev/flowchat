import { Link, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';

const selectClasses = 'h-10 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20';
const panelClasses = 'min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm';

export default function PaginaInicial({ contatos, fluxos, mensagens, logs }) {
    return (
        <div className="min-h-full w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
                <PageHeader
                    eyebrow="Visão geral"
                    title="Painel"
                    description="Acompanhe contatos, mensagens recentes e atividade dos fluxos."
                />

                <section className={`${panelClasses} mb-5`}>
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold text-foreground">Executar fluxo manualmente</h2>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Escolha um contato e um fluxo para iniciar uma execução.
                        </p>
                    </div>
                    <FormularioExecucaoManual contatos={contatos} fluxos={fluxos} />
                </section>

                <div className="grid min-w-0 gap-5 xl:grid-cols-3">
                    <section className={panelClasses}>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold text-foreground">Contatos</h2>
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                                {contatos.length}
                            </span>
                        </div>
                        {contatos.length > 0 ? (
                            <ul className="divide-y divide-border">
                                {contatos.map((contato) => (
                                    <li key={contato.id} className="py-3 first:pt-0 last:pb-0">
                                        <div className="flex min-w-0 items-center justify-between gap-3">
                                            <Link
                                                href={`/contatos/${contato.id}/historico`}
                                                className="truncate text-sm font-medium text-foreground transition-colors hover:text-terracota focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                                            >
                                                {contato.nome?.trim() || contato.psid}
                                            </Link>
                                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                                {contato.mensagens_count} {contato.mensagens_count === 1 ? 'mensagem' : 'mensagens'}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EstadoVazio>Não há contatos cadastrados.</EstadoVazio>
                        )}
                    </section>

                    <section className={panelClasses}>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold text-foreground">Mensagens recentes</h2>
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                                {mensagens.length}
                            </span>
                        </div>
                        {mensagens.length > 0 ? (
                            <ul className="divide-y divide-border">
                                {mensagens.map((mensagem) => {
                                    const nome = mensagem.contato?.nome?.trim() || mensagem.contato?.psid;

                                    return (
                                        <li key={mensagem.id} className="min-w-0 py-3 first:pt-0 last:pb-0">
                                            <div className="flex items-baseline gap-2 text-xs">
                                                <span className={mensagem.direcao === 'enviada' ? 'font-medium text-terracota-escuro' : 'font-medium text-muted-foreground'}>
                                                    {mensagem.direcao === 'enviada' ? 'Enviada' : 'Recebida'}
                                                </span>
                                                {nome && <span className="truncate text-muted-foreground">para {nome}</span>}
                                            </div>
                                            <p className="mt-1 break-words text-sm leading-5 text-foreground">{mensagem.texto}</p>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <EstadoVazio>Não há mensagens registradas.</EstadoVazio>
                        )}
                    </section>

                    <section className={panelClasses}>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold text-foreground">Atividade</h2>
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                                {logs.length}
                            </span>
                        </div>
                        {logs.length > 0 ? (
                            <ul className="divide-y divide-border">
                                {logs.map((log) => (
                                    <li key={log.id} className="min-w-0 py-3 first:pt-0 last:pb-0">
                                        <p className="break-words text-sm font-medium text-foreground">{log.evento}</p>
                                        <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{log.descricao}</p>
                                        {log.created_at && (
                                            <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                                                {new Date(log.created_at).toLocaleString('pt-BR')}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EstadoVazio>Não há atividade registrada.</EstadoVazio>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

function EstadoVazio({ children }) {
    return (
        <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
            {children}
        </div>
    );
}

function FormularioExecucaoManual({ contatos, fluxos }) {
    const form = useForm({ contato_id: '', fluxo_id: '' });

    const executar = (evento) => {
        evento.preventDefault();
        form.transform((dados) => ({
            contato_id: Number(dados.contato_id),
            fluxo_id: Number(dados.fluxo_id),
        }));
        form.post('/execucoes/manuais', {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <form onSubmit={executar} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Contato
                <select
                    value={form.data.contato_id}
                    onChange={(evento) => {
                        form.setData('contato_id', evento.target.value);
                        form.clearErrors('contato_id');
                    }}
                    className={selectClasses}
                    aria-invalid={Boolean(form.errors.contato_id)}
                    required
                >
                    <option value="">Selecione um contato</option>
                    {contatos.map((contato) => (
                        <option key={contato.id} value={contato.id}>
                        {contato.nome?.trim() || contato.psid}
                    </option>
                    ))}
                </select>
                {form.errors.contato_id && <span role="alert" className="text-xs text-destructive">{form.errors.contato_id}</span>}
            </label>

            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Fluxo
                <select
                    value={form.data.fluxo_id}
                    onChange={(evento) => {
                        form.setData('fluxo_id', evento.target.value);
                        form.clearErrors('fluxo_id');
                    }}
                    className={selectClasses}
                    aria-invalid={Boolean(form.errors.fluxo_id)}
                    required
                >
                    <option value="">Selecione um fluxo</option>
                    {fluxos.map((fluxo) => (
                        <option key={fluxo.id} value={fluxo.id}>
                            {fluxo.nome}
                        </option>
                    ))}
                </select>
                {form.errors.fluxo_id && <span role="alert" className="text-xs text-destructive">{form.errors.fluxo_id}</span>}
            </label>

            <Button type="submit" disabled={form.processing} className="h-10 w-full sm:col-span-2 lg:col-span-1 lg:w-auto">
                {form.processing ? <LoaderCircle className="animate-spin" /> : null}
                {form.processing ? 'Executando…' : 'Executar agora'}
            </Button>
        </form>
    );
}
