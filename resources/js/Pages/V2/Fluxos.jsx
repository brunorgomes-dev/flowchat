import { Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import LayoutV2 from '@/components/v2/LayoutV2';
import BarraFiltrosFluxos from '@/components/v2/fluxos/BarraFiltrosFluxos';
import DialogoDetalheFluxo from '@/components/v2/fluxos/DialogoDetalheFluxo';
import DialogoExcluirFluxo from '@/components/v2/fluxos/DialogoExcluirFluxo';
import ListaFluxos from '@/components/v2/fluxos/ListaFluxos';
import SecaoRegrasDosFluxos from '@/components/v2/fluxos/SecaoRegrasDosFluxos';
import useFluxos from '@/components/v2/fluxos/useFluxos';
import { CabecalhoPagina, Metrica } from '@/components/v2/pecas';

export default function Fluxos({ fluxos = [] }) {
    const {
        busca,
        alterarBusca,
        filtro,
        alterarFiltro,
        filtrados,
        totalAtivos,
        detalhe,
        abrirDetalhe,
        fecharDetalhe,
        paraExcluir,
        pedirExclusao,
        fecharExclusao,
        excluindo,
        excluirBloqueado,
        excluir,
        limparFiltros,
    } = useFluxos(fluxos);

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Fluxos"
                descricao="Estado, gatilhos, etapas e uso de cada automação do Messenger."
                acoes={
                    <>
                        <Link href="/fluxos/criar" className="v2-btn v2-btn--primario">
                            <Plus aria-hidden="true" />
                            Novo fluxo
                        </Link>
                        <Link href="/agendamentos" className="v2-btn v2-btn--contorno">
                            Agendamentos
                        </Link>
                    </>
                }
            />

            <div className="v2-metricas mt-4">
                <Metrica rotulo="Total de fluxos" valor={fluxos.length} unidade="fluxos" />
                <Metrica rotulo="Ativos" valor={totalAtivos} unidade="em produção" />
                <Metrica rotulo="Inativos" valor={fluxos.length - totalAtivos} unidade="rascunhos" />
                <Metrica
                    rotulo="Execuções registradas"
                    valor={fluxos.reduce((total, fluxo) => total + Number(fluxo.execucoes_count ?? 0), 0)}
                    unidade="execuções"
                />
            </div>

            <BarraFiltrosFluxos
                busca={busca}
                aoBuscar={alterarBusca}
                filtro={filtro}
                aoFiltrar={alterarFiltro}
                quantidadeVisivel={filtrados.length}
                quantidadeTotal={fluxos.length}
            />

            <ListaFluxos
                fluxos={fluxos}
                filtrados={filtrados}
                aoDetalhar={abrirDetalhe}
                aoExcluir={pedirExclusao}
                aoLimparFiltros={limparFiltros}
            />

            <SecaoRegrasDosFluxos />

            <DialogoDetalheFluxo fluxo={detalhe} aoFechar={fecharDetalhe} />

            <DialogoExcluirFluxo
                fluxo={paraExcluir}
                bloqueado={excluirBloqueado}
                excluindo={excluindo}
                aoFechar={fecharExclusao}
                aoConfirmar={excluir}
            />
        </div>
    );
}

Fluxos.layout = [LayoutV2];
