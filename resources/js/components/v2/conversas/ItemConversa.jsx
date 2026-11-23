import { Megaphone } from 'lucide-react';
import { Avatar, Chip } from '@/components/v2/pecas';
import { formatarHora, nomeDoContato, resumoMensagem } from '@/components/v2/formato';
import { origemEhAnuncio, rotuloOrigem } from './util';

/**
 * Linha da lista de conversas: nome, hora da última mensagem, prévia e
 * origem do anúncio quando houver.
 */
export default function ItemConversa({ contato, ativo, aoSelecionar }) {
    const origem = contato.origem_mais_recente ?? null;
    const ultima = contato.ultima_mensagem ?? null;

    return (
        <li>
            <button
                type="button"
                className={`v2-linha v2-linha--clicavel ${ativo ? 'v2-linha--ativa' : ''}`}
                aria-pressed={ativo}
                onClick={() => aoSelecionar(contato.id)}
            >
                <Avatar nome={nomeDoContato(contato)} />
                <span className="v2-linha__corpo">
                    <span className="v2-linha__titulo">
                        <span className="v2-linha__nome">{nomeDoContato(contato)}</span>
                        <span className="v2-micro v2-numerico">
                            {formatarHora(ultima?.created_at)}
                        </span>
                    </span>
                    <span className="v2-linha__texto">{resumoMensagem(ultima)}</span>
                    {origem && (
                        <span className="mt-1 inline-flex">
                            <Chip tom={origemEhAnuncio(origem) ? 'marca' : 'neutro'}>
                                <Megaphone className="size-2.5" aria-hidden="true" />
                                {rotuloOrigem(origem)}
                                {origem.ad_id ? ` · ${origem.ad_id}` : ''}
                            </Chip>
                        </span>
                    )}
                </span>
            </button>
        </li>
    );
}
