import { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { Check, Copy, Mail, ShieldCheck, UserPlus, X } from 'lucide-react';
import LayoutV2 from '@/components/v2/LayoutV2';
import { Aviso, CabecalhoPagina, Campo, Chip, Dialogo, Metrica, Secao, Vazio } from '@/components/v2/pecas';
import { formatarDataHora } from '@/components/v2/formato';

const tomPorEstado = {
    pendente: 'atencao',
    resgatado: 'positivo',
    revogado: 'erro',
    expirado: 'neutro',
};

export default function AdminConvites({ convites = [], linkConvite = null }) {
    const [copiado, setCopiado] = useState(false);
    const [paraRevogar, setParaRevogar] = useState(null);
    const [revogando, setRevogando] = useState(false);
    const form = useForm({ email: '' });

    const pendentes = convites.filter((convite) => convite.estado === 'pendente').length;

    const emitir = (evento) => {
        evento.preventDefault();
        form.post('/admin/convites', {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    const revogar = () => {
        if (!paraRevogar) {
            return;
        }

        router.delete(`/admin/convites/${paraRevogar.id}`, {
            preserveScroll: true,
            onStart: () => setRevogando(true),
            onSuccess: () => setParaRevogar(null),
            onFinish: () => setRevogando(false),
        });
    };

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(linkConvite);
            setCopiado(true);
        } catch {
            setCopiado(false);
        }
    };

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Emitir convite"
                descricao="Crie um link de entrada de uso único e acompanhe os convites recentes com emissão, validade, resgate e revogação."
                acoes={
                    <Link href="/admin/convites" className="v2-btn v2-btn--contorno">
                        Ver contas
                    </Link>
                }
            />

            <div className="v2-metricas mt-4">
                <Metrica rotulo="Convites recentes" valor={convites.length} unidade="na lista" />
                <Metrica rotulo="Pendentes" valor={pendentes} unidade="aguardando resgate" />
                <Metrica rotulo="Validade" valor="7" unidade="dias" />
                <Metrica rotulo="Uso" valor="1" unidade="por link" />
            </div>

            <Secao id="convites-novo" titulo="Novo convite" nota="O link vale por 7 dias e só pode ser usado uma vez, vinculado ao email informado.">
                <div className="v2-painel v2-painel__corpo space-y-3">
                    <form onSubmit={emitir} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <Campo rotulo="Email do convidado" htmlFor="convite-email" erro={form.errors.email}>
                                <input
                                    id="convite-email"
                                    type="email"
                                    className="v2-entrada"
                                    value={form.data.email}
                                    onChange={(evento) => {
                                        form.setData('email', evento.target.value);
                                        form.clearErrors('email');
                                    }}
                                    autoComplete="email"
                                    aria-invalid={Boolean(form.errors.email)}
                                />
                            </Campo>
                        </div>
                        <button type="submit" className="v2-btn v2-btn--primario" disabled={form.processing}>
                            <UserPlus aria-hidden="true" />
                            {form.processing ? 'Criando…' : 'Criar convite'}
                        </button>
                    </form>

                    {linkConvite && (
                        <div className="border border-[color-mix(in_oklab,var(--v2-terracota)_35%,transparent)] bg-[color-mix(in_oklab,var(--v2-terracota)_6%,var(--v2-surface))] p-3">
                            <p className="text-[0.75rem] font-medium">Link criado — copie e envie ao destinatário</p>
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                <input readOnly value={linkConvite} aria-label="Link do convite" className="v2-entrada v2-mono flex-1" />
                                <button type="button" className="v2-btn v2-btn--contorno" onClick={copiar}>
                                    {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                                    {copiado ? 'Copiado' : 'Copiar link'}
                                </button>
                            </div>
                            <p className="v2-campo__ajuda mt-2">
                                Este link só é mostrado agora. Se perder, revogue o convite e crie outro.
                            </p>
                        </div>
                    )}
                </div>
            </Secao>

            <Secao id="convites-lista" titulo="Convites recentes" nota="Estados: pendente, resgatado, revogado e expirado.">
                {convites.length === 0 ? (
                    <Vazio icone={Mail} titulo="Nenhum convite emitido ainda" texto="Crie o primeiro convite para liberar o acesso de um cliente." />
                ) : (
                    <div className="v2-tabela-area">
                        <table className="v2-tabela v2-tabela--larga">
                            <thead>
                                <tr>
                                    <th scope="col">Convidado</th>
                                    <th scope="col">Estado</th>
                                    <th scope="col">Emitido</th>
                                    <th scope="col">Expira</th>
                                    <th scope="col">Marcos</th>
                                    <th scope="col"><span className="v2-oculto-visual">Ações</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {convites.map((convite) => (
                                    <tr key={convite.id}>
                                        <th scope="row" className="text-left">
                                            <span className="v2-tabela__principal">{convite.email}</span>
                                            <span className="v2-tabela__secundario v2-mono">#{convite.id}</span>
                                        </th>
                                        <td>
                                            <Chip tom={tomPorEstado[convite.estado]}>{convite.estado}</Chip>
                                        </td>
                                        <td>
                                            <span className="block v2-numerico text-[var(--v2-ink-2)]">{formatarDataHora(convite.criado_em)}</span>
                                            <span className="v2-tabela__secundario">
                                                {convite.emissor ? convite.emissor.name : 'Emissor não disponível'}
                                            </span>
                                        </td>
                                        <td className="v2-numerico text-[var(--v2-ink-2)]">{formatarDataHora(convite.expira_em)}</td>
                                        <td className="text-[0.6875rem] leading-5 text-[var(--v2-ink-2)]">
                                            {convite.resgatado_em && <span className="block">Resgatado em {formatarDataHora(convite.resgatado_em)}</span>}
                                            {convite.revogado_em && <span className="block">Revogado em {formatarDataHora(convite.revogado_em)}</span>}
                                            {!convite.resgatado_em && !convite.revogado_em && <span>—</span>}
                                        </td>
                                        <td>
                                            <div className="v2-tabela__acoes">
                                                {convite.estado === 'pendente' ? (
                                                    <button type="button" className="v2-btn v2-btn--perigo v2-btn--pequeno" onClick={() => setParaRevogar(convite)}>
                                                        <X aria-hidden="true" />
                                                        Revogar
                                                    </button>
                                                ) : (
                                                    <span className="v2-micro">—</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Secao>

            <div className="mt-5">
                <Aviso tom="info" titulo="Como o convite funciona">
                    O token é guardado apenas em hash. Um convite resgatado não pode ser revogado e o link só aparece uma
                    vez, no momento da emissão.
                </Aviso>
            </div>

            <Dialogo
                aberto={Boolean(paraRevogar)}
                titulo="Revogar convite?"
                descricao="O link deixa de funcionar imediatamente. Um convite já resgatado não pode ser revogado."
                icone={ShieldCheck}
                aoFechar={() => setParaRevogar(null)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setParaRevogar(null)} disabled={revogando}>
                            Cancelar
                        </button>
                        <button type="button" className="v2-btn v2-btn--perigo" onClick={revogar} disabled={revogando}>
                            {revogando ? 'Revogando…' : 'Revogar convite'}
                        </button>
                    </>
                }
            >
                {paraRevogar && (
                    <p className="text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                        Convite para <strong className="font-medium text-[var(--v2-ink)]">{paraRevogar.email}</strong>,
                        emitido em {formatarDataHora(paraRevogar.criado_em)}.
                    </p>
                )}
            </Dialogo>
        </div>
    );
}

AdminConvites.layout = [LayoutV2];
