import { useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { CalendarClock, CircleSlash, Filter, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import LayoutV2 from '@/components/v2/LayoutV2';
import { CabecalhoPagina, Campo, Chip, Dialogo, Metrica, Secao, Segmentado, Vazio } from '@/components/v2/pecas';
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

export default function Agendamentos({ fluxos = [], contatos = [], agendamentos = [] }) {
    const [filtro, setFiltro] = useState('todos');
    const [paraCancelar, setParaCancelar] = useState(null);
    const [cancelando, setCancelando] = useState(false);
    const form = useForm({ fluxo_id: '', contato_id: '', executar_em: '' });

    const lista = useMemo(
        () => agendamentos.filter((agendamento) => filtro === 'todos' || agendamento.estado === filtro),
        [agendamentos, filtro],
    );

    const pendentes = agendamentos.filter((agendamento) => agendamento.estado === 'pendente').length;
    const executados = agendamentos.filter((agendamento) => agendamento.estado === 'executado').length;
    const falhas = agendamentos.filter((agendamento) => agendamento.estado === 'falhou').length;

    const agendar = (evento) => {
        evento.preventDefault();
        form.post('/agendamentos', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                toast.success('Agendamento criado');
            },
        });
    };

    const cancelar = () => {
        if (!paraCancelar) {
            return;
        }

        router.post(`/agendamentos/${paraCancelar.id}/cancelar`, {}, {
            preserveScroll: true,
            onStart: () => setCancelando(true),
            onSuccess: () => {
                setParaCancelar(null);
                toast.success('Agendamento cancelado');
            },
            onFinish: () => setCancelando(false),
        });
    };

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Agendamentos"
                descricao="Programe execuções futuras e acompanhe o estado de cada uma. O horário é interpretado no fuso confirmado da conta."
                acoes={
                    <Link href="/fluxos" className="v2-btn v2-btn--contorno">
                        Ver fluxos
                    </Link>
                }
            />

            <div className="v2-metricas mt-4">
                <Metrica rotulo="Pendentes" valor={pendentes} unidade="na fila" />
                <Metrica rotulo="Executados" valor={executados} unidade="concluídos" />
                <Metrica rotulo="Falharam" valor={falhas} unidade="exigem atenção" />
                <Metrica rotulo="Total" valor={agendamentos.length} unidade="registros" />
            </div>

            <Secao
                id="agendamentos-novo"
                titulo="Novo agendamento"
                nota="O servidor recusa datas no passado e exige o fuso da conta confirmado."
            >
                <form onSubmit={agendar} className="v2-painel v2-painel__corpo">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
                        <Campo rotulo="Fluxo" htmlFor="ag-fluxo" erro={form.errors.fluxo_id}>
                            <select
                                id="ag-fluxo"
                                className="v2-entrada"
                                value={form.data.fluxo_id}
                                onChange={(evento) => {
                                    form.setData('fluxo_id', evento.target.value);
                                    form.clearErrors('fluxo_id');
                                }}
                                aria-invalid={Boolean(form.errors.fluxo_id)}
                            >
                                <option value="">Selecione um fluxo</option>
                                {fluxos.map((fluxo) => (
                                    <option key={fluxo.id} value={fluxo.id}>{fluxo.nome}</option>
                                ))}
                            </select>
                        </Campo>

                        <Campo rotulo="Contato" htmlFor="ag-contato" erro={form.errors.contato_id}>
                            <select
                                id="ag-contato"
                                className="v2-entrada"
                                value={form.data.contato_id}
                                onChange={(evento) => {
                                    form.setData('contato_id', evento.target.value);
                                    form.clearErrors('contato_id');
                                }}
                                aria-invalid={Boolean(form.errors.contato_id)}
                            >
                                <option value="">Selecione um contato</option>
                                {contatos.map((contato) => (
                                    <option key={contato.id} value={contato.id}>{nomeDoContato(contato)}</option>
                                ))}
                            </select>
                        </Campo>

                        <Campo rotulo="Data e horário" htmlFor="ag-data" erro={form.errors.executar_em}>
                            <input
                                id="ag-data"
                                type="datetime-local"
                                className="v2-entrada v2-numerico"
                                value={form.data.executar_em}
                                onChange={(evento) => {
                                    form.setData('executar_em', evento.target.value);
                                    form.clearErrors('executar_em');
                                }}
                                aria-invalid={Boolean(form.errors.executar_em)}
                            />
                        </Campo>

                        <button type="submit" className="v2-btn v2-btn--primario" disabled={form.processing}>
                            {form.processing ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <CalendarClock aria-hidden="true" />}
                            {form.processing ? 'Agendando…' : 'Agendar'}
                        </button>
                    </div>
                    <p className="v2-campo__ajuda mt-2">
                        O horário é interpretado no fuso da conta, com horário de verão respeitado.
                    </p>
                </form>
            </Secao>

            <Secao
                id="agendamentos-lista"
                titulo="Agendamentos registrados"
                nota={`${lista.length} ${lista.length === 1 ? 'item' : 'itens'} nesta visão.`}
                acoes={<Segmentado rotulo="Filtrar agendamentos por estado" opcoes={filtros} valor={filtro} aoAlterar={setFiltro} />}
            >
                {lista.length === 0 ? (
                    <Vazio
                        icone={Filter}
                        titulo={agendamentos.length === 0 ? 'Nenhum agendamento ainda' : 'Nenhum agendamento neste estado'}
                        texto={agendamentos.length === 0
                            ? 'Os novos agendamentos aparecerão nesta lista.'
                            : 'Troque o filtro para ver os demais registros.'}
                        acao={agendamentos.length > 0 ? (
                            <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno" onClick={() => setFiltro('todos')}>
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
                                                    <button type="button" className="v2-btn v2-btn--perigo v2-btn--pequeno" onClick={() => setParaCancelar(agendamento)}>
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

            <Dialogo
                aberto={Boolean(paraCancelar)}
                titulo="Cancelar agendamento?"
                descricao="O agendamento pendente deixa de ser executado. Nenhuma mensagem é enviada ao contato."
                icone={CircleSlash}
                aoFechar={() => setParaCancelar(null)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setParaCancelar(null)} disabled={cancelando}>
                            Manter agendamento
                        </button>
                        <button type="button" className="v2-btn v2-btn--perigo" onClick={cancelar} disabled={cancelando}>
                            {cancelando ? 'Cancelando…' : 'Cancelar agendamento'}
                        </button>
                    </>
                }
            >
                {paraCancelar && (
                    <dl className="v2-dados">
                        <div>
                            <dt>Fluxo</dt>
                            <dd>{paraCancelar.fluxo?.nome ?? '—'}</dd>
                        </div>
                        <div>
                            <dt>Contato</dt>
                            <dd>{nomeDoContato(paraCancelar.contato)}</dd>
                        </div>
                        <div>
                            <dt>Horário</dt>
                            <dd className="v2-numerico">{formatarDataHora(paraCancelar.executar_em)}</dd>
                        </div>
                    </dl>
                )}
            </Dialogo>
        </div>
    );
}

Agendamentos.layout = [LayoutV2];
