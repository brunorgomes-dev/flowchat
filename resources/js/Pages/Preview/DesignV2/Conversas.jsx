import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ChevronUp,
    Download,
    FileText,
    Info,
    Megaphone,
    MessageCircle,
    Paperclip,
    Search,
    SendHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import LayoutPreview from './_components/LayoutPreview';
import {
    Avatar,
    Chip,
    Esqueleto,
    Gaveta,
    Segmentado,
    SeloLeitura,
    Vazio,
} from './_components/pecas';
import {
    chaveDoDia,
    contatos,
    formatarDataHora,
    formatarHora,
    nomeDoContato,
    resumoMensagem,
    rotuloOrigem,
    origemEhAnuncio,
    rotulosTipoConteudo,
} from './_data/demonstracao';

/* Histórico adicional apenas para demonstrar o carregamento incremental. */
const historicoSimulado = {
    1: [
        {
            id: 0.1,
            direcao: 'recebida',
            texto: 'Oi! Vi a coleção no Instagram e queria saber os preços.',
            tipo_conteudo: 'texto',
            created_at: '2026-11-12T16:02:00-03:00',
        },
        {
            id: 0.2,
            direcao: 'enviada',
            texto: 'Oi, Ana! Os vestidos ficam entre R$ 289 e R$ 419. Quer que eu separe as opções?',
            tipo_conteudo: 'texto',
            created_at: '2026-11-12T16:04:00-03:00',
        },
    ],
};

const filtrosOrigem = [
    { valor: 'todas', rotulo: 'Todas' },
    { valor: 'anuncio', rotulo: 'Anúncio' },
    { valor: 'link', rotulo: 'Link' },
];

function rotuloDoDia(valor) {
    const formatador = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' });

    return formatador.format(new Date(`${valor}T12:00:00-03:00`));
}

