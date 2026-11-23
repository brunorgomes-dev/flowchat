import { Trash2 } from 'lucide-react';
import { Aviso, Dialogo } from '@/components/v2/pecas';

/**
 * Confirmação de exclusão com o bloqueio por execuções ou agendamentos
 * vinculados.
 */
export default function DialogoExcluirFluxo({ fluxo, bloqueado, excluindo, aoFechar, aoConfirmar }) {
    return (
        <Dialogo
            aberto={Boolean(fluxo)}
            titulo="Excluir fluxo?"
            descricao={bloqueado
                ? 'Este fluxo tem registros vinculados. A exclusão fica bloqueada para preservar o histórico.'
                : 'As etapas e os gatilhos deste fluxo também serão removidos.'}
            icone={Trash2}
            aoFechar={aoFechar}
            acoes={
                <>
                    <button type="button" className="v2-btn v2-btn--contorno" onClick={aoFechar} disabled={excluindo}>
                        Cancelar
                    </button>
                    <button type="button" className="v2-btn v2-btn--perigo" onClick={aoConfirmar} aria-disabled={bloqueado} disabled={excluindo}>
                        {excluindo ? 'Excluindo…' : 'Excluir fluxo'}
                    </button>
                </>
            }
        >
            {fluxo && (
                <div className="space-y-3">
                    <p className="text-[0.8125rem] font-medium">{fluxo.nome}</p>
                    {bloqueado ? (
                        <Aviso tom="atencao" titulo="Registros vinculados">
                            <ul className="mt-1 list-inside list-disc text-xs">
                                {Number(fluxo.execucoes_count) > 0 && <li>{fluxo.execucoes_count} execuções vinculadas</li>}
                                {Number(fluxo.agendamentos_count) > 0 && <li>{fluxo.agendamentos_count} agendamentos vinculados</li>}
                            </ul>
                        </Aviso>
                    ) : (
                        <Aviso tom="atencao">A ação remove o fluxo de forma permanente.</Aviso>
                    )}
                </div>
            )}
        </Dialogo>
    );
}
