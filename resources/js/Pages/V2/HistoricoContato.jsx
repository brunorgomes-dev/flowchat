import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Download, FileText, MessageCircle, Search } from 'lucide-react';
import LayoutV2 from '@/components/v2/LayoutV2';
import { Aviso, Avatar, CabecalhoPagina, Chip, Secao, Segmentado, Vazio } from '@/components/v2/pecas';
import {
    chaveDoDia,
    formatarDataHora,
    formatarDiaLongo,
    nomeDoContato,
    rotuloMidia,
} from '@/components/v2/formato';

const filtros = [
    { valor: 'todas', rotulo: 'Todas' },
    { valor: 'recebida', rotulo: 'Recebidas' },
    { valor: 'enviada', rotulo: 'Enviadas' },
];

export default function HistoricoContato({ contato, mensagens = [] }) {
    const [filtro, setFiltro] = useState('todas');

    const visiveis = useMemo(
        () => (filtro === 'todas' ? mensagens : mensagens.filter((mensagem) => mensagem.direcao === filtro)),
        [filtro, mensagens],
    );

    const grupos = useMemo(() => {
        const mapa = new Map();

        visiveis.forEach((mensagem) => {
            const dia = chaveDoDia(mensagem.created_at);

            if (!mapa.has(dia)) {
                mapa.set(dia, []);
            }

            mapa.get(dia).push(mensagem);
        });

        return [...mapa.entries()];
    }, [visiveis]);

    return (
        <div className="v2-conteudo v2-conteudo--estreito">
            <CabecalhoPagina
                titulo={nomeDoContato(contato)}
                descricao={`Histórico completo da conversa${contato?.psid ? ` · PSID ${contato.psid}` : ''}. Mensagens em ordem cronológica, com direção, texto e anexos.`}
                acoes={
                    <Link href={`/?contato=${contato.id}`} className="v2-btn v2-btn--contorno">
                        <ArrowLeft aria-hidden="true" />
                        Voltar à conversa
                    </Link>
                }
            />

            <div className="v2-painel v2-painel__corpo mt-4 flex flex-wrap items-center gap-4">
                <Avatar nome={nomeDoContato(contato)} tamanho="grande" marca />
                <dl className="v2-dados min-w-[12rem] flex-1">
                    <div>
                        <dt>Mensagens</dt>
                        <dd className="v2-numerico">{mensagens.length}</dd>
                    </div>
                    <div>
                        <dt>Primeira</dt>
                        <dd className="v2-numerico">{formatarDataHora(mensagens[0]?.created_at)}</dd>
                    </div>
                    <div>
                        <dt>Última</dt>
                        <dd className="v2-numerico">{formatarDataHora(mensagens[mensagens.length - 1]?.created_at)}</dd>
                    </div>
                </dl>
            </div>

            <Secao
                id="historico-mensagens"
                titulo="Mensagens"
                nota="O histórico é carregado completo por esta página; a conversa usa carregamento incremental."
                acoes={<Segmentado rotulo="Filtrar mensagens" opcoes={filtros} valor={filtro} aoAlterar={setFiltro} />}
            >
                <div className="v2-painel v2-painel__corpo">
                    {visiveis.length === 0 ? (
                        <Vazio
                            icone={Search}
                            titulo={mensagens.length === 0 ? 'Nenhuma mensagem registrada' : 'Nenhuma mensagem neste filtro'}
                            texto={mensagens.length === 0
                                ? 'As mensagens deste contato aparecerão aqui quando houver conversa.'
                                : 'Volte para todas as mensagens para ver o histórico completo.'}
                            acao={mensagens.length > 0 ? (
                                <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno" onClick={() => setFiltro('todas')}>
                                    Mostrar todas
                                </button>
                            ) : null}
                        />
                    ) : (
                        <div className="v2-rolagem-mensagens">
                            {grupos.map(([dia, itens]) => (
                                <div key={dia} className="contents">
                                    <div className="v2-separador-data">{formatarDiaLongo(`${dia}T12:00:00`)}</div>
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
                        </div>
                    )}
                </div>
            </Secao>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Chip>{mensagens.length} mensagens</Chip>
                <Chip tom="marca">
                    <MessageCircle className="size-3" aria-hidden="true" />
                    Conversa disponível na caixa de atendimento
                </Chip>
            </div>
        </div>
    );
}

HistoricoContato.layout = [LayoutV2];
