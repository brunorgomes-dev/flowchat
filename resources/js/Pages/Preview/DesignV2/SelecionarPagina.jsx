import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, MessagesSquare, Plug, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import LayoutPreview from './_components/LayoutPreview';
import {
    Aviso,
    CabecalhoPagina,
    Chip,
    Secao,
    SeloDemo,
    SeloLeitura,
} from './_components/pecas';
import { paginasMessenger } from './_data/demonstracao';

export default function SelecionarPagina() {
    const [conectada, setConectada] = useState(null);

    return (
        <div className="v2-conteudo v2-conteudo--estreito">
            <CabecalhoPagina
                titulo="Escolha uma Página"
                descricao="Selecione a Página do Facebook que será conectada à sua conta FlowChat. O retorno do OAuth traz apenas as Páginas que você administra."
                nota={
                    <div className="flex flex-wrap items-center gap-2">
                        <SeloLeitura />
                        <SeloDemo />
                    </div>
                }
                acoes={
                    <Link href="/preview/design-v2/configuracoes" className="v2-btn v2-btn--contorno">
                        <ArrowLeft aria-hidden="true" />
                        Voltar às configurações
                    </Link>
                }
            />

            <Secao id="paginas-disponiveis" titulo="Páginas disponíveis" nota="Lista fictícia: o fluxo real depende da resposta do Facebook.">
                <div className="space-y-2">
                    {paginasMessenger.map((pagina) => {
                        const selecionada = conectada === pagina.id;

                        return (
                            <article
                                key={pagina.id}
                                className={`flex flex-wrap items-center justify-between gap-3 border p-3 ${
                                    selecionada
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
                                        <p className="v2-micro v2-mono">
                                            {pagina.id} · {pagina.seguidores} seguidores
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selecionada && <Chip tom="positivo">Selecionada</Chip>}
                                    <button
                                        type="button"
                                        className="v2-btn v2-btn--primario v2-btn--pequeno"
                                        onClick={() => {
                                            setConectada(pagina.id);
                                            toast.success('Página selecionada (simulação)', {
                                                description: 'Nenhuma inscrição de webhook foi feita.',
                                            });
                                        }}
                                    >
                                        <Plug aria-hidden="true" />
                                        Conectar esta Página
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="v2-btn v2-btn--fantasma"
                        onClick={() => toast.info('Cancelamento simulado', { description: 'Nada foi alterado.' })}
                    >
                        <ArrowLeft aria-hidden="true" />
                        Cancelar e voltar
                    </button>
                    <button
                        type="button"
                        className="v2-btn v2-btn--contorno"
                        onClick={() => toast.info('Troca de conta simulada', { description: 'O OAuth real não é aberto.' })}
                    >
                        <RefreshCw aria-hidden="true" />
                        Escolher outra conta do Facebook
                    </button>
                </div>
            </Secao>

            <div className="mt-5">
                <Aviso tom="atencao" titulo="Limitação conhecida">
                    Esta tela é a etapa final do OAuth. Sem credenciais Meta configuradas no ambiente, o fluxo não pode
                    ser repetido de ponta a ponta. A V2 mostra apenas o desenho da escolha, sem abrir o Facebook nem
                    inscrever a Página no webhook.
                </Aviso>
            </div>
        </div>
    );
}

SelecionarPagina.layout = [LayoutPreview];
