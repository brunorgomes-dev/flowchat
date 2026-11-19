import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    CalendarClock,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageCircle,
    Plug,
    Settings2,
    ShieldCheck,
    Users,
    Workflow,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { MarcaFlowChat } from '@/components/MarcaFlowChat';
import { AvisoFusoPendente } from '@/components/AvisoFusoPendente';
import { ModalFusoConfirmacao } from '@/components/ModalFusoConfirmacao';
import { definirPreferenciaTema, lerPreferenciaTema } from '@/lib/tema';
import { NavegacaoV2, itemAtivo } from './NavegacaoV2';
import { useBarraDeRolagemVisivel } from './pecas';
import './estilo-v2.css';
import './layout-v2.css';

/**
 * Casca da interface padrão (design V2).
 *
 * As páginas reais continuam recebendo os props dos controllers existentes.
 */

export const gruposDeNavegacao = [
    {
        titulo: 'Operação',
        itens: [
            { href: '/painel', rotulo: 'Painel', icone: LayoutDashboard },
            { href: '/', rotulo: 'Conversas', icone: MessageCircle },
            { href: '/agendamentos', rotulo: 'Agendamentos', icone: CalendarClock },
        ],
    },
    {
        titulo: 'Automação',
        itens: [{ href: '/fluxos', rotulo: 'Fluxos', icone: Workflow }],
    },
    {
        titulo: 'Conta',
        itens: [
            {
                href: '/configuracoes',
                rotulo: 'Configurações',
                icone: Settings2,
                filhos: [
                    { href: '/configuracoes', rotulo: 'Geral' },
                    { href: '/configuracoes/conexao', rotulo: 'Conexão', icone: Plug },
                ],
            },
        ],
    },
];

const opcoesTema = [
    { valor: 'sistema', rotulo: 'Auto' },
    { valor: 'claro', rotulo: 'Claro' },
    { valor: 'escuro', rotulo: 'Escuro' },
];

function navegacaoAdministrativa() {
    return {
        titulo: 'Administração',
        itens: [
            { href: '/admin/convites', rotulo: 'Contas', icone: Users },
            { href: '/admin/convites/emitir', rotulo: 'Convites', icone: ShieldCheck },
        ],
    };
}

function AlternadorDeTema() {
    const [preferencia, setPreferencia] = useState(() => lerPreferenciaTema());

    const alterar = (valor) => {
        setPreferencia(valor);
        definirPreferenciaTema(valor);
    };

    return (
        <div className="v2-segmentado" role="group" aria-label="Tema da interface">
            {opcoesTema.map((opcao) => (
                <button key={opcao.valor} type="button" aria-pressed={preferencia === opcao.valor} onClick={() => alterar(opcao.valor)}>
                    {opcao.rotulo}
                </button>
            ))}
        </div>
    );
}

function Usuario({ usuario, aoSair, compacto = false }) {
    if (!usuario) {
        return null;
    }

    const nome = usuario.name?.trim() || usuario.email || 'Conta';
    const iniciais = nome.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();

    return (
        <div className={`mt-3 flex items-center gap-2.5 border-t border-[var(--v2-rail-line)] pt-3 ${compacto ? 'v2-layout-usuario--compacto' : ''}`}>
            <span className="v2-avatar v2-avatar--marca" aria-hidden="true">
                {iniciais}
            </span>
            {!compacto && (
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.75rem] font-medium text-[var(--v2-rail-ink)]">{nome}</span>
                    {usuario.email && usuario.email !== nome && (
                        <span className="block truncate text-[0.6875rem] text-[var(--v2-rail-ink-2)]">{usuario.email}</span>
                    )}
                </span>
            )}
            <button
                type="button"
                className="v2-btn v2-btn--fantasma v2-btn--icone shrink-0 text-[var(--v2-rail-ink-2)]"
                aria-label="Encerrar sessão"
                title="Encerrar sessão"
                onClick={aoSair}
            >
                <LogOut aria-hidden="true" />
            </button>
        </div>
    );
}

