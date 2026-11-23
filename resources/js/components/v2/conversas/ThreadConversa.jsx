import { ArrowLeft, ChevronUp, Download, FileText, Info, MessageCircle } from 'lucide-react';
import { Avatar, Esqueleto, Vazio } from '@/components/v2/pecas';
import { formatarDataHora, nomeDoContato, rotuloMidia } from '@/components/v2/formato';
import CompositorMensagem from './CompositorMensagem';
import { rotuloDoDia } from './util';

/**
 * Coluna central: cabeçalho do contato, histórico em grupos de dia, carga de
 * mensagens anteriores e compositor.
 */
export default function ThreadConversa({
    contato,
    mensagens,
    grupos,
    temMaisThread,
    carregandoThread,
    carregandoAnteriores,
    detalhesAbertos,
    corpoDaThread,
    aoVoltar,
    aoAbrirDetalhes,
    aoCarregarAnteriores,
    form,
    aoEnviar,
    primeiroContatoId,
    aoSelecionarContato,
}) {
    return (
        <section className="v2-thread" aria-label="Conversa selecionada">
            {contato ? (
                <>
                    <header className="v2-thread__topo">
                        <button
                            type="button"
                            className="v2-btn v2-btn--fantasma v2-btn--icone v2-so-estreito"
                            aria-label="Voltar para a lista de conversas"
                            onClick={aoVoltar}
                        >
                            <ArrowLeft aria-hidden="true" />
                        </button>
                        <Avatar nome={nomeDoContato(contato)} />
                        <div className="min-w-0">
                            <h2 className="truncate text-[0.8125rem] font-semibold">{nomeDoContato(contato)}</h2>
                            <p className="v2-micro">
                                PSID <span className="v2-mono text-[var(--v2-ink)]">{contato.psid}</span>
                            </p>
                        </div>
                        <div className="v2-thread__acoes">
                            <button
                                type="button"
                                className="v2-btn v2-btn--contorno v2-btn--pequeno v2-so-ate-medio"
                                aria-expanded={detalhesAbertos}
                                onClick={aoAbrirDetalhes}
                            >
                                <Info aria-hidden="true" />
                                Detalhes
                            </button>
                        </div>
                    </header>

                    <div className="v2-thread__corpo" ref={corpoDaThread}>
                        {carregandoThread ? (
                            <div className="mx-auto max-w-2xl">
                                <Esqueleto linhas={5} rotulo="Carregando conversa" />
                            </div>
                        ) : (
                            <div className="v2-rolagem-mensagens">
                                {temMaisThread && (
                                    <div className="flex justify-center">
                                        <button
                                            type="button"
                                            className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                            onClick={aoCarregarAnteriores}
                                            disabled={carregandoAnteriores}
                                        >
                                            <ChevronUp aria-hidden="true" />
                                            {carregandoAnteriores ? 'Carregando…' : 'Carregar mensagens anteriores'}
                                        </button>
                                    </div>
                                )}

                                {grupos.map(([dia, itens]) => (
                                    <div key={dia} className="contents">
                                        <div className="v2-separador-data">{rotuloDoDia(dia)}</div>
                                        {itens.map((mensagem) => (
                                            <article
                                                key={mensagem.id}
                                                className={`v2-bolha ${mensagem.direcao === 'enviada' ? 'v2-bolha--enviada' : 'v2-bolha--recebida'}`}
                                            >
                                                {mensagem.tipo_conteudo && mensagem.tipo_conteudo !== 'texto' && (
                                                    <div className="v2-anexo">
                                                        <span className="v2-anexo__icone">
                                                            <FileText className="size-3.5" aria-hidden="true" />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[0.6875rem] font-medium">
                                                                {mensagem.anexo_nome_original ?? 'anexo'}
                                                            </span>
                                                            <span className="block text-[0.625rem] text-[var(--v2-ink-2)]">
                                                                {rotuloMidia(mensagem.tipo_conteudo)} ·{' '}
                                                                {Math.round((mensagem.anexo_tamanho_bytes ?? 0) / 1024)} KB
                                                            </span>
                                                        </span>
                                                        <a
                                                            href={`/mensagens/${mensagem.id}/anexo?download=1`}
                                                            className="text-[var(--v2-ink-3)] hover:text-[var(--v2-ink)]"
                                                            aria-label={`Baixar ${mensagem.anexo_nome_original ?? 'anexo'}`}
                                                        >
                                                            <Download className="size-3.5" aria-hidden="true" />
                                                        </a>
                                                    </div>
                                                )}
                                                {mensagem.texto && <p className="v2-bolha__texto">{mensagem.texto}</p>}
                                                <p className="v2-bolha__meta">
                                                    <span>{mensagem.direcao === 'enviada' ? 'Enviada' : 'Recebida'}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span className="v2-numerico">{formatarDataHora(mensagem.created_at)}</span>
                                                </p>
                                            </article>
                                        ))}
                                    </div>
                                ))}

                                {mensagens.length === 0 && (
                                    <Vazio
                                        icone={MessageCircle}
                                        titulo="Nenhuma mensagem registrada"
                                        texto="O histórico desta conversa aparecerá aqui quando houver mensagens."
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <CompositorMensagem form={form} aoEnviar={aoEnviar} />
                </>
            ) : (
                <div className="flex flex-1 items-center justify-center p-6">
                    <div className="max-w-sm text-center">
                        <span className="mx-auto flex size-11 items-center justify-center border border-[var(--v2-line)] bg-[var(--v2-surface)] text-[var(--v2-destaque)]">
                            <MessageCircle className="size-5" aria-hidden="true" />
                        </span>
                        <h2 className="mt-4 text-lg font-semibold">Selecione uma conversa</h2>
                        <p className="mt-1.5 text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                            A lista mostra nome, prévia da última mensagem e origem. Os detalhes do contato abrem em
                            painel lateral, com acesso ao histórico.
                        </p>
                        {primeiroContatoId && (
                            <button
                                type="button"
                                className="v2-btn v2-btn--contorno mt-4"
                                onClick={() => aoSelecionarContato(primeiroContatoId)}
                            >
                                Abrir primeira conversa
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
