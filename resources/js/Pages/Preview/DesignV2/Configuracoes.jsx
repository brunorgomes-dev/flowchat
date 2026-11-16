import { useEffect, useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowRight, Clock3, MonitorSmartphone, Moon, Palette, Plug, Sun } from 'lucide-react';
import { toast } from 'sonner';
import LayoutPreview from './_components/LayoutPreview';
import {
    Aviso,
    CabecalhoPagina,
    Campo,
    Chip,
    Secao,
    SeloDemo,
    SeloLeitura,
} from './_components/pecas';
import { conta, fusosAmostra, operacao } from './_data/demonstracao';
import { definirPreferenciaTema, lerPreferenciaTema } from '@/lib/tema';
import { formatarHoraLocal } from '@/lib/fusos';

const opcoesTema = [
    { valor: 'sistema', rotulo: 'Sistema', icone: MonitorSmartphone },
    { valor: 'claro', rotulo: 'Claro', icone: Sun },
    { valor: 'escuro', rotulo: 'Escuro', icone: Moon },
];

export default function Configuracoes() {
    const [preferencia, setPreferencia] = useState(() => lerPreferenciaTema());
    const [agora, setAgora] = useState(() => new Date());
    const [fuso, setFuso] = useState(conta.fuso);
    const [confirmado, setConfirmado] = useState(conta.fusoConfirmado);
    const [buscaFuso, setBuscaFuso] = useState('America/Sao_Paulo');
    const [erroFuso, setErroFuso] = useState(null);

    useEffect(() => {
        const intervalo = setInterval(() => setAgora(new Date()), 30000);

        return () => clearInterval(intervalo);
    }, []);

    const fusosFiltrados = useMemo(() => {
        const termo = buscaFuso.trim().toLowerCase();

        if (!termo) {
            return fusosAmostra;
        }

        return fusosAmostra.filter((item) => (
            item.rotulo.toLowerCase().includes(termo) || item.valor.toLowerCase().includes(termo)
        ));
    }, [buscaFuso]);

    const alterarTema = (valor) => {
        setPreferencia(valor);
        definirPreferenciaTema(valor);
    };

    const salvarFuso = (evento) => {
        evento.preventDefault();

        if (!fuso) {
            setErroFuso('Selecione um fuso horário da lista.');
            return;
        }

        setErroFuso(null);
        setConfirmado(true);
        toast.success('Fuso confirmado (simulação)', {
            description: 'O fuso da conta não foi gravado. Apenas a tela foi atualizada.',
        });
    };

    return (
        <div className="v2-conteudo v2-conteudo--estreito">
            <CabecalhoPagina
                titulo="Configurações"
                descricao="Aparência e região da conta. A conexão do Facebook Messenger fica em Configurações → Conexão."
                nota={
                    <div className="flex flex-wrap items-center gap-2">
                        <SeloLeitura />
                        <SeloDemo />
                    </div>
                }
            />

            <Secao id="config-aparencia" titulo="Aparência" nota="A preferência fica salva neste navegador e vale para o preview e para a interface real.">
                <div className="v2-painel v2-painel__corpo">
                    <div className="grid gap-2 sm:grid-cols-3">
                        {opcoesTema.map((opcao) => {
                            const Icone = opcao.icone;
                            const ativo = preferencia === opcao.valor;

                            return (
                                <button
                                    key={opcao.valor}
                                    type="button"
                                    aria-pressed={ativo}
                                    onClick={() => alterarTema(opcao.valor)}
                                    className={`flex items-start gap-2 border p-3 text-left ${
                                        ativo
                                            ? 'border-[var(--v2-terracota)] bg-[color-mix(in_oklab,var(--v2-terracota)_8%,var(--v2-surface))]'
                                            : 'border-[var(--v2-line)] hover:border-[var(--v2-line-forte)]'
                                    }`}
                                >
                                    <Icone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                    <span>
                                        <span className="block text-[0.8125rem] font-medium">{opcao.rotulo}</span>
                                        <span className="mt-0.5 block text-[0.6875rem] leading-4 text-[var(--v2-ink-2)]">
                                            {opcao.valor === 'sistema'
                                                ? 'Acompanha o sistema operacional.'
                                                : opcao.valor === 'claro'
                                                    ? 'Superfícies claras o tempo todo.'
                                                    : 'Superfícies escuras o tempo todo.'}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="v2-campo__ajuda mt-3 flex items-center gap-1.5">
                        <Palette className="size-3" aria-hidden="true" />
                        Este controle usa a mesma preferência global do FlowChat (<code className="v2-mono">flowchat-tema</code>).
                    </p>
                </div>
            </Secao>

            <Secao id="config-fuso" titulo="Fuso horário" nota="A região da conta é usada para interpretar agendamentos e janelas de horário.">
                <div className="v2-painel v2-painel__corpo space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div>
                            <p className="v2-micro">Fuso atual da conta</p>
                            <p className="v2-mono mt-0.5 text-[0.875rem] text-[var(--v2-ink)]">{fuso}</p>
                        </div>
                        <Chip tom={confirmado ? 'positivo' : 'atencao'}>
                            {confirmado ? 'Confirmado' : 'Pendente de confirmação'}
                        </Chip>
                        <span className="v2-micro v2-numerico">
                            <Clock3 className="mr-1 inline size-3" aria-hidden="true" />
                            Horário local: {formatarHoraLocal(fuso, agora)}
                        </span>
                    </div>

                    {!confirmado && (
                        <Aviso tom="atencao" titulo="Confirmação necessária">
                            Este fuso foi detectado automaticamente. Confirme para habilitar agendamentos e janelas de
                            horário.
                        </Aviso>
                    )}

                    <form onSubmit={salvarFuso} noValidate className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Campo rotulo="Pesquisar fuso" htmlFor="fuso-busca">
                                <input
                                    id="fuso-busca"
                                    type="search"
                                    className="v2-entrada"
                                    value={buscaFuso}
                                    onChange={(evento) => setBuscaFuso(evento.target.value)}
                                    placeholder="País, cidade ou identificador"
                                />
                            </Campo>
                            <Campo rotulo="Fuso IANA" htmlFor="fuso-selecionado" erro={erroFuso}>
                                <select
                                    id="fuso-selecionado"
                                    className="v2-entrada"
                                    value={fuso}
                                    onChange={(evento) => {
                                        setFuso(evento.target.value);
                                        setErroFuso(null);
                                    }}
                                    aria-invalid={Boolean(erroFuso)}
                                >
                                    {fusosFiltrados.length === 0 && <option value={fuso}>{fuso}</option>}
                                    {fusosFiltrados.map((item) => (
                                        <option key={item.valor} value={item.valor}>
                                            {item.rotulo} · {item.valor}
                                        </option>
                                    ))}
                                </select>
                            </Campo>
                        </div>
                        <button type="submit" className="v2-btn v2-btn--primario">
                            Confirmar fuso
                        </button>
                    </form>
                    <p className="v2-campo__ajuda">{fusosFiltrados.length} de {fusosAmostra.length} fusos desta amostra.</p>

                    <Aviso tom="info">
                        A tela real lista todos os identificadores IANA de{' '}
                        <code className="v2-mono">FusosHorarios::listar()</code>. O preview usa uma amostra para não
                        duplicar a carga e mantém a busca por país, cidade e identificador.
                    </Aviso>
                </div>
            </Secao>

            <Secao id="config-conexao" titulo="Conexão" nota="Página do Facebook, token e OAuth do Messenger.">
                <div className="v2-painel v2-painel__corpo flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="v2-anexo__icone">
                            <Plug className="size-3.5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[0.8125rem] font-medium">
                                {operacao.messenger.conectado ? operacao.messenger.pagina : 'Nenhuma Página conectada'}
                            </p>
                            <p className="v2-micro v2-mono">
                                {operacao.messenger.conectado ? `Page ID ${operacao.messenger.pageId}` : 'Aguardando conexão'}
                            </p>
                        </div>
                    </div>
                    <Link href="/preview/design-v2/configuracoes/conexao" className="v2-btn v2-btn--contorno">
                        Abrir conexão
                        <ArrowRight aria-hidden="true" />
                    </Link>
                </div>
            </Secao>
        </div>
    );
}

Configuracoes.layout = [LayoutPreview];
