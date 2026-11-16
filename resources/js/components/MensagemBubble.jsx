import { Download, FileText, Image as ImageIcon, Music, Video } from 'lucide-react';

function formatarDataCompleta(valor) {
    if (!valor) {
        return null;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(data);
}

function formatarTamanho(bytes) {
    const valor = Number(bytes);

    if (!Number.isFinite(valor) || valor <= 0) {
        return null;
    }

    if (valor < 1024) {
        return `${valor} B`;
    }

    if (valor < 1024 * 1024) {
        return `${Math.round(valor / 1024)} KB`;
    }

    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(valor / (1024 * 1024))} MB`;
}

const tiposMidia = {
    imagem: { rotulo: 'Imagem', icone: ImageIcon },
    audio: { rotulo: 'Áudio', icone: Music },
    video: { rotulo: 'Vídeo', icone: Video },
    arquivo: { rotulo: 'Arquivo', icone: FileText },
};

export function MensagemBubble({ mensagem }) {
    const enviada = mensagem.direcao === 'enviada';
    const horario = formatarDataCompleta(mensagem.created_at);
    const tipo = mensagem.tipo_conteudo ?? 'texto';
    const midia = tiposMidia[tipo] ?? null;
    const temMidia = Boolean(midia && mensagem.anexo_nome_original);
    const urlAnexo = `/mensagens/${mensagem.id}/anexo`;
    const IconeMidia = midia?.icone ?? FileText;
    const tamanho = formatarTamanho(mensagem.anexo_tamanho_bytes);

    return (
        <div className={`flex w-full ${enviada ? 'justify-end' : 'justify-start'}`}>
            <article className={`max-w-[min(82%,42rem)] rounded-2xl border px-4 py-3 ${enviada
                ? 'rounded-br-lg border-transparent bg-primary text-primary-foreground'
                : 'rounded-bl-lg border-border bg-card text-card-foreground'}`}>
                {temMidia && (
                    <div className={`mb-2 overflow-hidden rounded-xl border ${enviada ? 'border-primary-foreground/20' : 'border-border'}`}>
                        {tipo === 'imagem' && (
                            <a href={urlAnexo} target="_blank" rel="noopener noreferrer" className="block bg-black/5">
                                <img
                                    src={urlAnexo}
                                    alt={mensagem.anexo_nome_original}
                                    loading="lazy"
                                    className="max-h-72 w-full object-cover"
                                />
                            </a>
                        )}

                        {tipo === 'audio' && (
                            <audio controls preload="metadata" src={urlAnexo} className="w-full px-2 py-2" />
                        )}

                        {tipo === 'video' && (
                            <video controls preload="metadata" src={urlAnexo} className="max-h-72 w-full bg-black" />
                        )}

                        <div className={`flex items-center gap-2.5 px-3 py-2.5 ${enviada ? 'bg-primary-foreground/10' : 'bg-muted/40'}`}>
                            <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${enviada ? 'bg-primary-foreground/15' : 'bg-background text-muted-foreground'}`}>
                                <IconeMidia className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">{mensagem.anexo_nome_original}</p>
                                <p className={`text-[10px] ${enviada ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                    {midia.rotulo}
                                    {tamanho ? ` · ${tamanho}` : ''}
                                </p>
                            </div>
                            <a
                                href={`${urlAnexo}?download=1`}
                                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${enviada
                                    ? 'text-primary-foreground/80 hover:bg-primary-foreground/10'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                aria-label={`Baixar ${mensagem.anexo_nome_original}`}
                                title="Baixar arquivo"
                            >
                                <Download className="size-4" />
                            </a>
                        </div>
                    </div>
                )}

                {mensagem.texto && (
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">{mensagem.texto}</p>
                )}

                <div className={`mt-2 flex items-center gap-2 text-[10px] ${enviada
                    ? 'justify-end text-primary-foreground/70'
                    : 'justify-start text-muted-foreground'}`}>
                    <span>{enviada ? 'Enviada' : 'Recebida'}</span>
                    {horario && <span>{horario}</span>}
                </div>
            </article>
        </div>
    );
}
