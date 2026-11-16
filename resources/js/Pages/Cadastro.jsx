import { Link, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CampoSenha } from '@/components/CampoSenha';
import { MarcaFlowChat } from '@/components/MarcaFlowChat';

// Página pública: dispensa o layout da aplicação (sidebar)
Cadastro.layout = false;

export default function Cadastro() {
    const { convite, urlCadastro } = usePage().props;
    const form = useForm({
        name: '',
        email: convite?.email ?? '',
        password: '',
        password_confirmation: '',
    });

    const registrar = (evento) => {
        evento.preventDefault();
        form.post(urlCadastro ?? '/cadastro');
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
                    <h1 className="text-base font-semibold text-foreground">{convite ? 'Aceitar convite' : 'Criar conta'}</h1>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{convite ? 'Crie sua conta FlowChat para aceitar o convite.' : 'Registre a sua conta para entrar no espaço de atendimento.'}</p>

                    <form onSubmit={registrar} className="mt-5 space-y-4">
                        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                            Nome
                            <Input
                                value={form.data.name}
                                onChange={(evento) => {
                                    form.setData('name', evento.target.value);
                                    form.clearErrors('name');
                                }}
                                autoComplete="name"
                                autoFocus
                                aria-invalid={Boolean(form.errors.name)}
                                className="h-10 bg-background text-sm text-foreground"
                            />
                            {form.errors.name && <span role="alert" className="text-xs text-destructive">{form.errors.name}</span>}
                        </label>

                        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                            Email
                            <Input
                                type="email"
                                value={form.data.email}
                                readOnly={Boolean(convite)}
                                onChange={(evento) => {
                                    form.setData('email', evento.target.value);
                                    form.clearErrors('email');
                                }}
                                autoComplete="email"
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
                                autoComplete="new-password"
                                aria-invalid={Boolean(form.errors.password)}
                                className="h-10 bg-background text-sm text-foreground"
                            />
                            {form.errors.password && <span role="alert" className="text-xs text-destructive">{form.errors.password}</span>}
                        </label>

                        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                            Confirmar senha
                            <CampoSenha
                                value={form.data.password_confirmation}
                                onChange={(evento) => {
                                    form.setData('password_confirmation', evento.target.value);
                                    form.clearErrors('password');
                                }}
                                autoComplete="new-password"
                                aria-invalid={Boolean(form.errors.password)}
                                className="h-10 bg-background text-sm text-foreground"
                            />
                            {form.errors.password && <span role="alert" className="text-xs text-destructive">{form.errors.password}</span>}
                        </label>

                        <Button type="submit" disabled={form.processing} className="h-10 w-full">
                            {form.processing && <LoaderCircle className="animate-spin" />}
                            {form.processing ? 'Criando conta…' : 'Criar conta'}
                        </Button>
                    </form>
                </section>

                <p className="mt-5 text-center text-xs text-muted-foreground">
                    Já tem conta?{' '}
                    <Link href="/login" className="font-medium text-terracota-escuro underline-offset-4 hover:underline dark:text-terracota">
                        Entrar
                    </Link>
                </p>
            </div>
        </div>
    );
}
