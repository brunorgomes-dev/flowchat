import LayoutV2 from '@/components/v2/LayoutV2';
import BarraAcoesEditor from '@/components/v2/editor/BarraAcoesEditor';
import CabecalhoEditor from '@/components/v2/editor/CabecalhoEditor';
import { DialogoExcluirEtapa, DialogoSaida } from '@/components/v2/editor/Dialogos';
import PainelEtapasEditor from '@/components/v2/editor/PainelEtapasEditor';
import PainelPreviaEditor from '@/components/v2/editor/PainelPreviaEditor';
import useEditorFluxo from '@/components/v2/editor/useEditorFluxo';
import '@/components/v2/editor/editor-fluxo.css';

const paineis = [
    { valor: 'estrutura', rotulo: 'Etapas' },
    { valor: 'editar', rotulo: 'Editar' },
    { valor: 'contexto', rotulo: 'Prévia' },
];

export default function EditorFluxoV2({
    fluxo = null,
    suportaIndicadorDigitacao = true,
    suportaCondicaoHorario = false,
    podeCondicaoHorario = false,
    suportaMidia = false,
    fusoConta = null,
}) {
    const {
        criando,
        nome,
        ativo,
        etapas,
        gatilhosAtivos,
        horario,
        pausasAtivas,
        etapaSelecionada,
        estadoGravacao,
        erros,
        mensagemReordenacao,
        etapaParaExcluir,
        avisoSaidaAberto,
        pausaUnidade,
        pausaInput,
        painelAtivo,
        etapaAtual,
        nomeGatilhosSelecionados,
        areaTextoRef,
        painelEdicaoRef,
        setPainelAtivo,
        alterarNome,
        alterarAtivo,
        selecionarEtapa,
        selecionarEtapaAnterior,
        selecionarEtapaSeguinte,
        alterarEtapa,
        alterarGatilho,
        alterarHorario,
        adicionarEtapa,
        adicionarCondicao,
        moverEtapa,
        solicitarExclusaoEtapa,
        fecharExclusaoEtapa,
        confirmarExclusaoEtapa,
        alterarCondicao,
        adicionarCondicaoNoBloco,
        removerCondicaoDoBloco,
        alterarDestinoNao,
        alternarPausa,
        alternarIndicadorDigitacao,
        alterarSegundosIndicador,
        alterarUnidadePausa,
        alterarPausaInput,
        fecharAvisoSaida,
        confirmarSaidaSemGuardar,
        inserirVariavel,
        alterarTipoEtapa,
        selecionarAnexo,
        removerAnexo,
        salvar,
    } = useEditorFluxo({ fluxo, suportaMidia, podeCondicaoHorario });

    return (
        <>
            <form onSubmit={salvar} className={`v2-conteudo v2-editor-fluxo v2-editor-fluxo--painel-${painelAtivo}`}>
                <CabecalhoEditor
                    criando={criando}
                    nome={nome}
                    erros={erros}
                    aoAlterarNome={alterarNome}
                    ativo={ativo}
                    aoAlternarAtivo={alterarAtivo}
                    gatilhosAtivos={gatilhosAtivos}
                    aoAlterarGatilho={alterarGatilho}
                    horario={horario}
                    aoAlterarHorario={alterarHorario}
                />

                <div className="v2-editor-fluxo__seletor-painel">
                    <span className="v2-campo__rotulo">Painel visível</span>
                    <div role="group" aria-label="Painel visível" className="v2-segmentado">
                        {paineis.map((painel) => (
                            <button
                                key={painel.valor}
                                type="button"
                                aria-pressed={painelAtivo === painel.valor}
                                onClick={() => setPainelAtivo(painel.valor)}
                            >
                                {painel.rotulo}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="v2-editor-fluxo__grade">
                    <PainelEtapasEditor
                        etapas={etapas}
                        etapaSelecionada={etapaSelecionada}
                        etapaAtual={etapaAtual}
                        erros={erros}
                        podeCondicaoHorario={podeCondicaoHorario}
                        suportaCondicaoHorario={suportaCondicaoHorario}
                        suportaMidia={suportaMidia}
                        suportaIndicadorDigitacao={suportaIndicadorDigitacao}
                        fusoConta={fusoConta}
                        pausasAtivas={pausasAtivas}
                        pausaUnidade={pausaUnidade}
                        pausaInput={pausaInput}
                        mensagemReordenacao={mensagemReordenacao}
                        painelEdicaoRef={painelEdicaoRef}
                        areaTextoRef={areaTextoRef}
                        aoSelecionarEtapa={selecionarEtapa}
                        aoAdicionarEtapa={adicionarEtapa}
                        aoAdicionarCondicao={adicionarCondicao}
                        aoMoverEtapa={moverEtapa}
                        aoAlterarEtapa={alterarEtapa}
                        aoAlterarCondicao={alterarCondicao}
                        aoAdicionarCondicaoNoBloco={adicionarCondicaoNoBloco}
                        aoRemoverCondicaoDoBloco={removerCondicaoDoBloco}
                        aoAlterarDestinoNao={alterarDestinoNao}
                        aoAlterarTipoEtapa={alterarTipoEtapa}
                        aoSelecionarAnexo={selecionarAnexo}
                        aoRemoverAnexo={removerAnexo}
                        aoInserirVariavel={inserirVariavel}
                        aoAlternarIndicadorDigitacao={alternarIndicadorDigitacao}
                        aoAlterarSegundosIndicador={alterarSegundosIndicador}
                        aoAlternarPausa={alternarPausa}
                        aoAlterarPausaInput={alterarPausaInput}
                        aoAlterarUnidadePausa={alterarUnidadePausa}
                        aoVoltarEtapa={selecionarEtapaAnterior}
                        aoAvancarEtapa={selecionarEtapaSeguinte}
                        aoSolicitarExclusao={solicitarExclusaoEtapa}
                    />

                    <PainelPreviaEditor
                        etapaAtual={etapaAtual}
                        etapaSelecionada={etapaSelecionada}
                        etapas={etapas}
                        nome={nome}
                        gatilhosSelecionados={nomeGatilhosSelecionados}
                        pausasAtivas={pausasAtivas}
                        horario={horario}
                        estadoGravacao={estadoGravacao}
                    />
                </div>

                <BarraAcoesEditor estadoGravacao={estadoGravacao} criando={criando} />
            </form>

            <DialogoExcluirEtapa
                aberto={etapaParaExcluir !== null}
                etapaParaExcluir={etapaParaExcluir}
                aoFechar={fecharExclusaoEtapa}
                aoConfirmar={confirmarExclusaoEtapa}
            />

            <DialogoSaida
                aberto={avisoSaidaAberto}
                aoFechar={fecharAvisoSaida}
                aoConfirmar={confirmarSaidaSemGuardar}
            />
        </>
    );
}

EditorFluxoV2.layout = [LayoutV2];
