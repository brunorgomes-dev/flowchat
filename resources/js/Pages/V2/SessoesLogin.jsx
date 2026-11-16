import { router } from '@inertiajs/react';
import { ArrowLeft, Monitor } from 'lucide-react';
import { useState } from 'react';
import LayoutV2 from '@/components/v2/LayoutV2';
import { Aviso, Chip } from '@/components/v2/pecas';

export default function SessoesLogin({ sessoes = [] }) {
    const [encerrando, setEncerrando] = useState(null);

    const substituir = (id) => {
        setEncerrando(id);
        router.post(`/login/sessoes/${encodeURIComponent(id)}/substituir`, {}, {
            onFinish: () => setEncerrando(null),
        });
    };

    return (
        <div className="mx-auto flex min-h-[70dvh] w-full max-w-xl items-center px-4 py-8">
            <div className="w-full">
                <section className="border border-[var(--v2-line-forte)] bg-[var(--v2-surface)]">
                    <div className="border-b border-[var(--v2-line)] p-4">
                        <h1 className="text-lg font-semibold tracking-[-0.02em]">Limite de sessões atingido</h1>
                        <p className="mt-1 text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                            Esta conta permite até duas sessões simultâneas. Para entrar neste dispositivo, escolha uma
                            sessão para encerrar.
                        </p>
                    </div>

                    <div className="space-y-2 p-4">
                        {sessoes.map((sessao) => (
                            <article key={sessao.id} className="flex items-center justify-between gap-3 border border-[var(--v2-line)] p-3">
                                <div className="flex min-w-0 items-start gap-2.5">
                                    <Monitor className="mt-0.5 size-4 shrink-0 text-[var(--v2-ink-2)]" aria-hidden="true" />
                                    <div className="min-w-0">
                                        <p className="truncate text-[0.8125rem] font-medium">{sessao.dispositivo}</p>
                                        <p className="v2-micro v2-numerico">
                                            {sessao.ip || 'IP desconhecido'} · {sessao.ultimo_acesso}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="v2-btn v2-btn--contorno v2-btn--pequeno shrink-0"
                                    onClick={() => substituir(sessao.id)}
                                    disabled={encerrando !== null}
                                >
                                    {encerrando === sessao.id ? 'Encerrando…' : 'Encerrar e entrar'}
                                </button>
                            </article>
                        ))}

                        {sessoes.length === 0 && (
                            <p className="text-[0.8125rem] text-[var(--v2-ink-2)]">
                                As sessões anteriores já expiraram. Tente entrar novamente.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2 border-t border-[var(--v2-line)] p-4">
                        <button
                            type="button"
                            className="v2-btn v2-btn--fantasma v2-btn--bloco"
                            onClick={() => router.post('/login/sessoes/cancelar')}
                        >
                            <ArrowLeft aria-hidden="true" />
                            Cancelar login
                        </button>
                        <p className="v2-micro text-center">
                            Se não reconhecer uma sessão, encerre-a e altere a senha da conta.
                        </p>
                    </div>
                </section>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Chip>Duas sessões simultâneas</Chip>
                    <Aviso tom="info">A sessão encerrada perde o acesso imediatamente.</Aviso>
                </div>
            </div>
        </div>
    );
}

SessoesLogin.layout = [LayoutV2, { semNavegacao: true }];
