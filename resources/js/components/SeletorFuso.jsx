import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Globe, Search } from 'lucide-react';
import { nomeDoPais } from '@/lib/fusos';

// Altura máxima da lista em px (equivalente a max-h-72)
const ALTURA_LISTA = 288;

// Nomes das regiões dos identificadores IANA em português do Brasil
const REGIOES = {
    Africa: 'África',
    America: 'América',
    Antarctica: 'Antártida',
    Arctic: 'Ártico',
    Asia: 'Ásia',
    Atlantic: 'Atlântico',
    Australia: 'Austrália',
    Europe: 'Europa',
    Indian: 'Índico',
    Pacific: 'Pacífico',
    Etc: 'Outros',
    UTC: 'UTC',
};

// "UTC" e "Outros" (Etc) ficam no fim da lista, depois das regiões geográficas
const ordemRegiao = (nome) => (nome === 'Outros' || nome === 'UTC' ? 1 : 0);

// Apelidos em português para nomes de cidades dos identificadores IANA
// (que vêm em inglês), tornando a pesquisa prática também por cidade
const APELIDOS_CIDADE = {
    'lisboa': 'lisbon',
    'londres': 'london',
    'roma': 'rome',
    'viena': 'vienna',
    'atenas': 'athens',
    'berlim': 'berlin',
    'toquio': 'tokyo',
    'pequim': 'beijing',
    'moscou': 'moscow',
    'nova iorque': 'new york',
    'nova york': 'new york',
    'praia': 'cape verde',
    'praga': 'prague',
    'estocolmo': 'stockholm',
    'copenhague': 'copenhagen',
    'bruxelas': 'brussels',
    'cidade do mexico': 'mexico city',
};

// Lowercase sem acentos, para comparar "São Paulo" com "Sao_Paulo", etc.
const normalizar = (texto) => texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Seletor de fuso horário com pesquisa por cidade, país ou identificador.
 * A lista completa vem do backend (DateTimeZone::listIdentifiers,
 * identificadores IANA válidos de todas as regiões: África, América, Ásia,
 * Europa, Pacífico etc.) e é agrupada por região aqui; a pesquisa filtra.
 */
