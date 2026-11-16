import { useRef } from 'react';
import { AudioLines, Clock3, FileText, Image as ImageIcon, MessageCircle, Plus, Video } from 'lucide-react';
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
}) {
    const referenciasTabs = useRef([]);
    const temErroGeral = Boolean(erros.etapas);
    const errosPorEtapa = new Set();

    for (const chave of Object.keys(erros)) {
        const correspondencia = chave.match(/^etapas\.(\d+)\./);
        if (correspondencia) {
            errosPorEtapa.add(Number(correspondencia[1]));
        }
    }

    const navegarTabs = (evento, indiceAtual) => {
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
        referenciasTabs.current[proximoIndice]?.focus();
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

            <div role="tablist" aria-label="Etapas do fluxo" aria-orientation="vertical" className="v2-editor-fluxo__lista-etapas">
                {etapas.map((etapa, indice) => {
                    const selecionada = etapaSelecionada === indice;
                    const temErro = errosPorEtapa.has(indice);
                    const Icone = etapa.tipo === 'condicao_horario' ? Clock3 : (iconePorTipo[etapa.tipoConteudo] ?? MessageCircle);

                    return (
                        <button
                            key={indice}
                            type="button"
                            role="tab"
                            id={`tab-etapa-${indice}`}
                            aria-controls="painel-etapa"
                            aria-selected={selecionada}
                            tabIndex={selecionada ? 0 : -1}
                            ref={(elemento) => {
                                referenciasTabs.current[indice] = elemento;
                            }}
                            onKeyDown={(evento) => navegarTabs(evento, indice)}
                            onClick={() => aoSelecionar(indice)}
                            className={`v2-editor-fluxo__etapa ${temErro ? 'v2-editor-fluxo__etapa-erro' : ''}`}
                        >
                            <span className="v2-editor-fluxo__etapa-numero">{indice + 1}</span>
                            <span className="v2-editor-fluxo__etapa-corpo">
                                <span className="v2-editor-fluxo__etapa-titulo">
                                    <Icone style={{ width: '0.75rem', height: '0.75rem', marginRight: '0.25rem', verticalAlign: '-0.125rem' }} />
                                    {etapa.tipo === 'condicao_horario' ? 'Condição' : `Etapa ${indice + 1}`}
                                </span>
                                <span className="v2-editor-fluxo__etapa-meta">{resumoEtapa(etapa)}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

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
