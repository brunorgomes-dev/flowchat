import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Link2, Plug, ShieldAlert, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import LayoutPreview from './_components/LayoutPreview';
import {
    Aviso,
    CabecalhoPagina,
    Campo,
    CampoSenha,
    Chip,
    Dialogo,
    Secao,
    SeloDemo,
    SeloLeitura,
} from './_components/pecas';
import { operacao } from './_data/demonstracao';

export default function Conexao() {
    const [conectado, setConectado] = useState(operacao.messenger.conectado);
    const [dialogoDesconectar, setDialogoDesconectar] = useState(false);
    const [pageId, setPageId] = useState('DEMO-PAGINA-0001');
    const [token, setToken] = useState('');

    return (
        <div className="v2-conteudo v2-conteudo--estreito">
            <CabecalhoPagina
                titulo="Conexão"
                descricao="Página do Facebook Messenger usada por esta conta. Uma Página por conta; o token nunca é devolvido à interface."
                nota={
                    <div className="flex flex-wrap items-center gap-2">
                        <SeloLeitura />
                        <SeloDemo />
                    </div>
                }
                acoes={
                    <Link href="/preview/design-v2/configuracoes" className="v2-btn v2-btn--contorno">
                        <ArrowLeft aria-hidden="true" />
                        Configurações
                    </Link>
                }
            />

            <Secao id="conexao-status" titulo="Status da Página">
                <div className="v2-painel">
                    <div className="v2-painel__cabecalho">
                        <div className="flex items-center gap-2">
                            <span className="v2-anexo__icone">
                                <Plug className="size-3.5" aria-hidden="true" />
                            </span>
                            <div>
                                <p className="text-[0.8125rem] font-medium">
                                    {conectado ? operacao.messenger.pagina : 'Nenhuma Página conectada'}
                                </p>
                                <p className="v2-micro v2-mono">
                                    {conectado ? `Page ID ${operacao.messenger.pageId}` : 'Aguardando conexão'}
                                </p>
                            </div>
                        </div>
                        <Chip tom={conectado ? 'positivo' : 'atencao'}>
                            {conectado ? 'Conectado' : 'Desconectada'}
                        </Chip>
                    </div>

                    <div className="v2-painel__corpo space-y-3">
                        <dl className="v2-dados">
                            <div>
                                <dt>Webhook</dt>
                                <dd>{conectado ? 'Inscrição ativa para messages, postbacks e referrals' : 'Sem inscrição'}</dd>
                            </div>
                            <div>
                                <dt>Token da Página</dt>
                                <dd>{conectado ? 'Armazenado e criptografado' : 'Não configurado'}</dd>
                            </div>
                            <div>
                                <dt>URL de retorno OAuth</dt>
                                <dd className="v2-mono">https://exemplo.invalid/configuracoes/messenger/retorno</dd>
                            </div>
                            <div>
                                <dt>OAuth do Facebook</dt>
                                <dd><Chip tom="atencao">Indisponível neste ambiente</Chip></dd>
                            </div>
                        </dl>

                        <Aviso tom="atencao" titulo="OAuth depende das credenciais do aplicativo Meta">
                            O botão “Conectar com Facebook” só aparece quando{' '}
                            <code className="v2-mono">MESSENGER_APP_ID</code> e{' '}
                            <code className="v2-mono">MESSENGER_APP_SECRET</code> estão configurados. O preview mantém o
                            estado visível e não abre o fluxo OAuth.
                        </Aviso>

                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="v2-btn v2-btn--primario" aria-disabled="true">
                                <Link2 aria-hidden="true" />
                                {conectado ? 'Alterar Página conectada' : 'Conectar com Facebook'}
                            </button>
                            {conectado && (
                                <button type="button" className="v2-btn v2-btn--perigo" onClick={() => setDialogoDesconectar(true)}>
                                    <Unplug aria-hidden="true" />
                                    Desconectar
                                </button>
                            )}
                            <Link href="/preview/design-v2/messenger/paginas" className="v2-btn v2-btn--contorno">
                                Ver escolha de Página
                            </Link>
                        </div>
                    </div>
                </div>
            </Secao>

            <Secao
                id="conexao-manual"
                titulo="Configuração manual temporária"
                nota="Use apenas enquanto o OAuth do aplicativo Meta não estiver configurado no ambiente."
            >
                <form
                    className="v2-painel v2-painel__corpo max-w-xl space-y-3"
                    onSubmit={(evento) => {
                        evento.preventDefault();
                        toast.success('Integração simulada', {
                            description: 'O page_id e o token não foram enviados nem gravados.',
                        });
                    }}
                >
                    <Campo rotulo="ID da Página do Facebook" htmlFor="messenger-page-id">
                        <input
                            id="messenger-page-id"
                            className="v2-entrada v2-mono"
                            value={pageId}
                            onChange={(evento) => setPageId(evento.target.value)}
                            autoComplete="off"
                        />
                    </Campo>
                    <CampoSenha
                        id="messenger-token"
                        rotulo="Token de acesso da Página"
                        valor={token}
                        aoAlterar={setToken}
                        autoComplete="new-password"
                        placeholder="Cole o token da Página"
                        ajuda="O token é criptografado no banco e nunca é devolvido à interface."
                    />
                    <p className="v2-campo__ajuda flex items-start gap-1.5">
                        <ShieldAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                        A conexão manual não passa pelo OAuth e não inscreve a Página no webhook automaticamente.
                    </p>
                    <button type="submit" className="v2-btn v2-btn--contorno">
                        Salvar integração manual
                    </button>
                </form>
            </Secao>

            <Dialogo
                aberto={dialogoDesconectar}
                titulo="Desconectar a Página?"
                descricao="Na interface real, o FlowChat deixa de receber e enviar mensagens por esta Página até uma nova conexão. Os dados são preservados."
                icone={Unplug}
                aoFechar={() => setDialogoDesconectar(false)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setDialogoDesconectar(false)}>
                            Manter conectada
                        </button>
                        <button
                            type="button"
                            className="v2-btn v2-btn--perigo"
                            onClick={() => {
                                setConectado(false);
                                setDialogoDesconectar(false);
                                toast.success('Desconexão simulada', {
                                    description: 'A integração real não foi alterada.',
                                });
                            }}
                        >
                            Desconectar
                        </button>
                    </>
                }
            >
                <Aviso tom="atencao" titulo="Efeito da desconexão">
                    As automações param de iniciar e nenhuma mensagem é enviada. O histórico e as mídias continuam
                    armazenados; a Página pode ser reconectada depois.
                </Aviso>
            </Dialogo>
        </div>
    );
}

Conexao.layout = [LayoutPreview];
