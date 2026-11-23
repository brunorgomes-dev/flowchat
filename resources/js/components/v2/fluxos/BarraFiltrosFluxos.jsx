import { Search } from 'lucide-react';

const filtros = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'ativos', rotulo: 'Ativos' },
    { valor: 'inativos', rotulo: 'Inativos' },
];

/**
 * Pesquisa por nome e filtro por estado, com a contagem da visão atual.
 */
export default function BarraFiltrosFluxos({ busca, aoBuscar, filtro, aoFiltrar, quantidadeVisivel, quantidadeTotal }) {
    return (
        <div className="v2-barra mt-4">
            <div className="relative min-w-[12rem] flex-1">
                <Search
                    className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--v2-ink-3)]"
                    aria-hidden="true"
                />
                <input
                    type="search"
                    value={busca}
                    onChange={(evento) => aoBuscar(evento.target.value)}
                    placeholder="Pesquisar por nome"
                    aria-label="Pesquisar fluxos por nome"
                    className="v2-entrada v2-entrada--icone"
                />
            </div>
            <div className="v2-segmentado" role="group" aria-label="Filtrar fluxos por estado">
                {filtros.map((opcao) => (
                    <button key={opcao.valor} type="button" aria-pressed={filtro === opcao.valor} onClick={() => aoFiltrar(opcao.valor)}>
                        {opcao.rotulo}
                    </button>
                ))}
            </div>
            <span className="v2-micro v2-numerico">{quantidadeVisivel} de {quantidadeTotal}</span>
        </div>
    );
}
