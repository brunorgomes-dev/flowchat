import { Link } from '@inertiajs/react';
import { ArrowRight, FileText, Keyboard, PauseCircle, Split } from 'lucide-react';
import { Aviso, Chip, Dialogo } from '@/components/v2/pecas';
import { descreverEtapa, estaAtivo, rotuloRegra } from './util';

/**
 * Prévia somente leitura de um fluxo: estado, gatilhos, janela e etapas.
 */
export default function DialogoDetalheFluxo({ fluxo, aoFechar }) {
    return (
        <Dialogo
            aberto={Boolean(fluxo)}
            titulo={fluxo?.nome ?? ''}
            descricao={fluxo
                ? `${(fluxo.etapas ?? []).length} etapas · ${fluxo.execucoes_count ?? 0} execuções · ${fluxo.agendamentos_count ?? 0} agendamentos`
                : undefined}
            icone={FileText}
            aoFechar={aoFechar}
            acoes={
                <>
                    <button type="button" className="v2-btn v2-btn--contorno" onClick={aoFechar}>
                        Fechar
                    </button>
                    <Link href={`/fluxos/${fluxo?.id}/editar`} className="v2-btn v2-btn--primario">
                        Abrir no editor
                        <ArrowRight aria-hidden="true" />
                    </Link>
                </>
            }
        >
            {fluxo && (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                        <Chip tom={estaAtivo(fluxo.ativo) ? 'positivo' : 'neutro'}>
                            {estaAtivo(fluxo.ativo) ? 'Ativo' : 'Inativo'}
                        </Chip>
                        {estaAtivo(fluxo.horario_inicio_ativo) && (
                            <Chip tom="atencao">Janela {fluxo.horario_inicio}–{fluxo.horario_fim}</Chip>
                        )}
                        {(fluxo.regras ?? []).filter((regra) => estaAtivo(regra.ativo)).map((regra) => (
                            <Chip key={regra.gatilho}>{rotuloRegra(regra)}</Chip>
                        ))}
                    </div>
                    <ol className="max-h-72 overflow-y-auto border border-[var(--v2-line)] v2-rolagem">
                        {(fluxo.etapas ?? []).map((etapa, indice) => (
                            <li key={etapa.id ?? indice} className="flex items-start gap-2 border-b border-[var(--v2-line)] p-2.5 last:border-0">
                                <span className="v2-numerico w-5 text-[0.6875rem] text-[var(--v2-ink-3)]">{indice + 1}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="break-words text-[0.8125rem] leading-5">{descreverEtapa(etapa)}</p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {etapa.tipo === 'condicao_horario' && (
                                            <Chip tom="atencao">
                                                <Split className="size-2.5" aria-hidden="true" />
                                                Condição por horário
                                            </Chip>
                                        )}
                                        {etapa.indicador_digitacao_ativo && (
                                            <Chip>
                                                <Keyboard className="size-2.5" aria-hidden="true" />
                                                digitando {etapa.indicador_digitacao_segundos}s
                                            </Chip>
                                        )}
                                        {Number(etapa.pausa_segundos) > 0 && (
                                            <Chip>
                                                <PauseCircle className="size-2.5" aria-hidden="true" />
                                                pausa {etapa.pausa_segundos}s
                                            </Chip>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                        {(fluxo.etapas ?? []).length === 0 && (
                            <li className="p-3 text-xs text-[var(--v2-ink-2)]">Nenhuma etapa configurada.</li>
                        )}
                    </ol>
                    <Aviso tom="info">A prévia é fiel aos campos salvos. O editor mantém todas as ações de edição.</Aviso>
                </div>
            )}
        </Dialogo>
    );
}
