import { router, useForm } from '@inertiajs/react';
import { LoaderCircle, RotateCcw, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ModalFlowChat } from '@/components/ModalFlowChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/PageHeader';

const selectClasses = 'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20';

function dataLocal(data) {
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(data));
}

export default function AdminConvites({ contas, administradores }) {
    const [contaSelecionada, setContaSelecionada] = useState(null);
    const [acaoConta, setAcaoConta] = useState(null);
    const formConta = useForm({ motivo: '', administrador_responsavel_id: '' });

    const listaContas = contas?.data ?? [];
    const listaAdministradores = administradores ?? [];

    const abrirAcao = (conta, acao) => {
        setContaSelecionada(conta);
        setAcaoConta(acao);
        formConta.setData({
            motivo: '',
            administrador_responsavel_id: conta.administrador_responsavel?.id
                ? String(conta.administrador_responsavel.id)
                : '',
        });
        formConta.clearErrors();
    };

    const fecharAcao = () => {
        setAcaoConta(null);
        setContaSelecionada(null);
        formConta.reset();
        formConta.clearErrors();
    };

    const confirmarAcao = (evento) => {
        evento.preventDefault();

        if (!contaSelecionada || !acaoConta) {
            return;
        }

        if (acaoConta === 'suspender' && !formConta.data.motivo.trim()) {
            formConta.setError('motivo', 'Informe o motivo da suspensão.');
            return;
        }

        const url = acaoConta === 'suspender'
            ? `/admin/contas/${contaSelecionada.id}/suspender`
            : `/admin/contas/${contaSelecionada.id}/reativar`;

        formConta.post(url, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(acaoConta === 'suspender' ? 'Conta suspensa' : 'Conta reativada');
                fecharAcao();
            },
            onError: () => toast.error('Não foi possível concluir a ação.'),
        });
    };

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
            <PageHeader titulo="Contas ativas" descricao="Gerencie o estado das contas de clientes." />

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">Contas de clientes</h2>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Suspenda ou reative o acesso de uma conta sem excluir seus dados.</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{contas?.total ?? 0} conta(s)</span>
                </div>

                {listaContas.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {listaContas.map((conta) => (
                            <li key={conta.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-medium text-foreground">{conta.nome}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${conta.estado === 'suspensa' ? 'bg-destructive/10 text-destructive' : 'bg-terracota/10 text-terracota-escuro dark:text-foreground'}`}>
                                            {conta.estado === 'suspensa' ? 'Suspensa' : 'Ativa'}
                                        </span>
                                    </div>
                                    <p className="mt-1 truncate text-xs text-muted-foreground">{conta.email ?? 'Sem email vinculado'}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Criada em: {dataLocal(conta.criado_em)}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Último acesso: {conta.ultimo_acesso ? dataLocal(conta.ultimo_acesso) : 'Nunca acessou'}
                                    </p>
                                    {conta.estado === 'suspensa' && conta.motivo_suspensao && (
                                        <p className="mt-1 text-xs text-muted-foreground">Motivo: {conta.motivo_suspensao}</p>
                                    )}
                                    {conta.administrador_responsavel && (
                                        <p className="mt-1 text-xs text-muted-foreground">Responsável: {conta.administrador_responsavel.name}</p>
                                    )}
                                </div>
                                {conta.estado === 'suspensa' ? (
                                    <Button type="button" variant="outline" size="sm" onClick={() => abrirAcao(conta, 'reativar')}>
                                        <RotateCcw />
                                        Reativar conta
                                    </Button>
                                ) : (
                                    <Button type="button" variant="outline" size="sm" onClick={() => abrirAcao(conta, 'suspender')}>
                                        <ShieldOff />
                                        Suspender conta
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {(contas?.last_page ?? 1) > 1 && (
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 sm:flex-row">
                        <p className="text-xs text-muted-foreground">
                            Página {contas.current_page} de {contas.last_page} · {contas.total} conta(s)
                        </p>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!contas.prev_page_url}
                                onClick={() => router.get(contas.prev_page_url, {}, { preserveState: true, preserveScroll: true })}
                            >
                                Anterior
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!contas.next_page_url}
                                onClick={() => router.get(contas.next_page_url, {}, { preserveState: true, preserveScroll: true })}
                            >
                                Próxima
                            </Button>
                        </div>
                    </div>
                )}
            </section>

            <ModalFlowChat
                open={Boolean(acaoConta && contaSelecionada)}
                onClose={fecharAcao}
                labelledBy="conta-acao-titulo"
                className="max-w-lg"
            >
                <form onSubmit={confirmarAcao} className="p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${acaoConta === 'suspender' ? 'bg-destructive/10 text-destructive' : 'bg-terracota/10 text-terracota'}`}>
                            {acaoConta === 'suspender'
                                ? <ShieldOff className="size-5" strokeWidth={1.8} aria-hidden="true" />
                                : <RotateCcw className="size-5" strokeWidth={1.8} aria-hidden="true" />}
                        </div>
                        <div className="min-w-0">
                            <h2 id="conta-acao-titulo" className="text-base font-semibold text-foreground">
                                {acaoConta === 'suspender' ? 'Suspender conta' : 'Reativar conta'}
                            </h2>
                            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                                {acaoConta === 'suspender'
                                    ? 'O acesso e as automações desta conta serão interrompidos imediatamente.'
                                    : 'O acesso desta conta será restaurado. Os dados preservados continuam disponíveis.'}
                            </p>
                        </div>
                    </div>

                    {contaSelecionada && (
                        <div className="mt-4 rounded-xl border border-border bg-background px-3.5 py-3">
                            <p className="text-sm font-medium text-foreground">{contaSelecionada.nome}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{contaSelecionada.email ?? 'Sem email vinculado'}</p>
                            {acaoConta === 'reativar' && contaSelecionada.motivo_suspensao && (
                                <p className="mt-2 text-xs leading-5 text-muted-foreground">Motivo registrado: {contaSelecionada.motivo_suspensao}</p>
                            )}
                        </div>
                    )}

                    {acaoConta === 'suspender' && (
                        <label className="mt-4 flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                            Motivo da suspensão
                            <Textarea
                                value={formConta.data.motivo}
                                onChange={(evento) => {
                                    formConta.setData('motivo', evento.target.value);
                                    formConta.clearErrors('motivo');
                                }}
                                rows={3}
                                maxLength={1000}
                                required
                                aria-invalid={Boolean(formConta.errors.motivo)}
                                className="mt-1.5 bg-background text-sm text-foreground"
                            />
                            {formConta.errors.motivo && <span role="alert" className="text-xs text-destructive">{formConta.errors.motivo}</span>}
                        </label>
                    )}

                    <label className="mt-4 flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                        Administrador responsável (opcional)
                        <select
                            value={formConta.data.administrador_responsavel_id}
                            onChange={(evento) => {
                                formConta.setData('administrador_responsavel_id', evento.target.value);
                                formConta.clearErrors('administrador_responsavel_id');
                            }}
                            className={`${selectClasses} mt-1.5`}
                            aria-invalid={Boolean(formConta.errors.administrador_responsavel_id)}
                        >
                            <option value="">Sem responsável definido</option>
                            {listaAdministradores.map((administrador) => (
                                <option key={administrador.id} value={administrador.id}>
                                    {administrador.name} — {administrador.email}
                                </option>
                            ))}
                        </select>
                        <span className="text-[11px] font-normal leading-5 text-muted-foreground">Usado apenas para acompanhamento. O responsável pela ação é registrado automaticamente.</span>
                        {formConta.errors.administrador_responsavel_id && <span role="alert" className="text-xs text-destructive">{formConta.errors.administrador_responsavel_id}</span>}
                    </label>

                    {formConta.errors.conta && <p role="alert" className="mt-3 text-xs text-destructive">{formConta.errors.conta}</p>}

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        <Button type="button" variant="ghost" onClick={fecharAcao} disabled={formConta.processing} className="h-10 text-muted-foreground hover:text-foreground">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={formConta.processing} className={`h-10 ${acaoConta === 'suspender' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}`}>
                            {formConta.processing && <LoaderCircle className="animate-spin" />}
                            {formConta.processing
                                ? 'Processando…'
                                : acaoConta === 'suspender' ? 'Suspender conta' : 'Reativar conta'}
                        </Button>
                    </div>
                </form>
            </ModalFlowChat>
        </div>
    );
}
