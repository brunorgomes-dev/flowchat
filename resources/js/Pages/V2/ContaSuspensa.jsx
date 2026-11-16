import { Ban, LifeBuoy, LogIn } from 'lucide-react';
import LayoutV2 from '@/components/v2/LayoutV2';
import { MarcaFlowChat } from '@/components/MarcaFlowChat';
import { Aviso, Chip } from '@/components/v2/pecas';

export default function ContaSuspensa() {
    return (
        <div className="mx-auto flex min-h-[80dvh] w-full max-w-2xl items-center px-4 py-8">
            <div className="w-full">
                <div className="mb-5 flex items-center gap-2.5">
                    <MarcaFlowChat tamanho="md" />
                    <span>
                        <span className="block text-[0.9375rem] font-semibold">FlowChat</span>
                        <span className="block text-[0.6875rem] text-[var(--v2-ink-2)]">Atendimento</span>
                    </span>
                </div>

                <div className="border border-[var(--v2-line-forte)] bg-[var(--v2-surface)]">
                    <div className="flex items-start gap-3 border-b border-[var(--v2-line)] p-4">
                        <span className="v2-anexo__icone" style={{ width: '2.5rem', height: '2.5rem' }}>
                            <Ban className="size-5 text-[var(--v2-perigo)]" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-lg font-semibold tracking-[-0.02em]">Conta suspensa</h1>
                                <Chip tom="erro">Acesso pausado</Chip>
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
                            <a href="/login" className="v2-btn v2-btn--contorno">
                                <LogIn aria-hidden="true" />
                                Ir para o login
                            </a>
                            <span className="v2-btn v2-btn--fantasma" aria-disabled="true">
                                <LifeBuoy aria-hidden="true" />
                                Falar com o administrador
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

ContaSuspensa.layout = [LayoutV2, { semNavegacao: true }];
