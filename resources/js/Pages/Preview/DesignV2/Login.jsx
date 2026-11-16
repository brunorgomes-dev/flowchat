import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SimboloFlowChat } from '@/components/MarcaFlowChat';
import LayoutPreview from './_components/LayoutPreview';
import { Aviso, Campo, CampoSenha, SeloDemo } from './_components/pecas';
import { operador } from './_data/demonstracao';

export default function Login() {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [lembrar, setLembrar] = useState(false);
    const [erros, setErros] = useState({});

    const entrar = (evento) => {
        evento.preventDefault();
        const novosErros = {};

        if (!email.trim()) {
            novosErros.email = 'Informe o email da sua conta.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
            novosErros.email = 'Informe um email válido.';
        }

        if (!senha) {
            novosErros.senha = 'Informe a sua senha.';
        }

        setErros(novosErros);

        if (Object.keys(novosErros).length > 0) {
            return;
        }

        toast.success('Login simulado', {
            description: 'Nenhuma sessão foi criada e nenhuma credencial foi enviada.',
        });
    };

    return (
        <div className="v2-auth">
            <div className="v2-auth__marca">
                <div className="flex items-center gap-2.5">
                    <span className="v2-rail__marca-simbolo">
                        <SimboloFlowChat className="size-4" />
                    </span>
                    <div>
                        <p className="text-[0.9375rem] font-semibold">FlowChat</p>
                        <p className="text-[0.6875rem] text-[var(--v2-rail-ink-2)]">Automação de conversas no Messenger</p>
                    </div>
                </div>

                <div>
                    <p className="v2-auth__frase">A conversa começa no anúncio e continua no atendimento.</p>
                    <ul className="v2-auth__lista mt-5">
                        <li>
                            <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--v2-areia)]" aria-hidden="true" />
                            Fluxos com pausas, mídia e ramificação por horário.
                        </li>
                        <li>
                            <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--v2-areia)]" aria-hidden="true" />
                            Origem de cada contato preservada a partir do anúncio.
                        </li>
                        <li>
                            <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--v2-areia)]" aria-hidden="true" />
                            Uma caixa de atendimento com histórico incremental.
                        </li>
                    </ul>
                </div>

                <p className="flex items-center gap-2 text-[0.6875rem] text-[var(--v2-rail-ink-2)]">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    Cada conta vê apenas as suas próprias conversas.
                </p>
            </div>

            <div className="v2-auth__formulario">
                <div className="v2-auth__cartao">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h1 className="text-xl font-semibold tracking-[-0.02em]">Entrar</h1>
                        <SeloDemo />
                    </div>
                    <p className="text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                        Acesse a sua conta para continuar no espaço de atendimento.
                    </p>

                    <form onSubmit={entrar} noValidate className="mt-5 space-y-3">
                        <Campo rotulo="Email" htmlFor="login-email" erro={erros.email}>
                            <input
                                id="login-email"
                                type="email"
                                className="v2-entrada"
                                value={email}
                                onChange={(evento) => {
                                    setEmail(evento.target.value);
                                    setErros((atuais) => ({ ...atuais, email: null }));
                                }}
                                autoComplete="email"
                                aria-invalid={Boolean(erros.email)}
                                placeholder="voce@exemplo.invalid"
                                autoFocus
                            />
                        </Campo>

                        <CampoSenha
                            id="login-senha"
                            valor={senha}
                            aoAlterar={(valor) => {
                                setSenha(valor);
                                setErros((atuais) => ({ ...atuais, senha: null }));
                            }}
                            erro={erros.senha}
                            autoComplete="current-password"
                        />

                        <label className="v2-interruptor text-[var(--v2-ink-2)]">
                            <input
                                type="checkbox"
                                checked={lembrar}
                                onChange={(evento) => setLembrar(evento.target.checked)}
                            />
                            Manter sessão aberta neste navegador
                        </label>

                        <button type="submit" className="v2-btn v2-btn--primario v2-btn--bloco">
                            Entrar
                            <ArrowRight aria-hidden="true" />
                        </button>
                    </form>

                    <div className="mt-4 space-y-2 text-[0.75rem] text-[var(--v2-ink-2)]">
                        <p>
                            Ainda não tem conta?{' '}
                            <Link href="/preview/design-v2/cadastro" className="v2-auth__link">
                                Aceitar um convite
                            </Link>
                        </p>
                        <p>
                            Limite de duas sessões simultâneas ·{' '}
                            <Link href="/preview/design-v2/sessoes" className="v2-auth__link">
                                ver estado de limite
                            </Link>
                        </p>
                    </div>

                    <div className="mt-5">
                        <Aviso tom="info">
                            Esta é a página de login redesenhada dentro do preview. A tela pública real continua em
                            `/login` e não foi alterada. Operador ilustrativo: {operador.email}.
                        </Aviso>
                    </div>
                </div>
            </div>
        </div>
    );
}

Login.layout = [LayoutPreview, { semNavegacao: true }];
