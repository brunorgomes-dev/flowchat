import { useRef } from 'react';
import { Braces, ChevronDown, ChevronLeft, ChevronRight, Info, Trash2, Upload, X } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import {
    AnexoMidiaPreview,
    configuracaoTipoConteudo,
    INDICADOR_DIGITACAO_MAXIMO_SEGUNDOS,
    tiposConteudo,
    variaveis,
} from './util';
import { Interruptor } from './Interruptor';

const unidadesPausa = [
    { valor: 'segundos', rotulo: 'Segundos' },
    { valor: 'minutos', rotulo: 'Minutos' },
];

export function EditorEtapa({
    etapa,
    indice,
    total,
    etapas,
    erros,
    suportaMidia,
    suportaIndicadorDigitacao,
    suportaCondicaoHorario,
    pausasAtivas,
    pausaUnidade,
    pausaInput,
    areaTextoRef,
    aoAlterarEtapa,
    aoAlterarTipoEtapa,
    aoSelecionarAnexo,
    aoRemoverAnexo,
    aoInserirVariavel,
    aoAlternarIndicadorDigitacao,
    aoAlterarSegundosIndicador,
    aoAlternarPausa,
    aoAlterarPausaInput,
    aoAlterarUnidadePausa,
    aoVoltar,
    aoAvancar,
    aoSolicitarExclusao,
}) {
    const seletorFicheiroRef = useRef(null);
    const tipoAtual = configuracaoTipoConteudo(etapa?.tipoConteudo ?? 'texto');
    const temTexto = Boolean(etapa?.texto?.trim());

    if (!etapa) {
        return null;
    }

    return (
        <div className="v2-editor-fluxo__grupo">
            <div className="v2-editor-fluxo__secao-cabecalho">
                <div>
                    <p className="v2-micro v2-destaque">Etapa {indice + 1} de {total}</p>
                    <h2 className="v2-editor-fluxo__secao-titulo">Conteúdo da mensagem</h2>
                </div>
                <button
                    type="button"
                    className="v2-btn v2-btn--fantasma v2-btn--pequeno"
                    onClick={() => aoSolicitarExclusao(indice)}
                >
                    <Trash2 />
                    Remover etapa
                </button>
            </div>

            <div className="v2-campo">
                <span id="tipo-conteudo-rotulo" className="v2-campo__rotulo">Tipo de conteúdo</span>
                <div role="group" aria-labelledby="tipo-conteudo-rotulo" className="v2-editor-fluxo__grupo-botoes">
                    {tiposConteudo.map((tipo) => {
                        const Icone = tipo.icone;
                        const selecionado = tipoAtual.valor === tipo.valor;
                        const desabilitado = !suportaMidia && tipo.valor !== 'texto';

                        return (
                            <button
                                key={tipo.valor}
                                type="button"
                                aria-pressed={selecionado}
                                disabled={desabilitado}
                                onClick={() => aoAlterarTipoEtapa(indice, tipo.valor)}
                                title={desabilitado ? 'A migration de mídia ainda não foi executada' : undefined}
                                className="v2-editor-fluxo__botao-tipo"
                            >
                                <Icone />
                                {tipo.rotulo}
                            </button>
                        );
                    })}
                </div>
                {!suportaMidia && (
                    <p className="v2-campo__ajuda">A migration de mídia ainda não foi executada; apenas texto está disponível.</p>
                )}
            </div>

            {tipoAtual.valor !== 'texto' && (
                <div className="v2-campo">
                    <input
                        ref={seletorFicheiroRef}
                        type="file"
                        accept={tipoAtual.accept ?? undefined}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="v2-oculto-visual"
                        onChange={(evento) => {
                            aoSelecionarAnexo(indice, evento.target.files?.[0] ?? null);
                            evento.target.value = '';
                        }}
                    />

                    {(etapa.arquivo || etapa.anexo) ? (
                        <div className="v2-editor-fluxo__grupo">
                            <AnexoMidiaPreview etapa={etapa} />
                            <div className="v2-editor-fluxo__grupo-botoes">
                                <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno" onClick={() => seletorFicheiroRef.current?.click()}>
                                    <Upload />
                                    Substituir arquivo
                                </button>
                                <button
                                    type="button"
                                    className="v2-btn v2-btn--fantasma v2-btn--pequeno"
                                    onClick={() => aoRemoverAnexo(indice)}
                                >
                                    <X />
                                    Remover mídia
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => seletorFicheiroRef.current?.click()}
                            className="v2-editor-fluxo__upload"
                        >
                            <span className="v2-editor-fluxo__upload-icone" aria-hidden="true">
                                <Upload />
                            </span>
                            <span className="v2-editor-fluxo__upload-rotulo">Selecionar {tipoAtual.descricaoPicker}</span>
                            <span className="v2-editor-fluxo__upload-ajuda">
                                {tipoAtual.extensoes.map((extensao) => extensao.toUpperCase()).join(', ')} · até {tipoAtual.limiteMb} MB
                            </span>
                        </button>
                    )}

                    {erros[`etapas.${indice}.anexo`] && (
                        <p role="alert" className="v2-campo__erro">{erros[`etapas.${indice}.anexo`]}</p>
                    )}
                    <p className="v2-campo__ajuda">
                        <Info style={{ width: '0.875rem', height: '0.875rem', verticalAlign: '-0.125rem', marginRight: '0.25rem' }} />
                        Esta etapa envia apenas o anexo. O arquivo é guardado em armazenamento privado e enviado como anexo reutilizável da Página conectada; a Meta aceita um anexo por mensagem. Variáveis de texto não se aplicam a etapas de mídia.
                    </p>
                </div>
            )}

            {tipoAtual.valor === 'texto' ? (
                <div className="v2-campo">
                    <div className="v2-editor-fluxo__secao-cabecalho" style={{ marginBottom: '0.375rem' }}>
                        <label htmlFor={`conteudo-etapa-${indice}`} className="v2-campo__rotulo">
                            Texto
                        </label>
                        <div className="v2-editor-fluxo__grupo-botoes">
                            <span className="v2-campo__ajuda">Inserir variável</span>
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                    <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno">
                                        <Braces />
                                        Variáveis
                                        <ChevronDown />
                                    </button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                    <DropdownMenu.Content
                                        align="end"
                                        sideOffset={6}
                                        className="v2-editor-fluxo__dropdown"
                                    >
                                        <div className="v2-campo__rotulo" style={{ padding: '0.5rem 0.625rem 0.25rem' }}>
                                            Variáveis disponíveis
                                        </div>
                                        {variaveis.map((variavel) => {
                                            const Icone = variavel.icone;

                                            return (
                                                <DropdownMenu.Item
                                                    key={variavel.valor}
                                                    onSelect={() => aoInserirVariavel(variavel.valor)}
                                                    className="v2-editor-fluxo__dropdown-item"
                                                >
                                                    <span className="v2-editor-fluxo__dropdown-icone" aria-hidden="true">
                                                        <Icone />
                                                    </span>
                                                    <span className="min-w-0" style={{ flex: 1 }}>
                                                        <span style={{ display: 'block', fontWeight: 500 }}>{variavel.rotulo}</span>
                                                        <span className="v2-campo__ajuda">{variavel.valor}</span>
                                                    </span>
                                                </DropdownMenu.Item>
                                            );
                                        })}
                                    </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                        </div>
                    </div>
                    <textarea
                        id={`conteudo-etapa-${indice}`}
                        ref={areaTextoRef}
                        value={etapa.texto}
                        onChange={(evento) => aoAlterarEtapa(indice, 'texto', evento.target.value)}
                        aria-invalid={Boolean(erros[`etapas.${indice}.texto`])}
                        aria-label={`Texto da etapa ${indice + 1}`}
                        placeholder="Escreva a mensagem desta etapa..."
                        rows={7}
                        className="v2-entrada"
                    />
                    {erros[`etapas.${indice}.texto`] && (
                        <p role="alert" className="v2-campo__erro">{erros[`etapas.${indice}.texto`]}</p>
                    )}
                    <p className="v2-campo__ajuda">As variáveis {'{{nome}}'} e {'{{psid}}'} são substituídas no envio.</p>
                </div>
            ) : (
                <>
                    {temTexto && (
                        <div className="v2-editor-fluxo__caixa-info v2-editor-fluxo__caixa-info--erro">
                            <span className="v2-editor-fluxo__caixa-info-icone" aria-hidden="true">
                                <Info />
                            </span>
                            <div>
                                <p className="v2-editor-fluxo__secao-nota">
                                    Esta etapa ainda tem texto guardado. Para enviar apenas a mídia, limpe o texto desta etapa ou volte o tipo para Texto.
                                </p>
                                <button
                                    type="button"
                                    className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                    style={{ marginTop: '0.5rem' }}
                                    onClick={() => aoAlterarEtapa(indice, 'texto', '')}
                                >
                                    <Trash2 />
                                    Limpar texto desta etapa
                                </button>
                            </div>
                        </div>
                    )}
                    {erros[`etapas.${indice}.texto`] && (
                        <p role="alert" className="v2-campo__erro">{erros[`etapas.${indice}.texto`]}</p>
                    )}
                </>
            )}

            <div className="v2-editor-fluxo__caixa-info">
                <Interruptor
                    id={`indicador-digitacao-${indice}`}
                    checked={Boolean(etapa.indicador_digitacao_ativo)}
                    onCheckedChange={(habilitado) => aoAlternarIndicadorDigitacao(indice, habilitado)}
                    disabled={!suportaIndicadorDigitacao}
                    titulo="Mostrar indicador de digitação"
                    descricao="Exibe “digitando…” antes desta mensagem. É independente da pausa para a próxima etapa."
                />
                {etapa.indicador_digitacao_ativo && (
                    <div className="v2-campo" style={{ marginTop: '0.75rem', maxWidth: '16rem' }}>
                        <label htmlFor={`indicador-segundos-${indice}`} className="v2-campo__rotulo">Duração do indicador</label>
                        <div className="v2-editor-fluxo__campo-linha">
                            <input
                                id={`indicador-segundos-${indice}`}
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={INDICADOR_DIGITACAO_MAXIMO_SEGUNDOS}
                                step={1}
                                value={etapa.indicador_digitacao_segundos}
                                onChange={(evento) => aoAlterarSegundosIndicador(indice, evento.target.value)}
                                aria-invalid={Boolean(erros[`etapas.${indice}.indicador_digitacao_segundos`])}
                                className="v2-entrada v2-numerico"
                            />
                            <span className="v2-campo__ajuda">segundos</span>
                        </div>
                        <p className="v2-campo__ajuda">Entre 1 e {INDICADOR_DIGITACAO_MAXIMO_SEGUNDOS} segundos, o limite atual da Send API.</p>
                        {erros[`etapas.${indice}.indicador_digitacao_segundos`] && (
                            <p role="alert" className="v2-campo__erro">{erros[`etapas.${indice}.indicador_digitacao_segundos`]}</p>
                        )}
                    </div>
                )}
                {!suportaIndicadorDigitacao && (
                    <p className="v2-campo__ajuda">A migration do indicador de digitação ainda não foi executada neste banco; a opção ficará disponível após a autorização.</p>
                )}
            </div>

            {indice < total - 1 && (
                <div className="v2-editor-fluxo__caixa-info">
                    <Interruptor
                        id={`encerra-apos-${indice}`}
                        checked={Boolean(etapa.encerra_apos)}
                        onCheckedChange={(habilitado) => aoAlterarEtapa(indice, 'encerra_apos', habilitado)}
                        disabled={!suportaCondicaoHorario}
                        titulo="Encerrar fluxo após esta etapa"
                        descricao="Útil em ramos independentes: a execução termina sem seguir para a próxima etapa da lista."
                    />
                </div>
            )}

            {indice < total - 1 && !etapa.encerra_apos ? (
                <div className="v2-editor-fluxo__caixa-info">
                    <Interruptor
                        id={`pausa-etapa-${indice}`}
                        checked={Boolean(pausasAtivas[indice])}
                        onCheckedChange={(habilitada) => aoAlternarPausa(indice, habilitada)}
                        titulo="Adicionar pausa antes da próxima etapa"
                        descricao="Desativada por padrão; configurada em segundos ou minutos."
                    />
                    {pausasAtivas[indice] && (
                        <div className="v2-campo" style={{ marginTop: '0.75rem', maxWidth: '20rem' }}>
                            <div className="v2-editor-fluxo__secao-cabecalho" style={{ marginBottom: '0.375rem' }}>
                                <label htmlFor={`pausa-valor-${indice}`} className="v2-campo__rotulo">Duração da pausa</label>
                                <div role="group" aria-label="Unidade da pausa" className="v2-segmentado">
                                    {unidadesPausa.map((unidade) => (
                                        <button
                                            key={unidade.valor}
                                            type="button"
                                            aria-pressed={pausaUnidade === unidade.valor}
                                            onClick={() => aoAlterarUnidadePausa(unidade.valor)}
                                        >
                                            {unidade.rotulo}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <input
                                id={`pausa-valor-${indice}`}
                                type="number"
                                step="any"
                                min={pausaUnidade === 'minutos' ? 1 / 60 : 1}
                                value={pausaInput}
                                onChange={(evento) => aoAlterarPausaInput(evento.target.value)}
                                aria-invalid={Boolean(erros[`etapas.${indice}.pausa_segundos`]) || etapa.pausa_segundos <= 0}
                                className="v2-entrada v2-numerico"
                            />
                            {(erros[`etapas.${indice}.pausa_segundos`] || etapa.pausa_segundos <= 0) && (
                                <p role="alert" className="v2-campo__erro">
                                    {erros[`etapas.${indice}.pausa_segundos`] || 'Informe uma pausa maior que zero.'}
                                </p>
                            )}
                            {pausaUnidade === 'minutos' && (
                                <p className="v2-campo__ajuda">Convertido automaticamente para segundos ao salvar.</p>
                            )}
                        </div>
                    )}
                </div>
            ) : indice >= total - 1 ? (
                <p className="v2-campo__ajuda" style={{ padding: '0.625rem 0.75rem', border: '1px solid var(--v2-line)', background: 'var(--v2-surface-2)' }}>
                    Esta é a última etapa; não há uma etapa seguinte para aguardar.
                </p>
            ) : null}

            <div className="v2-editor-fluxo__navegacao-etapa">
                <button
                    type="button"
                    className="v2-btn v2-btn--contorno v2-btn--pequeno"
                    onClick={aoVoltar}
                    disabled={indice === 0}
                >
                    <ChevronLeft />
                    Anterior
                </button>
                <button
                    type="button"
                    className="v2-btn v2-btn--contorno v2-btn--pequeno"
                    onClick={aoAvancar}
                    disabled={indice >= total - 1}
                >
                    Próxima etapa
                    <ChevronRight />
                </button>
            </div>
        </div>
    );
}
