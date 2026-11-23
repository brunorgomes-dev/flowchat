import { Link } from '@inertiajs/react';
import { Megaphone } from 'lucide-react';
import { Avatar, Chip } from '@/components/v2/pecas';
import { nomeDoContato, urlSegura } from '@/components/v2/formato';
import { origemEhAnuncio, rotuloOrigem } from './util';

/**
 * Ficha do contato com PSID, origem do anúncio, criativo e histórico.
 */
export default function FichaDoContato({ contato, totalMensagens }) {
    const anuncio = contato?.origem_mais_recente ?? null;
    const foto = urlSegura(anuncio?.photo_url);
    const video = urlSegura(anuncio?.video_url);

    return (
        <>
            <div className="v2-ficha__bloco">
                <div className="flex items-center gap-3">
                    <Avatar nome={nomeDoContato(contato)} tamanho="grande" marca />
                    <span className="min-w-0">
                        <span className="block truncate text-[0.8125rem] font-semibold">{nomeDoContato(contato)}</span>
                        <span className="v2-micro">{totalMensagens ?? 0} mensagens no total</span>
                    </span>
                </div>
            </div>

            <div className="v2-ficha__bloco">
                <dl className="v2-dados">
                    <div>
                        <dt>PSID</dt>
                        <dd className="v2-mono">{contato.psid}</dd>
                    </div>
                </dl>
            </div>

            <div className="v2-ficha__bloco">
                <p className="v2-micro">Origem do contato</p>
                {anuncio ? (
                    <div className="mt-2 space-y-2">
                        <Chip tom={origemEhAnuncio(anuncio) ? 'marca' : 'neutro'}>
                            <Megaphone className="size-2.5" aria-hidden="true" />
                            {rotuloOrigem(anuncio)}
                        </Chip>
                        <dl className="v2-dados">
                            {anuncio.ad_id && (
                                <div>
                                    <dt>ID do anúncio</dt>
                                    <dd className="v2-mono">{anuncio.ad_id}</dd>
                                </div>
                            )}
                            {anuncio.ad_title && (
                                <div>
                                    <dt>Anúncio</dt>
                                    <dd>{anuncio.ad_title}</dd>
                                </div>
                            )}
                            {anuncio.post_id && (
                                <div>
                                    <dt>Publicação</dt>
                                    <dd className="v2-mono">{anuncio.post_id}</dd>
                                </div>
                            )}
                            {anuncio.product_id && (
                                <div>
                                    <dt>Produto</dt>
                                    <dd className="v2-mono">{anuncio.product_id}</dd>
                                </div>
                            )}
                            {anuncio.referencia && (
                                <div>
                                    <dt>Referência</dt>
                                    <dd className="v2-mono">{anuncio.referencia}</dd>
                                </div>
                            )}
                            {anuncio.referer_uri && (
                                <div>
                                    <dt>Origem do link</dt>
                                    <dd className="v2-quebra">{anuncio.referer_uri}</dd>
                                </div>
                            )}
                        </dl>
                        {anuncio.mensagem_inicial && (
                            <blockquote className="border-l-2 border-[var(--v2-terracota)] bg-[var(--v2-surface-2)] px-2 py-1.5 text-[0.6875rem] leading-5">
                                {anuncio.mensagem_inicial}
                            </blockquote>
                        )}
                        {foto && (
                            <a href={foto} target="_blank" rel="noopener noreferrer" className="v2-btn v2-btn--fantasma v2-btn--pequeno">
                                Abrir criativo do anúncio
                            </a>
                        )}
                        {video && (
                            <a href={video} target="_blank" rel="noopener noreferrer" className="v2-btn v2-btn--fantasma v2-btn--pequeno">
                                Abrir vídeo do anúncio
                            </a>
                        )}
                    </div>
                ) : (
                    <p className="mt-2 text-xs leading-5 text-[var(--v2-ink-2)]">
                        Nenhuma origem registrada. O contato chegou diretamente pelo Messenger.
                    </p>
                )}
            </div>

            <div className="v2-ficha__bloco">
                <Link href={`/contatos/${contato.id}/historico`} className="v2-btn v2-btn--contorno v2-btn--bloco">
                    Ver histórico completo
                </Link>
            </div>
        </>
    );
}
