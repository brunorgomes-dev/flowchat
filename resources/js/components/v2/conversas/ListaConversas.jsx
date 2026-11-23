import { LoaderCircle, Search } from 'lucide-react';
import { Chip, Esqueleto, Vazio } from '@/components/v2/pecas';
import ItemConversa from './ItemConversa';

/**
 * Coluna esquerda da caixa de conversas: busca, filtro por anúncio, lista
 * paginada por cursor e estados de carregamento.
 */
export default function ListaConversas({
    busca,
    aoBuscar,
    adId,
    aoRemoverFiltroAnuncio,
    lista,
    totalConversas,
    contatoSelecionadoId,
    carregandoLista,
    carregandoMais,
    temMaisLista,
    erroLista,
    aoSelecionarContato,
    aoCarregarMais,
    aoLimparBuscaEFiltros,
}) {
    return (
        <section className="v2-conversas__lista" aria-label="Lista de conversas">
            <div className="v2-conversas__topo">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h1 className="text-base font-semibold">Conversas</h1>
                        <p className="text-[0.6875rem] text-[var(--v2-ink-2)]">Caixa de atendimento</p>
                    </div>
                    <Chip>{totalConversas}</Chip>
                </div>

                <div className="relative mt-3">
                    <Search
                        className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--v2-ink-3)]"
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        value={busca}
                        onChange={(evento) => aoBuscar(evento.target.value)}
                        placeholder="Buscar por nome, PSID, anúncio ou mensagem"
                        aria-label="Buscar conversas"
                        className="v2-entrada v2-entrada--icone"
                    />
                </div>

                {adId && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Chip tom="marca">Anúncio {adId}</Chip>
                        <button
                            type="button"
                            className="v2-btn v2-btn--fantasma v2-btn--pequeno"
                            onClick={aoRemoverFiltroAnuncio}
                        >
                            Remover filtro
                        </button>
                    </div>
                )}
            </div>

            <div className="v2-conversas__rolagem">
                {carregandoLista ? (
                    <Esqueleto linhas={6} rotulo="Carregando lista de conversas" />
                ) : lista.length === 0 ? (
                    <div className="p-4">
                        <Vazio
                            icone={Search}
                            titulo={busca || adId ? 'Nenhuma conversa encontrada' : 'Ainda não há conversas'}
                            texto={busca || adId
                                ? 'Tente outro nome, PSID ou termo do anúncio, ou remova o filtro.'
                                : 'Os contatos aparecem aqui quando a Página receber a primeira mensagem.'}
                            acao={(busca || adId) ? (
                                <button
                                    type="button"
                                    className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                    onClick={aoLimparBuscaEFiltros}
                                >
                                    Limpar busca e filtros
                                </button>
                            ) : null}
                        />
                    </div>
                ) : (
                    <ul className="v2-lista">
                        {lista.map((contato) => (
                            <ItemConversa
                                key={contato.id}
                                contato={contato}
                                ativo={contato.id === contatoSelecionadoId}
                                aoSelecionar={aoSelecionarContato}
                            />
                        ))}
                    </ul>
                )}
            </div>

            <div className="v2-conversas__rodape">
                <span className="v2-numerico">{lista.length} de {totalConversas}</span>
                {temMaisLista ? (
                    <button
                        type="button"
                        className="v2-btn v2-btn--contorno v2-btn--pequeno"
                        onClick={aoCarregarMais}
                        disabled={carregandoMais}
                    >
                        {carregandoMais ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                        {carregandoMais ? 'Carregando…' : 'Carregar mais'}
                    </button>
                ) : (
                    <span className="v2-micro">Todas as conversas carregadas</span>
                )}
            </div>
            {erroLista && (
                <p role="alert" className="v2-campo__erro px-3 pb-2">
                    {erroLista}
                </p>
            )}
        </section>
    );
}
