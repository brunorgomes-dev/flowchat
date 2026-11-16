import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { CalendarClock, CircleSlash, Clock3, Filter } from 'lucide-react';
import { toast } from 'sonner';
import LayoutPreview from './_components/LayoutPreview';
import {
    Aviso,
    CabecalhoPagina,
    Campo,
    Chip,
    Dialogo,
    Metrica,
    Secao,
    SeloDemo,
    SeloLeitura,
    Segmentado,
    Vazio,
} from './_components/pecas';
import {
    agendamentos,
    contatos,
    fluxos,
    formatarDataHora,
    nomeDoContato,
    rotulosEstadoAgendamento,
} from './_data/demonstracao';

const filtros = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'pendente', rotulo: 'Pendentes' },
    { valor: 'executado', rotulo: 'Executados' },
    { valor: 'cancelado', rotulo: 'Cancelados' },
    { valor: 'falhou', rotulo: 'Falharam' },
];

const tomPorEstado = {
    pendente: 'atencao',
    executado: 'positivo',
    cancelado: 'neutro',
    falhou: 'erro',
};

export default function Agendamentos() {
    const [fluxoId, setFluxoId] = useState('');
    const [contatoId, setContatoId] = useState('');
    const [dataHora, setDataHora] = useState('');
    const [erros, setErros] = useState({});
    const [filtro, setFiltro] = useState('todos');
    const [paraCancelar, setParaCancelar] = useState(null);
    const [cancelados, setCancelados] = useState([]);

    const lista = useMemo(() => agendamentos
        .map((item) => (cancelados.includes(item.id) ? { ...item, estado: 'cancelado' } : item))
        .filter((item) => filtro === 'todos' || item.estado === filtro), [filtro, cancelados]);

    const todos = useMemo(() => agendamentos
        .map((item) => (cancelados.includes(item.id) ? { ...item, estado: 'cancelado' } : item)), [cancelados]);

    const pendentes = todos.filter((item) => item.estado === 'pendente').length;
    const executados = todos.filter((item) => item.estado === 'executado').length;
    const falhas = todos.filter((item) => item.estado === 'falhou').length;

    const agendar = (evento) => {
        evento.preventDefault();
        const novosErros = {};

        if (!fluxoId) {
            novosErros.fluxo = 'Selecione um fluxo.';
        }

        if (!contatoId) {
            novosErros.contato = 'Selecione um contato.';
        }

        if (!dataHora) {
            novosErros.dataHora = 'Informe a data e o horário do agendamento.';
        }

        setErros(novosErros);

        if (Object.keys(novosErros).length > 0) {
            return;
        }

        toast.success('Agendamento simulado', {
            description: `${formatarDataHora(dataHora)} · nada foi criado no banco nem enfileirado.`,
        });
        setFluxoId('');
        setContatoId('');
        setDataHora('');
    };

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Agendamentos"
                descricao="Programe execuções futuras e acompanhe o estado de cada uma. O horário é interpretado no fuso confirmado da conta."
                nota={
                    <div className="flex flex-wrap items-center gap-2">
                        <SeloLeitura />
                        <SeloDemo />
                        <Chip tom="positivo">
                            <Clock3 className="size-2.5" aria-hidden="true" />
                            America/Sao_Paulo · confirmado
                        </Chip>
                    </div>
                }
                acoes={
                    <Link href="/preview/design-v2/fluxos" className="v2-btn v2-btn--contorno">
                        Ver fluxos
                    </Link>
                }
            />

            <div className="v2-metricas mt-4">
                <Metrica rotulo="Pendentes" valor={pendentes} unidade="na fila" />
                <Metrica rotulo="Executados" valor={executados} unidade="concluídos" />
                <Metrica rotulo="Falharam" valor={falhas} unidade="exigem atenção" />
                <Metrica rotulo="Fuso da conta" valor="UTC−3" nota="America/Sao_Paulo · horário digitado é local" />
            </div>

            <Secao
                id="agendamentos-novo"
                titulo="Novo agendamento"
                nota="O backend recusa datas no passado e exige fuso confirmado. A V2 valida apenas os campos obrigatórios."
            >
                <form onSubmit={agendar} noValidate className="v2-painel v2-painel__corpo">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
                        <Campo rotulo="Fluxo" htmlFor="ag-fluxo" erro={erros.fluxo}>
                            <select
                                id="ag-fluxo"
                                className="v2-entrada"
                                value={fluxoId}
                                onChange={(evento) => {
                                    setFluxoId(evento.target.value);
                                    setErros((atuais) => ({ ...atuais, fluxo: null }));
                                }}
                                aria-invalid={Boolean(erros.fluxo)}
                            >
                                <option value="">Selecione um fluxo</option>
                                {fluxos.map((fluxo) => (
                                    <option key={fluxo.id} value={fluxo.id}>
                                        {fluxo.nome}
                                    </option>
                                ))}
                            </select>
                        </Campo>

                        <Campo rotulo="Contato" htmlFor="ag-contato" erro={erros.contato}>
                            <select
                                id="ag-contato"
                                className="v2-entrada"
                                value={contatoId}
                                onChange={(evento) => {
                                    setContatoId(evento.target.value);
                                    setErros((atuais) => ({ ...atuais, contato: null }));
                                }}
                                aria-invalid={Boolean(erros.contato)}
                            >
                                <option value="">Selecione um contato</option>
                                {contatos.map((contato) => (
                                    <option key={contato.id} value={contato.id}>
                                        {nomeDoContato(contato)}
                                    </option>
                                ))}
                            </select>
                        </Campo>

                        <Campo rotulo="Data e horário" htmlFor="ag-data" erro={erros.dataHora}>
                            <input
                                id="ag-data"
                                type="datetime-local"
                                className="v2-entrada v2-numerico"
                                value={dataHora}
                                onChange={(evento) => {
                                    setDataHora(evento.target.value);
                                    setErros((atuais) => ({ ...atuais, dataHora: null }));
                                }}
                                aria-invalid={Boolean(erros.dataHora)}
                            />
                        </Campo>

                        <button type="submit" className="v2-btn v2-btn--primario">
                            <CalendarClock aria-hidden="true" />
                            Agendar
                        </button>
                    </div>
                    <p className="v2-campo__ajuda mt-2">
                        O horário é interpretado no fuso da conta, com horário de verão respeitado. Datas no passado são
                        recusadas pelo servidor.
                    </p>
                </form>
            </Secao>

            <Secao
                id="agendamentos-lista"
                titulo="Agendamentos registrados"
                nota={`${lista.length} ${lista.length === 1 ? 'item' : 'itens'} nesta visão.`}
                acoes={
                    <Segmentado rotulo="Filtrar agendamentos por estado" opcoes={filtros} valor={filtro} aoAlterar={setFiltro} />
                }
            >
                {lista.length === 0 ? (
                    <Vazio
                        icone={Filter}
                        titulo="Nenhum agendamento neste estado"
                        texto="Troque o filtro para ver os demais registros ou crie um novo agendamento acima."
                        acao={
                            <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno" onClick={() => setFiltro('todos')}>
                                Ver todos
                            </button>
                        }
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
                                    <th scope="col">
                                        <span className="v2-oculto-visual">Ações</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {lista.map((agendamento) => (
                                    <tr key={agendamento.id}>
                                        <th scope="row" className="v2-tabela__principal text-left">
                                            {agendamento.fluxo}
                                            <span className="v2-tabela__secundario v2-mono">DEMO-AG-{agendamento.id}</span>
                                        </th>
                                        <td>{agendamento.contato}</td>
                                        <td className="v2-numerico">{formatarDataHora(agendamento.executarEm)}</td>
                                        <td>
                                            <Chip tom={tomPorEstado[agendamento.estado]}>
                                                {rotulosEstadoAgendamento[agendamento.estado]}
                                            </Chip>
                                        </td>
                                        <td>
                                            <div className="v2-tabela__acoes">
                                                {agendamento.estado === 'pendente' ? (
                                                    <button
                                                        type="button"
                                                        className="v2-btn v2-btn--perigo v2-btn--pequeno"
                                                        onClick={() => setParaCancelar(agendamento)}
                                                    >
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

            <div className="mt-5">
                <Aviso tom="info" titulo="Como o agendamento é executado">
                    O agendador varre pendentes vencidos a cada minuto e inicia o fluxo no horário. O cancelamento só é
                    permitido enquanto o estado é pendente; a V2 simula a mudança apenas na tela.
                </Aviso>
            </div>

            <Dialogo
                aberto={Boolean(paraCancelar)}
                titulo="Cancelar agendamento?"
                descricao="O agendamento pendente deixa de ser executado. Nenhuma mensagem é enviada ao contato."
                icone={CircleSlash}
                aoFechar={() => setParaCancelar(null)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setParaCancelar(null)}>
                            Manter agendamento
                        </button>
                        <button
                            type="button"
                            className="v2-btn v2-btn--perigo"
                            onClick={() => {
                                setCancelados((atuais) => [...atuais, paraCancelar.id]);
                                setParaCancelar(null);
                                toast.success('Cancelamento simulado', {
                                    description: 'O estado mudou apenas nesta tela.',
                                });
                            }}
                        >
                            Cancelar agendamento
                        </button>
                    </>
                }
            >
                {paraCancelar && (
                    <dl className="v2-dados">
                        <div>
                            <dt>Fluxo</dt>
                            <dd>{paraCancelar.fluxo}</dd>
                        </div>
                        <div>
                            <dt>Contato</dt>
                            <dd>{paraCancelar.contato}</dd>
                        </div>
                        <div>
                            <dt>Horário</dt>
                            <dd className="v2-numerico">{formatarDataHora(paraCancelar.executarEm)}</dd>
                        </div>
                    </dl>
                )}
            </Dialogo>
        </div>
    );
}

Agendamentos.layout = [LayoutPreview];
