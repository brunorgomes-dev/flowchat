import { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronDown,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageCircle,
    MessagesSquare,
    Send,
    Settings2,
    ShieldCheck,
    Users,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AvisoFusoPendente } from '@/components/AvisoFusoPendente';
import { MarcaFlowChat } from '@/components/MarcaFlowChat';
import { ModalFusoConfirmacao } from '@/components/ModalFusoConfirmacao';

function obterLinksDeNavegacao(caminhoAtual, ehAdministradorPlataforma) {
    const links = [
        {
            href: '/painel',
            label: 'Painel',
            icone: LayoutDashboard,
            ativo: caminhoAtual === '/painel',
        },
        {
            href: '/',
            label: 'Conversas',
            icone: MessageCircle,
            ativo: caminhoAtual === '/' || caminhoAtual.startsWith('/conversas') || caminhoAtual.startsWith('/contatos/'),
        },
        {
            href: '/agendamentos',
            label: 'Agendamentos',
            icone: CalendarDays,
            ativo: caminhoAtual.startsWith('/agendamentos'),
        },
        {
            href: '/fluxos',
            label: 'Fluxos',
            icone: MessagesSquare,
            ativo: caminhoAtual.startsWith('/fluxos'),
        },
        {
            href: '/configuracoes',
            label: 'Configurações',
            icone: Settings2,
            ativo: caminhoAtual.startsWith('/configuracoes'),
        },
    ];

    if (ehAdministradorPlataforma) {
        links.push({
            href: '/admin/convites',
            label: 'Convites',
            icone: ShieldCheck,
            ativo: caminhoAtual.startsWith('/admin/convites'),
            children: [
                {
                    href: '/admin/convites/emitir',
                    label: 'Emitir',
                    icone: Send,
                    ativo: caminhoAtual === '/admin/convites/emitir',
                },
                {
                    href: '/admin/convites',
                    label: 'Contas ativas',
                    icone: Users,
                    ativo: caminhoAtual === '/admin/convites',
                },
            ],
        });
    }

    return links;
}

function LinkDeNavegacao({ item, compacto = false, onClick, subitem = false, expandido = false, onToggle }) {
    const Icone = item.icone;
    const temFilhos = item.children?.length > 0;
    const classes = `flex w-full items-center text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${subitem ? 'h-9 gap-2 rounded-lg px-2.5 text-xs' : 'h-11 gap-3 rounded-xl text-sm'} ${compacto ? 'justify-center px-0' : subitem ? 'px-2.5' : 'px-3'} ${item.ativo
        ? 'bg-terracota/10 font-medium text-terracota-escuro dark:text-foreground'
        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`;
    const conteudo = (
        <>
            {Icone && <Icone className={`${subitem ? 'size-4' : 'size-[18px]'} shrink-0 ${item.ativo ? 'text-terracota' : ''}`} strokeWidth={1.8} />}
            {!compacto && <span className="truncate">{item.label}</span>}
            {temFilhos && !compacto && (
                <ChevronDown
                    className={`ml-auto size-3.5 shrink-0 transition-transform ${expandido ? 'rotate-180' : ''}`}
                    strokeWidth={1.8}
                    aria-hidden="true"
                />
            )}
        </>
    );

    if (temFilhos) {
        return (
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expandido}
                aria-label={compacto ? item.label : undefined}
                title={compacto ? item.label : undefined}
                className={classes}
            >
                {conteudo}
            </button>
        );
    }

    return (
        <Link
            href={item.href}
            onClick={onClick}
            aria-current={item.ativo ? 'page' : undefined}
            aria-label={compacto ? item.label : undefined}
            title={compacto ? item.label : undefined}
            className={classes}
        >
            {conteudo}
        </Link>
    );
}

