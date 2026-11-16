import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { CalendarClock, CheckCircle2, MessageCircle, Play } from 'lucide-react';
import { toast } from 'sonner';
import LayoutPreview from './_components/LayoutPreview';
import {
    Aviso,
    CabecalhoPagina,
    Campo,
    Chip,
    Metrica,
    Secao,
    SeloDemo,
    SeloLeitura,
    Segmentado,
    TabelaArea,
    Vazio,
} from './_components/pecas';
import {
    chaveDoDia,
    contatos,
    fluxos,
    formatarDataHoraCurta,
    formatarDiaLongo,
    formatarHora,
    logs,
    metricas,
    nomeDoContato,
    operacao,
    resumoMensagem,
} from './_data/demonstracao';

const filtrosAtividade = [
    { valor: 'todos', rotulo: 'Tudo' },
    { valor: 'envio', rotulo: 'Envios' },
    { valor: 'falha', rotulo: 'Falhas' },
];

const tomPorEvento = {
    envio: 'marca',
    falha: 'erro',
    fluxo: 'neutro',
    entrada: 'neutro',
    agendamento: 'atencao',
    origem: 'atencao',
};

export default function Painel() {
    const [filtro, setFiltro] = useState('todos');
    const [contatoId, setContatoId] = useState('');
    const [fluxoId, setFluxoId] = useState('');
    const [erros, setErros] = useState({});

    const mensagensRecentes = useMemo(
        () => contatos
            .flatMap((contato) => contato.mensagens.map((mensagem) => ({ ...mensagem, contato })))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 8),
        [],
    );

    const atividadeFiltrada = useMemo(
        () => (filtro === 'todos' ? logs : logs.filter((log) => log.tipo === filtro)),
        [filtro],
    );

    const grupos = useMemo(() => {
        const mapa = new Map();

        atividadeFiltrada.forEach((log) => {
            const chave = chaveDoDia(log.criadoEm);

            if (!mapa.has(chave)) {
                mapa.set(chave, []);
            }

            mapa.get(chave).push(log);
        });

        return [...mapa.entries()];
    }, [atividadeFiltrada]);

    const executar = (evento) => {
        evento.preventDefault();
        const novosErros = {};

        if (!contatoId) {
            novosErros.contato = 'Selecione um contato.';
        }

        if (!fluxoId) {
            novosErros.fluxo = 'Selecione um fluxo ativo.';
        }

        setErros(novosErros);

        if (Object.keys(novosErros).length > 0) {
            return;
        }

        const contato = contatos.find((item) => String(item.id) === contatoId);
        const fluxo = fluxos.find((item) => String(item.id) === fluxoId);

        toast.success('Execução simulada', {
            description: `${fluxo?.nome ?? 'Fluxo'} para ${nomeDoContato(contato)}. Nada foi enviado ao Messenger.`,
        });
        setContatoId('');
        setFluxoId('');
    };

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Painel de operação"
                descricao={`${formatarDiaLongo(operacao.atualizadoEm)} · atualizado às ${formatarHora(operacao.atualizadoEm)}. Contatos, mensagens e atividade da conta em uma única leitura.`}
                nota={
                    <div className="flex flex-wrap items-center gap-2">
                        <SeloLeitura />
                        <SeloDemo />
                    </div>
                }
                acoes={
                    <>
                        <Link href="/preview/design-v2/conversas" className="v2-btn v2-btn--primario">
                            <MessageCircle aria-hidden="true" />
                            Abrir conversas
                        </Link>
                        <Link href="/preview/design-v2/agendamentos" className="v2-btn v2-btn--contorno">
                            <CalendarClock aria-hidden="true" />
                            Agendamentos
                        </Link>
                    </>
                }
            />

            <div className="v2-metricas mt-4">
                {metricas.map((metrica) => (
                    <Metrica key={metrica.rotulo} {...metrica} />
                ))}
            </div>

            <div className="v2-grade v2-grade--painel mt-5">
                <div className="min-w-0">
                    <Secao
                        id="painel-execucao"
                        titulo="Executar fluxo manualmente"
                        nota="Escolha um contato e um fluxo para iniciar uma execução. No preview, o envio é apenas simulado."
                    >
                        <form onSubmit={executar} noValidate className="v2-painel v2-painel__corpo">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
                                <Campo rotulo="Contato" htmlFor="manual-contato" erro={erros.contato}>
                                    <select
                                        id="manual-contato"
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

                                <Campo rotulo="Fluxo ativo" htmlFor="manual-fluxo" erro={erros.fluxo}>
                                    <select
                                        id="manual-fluxo"
                                        className="v2-entrada"
                                        value={fluxoId}
                                        onChange={(evento) => {
                                            setFluxoId(evento.target.value);
                                            setErros((atuais) => ({ ...atuais, fluxo: null }));
                                        }}
                                        aria-invalid={Boolean(erros.fluxo)}
                                    >
                                        <option value="">Selecione um fluxo</option>
                                        {fluxos.filter((fluxo) => fluxo.ativo).map((fluxo) => (
                                            <option key={fluxo.id} value={fluxo.id}>
                                                {fluxo.nome}
                                            </option>
                                        ))}
                                    </select>
                                </Campo>

                                <button type="submit" className="v2-btn v2-btn--primario">
                                    <Play aria-hidden="true" />
                                    Executar agora
                                </button>
                            </div>
                        </form>
                    </Secao>

                    <Secao
                        id="painel-atividade"
                        titulo="Atividade"
                        nota="Eventos administrativos não aparecem para o cliente na interface atual; a V2 mantém a mesma regra."
                        acoes={
                            <Segmentado
                                rotulo="Filtrar atividade"
                                opcoes={filtrosAtividade}
                                valor={filtro}
                                aoAlterar={setFiltro}
                            />
                        }
                    >
                        <div className="v2-painel">
                            {grupos.length === 0 ? (
                                <Vazio
                                    icone={CheckCircle2}
                                    titulo="Nenhum evento neste filtro"
                                    texto="Troque o filtro para ver os demais eventos de operação."
                                />
                            ) : (
                                <ol className="v2-timeline">
                                    {grupos.map(([dia, itens]) => (
                                        <FragmentoDeDia key={dia} dia={dia} itens={itens} />
                                    ))}
                                </ol>
                            )}
                        </div>
                    </Secao>
                </div>

                <aside className="min-w-0 space-y-5">
                    <Secao id="painel-operacao" titulo="Saúde da operação">
                        <div className="v2-painel v2-painel__corpo space-y-2.5">
                            <LinhaDeOperacao
                                rotulo="Messenger"
                                valor={`${operacao.messenger.pagina} · ${operacao.messenger.pageId}`}
                                tom="positivo"
                                texto="Conectado"
                            />
                            <LinhaDeOperacao
                                rotulo="Webhook"
                                valor={operacao.messenger.webhook}
                                tom="positivo"
                                texto="Ativo"
                            />
                            <LinhaDeOperacao
                                rotulo="Fila"
                                valor={`${operacao.fila.pendentes} pendentes · última execução ${formatarHora(operacao.fila.ultimaExecucao)}`}
                                tom="positivo"
                                texto="Em dia"
                            />
                            <LinhaDeOperacao
                                rotulo="Agendador"
                                valor={`varredura às ${formatarHora(operacao.agendador.ultimaVarredura)}`}
                                tom="positivo"
                                texto="Rodando"
                            />
                            <LinhaDeOperacao
                                rotulo="Fuso da conta"
                                valor="America/Sao_Paulo · confirmado"
                                tom="positivo"
                                texto="Confirmado"
                            />
                            <LinhaDeOperacao
                                rotulo="OAuth"
                                valor="Aplicativo Meta ainda não configurado neste ambiente"
                                tom="atencao"
                                texto="Pendente"
                            />
                        </div>
                    </Secao>

                    <Secao
                        id="painel-contatos"
                        titulo="Contatos recentes"
                        acoes={<Chip>{contatos.length} contatos</Chip>}
                    >
                        <TabelaArea rotulo="Contatos recentes">
                            <table className="v2-tabela v2-tabela--compacta">
                                <thead>
                                    <tr>
                                        <th scope="col">Contato</th>
                                        <th scope="col" className="text-right">Mensagens</th>
                                        <th scope="col">Última</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contatos.slice(0, 6).map((contato) => (
                                        <tr key={contato.id}>
                                            <th scope="row" className="v2-tabela__principal text-left">
                                                <Link
                                                    href="/preview/design-v2/conversas/historico"
                                                    className="hover:text-[var(--v2-destaque)]"
                                                >
                                                    {nomeDoContato(contato)}
                                                </Link>
                                                <span className="v2-tabela__secundario v2-mono">{contato.psid}</span>
                                            </th>
                                            <td className="v2-numerico text-right">{contato.mensagens_count}</td>
                                            <td className="v2-numerico text-[var(--v2-ink-2)]">
                                                {formatarDataHoraCurta(contato.ultimaMensagemEm)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TabelaArea>
                    </Secao>

                    <Secao id="painel-mensagens" titulo="Mensagens recentes">
                        <ul className="v2-lista v2-painel">
                            {mensagensRecentes.map((mensagem) => (
                                <li key={mensagem.id} className="v2-linha">
                                    <div className="v2-linha__corpo">
                                        <div className="v2-linha__titulo">
                                            <span className="v2-linha__nome">
                                                {mensagem.direcao === 'enviada' ? 'Enviada' : 'Recebida'} ·{' '}
                                                {nomeDoContato(mensagem.contato)}
                                            </span>
                                            <span className="v2-micro v2-numerico">
                                                {formatarHora(mensagem.created_at)}
                                            </span>
                                        </div>
                                        <p className="v2-linha__texto">{resumoMensagem(mensagem)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Secao>
                </aside>
            </div>

            <div className="mt-6">
                <Aviso tom="info" titulo="Somente leitura">
                    Os botões desta tela validam os campos localmente e confirmam no aviso global. Nenhuma execução é
                    criada, nenhuma mensagem é enviada e nenhum registro do banco é lido para montar estes dados.
                </Aviso>
            </div>
        </div>
    );
}

function FragmentoDeDia({ dia, itens }) {
    return (
        <>
            <li className="v2-timeline__grupo" aria-hidden="true">
                {formatarDiaLongo(`${dia}T12:00:00-03:00`)}
            </li>
            {itens.map((log) => (
                <li key={log.id} className="v2-timeline__item" data-tipo={log.tipo}>
                    <span className="v2-timeline__hora">{formatarHora(log.criadoEm)}</span>
                    <div className="v2-timeline__conteudo">
                        <p className="v2-timeline__evento">
                            {log.evento}
                            <span className="ml-2 align-middle">
                                <Chip tom={tomPorEvento[log.tipo] ?? 'neutro'}>{log.tipo}</Chip>
                            </span>
                        </p>
                        <p className="v2-timeline__descricao">{log.descricao}</p>
                    </div>
                </li>
            ))}
        </>
    );
}

function LinhaDeOperacao({ rotulo, valor, tom, texto }) {
    return (
        <div className="flex items-start justify-between gap-3 border-b border-[var(--v2-line)] pb-2.5 last:border-0 last:pb-0">
            <div className="min-w-0">
                <p className="text-xs font-medium">{rotulo}</p>
                <p className="mt-0.5 break-words text-[0.6875rem] leading-4 text-[var(--v2-ink-2)]">{valor}</p>
            </div>
            <Chip tom={tom}>{texto}</Chip>
        </div>
    );
}

Painel.layout = [LayoutPreview];
