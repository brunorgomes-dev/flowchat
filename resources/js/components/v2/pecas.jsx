import { useEffect, useId, useRef, useState } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';

/**
 * Peças reutilizadas por todas as telas do preview V2.
 *
 * São componentes visuais próprios da V2 (não alteram os componentes da
 * interface atual) e não executam nenhuma requisição de escrita.
 */

export function CabecalhoPagina({ titulo, descricao, acoes, nota }) {
    return (
        <header className="v2-cabecalho">
            <div className="min-w-0">
                <h1 className="v2-titulo-pagina">{titulo}</h1>
                {descricao && <p className="v2-descricao-pagina">{descricao}</p>}
                {nota && <div className="mt-2">{nota}</div>}
            </div>
            {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
        </header>
    );
}

export function SeloLeitura({ texto = 'Preview somente leitura' }) {
    return (
        <span className="v2-selo v2-selo--leitura">
            <span className="v2-ponto" aria-hidden="true" />
            {texto}
        </span>
    );
}

export function SeloDemo({ texto = 'Dados de demonstração' }) {
    return <span className="v2-selo">{texto}</span>;
}

export function Chip({ tom = 'neutro', children, titulo }) {
    const classe = tom === 'neutro' ? 'v2-chip' : `v2-chip v2-chip--${tom}`;

    return (
        <span className={classe} title={titulo}>
            {children}
        </span>
    );
}

export function Aviso({ tom = 'info', titulo, children }) {
    return (
        <div className={`v2-aviso v2-aviso--${tom}`} role={tom === 'erro' ? 'alert' : 'status'}>
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
                {titulo && <p className="font-medium">{titulo}</p>}
                <div className={titulo ? 'mt-0.5' : undefined}>{children}</div>
            </div>
        </div>
    );
}

export function Secao({ titulo, nota, acoes, children, id }) {
    return (
        <section className="v2-secao" aria-labelledby={id}>
            <div className="v2-secao__cabecalho">
                <div className="min-w-0">
                    <h2 className="v2-secao__titulo" id={id}>
                        {titulo}
                    </h2>
                    {nota && <p className="v2-secao__nota">{nota}</p>}
                </div>
                {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
            </div>
            {children}
        </section>
    );
}

export function Metrica({ rotulo, valor, unidade, nota }) {
    return (
        <div className="v2-metrica">
            <span className="v2-metrica__rotulo">{rotulo}</span>
            <span className="v2-metrica__valor">
                {valor}
                {unidade && <span className="v2-metrica__unidade">{unidade}</span>}
            </span>
            {nota && <span className="v2-metrica__nota">{nota}</span>}
        </div>
    );
}

export function Avatar({ nome, iniciais, tamanho = 'normal', marca = false }) {
    const texto = iniciais ?? iniciaisDe(nome);
    const classes = [
        'v2-avatar',
        tamanho === 'grande' ? 'v2-avatar--grande' : '',
        marca ? 'v2-avatar--marca' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <span className={classes} aria-hidden="true">
            {texto}
        </span>
    );
}

function iniciaisDe(nome = '') {
    const partes = String(nome).trim().split(/\s+/).filter(Boolean);

    if (partes.length === 0) {
        return '—';
    }

    if (partes.length === 1) {
        return partes[0].slice(0, 2).toUpperCase();
    }

    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export function Vazio({ titulo, texto, acao, icone: Icone }) {
    return (
        <div className="v2-vazio">
            {Icone && <Icone className="mx-auto size-5 text-[var(--v2-ink-3)]" aria-hidden="true" />}
            <p className="v2-vazio__titulo">{titulo}</p>
            {texto && <p className="v2-vazio__texto">{texto}</p>}
            {acao && <div className="mt-3 flex justify-center">{acao}</div>}
        </div>
    );
}

export function Esqueleto({ linhas = 3, rotulo = 'Carregando conteúdo' }) {
    return (
        <div role="status" aria-live="polite" className="p-4">
            <span className="v2-oculto-visual">{rotulo}</span>
            {Array.from({ length: linhas }).map((_, indice) => (
                <span
                    key={indice}
                    className="v2-esqueleto"
                    style={{ width: `${[92, 78, 64, 84, 70][indice % 5]}%` }}
                />
            ))}
        </div>
    );
}

export function Campo({ rotulo, htmlFor, ajuda, erro, children }) {
    return (
        <div className="v2-campo">
            {rotulo && (
                <label className="v2-campo__rotulo" htmlFor={htmlFor}>
                    {rotulo}
                </label>
            )}
            {children}
            {erro && (
                <span className="v2-campo__erro" role="alert" id={`${htmlFor}-erro`}>
                    {erro}
                </span>
            )}
            {ajuda && !erro && (
                <span className="v2-campo__ajuda" id={`${htmlFor}-ajuda`}>
                    {ajuda}
                </span>
            )}
        </div>
    );
}

export function CampoSenha({ id, valor, aoAlterar, erro, ajuda, rotulo = 'Senha', autoComplete = 'current-password', placeholder }) {
    const [visivel, setVisivel] = useState(false);

    return (
        <Campo rotulo={rotulo} htmlFor={id} erro={erro} ajuda={ajuda}>
            <div className="v2-campo-senha">
                <input
                    id={id}
                    className="v2-entrada"
                    type={visivel ? 'text' : 'password'}
                    value={valor}
                    onChange={(evento) => aoAlterar(evento.target.value)}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    aria-invalid={Boolean(erro)}
                    aria-describedby={erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined}
                />
                <button
                    type="button"
                    className="v2-campo-senha__botao"
                    aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={visivel}
                    onClick={() => setVisivel((atual) => !atual)}
                >
                    {visivel ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
            </div>
        </Campo>
    );
}

export function Interruptor({ id, marcado, aoAlterar, titulo, descricao, desabilitado = false }) {
    return (
        <div className="flex items-start gap-2.5">
            <input
                id={id}
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-[var(--v2-primario)]"
                checked={marcado}
                onChange={(evento) => aoAlterar(evento.target.checked)}
                disabled={desabilitado}
            />
            <div className="min-w-0">
                <label htmlFor={id} className="block cursor-pointer text-[0.8125rem] font-medium">
                    {titulo}
                </label>
                {descricao && <span className="mt-0.5 block text-xs leading-5 text-[var(--v2-ink-2)]">{descricao}</span>}
            </div>
        </div>
    );
}

export function Segmentado({ rotulo, opcoes, valor, aoAlterar, className = '' }) {
    return (
        <div className={`v2-segmentado ${className}`} role="group" aria-label={rotulo}>
            {opcoes.map((opcao) => (
                <button
                    key={opcao.valor}
                    type="button"
                    aria-pressed={valor === opcao.valor}
                    onClick={() => aoAlterar(opcao.valor)}
                >
                    {opcao.rotulo}
                </button>
            ))}
        </div>
    );
}

/**
 * Diálogo acessível do preview: fecha com Escape, mantém o foco no painel
 * enquanto aberto e devolve o foco ao elemento de origem ao fechar.
 */
export function Dialogo({ aberto, titulo, descricao, children, acoes, aoFechar, icone: Icone }) {
    const idTitulo = useId();
    const idDescricao = useId();
    const painel = useRef(null);
    const origem = useRef(null);
    const aoFecharAtual = useRef(aoFechar);

    useEffect(() => {
        aoFecharAtual.current = aoFechar;
    });

    useEffect(() => {
        if (!aberto) {
            return undefined;
        }

        origem.current = document.activeElement;
        painel.current?.focus();

        const aoTeclar = (evento) => {
            if (evento.key === 'Escape') {
                evento.stopPropagation();
                aoFecharAtual.current();
            }
        };

        document.addEventListener('keydown', aoTeclar);

        return () => {
            document.removeEventListener('keydown', aoTeclar);
            origem.current?.focus?.();
        };
    }, [aberto]);

    if (!aberto) {
        return null;
    }

    return (
        <div className="v2-dialogo">
            <button
                type="button"
                className="absolute inset-0 size-full cursor-default"
                aria-label="Fechar diálogo"
                onClick={aoFechar}
            />
            <div
                ref={painel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={idTitulo}
                aria-describedby={descricao ? idDescricao : undefined}
                tabIndex={-1}
                className="v2-dialogo__painel relative"
            >
                <div className="v2-dialogo__cabecalho">
                    {Icone && (
                        <span className="mt-0.5 text-[var(--v2-destaque)]">
                            <Icone className="size-4" aria-hidden="true" />
                        </span>
                    )}
                    <div className="min-w-0">
                        <h2 className="v2-dialogo__titulo" id={idTitulo}>
                            {titulo}
                        </h2>
                        {descricao && (
                            <p className="v2-dialogo__texto" id={idDescricao}>
                                {descricao}
                            </p>
                        )}
                    </div>
                </div>
                {children && <div className="v2-dialogo__corpo">{children}</div>}
                <div className="v2-dialogo__acoes">{acoes}</div>
            </div>
        </div>
    );
}

export function TabelaArea({ rotulo, children, className = '' }) {
    return (
        <div className={`v2-tabela-area ${className}`} role="region" aria-label={rotulo} tabIndex={0}>
            {children}
        </div>
    );
}

/**
 * Gaveta lateral acessível: usada pelos detalhes do contato no celular e em
 * telas médias. Fecha com Escape, prende o foco no painel e devolve o foco ao
 * elemento de origem.
 */
export function Gaveta({ aberto, titulo, aoFechar, children }) {
    const idTitulo = useId();
    const painel = useRef(null);
    const origem = useRef(null);
    const aoFecharAtual = useRef(aoFechar);

    useEffect(() => {
        aoFecharAtual.current = aoFechar;
    });

    useEffect(() => {
        if (!aberto) {
            return undefined;
        }

        origem.current = document.activeElement;
        painel.current?.focus();

        const aoTeclar = (evento) => {
            if (evento.key === 'Escape') {
                evento.stopPropagation();
                aoFecharAtual.current();
            }
        };

        document.addEventListener('keydown', aoTeclar);

        return () => {
            document.removeEventListener('keydown', aoTeclar);
            origem.current?.focus?.();
        };
    }, [aberto]);

    if (!aberto) {
        return null;
    }

    return (
        <div className="v2-gaveta">
            <button
                type="button"
                className="absolute inset-0 size-full cursor-default"
                aria-label="Fechar detalhes"
                onClick={aoFechar}
            />
            <section
                ref={painel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={idTitulo}
                tabIndex={-1}
                className="v2-gaveta__painel relative"
            >
                <header className="v2-gaveta__cabecalho">
                    <h2 id={idTitulo} className="text-[0.875rem] font-semibold">
                        {titulo}
                    </h2>
                    <button
                        type="button"
                        className="v2-btn v2-btn--fantasma v2-btn--icone"
                        aria-label="Fechar detalhes"
                        onClick={aoFechar}
                    >
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                        </svg>
                    </button>
                </header>
                <div className="v2-gaveta__corpo">{children}</div>
            </section>
        </div>
    );
}

/**
 * Marca os contêineres roláveis com `data-rolagem="ativa"` por um instante,
 * para a barra aparecer durante a rolagem e sumir depois. Um único listener
 * em fase de captura cobre todos os contêineres da V2.
 */
export function useBarraDeRolagemVisivel() {
    useEffect(() => {
        let temporizador;

        const aoRolar = (evento) => {
            const alvo = evento.target;

            if (!(alvo instanceof HTMLElement)) {
                return;
            }

            const estilo = getComputedStyle(alvo);

            if (!/(auto|scroll)/.test(`${estilo.overflowY} ${estilo.overflowX}`)) {
                return;
            }

            alvo.dataset.rolagem = 'ativa';
            clearTimeout(temporizador);
            temporizador = setTimeout(() => {
                delete alvo.dataset.rolagem;
            }, 900);
        };

        document.addEventListener('scroll', aoRolar, true);

        return () => {
            document.removeEventListener('scroll', aoRolar, true);
            clearTimeout(temporizador);
        };
    }, []);
}
