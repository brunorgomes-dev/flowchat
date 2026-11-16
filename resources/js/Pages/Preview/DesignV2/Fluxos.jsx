import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
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
import LayoutPreview from './_components/LayoutPreview';
import {
    Aviso,
    CabecalhoPagina,
    Chip,
    Dialogo,
    Metrica,
    Secao,
    SeloDemo,
    SeloLeitura,
    Vazio,
} from './_components/pecas';
import {
    descreverEtapa,
    fluxos,
    formatarData,
    rotulosTipoConteudo,
} from './_data/demonstracao';

const BASE = '/preview/design-v2';

const filtros = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'ativos', rotulo: 'Ativos' },
    { valor: 'inativos', rotulo: 'Inativos' },
];

const rotulosGatilho = {
    novo_contato: 'Novo contato',
    mensagem_recebida: 'Mensagem recebida',
};

export default function Fluxos() {
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState('todos');
    const [detalhe, setDetalhe] = useState(null);
    const [paraExcluir, setParaExcluir] = useState(null);

    const totalAtivos = fluxos.filter((fluxo) => fluxo.ativo).length;

    const filtrados = useMemo(() => {
        const termo = busca.trim().toLocaleLowerCase('pt-BR');

        return fluxos.filter((fluxo) => {
            const combinaNome = !termo || fluxo.nome.toLocaleLowerCase('pt-BR').includes(termo);
            const combinaEstado = filtro === 'todos'
                || (filtro === 'ativos' && fluxo.ativo)
                || (filtro === 'inativos' && !fluxo.ativo);

            return combinaNome && combinaEstado;
        });
    }, [busca, filtro]);

    const excluirBloqueado = Boolean(
        paraExcluir && (paraExcluir.execucoes_count > 0 || paraExcluir.agendamentos_count > 0),
    );

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Fluxos"
                descricao="A central de automação: estado, gatilhos, etapas e uso de cada fluxo em uma tabela de operação, sem cartões repetidos."
                nota={
                    <div className="flex flex-wrap items-center gap-2">
                        <SeloLeitura />
                        <SeloDemo />
                    </div>
                }
                acoes={
                    <>
                        <Link href={`${BASE}/fluxos/editor`} className="v2-btn v2-btn--primario">
                            <Plus aria-hidden="true" />
                            Novo fluxo
                        </Link>
                        <Link href={`${BASE}/agendamentos`} className="v2-btn v2-btn--contorno">
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
                    valor={fluxos.reduce((total, fluxo) => total + fluxo.execucoes_count, 0)}
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
                        <button
                            key={opcao.valor}
                            type="button"
                            aria-pressed={filtro === opcao.valor}
                            onClick={() => setFiltro(opcao.valor)}
                        >
                            {opcao.rotulo}
                        </button>
                    ))}
                </div>
                <span className="v2-micro v2-numerico">
                    {filtrados.length} de {fluxos.length}
                </span>
            </div>

            {filtrados.length === 0 ? (
                <div className="mt-4">
                    <Vazio
                        icone={Workflow}
                        titulo="Nenhum fluxo encontrado"
                        texto="A busca considera apenas o nome. Ajuste o termo ou volte para todos os estados."
                        acao={
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
                        }
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
                            {filtrados.map((fluxo) => (
                                <tr key={fluxo.id}>
                                    <th scope="row" className="text-left">
                                        <span className="v2-tabela__principal">{fluxo.nome}</span>
                                        <span className="v2-tabela__secundario">
                                            Atualizado em {formatarData(fluxo.atualizadoEm)}
                                            {fluxo.horario.ativo
                                                ? ` · janela ${fluxo.horario.inicio}–${fluxo.horario.fim}`
                                                : ' · sem janela de horário'}
                                        </span>
                                    </th>
                                    <td>
                                        <Chip tom={fluxo.ativo ? 'positivo' : 'neutro'}>
                                            <span className="v2-ponto" aria-hidden="true" />
                                            {fluxo.ativo ? 'Ativo' : 'Inativo'}
                                        </Chip>
                                    </td>
                                    <td>
                                        <span className="flex flex-wrap gap-1">
                                            {fluxo.regras.filter((regra) => regra.ativo).length === 0 ? (
                                                <span className="text-[var(--v2-ink-2)]">Sem gatilho ativo</span>
                                            ) : (
                                                fluxo.regras
                                                    .filter((regra) => regra.ativo)
                                                    .map((regra) => (
                                                        <Chip key={regra.gatilho}>{rotulosGatilho[regra.gatilho]}</Chip>
                                                    ))
                                            )}
                                        </span>
                                    </td>
                                    <td className="v2-numerico text-right">{fluxo.etapas.length}</td>
                                    <td className="v2-numerico text-right">{fluxo.execucoes_count}</td>
                                    <td className="v2-numerico text-right">{fluxo.agendamentos_count}</td>
                                    <td>
                                        <div className="v2-tabela__acoes">
                                            <button
                                                type="button"
                                                className="v2-btn v2-btn--fantasma v2-btn--pequeno"
                                                onClick={() => setDetalhe(fluxo)}
                                            >
                                                Detalhes
                                            </button>
                                            <Link
                                                href={`${BASE}/fluxos/editor`}
                                                className="v2-btn v2-btn--fantasma v2-btn--pequeno"
                                            >
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
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Secao id="fluxos-regras" titulo="Regras visíveis na lista">
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
                            Fluxos com execuções ou agendamentos não são excluídos: a lista mostra o motivo antes da
                            confirmação.
                        </p>
                    </div>
                    <div className="v2-painel v2-painel__corpo">
                        <p className="flex items-center gap-2 text-[0.8125rem] font-medium">
                            <Clock3 className="size-3.5 text-[var(--v2-ink-3)]" aria-hidden="true" />
                            Janela de horário
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--v2-ink-2)]">
                            Quando ativa, a janela aparece junto do nome e no editor, com o comportamento fora do horário.
                        </p>
                    </div>
                </div>
            </Secao>

            <Dialogo
                aberto={Boolean(detalhe)}
                titulo={detalhe?.nome ?? ''}
                descricao={`${detalhe?.etapas.length ?? 0} etapas · ${detalhe?.execucoes_count ?? 0} execuções · ${detalhe?.agendamentos_count ?? 0} agendamentos`}
                icone={FileText}
                aoFechar={() => setDetalhe(null)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setDetalhe(null)}>
                            Fechar
                        </button>
                        <Link href={`${BASE}/fluxos/editor`} className="v2-btn v2-btn--primario">
                            Abrir no editor
                            <ArrowRight aria-hidden="true" />
                        </Link>
                    </>
                }
            >
                {detalhe && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                            <Chip tom={detalhe.ativo ? 'positivo' : 'neutro'}>{detalhe.ativo ? 'Ativo' : 'Inativo'}</Chip>
                            {detalhe.horario.ativo && (
                                <Chip tom="atencao">
                                    Janela {detalhe.horario.inicio}–{detalhe.horario.fim}
                                </Chip>
                            )}
                            {detalhe.regras.filter((regra) => regra.ativo).map((regra) => (
                                <Chip key={regra.gatilho} tom="marca">
                                    {rotulosGatilho[regra.gatilho]}
                                </Chip>
                            ))}
                        </div>
                        <ol className="max-h-72 overflow-y-auto border border-[var(--v2-line)]">
                            {detalhe.etapas.map((etapa) => (
                                <li key={etapa.id} className="flex items-start gap-2 border-b border-[var(--v2-line)] p-2.5 last:border-0">
                                    <span className="v2-numerico w-5 text-[0.6875rem] text-[var(--v2-ink-3)]">
                                        {etapa.ordem}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-[0.8125rem] leading-5">{descreverEtapa(etapa)}</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {etapa.tipo === 'condicao_horario' && (
                                                <Chip tom="atencao">
                                                    <Split className="size-2.5" aria-hidden="true" />
                                                    Condição por horário
                                                </Chip>
                                            )}
                                            {etapa.tipo_conteudo && etapa.tipo_conteudo !== 'texto' && (
                                                <Chip>{rotulosTipoConteudo[etapa.tipo_conteudo]}</Chip>
                                            )}
                                            {etapa.indicador_digitacao_ativo && (
                                                <Chip>
                                                    <Keyboard className="size-2.5" aria-hidden="true" />
                                                    digitando {etapa.indicador_digitacao_segundos}s
                                                </Chip>
                                            )}
                                            {etapa.pausa_segundos > 0 && (
                                                <Chip>
                                                    <PauseCircle className="size-2.5" aria-hidden="true" />
                                                    pausa {etapa.pausa_segundos}s
                                                </Chip>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                        <Aviso tom="info">
                            A prévia é fiel aos campos salvos. Uploads, validações do servidor e execução real não
                            acontecem no preview.
                        </Aviso>
                    </div>
                )}
            </Dialogo>

            <Dialogo
                aberto={Boolean(paraExcluir)}
                titulo="Excluir fluxo?"
                descricao={
                    excluirBloqueado
                        ? 'Este fluxo tem registros vinculados. A exclusão fica bloqueada para preservar o histórico.'
                        : 'Este fluxo não tem execuções nem agendamentos vinculados e poderia ser excluído.'
                }
                icone={Trash2}
                aoFechar={() => setParaExcluir(null)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setParaExcluir(null)}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="v2-btn v2-btn--perigo"
                            aria-disabled={excluirBloqueado}
                            onClick={() => {
                                if (excluirBloqueado) {
                                    return;
                                }

                                setParaExcluir(null);
                                toast.success('Exclusão simulada', {
                                    description: 'O fluxo permanece na lista: o preview não grava alterações.',
                                });
                            }}
                        >
                            Excluir fluxo
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
                                    {paraExcluir.execucoes_count > 0 && (
                                        <li>{paraExcluir.execucoes_count} execuções vinculadas</li>
                                    )}
                                    {paraExcluir.agendamentos_count > 0 && (
                                        <li>{paraExcluir.agendamentos_count} agendamentos vinculados</li>
                                    )}
                                </ul>
                            </Aviso>
                        ) : (
                            <Aviso tom="sucesso" titulo="Nenhum registro vinculado">
                                A confirmação abaixo apenas simula o resultado. A lista não muda.
                            </Aviso>
                        )}
                    </div>
                )}
            </Dialogo>
        </div>
    );
}

Fluxos.layout = [LayoutPreview];
