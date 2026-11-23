import { CircleSlash, Filter } from 'lucide-react';
import { Chip, Secao, Segmentado, Vazio } from '@/components/v2/pecas';
import { formatarDataHora, nomeDoContato } from '@/components/v2/formato';

const filtros = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'pendente', rotulo: 'Pendentes' },
    { valor: 'executado', rotulo: 'Executados' },
    { valor: 'cancelado', rotulo: 'Cancelados' },
    { valor: 'falhou', rotulo: 'Falharam' },
];

const rotulosEstado = {
    pendente: 'Pendente',
    executado: 'Executado',
    cancelado: 'Cancelado',
    falhou: 'Falhou',
};

const tomPorEstado = {
    pendente: 'atencao',
    executado: 'positivo',
    cancelado: 'neutro',
    falhou: 'erro',
};

/**
 * Lista de agendamentos com filtro por estado e ação de cancelamento apenas
 * para os pendentes.
 */
export default function TabelaAgendamentos({ agendamentos, lista, filtro, aoFiltrar, aoCancelar }) {
    return (
        <Secao
            id="agendamentos-lista"
            titulo="Agendamentos registrados"
            nota={`${lista.length} ${lista.length === 1 ? 'item' : 'itens'} nesta visão.`}
            acoes={<Segmentado rotulo="Filtrar agendamentos por estado" opcoes={filtros} valor={filtro} aoAlterar={aoFiltrar} />}
        >
            {lista.length === 0 ? (
                <Vazio
                    icone={Filter}
                    titulo={agendamentos.length === 0 ? 'Nenhum agendamento ainda' : 'Nenhum agendamento neste estado'}
                    texto={agendamentos.length === 0
                        ? 'Os novos agendamentos aparecerão nesta lista.'
                        : 'Troque o filtro para ver os demais registros.'}
                    acao={agendamentos.length > 0 ? (
                        <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno" onClick={() => aoFiltrar('todos')}>
                            Ver todos
                        </button>
                    ) : null}
                />
            ) : (
                <div className="v2-tabela-area">
                    <table className="v2-tabela">
                        <thead>
                            <tr>
                                <th scope="col">Fluxo</th>
                                <th scope="col">Contato</th>
                                <th scope="col">Data e horário</th>
                                <th scope="col">Estado</th>
                                <th scope="col"><span className="v2-oculto-visual">Ações</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lista.map((agendamento) => (
                                <tr key={agendamento.id}>
                                    <th scope="row" className="v2-tabela__principal text-left">
                                        {agendamento.fluxo?.nome ?? '—'}
                                        <span className="v2-tabela__secundario v2-mono">#{agendamento.id}</span>
                                    </th>
                                    <td>{nomeDoContato(agendamento.contato)}</td>
                                    <td className="v2-numerico">{formatarDataHora(agendamento.executar_em)}</td>
                                    <td>
                                        <Chip tom={tomPorEstado[agendamento.estado]}>
                                            {rotulosEstado[agendamento.estado] ?? agendamento.estado}
                                        </Chip>
                                    </td>
                                    <td>
                                        <div className="v2-tabela__acoes">
                                            {agendamento.estado === 'pendente' ? (
                                                <button type="button" className="v2-btn v2-btn--perigo v2-btn--pequeno" onClick={() => aoCancelar(agendamento)}>
                                                    <CircleSlash aria-hidden="true" />
                                                    Cancelar
                                                </button>
                                            ) : (
                                                <span className="v2-micro">—</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Secao>
    );
}
