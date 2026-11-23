import { Circle, Clock3, Keyboard } from 'lucide-react';
import { Secao } from '@/components/v2/pecas';

/**
 * Regras fixas exibidas abaixo da lista de fluxos.
 */
export default function SecaoRegrasDosFluxos() {
    return (
        <Secao id="fluxos-regras" titulo="Regras da lista">
            <div className="grid gap-3 md:grid-cols-3">
                <div className="v2-painel v2-painel__corpo">
                    <p className="flex items-center gap-2 text-[0.8125rem] font-medium">
                        <Circle className="size-3.5 text-[var(--v2-ink-3)]" aria-hidden="true" />
                        Estado do fluxo
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--v2-ink-2)]">
                        Só fluxos ativos iniciam automaticamente. Rascunhos continuam disponíveis para edição.
                    </p>
                </div>
                <div className="v2-painel v2-painel__corpo">
                    <p className="flex items-center gap-2 text-[0.8125rem] font-medium">
                        <Keyboard className="size-3.5 text-[var(--v2-ink-3)]" aria-hidden="true" />
                        Exclusão preservada
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--v2-ink-2)]">
                        Fluxos com execuções ou agendamentos não são excluídos: o motivo aparece antes da confirmação.
                    </p>
                </div>
                <div className="v2-painel v2-painel__corpo">
                    <p className="flex items-center gap-2 text-[0.8125rem] font-medium">
                        <Clock3 className="size-3.5 text-[var(--v2-ink-3)]" aria-hidden="true" />
                        Janela de horário
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--v2-ink-2)]">
                        Quando ativa, a janela aparece na lista e no editor, junto do comportamento fora do horário.
                    </p>
                </div>
            </div>
        </Secao>
    );
}