export default function Conversas() {
    const [busca, setBusca] = useState('');
    const [filtroOrigem, setFiltroOrigem] = useState('todas');
    const [limite, setLimite] = useState(4);
    const [carregandoMais, setCarregandoMais] = useState(false);
    const [contatoId, setContatoId] = useState(1);
    const [detalhesAbertos, setDetalhesAbertos] = useState(false);
    const [carregandoLista, setCarregandoLista] = useState(false);
    const [carregandoThread, setCarregandoThread] = useState(false);
    const [carregandoAnteriores, setCarregandoAnteriores] = useState(false);
    const [anteriores, setAnteriores] = useState([]);
    const [texto, setTexto] = useState('');
    const [erroTexto, setErroTexto] = useState(null);
    const corpoDaThread = useRef(null);
    const temporizador = useRef(null);

    const contato = contatos.find((item) => item.id === contatoId) ?? null;

    const listaFiltrada = useMemo(() => {
        const termo = busca.trim().toLocaleLowerCase('pt-BR');

        return contatos.filter((item) => {
            const combinaTermo = !termo
                || nomeDoContato(item).toLocaleLowerCase('pt-BR').includes(termo)
                || item.psid.toLowerCase().includes(termo)
                || (item.origem?.ad_title ?? '').toLowerCase().includes(termo)
                || item.mensagens.some((mensagem) => (mensagem.texto ?? '').toLowerCase().includes(termo));

            const combinaOrigem = filtroOrigem === 'todas'
                || (filtroOrigem === 'anuncio' && origemEhAnuncio(item.origem))
                || (filtroOrigem === 'link' && item.origem?.categoria === 'link');

            return combinaTermo && combinaOrigem;
        });
    }, [busca, filtroOrigem]);

    const listaVisivel = listaFiltrada.slice(0, limite);
    const temMaisLista = listaVisivel.length < listaFiltrada.length;

    useEffect(() => {
        setLimite(4);
    }, [busca, filtroOrigem]);

    const carregarMais = () => {
        setCarregandoMais(true);
        temporizador.current = setTimeout(() => {
            setLimite((atual) => atual + 4);
            setCarregandoMais(false);
        }, 300);
    };

    const mensagens = useMemo(() => {
        if (!contato) {
            return [];
        }

        const extras = anteriores.filter((item) => item.contatoId === contato.id);

        return [...extras, ...contato.mensagens].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }, [contato, anteriores]);

    const gruposDeMensagens = useMemo(() => {
        const mapa = new Map();

        mensagens.forEach((mensagem) => {
            const chave = chaveDoDia(mensagem.created_at);

            if (!mapa.has(chave)) {
                mapa.set(chave, []);
            }

            mapa.get(chave).push(mensagem);
        });

        return [...mapa.entries()];
    }, [mensagens]);

    // Rola apenas a área da conversa. `scrollIntoView` deslocava a página
    // inteira no celular e escondia o cabeçalho do contato sob o topo fixo.
    useEffect(() => {
        const corpo = corpoDaThread.current;

        if (corpo) {
            corpo.scrollTop = corpo.scrollHeight;
        }
    }, [contatoId, mensagens.length]);

    useEffect(() => () => clearTimeout(temporizador.current), []);

    const selecionarContato = (id) => {
        setContatoId(id);
        setDetalhesAbertos(false);
        setAnteriores([]);
        setTexto('');
        setErroTexto(null);
        setCarregandoThread(true);
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => setCarregandoThread(false), 320);
    };

    const filtrar = (valor) => {
        setFiltroOrigem(valor);
        setCarregandoLista(true);
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => setCarregandoLista(false), 260);
    };

    const carregarAnteriores = () => {
        if (!contato) {
            return;
        }

        setCarregandoAnteriores(true);
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => {
            const antigas = (historicoSimulado[contato.id] ?? []).map((item) => ({ ...item, contatoId: contato.id }));
            setAnteriores((atuais) => [...antigas, ...atuais]);
            setCarregandoAnteriores(false);
            toast.info('Histórico anterior carregado (simulação)');
        }, 400);
    };

    const enviar = () => {
        if (!texto.trim()) {
            setErroTexto('Escreva uma mensagem antes de enviar.');
            return;
        }

        setErroTexto(null);
        toast.success('Resposta simulada', {
            description: `Nada foi enviado ao Messenger. O rascunho para ${nomeDoContato(contato)} foi descartado.`,
        });
        setTexto('');
    };

    return (
        <>
            <div className={`v2-conversas ${contato ? 'v2-conversas--com-contato' : ''}`}>
                <section className="v2-conversas__lista" aria-label="Lista de conversas">
                    <div className="v2-conversas__topo">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h1 className="text-base font-semibold">Conversas</h1>
                                <p className="text-[0.6875rem] text-[var(--v2-ink-2)]">
                                    Caixa de atendimento · somente leitura
                                </p>
                            </div>
                            <Chip>{contatos.length}</Chip>
                        </div>

                        <div className="relative mt-3">
                            <Search
                                className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--v2-ink-3)]"
                                aria-hidden="true"
                            />
                            <input
                                type="search"
                                value={busca}
                                onChange={(evento) => setBusca(evento.target.value)}
                                placeholder="Buscar por nome, PSID, anúncio ou mensagem"
                                aria-label="Buscar conversas"
                                className="v2-entrada v2-entrada--icone"
                            />
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                            <Segmentado rotulo="Filtrar por origem" opcoes={filtrosOrigem} valor={filtroOrigem} aoAlterar={filtrar} />
                            <span className="v2-micro v2-numerico">{listaFiltrada.length} de {contatos.length}</span>
                        </div>
                    </div>

                    <div className="v2-conversas__rolagem">
                        {carregandoLista ? (
                            <Esqueleto linhas={6} rotulo="Carregando lista de conversas" />
                        ) : listaFiltrada.length === 0 ? (
                            <div className="p-4">
                                <Vazio
                                    icone={Search}
                                    titulo="Nenhuma conversa encontrada"
                                    texto="Tente outro nome, PSID ou termo do anúncio. O filtro de origem também pode estar restringindo a lista."
                                    acao={
                                        <button
                                            type="button"
                                            className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                            onClick={() => {
                                                setBusca('');
                                                filtrar('todas');
                                            }}
                                        >
                                            Limpar busca e filtros
                                        </button>
                                    }
                                />
                            </div>
                        ) : (
                            <ul className="v2-lista">
                                {listaVisivel.map((item) => {
                                    const ativo = item.id === contatoId;
                                    const ultima = item.mensagens[item.mensagens.length - 1];

                                    return (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                className={`v2-linha v2-linha--clicavel ${ativo ? 'v2-linha--ativa' : ''}`}
                                                aria-pressed={ativo}
                                                onClick={() => selecionarContato(item.id)}
                                            >
                                                <Avatar nome={nomeDoContato(item)} />
                                                <span className="v2-linha__corpo">
                                                    <span className="v2-linha__titulo">
                                                        <span className="v2-linha__nome">
                                                            {nomeDoContato(item)}
                                                            {item.naoLidas > 0 && (
                                                                <span
                                                                    className="ml-1.5 inline-block size-1.5 rounded-full bg-[var(--v2-terracota)] align-middle"
                                                                    aria-label={`${item.naoLidas} mensagens não lidas`}
                                                                />
                                                            )}
                                                        </span>
                                                        <span className="v2-micro v2-numerico">
                                                            {formatarHora(item.ultimaMensagemEm)}
                                                        </span>
                                                    </span>
                                                    <span className="v2-linha__texto">{resumoMensagem(ultima)}</span>
                                                    {item.origem && (
                                                        <span className="mt-1 inline-flex">
                                                            <Chip tom={origemEhAnuncio(item.origem) ? 'marca' : 'neutro'}>
                                                                <Megaphone className="size-2.5" aria-hidden="true" />
                                                                {rotuloOrigem(item.origem)}
                                                                {item.origem.ad_id ? ` · ${item.origem.ad_id}` : ''}
                                                            </Chip>
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <div className="v2-conversas__rodape">
                        <span className="v2-numerico">{listaVisivel.length} de {listaFiltrada.length}</span>
                        {temMaisLista ? (
                            <button
                                type="button"
                                className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                onClick={carregarMais}
                                disabled={carregandoMais}
                            >
                                {carregandoMais ? 'Carregando…' : 'Carregar mais'}
                            </button>
                        ) : (
                            <span className="v2-micro">Todas as conversas carregadas</span>
                        )}
                    </div>
                </section>

                <section className="v2-thread" aria-label="Conversa selecionada">
                    {contato ? (
                        <>
                            <header className="v2-thread__topo">
                                <button
                                    type="button"
                                    className="v2-btn v2-btn--fantasma v2-btn--icone v2-so-estreito"
                                    aria-label="Voltar para a lista de conversas"
                                    onClick={() => setContatoId(null)}
                                >
                                    <ArrowLeft aria-hidden="true" />
                                </button>
                                <Avatar nome={nomeDoContato(contato)} />
                                <div className="min-w-0">
                                    <h2 className="truncate text-[0.8125rem] font-semibold">{nomeDoContato(contato)}</h2>
                                    <p className="v2-micro">
                                        PSID <span className="v2-mono text-[var(--v2-ink)]">{contato.psid}</span>
                                    </p>
                                </div>
                                <div className="v2-thread__acoes">
                                    <button
                                        type="button"
                                        className="v2-btn v2-btn--contorno v2-btn--pequeno v2-so-ate-medio"
                                        aria-expanded={detalhesAbertos}
                                        onClick={() => setDetalhesAbertos(true)}
                                    >
                                        <Info aria-hidden="true" />
                                        Detalhes
                                    </button>
                                </div>
                            </header>

                            <div className="v2-thread__corpo" ref={corpoDaThread}>
                                {carregandoThread ? (
                                    <div className="mx-auto max-w-2xl">
                                        <Esqueleto linhas={5} rotulo="Carregando conversa" />
                                    </div>
                                ) : (
                                    <div className="v2-rolagem-mensagens">
                                        <div className="flex justify-center">
                                            <button
                                                type="button"
                                                className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                                onClick={carregarAnteriores}
                                                disabled={carregandoAnteriores}
                                            >
                                                <ChevronUp aria-hidden="true" />
                                                {carregandoAnteriores ? 'Carregando…' : 'Carregar mensagens anteriores'}
                                            </button>
                                        </div>

                                        {gruposDeMensagens.map(([dia, itens]) => (
                                            <div key={dia} className="contents">
                                                <div className="v2-separador-data">{rotuloDoDia(dia)}</div>
                                                {itens.map((mensagem) => (
                                                    <article
                                                        key={`${mensagem.id}-${mensagem.created_at}`}
                                                        className={`v2-bolha ${mensagem.direcao === 'enviada' ? 'v2-bolha--enviada' : 'v2-bolha--recebida'}`}
                                                    >
                                                        {mensagem.tipo_conteudo !== 'texto' && (
                                                            <div className="v2-anexo">
                                                                <span className="v2-anexo__icone">
                                                                    <FileText className="size-3.5" aria-hidden="true" />
                                                                </span>
                                                                <span className="min-w-0 flex-1">
                                                                    <span className="block truncate text-[0.6875rem] font-medium">
                                                                        {mensagem.anexo_nome_original ?? 'anexo'}
                                                                    </span>
                                                                    <span className="block text-[0.625rem] text-[var(--v2-ink-2)]">
                                                                        {rotulosTipoConteudo[mensagem.tipo_conteudo]} ·{' '}
                                                                        {Math.round((mensagem.anexo_tamanho_bytes ?? 0) / 1024)} KB
                                                                    </span>
                                                                </span>
                                                                <span className="text-[var(--v2-ink-3)]" title="Download indisponível no preview">
                                                                    <Download className="size-3.5" aria-hidden="true" />
                                                                </span>
                                                            </div>
                                                        )}
                                                        {mensagem.texto && <p className="v2-bolha__texto">{mensagem.texto}</p>}
                                                        <p className="v2-bolha__meta">
                                                            <span>{mensagem.direcao === 'enviada' ? 'Enviada' : 'Recebida'}</span>
                                                            <span aria-hidden="true">·</span>
                                                            <span className="v2-numerico">{formatarDataHora(mensagem.created_at)}</span>
                                                        </p>
                                                    </article>
                                                ))}
                                            </div>
                                        ))}

                                        {mensagens.length === 0 && (
                                            <Vazio
                                                icone={MessageCircle}
                                                titulo="Nenhuma mensagem registrada"
                                                texto="O histórico desta conversa aparecerá aqui quando houver mensagens."
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="v2-thread__compositor">
                                <div className="mx-auto flex max-w-2xl flex-col gap-1">
                                    <div className="v2-compositor">
                                        <div className="min-w-0 flex-1">
                                            <label htmlFor="resposta" className="v2-oculto-visual">
                                                Escrever mensagem para o contato
                                            </label>
                                            <textarea
                                                id="resposta"
                                                className="v2-entrada text-[0.8125rem]"
                                                rows={1}
                                                maxLength={640}
                                                value={texto}
                                                onChange={(evento) => {
                                                    setTexto(evento.target.value);
                                                    setErroTexto(null);
                                                }}
                                                onKeyDown={(evento) => {
                                                    if (evento.key === 'Enter' && !evento.shiftKey) {
                                                        evento.preventDefault();
                                                        enviar();
                                                    }
                                                }}
                                                placeholder="Escrever mensagem…"
                                                aria-invalid={Boolean(erroTexto)}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="v2-btn v2-btn--primario v2-enviar"
                                            aria-label="Enviar mensagem"
                                            onClick={enviar}
                                        >
                                            <SendHorizontal aria-hidden="true" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="v2-micro">
                                            {texto.length}/640 caracteres · Enter envia, Shift+Enter quebra linha
                                        </span>
                                        <span className="v2-micro inline-flex items-center gap-1">
                                            <Paperclip className="size-3" aria-hidden="true" />
                                            Anexos fora do escopo da V2
                                        </span>
                                    </div>                                    {erroTexto && (
                                        <span className="v2-campo__erro" role="alert">
                                            {erroTexto}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 items-center justify-center p-6">
                            <div className="max-w-sm text-center">
                                <span className="mx-auto flex size-11 items-center justify-center border border-[var(--v2-line)] bg-[var(--v2-surface)] text-[var(--v2-destaque)]">
                                    <MessageCircle className="size-5" aria-hidden="true" />
                                </span>
                                <h2 className="mt-4 text-lg font-semibold">Selecione uma conversa</h2>
                                <p className="mt-1.5 text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                                    A lista mostra nome, prévia da última mensagem, origem e horário. A conversa abre com
                                    histórico completo, ficha do contato e compositor.
                                </p>
                                <button
                                    type="button"
                                    className="v2-btn v2-btn--contorno mt-4"
                                    onClick={() => setContatoId(contatos[0]?.id ?? null)}
                                >
                                    Abrir primeira conversa
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {contato && (
                    <aside className="v2-ficha" aria-label="Detalhes do contato">
                        <div className="v2-ficha__bloco">
                            <div className="flex items-center justify-between">
                                <span className="v2-micro">Ficha do contato</span>
                                <SeloLeitura texto="Demonstração" />
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                                <Avatar nome={nomeDoContato(contato)} tamanho="grande" marca />
                                <div className="min-w-0">
                                    <p className="truncate text-[0.8125rem] font-semibold">{nomeDoContato(contato)}</p>
                                    <p className="v2-micro">{contato.mensagens_count} mensagens</p>
                                </div>
                            </div>
                        </div>
                        <FichaDoContato contato={contato} />
                    </aside>
                )}
            </div>

            <Gaveta
                aberto={detalhesAbertos}
                titulo="Detalhes do contato"
                aoFechar={() => setDetalhesAbertos(false)}
            >
                {contato && <FichaDoContato contato={contato} />}
            </Gaveta>
        </>
    );
}

function FichaDoContato({ contato }) {
    return (
        <>
            <div className="v2-ficha__bloco">
                <dl className="v2-dados">
                    <div>
                        <dt>PSID</dt>
                        <dd className="v2-mono">{contato.psid}</dd>
                    </div>
                    <div>
                        <dt>Mensagens</dt>
                        <dd className="v2-numerico">{contato.mensagens_count}</dd>
                    </div>
                    <div>
                        <dt>Não lidas</dt>
                        <dd className="v2-numerico">{contato.naoLidas}</dd>
                    </div>
                    <div>
                        <dt>Última</dt>
                        <dd className="v2-numerico">{formatarDataHora(contato.ultimaMensagemEm)}</dd>
                    </div>
                </dl>
            </div>

            <div className="v2-ficha__bloco">
                <p className="v2-micro">Origem do contato</p>
                {contato.origem ? (
                    <div className="mt-2 space-y-2">
                        <Chip tom={origemEhAnuncio(contato.origem) ? 'marca' : 'neutro'}>
                            <Megaphone className="size-2.5" aria-hidden="true" />
                            {rotuloOrigem(contato.origem)}
                        </Chip>
                        <dl className="v2-dados">
                            {contato.origem.ad_id && (
                                <div>
                                    <dt>ID do anúncio</dt>
                                    <dd className="v2-mono">{contato.origem.ad_id}</dd>
                                </div>
                            )}
                            {contato.origem.ad_title && (
                                <div>
                                    <dt>Anúncio</dt>
                                    <dd>{contato.origem.ad_title}</dd>
                                </div>
                            )}
                            {contato.origem.post_id && (
                                <div>
                                    <dt>Publicação</dt>
                                    <dd className="v2-mono">{contato.origem.post_id}</dd>
                                </div>
                            )}
                            {contato.origem.product_id && (
                                <div>
                                    <dt>Produto</dt>
                                    <dd className="v2-mono">{contato.origem.product_id}</dd>
                                </div>
                            )}
                            {contato.origem.referencia && (
                                <div>
                                    <dt>Referência</dt>
                                    <dd className="v2-mono">{contato.origem.referencia}</dd>
                                </div>
                            )}
                            {contato.origem.referer_uri && (
                                <div>
                                    <dt>Origem do link</dt>
                                    <dd className="v2-quebra">{contato.origem.referer_uri}</dd>
                                </div>
                            )}
                        </dl>
                        {contato.origem.mensagem_inicial && (
                            <blockquote className="border-l-2 border-[var(--v2-terracota)] bg-[var(--v2-surface-2)] px-2 py-1.5 text-[0.6875rem] leading-5">
                                {contato.origem.mensagem_inicial}
                            </blockquote>
                        )}
                        <p className="v2-campo__ajuda">
                            O criativo do anúncio não é carregado no preview para não fazer chamadas externas.
                        </p>
                    </div>
                ) : (
                    <p className="mt-2 text-xs leading-5 text-[var(--v2-ink-2)]">
                        Nenhuma origem registrada. O contato chegou diretamente pelo Messenger.
                    </p>
                )}
            </div>

            <div className="v2-ficha__bloco space-y-2">
                <Link href="/preview/design-v2/conversas/historico" className="v2-btn v2-btn--contorno v2-btn--bloco">
                    Ver histórico completo
                </Link>
                <p className="v2-campo__ajuda">
                    A resposta manual é simulada na conversa ao lado. Nenhuma mensagem sai do ambiente e nenhum anexo
                    real é aberto.
                </p>
            </div>
        </>
    );
}

Conversas.layout = [LayoutPreview];
