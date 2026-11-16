import { ChevronRight, Clock3, MessageCircle } from 'lucide-react';
import {
    AnexoMidiaPreview,
    configuracaoTipoConteudo,
    descreverDestino,
    renderizarTextoComVariaveis,
} from './util';

function CondicaoPreview({ etapa, indice, total, etapas }) {
    const condicoes = etapa?.condicoes ?? [];

    return (
        <section className="v2-editor-fluxo__previa">
            <div className="v2-editor-fluxo__previa-topo">
                <Clock3 style={{ width: '0.875rem', height: '0.875rem' }} />
                <span>Condição por horário</span>
                <span style={{ marginLeft: 'auto' }}>{total > 0 ? `Etapa ${indice + 1} de ${total}` : 'Sem etapas'}</span>
            </div>
            <div className="v2-editor-fluxo__previa-corpo">
                <ul className="v2-editor-fluxo__condicao-lista">
                    {condicoes.map((condicao, posicao) => (
                        <li key={posicao} className="v2-editor-fluxo__condicao-item">
                            <div>
                                <p className="v2-editor-fluxo__condicao-horas">
                                    {condicao.inicio || '--:--'} até {condicao.fim || '--:--'}
                                </p>
                                <p className="v2-editor-fluxo__condicao-destino">{descreverDestino(etapas, condicao.destino_ordem)}</p>
                            </div>
                            <ChevronRight style={{ width: '0.875rem', height: '0.875rem', color: 'var(--v2-ink-2)', flex: 'none' }} />
                        </li>
                    ))}
                    <li className="v2-editor-fluxo__condicao-item v2-editor-fluxo__condicao-nao">
                        <div>
                            <p className="v2-editor-fluxo__condicao-horas" style={{ color: 'var(--v2-ink-2)' }}>NÃO</p>
                            <p className="v2-editor-fluxo__condicao-destino">{descreverDestino(etapas, etapa?.destino_nao_ordem)}</p>
                        </div>
                        <ChevronRight style={{ width: '0.875rem', height: '0.875rem', color: 'var(--v2-ink-2)', flex: 'none' }} />
                    </li>
                </ul>
                <p className="v2-campo__ajuda">
                    O horário é avaliado no fuso confirmado da conta ao chegar nesta etapa. Os limites são inclusivos.
                </p>
            </div>
        </section>
    );
}

export function PreviaMensagem({ etapa, indice, total, etapas = [] }) {
    if (etapa?.tipo === 'condicao_horario') {
        return <CondicaoPreview etapa={etapa} indice={indice} total={total} etapas={etapas} />;
    }

    const configuracaoMidia = configuracaoTipoConteudo(etapa?.tipoConteudo ?? 'texto');

    if (configuracaoMidia.valor !== 'texto') {
        const IconeMidia = configuracaoMidia.icone;

        return (
            <section className="v2-editor-fluxo__previa">
                <div className="v2-editor-fluxo__previa-topo">
                    <IconeMidia style={{ width: '0.875rem', height: '0.875rem' }} />
                    <span>Pré-visualização</span>
                    <span className="v2-chip" style={{ marginLeft: 'auto' }}>
                        <IconeMidia style={{ width: '0.75rem', height: '0.75rem' }} />
                        {configuracaoMidia.rotulo}
                    </span>
                </div>
                <div className="v2-editor-fluxo__previa-corpo">
                    <AnexoMidiaPreview etapa={etapa} />
                    {etapa?.texto?.trim() && (
                        <p className="v2-campo__erro" style={{ padding: '0.5rem 0.625rem' }}>
                            A Meta aceita texto ou anexo, mas não ambos neste formato. Remova o texto para enviar a mídia.
                        </p>
                    )}
                </div>
                <p className="v2-campo__ajuda" style={{ padding: '0.625rem 0.75rem', borderTop: '1px solid var(--v2-line)' }}>
                    O arquivo fica em armazenamento privado e é enviado à Meta como anexo reutilizável da Página conectada.
                </p>
            </section>
        );
    }

    const temTexto = Boolean(etapa?.texto?.trim());

    return (
        <section className="v2-editor-fluxo__previa">
            <div className="v2-editor-fluxo__previa-topo">
                <MessageCircle style={{ width: '0.875rem', height: '0.875rem' }} />
                <span>Pré-visualização</span>
                <span className="v2-chip" style={{ marginLeft: 'auto' }}>Texto</span>
            </div>
            <div className="v2-editor-fluxo__previa-corpo">
                {temTexto ? (
                    <div className="v2-editor-fluxo__bolha">
                        <p className="v2-editor-fluxo__bolha-texto">
                            {renderizarTextoComVariaveis(etapa.texto)}
                        </p>
                    </div>
                ) : (
                    <div className="v2-editor-fluxo__bolha-vazia">
                        Escreva o conteúdo da etapa para pré-visualizar a mensagem.
                    </div>
                )}
            </div>
            <p className="v2-campo__ajuda" style={{ padding: '0.625rem 0.75rem', borderTop: '1px solid var(--v2-line)' }}>
                As variáveis aparecem como texto até serem substituídas durante uma execução.
            </p>
        </section>
    );
}
