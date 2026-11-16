import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    Check,
    Circle,
    Clock3,
    FileText,
    LoaderCircle,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
    Workflow,
    X,
} from 'lucide-react';
import { ModalFlowChat } from '@/components/ModalFlowChat';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const gatilhosConhecidos = {
    novo_contato: 'Novo contato',
    mensagem_recebida: 'Mensagem recebida',
};

const rotulosMidia = {
    imagem: 'Imagem',
    audio: 'Áudio',
    video: 'Vídeo',
    arquivo: 'Arquivo',
};

const filtros = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'ativos', rotulo: 'Ativos' },
    { valor: 'inativos', rotulo: 'Inativos' },
];

function formatarAtualizacao(valor) {
    if (!valor) {
        return '—';
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(data);
}

function estaAtivo(valor) {
    return valor === true || valor === 1 || valor === '1';
}

function obterGatilhosAtivos(fluxo) {
    return (fluxo.regras ?? [])
        .filter((regra) => estaAtivo(regra.ativo))
        .map((regra) => gatilhosConhecidos[regra.gatilho] ?? regra.gatilho);
}

function formatarQuantidade(quantidade, singular, plural) {
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

function MenuAcoesFluxo({ fluxo, aoVerDetalhes, aoExcluir }) {
    const contentor = useRef(null);
    const menuConteudo = useRef(null);
    const [aberto, setAberto] = useState(false);

    const fechar = () => {
        setAberto(false);
    };

    useEffect(() => {
        if (!aberto) {
            return undefined;
        }

        menuConteudo.current?.querySelector('[role="menuitem"]')?.focus();

        const fecharAoClicarFora = (evento) => {
            if (!contentor.current?.contains(evento.target)) {
                fechar();
            }
        };
        const fecharComEscape = (evento) => {
            if (evento.key === 'Escape') {
                fechar();
                contentor.current?.querySelector('button')?.focus();
            }
        };

        document.addEventListener('pointerdown', fecharAoClicarFora);
        document.addEventListener('keydown', fecharComEscape);

        return () => {
            document.removeEventListener('pointerdown', fecharAoClicarFora);
            document.removeEventListener('keydown', fecharComEscape);
        };
    }, [aberto]);

    return (
        <div ref={contentor} className="relative">
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Ações para ${fluxo.nome}`}
                aria-haspopup="menu"
                aria-expanded={aberto}
                title="Ações do fluxo"
                onClick={() => setAberto((estado) => !estado)}
                className="size-9 text-muted-foreground"
            >
                <MoreHorizontal className="size-5" />
            </Button>
            {aberto && (
                <div
                    ref={menuConteudo}
                    role="menu"
                    aria-label={`Ações para ${fluxo.nome}`}
                    onKeyDown={(evento) => {
                        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(evento.key)) {
                            return;
                        }

                        const itens = Array.from(evento.currentTarget.querySelectorAll('[role="menuitem"]'));
                        const indiceAtual = itens.indexOf(document.activeElement);
                        const indiceSeguinte = evento.key === 'Home'
                            ? 0
                            : evento.key === 'End'
                                ? itens.length - 1
                                : (indiceAtual + (evento.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length;

                        evento.preventDefault();
                        itens[indiceSeguinte]?.focus();
                    }}
                    onBlur={(evento) => {
                        if (!evento.currentTarget.contains(evento.relatedTarget)) {
                            fechar();
                        }
                    }}
                    className="absolute right-0 top-11 z-20 min-w-44 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
                >
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                        fechar();
                        aoVerDetalhes(fluxo);
                    }}
                    className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                    <FileText className="size-4 text-muted-foreground" />
                    Ver detalhes
                </button>
                <Link
                    href={`/fluxos/${fluxo.id}/editar`}
                    role="menuitem"
                    onClick={fechar}
                    className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                    <Pencil className="size-4 text-muted-foreground" />
                    Editar
                </Link>
                <div className="my-1 border-t border-border" />
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                        fechar();
                        aoExcluir(fluxo);
                    }}
                    className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
                >
                    <Trash2 className="size-4" />
                    Excluir
                </button>
                </div>
            )}
        </div>
    );
}

function CartaoFluxo({ fluxo, aoVerDetalhes, aoExcluir }) {
    const gatilhos = obterGatilhosAtivos(fluxo);
    const ativo = estaAtivo(fluxo.ativo);
    const etapas = fluxo.etapas ?? [];

    return (
        <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-ring/40 sm:p-5">
            <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                        <h2 className="min-w-0 break-words text-base font-semibold tracking-tight text-foreground">
                            {fluxo.nome}
                        </h2>
                        <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium ${ativo
                            ? 'bg-primary/10 text-terracota-escuro dark:text-foreground'
                            : 'bg-muted text-muted-foreground'}`}>
                            <span className={`size-1.5 rounded-full ${ativo ? 'bg-primary' : 'bg-muted-foreground/60'}`} />
                            {ativo ? 'Ativo' : 'Inativo'}
                        </span>
                    </div>
                </div>
                <MenuAcoesFluxo
                    fluxo={fluxo}
                    aoVerDetalhes={aoVerDetalhes}
                    aoExcluir={aoExcluir}
                />
            </div>

            <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(7rem,0.7fr)_minmax(7rem,0.7fr)]">
                <div className="min-w-0">
                    <dt className="text-[11px] font-medium text-muted-foreground">Início</dt>
                    <dd className="mt-1 flex min-w-0 flex-wrap gap-1.5">
                        {gatilhos.length > 0 ? gatilhos.map((gatilho) => (
                            <span key={gatilho} className="inline-flex min-h-6 items-center rounded-lg bg-muted px-2 text-xs text-foreground">
                                {gatilho}
                            </span>
                        )) : (
                            <span className="text-sm text-muted-foreground">Sem gatilho ativo</span>
                        )}
                    </dd>
                </div>
                <div>
                    <dt className="text-[11px] font-medium text-muted-foreground">Etapas</dt>
                    <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">{etapas.length}</dd>
                </div>
                <div>
                    <dt className="text-[11px] font-medium text-muted-foreground">Atualizado</dt>
                    <dd className="mt-1 text-sm tabular-nums text-foreground">{formatarAtualizacao(fluxo.updated_at)}</dd>
                </div>
            </dl>
        </article>
    );
}

