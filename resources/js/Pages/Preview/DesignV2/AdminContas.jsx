import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { RotateCcw, Search, ShieldOff, Users } from 'lucide-react';
import { toast } from 'sonner';
import LayoutPreview from './_components/LayoutPreview';
import {
    Aviso,
    Avatar,
    CabecalhoPagina,
    Campo,
    Chip,
    Dialogo,
    Metrica,
    Secao,
    SeloDemo,
    SeloLeitura,
    Segmentado,
    Vazio,
} from './_components/pecas';
import { administradores, contasAdministrativas, formatarData, formatarDataHora } from './_data/demonstracao';

const filtros = [
    { valor: 'todas', rotulo: 'Todas' },
    { valor: 'ativa', rotulo: 'Ativas' },
    { valor: 'suspensa', rotulo: 'Suspensas' },
];

export default function AdminContas() {
    const [busca, setBusca] = useState('');
    const [filtro, setFiltro] = useState('todas');
    const [estados, setEstados] = useState(() => Object.fromEntries(
        contasAdministrativas.map((contaItem) => [contaItem.id, { estado: contaItem.estado, motivo: contaItem.motivoSuspensao ?? null }]),
    ));
    const [acao, setAcao] = useState(null);
    const [motivo, setMotivo] = useState('');
    const [responsavel, setResponsavel] = useState('');
    const [erro, setErro] = useState(null);

    const lista = useMemo(() => {
        const termo = busca.trim().toLowerCase();

        return contasAdministrativas
            .map((contaItem) => ({ ...contaItem, ...estados[contaItem.id] }))
            .filter((contaItem) => {
                const combinaBusca = !termo
                    || contaItem.nome.toLowerCase().includes(termo)
                    || contaItem.email.toLowerCase().includes(termo);
                const combinaFiltro = filtro === 'todas' || contaItem.estado === filtro;

                return combinaBusca && combinaFiltro;
            });
    }, [busca, filtro, estados]);

    const ativas = Object.values(estados).filter((item) => item.estado === 'ativa').length;
    const suspensas = Object.values(estados).filter((item) => item.estado === 'suspensa').length;

    const abrir = (contaItem) => {
        setAcao({ conta: contaItem, tipo: contaItem.estado === 'suspensa' ? 'reativar' : 'suspender' });
        setMotivo('');
        setResponsavel('');
        setErro(null);
    };

    const confirmar = () => {
        if (!acao) {
            return;
        }

        if (acao.tipo === 'suspender' && !motivo.trim()) {
            setErro('Informe o motivo da suspensão.');
            return;
        }

        setEstados((atuais) => ({
            ...atuais,
            [acao.conta.id]: {
                estado: acao.tipo === 'suspender' ? 'suspensa' : 'ativa',
                motivo: acao.tipo === 'suspender' ? motivo.trim() : null,
            },
        }));
        toast.success(acao.tipo === 'suspender' ? 'Suspensão simulada' : 'Reativação simulada', {
            description: `${acao.conta.nome}. Nenhum registro foi alterado no banco.`,
        });
        setAcao(null);
    };

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Contas de clientes"
                descricao="Visão administrativa de acesso: estado, último acesso e responsável pelo acompanhamento. A suspensão preserva os dados."
                nota={
                    <div className="flex flex-wrap items-center gap-2">
                        <SeloLeitura />
                        <SeloDemo />
                        <Chip tom="marca">Administrador da plataforma</Chip>
                    </div>
                }
                acoes={
                    <Link href="/preview/design-v2/admin/convites" className="v2-btn v2-btn--contorno">
                        Ir para convites
                    </Link>
                }
            />

            <div className="v2-metricas mt-4">
                <Metrica rotulo="Contas" valor={contasAdministrativas.length} unidade="total" />
                <Metrica rotulo="Ativas" valor={ativas} unidade="com acesso" />
                <Metrica rotulo="Suspensas" valor={suspensas} unidade="dados preservados" />
                <Metrica rotulo="Página" valor="1" unidade="de 1" nota="15 por página na tela real" />
            </div>

            <div className="v2-barra mt-4">
                <div className="relative min-w-[12rem] flex-1">
                    <Search
                        className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--v2-ink-3)]"
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        className="v2-entrada v2-entrada--icone"
                        value={busca}
                        onChange={(evento) => setBusca(evento.target.value)}
                        placeholder="Buscar por nome ou email"
                        aria-label="Buscar contas por nome ou email"
                    />
                </div>
                <Segmentado rotulo="Filtrar contas por estado" opcoes={filtros} valor={filtro} aoAlterar={setFiltro} />
                <span className="v2-micro v2-numerico">{lista.length} de {contasAdministrativas.length}</span>
            </div>

            <Secao id="admin-contas-lista" titulo="Lista de contas" nota="Somente dados operacionais de acesso; o conteúdo das conversas não aparece aqui.">
                {lista.length === 0 ? (
                    <Vazio
                        icone={Users}
                        titulo="Nenhuma conta encontrada"
                        texto="Ajuste a busca ou o filtro de estado para ver as demais contas."
                        acao={
                            <button
                                type="button"
                                className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                onClick={() => {
                                    setBusca('');
                                    setFiltro('todas');
                                }}
                            >
                                Limpar filtros
                            </button>
                        }
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
                                    <th scope="col">
                                        <span className="v2-oculto-visual">Ações</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {lista.map((contaItem) => (
                                    <tr key={contaItem.id}>
                                        <th scope="row" className="text-left">
                                            <span className="flex items-center gap-2">
                                                <Avatar nome={contaItem.nome} />
                                                <span className="min-w-0">
                                                    <span className="v2-tabela__principal block">{contaItem.nome}</span>
                                                    <span className="v2-tabela__secundario">{contaItem.email}</span>
                                                </span>
                                            </span>
                                            {contaItem.estado === 'suspensa' && contaItem.motivo && (
                                                <span className="v2-tabela__secundario max-w-[20rem]">
                                                    Motivo: {contaItem.motivo}
                                                </span>
                                            )}
                                        </th>
                                        <td>
                                            <Chip tom={contaItem.estado === 'suspensa' ? 'erro' : 'positivo'}>
                                                {contaItem.estado === 'suspensa' ? 'Suspensa' : 'Ativa'}
                                            </Chip>
                                        </td>
                                        <td className="v2-numerico text-[var(--v2-ink-2)]">{formatarData(contaItem.criadaEm)}</td>
                                        <td className="v2-numerico text-[var(--v2-ink-2)]">
                                            {contaItem.ultimoAcesso ? formatarDataHora(contaItem.ultimoAcesso) : 'Nunca acessou'}
                                        </td>
                                        <td className="text-[var(--v2-ink-2)]">{contaItem.responsavel ?? '—'}</td>
                                        <td>
                                            <div className="v2-tabela__acoes">
                                                <button
                                                    type="button"
                                                    className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                                    onClick={() => abrir(contaItem)}
                                                >
                                                    {contaItem.estado === 'suspensa' ? (
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

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="v2-micro">Página 1 de 1 · 6 contas de demonstração</p>
                    <div className="flex gap-1">
                        <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno" aria-disabled="true">
                            Anterior
                        </button>
                        <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno" aria-disabled="true">
                            Próxima
                        </button>
                    </div>
                </div>
            </Secao>

            <div className="mt-5">
                <Aviso tom="info" titulo="Regra preservada">
                    Suspender interrompe login, sessões e automações, mas não apaga dados nem integração. Cada ação
                    registra ator e motivo na auditoria da aplicação real; o preview apenas ilustra o fluxo.
                </Aviso>
            </div>

            <Dialogo
                aberto={Boolean(acao)}
                titulo={acao?.tipo === 'suspender' ? 'Suspender conta' : 'Reativar conta'}
                descricao={
                    acao?.tipo === 'suspender'
                        ? 'O acesso e as automações desta conta são interrompidos imediatamente. Os dados são preservados.'
                        : 'O acesso da conta é restaurado e os dados preservados voltam a ficar disponíveis.'
                }
                icone={acao?.tipo === 'suspender' ? ShieldOff : RotateCcw}
                aoFechar={() => setAcao(null)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setAcao(null)}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className={acao?.tipo === 'suspender' ? 'v2-btn v2-btn--perigo' : 'v2-btn v2-btn--primario'}
                            onClick={confirmar}
                        >
                            {acao?.tipo === 'suspender' ? 'Suspender conta' : 'Reativar conta'}
                        </button>
                    </>
                }
            >
                {acao && (
                    <div className="space-y-3">
                        <div className="border border-[var(--v2-line)] p-2.5">
                            <p className="text-[0.8125rem] font-medium">{acao.conta.nome}</p>
                            <p className="v2-micro">{acao.conta.email}</p>
                            {acao.tipo === 'reativar' && acao.conta.motivo && (
                                <p className="mt-1.5 text-[0.6875rem] leading-5 text-[var(--v2-ink-2)]">
                                    Motivo registrado: {acao.conta.motivo}
                                </p>
                            )}
                        </div>

                        {acao.tipo === 'suspender' && (
                            <Campo rotulo="Motivo da suspensão" htmlFor="suspensao-motivo" erro={erro} ajuda="Fica registrado para auditoria interna.">
                                <textarea
                                    id="suspensao-motivo"
                                    className="v2-entrada"
                                    rows={3}
                                    maxLength={1000}
                                    value={motivo}
                                    onChange={(evento) => {
                                        setMotivo(evento.target.value);
                                        setErro(null);
                                    }}
                                    aria-invalid={Boolean(erro)}
                                    placeholder="Descreva o motivo em uma frase."
                                />
                            </Campo>
                        )}

                        <Campo
                            rotulo="Administrador responsável (opcional)"
                            htmlFor="suspensao-responsavel"
                            ajuda="Usado apenas para acompanhamento. O responsável pela ação é registrado automaticamente."
                        >
                            <select
                                id="suspensao-responsavel"
                                className="v2-entrada"
                                value={responsavel}
                                onChange={(evento) => setResponsavel(evento.target.value)}
                            >
                                <option value="">Sem responsável definido</option>
                                {administradores.map((administrador) => (
                                    <option key={administrador.id} value={administrador.id}>
                                        {administrador.nome} — {administrador.email}
                                    </option>
                                ))}
                            </select>
                        </Campo>
                    </div>
                )}
            </Dialogo>
        </div>
    );
}

AdminContas.layout = [LayoutPreview];
