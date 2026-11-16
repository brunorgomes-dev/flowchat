import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ChevronUp,
    Download,
    FileText,
    Info,
    LoaderCircle,
    Megaphone,
    MessageCircle,
    Search,
    SendHorizontal,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import LayoutV2 from '@/components/v2/LayoutV2';
import { Avatar, Aviso, Chip, Esqueleto, Gaveta, Vazio } from '@/components/v2/pecas';
import {
    chaveDoDia,
    formatarDataHora,
    formatarHora,
    nomeDoContato,
    resumoMensagem,
    rotuloMidia,
    urlSegura,
} from '@/components/v2/formato';

function origemEhAnuncio(origem) {
    return Boolean(origem) && (origem.categoria === 'anuncio' || Boolean(origem.ad_id));
}

function rotuloOrigem(origem) {
    if (!origem) {
        return null;
    }

    if (origemEhAnuncio(origem)) {
        return 'Anúncio';
    }

    return String(origem.source ?? '').toUpperCase() === 'SHORTLINK' ? 'Link' : 'Origem';
}

function rotuloDoDia(dia) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date(`${dia}T12:00:00`));
}

export default function Conversas({ conversas, conversa = null }) {
    const pagina = usePage();
    const parametrosAtuais = new URLSearchParams((pagina.url ?? '').split('?')[1] ?? '');
    const buscaInicial = parametrosAtuais.get('busca') ?? '';
    const adId = parametrosAtuais.get('ad_id') ?? '';

    const [busca, setBusca] = useState(buscaInicial);
    const [extras, setExtras] = useState([]);
    const [carregandoLista, setCarregandoLista] = useState(false);
    const [carregandoMais, setCarregandoMais] = useState(false);
    const [carregandoThread, setCarregandoThread] = useState(false);
    const [carregandoAnteriores, setCarregandoAnteriores] = useState(false);
    const [mensagensAntigas, setMensagensAntigas] = useState([]);
    const [temMaisThread, setTemMaisThread] = useState(Boolean(conversa?.tem_mais));
    const [temMaisLista, setTemMaisLista] = useState(Boolean(conversas?.next_page_url));
    const [detalhesAbertos, setDetalhesAbertos] = useState(false);
    const [erroLista, setErroLista] = useState(null);
    const [erroThread, setErroThread] = useState(null);
    const form = useForm({ texto: '' });
    const corpoDaThread = useRef(null);
    const temporizador = useRef(null);

    const listaBase = conversas?.data ?? [];
    const contatoSelecionado = conversa?.contato ?? null;
    const totalConversas = conversas?.total ?? listaBase.length;

    const lista = useMemo(() => {
        const mapa = new Map();

        [...listaBase, ...extras].forEach((contato) => mapa.set(contato.id, contato));

        return [...mapa.values()];
    }, [listaBase, extras]);

    const mensagens = useMemo(() => {
        const mapa = new Map();

        [...mensagensAntigas, ...(conversa?.mensagens ?? [])].forEach((mensagem) => mapa.set(mensagem.id, mensagem));

        return [...mapa.values()].sort((a, b) => a.id - b.id);
    }, [mensagensAntigas, conversa?.mensagens]);

    const grupos = useMemo(() => {
        const mapa = new Map();

        mensagens.forEach((mensagem) => {
            const dia = chaveDoDia(mensagem.created_at);

            if (!mapa.has(dia)) {
                mapa.set(dia, []);
            }

            mapa.get(dia).push(mensagem);
        });

        return [...mapa.entries()];
    }, [mensagens]);

    useEffect(() => {
        if (extras.length === 0) {
            setTemMaisLista(Boolean(conversas?.next_page_url));
        }
    }, [conversas?.next_page_url, extras.length]);

    useEffect(() => {
        const corpo = corpoDaThread.current;

        if (corpo) {
            corpo.scrollTop = corpo.scrollHeight;
        }
    }, [contatoSelecionado?.id, mensagens.length]);

    useEffect(() => {
        form.reset();
        form.clearErrors();
        setMensagensAntigas([]);
        setTemMaisThread(Boolean(conversa?.tem_mais));
        setErroThread(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contatoSelecionado?.id]);

    // Busca no servidor com debounce; preserva contato, filtro de anúncio e posição.
    useEffect(() => {
        const termo = busca.trim();
        const termoAtual = (new URLSearchParams((pagina.url ?? '').split('?')[1] ?? '').get('busca') ?? '').trim();

        if (termo === termoAtual) {
            return undefined;
        }

        setCarregandoLista(true);
        setErroLista(null);

        const temporizadorBusca = setTimeout(() => {
            router.get('/', {
                ...(termo ? { busca: termo } : {}),
                ...(adId ? { ad_id: adId } : {}),
                ...(contatoSelecionado ? { contato: contatoSelecionado.id } : {}),
            }, {
                only: ['conversas', 'conversa'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onSuccess: () => {
                    setExtras([]);
                    setDetalhesAbertos(false);
                },
                onError: () => setErroLista('Não foi possível atualizar a lista.'),
                onFinish: () => setCarregandoLista(false),
            });
        }, 450);

        return () => clearTimeout(temporizadorBusca);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca]);

    // Atualização automática a cada 30 s, somente com a aba visível.
    useEffect(() => {
        const atualizar = () => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            router.reload({
                only: contatoSelecionado ? ['conversas', 'conversa'] : ['conversas'],
                preserveScroll: true,
                preserveState: true,
            });
        };

        const intervalo = setInterval(atualizar, 30000);
        const aoMudarVisibilidade = () => {
            if (document.visibilityState === 'visible') {
                atualizar();
            }
        };

        document.addEventListener('visibilitychange', aoMudarVisibilidade);

        return () => {
            clearInterval(intervalo);
            document.removeEventListener('visibilitychange', aoMudarVisibilidade);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contatoSelecionado?.id]);

    useEffect(() => () => clearTimeout(temporizador.current), []);

    const selecionarContato = (id) => {
        setDetalhesAbertos(false);
        setCarregandoThread(true);
        router.get('/', {
            contato: id,
            ...(busca.trim() ? { busca: busca.trim() } : {}),
            ...(adId ? { ad_id: adId } : {}),
        }, {
            only: ['conversa'],
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setCarregandoThread(false),
        });
    };

    const voltarParaLista = () => {
        setDetalhesAbertos(false);
        router.get('/', {
            ...(busca.trim() ? { busca: busca.trim() } : {}),
            ...(adId ? { ad_id: adId } : {}),
        }, {
            only: ['conversa'],
            preserveScroll: true,
            preserveState: true,
        });
    };

    const carregarMaisConversas = async () => {
        if (carregandoMais || lista.length === 0) {
            return;
        }

        setCarregandoMais(true);
        setErroLista(null);

        try {
            const parametros = new URLSearchParams({
                antes_id: String(lista[lista.length - 1].id),
                ...(busca.trim() ? { busca: busca.trim() } : {}),
                ...(adId ? { ad_id: adId } : {}),
            });
            const resposta = await fetch(`/conversas/mais?${parametros}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!resposta.ok) {
                throw new Error('Falha ao carregar mais conversas.');
            }

            const dados = await resposta.json();
            setExtras((atuais) => [...atuais, ...(dados.conversas ?? [])]);
            setTemMaisLista(Boolean(dados.tem_mais));
        } catch {
            setErroLista('Não foi possível carregar mais conversas.');
        } finally {
            setCarregandoMais(false);
        }
    };

    const carregarAnteriores = async () => {
        if (!contatoSelecionado || mensagens.length === 0 || carregandoAnteriores) {
            return;
        }

        setCarregandoAnteriores(true);
        setErroThread(null);

        try {
            const resposta = await fetch(`/contatos/${contatoSelecionado.id}/mensagens?antes=${mensagens[0].id}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!resposta.ok) {
                throw new Error('Falha ao carregar mensagens anteriores.');
            }

            const dados = await resposta.json();
            setMensagensAntigas((atuais) => [...(dados.mensagens ?? []), ...atuais]);
            setTemMaisThread(Boolean(dados.tem_mais));
        } catch {
            setErroThread('Não foi possível carregar mensagens anteriores.');
        } finally {
            setCarregandoAnteriores(false);
        }
    };

    const enviar = () => {
        if (!contatoSelecionado || form.processing || !form.data.texto.trim()) {
            return;
        }

        form.post(`/contatos/${contatoSelecionado.id}/responder`, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                toast.success('Mensagem enviada', {
                    description: `Entregue para ${nomeDoContato(contatoSelecionado)} pelo Messenger.`,
                });
            },
            onError: () => {
                toast.error('Não foi possível enviar a mensagem', {
                    description: form.errors.texto ?? 'Verifique a ligação e tente novamente.',
                });
            },
        });
    };

    return (
        <>
            <div className={`v2-conversas ${contatoSelecionado ? 'v2-conversas--com-contato' : ''}`}>
                <section className="v2-conversas__lista" aria-label="Lista de conversas">
                    <div className="v2-conversas__topo">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h1 className="text-base font-semibold">Conversas</h1>
                                <p className="text-[0.6875rem] text-[var(--v2-ink-2)]">Caixa de atendimento</p>
                            </div>
                            <Chip>{totalConversas}</Chip>
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

                        {adId && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Chip tom="marca">Anúncio {adId}</Chip>
                                <button
                                    type="button"
                                    className="v2-btn v2-btn--fantasma v2-btn--pequeno"
                                    onClick={() => router.get('/', busca.trim() ? { busca: busca.trim() } : {}, { preserveState: true, preserveScroll: true })}
                                >
                                    Remover filtro
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="v2-conversas__rolagem">
                        {carregandoLista ? (
                            <Esqueleto linhas={6} rotulo="Carregando lista de conversas" />
                        ) : lista.length === 0 ? (
                            <div className="p-4">
                                <Vazio
                                    icone={Search}
                                    titulo={busca || adId ? 'Nenhuma conversa encontrada' : 'Ainda não há conversas'}
                                    texto={busca || adId
                                        ? 'Tente outro nome, PSID ou termo do anúncio, ou remova o filtro.'
                                        : 'Os contatos aparecem aqui quando a Página receber a primeira mensagem.'}
                                    acao={(busca || adId) ? (
                                        <button
                                            type="button"
                                            className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                            onClick={() => {
                                                setBusca('');
                                                router.get('/', {}, { preserveState: true, preserveScroll: true, replace: true });
                                            }}
                                        >
                                            Limpar busca e filtros
                                        </button>
                                    ) : null}
                                />
                            </div>
                        ) : (
                            <ul className="v2-lista">
                                {lista.map((contato) => {
                                    const ativo = contato.id === contatoSelecionado?.id;
                                    const origem = contato.origem_mais_recente ?? null;
                                    const ultima = contato.ultima_mensagem ?? null;

                                    return (
                                        <li key={contato.id}>
                                            <button
                                                type="button"
                                                className={`v2-linha v2-linha--clicavel ${ativo ? 'v2-linha--ativa' : ''}`}
                                                aria-pressed={ativo}
                                                onClick={() => selecionarContato(contato.id)}
                                            >
                                                <Avatar nome={nomeDoContato(contato)} />
                                                <span className="v2-linha__corpo">
                                                    <span className="v2-linha__titulo">
                                                        <span className="v2-linha__nome">{nomeDoContato(contato)}</span>
                                                        <span className="v2-micro v2-numerico">
                                                            {formatarHora(ultima?.created_at)}
                                                        </span>
                                                    </span>
                                                    <span className="v2-linha__texto">{resumoMensagem(ultima)}</span>
                                                    {origem && (
                                                        <span className="mt-1 inline-flex">
                                                            <Chip tom={origemEhAnuncio(origem) ? 'marca' : 'neutro'}>
                                                                <Megaphone className="size-2.5" aria-hidden="true" />
                                                                {rotuloOrigem(origem)}
                                                                {origem.ad_id ? ` · ${origem.ad_id}` : ''}
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
                        <span className="v2-numerico">{lista.length} de {totalConversas}</span>
                        {temMaisLista ? (
                            <button
                                type="button"
                                className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                onClick={carregarMaisConversas}
                                disabled={carregandoMais}
                            >
                                {carregandoMais ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                                {carregandoMais ? 'Carregando…' : 'Carregar mais'}
                            </button>
                        ) : (
                            <span className="v2-micro">Todas as conversas carregadas</span>
                        )}
                    </div>
                    {erroLista && (
                        <p role="alert" className="v2-campo__erro px-3 pb-2">
                            {erroLista}
                        </p>
                    )}
                </section>

                <section className="v2-thread" aria-label="Conversa selecionada">
                    {contatoSelecionado ? (
                        <>
                            <header className="v2-thread__topo">
                                <button
                                    type="button"
                                    className="v2-btn v2-btn--fantasma v2-btn--icone v2-so-estreito"
                                    aria-label="Voltar para a lista de conversas"
                                    onClick={voltarParaLista}
                                >
                                    <ArrowLeft aria-hidden="true" />
                                </button>
                                <Avatar nome={nomeDoContato(contatoSelecionado)} />
                                <div className="min-w-0">
                                    <h2 className="truncate text-[0.8125rem] font-semibold">{nomeDoContato(contatoSelecionado)}</h2>
                                    <p className="v2-micro">
                                        PSID <span className="v2-mono text-[var(--v2-ink)]">{contatoSelecionado.psid}</span>
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
                                        {temMaisThread && (
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
                                        )}

                                        {grupos.map(([dia, itens]) => (
                                            <div key={dia} className="contents">
                                                <div className="v2-separador-data">{rotuloDoDia(dia)}</div>
                                                {itens.map((mensagem) => (
                                                    <article
                                                        key={mensagem.id}
                                                        className={`v2-bolha ${mensagem.direcao === 'enviada' ? 'v2-bolha--enviada' : 'v2-bolha--recebida'}`}
                                                    >
                                                        {mensagem.tipo_conteudo && mensagem.tipo_conteudo !== 'texto' && (
                                                            <div className="v2-anexo">
                                                                <span className="v2-anexo__icone">
                                                                    <FileText className="size-3.5" aria-hidden="true" />
                                                                </span>
                                                                <span className="min-w-0 flex-1">
                                                                    <span className="block truncate text-[0.6875rem] font-medium">
                                                                        {mensagem.anexo_nome_original ?? 'anexo'}
                                                                    </span>
                                                                    <span className="block text-[0.625rem] text-[var(--v2-ink-2)]">
                                                                        {rotuloMidia(mensagem.tipo_conteudo)} ·{' '}
                                                                        {Math.round((mensagem.anexo_tamanho_bytes ?? 0) / 1024)} KB
                                                                    </span>
                                                                </span>
                                                                <a
                                                                    href={`/mensagens/${mensagem.id}/anexo?download=1`}
                                                                    className="text-[var(--v2-ink-3)] hover:text-[var(--v2-ink)]"
                                                                    aria-label={`Baixar ${mensagem.anexo_nome_original ?? 'anexo'}`}
                                                                >
                                                                    <Download className="size-3.5" aria-hidden="true" />
                                                                </a>
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
                                <form
                                    className="mx-auto flex w-full max-w-2xl flex-col gap-1.5"
                                    onSubmit={(evento) => {
                                        evento.preventDefault();
                                        enviar();
                                    }}
                                >
                                    <div className="v2-compositor">
                                        <div className="min-w-0 flex-1">
                                            <label htmlFor="resposta-conversa" className="v2-oculto-visual">
                                                Escrever mensagem para o contato
                                            </label>
                                            <textarea
                                                id="resposta-conversa"
                                                className="v2-entrada text-[0.8125rem]"
                                                rows={1}
                                                maxLength={640}
                                                value={form.data.texto}
                                                onChange={(evento) => form.setData('texto', evento.target.value)}
                                                onKeyDown={(evento) => {
                                                    if (evento.key === 'Enter' && !evento.shiftKey) {
                                                        evento.preventDefault();
                                                        enviar();
                                                    }
                                                }}
                                                placeholder="Escrever mensagem…"
                                                aria-invalid={Boolean(form.errors.texto)}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="v2-btn v2-btn--primario v2-enviar"
                                            disabled={form.processing || !form.data.texto.trim()}
                                            aria-label="Enviar mensagem"
                                        >
                                            {form.processing ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <SendHorizontal aria-hidden="true" />}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="v2-micro">{form.data.texto.length}/640 caracteres · Enter envia, Shift+Enter quebra linha</span>
                                        <span className="v2-micro">A resposta é enviada pelo Messenger</span>
                                    </div>
                                    {form.errors.texto && (
                                        <span className="v2-campo__erro" role="alert">{form.errors.texto}</span>
                                    )}
                                </form>
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
                                    A lista mostra nome, prévia da última mensagem e origem. Os detalhes do contato abrem em
                                    painel lateral, com acesso ao histórico.
                                </p>
                                {lista.length > 0 && (
                                    <button
                                        type="button"
                                        className="v2-btn v2-btn--contorno mt-4"
                                        onClick={() => selecionarContato(lista[0].id)}
                                    >
                                        Abrir primeira conversa
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {contatoSelecionado && (
                    <aside className="v2-ficha" aria-label="Detalhes do contato">
                        <FichaDoContato contato={contatoSelecionado} totalMensagens={conversa?.total_mensagens ?? mensagens.length} />
                    </aside>
                )}
            </div>

            <Gaveta aberto={detalhesAbertos} titulo="Detalhes do contato" aoFechar={() => setDetalhesAbertos(false)}>
                {contatoSelecionado && (
                    <FichaDoContato contato={contatoSelecionado} totalMensagens={conversa?.total_mensagens ?? mensagens.length} />
                )}
            </Gaveta>
        </>
    );
}

function FichaDoContato({ contato, totalMensagens }) {
    const anuncio = contato?.origem_mais_recente ?? null;
    const foto = urlSegura(anuncio?.photo_url);
    const video = urlSegura(anuncio?.video_url);

    return (
        <>
            <div className="v2-ficha__bloco">
                <div className="flex items-center gap-3">
                    <Avatar nome={nomeDoContato(contato)} tamanho="grande" marca />
                    <span className="min-w-0">
                        <span className="block truncate text-[0.8125rem] font-semibold">{nomeDoContato(contato)}</span>
                        <span className="v2-micro">{totalMensagens ?? 0} mensagens no total</span>
                    </span>
                </div>
            </div>

            <div className="v2-ficha__bloco">
                <dl className="v2-dados">
                    <div>
                        <dt>PSID</dt>
                        <dd className="v2-mono">{contato.psid}</dd>
                    </div>
                </dl>
            </div>

            <div className="v2-ficha__bloco">
                <p className="v2-micro">Origem do contato</p>
                {anuncio ? (
                    <div className="mt-2 space-y-2">
                        <Chip tom={origemEhAnuncio(anuncio) ? 'marca' : 'neutro'}>
                            <Megaphone className="size-2.5" aria-hidden="true" />
                            {rotuloOrigem(anuncio)}
                        </Chip>
                        <dl className="v2-dados">
                            {anuncio.ad_id && (
                                <div>
                                    <dt>ID do anúncio</dt>
                                    <dd className="v2-mono">{anuncio.ad_id}</dd>
                                </div>
                            )}
                            {anuncio.ad_title && (
                                <div>
                                    <dt>Anúncio</dt>
                                    <dd>{anuncio.ad_title}</dd>
                                </div>
                            )}
                            {anuncio.post_id && (
                                <div>
                                    <dt>Publicação</dt>
                                    <dd className="v2-mono">{anuncio.post_id}</dd>
                                </div>
                            )}
                            {anuncio.product_id && (
                                <div>
                                    <dt>Produto</dt>
                                    <dd className="v2-mono">{anuncio.product_id}</dd>
                                </div>
                            )}
                            {anuncio.referencia && (
                                <div>
                                    <dt>Referência</dt>
                                    <dd className="v2-mono">{anuncio.referencia}</dd>
                                </div>
                            )}
                            {anuncio.referer_uri && (
                                <div>
                                    <dt>Origem do link</dt>
                                    <dd className="v2-quebra">{anuncio.referer_uri}</dd>
                                </div>
                            )}
                        </dl>
                        {anuncio.mensagem_inicial && (
                            <blockquote className="border-l-2 border-[var(--v2-terracota)] bg-[var(--v2-surface-2)] px-2 py-1.5 text-[0.6875rem] leading-5">
                                {anuncio.mensagem_inicial}
                            </blockquote>
                        )}
                        {foto && (
                            <a href={foto} target="_blank" rel="noopener noreferrer" className="v2-btn v2-btn--fantasma v2-btn--pequeno">
                                Abrir criativo do anúncio
                            </a>
                        )}
                        {video && (
                            <a href={video} target="_blank" rel="noopener noreferrer" className="v2-btn v2-btn--fantasma v2-btn--pequeno">
                                Abrir vídeo do anúncio
                            </a>
                        )}
                    </div>
                ) : (
                    <p className="mt-2 text-xs leading-5 text-[var(--v2-ink-2)]">
                        Nenhuma origem registrada. O contato chegou diretamente pelo Messenger.
                    </p>
                )}
            </div>

            <div className="v2-ficha__bloco">
                <Link href={`/contatos/${contato.id}/historico`} className="v2-btn v2-btn--contorno v2-btn--bloco">
                    Ver histórico completo
                </Link>
            </div>
        </>
    );
}

Conversas.layout = [LayoutV2];
