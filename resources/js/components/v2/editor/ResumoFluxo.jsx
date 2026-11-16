import { Clock3 } from 'lucide-react';
import { configuracaoTipoConteudo, opcoesForaHorario } from './util';

export function ResumoFluxo({
    nome,
    gatilhosAtivos,
    etapas,
    pausasAtivas,
    horario,
    estadoGravacao,
}) {
    const pausasConfiguradas = pausasAtivas.reduce((total, ativa, indice) => (
        total + (ativa
            && !etapas[indice]?.encerra_apos
            && indice < etapas.length - 1
            && Number(etapas[indice]?.pausa_segundos) > 0 ? 1 : 0)
    ), 0);
    const indicadoresConfigurados = etapas.filter((etapa) => etapa.indicador_digitacao_ativo).length;
    const condicoesConfiguradas = etapas.filter((etapa) => etapa.tipo === 'condicao_horario').length;
    const opcaoForaHorario = opcoesForaHorario.find((opcao) => opcao.valor === horario.fora_horario);

    return (
        <section className="v2-painel v2-editor-fluxo__painel">
            <div className="v2-editor-fluxo__painel-cabecalho">
                <h2>Visão geral</h2>
            </div>
            <div className="v2-editor-fluxo__painel-corpo">
                <dl className="v2-dados">
                    <div>
                        <dt>Fluxo</dt>
                        <dd>{nome || 'Sem nome'}</dd>
                    </div>
                    <div>
                        <dt>Gatilhos ativos</dt>
                        <dd>{gatilhosAtivos.length > 0 ? gatilhosAtivos.join(', ') : 'Nenhum'}</dd>
                    </div>
                    <div>
                        <dt>Horário de início</dt>
                        <dd className="v2-numerico">{horario.ativo ? `${horario.inicio} às ${horario.fim}` : 'Qualquer hora'}</dd>
                    </div>
                    {horario.ativo && (
                        <div>
                            <dt>Fora do horário</dt>
                            <dd>{opcaoForaHorario?.rotulo ?? '—'}</dd>
                        </div>
                    )}
                    <div>
                        <dt>Etapas</dt>
                        <dd className="v2-numerico">{etapas.length}</dd>
                    </div>
                    <div>
                        <dt>Tipos de conteúdo</dt>
                        <dd>{etapas.length > 0 ? 'Texto' : 'Nenhum'}</dd>
                    </div>
                    <div>
                        <dt>Pausas configuradas</dt>
                        <dd className="v2-numerico">{pausasConfiguradas}</dd>
                    </div>
                    <div>
                        <dt>Indicadores de digitação</dt>
                        <dd className="v2-numerico">{indicadoresConfigurados}</dd>
                    </div>
                    <div>
                        <dt>Blocos de condição</dt>
                        <dd className="v2-numerico">{condicoesConfiguradas}</dd>
                    </div>
                </dl>

                {etapas.length > 0 && (
                    <>
                        <hr className="v2-separador" />
                        <h3 className="v2-campo__rotulo" style={{ marginBottom: '0.5rem' }}>Etapas</h3>
                        <ol className="v2-lista">
                            {etapas.map((etapa, indice) => (
                                <li key={indice} className="v2-linha">
                                    <span className="v2-editor-fluxo__etapa-numero" style={{ marginTop: '0.125rem' }}>{indice + 1}</span>
                                    <div className="min-w-0" style={{ flex: 1 }}>
                                        {etapa.tipo === 'condicao_horario' ? (
                                            <p className="v2-linha__nome" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                <Clock3 style={{ width: '0.75rem', height: '0.75rem', color: 'var(--v2-primario)' }} />
                                                Condição · {(etapa.condicoes ?? []).length} {(etapa.condicoes ?? []).length === 1 ? 'intervalo' : 'intervalos'}
                                            </p>
                                        ) : etapa.tipoConteudo && etapa.tipoConteudo !== 'texto' ? (
                                            <p className="v2-linha__nome">
                                                Mídia ({configuracaoTipoConteudo(etapa.tipoConteudo).rotulo})
                                                {etapa.arquivo?.name || etapa.anexo?.nome ? ` · ${etapa.arquivo?.name ?? etapa.anexo.nome}` : ''}
                                            </p>
                                        ) : (
                                            <p className="v2-linha__nome">{etapa.texto || 'Etapa sem texto'}</p>
                                        )}
                                        {etapa.tipo !== 'condicao_horario' && etapa.encerra_apos && (
                                            <p className="v2-micro" style={{ color: 'var(--v2-primario)', marginTop: '0.125rem' }}>
                                                Encerra o fluxo após esta etapa
                                            </p>
                                        )}
                                        {etapa.tipo !== 'condicao_horario' && !etapa.encerra_apos && indice < etapas.length - 1 && pausasAtivas[indice] && Number(etapa.pausa_segundos) > 0 && (
                                            <p className="v2-micro" style={{ marginTop: '0.125rem' }}>
                                                <Clock3 style={{ width: '0.75rem', height: '0.75rem', display: 'inline', verticalAlign: '-0.125rem', marginRight: '0.25rem' }} />
                                                {etapa.pausa_segundos} s
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </>
                )}

                <hr className="v2-separador" />
                <div className="v2-dados">
                    <div>
                        <dt>Gravação</dt>
                        <dd>
                            <span className={`v2-editor-fluxo__estado ${estadoGravacao === 'erro' ? 'v2-editor-fluxo__estado--erro' : estadoGravacao === 'guardado' ? 'v2-editor-fluxo__estado--ok' : 'v2-editor-fluxo__estado--atencao'}`}>
                                {estadoGravacao === 'guardado' ? 'Salvo' : estadoGravacao === 'a_guardar' ? 'Salvando…' : estadoGravacao === 'erro' ? 'Erro ao salvar' : 'Alterações não salvas'}
                            </span>
                        </dd>
                    </div>
                </div>
            </div>
        </section>
    );
}
