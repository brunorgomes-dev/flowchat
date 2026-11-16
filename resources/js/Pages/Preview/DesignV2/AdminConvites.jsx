import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Copy, Mail, ShieldCheck, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import LayoutPreview from './_components/LayoutPreview';
import {
    Aviso,
    CabecalhoPagina,
    Campo,
    Chip,
    Dialogo,
    Metrica,
    Secao,
    SeloDemo,
    SeloLeitura,
    Vazio,
} from './_components/pecas';
import { convites, formatarDataHora } from './_data/demonstracao';

const tomPorEstado = {
    pendente: 'atencao',
    resgatado: 'positivo',
    revogado: 'erro',
    expirado: 'neutro',
};

const LINK_DEMONSTRACAO = 'https://flowchat.invalid/convites/DEMO-CONVITE-4F2A';

export default function AdminConvites() {
    const [email, setEmail] = useState('');
    const [erro, setErro] = useState(null);
    const [linkGerado, setLinkGerado] = useState(null);
    const [estados, setEstados] = useState({});
    const [paraRevogar, setParaRevogar] = useState(null);
    const [copiado, setCopiado] = useState(false);

    const lista = convites.map((convite) => ({ ...convite, estado: estados[convite.id] ?? convite.estado }));
    const pendentes = lista.filter((convite) => convite.estado === 'pendente').length;

    const emitir = (evento) => {
        evento.preventDefault();
        const valor = email.trim();

        if (!valor) {
            setErro('Informe o email do convidado.');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) {
            setErro('Informe um email válido.');
            return;
        }

        setErro(null);
        setLinkGerado(LINK_DEMONSTRACAO);
        setEmail('');
        toast.success('Emissão simulada', {
            description: 'Nenhum convite foi criado e nenhum email foi enviado.',
        });
    };

    const revogar = () => {
        if (!paraRevogar) {
            return;
        }

        setEstados((atuais) => ({ ...atuais, [paraRevogar.id]: 'revogado' }));
        setParaRevogar(null);
        toast.success('Revogação simulada', {
            description: 'O convite de demonstração não existe no banco.',
        });
    };

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Emitir convite"
                descricao="Crie um link de entrada de uso único e acompanhe os convites recentes com emissão, validade, resgate e revogação."
                nota={
                    <div className="flex flex-wrap items-center gap-2">
                        <SeloLeitura />
                        <SeloDemo />
                        <Chip tom="marca">Administrador da plataforma</Chip>
                    </div>
                }
                acoes={
                    <Link href="/preview/design-v2/admin/contas" className="v2-btn v2-btn--contorno">
                        Ver contas
                    </Link>
                }
            />

            <div className="v2-metricas mt-4">
                <Metrica rotulo="Convites recentes" valor={lista.length} unidade="na lista" />
                <Metrica rotulo="Pendentes" valor={pendentes} unidade="aguardando resgate" />
                <Metrica rotulo="Validade" valor="7" unidade="dias" />
                <Metrica rotulo="Uso" valor="1" unidade="por link" />
            </div>

            <Secao
                id="convites-novo"
                titulo="Novo convite"
                nota="O link vale por 7 dias e só pode ser usado uma vez, vinculado ao email informado."
            >
                <div className="v2-painel v2-painel__corpo space-y-3">
                    <form onSubmit={emitir} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <Campo rotulo="Email do convidado" htmlFor="convite-email" erro={erro}>
                                <input
                                    id="convite-email"
                                    type="email"
                                    className="v2-entrada"
                                    value={email}
                                    onChange={(evento) => {
                                        setEmail(evento.target.value);
                                        setErro(null);
                                    }}
                                    autoComplete="email"
                                    aria-invalid={Boolean(erro)}
                                    placeholder="nome@dominio.invalid"
                                />
                            </Campo>
                        </div>
                        <button type="submit" className="v2-btn v2-btn--primario">
                            <UserPlus aria-hidden="true" />
                            Criar convite
                        </button>
                    </form>

                    {linkGerado && (
                        <div className="border border-[color-mix(in_oklab,var(--v2-terracota)_35%,transparent)] bg-[color-mix(in_oklab,var(--v2-terracota)_6%,var(--v2-surface))] p-3">
                            <p className="text-[0.75rem] font-medium">Link de demonstração — não é um convite real</p>
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                <input readOnly value={linkGerado} aria-label="Link do convite de demonstração" className="v2-entrada v2-mono flex-1" />
                                <button
                                    type="button"
                                    className="v2-btn v2-btn--contorno"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(linkGerado);
                                            setCopiado(true);
                                            toast.success('Link de demonstração copiado');
                                        } catch {
                                            toast.error('Não foi possível copiar neste navegador');
                                        }
                                    }}
                                >
                                    <Copy aria-hidden="true" />
                                    {copiado ? 'Copiado' : 'Copiar link'}
                                </button>
                            </div>
                            <p className="v2-campo__ajuda mt-2">
                                Na tela real o token é mostrado uma única vez e guardado apenas em hash. Este valor é
                                fictício e o domínio <code className="v2-mono">.invalid</code> é reservado para exemplos.
                            </p>
                        </div>
                    )}
                </div>
            </Secao>

            <Secao id="convites-lista" titulo="Convites recentes" nota="Estados disponíveis: pendente, resgatado, revogado e expirado.">
                {lista.length === 0 ? (
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
                                    <th scope="col">
                                        <span className="v2-oculto-visual">Ações</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {lista.map((convite) => (
                                    <tr key={convite.id}>
                                        <th scope="row" className="text-left">
                                            <span className="v2-tabela__principal">{convite.email}</span>
                                            <span className="v2-tabela__secundario v2-mono">DEMO-CONVITE-{convite.id}</span>
                                        </th>
                                        <td>
                                            <Chip tom={tomPorEstado[convite.estado]}>{convite.estado}</Chip>
                                        </td>
                                        <td className="v2-numerico text-[var(--v2-ink-2)]">{formatarDataHora(convite.emitidoEm)}</td>
                                        <td className="v2-numerico text-[var(--v2-ink-2)]">{formatarDataHora(convite.expiraEm)}</td>
                                        <td className="text-[0.6875rem] leading-5 text-[var(--v2-ink-2)]">
                                            {convite.resgatadoEm && <span className="block">Resgatado em {formatarDataHora(convite.resgatadoEm)}</span>}
                                            {convite.revogadoEm && <span className="block">Revogado em {formatarDataHora(convite.revogadoEm)}</span>}
                                            {!convite.resgatadoEm && !convite.revogadoEm && <span>—</span>}
                                        </td>
                                        <td>
                                            <div className="v2-tabela__acoes">
                                                {convite.estado === 'pendente' ? (
                                                    <button
                                                        type="button"
                                                        className="v2-btn v2-btn--perigo v2-btn--pequeno"
                                                        onClick={() => setParaRevogar(convite)}
                                                    >
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
                <Aviso tom="info" titulo="Por que os convites são um mock estático">
                    A área de convites real já tem dados persistidos para visualização. Para não gravar nada e não expor
                    o token de um convite existente, a V2 usa apenas fixtures com emails em `.invalid` e um link de
                    exemplo. Nenhuma revogação, emissão ou envio de email acontece.
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
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setParaRevogar(null)}>
                            Cancelar
                        </button>
                        <button type="button" className="v2-btn v2-btn--perigo" onClick={revogar}>
                            Revogar convite
                        </button>
                    </>
                }
            >
                {paraRevogar && (
                    <p className="text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                        Convite para <strong className="font-medium text-[var(--v2-ink)]">{paraRevogar.email}</strong>,
                        emitido em {formatarDataHora(paraRevogar.emitidoEm)}.
                    </p>
                )}
            </Dialogo>
        </div>
    );
}

AdminConvites.layout = [LayoutPreview];
