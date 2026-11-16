import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, ChevronUp, FileText, History, MessageCircle, Search } from 'lucide-react';
import LayoutPreview from './_components/LayoutPreview';
import {
    Aviso,
    Avatar,
    CabecalhoPagina,
    Chip,
    Esqueleto,
    Secao,
    Segmentado,
    SeloDemo,
    SeloLeitura,
    Vazio,
} from './_components/pecas';
import {
    chaveDoDia,
    contatos,
    formatarDataHora,
    formatarDiaLongo,
    nomeDoContato,
    rotulosTipoConteudo,
} from './_data/demonstracao';

const filtros = [
    { valor: 'todas', rotulo: 'Todas' },
    { valor: 'recebida', rotulo: 'Recebidas' },
    { valor: 'enviada', rotulo: 'Enviadas' },
];

const contato = contatos[0];

export default function HistoricoContato() {
    const [filtro, setFiltro] = useState('todas');
    const [carregando, setCarregando] = useState(false);
    const [carregado, setCarregado] = useState(false);

    const mensagens = useMemo(() => {
        if (!carregado) {
            return [];
        }

        return contato.mensagens.filter((mensagem) => filtro === 'todas' || mensagem.direcao === filtro);
    }, [filtro, carregado]);

    const agrupadas = useMemo(() => {
        const mapa = new Map();

        mensagens.forEach((mensagem) => {
            const dia = chaveDoDia(mensagem.created_at);

            if (!mapa.has(dia)) {
                mapa.set(dia, []);
            }

            mapa.get(dia).push(mensagem);
        });

        return [...mapa.entries()];
    }, [mensagens]);

    const carregar = () => {
        setCarregando(true);
        setTimeout(() => {
            setCarregado(true);
            setCarregando(false);
        }, 320);
    };

    return (
        <div className="v2-conteudo v2-conteudo--estreito">
            <CabecalhoPagina
                titulo={nomeDoContato(contato)}
                descricao={`Histórico completo da conversa · PSID ${contato.psid}. Ordem cronológica, com direção, texto e anexos.`}
                nota={
                    <div className="flex flex-wrap items-center gap-2">
                        <SeloLeitura />
                        <SeloDemo />
                    </div>
                }
                acoes={
                    <Link href="/preview/design-v2/conversas" className="v2-btn v2-btn--contorno">
                        <ArrowLeft aria-hidden="true" />
                        Voltar à conversa
                    </Link>
                }
            />

            <div className="v2-painel v2-painel__corpo mt-4 flex flex-wrap items-center gap-4">
                <Avatar nome={nomeDoContato(contato)} tamanho="grande" marca />
                <dl className="v2-dados min-w-[12rem] flex-1">
                    <div>
                        <dt>Mensagens registradas</dt>
                        <dd className="v2-numerico">{contato.mensagens_count}</dd>
                    </div>
                    <div>
                        <dt>Primeira mensagem</dt>
                        <dd className="v2-numerico">{formatarDataHora(contato.mensagens[0]?.created_at)}</dd>
                    </div>
                    <div>
                        <dt>Última mensagem</dt>
                        <dd className="v2-numerico">{formatarDataHora(contato.ultimaMensagemEm)}</dd>
                    </div>
                    <div>
                        <dt>Origem</dt>
                        <dd>{contato.origem?.ad_title ?? 'Sem origem registrada'}</dd>
                    </div>
                </dl>
            </div>

            <Secao
                id="historico-mensagens"
                titulo="Mensagens"
                nota="O histórico real carrega em páginas de 30; aqui a carga é simulada."
                acoes={<Segmentado rotulo="Filtrar mensagens" opcoes={filtros} valor={filtro} aoAlterar={setFiltro} />}
            >
                {!carregado ? (
                    <div className="v2-painel">
                        <div className="v2-painel__corpo space-y-3 text-center">
                            <History className="mx-auto size-5 text-[var(--v2-ink-3)]" aria-hidden="true" />
                            <p className="text-[0.8125rem] font-medium">Histórico pronto para carregar</p>
                            <p className="mx-auto max-w-sm text-xs leading-5 text-[var(--v2-ink-2)]">
                                A interface atual já abre as últimas 30 mensagens e carrega as anteriores sob demanda. A
                                V2 usa o mesmo gesto, com esqueleto de carregamento.
                            </p>
                            <button type="button" className="v2-btn v2-btn--contorno" onClick={carregar} disabled={carregando}>
                                {carregando ? 'Carregando…' : 'Carregar histórico (simulação)'}
                            </button>
                        </div>
                    </div>
                ) : carregando ? (
                    <div className="v2-painel">
                        <Esqueleto linhas={5} rotulo="Carregando histórico" />
                    </div>
                ) : (
                    <div className="v2-painel v2-painel__corpo">
                        {mensagens.length === 0 ? (
                            <Vazio
                                icone={Search}
                                titulo="Nenhuma mensagem neste filtro"
                                texto="Volte para todas as mensagens para ver o histórico completo."
                                acao={
                                    <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno" onClick={() => setFiltro('todas')}>
                                        Mostrar todas
                                    </button>
                                }
                            />
                        ) : (
                            <div className="v2-rolagem-mensagens">
                                {agrupadas.map(([dia, itens]) => (
                                    <div key={dia} className="contents">
                                        <div className="v2-separador-data">{formatarDiaLongo(`${dia}T12:00:00-03:00`)}</div>
                                        {itens.map((mensagem) => (
                                            <article
                                                key={mensagem.id}
                                                className={`v2-bolha ${mensagem.direcao === 'enviada' ? 'v2-bolha--enviada' : 'v2-bolha--recebida'}`}
                                            >
                                                {mensagem.tipo_conteudo !== 'texto' && (
                                                    <div className="v2-anexo">
                                                        <span className="v2-anexo__icone">
                                                            <FileText className="size-3.5" aria-hidden="true" />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[0.6875rem] font-medium">
                                                                {mensagem.anexo_nome_original}
                                                            </span>
                                                            <span className="block text-[0.625rem] text-[var(--v2-ink-2)]">
                                                                {rotulosTipoConteudo[mensagem.tipo_conteudo]} ·{' '}
                                                                {Math.round((mensagem.anexo_tamanho_bytes ?? 0) / 1024)} KB
                                                            </span>
                                                        </span>
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

                                <div className="flex justify-center pt-1">
                                    <button
                                        type="button"
                                        className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                        onClick={() => setCarregado(false)}
                                    >
                                        <ChevronUp aria-hidden="true" />
                                        Ocultar histórico carregado
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Secao>

            <div className="mt-5">
                <Aviso tom="info" titulo="Nenhum anexo é aberto no preview">
                    Os arquivos listados são metadados fictícios. A rota de download autenticada da aplicação não é
                    chamada e nenhum arquivo do cliente é lido.
                </Aviso>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip>{contato.mensagens.length} mensagens nesta conversa</Chip>
                <Chip tom="marca">
                    <MessageCircle className="size-3" aria-hidden="true" />
                    Resposta manual simulada na tela de conversas
                </Chip>
            </div>
        </div>
    );
}

HistoricoContato.layout = [LayoutPreview];
