import { Link, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CampoSenha } from '@/components/CampoSenha';
import { MarcaFlowChat } from '@/components/MarcaFlowChat';

// Página pública: dispensa o layout da aplicação (sidebar)
Login.layout = false;

export default function Login() {
    const propriedades = usePage().props;
    const mensagem = propriedades.flash?.mensagem;
    const cadastroPublico = propriedades.flash?.cadastro_publico === true;
    const form = useForm({ email: '', password: '', lembrar: false });

    const entrar = (evento) => {
        evento.preventDefault();
        form.post('/login');
    };

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10 font-sans text-foreground">
            <div className="w-full max-w-sm">
                <div className="mb-6 flex items-center justify-center gap-3">
                    <MarcaFlowChat tamanho="lg" />
                    <div className="min-w-0">
                        <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">FlowChat</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-terracota-escuro dark:text-muted-foreground">Atendimento</p>
                    </div>
                </div>

                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                    <h1 className="text-base font-semibold text-foreground">Entrar</h1>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Acesse a sua conta para continuar no espaço de atendimento.</p>

                    {mensagem && (
                        <p role="status" className="mt-4 rounded-xl border border-terracota/20 bg-terracota/10 px-3.5 py-2.5 text-xs leading-5 text-terracota-escuro dark:text-foreground">
                            {mensagem}
                        </p>
                    )}

                    <form onSubmit={entrar} className="mt-5 space-y-4">
                        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                            Email
                            <Input
                                type="email"
                                value={form.data.email}
                                onChange={(evento) => {
                                    form.setData('email', evento.target.value);
                                    form.clearErrors('email');
                                }}
                                autoComplete="email"
                                autoFocus
                                aria-invalid={Boolean(form.errors.email)}
                                className="h-10 bg-background text-sm text-foreground"
                            />
                            {form.errors.email && <span role="alert" className="text-xs text-destructive">{form.errors.email}</span>}
                        </label>

                        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                            Senha
                            <CampoSenha
                                value={form.data.password}
                                onChange={(evento) => {
                                    form.setData('password', evento.target.value);
                                    form.clearErrors('password');
                                }}
                                autoComplete="current-password"
                                aria-invalid={Boolean(form.errors.password)}
                                className="h-10 bg-background text-sm text-foreground"
                            />
                            {form.errors.password && <span role="alert" className="text-xs text-destructive">{form.errors.password}</span>}
                        </label>

                        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
                            <input
                                type="checkbox"
                                checked={form.data.lembrar}
                                onChange={(evento) => form.setData('lembrar', evento.target.checked)}
                                className="size-4 rounded border-input accent-terracota"
                            />
                            Manter sessão aberta neste navegador
                        </label>

                        <Button type="submit" disabled={form.processing} className="h-10 w-full">
                            {form.processing && <LoaderCircle className="animate-spin" />}
                            {form.processing ? 'Entrando…' : 'Entrar'}
                        </Button>
                    </form>
                </section>

                {cadastroPublico && (
                    <p className="mt-5 text-center text-xs text-muted-foreground">
                        Ainda não tem conta?{' '}
                        <Link href="/cadastro" className="font-medium text-terracota-escuro underline-offset-4 hover:underline dark:text-terracota">
                            Criar conta
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
}
