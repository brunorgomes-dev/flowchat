import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    ArrowLeft,
    ChevronRight,
    ChevronUp,
    ExternalLink,
    Info,
    Link2,
    LoaderCircle,
    Megaphone,
    MessagesSquare,
    Search,
    SendHorizontal,
    UserRound,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { MensagemBubble } from '@/components/MensagemBubble';

function nomeDoContato(contato) {
    return contato.nome?.trim() || contato.psid || 'Contato sem identificação';
}

function iniciaisDoContato(contato) {
    const nome = nomeDoContato(contato);
    const partes = nome.trim().split(/\s+/);

    if (partes.length > 1) {
        return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
    }

    return nome.slice(0, 2).toUpperCase();
}

function formatarHorario(valor) {
    if (!valor) {
        return null;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return null;
    }

    const hoje = new Date();
    const eHoje = data.toDateString() === hoje.toDateString();

    return new Intl.DateTimeFormat('pt-BR', eHoje
        ? { hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: '2-digit' }).format(data);
}

function resumoMensagem(mensagem) {
    if (!mensagem) {
        return 'Nenhuma mensagem registrada';
    }

    if (mensagem.tipo_conteudo && mensagem.tipo_conteudo !== 'texto') {
        return `Mídia: ${mensagem.anexo_nome_original || mensagem.tipo_conteudo}`;
    }

    return mensagem.texto || 'Nenhuma mensagem registrada';
}

function origemDoContato(contato) {
    return contato?.origem_mais_recente ?? null;
}

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

    if (String(origem.source ?? '').toUpperCase() === 'SHORTLINK') {
        return 'Link';
    }

    return 'Origem';
}

function urlSegura(valor) {
    if (typeof valor !== 'string' || valor.trim() === '') {
        return null;
    }

    try {
        const url = new URL(valor);

        return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
    } catch {
        return null;
    }
}

