import { Link, useForm } from '@inertiajs/react';
import { ArrowRight, Check, LoaderCircle, Ticket } from 'lucide-react';
import LayoutV2 from '@/components/v2/LayoutV2';
import PainelAcesso from '@/components/v2/auth/PainelAcesso';
import { Aviso, Campo, CampoSenha, Chip } from '@/components/v2/pecas';

export default function Cadastro({ convite = null, urlCadastro = null }) {
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

    const requisitos = [
        { rotulo: 'Pelo menos 8 caracteres', cumprido: form.data.password.length >= 8 },
        {
            rotulo: 'Uma letra e um número',
            cumprido: /[A-Za-z]/.test(form.data.password) && /\d/.test(form.data.password),
        },
        {
            rotulo: 'As duas senhas coincidem',
            cumprido: form.data.password.length > 0 && form.data.password === form.data.password_confirmation,
        },
    ];

    return (
        <div className="v2-auth">
            <PainelAcesso
                frase="Um convite, uma conta isolada, o seu atendimento."
                itens={[
                    'O email do convite não pode ser trocado no aceite.',
                    'Cada conta recebe um espaço isolado de conversas e fluxos.',
                    'O fuso é confirmado logo depois do cadastro.',
                ]}
                rodape="Cadastro público desativado por padrão; o acesso acontece por convite."
            />

            <div className="v2-auth__formulario">
                <div className="v2-auth__cartao">
                    <h1 className="text-xl font-semibold tracking-[-0.02em]">{convite ? 'Aceitar convite' : 'Criar conta'}</h1>
                    <p className="mt-1 text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                        {convite
                            ? 'Crie sua conta FlowChat para aceitar o convite.'
                            : 'Registre a sua conta para entrar no espaço de atendimento.'}
                    </p>

                    {convite && (
                        <div className="mt-3">
                            <Chip tom="marca">
                                <Ticket className="size-3" aria-hidden="true" />
                                Convite por email
                            </Chip>
                        </div>
                    )}

                    <form onSubmit={registrar} className="mt-4 space-y-3">
                        <Campo rotulo="Nome" htmlFor="cadastro-nome" erro={form.errors.name}>
                            <input
                                id="cadastro-nome"
                                className="v2-entrada"
                                value={form.data.name}
                                onChange={(evento) => {
                                    form.setData('name', evento.target.value);
                                    form.clearErrors('name');
                                }}
                                autoComplete="name"
                                aria-invalid={Boolean(form.errors.name)}
                                autoFocus
                            />
                        </Campo>

                        <Campo
                            rotulo="Email"
                            htmlFor="cadastro-email"
                            erro={form.errors.email}
                            ajuda={convite ? 'Definido pelo administrador; não pode ser alterado.' : undefined}
                        >
                            <input
                                id="cadastro-email"
                                type="email"
                                className="v2-entrada"
                                value={form.data.email}
                                readOnly={Boolean(convite)}
                                onChange={(evento) => {
                                    form.setData('email', evento.target.value);
                                    form.clearErrors('email');
                                }}
                                autoComplete="email"
                                aria-invalid={Boolean(form.errors.email)}
                            />
                        </Campo>

                        <CampoSenha
                            id="cadastro-senha"
                            valor={form.data.password}
                            aoAlterar={(valor) => {
                                form.setData('password', valor);
                                form.clearErrors('password');
                            }}
                            erro={form.errors.password}
                            autoComplete="new-password"
                            ajuda="Mínimo de 8 caracteres, com letras e números."
                        />

                        <CampoSenha
                            id="cadastro-confirmacao"
                            rotulo="Confirmar senha"
                            valor={form.data.password_confirmation}
                            aoAlterar={(valor) => {
                                form.setData('password_confirmation', valor);
                                form.clearErrors('password');
                            }}
                            autoComplete="new-password"
                        />

                        <ul className="space-y-1">
                            {requisitos.map((requisito) => (
                                <li
                                    key={requisito.rotulo}
                                    className="flex items-center gap-1.5 text-[0.6875rem]"
                                    style={{ color: requisito.cumprido ? 'var(--v2-verde)' : 'var(--v2-ink-3)' }}
                                >
                                    <Check className="size-3" aria-hidden="true" />
                                    {requisito.rotulo}
                                    <span className="v2-oculto-visual">{requisito.cumprido ? 'cumprido' : 'pendente'}</span>
                                </li>
                            ))}
                        </ul>

                        <button type="submit" className="v2-btn v2-btn--primario v2-btn--bloco" disabled={form.processing}>
                            {form.processing ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                            {form.processing ? 'Criando conta…' : convite ? 'Criar conta e aceitar' : 'Criar conta'}
                            {!form.processing && <ArrowRight aria-hidden="true" />}
                        </button>
                    </form>

                    <p className="mt-4 text-[0.75rem] text-[var(--v2-ink-2)]">
                        Já tem conta? <Link href="/login" className="v2-auth__link">Entrar</Link>
                    </p>

                    {!convite && (
                        <div className="mt-4">
                            <Aviso tom="info">
                                O cadastro público é controlado pela configuração do ambiente. Contas novas normalmente
                                entram por convite.
                            </Aviso>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

Cadastro.layout = [LayoutV2, { semNavegacao: true }];