function Navegacao({ links, compacto = false, onNavigate }) {
    const [submenusAbertos, setSubmenusAbertos] = useState(() => links
        .filter((item) => item.children?.length > 0 && item.ativo)
        .map((item) => item.href));
    const chaveAtiva = links
        .filter((item) => item.children?.length > 0 && item.ativo)
        .map((item) => item.href)
        .join('|');

    useEffect(() => {
        if (chaveAtiva === '') {
            return;
        }

        const ativos = chaveAtiva.split('|');
        setSubmenusAbertos((anteriores) => (
            ativos.every((href) => anteriores.includes(href))
                ? anteriores
                : [...new Set([...anteriores, ...ativos])]
        ));
    }, [chaveAtiva]);

    const alternarSubmenu = (href) => {
        setSubmenusAbertos((anteriores) => (
            anteriores.includes(href)
                ? anteriores.filter((item) => item !== href)
                : [...anteriores, href]
        ));
    };

    return (
        <nav aria-label="Navegação principal" className={`flex min-h-0 flex-1 flex-col pt-6 ${compacto ? 'px-2' : 'px-3'}`}>
            {compacto ? (
                <div aria-hidden="true" className="mb-2 h-[15px]" />
            ) : (
                <p className="mb-2 h-[15px] px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Espaço de trabalho
                </p>
            )}
            <div className="space-y-1">
                {links.map((item) => {
                    const expandido = submenusAbertos.includes(item.href);

                    return (
                        <div key={item.href}>
                            <LinkDeNavegacao
                                item={item}
                                compacto={compacto}
                                onClick={onNavigate}
                                expandido={expandido}
                                onToggle={() => alternarSubmenu(item.href)}
                            />
                            {!compacto && item.children?.length > 0 && (
                                <div
                                    aria-hidden={!expandido}
                                    inert={!expandido}
                                    className={`ml-4 overflow-hidden border-l border-sidebar-border pl-2 transition-all duration-200 ease-out ${expandido
                                        ? 'mt-1 max-h-40 translate-y-0 opacity-100'
                                        : 'mt-0 max-h-0 -translate-y-1 opacity-0'}`}
                                >
                                    <div className="space-y-1 py-1">
                                        {item.children.map((child) => (
                                            <LinkDeNavegacao
                                                key={child.href}
                                                item={child}
                                                onClick={onNavigate}
                                                subitem
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}

function UsuarioDaSidebar({ usuario, compacto = false }) {
    if (!usuario) {
        return null;
    }

    const nome = usuario.name?.trim() || usuario.email || (usuario.id ? `Usuário ${usuario.id}` : null);

    if (!nome) {
        return null;
    }

    return (
        <div className={`flex items-center border-t border-sidebar-border py-3 ${compacto ? 'flex-col gap-2 px-2' : 'gap-3 px-4'}`}>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-terracota/10 text-terracota-escuro dark:text-foreground">
                <span className="text-xs font-semibold" aria-hidden="true">
                    {nome.slice(0, 1).toUpperCase()}
                </span>
            </div>
            {!compacto && (
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-sidebar-foreground">{nome}</p>
                    {usuario.email && usuario.email !== nome && (
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{usuario.email}</p>
                    )}
                </div>
            )}
            {/* Termina a sessão e limpa a cache de histórico do Inertia para que
                páginas privadas não voltem a aparecer após a saída (botão voltar) */}
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Encerrar sessão"
                title="Encerrar sessão"
                onClick={() => router.post('/sair', {}, {
                    onStart: () => router.clearHistory(),
                })}
            >
                <LogOut />
            </Button>
        </div>
    );
}

export default function AppLayout({ children }) {
    const pagina = usePage();
    const caminhoAtual = pagina.url.split('?')[0];
    const usuario = pagina.props.auth?.user ?? null;
    const links = obterLinksDeNavegacao(caminhoAtual, Boolean(usuario?.admin_plataforma));
    const [menuFixado, setMenuFixado] = useState(true);
    const [menuEmHover, setMenuEmHover] = useState(false);
    const [ignorarHover, setIgnorarHover] = useState(false);
    const [menuMobileAberto, setMenuMobileAberto] = useState(false);
    const menuExpandido = menuFixado || menuEmHover;

    useEffect(() => {
        setMenuMobileAberto(false);
    }, [pagina.url]);

    useEffect(() => {
        if (!menuMobileAberto) {
            return undefined;
        }

        const fecharComEscape = (evento) => {
            if (evento.key === 'Escape') {
                setMenuMobileAberto(false);
            }
        };

        window.addEventListener('keydown', fecharComEscape);

        return () => window.removeEventListener('keydown', fecharComEscape);
    }, [menuMobileAberto]);

    const alternarMenuFixo = () => {
        if (menuFixado) {
            setMenuFixado(false);
            setMenuEmHover(false);
            setIgnorarHover(true);
            return;
        }

        setMenuFixado(true);
        setMenuEmHover(false);
        setIgnorarHover(false);
    };

    const abrirMenuAoPassarMouse = () => {
        if (!menuFixado && !ignorarHover) {
            setMenuEmHover(true);
        }
    };

    const fecharMenuAoSairMouse = () => {
        setMenuEmHover(false);
        setIgnorarHover(false);
    };

    return (
        <div className="flex h-dvh min-h-0 overflow-hidden bg-background font-sans text-foreground">
            <div className={`relative z-40 hidden h-full shrink-0 transition-[width] duration-200 ease-out lg:block ${menuFixado ? 'w-60' : 'w-16'}`}>
                <aside
                    onMouseEnter={abrirMenuAoPassarMouse}
                    onMouseLeave={fecharMenuAoSairMouse}
                    className={`flex h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out ${menuFixado ? 'relative' : menuEmHover ? 'absolute inset-y-0 left-0' : 'relative'} ${menuExpandido ? 'w-60' : 'w-16'} ${menuEmHover && !menuFixado ? 'z-50 shadow-xl' : ''}`}
                >
                    <header className={`flex h-[76px] shrink-0 items-center border-b border-sidebar-border ${menuExpandido ? 'justify-between gap-3 px-4' : 'justify-center px-2'}`}>
                        {menuExpandido && (
                            <div className="flex min-w-0 items-center gap-3">
                                <MarcaFlowChat tamanho="md" />
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold tracking-[-0.03em] text-sidebar-foreground">FlowChat</p>
                                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-terracota-escuro dark:text-muted-foreground">Atendimento</p>
                                </div>
                            </div>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            aria-label={menuExpandido ? 'Recolher menu' : 'Expandir menu'}
                            aria-expanded={menuExpandido}
                            title={menuExpandido ? 'Recolher menu' : 'Expandir menu'}
                            onClick={alternarMenuFixo}
                        >
                            <Menu />
                        </Button>
                    </header>

                    <Navegacao links={links} compacto={!menuExpandido} />
                    <UsuarioDaSidebar usuario={usuario} compacto={!menuExpandido} />
                </aside>
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground"
                        aria-label="Abrir navegação"
                        aria-expanded={menuMobileAberto}
                        onClick={() => setMenuMobileAberto(true)}
                    >
                        <Menu />
                    </Button>
                    <div className="flex min-w-0 items-center gap-2.5">
                        <MarcaFlowChat tamanho="sm" sombra={false} />
                        <span className="truncate text-sm font-semibold tracking-tight">FlowChat</span>
                    </div>
                </header>

                <AvisoFusoPendente />

                <main className="min-h-0 min-w-0 flex-1 overflow-auto bg-background">
                    {children}
                </main>
            </div>

            <ModalFusoConfirmacao />

            {menuMobileAberto && (
                <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] lg:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 size-full cursor-default"
                        aria-label="Fechar navegação"
                        onClick={() => setMenuMobileAberto(false)}
                    />
                    <aside
                        id="navigation-drawer"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navegação principal"
                        className="relative z-10 flex h-full w-[min(18rem,calc(100vw-3rem))] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl"
                    >
                        <header className="flex h-[76px] shrink-0 items-center justify-between gap-3 border-b border-sidebar-border px-4">
                            <div className="flex min-w-0 items-center gap-3">
                                <MarcaFlowChat tamanho="md" sombra={false} />
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold tracking-[-0.03em]">FlowChat</p>
                                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-terracota-escuro dark:text-muted-foreground">Atendimento</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="shrink-0 text-muted-foreground"
                                aria-label="Fechar navegação"
                                onClick={() => setMenuMobileAberto(false)}
                            >
                                <X />
                            </Button>
                        </header>
                        <Navegacao links={links} onNavigate={() => setMenuMobileAberto(false)} />
                        <UsuarioDaSidebar usuario={usuario} />
                    </aside>
                </div>
            )}
        </div>
    );
}