function OrigemContatoCard({ origem }) {
    if (!origem) {
        return null;
    }

    const anuncio = origemEhAnuncio(origem);
    const foto = urlSegura(origem.photo_url);
    const video = urlSegura(origem.video_url);
    const campos = [
        { rotulo: 'ID do anúncio', valor: origem.ad_id, mono: true },
        { rotulo: 'Nome do anúncio', valor: origem.ad_title },
        { rotulo: 'ID da publicação', valor: origem.post_id, mono: true },
        { rotulo: 'Produto', valor: origem.product_id, mono: true },
        { rotulo: 'Referência', valor: origem.referencia, mono: true },
        { rotulo: 'Origem do link', valor: origem.referer_uri },
    ].filter((campo) => campo.valor !== null && campo.valor !== undefined && String(campo.valor).trim() !== '');

    return (
        <section className={`mt-5 rounded-xl border p-4 text-left ${anuncio
            ? 'border-terracota/30 bg-terracota/5'
            : 'border-border bg-muted/40'}`}>
            <div className="flex items-start gap-3">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${anuncio
                    ? 'bg-terracota/15 text-terracota-escuro dark:text-terracota'
                    : 'bg-muted text-muted-foreground'}`}>
                    {anuncio ? <Megaphone className="size-4" /> : <Link2 className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">Origem do contato</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${anuncio
                            ? 'bg-terracota/15 text-terracota-escuro dark:text-terracota'
                            : 'bg-muted text-muted-foreground'}`}>
                            {rotuloOrigem(origem)}
                        </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                        {anuncio
                            ? 'Esta conversa foi iniciada a partir de um anúncio do Facebook.'
                            : 'Referência recebida pelo Messenger ao iniciar a conversa.'}
                    </p>
                </div>
            </div>

            {campos.length > 0 && (
                <dl className="mt-4 space-y-2.5 border-t border-border/70 pt-4">
                    {campos.map((campo) => (
                        <div key={campo.rotulo} className="flex items-start justify-between gap-3">
                            <dt className="shrink-0 text-[11px] text-muted-foreground">{campo.rotulo}</dt>
                            <dd className={`min-w-0 break-all text-right text-xs font-medium text-foreground ${campo.mono ? 'font-mono tabular-nums' : ''}`}>
                                {campo.valor}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            {origem.mensagem_inicial && (
                <div className="mt-4 border-t border-border/70 pt-4">
                    <p className="text-[11px] font-medium text-muted-foreground">Mensagem inicial do contato</p>
                    <blockquote className="mt-2 rounded-lg border-l-2 border-terracota/50 bg-background px-3 py-2 text-xs leading-5 text-foreground">
                        {origem.mensagem_inicial}
                    </blockquote>
                </div>
            )}

            {(foto || video) && (
                <div className="mt-4 border-t border-border/70 pt-4">
                    <p className="text-[11px] font-medium text-muted-foreground">Criativo do anúncio</p>
                    {foto && (
                        <a
                            href={foto}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block overflow-hidden rounded-lg border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                            title="Abrir criativo do anúncio"
                        >
                            <img
                                src={foto}
                                alt={origem.ad_title ? `Criativo do anúncio ${origem.ad_title}` : 'Criativo do anúncio'}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="aspect-video w-full object-cover"
                            />
                        </a>
                    )}
                    {video && (
                        <a
                            href={video}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-terracota-escuro hover:underline dark:text-terracota"
                        >
                            <ExternalLink className="size-3.5" />
                            Abrir criativo em vídeo
                        </a>
                    )}
                </div>
            )}
        </section>
    );
}

// Atualiza lista e prévia a cada 30s, somente com a aba visível
function AtualizacaoAutomatica({ contatoId }) {
    useEffect(() => {
        const atualizar = () => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            router.reload({
                only: contatoId ? ['conversas', 'conversa'] : ['conversas'],
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
    }, [contatoId]);

    return null;
}

function Avatar({ contato, size = 'regular' }) {
    const sizeClass = size === 'large' ? 'size-14 text-base' : 'size-11 text-sm';

    return (
        <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-terracota/10 font-semibold text-terracota-escuro dark:text-foreground ${sizeClass}`}>
            {iniciaisDoContato(contato)}
        </div>
    );
}

function PainelDetalhes({ contato, compacto = false, onClose }) {
    return (
        <section className={compacto
            ? 'max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl'
            : 'flex h-full flex-col overflow-y-auto bg-card'}>
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Contato</p>
                    <h2 className="mt-1 text-base font-semibold text-foreground">Detalhes</h2>
                </div>
                {onClose && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground xl:hidden"
                        aria-label="Fechar detalhes do contato"
                        onClick={onClose}
                    >
                        <X />
                    </Button>
                )}
            </div>

            <div className="flex flex-col items-center px-6 py-8 text-center">
                <Avatar contato={contato} size="large" />
                <h3 className="mt-4 max-w-full break-words text-lg font-semibold text-foreground">
                    {nomeDoContato(contato)}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">Identificação disponível</p>
            </div>

            <div className="px-6">
                <div className="border-t border-border pt-5">
                    <p className="text-xs font-medium text-muted-foreground">PSID</p>
                    <p className="mt-2 break-all text-sm font-medium leading-6 text-foreground">
                        {contato.psid || '—'}
                    </p>
                </div>
                <OrigemContatoCard origem={origemDoContato(contato)} />
                <Button
                    asChild
                    type="button"
                    variant="outline"
                    className="mt-5 w-full justify-between"
                >
                    <Link href={`/contatos/${contato.id}/historico`}>
                        <span>Ver histórico desta conversa</span>
                        <ChevronRight />
                    </Link>
                </Button>
            </div>
        </section>
    );
}

export default function Conversas({ conversas = [], conversa = null }) {
    const pagina = usePage();
    const errosCompartilhados = pagina.props.errors ?? {};
    const listaConversas = Array.isArray(conversas) ? conversas : (conversas?.data ?? []);
    const totalConversas = Array.isArray(conversas) ? conversas.length : (conversas?.total ?? listaConversas.length);
    const paginaAtual = Array.isArray(conversas) ? 1 : (conversas?.current_page ?? 1);
    const ultimaPagina = Array.isArray(conversas) ? 1 : (conversas?.last_page ?? 1);
    const buscaInicial = new URLSearchParams((pagina.url ?? '').split('?')[1] ?? '').get('busca') ?? '';
    const [busca, setBusca] = useState(buscaInicial);
    const [detalhesAbertos, setDetalhesAbertos] = useState(false);
    const [carregandoLista, setCarregandoLista] = useState(false);
    const [erroLista, setErroLista] = useState(null);
    const [mensagensAntigas, setMensagensAntigas] = useState([]);
    const [temMais, setTemMais] = useState(Boolean(conversa?.tem_mais));
    const [carregandoHistorico, setCarregandoHistorico] = useState(false);
    const [erroHistorico, setErroHistorico] = useState(null);
    const form = useForm({ texto: '' });
    const fimDaThread = useRef(null);
    const ultimoErroApresentado = useRef(null);

    const contatoSelecionado = conversa?.contato ?? null;
    const mensagens = useMemo(() => {
        const mapa = new Map();

        [...mensagensAntigas, ...(conversa?.mensagens ?? [])].forEach((mensagem) => {
            mapa.set(mensagem.id, mensagem);
        });

        return [...mapa.values()].sort((a, b) => a.id - b.id);
    }, [mensagensAntigas, conversa?.mensagens]);
    const idUltimaMensagem = mensagens.length > 0 ? mensagens[mensagens.length - 1].id : 0;
    const erroDoTexto = form.errors.texto || errosCompartilhados.texto || null;

    const parametrosBusca = () => (busca.trim() ? { busca: busca.trim() } : {});

    // Trocar de conversa zera o rascunho e as mensagens de erro do formulário
    useEffect(() => {
        form.reset();
        form.clearErrors();
    }, [contatoSelecionado?.id]);

    // Ao trocar de contato, descarta páginas antigas carregadas manualmente
    useEffect(() => {
        setMensagensAntigas([]);
        setTemMais(Boolean(conversa?.tem_mais));
        setErroHistorico(null);
    }, [contatoSelecionado?.id]);

    // Busca no servidor com debounce; preserva o contato aberto e os filtros
    useEffect(() => {
        const termo = busca.trim();
        const termoAtual = new URLSearchParams((pagina.url ?? '').split('?')[1] ?? '').get('busca')?.trim() ?? '';

        if (termo === termoAtual) {
            return;
        }

        const temporizador = setTimeout(() => {
            setCarregandoLista(true);
            setErroLista(null);

            router.get('/conversas', {
                ...(termo ? { busca: termo } : {}),
                ...(contatoSelecionado ? { contato: contatoSelecionado.id } : {}),
            }, {
                only: ['conversas'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setCarregandoLista(false),
                onError: () => {
                    setCarregandoLista(false);
                    setErroLista('Não foi possível atualizar a lista.');
                },
            });
        }, 450);

        return () => clearTimeout(temporizador);
    }, [busca]);

    // Abre a conversa no fim da thread e acompanha qualquer mensagem nova
    useEffect(() => {
        fimDaThread.current?.scrollIntoView({ block: 'end' });
    }, [contatoSelecionado?.id, idUltimaMensagem]);

    // Falha de envio chega como erro do formulário (validação) ou da página
    // (comErrors do controller); apresenta pelo Sonner sem duplicar o mesmo erro
    useEffect(() => {
        if (erroDoTexto && ultimoErroApresentado.current !== erroDoTexto) {
            ultimoErroApresentado.current = erroDoTexto;

            toast.error('Não foi possível enviar a mensagem', {
                description: erroDoTexto,
                id: `erro-envio-${erroDoTexto}`,
                duration: 8000,
            });
        }

        if (!erroDoTexto) {
            ultimoErroApresentado.current = null;
        }
    }, [erroDoTexto]);

    const selecionarContato = (id) => {
        setDetalhesAbertos(false);
        router.get('/conversas', { contato: id, ...parametrosBusca() }, {
            only: ['conversa'],
            preserveScroll: true,
            preserveState: true,
        });
    };

    const voltarParaLista = () => {
        setDetalhesAbertos(false);
        router.get('/conversas', parametrosBusca(), {
            only: ['conversa'],
            preserveScroll: true,
            preserveState: true,
        });
    };

    const irParaPagina = (url) => {
        if (!url || carregandoLista) {
            return;
        }

        setCarregandoLista(true);
        setErroLista(null);
        router.get(url, {}, {
            only: ['conversas'],
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setCarregandoLista(false),
            onError: () => {
                setCarregandoLista(false);
                setErroLista('Não foi possível carregar a página da lista.');
            },
        });
    };

    const carregarAnteriores = async () => {
        if (!contatoSelecionado || mensagens.length === 0 || carregandoHistorico) {
            return;
        }

        setCarregandoHistorico(true);
        setErroHistorico(null);

        try {
            const resposta = await fetch(`/contatos/${contatoSelecionado.id}/mensagens?antes=${mensagens[0].id}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!resposta.ok) {
                throw new Error('Falha ao carregar mensagens anteriores.');
            }

            const dados = await resposta.json();
            setMensagensAntigas((anteriores) => {
                const mapa = new Map(anteriores.map((mensagem) => [mensagem.id, mensagem]));
                (dados.mensagens ?? []).forEach((mensagem) => mapa.set(mensagem.id, mensagem));

                return [...mapa.values()].sort((a, b) => a.id - b.id);
            });
            setTemMais(Boolean(dados.tem_mais));
        } catch {
            setErroHistorico('Não foi possível carregar mensagens anteriores.');
        } finally {
            setCarregandoHistorico(false);
        }
    };

    const enviarResposta = () => {
        if (form.processing || !form.data.texto.trim()) {
            return;
        }

        form.post(`/contatos/${contatoSelecionado.id}/responder`, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                toast.success('Mensagem enviada', {
                    description: `Entregue para ${nomeDoContato(contatoSelecionado)} pelo Messenger`,
                });
            },
        });
    };

    return (
        <div className="flex h-full min-h-0 overflow-hidden bg-background font-sans text-foreground">
            <AtualizacaoAutomatica contatoId={contatoSelecionado?.id ?? null} />
            <aside className={`${contatoSelecionado ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col border-r border-border bg-card lg:w-[340px] xl:w-[328px] 2xl:w-[368px]`}>
                <div className="border-b border-border px-6 pb-5 pt-7">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terracota-escuro dark:text-muted-foreground">Caixa de entrada</p>
                            <div>
                                <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-foreground">Conversas</h1>
                            </div>
                        </div>
                    </div>

                    <div className="relative mt-6">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            value={busca}
                            onChange={(evento) => setBusca(evento.target.value)}
                            placeholder="Buscar conversa"
                            aria-label="Buscar conversas"
                            className="h-11 rounded-xl bg-muted pl-10 text-sm"
                        />
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Todas as conversas</p>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                            {carregandoLista ? <LoaderCircle className="size-3 animate-spin" /> : totalConversas}
                        </span>
                    </div>
                    {erroLista && (
                        <p role="alert" className="mt-2 text-xs text-destructive">{erroLista}</p>
                    )}
                </div>

                <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-1 p-3">
                        {listaConversas.map((contato) => {
                            const nome = nomeDoContato(contato);
                            const ultimaMensagem = contato.ultima_mensagem;
                            const origem = origemDoContato(contato);
                            const horario = formatarHorario(ultimaMensagem?.created_at);
                            const selecionado = String(contatoSelecionado?.id) === String(contato.id);

                            return (
                                <button
                                    key={contato.id}
                                    type="button"
                                    aria-pressed={selecionado}
                                    onClick={() => selecionarContato(contato.id)}
                                    className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${selecionado ? 'bg-terracota/10' : 'hover:bg-accent'}`}
                                >
                                    <Avatar contato={contato} />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="flex min-w-0 items-center gap-1.5">
                                                <span className={`truncate text-sm font-semibold ${selecionado ? 'text-terracota-escuro dark:text-foreground' : 'text-foreground'}`}>
                                                    {nome}
                                                </span>
                                                {origem && (
                                                    <span
                                                        title={rotuloOrigem(origem)}
                                                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${origemEhAnuncio(origem)
                                                            ? 'bg-terracota/15 text-terracota-escuro dark:text-terracota'
                                                            : 'bg-muted text-muted-foreground'}`}
                                                    >
                                                        {origemEhAnuncio(origem) ? <Megaphone className="size-2.5" /> : <Link2 className="size-2.5" />}
                                                        {rotuloOrigem(origem)}
                                                    </span>
                                                )}
                                            </span>
                                            {horario && (
                                                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                                    {horario}
                                                </span>
                                            )}
                                        </span>
                                        <span className="mt-1 block truncate text-[13px] text-muted-foreground">
                                            {resumoMensagem(ultimaMensagem)}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}

                        {listaConversas.length === 0 && (
                            <div className="px-5 py-12 text-center">
                                <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                    <Search className="size-5" />
                                </div>
                                <p className="mt-4 text-sm font-medium text-foreground">
                                    {busca ? 'Nenhuma conversa encontrada' : 'Ainda não há conversas'}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    {busca ? 'Tente buscar por outro nome ou mensagem.' : 'Os contatos aparecerão aqui quando houver conversas.'}
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {ultimaPagina > 1 && (
                    <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-3">
                        <p className="text-xs text-muted-foreground">
                            Página {paginaAtual} de {ultimaPagina}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!conversas?.prev_page_url || carregandoLista}
                                onClick={() => irParaPagina(conversas?.prev_page_url)}
                            >
                                Anterior
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!conversas?.next_page_url || carregandoLista}
                                onClick={() => irParaPagina(conversas?.next_page_url)}
                            >
                                Próxima
                            </Button>
                        </div>
                    </div>
                )}

                <div className="border-t border-border px-6 py-4">
                    <p className="text-xs text-muted-foreground">Caixa de atendimento</p>
                </div>
            </aside>

            <section className={`${contatoSelecionado ? 'flex' : 'hidden lg:flex'} relative min-w-0 flex-1 flex-col bg-background`}>
                {contatoSelecionado ? (
                    <>
                        <header className="z-10 flex min-h-[78px] items-center justify-between border-b border-border bg-card px-4 sm:px-7">
                            <div className="flex min-w-0 items-center gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="shrink-0 text-muted-foreground lg:hidden"
                                    aria-label="Voltar para a lista de conversas"
                                    onClick={voltarParaLista}
                                >
                                    <ArrowLeft />
                                </Button>
                                <Avatar contato={contatoSelecionado} />
                                <div className="min-w-0">
                                    <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
                                        {nomeDoContato(contatoSelecionado)}
                                    </h2>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                        PSID <span className="font-medium text-foreground">{contatoSelecionado.psid || '—'}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="ml-3 flex shrink-0 items-center gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 rounded-xl xl:hidden"
                                    aria-expanded={detalhesAbertos}
                                    onClick={() => setDetalhesAbertos((aberto) => !aberto)}
                                >
                                    <Info />
                                    <span className="hidden sm:inline">Detalhes</span>
                                </Button>
                            </div>
                        </header>

                        {detalhesAbertos && (
                            <div className="absolute inset-0 z-20 bg-black/40 p-4 pt-20 backdrop-blur-[1px] xl:hidden">
                                <button
                                    type="button"
                                    className="absolute inset-0 size-full cursor-default"
                                    aria-label="Fechar detalhes do contato"
                                    onClick={() => setDetalhesAbertos(false)}
                                />
                                <div className="relative ml-auto w-full max-w-sm">
                                    <PainelDetalhes
                                        contato={contatoSelecionado}
                                        compacto
                                        onClose={() => setDetalhesAbertos(false)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex min-h-0 flex-1 flex-col">
                            <div className="flex items-center justify-between px-5 pb-2 pt-6 sm:px-8">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terracota-escuro dark:text-muted-foreground">Atendimento</p>
                                    <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-foreground">Histórico de mensagens</h3>
                                </div>
                                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                                    {mensagens.length}{conversa?.total_mensagens ? ` de ${conversa.total_mensagens}` : ''} {mensagens.length === 1 ? 'mensagem' : 'mensagens'}
                                </span>
                            </div>

                            <ScrollArea className="min-h-0 flex-1 px-5 sm:px-8">
                                {temMais && (
                                    <div className="flex justify-center pb-1 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={carregarAnteriores}
                                            disabled={carregandoHistorico}
                                        >
                                            {carregandoHistorico ? <LoaderCircle className="animate-spin" /> : <ChevronUp />}
                                            Carregar mensagens anteriores
                                        </Button>
                                    </div>
                                )}
                                {erroHistorico && (
                                    <p role="alert" className="py-2 text-center text-xs text-destructive">{erroHistorico}</p>
                                )}
                                {mensagens.length > 0 ? (
                                    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-6">
                                        {mensagens.map((mensagem) => (
                                            <MensagemBubble key={mensagem.id} mensagem={mensagem} />
                                        ))}
                                        <div ref={fimDaThread} />
                                    </div>
                                ) : (
                                    <div className="flex h-full min-h-64 items-center justify-center px-4 py-12">
                                        <div className="max-w-sm text-center">
                                            <div className="mx-auto flex size-14 items-center justify-center rounded-[20px] border border-terracota/25 bg-card text-terracota shadow-sm">
                                                <MessagesSquare className="size-6" strokeWidth={1.7} />
                                            </div>
                                            <h4 className="mt-5 text-base font-semibold text-foreground">Nenhuma mensagem registrada</h4>
                                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                O histórico desta conversa aparecerá aqui quando houver mensagens.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </ScrollArea>

                            <footer className="border-t border-border bg-card px-5 py-3 sm:px-8">
                                <form
                                    className="mx-auto flex w-full max-w-3xl flex-col gap-1.5"
                                    onSubmit={(evento) => {
                                        evento.preventDefault();
                                        enviarResposta();
                                    }}
                                >
                                    <div className="flex items-end gap-2.5">
                                        <Textarea
                                            value={form.data.texto}
                                            onChange={(evento) => form.setData('texto', evento.target.value)}
                                            onKeyDown={(evento) => {
                                                // Enter envia; Shift+Enter quebra linha
                                                if (evento.key === 'Enter' && !evento.shiftKey) {
                                                    evento.preventDefault();
                                                    enviarResposta();
                                                }
                                            }}
                                            maxLength={640}
                                            rows={1}
                                            aria-invalid={Boolean(erroDoTexto)}
                                            aria-label="Escrever mensagem para o contato"
                                            placeholder="Escrever mensagem…"
                                            className="max-h-40 min-h-[46px] resize-none bg-muted text-sm"
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            className="size-[46px] shrink-0 rounded-xl"
                                            disabled={form.processing || !form.data.texto.trim()}
                                            aria-label="Enviar mensagem"
                                        >
                                            {form.processing ? <LoaderCircle className="animate-spin" /> : <SendHorizontal />}
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                        <span>{form.data.texto.length}/640 caracteres</span>
                                        <span>A resposta é enviada pelo Messenger em tempo real</span>
                                    </div>
                                </form>
                            </footer>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 items-center justify-center px-6 py-12">
                        <div className="max-w-md text-center">
                            <div className="relative mx-auto flex size-[76px] items-center justify-center rounded-[26px] border border-terracota/25 bg-card text-terracota shadow-[0_8px_28px_-16px_rgba(163,75,58,0.5)]">
                                <MessagesSquare className="size-8" strokeWidth={1.5} />
                                <span className="absolute -right-1 -top-1 size-4 rounded-full border-[3px] border-background bg-areia" />
                            </div>
                            <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracota-escuro dark:text-muted-foreground">Seu atendimento</p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-[28px]">
                                Cada conversa, mais perto.
                            </h2>
                            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                                Selecione um contato na lista para consultar os dados e responder as mensagens.
                            </p>
                            <div className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
                                <UserRound className="size-3.5 text-terracota" />
                                {totalConversas} {totalConversas === 1 ? 'contato disponível' : 'contatos disponíveis'}
                                <ChevronRight className="size-3.5 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {contatoSelecionado && (
                <aside className="hidden w-[292px] shrink-0 border-l border-border bg-card xl:block">
                    <PainelDetalhes contato={contatoSelecionado} />
                </aside>
            )}
        </div>
    );
}
