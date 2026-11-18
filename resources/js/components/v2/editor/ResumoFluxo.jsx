import { opcoesForaHorario } from './util';

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
