import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, Check, MessagesSquare, Plug, RefreshCw } from 'lucide-react';
import LayoutV2 from '@/components/v2/LayoutV2';
import { Aviso, CabecalhoPagina, Chip, Secao, Vazio } from '@/components/v2/pecas';

export default function SelecionarPagina({ paginas = [] }) {
    const erro = usePage().props.errors?.page_id;
    const [selecionando, setSelecionando] = useState(null);
    const [selecionada, setSelecionada] = useState(null);

    const selecionar = (pagina) => {
        setSelecionando(pagina.id);
        router.post('/configuracoes/messenger/paginas', { page_id: pagina.id }, {
            onSuccess: () => setSelecionada(pagina.id),
            onFinish: () => setSelecionando(null),
        });
    };

    return (
        <div className="v2-conteudo v2-conteudo--estreito">
            <CabecalhoPagina
                titulo="Escolha uma Página"
                descricao="Selecione a Página do Facebook que será conectada à sua conta FlowChat. O retorno do OAuth traz apenas as Páginas que você administra."
                acoes={
                    <Link href="/configuracoes/conexao" className="v2-btn v2-btn--contorno">
                        <ArrowLeft aria-hidden="true" />
                        Voltar à conexão
                    </Link>
                }
            />

            {erro && (
                <div className="mt-4">
                    <Aviso tom="erro" titulo="Não foi possível conectar a Página">{erro}</Aviso>
                </div>
            )}

            <Secao id="paginas-disponiveis" titulo="Páginas disponíveis" nota="A lista vem da autorização do Facebook e expira com a sessão do OAuth.">
                <div className="space-y-2">
                    {paginas.map((pagina) => (
                        <article
                            key={pagina.id}
                            className={`flex flex-wrap items-center justify-between gap-3 border p-3 ${
                                selecionada === pagina.id
                                    ? 'border-[var(--v2-terracota)] bg-[color-mix(in_oklab,var(--v2-terracota)_7%,var(--v2-surface))]'
                                    : 'border-[var(--v2-line)] bg-[var(--v2-surface)]'
                            }`}
                        >
                            <div className="flex min-w-0 items-center gap-2.5">
                                <span className="v2-anexo__icone">
                                    <MessagesSquare className="size-3.5" aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-[0.8125rem] font-medium">{pagina.nome}</p>
                                    <p className="v2-micro v2-mono">{pagina.id}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selecionada === pagina.id && (
                                    <Chip tom="positivo">
                                        <Check className="size-3" aria-hidden="true" />
                                        Conectada
                                    </Chip>
                                )}
                                <button
                                    type="button"
                                    className="v2-btn v2-btn--primario v2-btn--pequeno"
                                    onClick={() => selecionar(pagina)}
                                    disabled={selecionando !== null}
                                >
                                    <Plug aria-hidden="true" />
                                    {selecionando === pagina.id ? 'Conectando…' : 'Conectar esta Página'}
                                </button>
                            </div>
                        </article>
                    ))}

                    {paginas.length === 0 && (
                        <Vazio
                            icone={MessagesSquare}
                            titulo="Nenhuma Página disponível"
                            texto="O Facebook não retornou Páginas para esta autorização. Autorize novamente para escolher outra conta."
                        />
                    )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="v2-btn v2-btn--fantasma"
                        onClick={() => router.post('/configuracoes/messenger/cancelar-conexao')}
                    >
                        <ArrowLeft aria-hidden="true" />
                        Cancelar e voltar
                    </button>
                    <button
                        type="button"
                        className="v2-btn v2-btn--contorno"
                        onClick={() => window.location.assign('/configuracoes/messenger/conectar')}
                    >
                        <RefreshCw aria-hidden="true" />
                        Escolher outra conta do Facebook
                    </button>
                </div>
            </Secao>

            <div className="mt-5">
                <Aviso tom="info" titulo="OAuth e webhook">
                    A conexão inscreve a Página no webhook com os eventos de mensagens, postbacks e referrals. Nenhum
                    token é exibido nesta tela.
                </Aviso>
            </div>
        </div>
    );
}

SelecionarPagina.layout = [LayoutV2];
