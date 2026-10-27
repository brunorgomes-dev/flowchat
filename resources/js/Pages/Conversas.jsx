import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, router, useForm, usePage, usePoll } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    ArrowLeft,
    ChevronRight,
    Info,
    LoaderCircle,
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

// Recarrega apenas a conversa aberta a cada 3s; para ao desmontar
function AtualizacaoAutomatica() {
    usePoll(3000, () => ({ only: ['conversa'] }), { mode: 'rest' });

    return null;
}

function Avatar({ contato, size = 'regular' }) {
    const sizeClass = size === 'large' ? 'size-14 text-base' : 'size-11 text-sm';

    return (
        <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-terracota/10 font-semibold text-terracota-escuro ${sizeClass}`}>
            {iniciaisDoContato(contato)}
        </div>
    );
}

function PainelDetalhes({ contato, compacto = false, onClose }) {
    return (
        <section className={compacto
            ? 'rounded-2xl border border-border bg-card p-5 shadow-xl'
            : 'flex h-full flex-col bg-card'}>
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
    const [busca, setBusca] = useState('');
    const [detalhesAbertos, setDetalhesAbertos] = useState(false);
    const form = useForm({ texto: '' });
    const fimDaThread = useRef(null);
    const ultimoErroApresentado = useRef(null);
    const errosCompartilhados = usePage().props.errors ?? {};

    const contatoSelecionado = conversa?.contato ?? null;
    const mensagens = conversa?.mensagens ?? [];
    const idUltimaMensagem = mensagens.length > 0 ? mensagens[mensagens.length - 1].id : 0;
    const erroDoTexto = form.errors.texto || errosCompartilhados.texto || null;

    const conversasFiltradas = useMemo(() => {
        const termo = busca.trim().toLocaleLowerCase('pt-BR');

        if (!termo) {
            return conversas;
        }

        return conversas.filter((contato) => (
            nomeDoContato(contato).toLocaleLowerCase('pt-BR').includes(termo)
            || String(contato.psid ?? '').toLocaleLowerCase('pt-BR').includes(termo)
            || String(contato.ultima_mensagem?.texto ?? '').toLocaleLowerCase('pt-BR').includes(termo)
        ));
    }, [busca, conversas]);

    // Trocar de conversa zera o rascunho e as mensagens de erro do formulário
    useEffect(() => {
        form.reset();
        form.clearErrors();
    }, [contatoSelecionado?.id]);

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
        router.get('/conversas', { contato: id }, {
            only: ['conversa'],
            preserveScroll: true,
            preserveState: true,
        });
    };

    const voltarParaLista = () => {
        setDetalhesAbertos(false);
        router.get('/conversas', {}, {
            only: ['conversa'],
            preserveScroll: true,
            preserveState: true,
        });
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
            {contatoSelecionado && <AtualizacaoAutomatica />}
            <aside className={`${contatoSelecionado ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col border-r border-border bg-card lg:w-[340px] xl:w-[328px] 2xl:w-[368px]`}>
                <div className="border-b border-border px-6 pb-5 pt-7">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terracota-escuro">Caixa de entrada</p>
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
                            {conversas.length}
                        </span>
                    </div>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-1 p-3">
                        {conversasFiltradas.map((contato) => {
                            const nome = nomeDoContato(contato);
                            const ultimaMensagem = contato.ultima_mensagem;
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
                                            <span className={`truncate text-sm font-semibold ${selecionado ? 'text-terracota-escuro' : 'text-foreground'}`}>
                                                {nome}
                                            </span>
                                            {horario && (
                                                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                                    {horario}
                                                </span>
                                            )}
                                        </span>
                                        <span className="mt-1 block truncate text-[13px] text-muted-foreground">
                                            {ultimaMensagem?.texto || 'Nenhuma mensagem registrada'}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}

                        {conversasFiltradas.length === 0 && (
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
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terracota-escuro">Atendimento</p>
                                    <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-foreground">Histórico de mensagens</h3>
                                </div>
                                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                                    {mensagens.length} {mensagens.length === 1 ? 'mensagem' : 'mensagens'}
                                </span>
                            </div>

                            <ScrollArea className="min-h-0 flex-1 px-5 sm:px-8">
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
                            <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracota-escuro">Seu atendimento</p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-[28px]">
                                Cada conversa, mais perto.
                            </h2>
                            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                                Selecione um contato na lista para consultar os dados e responder as mensagens.
                            </p>
                            <div className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
                                <UserRound className="size-3.5 text-terracota" />
                                {conversas.length} {conversas.length === 1 ? 'contato disponível' : 'contatos disponíveis'}
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
