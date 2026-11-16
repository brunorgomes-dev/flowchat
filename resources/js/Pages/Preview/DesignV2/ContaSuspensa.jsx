import { Link } from '@inertiajs/react';
import { Ban, LifeBuoy, LogIn, MessagesSquare } from 'lucide-react';
import LayoutPreview from './_components/LayoutPreview';
import { Aviso, Chip, Secao, SeloDemo } from './_components/pecas';

export default function ContaSuspensa() {
    return (
        <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl items-center px-4 py-8">
            <div className="w-full">
                <div className="border border-[var(--v2-line-forte)] bg-[var(--v2-surface)]">
                    <div className="flex items-start gap-3 border-b border-[var(--v2-line)] p-4">
                        <span className="v2-anexo__icone" style={{ width: '2.5rem', height: '2.5rem' }}>
                            <Ban className="size-5 text-[var(--v2-perigo)]" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-lg font-semibold tracking-[-0.02em]">Conta suspensa</h1>
                                <Chip tom="erro">Acesso pausado</Chip>
                                <SeloDemo />
                            </div>
                            <p className="mt-1 text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                                O acesso desta conta ao FlowChat está temporariamente suspenso pelo administrador da
                                plataforma. As conversas, fluxos e mídias continuam preservados.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 p-4">
                        <dl className="v2-dados">
                            <div>
                                <dt>Sessões</dt>
                                <dd>Encerradas automaticamente</dd>
                            </div>
                            <div>
                                <dt>Automações</dt>
                                <dd>Não iniciam enquanto a conta estiver suspensa</dd>
                            </div>
                            <div>
                                <dt>Dados</dt>
                                <dd>Preservados e disponíveis após a reativação</dd>
                            </div>
                        </dl>

                        <Aviso tom="atencao" titulo="Como resolver">
                            Fale com o administrador responsável pelo seu acesso ao FlowChat para revisar a suspensão. A
                            reativação é feita no painel administrativo e libera o login imediatamente.
                        </Aviso>

                        <div className="flex flex-wrap gap-2">
                            <Link href="/preview/design-v2/entrar" className="v2-btn v2-btn--contorno">
                                <LogIn aria-hidden="true" />
                                Ir para o login
                            </Link>
                            <span className="v2-btn v2-btn--fantasma" aria-disabled="true">
                                <LifeBuoy aria-hidden="true" />
                                Falar com o administrador
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                    <span className="v2-anexo__icone">
                        <MessagesSquare className="size-3.5" aria-hidden="true" />
                    </span>
                    <p className="v2-micro">
                        Página pública <code className="v2-mono">/conta-suspensa</code> · versão de demonstração, sem
                        sessão real.
                    </p>
                </div>

                <Secao id="conta-suspensa-nota" titulo="Observação do preview">
                    <p className="text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                        A página real é pública e responde mesmo sem sessão. Aqui ela é exibida dentro da área de preview
                        autenticada apenas para comparação visual, sem substituir a rota original.
                    </p>
                </Secao>
            </div>
        </div>
    );
}

ContaSuspensa.layout = [LayoutPreview, { semNavegacao: true }];