export function SeletorFuso({ fusos, valor, aoSelecionar, idInput = 'fuso-seletor' }) {
    const [pesquisa, setPesquisa] = useState('');
    const [aberta, setAberta] = useState(false);
    const [abrirParaCima, setAbrirParaCima] = useState(false);
    const [alturaMaxima, setAlturaMaxima] = useState(ALTURA_LISTA);
    const campoRef = useRef(null);

    // A lista abre abaixo do campo; quando não cabe na altura da tela
    // (campo perto do fim da página), vira para cima com altura adaptativa
    const calcularPosicao = () => {
        const retangulo = campoRef.current?.getBoundingClientRect();

        if (!retangulo) {
            return;
        }

        const areaRolavel = campoRef.current.closest('main');
        const limites = areaRolavel?.getBoundingClientRect();
        const topoVisivel = limites?.top ?? 0;
        const fimVisivel = limites?.bottom ?? window.innerHeight;
        const espacoAbaixo = fimVisivel - retangulo.bottom;
        const espacoAcima = retangulo.top - topoVisivel;

        if (espacoAbaixo >= ALTURA_LISTA) {
            setAbrirParaCima(false);
            setAlturaMaxima(ALTURA_LISTA);
        } else if (espacoAcima > espacoAbaixo) {
            setAbrirParaCima(true);
            setAlturaMaxima(Math.max(0, Math.min(ALTURA_LISTA, espacoAcima - 12)));
        } else {
            setAbrirParaCima(false);
            setAlturaMaxima(Math.max(0, Math.min(ALTURA_LISTA, espacoAbaixo - 12)));
        }
    };

    // Recalcula ao abrir e enquanto a lista está aberta (rolagem da página,
    // do container principal ou redimensionamento da janela)
    useLayoutEffect(() => {
        if (!aberta) {
            return undefined;
        }

        calcularPosicao();

        const recalcular = () => calcularPosicao();
        // capture: a rolagem de containers internos (main com overflow-auto)
        // não borbulha até o window
        window.addEventListener('scroll', recalcular, true);
        window.addEventListener('resize', recalcular);

        return () => {
            window.removeEventListener('scroll', recalcular, true);
            window.removeEventListener('resize', recalcular);
        };
    }, [aberta]);

    const resultado = useMemo(() => {
        const termo = normalizar(pesquisa.trim());
        const termos = [termo, APELIDOS_CIDADE[termo]].filter(Boolean);

        const filtrados = fusos.filter((fuso) => {
            if (termos.length === 0) {
                return true;
            }

            const identificador = normalizar(fuso.id.replace(/_/g, ' '));
            const pais = normalizar(`${fuso.pais ?? ''} ${nomeDoPais(fuso.pais) ?? ''}`);

            return termos.some((t) => identificador.includes(t) || pais.includes(t));
        });

        const agrupados = new Map();
        for (const fuso of filtrados) {
            const chave = fuso.id.includes('/') ? fuso.id.split('/')[0] : 'UTC';
            const regiao = REGIOES[chave] ?? chave;

            if (!agrupados.has(regiao)) {
                agrupados.set(regiao, []);
            }

            agrupados.get(regiao).push(fuso);
        }

        const grupos = [...agrupados.entries()].sort(([a], [b]) => (
            ordemRegiao(a) - ordemRegiao(b) || a.localeCompare(b, 'pt-BR')
        ));

        return { total: filtrados.length, grupos };
    }, [fusos, pesquisa]);

    const selecionar = (identificador) => {
        aoSelecionar(identificador);
        setPesquisa('');
        setAberta(false);
    };

    return (
        <div className="relative">
            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Pesquisar fuso horário
                <span className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                    <input
                        id={idInput}
                        ref={campoRef}
                        type="text"
                        role="combobox"
                        aria-expanded={aberta}
                        aria-controls={`${idInput}-lista`}
                        aria-autocomplete="list"
                        autoComplete="off"
                        value={pesquisa}
                        placeholder="País, cidade ou identificador (ex.: Brasil, São Paulo, America/Sao_Paulo)"
                        onFocus={() => setAberta(true)}
                        onBlur={() => setAberta(false)}
                        onKeyDown={(evento) => {
                            if (evento.key === 'Escape') {
                                setPesquisa('');
                                setAberta(false);
                            }
                        }}
                        onChange={(evento) => {
                            setPesquisa(evento.target.value);
                            setAberta(true);
                        }}
                        className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-9 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                </span>
            </label>

            {aberta && (
                // preventDefault no mousedown mantém o foco no input para que
                // o clique na opção aconteça antes do onBlur fechar a lista
                <div
                    id={`${idInput}-lista`}
                    role="listbox"
                    aria-label="Fusos horários disponíveis"
                    onMouseDown={(evento) => evento.preventDefault()}
                    style={{ maxHeight: alturaMaxima }}
                    className={`absolute z-30 w-full overflow-auto rounded-xl border border-border bg-card p-1.5 shadow-lg ${abrirParaCima ? 'bottom-full mb-1.5' : 'mt-1.5'}`}
                >
                    {resultado.total === 0 ? (
                        <p className="px-3 py-3 text-xs text-muted-foreground">
                            {pesquisa.trim() === ''
                                ? 'Nenhum fuso horário disponível.'
                                : `Nenhum fuso horário encontrado para "${pesquisa.trim()}".`}
                        </p>
                    ) : (
                        resultado.grupos.map(([regiao, fusosDaRegiao]) => (
                            <div key={regiao} className="mb-1 last:mb-0">
                                <p className="sticky top-0 bg-card px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    {regiao}
                                </p>
                                <ul>
                                    {fusosDaRegiao.map((fuso) => {
                                        const selecionado = fuso.id === valor;

                                        return (
                                            <li key={fuso.id}>
                                                <button
                                                    type="button"
                                                    role="option"
                                                    aria-selected={selecionado}
                                                    onClick={() => selecionar(fuso.id)}
                                                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-terracota/10 ${selecionado ? 'bg-terracota/10 font-medium text-terracota-escuro dark:text-foreground' : 'text-foreground'}`}
                                                >
                                                    <Globe className={`size-3.5 shrink-0 ${selecionado ? 'text-terracota' : 'text-muted-foreground'}`} strokeWidth={1.8} aria-hidden="true" />
                                                    <span className="min-w-0 flex-1 truncate">{fuso.id}</span>
                                                    {fuso.pais && (
                                                        <span className="shrink-0 text-[11px] text-muted-foreground">
                                                            {nomeDoPais(fuso.pais) ?? fuso.pais}
                                                        </span>
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