export default function LayoutV2({ children, semNavegacao = false }) {
    const pagina = usePage();
    const caminho = (pagina.url ?? '').split('?')[0].replace(/\/$/, '') || '/';
    const usuario = pagina.props.auth?.user ?? null;
    const mensagemFlash = pagina.props.flash?.mensagem;
    const ultimaMensagem = useRef(null);
    const botaoGavetaRef = useRef(null);
    const botaoFecharGavetaRef = useRef(null);
    const gavetaAbertaAnterior = useRef(false);
    const shellRef = useRef(null);
    const skipLinkRef = useRef(null);

    const [railCompacto, setRailCompacto] = useState(false);
    const [gavetaAberta, setGavetaAberta] = useState(false);
    const [gavetaVisivel, setGavetaVisivel] = useState(false);
    const [gavetaAnimada, setGavetaAnimada] = useState(false);

    useBarraDeRolagemVisivel();

    useEffect(() => {
        if (mensagemFlash && mensagemFlash !== ultimaMensagem.current) {
            ultimaMensagem.current = mensagemFlash;
            toast.success(mensagemFlash);
        }
    }, [mensagemFlash]);

    useEffect(() => {
        setGavetaAberta(false);
    }, [pagina.url]);

    useEffect(() => {
        if (!gavetaVisivel || !gavetaAberta) {
            setGavetaAnimada(false);
            return undefined;
        }

        const quadros = requestAnimationFrame(() => setGavetaAnimada(true));
        return () => cancelAnimationFrame(quadros);
    }, [gavetaAberta, gavetaVisivel]);

    useEffect(() => {
        if (gavetaAberta || !gavetaVisivel) {
            return undefined;
        }

        const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const id = setTimeout(() => setGavetaVisivel(false), reduzirMovimento ? 0 : 220);
        return () => clearTimeout(id);
    }, [gavetaAberta, gavetaVisivel]);

    const existeOutroModalAberto = () => {
        const gaveta = document.getElementById('v2-layout-gaveta');
        const modais = [
            ...document.querySelectorAll('dialog[open]'),
            ...document.querySelectorAll('[role="dialog"][aria-modal="true"]'),
        ];

        return modais.some((modal) => modal !== gaveta && modal.id !== 'v2-layout-gaveta');
    };

    useEffect(() => {
        if (!gavetaAberta) {
            return undefined;
        }

        const fecharComEscape = (evento) => {
            if (evento.key === 'Escape' && !existeOutroModalAberto()) {
                setGavetaAberta(false);
            }
        };

        document.addEventListener('keydown', fecharComEscape);
        return () => document.removeEventListener('keydown', fecharComEscape);
    }, [gavetaAberta]);

    useEffect(() => {
        if (!gavetaVisivel) {
            return undefined;
        }

        const overflowOriginal = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = overflowOriginal;
        };
    }, [gavetaVisivel]);

    useEffect(() => {
        if (shellRef.current) {
            shellRef.current.inert = gavetaAberta;
        }
        if (skipLinkRef.current) {
            skipLinkRef.current.inert = gavetaAberta;
        }
    }, [gavetaAberta]);

    useEffect(() => {
        const mql = window.matchMedia('(min-width: 1024px)');
        const aoMudar = (evento) => {
            if (evento.matches && gavetaAberta) {
                setGavetaAberta(false);
            }
        };
        mql.addEventListener('change', aoMudar);
        return () => mql.removeEventListener('change', aoMudar);
    }, [gavetaAberta]);

    useEffect(() => {
        if (gavetaAberta) {
            botaoFecharGavetaRef.current?.focus();
            gavetaAbertaAnterior.current = true;

            const painel = document.getElementById('v2-layout-gaveta');
            if (!painel) {
                return undefined;
            }

            const seletorFocavel = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

            const tecla = (evento) => {
                if (existeOutroModalAberto()) {
                    return;
                }

                if (evento.key !== 'Tab') {
                    return;
                }

                const focaveis = Array.from(painel.querySelectorAll(seletorFocavel))
                    .filter((elemento) => elemento.offsetParent !== null && !elemento.closest('[inert]'));

                if (focaveis.length === 0) {
                    return;
                }

                const primeiro = focaveis[0];
                const ultimo = focaveis[focaveis.length - 1];
                const ativoDentro = focaveis.includes(document.activeElement);

                if (!ativoDentro) {
                    evento.preventDefault();
                    if (evento.shiftKey) {
                        ultimo.focus();
                    } else {
                        primeiro.focus();
                    }
                    return;
                }

                if (evento.shiftKey && document.activeElement === primeiro) {
                    evento.preventDefault();
                    ultimo.focus();
                } else if (!evento.shiftKey && document.activeElement === ultimo) {
                    evento.preventDefault();
                    primeiro.focus();
                }
            };

            document.addEventListener('keydown', tecla);
            return () => document.removeEventListener('keydown', tecla);
        }

        if (gavetaAbertaAnterior.current) {
            const hamburger = botaoGavetaRef.current;
            if (hamburger && hamburger.offsetParent !== null) {
                hamburger.focus();
            } else {
                const alternador = document.querySelector('.v2-layout-rail__alternador');
                if (alternador && alternador.offsetParent !== null) {
                    alternador.focus();
                } else {
                    const main = document.getElementById('conteudo-principal');
                    if (main && main.offsetParent !== null) {
                        main.focus({ preventScroll: true });
                    }
                }
            }
            gavetaAbertaAnterior.current = false;
        }

        return undefined;
    }, [gavetaAberta]);

    const abrirGaveta = () => {
        setGavetaVisivel(true);
        setGavetaAberta(true);
    };

    const fecharGaveta = () => {
        setGavetaAberta(false);
    };

    const sair = () => {
        router.post('/sair', {}, { onStart: () => router.clearHistory() });
    };

    if (semNavegacao) {
        return (
            <div className="v2-root">
                <div className="v2-auth-rolagem">{children}</div>
            </div>
        );
    }

    const grupos = usuario?.admin_plataforma
        ? [...gruposDeNavegacao, navegacaoAdministrativa()]
        : gruposDeNavegacao;
    const atual = grupos
        .flatMap((grupo) => grupo.itens.flatMap((item) => (
            item.filhos ? item.filhos.map((filho) => ({ ...filho, rotulo: `${item.rotulo} · ${filho.rotulo}` })) : [item]
        )))
        .filter((item) => itemAtivo(caminho, item.href))
        .sort((a, b) => b.href.length - a.href.length)[0] ?? null;

    return (
        <div className="v2-root">
            <a ref={skipLinkRef} className="v2-pular" href="#conteudo-principal">
                Ir para o conteúdo
            </a>

            <div ref={shellRef} className={`v2-shell ${railCompacto ? 'v2-layout-rail--compacto' : ''}`}>
                <aside className={`v2-rail ${railCompacto ? 'v2-layout-rail__trilho--compacto' : ''}`}>
                    <div className={`v2-rail__marca ${railCompacto ? 'v2-layout-rail__marca--compacto' : ''}`}>
                        <MarcaFlowChat tamanho="md" sombra={false} />
                        {!railCompacto && (
                            <span className="min-w-0">
                                <span className="v2-rail__marca-nome block">FlowChat</span>
                                <span className="v2-rail__marca-nota block">Atendimento</span>
                            </span>
                        )}
                        <button
                            type="button"
                            className="v2-layout-rail__alternador"
                            aria-label={railCompacto ? 'Expandir menu' : 'Recolher menu'}
                            aria-expanded={!railCompacto}
                            title={railCompacto ? 'Expandir menu' : 'Recolher menu'}
                            onClick={() => setRailCompacto((atual) => !atual)}
                        >
                            <Menu aria-hidden="true" />
                        </button>
                    </div>

                    <NavegacaoV2 caminho={caminho} grupos={grupos} compacto={railCompacto} prefixoId="rail" />

                    <div className={`v2-rail__rodape ${railCompacto ? 'v2-layout-rail__rodape--compacto' : ''}`}>
                        <span className="v2-layout-rail__status flex items-center gap-1.5">
                            <span className="v2-ponto text-[var(--v2-areia)]" aria-hidden="true" />
                            {usuario?.fuso?.confirmado === false ? 'Fuso pendente' : 'Operação ativa'}
                        </span>
                        <Usuario usuario={usuario} aoSair={sair} compacto={railCompacto} />
                    </div>
                </aside>

                <div className="v2-coluna">
                    <AvisoFusoPendente />
                    <header className="v2-topo">
                        <div className="v2-topo__trilha">
                            <button
                                type="button"
                                className={`v2-layout-topo__hamburger ${gavetaAberta ? 'v2-layout-topo__hamburger--aberto' : ''}`}
                                aria-label={gavetaAberta ? 'Fechar navegação' : 'Abrir navegação'}
                                aria-expanded={gavetaAberta}
                                aria-controls={gavetaVisivel ? 'v2-layout-gaveta' : undefined}
                                onClick={() => {
                                    if (gavetaAberta) {
                                        fecharGaveta();
                                        return;
                                    }

                                    if (!existeOutroModalAberto()) {
                                        abrirGaveta();
                                    }
                                }}
                                ref={botaoGavetaRef}
                            >
                                <span className="v2-layout-topo__hamburger-icone" aria-hidden="true">
                                    <Menu />
                                    <X />
                                </span>
                            </button>
                            <span>FlowChat</span>
                            <span aria-hidden="true">/</span>
                            <strong aria-current="page">{atual?.rotulo ?? 'Atendimento'}</strong>
                        </div>
                        <div className="v2-topo__acoes">
                            <AlternadorDeTema />
                        </div>
                    </header>

                    <main id="conteudo-principal" tabIndex={-1} className="v2-principal">
                        {children}
                    </main>
                </div>
            </div>

            {gavetaVisivel && (
                <div
                    className={`v2-layout-gaveta ${gavetaAnimada ? 'v2-layout-gaveta--aberta' : ''}`}
                    inert={!gavetaAberta}
                >
                    <button
                        type="button"
                        className="v2-layout-gaveta__backdrop"
                        aria-label="Fechar navegação"
                        tabIndex={-1}
                        onClick={fecharGaveta}
                    />
                    <aside
                        id="v2-layout-gaveta"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navegação principal"
                        className="v2-layout-gaveta__painel"
                    >
                        <header className="v2-layout-gaveta__cabecalho">
                            <div className="v2-rail__marca">
                                <MarcaFlowChat tamanho="md" sombra={false} />
                                <span className="min-w-0">
                                    <span className="v2-rail__marca-nome block">FlowChat</span>
                                    <span className="v2-rail__marca-nota block">Atendimento</span>
                                </span>
                            </div>
                            <button
                                type="button"
                                className="v2-btn v2-btn--fantasma v2-btn--icone shrink-0 text-[var(--v2-rail-ink-2)]"
                                aria-label="Fechar navegação"
                                title="Fechar navegação"
                                onClick={fecharGaveta}
                                ref={botaoFecharGavetaRef}
                            >
                                <X aria-hidden="true" />
                            </button>
                        </header>

                        <div className="v2-layout-gaveta__corpo">
                            <NavegacaoV2 caminho={caminho} grupos={grupos} aoNavegar={fecharGaveta} prefixoId="drawer" />
                        </div>

                        <div className="v2-layout-gaveta__rodape">
                            <Usuario usuario={usuario} aoSair={sair} />
                        </div>
                    </aside>
                </div>
            )}

            <ModalFusoConfirmacao />
        </div>
    );
}
