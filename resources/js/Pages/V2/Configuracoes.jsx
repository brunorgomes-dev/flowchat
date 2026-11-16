import { useEffect, useMemo, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { ArrowRight, Clock3, MonitorSmartphone, Moon, Palette, Plug, Sun } from 'lucide-react';
import LayoutV2 from '@/components/v2/LayoutV2';
import { Aviso, CabecalhoPagina, Campo, Chip, Secao } from '@/components/v2/pecas';
import { definirPreferenciaTema, lerPreferenciaTema } from '@/lib/tema';
import { formatarHoraLocal } from '@/lib/fusos';

const opcoesTema = [
    { valor: 'sistema', rotulo: 'Sistema', icone: MonitorSmartphone, descricao: 'Acompanha o sistema operacional.' },
    { valor: 'claro', rotulo: 'Claro', icone: Sun, descricao: 'Superfícies claras o tempo todo.' },
    { valor: 'escuro', rotulo: 'Escuro', icone: Moon, descricao: 'Superfícies escuras o tempo todo.' },
];

export default function Configuracoes({ fuso = null, fusos = [], messenger = null }) {
    const [preferencia, setPreferencia] = useState(() => lerPreferenciaTema());
    const [agora, setAgora] = useState(() => new Date());
    const [busca, setBusca] = useState('');
    const form = useForm({ timezone: fuso?.atual ?? '' });

    useEffect(() => {
        const intervalo = setInterval(() => setAgora(new Date()), 30000);

        return () => clearInterval(intervalo);
    }, []);

    const fusosFiltrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();

        if (!termo) {
            return fusos;
        }

        return fusos.filter((item) => (
            item.id.toLowerCase().includes(termo) || String(item.pais ?? '').toLowerCase().includes(termo)
        ));
    }, [busca, fusos]);

    const alterarTema = (valor) => {
        setPreferencia(valor);
        definirPreferenciaTema(valor);
    };

    const salvarFuso = (evento) => {
        evento.preventDefault();
        form.post('/configuracoes/fuso', { preserveScroll: true });
    };

    const rotuloEstadoFuso = !fuso?.disponivel
        ? null
        : !fuso.atual
            ? 'Não configurado'
            : fuso.confirmado
                ? 'Confirmado'
                : 'Pendente de confirmação';

    return (
        <div className="v2-conteudo v2-conteudo--estreito">
            <CabecalhoPagina
                titulo="Configurações"
                descricao="Aparência e região da conta. A conexão do Facebook Messenger fica em Configurações → Conexão."
            />

            <Secao id="config-aparencia" titulo="Aparência" nota="A preferência fica salva neste navegador.">
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
                                            {opcao.descricao}
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

            <Secao id="config-fuso" titulo="Fuso horário" nota="A região da conta é usada nos agendamentos e nas janelas de horário.">
                <div className="v2-painel v2-painel__corpo space-y-3">
                    {!fuso?.disponivel ? (
                        <Aviso tom="atencao" titulo="Estrutura de fuso indisponível">
                            O banco atual não tem as colunas de fuso. A configuração regional fica desabilitada até a
                            migration correspondente ser aplicada pela operação.
                        </Aviso>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-3">
                                <div>
                                    <p className="v2-micro">Fuso atual da conta</p>
                                    <p className="v2-mono mt-0.5 text-[0.875rem]">{fuso.atual ?? 'Não configurado'}</p>
                                </div>
                                {rotuloEstadoFuso && (
                                    <Chip tom={!fuso.atual ? 'neutro' : fuso.confirmado ? 'positivo' : 'atencao'}>
                                        {rotuloEstadoFuso}
                                    </Chip>
                                )}
                                {fuso.atual && (
                                    <span className="v2-micro v2-numerico">
                                        <Clock3 className="mr-1 inline size-3" aria-hidden="true" />
                                        Horário local: {formatarHoraLocal(fuso.atual, agora)}
                                    </span>
                                )}
                            </div>

                            {fuso.atual && !fuso.confirmado && (
                                <Aviso tom="atencao" titulo="Confirmação necessária">
                                    Este fuso foi detectado automaticamente. Confirme para habilitar agendamentos e
                                    janelas de horário.
                                </Aviso>
                            )}

                            <form onSubmit={salvarFuso} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <Campo rotulo="Pesquisar fuso" htmlFor="fuso-busca">
                                        <input
                                            id="fuso-busca"
                                            type="search"
                                            className="v2-entrada"
                                            value={busca}
                                            onChange={(evento) => setBusca(evento.target.value)}
                                            placeholder="País, cidade ou identificador"
                                        />
                                    </Campo>
                                    <Campo
                                        rotulo="Fuso IANA"
                                        htmlFor="fuso-selecionado"
                                        erro={form.errors.timezone}
                                    >
                                        <select
                                            id="fuso-selecionado"
                                            className="v2-entrada"
                                            value={form.data.timezone}
                                            onChange={(evento) => {
                                                form.setData('timezone', evento.target.value);
                                                form.clearErrors('timezone');
                                            }}
                                            aria-invalid={Boolean(form.errors.timezone)}
                                        >
                                            {form.data.timezone === '' && <option value="">Selecione um fuso</option>}
                                            {fusosFiltrados.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.id}{item.pais ? ` · ${item.pais}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </Campo>
                                </div>
                                <button type="submit" className="v2-btn v2-btn--primario" disabled={form.processing || !form.data.timezone}>
                                    {form.processing ? 'Salvando…' : 'Confirmar fuso'}
                                </button>
                            </form>

                            <p className="v2-campo__ajuda">
                                {fusosFiltrados.length} de {fusos.length} fusos disponíveis.
                            </p>
                        </>
                    )}
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
                                {messenger?.configurado ? 'Página conectada' : 'Nenhuma Página conectada'}
                            </p>
                            <p className="v2-micro v2-mono">
                                {messenger?.configurado ? `Page ID ${messenger.page_id}` : 'Aguardando conexão'}
                            </p>
                        </div>
                    </div>
                    <Link href="/configuracoes/conexao" className="v2-btn v2-btn--contorno">
                        Abrir conexão
                        <ArrowRight aria-hidden="true" />
                    </Link>
                </div>
            </Secao>
        </div>
    );
}

Configuracoes.layout = [LayoutV2];
