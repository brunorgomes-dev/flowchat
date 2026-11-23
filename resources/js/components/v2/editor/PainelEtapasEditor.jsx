import { EditorCondicaoHorario } from '@/components/v2/editor/EditorCondicaoHorario';
import { EditorEtapa } from '@/components/v2/editor/EditorEtapa';
import { ListaEtapas } from '@/components/v2/editor/ListaEtapas';

/**
 * Colunas de estrutura e edição do editor: lista de etapas e formulário da
 * etapa selecionada.
 */
export default function PainelEtapasEditor({
    etapas,
    etapaSelecionada,
    etapaAtual,
    erros,
    podeCondicaoHorario,
    suportaCondicaoHorario,
    suportaMidia,
    suportaIndicadorDigitacao,
    fusoConta,
    pausasAtivas,
    pausaUnidade,
    pausaInput,
    mensagemReordenacao,
    painelEdicaoRef,
    areaTextoRef,
    aoSelecionarEtapa,
    aoAdicionarEtapa,
    aoAdicionarCondicao,
    aoMoverEtapa,
    aoAlterarEtapa,
    aoAlterarCondicao,
    aoAdicionarCondicaoNoBloco,
    aoRemoverCondicaoDoBloco,
    aoAlterarDestinoNao,
    aoAlterarTipoEtapa,
    aoSelecionarAnexo,
    aoRemoverAnexo,
    aoInserirVariavel,
    aoAlternarIndicadorDigitacao,
    aoAlterarSegundosIndicador,
    aoAlternarPausa,
    aoAlterarPausaInput,
    aoAlterarUnidadePausa,
    aoVoltarEtapa,
    aoAvancarEtapa,
    aoSolicitarExclusao,
}) {
    return (
        <>
            <div className="v2-editor-fluxo__coluna v2-editor-fluxo__coluna--estrutura">
                <ListaEtapas
                    etapas={etapas}
                    etapaSelecionada={etapaSelecionada}
                    erros={erros}
                    podeCondicaoHorario={podeCondicaoHorario}
                    suportaCondicaoHorario={suportaCondicaoHorario}
                    aoSelecionar={aoSelecionarEtapa}
                    aoAdicionarEtapa={aoAdicionarEtapa}
                    aoAdicionarCondicao={aoAdicionarCondicao}
                    aoMoverEtapa={aoMoverEtapa}
                    mensagemReordenacao={mensagemReordenacao}
                />
            </div>

            <div className="v2-editor-fluxo__coluna v2-editor-fluxo__coluna--editar">
                <section className="v2-painel v2-editor-fluxo__painel" aria-label="Edição da etapa">
                    {etapaAtual ? (
                        <div
                            id="painel-etapa"
                            ref={painelEdicaoRef}
                            tabIndex={-1}
                            role="region"
                            aria-labelledby={`seletor-etapa-${etapaSelecionada}`}
                            className="v2-editor-fluxo__painel-corpo"
                        >
                            {etapaAtual.tipo === 'condicao_horario' ? (
                                <EditorCondicaoHorario
                                    etapa={etapaAtual}
                                    indice={etapaSelecionada}
                                    etapas={etapas}
                                    erros={erros}
                                    fusoConta={fusoConta}
                                    aoAlterarCondicao={aoAlterarCondicao}
                                    aoAdicionarCondicao={aoAdicionarCondicaoNoBloco}
                                    aoRemoverCondicao={aoRemoverCondicaoDoBloco}
                                    aoAlterarDestinoNao={aoAlterarDestinoNao}
                                    aoSolicitarExclusao={aoSolicitarExclusao}
                                />
                            ) : (
                                <EditorEtapa
                                    etapa={etapaAtual}
                                    indice={etapaSelecionada}
                                    total={etapas.length}
                                    etapas={etapas}
                                    erros={erros}
                                    suportaMidia={suportaMidia}
                                    suportaIndicadorDigitacao={suportaIndicadorDigitacao}
                                    suportaCondicaoHorario={suportaCondicaoHorario}
                                    pausasAtivas={pausasAtivas}
                                    pausaUnidade={pausaUnidade}
                                    pausaInput={pausaInput}
                                    areaTextoRef={areaTextoRef}
                                    aoAlterarEtapa={aoAlterarEtapa}
                                    aoAlterarTipoEtapa={aoAlterarTipoEtapa}
                                    aoSelecionarAnexo={aoSelecionarAnexo}
                                    aoRemoverAnexo={aoRemoverAnexo}
                                    aoInserirVariavel={aoInserirVariavel}
                                    aoAlternarIndicadorDigitacao={aoAlternarIndicadorDigitacao}
                                    aoAlterarSegundosIndicador={aoAlterarSegundosIndicador}
                                    aoAlternarPausa={aoAlternarPausa}
                                    aoAlterarPausaInput={aoAlterarPausaInput}
                                    aoAlterarUnidadePausa={aoAlterarUnidadePausa}
                                    aoVoltar={aoVoltarEtapa}
                                    aoAvancar={aoAvancarEtapa}
                                    aoSolicitarExclusao={aoSolicitarExclusao}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="v2-vazio">
                            <p className="v2-vazio__titulo">Ainda não há etapas</p>
                            <p className="v2-vazio__texto">Adicione uma etapa para começar a editar o conteúdo.</p>
                            <button type="button" className="v2-btn v2-btn--contorno" onClick={aoAdicionarEtapa}>
                                Adicionar etapa
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
