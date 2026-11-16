import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowRight, Check, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { SimboloFlowChat } from '@/components/MarcaFlowChat';
import LayoutPreview from './_components/LayoutPreview';
import { Aviso, Campo, CampoSenha, Chip, SeloDemo } from './_components/pecas';

const EMAIL_CONVITE = 'convite.aurora@exemplo.invalid';

export default function Cadastro() {
    const [nome, setNome] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmacao, setConfirmacao] = useState('');
    const [erros, setErros] = useState({});

    const requisitos = [
        { rotulo: 'Pelo menos 8 caracteres', cumprido: senha.length >= 8 },
        { rotulo: 'Uma letra e um número', cumprido: /[A-Za-z]/.test(senha) && /\d/.test(senha) },
        { rotulo: 'As duas senhas coincidem', cumprido: senha.length > 0 && senha === confirmacao },
    ];

    const registrar = (evento) => {
        evento.preventDefault();
        const novosErros = {};

        if (!nome.trim() || nome.trim().length < 3) {
            novosErros.nome = 'Informe o seu nome completo.';
        }

        if (senha.length < 8) {
            novosErros.senha = 'A senha precisa ter pelo menos 8 caracteres.';
        }

        if (senha !== confirmacao) {
            novosErros.confirmacao = 'As senhas não coincidem.';
        }

        setErros(novosErros);

        if (Object.keys(novosErros).length > 0) {
            return;
        }

        toast.success('Cadastro simulado', {
            description: 'Nenhuma conta, convite ou sessão foi criada.',
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
                    <p className="v2-auth__frase">Um convite, uma conta isolada, o seu atendimento.</p>
                    <ul className="v2-auth__lista mt-5">
                        <li>
                            <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--v2-areia)]" aria-hidden="true" />
                            O email do convite não pode ser trocado no aceite.
                        </li>
                        <li>
                            <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--v2-areia)]" aria-hidden="true" />
                            Cada conta recebe um espaço isolado de conversas e fluxos.
                        </li>
                        <li>
                            <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--v2-areia)]" aria-hidden="true" />
                            O fuso é confirmado logo depois do cadastro.
                        </li>
                    </ul>
                </div>

                <p className="text-[0.6875rem] text-[var(--v2-rail-ink-2)]">
                    Cadastro público desativado por padrão; o acesso acontece por convite.
                </p>
            </div>

            <div className="v2-auth__formulario">
                <div className="v2-auth__cartao">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <h1 className="text-xl font-semibold tracking-[-0.02em]">Aceitar convite</h1>
                        <SeloDemo />
                    </div>
                    <p className="text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                        Crie sua conta FlowChat para aceitar o convite. O email vem do convite e não é editável.
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Chip tom="marca">
                            <Ticket className="size-3" aria-hidden="true" />
                            Convite válido até 19/11/2026
                        </Chip>
                        <Chip>Uso único</Chip>
                    </div>

                    <form onSubmit={registrar} noValidate className="mt-4 space-y-3">
                        <Campo rotulo="Nome" htmlFor="cadastro-nome" erro={erros.nome}>
                            <input
                                id="cadastro-nome"
                                className="v2-entrada"
                                value={nome}
                                onChange={(evento) => {
                                    setNome(evento.target.value);
                                    setErros((atuais) => ({ ...atuais, nome: null }));
                                }}
                                autoComplete="name"
                                aria-invalid={Boolean(erros.nome)}
                                autoFocus
                            />
                        </Campo>

                        <Campo rotulo="Email do convite" htmlFor="cadastro-email" ajuda="Definido pelo administrador; não pode ser alterado.">
                            <input id="cadastro-email" className="v2-entrada" value={EMAIL_CONVITE} readOnly />
                        </Campo>

                        <CampoSenha
                            id="cadastro-senha"
                            valor={senha}
                            aoAlterar={(valor) => {
                                setSenha(valor);
                                setErros((atuais) => ({ ...atuais, senha: null }));
                            }}
                            erro={erros.senha}
                            autoComplete="new-password"
                            ajuda="Mínimo de 8 caracteres, com letras e números."
                        />

                        <CampoSenha
                            id="cadastro-confirmacao"
                            rotulo="Confirmar senha"
                            valor={confirmacao}
                            aoAlterar={(valor) => {
                                setConfirmacao(valor);
                                setErros((atuais) => ({ ...atuais, confirmacao: null }));
                            }}
                            erro={erros.confirmacao}
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

                        <button type="submit" className="v2-btn v2-btn--primario v2-btn--bloco">
                            Criar conta e aceitar
                            <ArrowRight aria-hidden="true" />
                        </button>
                    </form>

                    <p className="mt-4 text-[0.75rem] text-[var(--v2-ink-2)]">
                        Já tem conta?{' '}
                        <Link href="/preview/design-v2/entrar" className="v2-auth__link">
                            Entrar
                        </Link>
                    </p>

                    <div className="mt-5">
                        <Aviso tom="info">
                            O cadastro público real está desativado e responde 404. Este formulário ilustra apenas o
                            aceite de convite; nenhum usuário ou conta é criado.
                        </Aviso>
                    </div>
                </div>
            </div>
        </div>
    );
}

Cadastro.layout = [LayoutPreview, { semNavegacao: true }];
