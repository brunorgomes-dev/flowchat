import { Clock3, Plus, Trash2 } from 'lucide-react';
import { descreverDestino } from './util';

export function EditorCondicaoHorario({
    etapa,
    indice,
    etapas,
    erros,
    fusoConta,
    aoAlterarCondicao,
    aoAdicionarCondicao,
    aoRemoverCondicao,
    aoAlterarDestinoNao,
    aoSolicitarExclusao,
}) {
    const condicoes = etapa.condicoes ?? [];
    const destinosPossiveis = etapas
        .map((outraEtapa, posicao) => ({ etapa: outraEtapa, ordem: posicao + 1 }))
        .filter((destino) => destino.ordem > indice + 1);
    const erroDe = (campo) => erros[`etapas.${indice}.${campo}`] ?? null;
    const fusoAtual = fusoConta?.timezone ?? fusoConta?.atual ?? null;
    const fusoConfirmado = Boolean(fusoAtual && fusoConta?.confirmado);

    return (
        <div className="v2-editor-fluxo__grupo">
            <div className="v2-editor-fluxo__caixa-info v2-editor-fluxo__caixa-info--marca">
                <span className="v2-editor-fluxo__caixa-info-icone" aria-hidden="true">
                    <Clock3 />
                </span>
                <div>
                    <h3 className="v2-editor-fluxo__secao-titulo">Condição por horário</h3>
                    <p className="v2-editor-fluxo__secao-nota">
                        Ao chegar nesta etapa, o fluxo segue o primeiro intervalo que contém o horário atual. Se nenhum corresponder, segue a saída NÃO.
                    </p>
                </div>
                <button
                    type="button"
                    className="v2-btn v2-btn--fantasma v2-btn--pequeno v2-editor-fluxo__caixa-info-acao"
                    onClick={() => aoSolicitarExclusao(indice)}
                >
                    <Trash2 />
                    Remover etapa
                </button>
            </div>

            <p className={`v2-editor-fluxo__caixa-info ${fusoConfirmado ? '' : 'v2-editor-fluxo__caixa-info--erro'}`}>
                {fusoConfirmado
                    ? `Horário avaliado no fuso confirmado da conta: ${fusoAtual}.`
                    : 'O fuso horário da conta não está confirmado. Confirme em Configurações para que este bloco funcione corretamente.'}
            </p>

            <div className="v2-editor-fluxo__grupo">
                {condicoes.map((condicao, posicao) => (
                    <div key={posicao} className="v2-editor-fluxo__condicao">
                        <div className="v2-editor-fluxo__condicao-cabecalho">
                            <p className="v2-editor-fluxo__condicao-titulo">Condição {posicao + 1}</p>
                            <button
                                type="button"
                                className="v2-btn v2-btn--fantasma v2-btn--icone v2-btn--pequeno"
                                aria-label={condicoes.length <= 1
                                    ? `Remover condição ${posicao + 1} (indisponível: o bloco precisa de pelo menos uma condição)`
                                    : `Remover condição ${posicao + 1}`}
                                title={condicoes.length <= 1
                                    ? 'O bloco precisa de pelo menos uma condição. Para remover, exclua a etapa inteira.'
                                    : 'Remover condição'}
                                onClick={() => aoRemoverCondicao(indice, posicao)}
                                disabled={condicoes.length <= 1}
                            >
                                <Trash2 />
                            </button>
                        </div>

                        <div className="v2-editor-fluxo__condicao-campos v2-editor-fluxo__condicao-campos--duas">
                            <label className="v2-campo">
                                <span className="v2-campo__rotulo">Das</span>
                                <input
                                    type="time"
                                    step={60}
                                    value={condicao.inicio}
                                    onChange={(evento) => aoAlterarCondicao(indice, posicao, 'inicio', evento.target.value)}
                                    aria-invalid={Boolean(erroDe(`condicoes.${posicao}.inicio`))}
                                    className="v2-entrada v2-numerico"
                                />
                            </label>
                            <label className="v2-campo">
                                <span className="v2-campo__rotulo">Até</span>
                                <input
                                    type="time"
                                    step={60}
                                    value={condicao.fim}
                                    onChange={(evento) => aoAlterarCondicao(indice, posicao, 'fim', evento.target.value)}
                                    aria-invalid={Boolean(erroDe(`condicoes.${posicao}.fim`))}
                                    className="v2-entrada v2-numerico"
                                />
                            </label>
                        </div>

                        <label className="v2-campo" style={{ marginTop: '0.75rem' }}>
                            <span className="v2-campo__rotulo">Seguir para</span>
                            <select
                                value={condicao.destino_ordem ?? ''}
                                onChange={(evento) => aoAlterarCondicao(indice, posicao, 'destino_ordem', evento.target.value === '' ? null : Number(evento.target.value))}
                                aria-invalid={Boolean(erroDe(`condicoes.${posicao}.destino_ordem`))}
                                className="v2-entrada"
                            >
                                <option value="">Escolha uma etapa</option>
                                {destinosPossiveis.map((destino) => (
                                    <option key={`condicao-${posicao}-destino-${destino.ordem}`} value={destino.ordem}>
                                        {descreverDestino(etapas, destino.ordem)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {['inicio', 'fim', 'destino_ordem'].map((campo) => (
                            erroDe(`condicoes.${posicao}.${campo}`)
                                ? <p key={campo} role="alert" className="v2-campo__erro">{erroDe(`condicoes.${posicao}.${campo}`)}</p>
                                : null
                        ))}
                    </div>
                ))}

                {condicoes.length <= 1 && (
                    <p className="v2-campo__ajuda">
                        Este bloco precisa de pelo menos uma condição. Para remover o bloco inteiro, use “Remover etapa”.
                    </p>
                )}
            </div>

            {erroDe('condicoes') && (
                <p role="alert" className="v2-campo__erro">{erroDe('condicoes')}</p>
            )}

            <button
                type="button"
                className="v2-btn v2-btn--contorno v2-btn--pequeno"
                onClick={() => aoAdicionarCondicao(indice)}
                disabled={destinosPossiveis.length === 0}
            >
                <Plus />
                Adicionar condição
            </button>

            {destinosPossiveis.length === 0 && (
                <p className="v2-campo__ajuda">Adicione etapas depois desta condição para usá-las como destino.</p>
            )}

            <div className="v2-editor-fluxo__condicao" style={{ borderStyle: 'dashed' }}>
                <label className="v2-campo">
                    <span className="v2-campo__rotulo">Se nenhuma condição corresponder (NÃO)</span>
                    <select
                        value={etapa.destino_nao_ordem ?? ''}
                        onChange={(evento) => aoAlterarDestinoNao(indice, evento.target.value)}
                        aria-invalid={Boolean(erroDe('destino_nao_ordem'))}
                        className="v2-entrada"
                    >
                        <option value="">Encerrar fluxo</option>
                        {destinosPossiveis.map((destino) => (
                            <option key={`nao-destino-${destino.ordem}`} value={destino.ordem}>
                                {descreverDestino(etapas, destino.ordem)}
                            </option>
                        ))}
                    </select>
                </label>
                {erroDe('destino_nao_ordem') && (
                    <p role="alert" className="v2-campo__erro">{erroDe('destino_nao_ordem')}</p>
                )}
            </div>

            <p className="v2-campo__ajuda">
                Os limites são inclusivos e usam precisão de minuto. Intervalos do mesmo bloco não podem se sobrepor nem atravessar a meia-noite. Os destinos precisam apontar para etapas posteriores.
            </p>
        </div>
    );
}
