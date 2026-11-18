import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';

/**
 * Trilho de navegação compartilhado pela interface padrão (V2) e pelo preview.
 * Recebe os grupos de links para que cada casca defina o próprio escopo.
 */

export function itemAtivo(caminho, href) {
    if (href === '/') {
        return caminho === '/' || caminho.startsWith('/conversas') || caminho.startsWith('/contatos/');
    }

    if (href === '/configuracoes') {
        return caminho === '/configuracoes';
    }

    return caminho === href || caminho.startsWith(`${href}/`);
}

function ItemFlyout({ item, caminho, aoNavegar, prefixoId = '' }) {
    const [aberto, setAberto] = useState(false);
    const [posicao, setPosicao] = useState(null);
    const [pronto, setPronto] = useState(false);
    const botaoRef = useRef(null);
    const painelRef = useRef(null);
    const timeoutFechar = useRef(null);
    const timeoutVerificarFoco = useRef(null);
    const painelId = `${prefixoId}${prefixoId ? '-' : ''}v2-flyout-${item.href.replace(/\//g, '-')}`;
    const Icone = item.icone;
    const ativo = itemAtivo(caminho, item.href);
    const temAtivoFilho = item.filhos.some((filho) => itemAtivo(caminho, filho.href));

    const focoDentro = () => (
        botaoRef.current?.contains(document.activeElement) === true
        || painelRef.current?.contains(document.activeElement) === true
    );

    const abrir = () => {
        clearTimeout(timeoutFechar.current);
        setAberto(true);
    };

    const fechar = () => {
        clearTimeout(timeoutFechar.current);
        setAberto(false);
    };

    const agendarFechar = () => {
        clearTimeout(timeoutFechar.current);
        timeoutFechar.current = setTimeout(() => {
            if (!focoDentro()) {
                setAberto(false);
            }
        }, 120);
    };

    const cancelarFechar = () => {
        clearTimeout(timeoutFechar.current);
    };

    const navegar = (evento) => {
        aoNavegar?.(evento);
        fechar();
    };

    const verificarFoco = () => {
        clearTimeout(timeoutVerificarFoco.current);
        timeoutVerificarFoco.current = setTimeout(() => {
            if (!focoDentro()) {
                setAberto(false);
            }
        }, 0);
    };

    useEffect(() => () => {
        clearTimeout(timeoutFechar.current);
        clearTimeout(timeoutVerificarFoco.current);
    }, []);

    useEffect(() => {
        if (!aberto) {
            return undefined;
        }

        const fecharPorCliqueFora = (evento) => {
            const botao = botaoRef.current;
            const painel = painelRef.current;

            if (!botao || !painel) {
                return;
            }

            if (!botao.contains(evento.target) && !painel.contains(evento.target)) {
                fechar();
            }
        };

        document.addEventListener('pointerdown', fecharPorCliqueFora);
        return () => document.removeEventListener('pointerdown', fecharPorCliqueFora);
    }, [aberto]);

    useLayoutEffect(() => {
        if (!aberto) {
            setPosicao(null);
            setPronto(false);
            return undefined;
        }

        const medir = (comPainel) => {
            const botao = botaoRef.current;
            const painel = painelRef.current;
            if (!botao) {
                return null;
            }

            const rect = botao.getBoundingClientRect();
            const header = document.querySelector('.v2-topo');
            const margem = 8;
            const topoMinimo = (header?.getBoundingClientRect().bottom ?? margem) + margem;
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight,
            };
            const alturaMaxima = viewport.height - topoMinimo - margem;

            let top = rect.top;
            let left = rect.right + 4;

            if (comPainel && painel) {
                const painelRect = painel.getBoundingClientRect();

                if (painelRect.height > alturaMaxima) {
                    top = topoMinimo;
                } else {
                    top = Math.max(topoMinimo, Math.min(top, viewport.height - painelRect.height - margem));
                }

                left = Math.min(left, viewport.width - painelRect.width - margem);
            }

            return { top, left, alturaMaxima };
        };

        const inicial = medir(false);
        if (inicial) {
            setPosicao(inicial);
        }

        const atualizar = () => {
            const final = medir(true);
            if (final) {
                setPosicao(final);
                setPronto(true);
            }
        };

        const id = requestAnimationFrame(atualizar);
        window.addEventListener('resize', atualizar);
        const nav = botaoRef.current?.closest('nav');
        nav?.addEventListener('scroll', atualizar, { passive: true });

        return () => {
            cancelAnimationFrame(id);
            window.removeEventListener('resize', atualizar);
            nav?.removeEventListener('scroll', atualizar);
        };
    }, [aberto]);

    return (
        <div
            className="v2-rail__flyout"
            onMouseEnter={abrir}
            onMouseLeave={agendarFechar}
            onKeyDown={(evento) => {
                if (evento.key === 'Escape') {
                    evento.stopPropagation();
                    fechar();
                    botaoRef.current?.focus();
                }
            }}
        >
            <button
                ref={botaoRef}
                type="button"
                className={`v2-rail__link v2-rail__link--compacto w-full ${ativo || temAtivoFilho ? 'v2-rail__link--ativo-filho' : ''}`}
                aria-expanded={aberto}
                aria-controls={aberto ? painelId : undefined}
                aria-label={item.rotulo}
                title={item.rotulo}
                onClick={abrir}
                onFocus={abrir}
                onBlur={verificarFoco}
            >
                {Icone && <Icone className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.7} />}
            </button>
            {aberto && posicao && (
                <div
                    ref={painelRef}
                    id={painelId}
                    className={`v2-rail__flyout-painel v2-rail__flyout-painel--fixo ${pronto ? 'v2-rail__flyout-painel--pronto' : ''}`}
                    style={{ top: posicao.top, left: posicao.left, maxHeight: posicao.alturaMaxima }}
                    onMouseEnter={cancelarFechar}
                    onMouseLeave={agendarFechar}
                    onBlur={verificarFoco}
                >
                    <p className="v2-rail__flyout-titulo">{item.rotulo}</p>
                    <ul className="v2-rail__flyout-lista">
                        {item.filhos.map((filho) => (
                            <li key={`${filho.href}-${filho.rotulo}`}>
                                <Link
                                    href={filho.href}
                                    onClick={navegar}
                                    aria-current={itemAtivo(caminho, filho.href) ? 'page' : undefined}
                                    className="v2-rail__link v2-rail__link--filho"
                                >
                                    <span className="truncate">{filho.rotulo}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function ItemNavegacao({ item, caminho, aoNavegar, prefixoId = '' }) {
    const Icone = item.icone;
    const ativo = itemAtivo(caminho, item.href);
    const temFilhos = Boolean(item.filhos?.length);

    if (temFilhos) {
        return <ItemFlyout item={item} caminho={caminho} aoNavegar={aoNavegar} prefixoId={prefixoId} />;
    }

    return (
        <Link
            href={item.href}
            onClick={aoNavegar}
            aria-current={ativo ? 'page' : undefined}
            aria-label={item.rotulo}
            title={item.rotulo}
            className="v2-rail__link v2-rail__link--compacto"
        >
            {Icone && <Icone className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.7} />}
            <span className="v2-oculto-visual">{item.rotulo}</span>
        </Link>
    );
}

export function NavegacaoV2({ caminho, grupos, aoNavegar, compacto = false, prefixoId = '' }) {
    const [abertos, setAbertos] = useState(() => grupos
        .flatMap((grupo) => grupo.itens)
        .filter((item) => item.filhos?.some((filho) => itemAtivo(caminho, filho.href)))
        .map((item) => item.href));

    useEffect(() => {
        const ativos = grupos
            .flatMap((grupo) => grupo.itens)
            .filter((item) => item.filhos?.some((filho) => itemAtivo(caminho, filho.href)))
            .map((item) => item.href);

        if (ativos.length === 0) {
            return;
        }

        setAbertos((atuais) => (ativos.every((href) => atuais.includes(href))
            ? atuais
            : [...new Set([...atuais, ...ativos])]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [caminho]);

    return (
        <nav aria-label="Navegação principal" className={compacto ? 'v2-rail__nav--compacto' : undefined}>
            {grupos.map((grupo) => (
                <div key={grupo.titulo} className="v2-rail__grupo">
                    <p className="v2-rail__titulo">{grupo.titulo}</p>
                    <ul className="v2-rail__lista">
                        {grupo.itens.map((item) => {
                            const Icone = item.icone;
                            const ativo = itemAtivo(caminho, item.href);
                            const temFilhos = Boolean(item.filhos?.length);
                            const expandido = abertos.includes(item.href);
                            const submenuId = `${prefixoId}${prefixoId ? '-' : ''}v2-submenu-${item.href.replace(/\//g, '-')}`;

                            if (compacto) {
                                return (
                                    <li key={item.href}>
                                        <ItemNavegacao item={item} caminho={caminho} aoNavegar={aoNavegar} prefixoId={prefixoId} />
                                    </li>
                                );
                            }

                            return (
                                <li key={item.href}>
                                    {temFilhos ? (
                                        <button
                                            type="button"
                                            className="v2-rail__link w-full"
                                            aria-expanded={expandido}
                                            aria-controls={submenuId}
                                            onClick={() => setAbertos((atuais) => (atuais.includes(item.href)
                                                ? atuais.filter((href) => href !== item.href)
                                                : [...atuais, item.href]))}
                                        >
                                            {Icone && <Icone className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.7} />}
                                            <span className="truncate">{item.rotulo}</span>
                                            <ChevronDown
                                                className={`v2-rail__chevron size-3.5 shrink-0 ${expandido ? 'v2-rail__chevron--aberto' : ''}`}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    ) : (
                                        <Link
                                            href={item.href}
                                            onClick={aoNavegar}
                                            aria-current={ativo ? 'page' : undefined}
                                            className="v2-rail__link"
                                        >
                                            {Icone && <Icone className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.7} />}
                                            <span className="truncate">{item.rotulo}</span>
                                        </Link>
                                    )}

                                    {temFilhos && (
                                        <div
                                            id={submenuId}
                                            aria-hidden={!expandido}
                                            className={`v2-rail__submenu ${expandido ? 'v2-rail__submenu--aberto' : ''}`}
                                            inert={!expandido}
                                        >
                                            <div className="v2-rail__submenu-conteudo">
                                                {item.filhos.map((filho) => (
                                                    <Link
                                                        key={`${filho.href}-${filho.rotulo}`}
                                                        href={filho.href}
                                                        onClick={aoNavegar}
                                                        aria-current={itemAtivo(caminho, filho.href) ? 'page' : undefined}
                                                        className="v2-rail__link v2-rail__link--filho"
                                                    >
                                                        <span className="truncate">{filho.rotulo}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}
