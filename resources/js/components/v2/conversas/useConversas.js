import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { chaveDoDia, nomeDoContato } from '@/components/v2/formato';

/**
 * Estado da caixa de conversas: busca sincronizada com a URL, paginação por
 * cursor, thread incremental, atualização periódica e envio de resposta.
 */
export default function useConversas(conversas, conversa) {
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

    const limparBuscaEFiltros = () => {
        setBusca('');
        router.get('/', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const removerFiltroAnuncio = () => {
        router.get('/', busca.trim() ? { busca: busca.trim() } : {}, { preserveState: true, preserveScroll: true });
    };

    return {
        busca,
        alterarBusca: setBusca,
        adId,
        removerFiltroAnuncio,
        lista,
        totalConversas,
        contatoSelecionado,
        mensagens,
        grupos,
        totalMensagens: conversa?.total_mensagens ?? mensagens.length,
        temMaisThread,
        temMaisLista,
        carregandoLista,
        carregandoMais,
        carregandoThread,
        carregandoAnteriores,
        erroLista,
        detalhesAbertos,
        abrirDetalhes: () => setDetalhesAbertos(true),
        fecharDetalhes: () => setDetalhesAbertos(false),
        corpoDaThread,
        form,
        selecionarContato,
        voltarParaLista,
        carregarMaisConversas,
        carregarAnteriores,
        enviar,
        limparBuscaEFiltros,
    };
}
