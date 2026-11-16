import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import LayoutPreview from './_components/LayoutPreview';
import { Aviso, Chip, SeloDemo } from './_components/pecas';
import { sessoes } from './_data/demonstracao';

export default function SessoesLogin() {
    const [encerrada, setEncerrada] = useState(null);

    return (
        <div className="mx-auto flex min-h-[70dvh] w-full max-w-xl items-center px-4 py-8">
            <section className="w-full border border-[var(--v2-line-forte)] bg-[var(--v2-surface)]">
                <div className="flex items-start justify-between gap-3 border-b border-[var(--v2-line)] p-4">
                    <div>
                        <h1 className="text-lg font-semibold tracking-[-0.02em]">Limite de sessões atingido</h1>
                        <p className="mt-1 text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                            Esta conta permite até duas sessões simultâneas. Para entrar neste dispositivo, escolha uma
                            sessão para encerrar.
                        </p>
                    </div>
                    <SeloDemo />
                </div>

                <div className="space-y-2 p-4">
                    {sessoes.map((sessao) => {
                        const encerrando = encerrada === sessao.id;

                        return (
                            <article key={sessao.id} className="flex items-center justify-between gap-3 border border-[var(--v2-line)] p-3">
                                <div className="flex min-w-0 items-start gap-2.5">
                                    <Monitor className="mt-0.5 size-4 shrink-0 text-[var(--v2-ink-2)]" aria-hidden="true" />
                                    <div className="min-w-0">
                                        <p className="truncate text-[0.8125rem] font-medium">{sessao.dispositivo}</p>
                                        <p className="v2-micro v2-numerico">
                                            {sessao.ip} · {sessao.ultimoAcesso}
                                        </p>
                                        {sessao.atual && (
                                            <span className="mt-1 inline-flex">
                                                <Chip tom="positivo">Sessão atual</Chip>
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="v2-btn v2-btn--contorno v2-btn--pequeno shrink-0"
                                    onClick={() => {
                                        setEncerrada(sessao.id);
                                        toast.success('Sessão encerrada (simulação)', {
                                            description: 'Nenhuma sessão real foi invalidada.',
                                        });
                                    }}
                                    disabled={encerrando}
                                >
                                    {encerrando ? 'Encerrada' : 'Encerrar e entrar'}
                                </button>
                            </article>
                        );
                    })}

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
                        onClick={() => toast.info('Login simulado como cancelado')}
                    >
                        <ArrowLeft aria-hidden="true" />
                        Cancelar login
                    </button>
                    <p className="v2-micro text-center">
                        Se não reconhecer uma sessão, encerre-a e altere a senha da conta.
                    </p>
                </div>
            </section>

            <div className="mt-4 w-full">
                <Aviso tom="info">
                    Estado de interface da mesma página pública <code className="v2-mono">/login/sessoes</code>. Os
                    dispositivos são fictícios e nenhuma sessão de navegador é tocada.{' '}
                    <Link href="/preview/design-v2/entrar" className="v2-auth__link">
                        Voltar ao login
                    </Link>
                </Aviso>
            </div>
        </div>
    );
}

SessoesLogin.layout = [LayoutPreview, { semNavegacao: true }];
