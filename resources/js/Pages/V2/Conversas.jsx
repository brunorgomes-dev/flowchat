import LayoutV2 from '@/components/v2/LayoutV2';
import FichaDoContato from '@/components/v2/conversas/FichaDoContato';
import ListaConversas from '@/components/v2/conversas/ListaConversas';
import ThreadConversa from '@/components/v2/conversas/ThreadConversa';
import useConversas from '@/components/v2/conversas/useConversas';
import { Gaveta } from '@/components/v2/pecas';

export default function Conversas({ conversas, conversa = null }) {
    const {
        busca,
        alterarBusca,
        adId,
        removerFiltroAnuncio,
        lista,
        totalConversas,
        contatoSelecionado,
        mensagens,
        grupos,
        totalMensagens,
        temMaisThread,
        temMaisLista,
        carregandoLista,
        carregandoMais,
        carregandoThread,
        carregandoAnteriores,
        erroLista,
        detalhesAbertos,
        abrirDetalhes,
        fecharDetalhes,
        corpoDaThread,
        form,
        selecionarContato,
        voltarParaLista,
        carregarMaisConversas,
        carregarAnteriores,
        enviar,
        limparBuscaEFiltros,
    } = useConversas(conversas, conversa);

    return (
        <>
            <div className={`v2-conversas ${contatoSelecionado ? 'v2-conversas--com-contato' : ''}`}>
                <ListaConversas
                    busca={busca}
                    aoBuscar={alterarBusca}
                    adId={adId}
                    aoRemoverFiltroAnuncio={removerFiltroAnuncio}
                    lista={lista}
                    totalConversas={totalConversas}
                    contatoSelecionadoId={contatoSelecionado?.id ?? null}
                    carregandoLista={carregandoLista}
                    carregandoMais={carregandoMais}
                    temMaisLista={temMaisLista}
                    erroLista={erroLista}
                    aoSelecionarContato={selecionarContato}
                    aoCarregarMais={carregarMaisConversas}
                    aoLimparBuscaEFiltros={limparBuscaEFiltros}
                />

                <ThreadConversa
                    contato={contatoSelecionado}
                    mensagens={mensagens}
                    grupos={grupos}
                    temMaisThread={temMaisThread}
                    carregandoThread={carregandoThread}
                    carregandoAnteriores={carregandoAnteriores}
                    detalhesAbertos={detalhesAbertos}
                    corpoDaThread={corpoDaThread}
                    aoVoltar={voltarParaLista}
                    aoAbrirDetalhes={abrirDetalhes}
                    aoCarregarAnteriores={carregarAnteriores}
                    form={form}
                    aoEnviar={enviar}
                    primeiroContatoId={lista[0]?.id ?? null}
                    aoSelecionarContato={selecionarContato}
                />

                {contatoSelecionado && (
                    <aside className="v2-ficha" aria-label="Detalhes do contato">
                        <FichaDoContato contato={contatoSelecionado} totalMensagens={totalMensagens} />
                    </aside>
                )}
            </div>

            <Gaveta aberto={detalhesAbertos} titulo="Detalhes do contato" aoFechar={fecharDetalhes}>
                {contatoSelecionado && (
                    <FichaDoContato contato={contatoSelecionado} totalMensagens={totalMensagens} />
                )}
            </Gaveta>
        </>
    );
}

Conversas.layout = [LayoutV2];
