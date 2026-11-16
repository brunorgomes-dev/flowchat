import { router } from '@inertiajs/react';
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

SessoesLogin.layout = false;

export default function SessoesLogin({ sessoes = [] }) {
    const substituir = (id) => router.post(`/login/sessoes/${encodeURIComponent(id)}/substituir`);

    return (
        <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
            <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
                <h1 className="text-lg font-semibold">Limite de sessões atingido</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Esta conta permite até duas sessões simultâneas. Para entrar neste dispositivo, escolha uma sessão para encerrar.
                </p>

                <div className="mt-5 space-y-3">
                    {sessoes.map((sessao) => (
                        <article key={sessao.id} className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                            <div className="flex min-w-0 items-start gap-3">
                                <Monitor className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">{sessao.dispositivo}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{sessao.ip || 'IP desconhecido'} · {sessao.ultimo_acesso}</p>
                                </div>
                            </div>
                            <Button type="button" variant="outline" onClick={() => substituir(sessao.id)} className="shrink-0">
                                Encerrar e entrar
                            </Button>
                        </article>
                    ))}
                    {sessoes.length === 0 && <p className="text-sm text-muted-foreground">As sessões anteriores já expiraram. Tente entrar novamente.</p>}
                </div>

                <Button type="button" variant="ghost" onClick={() => router.post('/login/sessoes/cancelar')} className="mt-5 w-full">
                    Cancelar login
                </Button>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">Se não reconhecer uma sessão, encerre-a e altere a senha da conta.</p>
            </section>
        </div>
    );
}
