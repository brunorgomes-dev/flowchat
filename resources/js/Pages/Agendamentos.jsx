import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';

const fieldClasses = 'h-10 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';
const estilosEstado = {
    pendente: 'border border-areia/70 bg-areia/20 text-foreground',
    executado: 'border border-primary/20 bg-primary/10 text-terracota-escuro',
    cancelado: 'border border-border bg-muted text-muted-foreground',
    falhou: 'border border-destructive/20 bg-destructive/10 text-destructive',
};
const nomesEstado = {
    pendente: 'Pendente',
    executado: 'Executado',
    cancelado: 'Cancelado',
    falhou: 'Falhou',
};

function formatarDataHora(valor) {
    if (!valor) {
        return null;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(data);
}

export default function Agendamentos({ fluxos, contatos, agendamentos }) {
    const [agendamentoCancelandoId, setAgendamentoCancelandoId] = useState(null);
    const form = useForm({ fluxo_id: '', contato_id: '', executar_em: '' });

    const criar = (evento) => {
        evento.preventDefault();
        form.post('/agendamentos', {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    const cancelar = (agendamento) => {
        router.post(`/agendamentos/${agendamento.id}/cancelar`, {}, {
            preserveScroll: true,
            onStart: () => setAgendamentoCancelandoId(agendamento.id),
            onFinish: () => setAgendamentoCancelandoId(null),
        });
    };

    return (
        <div className="min-h-full w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
                <PageHeader
                    eyebrow="Automação"
                    title="Agendamentos"
                    description="Programe execuções e acompanhe os agendamentos já registrados."
                />

                <form onSubmit={criar} className="grid items-end gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                        Fluxo
                        <select
                            value={form.data.fluxo_id}
                            onChange={(evento) => {
                                form.setData('fluxo_id', evento.target.value);
                                form.clearErrors('fluxo_id');
                            }}
                            className={fieldClasses}
                            aria-invalid={Boolean(form.errors.fluxo_id)}
                            required
                        >
                            <option value="">Selecione um fluxo</option>
                            {fluxos.map((fluxo) => (
                                <option key={fluxo.id} value={fluxo.id}>{fluxo.nome}</option>
                            ))}
                        </select>
                        {form.errors.fluxo_id && <span role="alert" className="text-xs text-destructive">{form.errors.fluxo_id}</span>}
                    </label>
                    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                        Contato
                        <select
                            value={form.data.contato_id}
                            onChange={(evento) => {
                                form.setData('contato_id', evento.target.value);
                                form.clearErrors('contato_id');
                            }}
                            className={fieldClasses}
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
                        Data e horário
                        <input
                            type="datetime-local"
                            value={form.data.executar_em}
                            onChange={(evento) => {
                                form.setData('executar_em', evento.target.value);
                                form.clearErrors('executar_em');
                            }}
                            className={fieldClasses}
                            aria-invalid={Boolean(form.errors.executar_em)}
                            required
                        />
                        {form.errors.executar_em && <span role="alert" className="text-xs text-destructive">{form.errors.executar_em}</span>}
                    </label>
                    <Button type="submit" disabled={form.processing} className="h-10 w-full xl:w-auto">
                        {form.processing && <LoaderCircle className="animate-spin" />}
                        {form.processing ? 'Agendando…' : 'Agendar'}
                    </Button>
                </form>

                <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">Agendamentos registrados</h2>
                            <p className="mt-1 text-xs text-muted-foreground">{agendamentos.length} itens</p>
                        </div>
                    </div>

                    {agendamentos.length > 0 ? (
                        <ul className="space-y-3">
                            {agendamentos.map((agendamento) => {
                                const contato = agendamento.contato?.nome?.trim()
                                    || agendamento.contato?.psid
                                    || '—';
                                const horario = formatarDataHora(agendamento.executar_em);

                                return (
                                    <li key={agendamento.id}>
                                        <article className="grid min-w-0 gap-4 rounded-xl border border-border bg-background p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-medium text-muted-foreground">Fluxo</p>
                                                    <p className="mt-1 truncate text-sm font-medium text-foreground">{agendamento.fluxo?.nome || '—'}</p>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-medium text-muted-foreground">Contato</p>
                                                    <p className="mt-1 truncate text-sm text-foreground">{contato}</p>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-medium text-muted-foreground">Data e horário</p>
                                                    <p className="mt-1 text-sm tabular-nums text-foreground">{horario || '—'}</p>
                                                </div>
                                                <div className="flex flex-col items-start gap-1">
                                                    <p className="text-[11px] font-medium text-muted-foreground">Estado</p>
                                                    <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-medium ${estilosEstado[agendamento.estado] ?? 'border border-border bg-muted text-muted-foreground'}`}>
                                                        {nomesEstado[agendamento.estado] ?? agendamento.estado}
                                                    </span>
                                                </div>
                                            </div>
                                            {agendamento.estado === 'pendente' && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => cancelar(agendamento)}
                                                    disabled={agendamentoCancelandoId !== null}
                                                    className="h-9 w-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                                                >
                                                    {agendamentoCancelandoId === agendamento.id && <LoaderCircle className="animate-spin" />}
                                                    {agendamentoCancelandoId === agendamento.id ? 'Cancelando…' : 'Cancelar'}
                                                </Button>
                                            )}
                                        </article>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center">
                            <p className="text-sm font-medium text-foreground">Nenhum agendamento ainda</p>
                            <p className="mt-1 text-xs text-muted-foreground">Os novos agendamentos aparecerão nesta lista.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
