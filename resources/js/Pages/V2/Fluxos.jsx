import { useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Circle,
    Clock3,
    FileText,
    Keyboard,
    PauseCircle,
    Plus,
    Search,
    Split,
    Trash2,
    Workflow,
} from 'lucide-react';
import { toast } from 'sonner';
import LayoutV2 from '@/components/v2/LayoutV2';
import { Aviso, CabecalhoPagina, Chip, Dialogo, Metrica, Secao, Vazio } from '@/components/v2/pecas';
import { formatarData, rotuloMidia } from '@/components/v2/formato';

const filtros = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'ativos', rotulo: 'Ativos' },
    { valor: 'inativos', rotulo: 'Inativos' },
];

const rotulosGatilho = {
    novo_contato: 'Novo contato',
    mensagem_recebida: 'Mensagem recebida',
};

function estaAtivo(valor) {
    return valor === true || valor === 1 || valor === '1';
}

function descreverEtapa(etapa) {
    if (etapa.tipo === 'condicao_horario') {
        return 'Condição por horário';
    }

    if (etapa.tipo_conteudo && etapa.tipo_conteudo !== 'texto') {
        return `Mídia · ${rotuloMidia(etapa.tipo_conteudo)}`;
    }

    return etapa.texto?.trim() || 'Mensagem sem texto';
}

