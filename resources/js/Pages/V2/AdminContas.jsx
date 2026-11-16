import { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { RotateCcw, ShieldOff, Users } from 'lucide-react';
import LayoutV2 from '@/components/v2/LayoutV2';
import { Avatar, Aviso, CabecalhoPagina, Campo, Chip, Dialogo, Metrica, Secao, Vazio } from '@/components/v2/pecas';
import { formatarData, formatarDataHora } from '@/components/v2/formato';

export default function AdminContas({ contas = null, administradores = [] }) {
    const lista = contas?.data ?? [];
    const [acao, setAcao] = useState(null);
    const form = useForm({ motivo: '', administrador_responsavel_id: '' });

    const abrir = (conta, tipo) => {
        setAcao({ conta, tipo });
        form.setData({
            motivo: '',
            administrador_responsavel_id: conta.administrador_responsavel?.id ? String(conta.administrador_responsavel.id) : '',
        });
        form.clearErrors();
    };

    const fechar = () => {
        setAcao(null);
        form.reset();
        form.clearErrors();
    };

    const confirmar = (evento) => {
        evento.preventDefault();

        if (!acao) {
            return;
        }

        if (acao.tipo === 'suspender' && !form.data.motivo.trim()) {
            form.setError('motivo', 'Informe o motivo da suspensão.');
            return;
        }

        const url = acao.tipo === 'suspender'
            ? `/admin/contas/${acao.conta.id}/suspender`
            : `/admin/contas/${acao.conta.id}/reativar`;

        form.post(url, {
            preserveScroll: true,
            onSuccess: () => fechar(),
        });
    };

    const ativas = lista.filter((conta) => conta.estado !== 'suspensa').length;
    const suspensas = lista.filter((conta) => conta.estado === 'suspensa').length;

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Contas de clientes"
                descricao="Estado, último acesso e responsável pelo acompanhamento. A suspensão preserva os dados da conta."
                acoes={
                    <Link href="/admin/convites/emitir" className="v2-btn v2-btn--contorno">
                        Ir para convites
                    </Link>
                }
            />

            <div className="v2-metricas mt-4">
                <Metrica rotulo="Contas" valor={contas?.total ?? lista.length} unidade="total" />
                <Metrica rotulo="Nesta página" valor={lista.length} unidade="contas" />
                <Metrica rotulo="Ativas" valor={ativas} unidade="com acesso" />
                <Metrica rotulo="Suspensas" valor={suspensas} unidade="dados preservados" />
            </div>

            <Secao id="admin-contas-lista" titulo="Lista de contas" nota="Somente dados operacionais de acesso; o conteúdo das conversas não aparece aqui.">
                {lista.length === 0 ? (
                    <Vazio
                        icone={Users}
                        titulo="Nenhuma conta cadastrada"
                        texto="As contas aparecem aqui quando forem criadas por convite."
                    />
                ) : (
                    <div className="v2-tabela-area">
                        <table className="v2-tabela v2-tabela--larga">
                            <thead>
                                <tr>
                                    <th scope="col">Conta</th>
                                    <th scope="col">Estado</th>
                                    <th scope="col">Criada em</th>
                                    <th scope="col">Último acesso</th>
                                    <th scope="col">Responsável</th>
                                    <th scope="col"><span className="v2-oculto-visual">Ações</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lista.map((conta) => (
                                    <tr key={conta.id}>
                                        <th scope="row" className="text-left">
                                            <span className="flex items-center gap-2">
                                                <Avatar nome={conta.nome} />
                                                <span className="min-w-0">
                                                    <span className="v2-tabela__principal block">{conta.nome}</span>
                                                    <span className="v2-tabela__secundario">{conta.email ?? 'Sem email vinculado'}</span>
                                                </span>
                                            </span>
                                            {conta.estado === 'suspensa' && conta.motivo_suspensao && (
                                                <span className="v2-tabela__secundario max-w-[22rem]">Motivo: {conta.motivo_suspensao}</span>
                                            )}
                                        </th>
                                        <td>
                                            <Chip tom={conta.estado === 'suspensa' ? 'erro' : 'positivo'}>
                                                {conta.estado === 'suspensa' ? 'Suspensa' : 'Ativa'}
                                            </Chip>
                                        </td>
                                        <td className="v2-numerico text-[var(--v2-ink-2)]">{formatarData(conta.criado_em)}</td>
                                        <td className="v2-numerico text-[var(--v2-ink-2)]">
                                            {conta.ultimo_acesso ? formatarDataHora(conta.ultimo_acesso) : 'Nunca acessou'}
                                        </td>
                                        <td className="text-[var(--v2-ink-2)]">{conta.administrador_responsavel?.name ?? '—'}</td>
                                        <td>
                                            <div className="v2-tabela__acoes">
                                                <button
                                                    type="button"
                                                    className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                                    onClick={() => abrir(conta, conta.estado === 'suspensa' ? 'reativar' : 'suspender')}
                                                >
                                                    {conta.estado === 'suspensa' ? (
                                                        <>
                                                            <RotateCcw aria-hidden="true" />
                                                            Reativar
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShieldOff aria-hidden="true" />
                                                            Suspender
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {(contas?.last_page ?? 1) > 1 && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="v2-micro">
                            Página {contas.current_page} de {contas.last_page} · {contas.total} contas
                        </p>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                disabled={!contas.prev_page_url}
                                onClick={() => contas.prev_page_url && router.get(contas.prev_page_url, {}, { preserveState: true, preserveScroll: true })}
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                disabled={!contas.next_page_url}
                                onClick={() => contas.next_page_url && router.get(contas.next_page_url, {}, { preserveState: true, preserveScroll: true })}
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </Secao>

            <div className="mt-5">
                <Aviso tom="info" titulo="Regra preservada">
                    Suspender interrompe login, sessões e automações, mas não apaga dados nem integração. Cada ação
                    registra ator e motivo na auditoria da aplicação.
                </Aviso>
            </div>

            <Dialogo
                aberto={Boolean(acao)}
                titulo={acao?.tipo === 'suspender' ? 'Suspender conta' : 'Reativar conta'}
                descricao={acao?.tipo === 'suspender'
                    ? 'O acesso e as automações desta conta são interrompidos imediatamente. Os dados são preservados.'
                    : 'O acesso da conta é restaurado e os dados preservados voltam a ficar disponíveis.'}
                icone={acao?.tipo === 'suspender' ? ShieldOff : RotateCcw}
                aoFechar={fechar}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={fechar} disabled={form.processing}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className={acao?.tipo === 'suspender' ? 'v2-btn v2-btn--perigo' : 'v2-btn v2-btn--primario'}
                            onClick={confirmar}
                            disabled={form.processing}
                        >
                            {form.processing ? 'Processando…' : acao?.tipo === 'suspender' ? 'Suspender conta' : 'Reativar conta'}
                        </button>
                    </>
                }
            >
                {acao && (
                    <div className="space-y-3">
                        <div className="border border-[var(--v2-line)] p-2.5">
                            <p className="text-[0.8125rem] font-medium">{acao.conta.nome}</p>
                            <p className="v2-micro">{acao.conta.email ?? 'Sem email vinculado'}</p>
                            {acao.tipo === 'reativar' && acao.conta.motivo_suspensao && (
                                <p className="mt-1.5 text-[0.6875rem] leading-5 text-[var(--v2-ink-2)]">
                                    Motivo registrado: {acao.conta.motivo_suspensao}
                                </p>
                            )}
                        </div>

                        {acao.tipo === 'suspender' && (
                            <Campo rotulo="Motivo da suspensão" htmlFor="suspensao-motivo" erro={form.errors.motivo} ajuda="Fica registrado para auditoria interna.">
                                <textarea
                                    id="suspensao-motivo"
                                    className="v2-entrada"
                                    rows={3}
                                    maxLength={1000}
                                    value={form.data.motivo}
                                    onChange={(evento) => {
                                        form.setData('motivo', evento.target.value);
                                        form.clearErrors('motivo');
                                    }}
                                    aria-invalid={Boolean(form.errors.motivo)}
                                    placeholder="Descreva o motivo em uma frase."
                                />
                            </Campo>
                        )}

                        <Campo
                            rotulo="Administrador responsável (opcional)"
                            htmlFor="suspensao-responsavel"
                            erro={form.errors.administrador_responsavel_id}
                            ajuda="Usado apenas para acompanhamento. O responsável pela ação é registrado automaticamente."
                        >
                            <select
                                id="suspensao-responsavel"
                                className="v2-entrada"
                                value={form.data.administrador_responsavel_id}
                                onChange={(evento) => {
                                    form.setData('administrador_responsavel_id', evento.target.value);
                                    form.clearErrors('administrador_responsavel_id');
                                }}
                            >
                                <option value="">Sem responsável definido</option>
                                {administradores.map((administrador) => (
                                    <option key={administrador.id} value={administrador.id}>
                                        {administrador.name} — {administrador.email}
                                    </option>
                                ))}
                            </select>
                        </Campo>

                        {form.errors.conta && <span className="v2-campo__erro" role="alert">{form.errors.conta}</span>}
                    </div>
                )}
            </Dialogo>
        </div>
    );
}

AdminContas.layout = [LayoutV2];
