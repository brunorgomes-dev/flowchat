import { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft, KeyRound, Link2, Plug, ShieldAlert, Unplug } from 'lucide-react';
import LayoutV2 from '@/components/v2/LayoutV2';
import { Aviso, CabecalhoPagina, Campo, CampoSenha, Chip, Dialogo, Secao } from '@/components/v2/pecas';

export default function Conexao({ messenger = null }) {
    const [dialogoDesconectar, setDialogoDesconectar] = useState(false);
    const [desconectando, setDesconectando] = useState(false);
    const form = useForm({ page_id: messenger?.page_id ?? '', page_access_token: '' });

    const salvarManual = (evento) => {
        evento.preventDefault();
        form.post('/configuracoes/messenger', {
            preserveScroll: true,
            onSuccess: () => form.setData('page_access_token', ''),
        });
    };

    const desconectar = () => {
        setDesconectando(true);
        form.delete('/configuracoes/messenger', {
            preserveScroll: true,
            onFinish: () => {
                setDesconectando(false);
                setDialogoDesconectar(false);
            },
        });
    };

    const conectarPeloFacebook = () => {
        window.location.assign('/configuracoes/messenger/conectar');
    };

    return (
        <div className="v2-conteudo v2-conteudo--estreito">
            <CabecalhoPagina
                titulo="Conexão"
                descricao="Página do Facebook Messenger usada por esta conta. Uma Página por conta; o token nunca é devolvido à interface."
                acoes={
                    <Link href="/configuracoes" className="v2-btn v2-btn--contorno">
                        <ArrowLeft aria-hidden="true" />
                        Configurações
                    </Link>
                }
            />

            {!messenger?.disponivel ? (
                <div className="mt-4">
                    <Aviso tom="atencao" titulo="Estrutura de integração indisponível">
                        O banco atual não tem a tabela de integração Messenger. A conexão fica desabilitada até a
                        migration correspondente ser aplicada pela operação.
                    </Aviso>
                </div>
            ) : (
                <>
                    <Secao id="conexao-status" titulo="Status da Página">
                        <div className="v2-painel">
                            <div className="v2-painel__cabecalho">
                                <div className="flex items-center gap-2">
                                    <span className="v2-anexo__icone">
                                        <Plug className="size-3.5" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <p className="text-[0.8125rem] font-medium">
                                            {messenger.configurado ? 'Página conectada' : 'Nenhuma Página conectada'}
                                        </p>
                                        <p className="v2-micro v2-mono">
                                            {messenger.configurado ? `Page ID ${messenger.page_id}` : 'Aguardando conexão'}
                                        </p>
                                    </div>
                                </div>
                                <Chip tom={messenger.configurado ? 'positivo' : 'atencao'}>
                                    {messenger.configurado ? 'Conectado' : 'Desconectada'}
                                </Chip>
                            </div>

                            <div className="v2-painel__corpo space-y-3">
                                <dl className="v2-dados">
                                    <div>
                                        <dt>Token da Página</dt>
                                        <dd>
                                            <span className="inline-flex items-center gap-1">
                                                <KeyRound className="size-3" aria-hidden="true" />
                                                {messenger.configurado ? 'Armazenado e criptografado' : 'Não configurado'}
                                            </span>
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>OAuth do Facebook</dt>
                                        <dd>
                                            <Chip tom={messenger.oauth_disponivel ? 'positivo' : 'atencao'}>
                                                {messenger.oauth_disponivel ? 'Disponível' : 'Indisponível neste ambiente'}
                                            </Chip>
                                        </dd>
                                    </div>
                                    {messenger.callback_url && (
                                        <div>
                                            <dt>URL de retorno OAuth</dt>
                                            <dd className="v2-mono v2-quebra">{messenger.callback_url}</dd>
                                        </div>
                                    )}
                                </dl>

                                {!messenger.oauth_disponivel && (
                                    <Aviso tom="atencao" titulo="OAuth depende das credenciais do aplicativo Meta">
                                        O botão “Conectar com Facebook” aparece quando <code className="v2-mono">MESSENGER_APP_ID</code>{' '}
                                        e <code className="v2-mono">MESSENGER_APP_SECRET</code> estão configurados no ambiente. A
                                        configuração manual abaixo continua disponível de forma temporária.
                                    </Aviso>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {messenger.oauth_disponivel && (
                                        <button type="button" className="v2-btn v2-btn--primario" onClick={conectarPeloFacebook}>
                                            <Link2 aria-hidden="true" />
                                            {messenger.configurado ? 'Alterar Página conectada' : 'Conectar com Facebook'}
                                        </button>
                                    )}
                                    {messenger.configurado && (
                                        <button type="button" className="v2-btn v2-btn--perigo" onClick={() => setDialogoDesconectar(true)}>
                                            <Unplug aria-hidden="true" />
                                            Desconectar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Secao>

                    <Secao
                        id="conexao-manual"
                        titulo="Configuração manual temporária"
                        nota="Use apenas enquanto o OAuth do aplicativo Meta não estiver configurado no ambiente."
                    >
                        <form onSubmit={salvarManual} className="v2-painel v2-painel__corpo max-w-xl space-y-3">
                            {messenger.configurado && (
                                <p className="v2-micro">Para trocar a Página manualmente, informe um token novo.</p>
                            )}

                            <Campo rotulo="ID da Página do Facebook" htmlFor="messenger-page-id" erro={form.errors.page_id}>
                                <input
                                    id="messenger-page-id"
                                    className="v2-entrada v2-mono"
                                    value={form.data.page_id}
                                    onChange={(evento) => {
                                        form.setData('page_id', evento.target.value);
                                        form.clearErrors('page_id');
                                    }}
                                    autoComplete="off"
                                    aria-invalid={Boolean(form.errors.page_id)}
                                />
                            </Campo>

                            <CampoSenha
                                id="messenger-token"
                                rotulo="Token de acesso da Página"
                                valor={form.data.page_access_token}
                                aoAlterar={(valor) => {
                                    form.setData('page_access_token', valor);
                                    form.clearErrors('page_access_token');
                                }}
                                erro={form.errors.page_access_token}
                                autoComplete="new-password"
                                placeholder={messenger.configurado ? 'Token armazenado com segurança' : 'Cole o token da Página'}
                                ajuda="O token é criptografado no banco e nunca é devolvido à interface."
                            />

                            <p className="v2-campo__ajuda flex items-start gap-1.5">
                                <ShieldAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                                A conexão manual não passa pelo OAuth e não inscreve a Página no webhook automaticamente.
                            </p>

                            <button type="submit" className="v2-btn v2-btn--contorno" disabled={form.processing}>
                                {form.processing ? 'Salvando…' : 'Salvar integração manual'}
                            </button>
                        </form>
                    </Secao>
                </>
            )}

            <Dialogo
                aberto={dialogoDesconectar}
                titulo="Desconectar a Página?"
                descricao="O FlowChat deixa de receber e enviar mensagens por esta Página até uma nova conexão. Os dados são preservados."
                icone={Unplug}
                aoFechar={() => setDialogoDesconectar(false)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setDialogoDesconectar(false)} disabled={desconectando}>
                            Manter conectada
                        </button>
                        <button type="button" className="v2-btn v2-btn--perigo" onClick={desconectar} disabled={desconectando}>
                            {desconectando ? 'Desconectando…' : 'Desconectar'}
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

Conexao.layout = [LayoutV2];
