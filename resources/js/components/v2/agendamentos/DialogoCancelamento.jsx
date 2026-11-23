import { CircleSlash } from 'lucide-react';
import { Dialogo } from '@/components/v2/pecas';
import { formatarDataHora, nomeDoContato } from '@/components/v2/formato';

/**
 * Confirmação do cancelamento de um agendamento pendente, com o resumo do
 * que deixa de ser executado.
 */
export default function DialogoCancelamento({ agendamento, cancelando, aoFechar, aoConfirmar }) {
    return (
        <Dialogo
            aberto={Boolean(agendamento)}
            titulo="Cancelar agendamento?"
            descricao="O agendamento pendente deixa de ser executado. Nenhuma mensagem é enviada ao contato."
            icone={CircleSlash}
            aoFechar={aoFechar}
            acoes={
                <>
                    <button type="button" className="v2-btn v2-btn--contorno" onClick={aoFechar} disabled={cancelando}>
                        Manter agendamento
                    </button>
                    <button type="button" className="v2-btn v2-btn--perigo" onClick={aoConfirmar} disabled={cancelando}>
                        {cancelando ? 'Cancelando…' : 'Cancelar agendamento'}
                    </button>
                </>
            }
        >
            {agendamento && (
                <dl className="v2-dados">
                    <div>
                        <dt>Fluxo</dt>
                        <dd>{agendamento.fluxo?.nome ?? '—'}</dd>
                    </div>
                    <div>
                        <dt>Contato</dt>
                        <dd>{nomeDoContato(agendamento.contato)}</dd>
                    </div>
                    <div>
                        <dt>Horário</dt>
                        <dd className="v2-numerico">{formatarDataHora(agendamento.executar_em)}</dd>
                    </div>
                </dl>
            )}
        </Dialogo>
    );
}