function ModalDetalhesFluxo({ fluxo, onClose }) {
    const etapas = fluxo?.etapas ?? [];
    const gatilhos = fluxo ? obterGatilhosAtivos(fluxo) : [];

    return (
        <ModalFlowChat open={Boolean(fluxo)} onClose={onClose} labelledBy="detalhes-fluxo-titulo" className="max-w-2xl">
            {fluxo && (
                <div>
                    <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-terracota-escuro dark:text-muted-foreground">Detalhes do fluxo</p>
                            <h2 id="detalhes-fluxo-titulo" className="mt-1 break-words text-lg font-semibold text-foreground">
                                {fluxo.nome}
                            </h2>
                        </div>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Fechar detalhes" onClick={onClose}>
                            <X />
                        </Button>
                    </header>

                    <div className="space-y-5 p-5 sm:p-6">
                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Estado</dt>
                                <dd className="mt-1.5">
                                    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${estaAtivo(fluxo.ativo)
                                        ? 'bg-primary/10 text-terracota-escuro dark:text-foreground'
                                        : 'bg-muted text-muted-foreground'}`}>
                                        {estaAtivo(fluxo.ativo) ? 'Ativo' : 'Inativo'}
                                    </span>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Etapas</dt>
                                <dd className="mt-1.5 text-sm font-medium text-foreground">{etapas.length}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Última atualização</dt>
                                <dd className="mt-1.5 text-sm text-foreground">{formatarAtualizacao(fluxo.updated_at)}</dd>
                            </div>
                            <div className="sm:col-span-3">
                                <dt className="text-xs font-medium text-muted-foreground">Gatilhos de início ativos</dt>
                                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                                    {gatilhos.length > 0 ? gatilhos.map((gatilho) => (
                                        <span key={gatilho} className="inline-flex min-h-7 items-center rounded-lg border border-border bg-background px-2.5 text-xs text-foreground">
                                            {gatilho}
                                        </span>
                                    )) : <span className="text-sm text-muted-foreground">Nenhum gatilho ativo</span>}
                                </dd>
                            </div>
                        </dl>

                        <section>
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold text-foreground">Etapas do fluxo</h3>
                                <span className="text-xs text-muted-foreground">Texto e mídia</span>
                            </div>
                            {etapas.length > 0 ? (
                                <ol className="space-y-2">
                                    {etapas.map((etapa, indice) => (
                                        <li key={etapa.id ?? indice} className="rounded-xl border border-border bg-background p-3.5">
                                            <div className="flex items-start gap-3">
                                                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-medium tabular-nums text-muted-foreground">
                                                    {indice + 1}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                                                        {etapa.tipo === 'condicao_horario'
                                                            ? 'Condição por horário · caminhos definidos no editor'
                                                            : etapa.tipo_conteudo && etapa.tipo_conteudo !== 'texto'
                                                                ? `Mídia (${rotulosMidia[etapa.tipo_conteudo] ?? etapa.tipo_conteudo})${etapa.anexo_nome_original ? ` · ${etapa.anexo_nome_original}` : ''}`
                                                                : etapa.texto}
                                                    </p>
                                                    {etapa.tipo !== 'condicao_horario' && indice < etapas.length - 1 && Number(etapa.pausa_segundos) > 0 && (
                                                        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Clock3 className="size-3.5" />
                                                            Pausa de {etapa.pausa_segundos} s antes da próxima etapa
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
                                    Nenhuma etapa configurada.
                                </p>
                            )}
                        </section>
                    </div>

                    <footer className="flex justify-end border-t border-border px-5 py-4 sm:px-6">
                        <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
                    </footer>
                </div>
            )}
        </ModalFlowChat>
    );
}

function ModalExcluirFluxo({ fluxo, carregando, onClose, onConfirmar }) {
    const execucoes = Number(fluxo?.execucoes_count ?? 0);
    const agendamentos = Number(fluxo?.agendamentos_count ?? 0);
    const temRegistrosRelacionados = execucoes > 0 || agendamentos > 0;

    return (
        <ModalFlowChat open={Boolean(fluxo)} onClose={onClose} labelledBy="excluir-fluxo-titulo" className="max-w-lg">
            {fluxo && (
                <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                            <Trash2 className="size-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 id="excluir-fluxo-titulo" className="text-base font-semibold text-foreground">Excluir fluxo?</h2>
                            <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                                O fluxo <strong className="font-semibold text-foreground">{fluxo.nome}</strong> será excluído.
                                As etapas e os gatilhos que pertencem a ele também serão removidos.
                            </p>
                        </div>
                    </div>

                    {temRegistrosRelacionados && (
                        <div role="alert" className="mt-4 rounded-xl border border-border bg-muted p-3.5 text-sm leading-6 text-foreground">
                            <p>Para preservar o histórico, a exclusão está bloqueada enquanto existirem estes registros:</p>
                            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                                {execucoes > 0 && <li>{formatarQuantidade(execucoes, 'execução', 'execuções')} vinculadas</li>}
                                {agendamentos > 0 && <li>{formatarQuantidade(agendamentos, 'agendamento', 'agendamentos')} vinculados</li>}
                            </ul>
                        </div>
                    )}

                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" onClick={onClose} disabled={carregando} className="h-10">
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => onConfirmar(fluxo)}
                            disabled={carregando || temRegistrosRelacionados}
                            className="h-10"
                        >
                            {carregando && <LoaderCircle className="animate-spin" />}
                            {carregando ? 'Excluindo…' : 'Excluir fluxo'}
                        </Button>
                    </div>
                </div>
            )}
        </ModalFlowChat>
    );
}

export default function Fluxos({ fluxos = [] }) {
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState('todos');
    const [fluxoDetalhe, setFluxoDetalhe] = useState(null);
    const [fluxoParaExcluir, setFluxoParaExcluir] = useState(null);
    const [excluindoId, setExcluindoId] = useState(null);
    const fluxoParaExcluirAtual = fluxoParaExcluir
        ? fluxos.find((fluxo) => fluxo.id === fluxoParaExcluir.id) ?? fluxoParaExcluir
        : null;

    const totalAtivos = fluxos.filter((fluxo) => estaAtivo(fluxo.ativo)).length;
    const totalInativos = fluxos.length - totalAtivos;

    const fluxosFiltrados = useMemo(() => {
        const termo = busca.trim().toLocaleLowerCase('pt-BR');

        return fluxos.filter((fluxo) => {
            const correspondeNome = !termo || fluxo.nome.toLocaleLowerCase('pt-BR').includes(termo);
            const correspondeEstado = filtro === 'todos'
                || (filtro === 'ativos' && estaAtivo(fluxo.ativo))
                || (filtro === 'inativos' && !estaAtivo(fluxo.ativo));

            return correspondeNome && correspondeEstado;
        });
    }, [busca, filtro, fluxos]);

    const excluirFluxo = (fluxo) => {
        router.delete(`/fluxos/${fluxo.id}`, {
            preserveScroll: true,
            onStart: () => setExcluindoId(fluxo.id),
            onSuccess: () => {
                setFluxoParaExcluir(null);
                toast.success('Fluxo excluído', {
                    description: `“${fluxo.nome}” foi removido.`,
                });
            },
            onError: (erros) => {
                toast.error('Não foi possível excluir o fluxo', {
                    description: erros.exclusao ?? 'Os registros vinculados foram preservados.',
                });
            },
            onHttpException: () => {
                toast.error('Não foi possível excluir o fluxo', {
                    description: 'O servidor não confirmou a operação. Atualize a lista antes de tentar novamente.',
                });
            },
            onNetworkError: () => {
                toast.error('Não foi possível excluir o fluxo', {
                    description: 'Verifica a ligação e tenta novamente.',
                });
            },
            onFinish: () => setExcluindoId(null),
        });
    };

    return (
        <div className="min-h-full w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
                <PageHeader
                    eyebrow="Automação"
                    title="Fluxos"
                    description="Crie, organize e gerencie as suas automações do Messenger."
                    actions={(
                        <Button asChild className="h-10">
                            <Link href="/fluxos/criar">
                                <Plus />
                                Novo fluxo
                            </Link>
                        </Button>
                    )}
                />

                <section aria-label="Resumo dos fluxos" className="mb-5 grid gap-3 sm:grid-cols-3">
                    <IndicadorFluxo rotulo="Total de fluxos" valor={fluxos.length} icone={Workflow} />
                    <IndicadorFluxo rotulo="Ativos" valor={totalAtivos} icone={Check} />
                    <IndicadorFluxo rotulo="Inativos" valor={totalInativos} icone={Circle} />
                </section>

                <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            value={busca}
                            onChange={(evento) => setBusca(evento.target.value)}
                            placeholder="Pesquisar por nome"
                            aria-label="Pesquisar fluxos por nome"
                            className="h-10 bg-background pl-9 text-sm"
                        />
                    </div>

                    <div role="group" aria-label="Filtrar fluxos por estado" className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
                        {filtros.map((opcao) => (
                            <Button
                                key={opcao.valor}
                                type="button"
                                variant="ghost"
                                size="sm"
                                aria-pressed={filtro === opcao.valor}
                                onClick={() => setFiltro(opcao.valor)}
                                className={`h-8 px-3 ${filtro === opcao.valor
                                    ? 'bg-card text-foreground shadow-xs hover:bg-card'
                                    : 'text-muted-foreground'}`}
                            >
                                {opcao.rotulo}
                            </Button>
                        ))}
                    </div>
                </section>

                {fluxosFiltrados.length > 0 ? (
                    <div className="grid min-w-0 gap-3 xl:grid-cols-2">
                        {fluxosFiltrados.map((fluxo) => (
                            <CartaoFluxo
                                key={fluxo.id}
                                fluxo={fluxo}
                                aoVerDetalhes={setFluxoDetalhe}
                                aoExcluir={setFluxoParaExcluir}
                            />
                        ))}
                    </div>
                ) : (
                    <EstadoVazioFluxos
                        temFluxos={fluxos.length > 0}
                        onLimpar={() => {
                            setBusca('');
                            setFiltro('todos');
                        }}
                    />
                )}
            </div>

            <ModalDetalhesFluxo fluxo={fluxoDetalhe} onClose={() => setFluxoDetalhe(null)} />
            <ModalExcluirFluxo
                fluxo={fluxoParaExcluirAtual}
                carregando={Boolean(excluindoId)}
                onClose={() => setFluxoParaExcluir(null)}
                onConfirmar={excluirFluxo}
            />
        </div>
    );
}

function IndicadorFluxo({ rotulo, valor, icone: Icone }) {
    return (
        <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-terracota/10 text-terracota">
                <Icone className="size-[18px]" />
            </div>
            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground">{rotulo}</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{valor}</p>
            </div>
        </article>
    );
}

function EstadoVazioFluxos({ temFluxos, onLimpar }) {
    return (
        <section className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-terracota/10 text-terracota">
                {temFluxos ? <Search className="size-5" /> : <Workflow className="size-5" />}
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">
                {temFluxos ? 'Nenhum fluxo encontrado' : 'Ainda não existem fluxos'}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                {temFluxos
                    ? 'Altera a pesquisa ou o filtro para voltar a ver os fluxos.'
                    : 'Crie o primeiro fluxo para começar a organizar a sua automação.'}
            </p>
            {temFluxos ? (
                <Button type="button" variant="outline" onClick={onLimpar} className="mt-5 h-10">
                    Limpar pesquisa e filtros
                </Button>
            ) : (
                <Button asChild className="mt-5 h-10">
                    <Link href="/fluxos/criar">
                        <Plus />
                        Criar primeiro fluxo
                    </Link>
                </Button>
            )}
        </section>
    );
}
