import { Link } from '@inertiajs/react';
import { Plus, Trash2, Workflow } from 'lucide-react';
import { Chip, Vazio } from '@/components/v2/pecas';
import { formatarData } from '@/components/v2/formato';
import { estaAtivo, rotuloRegra } from './util';

/**
 * Lista de fluxos com estado vazio e ações de detalhe, edição e exclusão.
 */
export default function ListaFluxos({ fluxos, filtrados, aoDetalhar, aoExcluir, aoLimparFiltros }) {
    return filtrados.length === 0 ? (
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
                        onClick={aoLimparFiltros}
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
                                            <Chip key={regra.gatilho}>{rotuloRegra(regra)}</Chip>
                                        ))}
                                    </span>
                                </td>
                                <td className="v2-numerico text-right">{etapas.length}</td>
                                <td className="v2-numerico text-right">{fluxo.execucoes_count ?? 0}</td>
                                <td className="v2-numerico text-right">{fluxo.agendamentos_count ?? 0}</td>
                                <td>
                                    <div className="v2-tabela__acoes">
                                        <button type="button" className="v2-btn v2-btn--fantasma v2-btn--pequeno" onClick={() => aoDetalhar(fluxo)}>
                                            Detalhes
                                        </button>
                                        <Link href={`/fluxos/${fluxo.id}/editar`} className="v2-btn v2-btn--fantasma v2-btn--pequeno">
                                            Editar
                                        </Link>
                                        <button
                                            type="button"
                                            className="v2-btn v2-btn--fantasma v2-btn--pequeno text-[var(--v2-perigo)]"
                                            onClick={() => aoExcluir(fluxo)}
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
    );
}
