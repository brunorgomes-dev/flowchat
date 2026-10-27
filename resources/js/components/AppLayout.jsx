import { useEffect, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageCircle,
    MessagesSquare,
    Settings2,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function obterLinksDeNavegacao(caminhoAtual) {
    return [
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
        {
            href: '/painel',
            label: 'Painel',
            icone: LayoutDashboard,
            ativo: caminhoAtual === '/painel',
        },
    ];
}

function LinkDeNavegacao({ item, compacto = false, onClick }) {
    const Icone = item.icone;

    return (
        <Link
            href={item.href}
            onClick={onClick}
            aria-current={item.ativo ? 'page' : undefined}
            aria-label={compacto ? item.label : undefined}
            title={compacto ? item.label : undefined}
            className={`flex h-11 w-full items-center gap-3 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${compacto ? 'justify-center px-0' : 'px-3'} ${item.ativo
                ? 'bg-terracota/10 text-terracota-escuro'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
        >
            <Icone className={`size-[18px] shrink-0 ${item.ativo ? 'text-terracota' : ''}`} strokeWidth={1.8} />
            {!compacto && <span className="truncate">{item.label}</span>}
        </Link>
    );
}

function Navegacao({ links, compacto = false, onNavigate }) {
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
                {links.map((item) => (
                    <LinkDeNavegacao
                        key={item.href}
                        item={item}
                        compacto={compacto}
                        onClick={onNavigate}
                    />
                ))}
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
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-terracota/10 text-terracota-escuro">
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
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground"
                aria-label="Sair (indisponível)"
                title="A saída da conta ainda não está disponível"
                disabled
            >
                <LogOut />
            </Button>
        </div>
    );
}

export default function AppLayout({ children }) {
    const pagina = usePage();
    const caminhoAtual = pagina.url.split('?')[0];
    const links = obterLinksDeNavegacao(caminhoAtual);
    const usuario = pagina.props.auth?.user ?? null;
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
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-terracota text-primary-foreground shadow-sm">
                                    <MessagesSquare className="size-[19px]" strokeWidth={1.9} />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold tracking-[-0.03em] text-sidebar-foreground">FlowChat</p>
                                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-terracota-escuro">Atendimento</p>
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
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-terracota text-primary-foreground">
                            <MessagesSquare className="size-4" />
                        </div>
                        <span className="truncate text-sm font-semibold tracking-tight">FlowChat</span>
                    </div>
                </header>

                <main className="min-h-0 min-w-0 flex-1 overflow-auto bg-background">
                    {children}
                </main>
            </div>

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
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-terracota text-primary-foreground">
                                    <MessagesSquare className="size-[19px]" />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold tracking-[-0.03em]">FlowChat</p>
                                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-terracota-escuro">Atendimento</p>
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
