import { Info, Trash2 } from 'lucide-react';
import { ModalFlowChat } from '@/components/ModalFlowChat';

export function DialogoExcluirEtapa({ aberto, etapaParaExcluir, aoFechar, aoConfirmar }) {
    return (
        <ModalFlowChat
            open={aberto}
            onClose={aoFechar}
            labelledBy="excluir-etapa-titulo"
            className="max-w-md"
        >
            {etapaParaExcluir !== null && (
                <div className="v2-editor-fluxo__painel-corpo" style={{ padding: '1.25rem' }}>
                    <div className="v2-editor-fluxo__caixa-info v2-editor-fluxo__caixa-info--erro">
                        <span className="v2-editor-fluxo__caixa-info-icone" aria-hidden="true">
                            <Trash2 />
                        </span>
                        <div>
                            <h2 id="excluir-etapa-titulo" className="v2-editor-fluxo__secao-titulo">Excluir etapa?</h2>
                            <p className="v2-editor-fluxo__secao-nota">
                                A etapa {etapaParaExcluir + 1} será removida das alterações locais. A exclusão só será persistida quando guardares o fluxo.
                            </p>
                        </div>
                    </div>
                    <div className="v2-editor-fluxo__grupo-botoes" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={aoFechar}>
                            Cancelar
                        </button>
                        <button type="button" className="v2-btn v2-btn--perigo" onClick={aoConfirmar}>
                            Excluir etapa
                        </button>
                    </div>
                </div>
            )}
        </ModalFlowChat>
    );
}

export function DialogoSaida({ aberto, aoFechar, aoConfirmar }) {
    return (
        <ModalFlowChat
            open={aberto}
            onClose={aoFechar}
            labelledBy="sair-do-editor-titulo"
            className="max-w-md"
        >
            <div className="v2-editor-fluxo__painel-corpo" style={{ padding: '1.25rem' }}>
                <div className="v2-editor-fluxo__caixa-info v2-editor-fluxo__caixa-info--erro">
                    <span className="v2-editor-fluxo__caixa-info-icone" aria-hidden="true">
                        <Info />
                    </span>
                    <div>
                        <h2 id="sair-do-editor-titulo" className="v2-editor-fluxo__secao-titulo">Alterações não salvas?</h2>
                        <p className="v2-editor-fluxo__secao-nota">
                            Existem alterações ainda não salvas no editor. Ao sair sem salvar, elas serão descartadas.
                        </p>
                    </div>
                </div>
                <div className="v2-editor-fluxo__grupo-botoes" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="button" className="v2-btn v2-btn--contorno" onClick={aoFechar}>
                        Continuar a editar
                    </button>
                    <button type="button" className="v2-btn v2-btn--perigo" onClick={aoConfirmar}>
                        Sair sem salvar
                    </button>
                </div>
            </div>
        </ModalFlowChat>
    );
}