export default function Fluxos({ fluxos = [] }) {
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState('todos');
    const [detalhe, setDetalhe] = useState(null);
    const [paraExcluir, setParaExcluir] = useState(null);
    const [excluindo, setExcluindo] = useState(false);

    const totalAtivos = fluxos.filter((fluxo) => estaAtivo(fluxo.ativo)).length;

    const filtrados = useMemo(() => {
        const termo = busca.trim().toLocaleLowerCase('pt-BR');

        return fluxos.filter((fluxo) => {
            const combinaNome = !termo || fluxo.nome.toLocaleLowerCase('pt-BR').includes(termo);
            const combinaEstado = filtro === 'todos'
                || (filtro === 'ativos' && estaAtivo(fluxo.ativo))
                || (filtro === 'inativos' && !estaAtivo(fluxo.ativo));

            return combinaNome && combinaEstado;
        });
    }, [busca, filtro, fluxos]);

    const excluirBloqueado = Boolean(
        paraExcluir && (Number(paraExcluir.execucoes_count) > 0 || Number(paraExcluir.agendamentos_count) > 0),
    );

    const excluir = () => {
        if (!paraExcluir || excluirBloqueado) {
            return;
        }

        router.delete(`/fluxos/${paraExcluir.id}`, {
            preserveScroll: true,
            onStart: () => setExcluindo(true),
            onSuccess: () => {
                setParaExcluir(null);
                toast.success('Fluxo excluído');
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
            onFinish: () => setExcluindo(false),
        });
    };

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Fluxos"
                descricao="Estado, gatilhos, etapas e uso de cada automação do Messenger."
                acoes={
                    <>
                        <Link href="/fluxos/criar" className="v2-btn v2-btn--primario">
                            <Plus aria-hidden="true" />
                            Novo fluxo
                        </Link>
                        <Link href="/agendamentos" className="v2-btn v2-btn--contorno">
                            Agendamentos
                        </Link>
                    </>
                }
            />

            <div className="v2-metricas mt-4">
                <Metrica rotulo="Total de fluxos" valor={fluxos.length} unidade="fluxos" />
                <Metrica rotulo="Ativos" valor={totalAtivos} unidade="em produção" />
                <Metrica rotulo="Inativos" valor={fluxos.length - totalAtivos} unidade="rascunhos" />
                <Metrica
                    rotulo="Execuções registradas"
                    valor={fluxos.reduce((total, fluxo) => total + Number(fluxo.execucoes_count ?? 0), 0)}
                    unidade="execuções"
                />
            </div>

            <div className="v2-barra mt-4">
                <div className="relative min-w-[12rem] flex-1">
                    <Search
                        className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--v2-ink-3)]"
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        value={busca}
                        onChange={(evento) => setBusca(evento.target.value)}
                        placeholder="Pesquisar por nome"
                        aria-label="Pesquisar fluxos por nome"
                        className="v2-entrada v2-entrada--icone"
                    />
                </div>
                <div className="v2-segmentado" role="group" aria-label="Filtrar fluxos por estado">
                    {filtros.map((opcao) => (
                        <button key={opcao.valor} type="button" aria-pressed={filtro === opcao.valor} onClick={() => setFiltro(opcao.valor)}>
                            {opcao.rotulo}
                        </button>
                    ))}
                </div>
                <span className="v2-micro v2-numerico">{filtrados.length} de {fluxos.length}</span>
            </div>

            {filtrados.length === 0 ? (
                <div className="mt-4">
                    <Vazio
                        icone={Workflow}
                        titulo={fluxos.length === 0 ? 'Ainda não existem fluxos' : 'Nenhum fluxo encontrado'}
                        texto={fluxos.length === 0
                            ? 'Crie o primeiro fluxo para começar a organizar a automação.'
                            : 'Ajuste o termo ou volte para todos os estados.'}
                        acao={fluxos.length === 0 ? (
                            <Link href="/fluxos/criar" className="v2-btn v2-btn--primario v2-btn--pequeno">
                                <Plus aria-hidden="true" />
                                Criar primeiro fluxo
                            </Link>
                        ) : (
                            <button
                                type="button"
                                className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                onClick={() => {
                                    setBusca('');
                                    setFiltro('todos');
                                }}
                            >
                                Limpar pesquisa e filtros
                            </button>
                        )}
                    />
                </div>
            ) : (
                <div className="v2-tabela-area mt-4">
                    <table className="v2-tabela">
                        <thead>
                            <tr>
                                <th scope="col">Fluxo</th>
                                <th scope="col">Estado</th>
                                <th scope="col">Gatilhos</th>
                                <th scope="col" className="text-right">Etapas</th>
                                <th scope="col" className="text-right">Execuções</th>
                                <th scope="col" className="text-right">Agendamentos</th>
                                <th scope="col">
                                    <span className="v2-oculto-visual">Ações</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.map((fluxo) => {
                                const etapas = fluxo.etapas ?? [];
                                const gatilhosAtivos = (fluxo.regras ?? []).filter((regra) => estaAtivo(regra.ativo));

                                return (
                                    <tr key={fluxo.id}>
                                        <th scope="row" className="text-left">
                                            <span className="v2-tabela__principal">{fluxo.nome}</span>
                                            <span className="v2-tabela__secundario">
                                                Atualizado em {formatarData(fluxo.updated_at)}
                                                {estaAtivo(fluxo.horario_inicio_ativo)
                                                    ? ` · janela ${fluxo.horario_inicio}–${fluxo.horario_fim}`
                                                    : ' · sem janela de horário'}
                                            </span>
                                        </th>
                                        <td>
                                            <Chip tom={estaAtivo(fluxo.ativo) ? 'positivo' : 'neutro'}>
                                                <span className="v2-ponto" aria-hidden="true" />
                                                {estaAtivo(fluxo.ativo) ? 'Ativo' : 'Inativo'}
                                            </Chip>
                                        </td>
                                        <td>
                                            <span className="flex flex-wrap gap-1">
                                                {gatilhosAtivos.length === 0 ? (
                                                    <span className="text-[var(--v2-ink-2)]">Sem gatilho ativo</span>
                                                ) : gatilhosAtivos.map((regra) => (
                                                    <Chip key={regra.gatilho}>{rotulosGatilho[regra.gatilho] ?? regra.gatilho}</Chip>
                                                ))}
                                            </span>
                                        </td>
                                        <td className="v2-numerico text-right">{etapas.length}</td>
                                        <td className="v2-numerico text-right">{fluxo.execucoes_count ?? 0}</td>
                                        <td className="v2-numerico text-right">{fluxo.agendamentos_count ?? 0}</td>
                                        <td>
                                            <div className="v2-tabela__acoes">
                                                <button type="button" className="v2-btn v2-btn--fantasma v2-btn--pequeno" onClick={() => setDetalhe(fluxo)}>
                                                    Detalhes
                                                </button>
                                                <Link href={`/fluxos/${fluxo.id}/editar`} className="v2-btn v2-btn--fantasma v2-btn--pequeno">
                                                    Editar
                                                </Link>
                                                <button
                                                    type="button"
                                                    className="v2-btn v2-btn--fantasma v2-btn--pequeno text-[var(--v2-perigo)]"
                                                    onClick={() => setParaExcluir(fluxo)}
                                                    aria-label={`Excluir ${fluxo.nome}`}
                                                >
                                                    <Trash2 aria-hidden="true" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Secao id="fluxos-regras" titulo="Regras da lista">
                <div className="grid gap-3 md:grid-cols-3">
                    <div className="v2-painel v2-painel__corpo">
                        <p className="flex items-center gap-2 text-[0.8125rem] font-medium">
                            <Circle className="size-3.5 text-[var(--v2-ink-3)]" aria-hidden="true" />
                            Estado do fluxo
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--v2-ink-2)]">
                            Só fluxos ativos iniciam automaticamente. Rascunhos continuam disponíveis para edição.
                        </p>
                    </div>
                    <div className="v2-painel v2-painel__corpo">
                        <p className="flex items-center gap-2 text-[0.8125rem] font-medium">
                            <Keyboard className="size-3.5 text-[var(--v2-ink-3)]" aria-hidden="true" />
                            Exclusão preservada
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--v2-ink-2)]">
                            Fluxos com execuções ou agendamentos não são excluídos: o motivo aparece antes da confirmação.
                        </p>
                    </div>
                    <div className="v2-painel v2-painel__corpo">
                        <p className="flex items-center gap-2 text-[0.8125rem] font-medium">
                            <Clock3 className="size-3.5 text-[var(--v2-ink-3)]" aria-hidden="true" />
                            Janela de horário
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--v2-ink-2)]">
                            Quando ativa, a janela aparece na lista e no editor, junto do comportamento fora do horário.
                        </p>
                    </div>
                </div>
            </Secao>

            <Dialogo
                aberto={Boolean(detalhe)}
                titulo={detalhe?.nome ?? ''}
                descricao={detalhe
                    ? `${(detalhe.etapas ?? []).length} etapas · ${detalhe.execucoes_count ?? 0} execuções · ${detalhe.agendamentos_count ?? 0} agendamentos`
                    : undefined}
                icone={FileText}
                aoFechar={() => setDetalhe(null)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setDetalhe(null)}>
                            Fechar
                        </button>
                        <Link href={`/fluxos/${detalhe?.id}/editar`} className="v2-btn v2-btn--primario">
                            Abrir no editor
                            <ArrowRight aria-hidden="true" />
                        </Link>
                    </>
                }
            >
                {detalhe && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                            <Chip tom={estaAtivo(detalhe.ativo) ? 'positivo' : 'neutro'}>
                                {estaAtivo(detalhe.ativo) ? 'Ativo' : 'Inativo'}
                            </Chip>
                            {estaAtivo(detalhe.horario_inicio_ativo) && (
                                <Chip tom="atencao">Janela {detalhe.horario_inicio}–{detalhe.horario_fim}</Chip>
                            )}
                            {(detalhe.regras ?? []).filter((regra) => estaAtivo(regra.ativo)).map((regra) => (
                                <Chip key={regra.gatilho} tom="marca">{rotulosGatilho[regra.gatilho] ?? regra.gatilho}</Chip>
                            ))}
                        </div>
                        <ol className="max-h-72 overflow-y-auto border border-[var(--v2-line)] v2-rolagem">
                            {(detalhe.etapas ?? []).map((etapa, indice) => (
                                <li key={etapa.id ?? indice} className="flex items-start gap-2 border-b border-[var(--v2-line)] p-2.5 last:border-0">
                                    <span className="v2-numerico w-5 text-[0.6875rem] text-[var(--v2-ink-3)]">{indice + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-[0.8125rem] leading-5">{descreverEtapa(etapa)}</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {etapa.tipo === 'condicao_horario' && (
                                                <Chip tom="atencao">
                                                    <Split className="size-2.5" aria-hidden="true" />
                                                    Condição por horário
                                                </Chip>
                                            )}
                                            {etapa.indicador_digitacao_ativo && (
                                                <Chip>
                                                    <Keyboard className="size-2.5" aria-hidden="true" />
                                                    digitando {etapa.indicador_digitacao_segundos}s
                                                </Chip>
                                            )}
                                            {Number(etapa.pausa_segundos) > 0 && (
                                                <Chip>
                                                    <PauseCircle className="size-2.5" aria-hidden="true" />
                                                    pausa {etapa.pausa_segundos}s
                                                </Chip>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {(detalhe.etapas ?? []).length === 0 && (
                                <li className="p-3 text-xs text-[var(--v2-ink-2)]">Nenhuma etapa configurada.</li>
                            )}
                        </ol>
                        <Aviso tom="info">A prévia é fiel aos campos salvos. O editor mantém todas as ações de edição.</Aviso>
                    </div>
                )}
            </Dialogo>

            <Dialogo
                aberto={Boolean(paraExcluir)}
                titulo="Excluir fluxo?"
                descricao={excluirBloqueado
                    ? 'Este fluxo tem registros vinculados. A exclusão fica bloqueada para preservar o histórico.'
                    : 'As etapas e os gatilhos deste fluxo também serão removidos.'}
                icone={Trash2}
                aoFechar={() => setParaExcluir(null)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setParaExcluir(null)} disabled={excluindo}>
                            Cancelar
                        </button>
                        <button type="button" className="v2-btn v2-btn--perigo" onClick={excluir} aria-disabled={excluirBloqueado} disabled={excluindo}>
                            {excluindo ? 'Excluindo…' : 'Excluir fluxo'}
                        </button>
                    </>
                }
            >
                {paraExcluir && (
                    <div className="space-y-3">
                        <p className="text-[0.8125rem] font-medium">{paraExcluir.nome}</p>
                        {excluirBloqueado ? (
                            <Aviso tom="atencao" titulo="Registros vinculados">
                                <ul className="mt-1 list-inside list-disc text-xs">
                                    {Number(paraExcluir.execucoes_count) > 0 && <li>{paraExcluir.execucoes_count} execuções vinculadas</li>}
                                    {Number(paraExcluir.agendamentos_count) > 0 && <li>{paraExcluir.agendamentos_count} agendamentos vinculados</li>}
                                </ul>
                            </Aviso>
                        ) : (
                            <Aviso tom="atencao">A ação remove o fluxo de forma permanente.</Aviso>
                        )}
                    </div>
                )}
            </Dialogo>
        </div>
    );
}

Fluxos.layout = [LayoutV2];
