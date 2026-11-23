import { PreviaMensagem } from '@/components/v2/editor/PreviaMensagem';
import { ResumoFluxo } from '@/components/v2/editor/ResumoFluxo';

/**
 * Coluna de contexto: prévia da mensagem da etapa e resumo do fluxo.
 */
export default function PainelPreviaEditor({
    etapaAtual,
    etapaSelecionada,
    etapas,
    nome,
    gatilhosSelecionados,
    pausasAtivas,
    horario,
    estadoGravacao,
}) {
    return (
        <div className="v2-editor-fluxo__coluna v2-editor-fluxo__coluna--contexto">
            <div className="v2-editor-fluxo__grupo">
                <PreviaMensagem
                    etapa={etapaAtual}
                    indice={etapaSelecionada}
                    total={etapas.length}
                    etapas={etapas}
                />
                <ResumoFluxo
                    nome={nome}
                    gatilhosAtivos={gatilhosSelecionados}
                    etapas={etapas}
                    pausasAtivas={pausasAtivas}
                    horario={horario}
                    estadoGravacao={estadoGravacao}
                />
            </div>
        </div>
    );
}
