import { useRef } from 'react';
import { ArrowDown, ArrowUp, AudioLines, Clock3, FileText, Image as ImageIcon, MessageCircle, Plus, Video } from 'lucide-react';
import { tiposConteudo } from './util';

const iconePorTipo = {
    imagem: ImageIcon,
    audio: AudioLines,
    video: Video,
    arquivo: FileText,
};

function resumoEtapa(etapa) {
    if (etapa.tipo === 'condicao_horario') {
        return `Condição · ${(etapa.condicoes ?? []).length} intervalo${(etapa.condicoes ?? []).length === 1 ? '' : 's'}`;
    }

    if (etapa.tipoConteudo && etapa.tipoConteudo !== 'texto') {
        const tipo = tiposConteudo.find((t) => t.valor === etapa.tipoConteudo);
        const nome = etapa.arquivo?.name ?? etapa.anexo?.nome;
        return `Mídia (${tipo?.rotulo ?? etapa.tipoConteudo})${nome ? ` · ${nome}` : ''}`;
    }

    return etapa.texto?.trim() || 'Etapa sem texto';
}

export function ListaEtapas({
    etapas,
    etapaSelecionada,
    erros,
    podeCondicaoHorario,
    suportaCondicaoHorario,
    aoSelecionar,
    aoAdicionarEtapa,
    aoAdicionarCondicao,
    aoMoverEtapa,
    mensagemReordenacao,
}) {
    const referenciasEtapas = useRef([]);
    const temErroGeral = Boolean(erros.etapas);
    const errosPorEtapa = new Set();

    for (const [chave, mensagem] of Object.entries(erros)) {
        if (!mensagem) {
            continue;
        }

        const correspondencia = chave.match(/^etapas\.(\d+)\./);
        if (correspondencia) {
            errosPorEtapa.add(Number(correspondencia[1]));
        }
    }

    const navegarEtapas = (evento, indiceAtual) => {
        let proximoIndice;

        if (evento.key === 'ArrowDown') {
            proximoIndice = (indiceAtual + 1) % etapas.length;
        } else if (evento.key === 'ArrowUp') {
            proximoIndice = (indiceAtual - 1 + etapas.length) % etapas.length;
        } else if (evento.key === 'Home') {
            proximoIndice = 0;
        } else if (evento.key === 'End') {
            proximoIndice = etapas.length - 1;
        } else {
            return;
        }

        evento.preventDefault();
        aoSelecionar(proximoIndice);
        referenciasEtapas.current[proximoIndice]?.focus();
    };

    return (
        <section className="v2-painel v2-editor-fluxo__painel" aria-label="Etapas do fluxo">
            <div className="v2-editor-fluxo__painel-cabecalho">
                <h2>Etapas</h2>
                <div className="v2-editor-fluxo__grupo-botoes">
                    <button
                        type="button"
                        className="v2-btn v2-btn--contorno v2-btn--pequeno"
                        onClick={aoAdicionarCondicao}
                        disabled={!podeCondicaoHorario}
                        title={!suportaCondicaoHorario
                            ? 'A migration de condições por horário ainda não foi executada'
                            : !podeCondicaoHorario
                                ? 'Confirme o fuso horário da conta em Configurações para usar condições'
                                : 'Adicionar bloco de condição por horário'}
                    >
                        <Clock3 />
                        Condição
                    </button>
                    <button
                        type="button"
                        className="v2-btn v2-btn--contorno v2-btn--icone v2-btn--pequeno"
                        aria-label="Adicionar etapa"
                        title="Adicionar etapa"
                        onClick={aoAdicionarEtapa}
                    >
                        <Plus />
                    </button>
                </div>
            </div>

            {temErroGeral && (
                <p role="alert" className="v2-campo__erro" style={{ padding: '0.5rem 0.875rem', borderBottom: '1px solid var(--v2-line)' }}>
                    {erros.etapas}
                </p>
            )}

            <ol aria-label="Etapas do fluxo" className="v2-editor-fluxo__lista-etapas">
                {etapas.map((etapa, indice) => {
                    const selecionada = etapaSelecionada === indice;
                    const temErro = errosPorEtapa.has(indice);
                    const Icone = etapa.tipo === 'condicao_horario' ? Clock3 : (iconePorTipo[etapa.tipoConteudo] ?? MessageCircle);
                    const resumo = resumoEtapa(etapa);

                    return (
                        <li
                            key={etapa.id ?? etapa.chaveLocal ?? indice}
                            className={`v2-editor-fluxo__etapa ${selecionada ? 'v2-editor-fluxo__etapa--selecionada' : ''}`}
                        >
                            <button
                                type="button"
                                id={`seletor-etapa-${indice}`}
                                aria-controls="painel-etapa"
                                aria-current={selecionada ? 'step' : undefined}
                                ref={(elemento) => {
                                    referenciasEtapas.current[indice] = elemento;
                                }}
                                onKeyDown={(evento) => navegarEtapas(evento, indice)}
                                onClick={() => aoSelecionar(indice)}
                                className={`v2-editor-fluxo__etapa-seletor ${temErro ? 'v2-editor-fluxo__etapa-erro' : ''}`}
                            >
                                <span className="v2-editor-fluxo__etapa-numero">{indice + 1}</span>
                                <span className="v2-editor-fluxo__etapa-corpo">
                                    <span className="v2-editor-fluxo__etapa-titulo">
                                        <Icone style={{ width: '0.75rem', height: '0.75rem', marginRight: '0.25rem', verticalAlign: '-0.125rem' }} />
                                        {etapa.tipo === 'condicao_horario' ? 'Condição' : `Etapa ${indice + 1}`}
                                    </span>
                                    <span className="v2-editor-fluxo__etapa-meta" title={resumo}>{resumo}</span>
                                </span>
                            </button>
                            <div
                                role="group"
                                aria-label={`Mover etapa ${indice + 1}`}
                                aria-hidden={!selecionada}
                                className={`v2-editor-fluxo__etapa-acoes ${selecionada ? '' : 'v2-editor-fluxo__etapa-acoes--ocultas'}`}
                            >
                                <button
                                    type="button"
                                    className="v2-editor-fluxo__etapa-mover"
                                    aria-label={`Mover etapa ${indice + 1} para cima`}
                                    title="Mover para cima"
                                    disabled={!selecionada || indice === 0}
                                    onClick={() => aoMoverEtapa(indice, -1)}
                                >
                                    <ArrowUp aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    className="v2-editor-fluxo__etapa-mover"
                                    aria-label={`Mover etapa ${indice + 1} para baixo`}
                                    title="Mover para baixo"
                                    disabled={!selecionada || indice === etapas.length - 1}
                                    onClick={() => aoMoverEtapa(indice, 1)}
                                >
                                    <ArrowDown aria-hidden="true" />
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ol>
            <span role="status" className="v2-editor-fluxo__sr-only">{mensagemReordenacao}</span>

            {etapas.length === 0 && (
                <div className="v2-vazio">
                    <p className="v2-vazio__titulo">Ainda não há etapas</p>
                    <p className="v2-vazio__texto">Adicione uma etapa para começar a montar o fluxo.</p>
                    <button type="button" className="v2-btn v2-btn--contorno" onClick={aoAdicionarEtapa}>
                        <Plus />
                        Adicionar etapa
                    </button>
                </div>
            )}
        </section>
    );
}
