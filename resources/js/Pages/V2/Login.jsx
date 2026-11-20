import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react';
import LayoutV2 from '@/components/v2/LayoutV2';
import PainelAcesso from '@/components/v2/auth/PainelAcesso';
import { Aviso, Campo, CampoSenha } from '@/components/v2/pecas';

export default function Login() {
    const pagina = usePage();
    const mensagem = pagina.props.flash?.mensagem;
    const cadastroPublico = pagina.props.flash?.cadastro_publico === true;
    const form = useForm({ email: '', password: '', lembrar: false });

    const entrar = (evento) => {
        evento.preventDefault();
        form.post('/login');
    };

    return (
        <div className="v2-auth">
            <PainelAcesso
                frase="A conversa começa no anúncio e continua no atendimento."
                itens={[
                    'Fluxos com pausas, mídia e ramificação por horário.',
                    'Origem de cada contato preservada a partir do anúncio.',
                    'Uma caixa de atendimento com histórico incremental.',
                ]}
                rodape={
                    <>
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                        Cada conta vê apenas as suas próprias conversas.
                    </>
                }
                rodapeComIcone
            />

            <div className="v2-auth__formulario">
                <div className="v2-auth__cartao">
                    <h1 className="text-xl font-semibold tracking-[-0.02em]">Entrar</h1>
                    <p className="mt-1 text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                        Acesse a sua conta para continuar no espaço de atendimento.
                    </p>

                    {mensagem && (
                        <div className="mt-4">
                            <Aviso tom="info">{mensagem}</Aviso>
                        </div>
                    )}

                    <form onSubmit={entrar} className="mt-5 space-y-3">
                        <Campo rotulo="Email" htmlFor="login-email" erro={form.errors.email}>
                            <input
                                id="login-email"
                                type="email"
                                className="v2-entrada"
                                value={form.data.email}
                                onChange={(evento) => {
                                    form.setData('email', evento.target.value);
                                    form.clearErrors('email');
                                }}
                                autoComplete="email"
                                autoFocus
                                aria-invalid={Boolean(form.errors.email)}
                            />
                        </Campo>

                        <CampoSenha
                            id="login-senha"
                            valor={form.data.password}
                            aoAlterar={(valor) => {
                                form.setData('password', valor);
                                form.clearErrors('password');
                            }}
                            erro={form.errors.password}
                            autoComplete="current-password"
                        />

                        <label className="v2-interruptor text-[var(--v2-ink-2)]">
                            <input
                                type="checkbox"
                                checked={form.data.lembrar}
                                onChange={(evento) => form.setData('lembrar', evento.target.checked)}
                            />
                            Manter sessão aberta neste navegador
                        </label>

                        <button type="submit" className="v2-btn v2-btn--primario v2-btn--bloco" disabled={form.processing}>
                            {form.processing ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                            {form.processing ? 'Entrando…' : 'Entrar'}
                            {!form.processing && <ArrowRight aria-hidden="true" />}
                        </button>
                    </form>

                    {cadastroPublico && (
                        <p className="mt-4 text-[0.75rem] text-[var(--v2-ink-2)]">
                            Ainda não tem conta?{' '}
                            <Link href="/cadastro" className="v2-auth__link">Criar conta</Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

Login.layout = [LayoutV2, { semNavegacao: true }];
