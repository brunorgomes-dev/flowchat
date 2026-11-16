import { Fragment, useMemo, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { CalendarClock, CheckCircle2, MessageCircle, Play, Settings2 } from 'lucide-react';
import LayoutV2 from '@/components/v2/LayoutV2';
import { Aviso, CabecalhoPagina, Campo, Chip, Metrica, Secao, TabelaArea, Vazio } from '@/components/v2/pecas';
import {
    chaveDoDia,
    formatarDiaLongo,
    formatarHora,
    nomeDoContato,
    resumoMensagem,
} from '@/components/v2/formato';

export default function Painel({ contatos = [], fluxos = [], mensagens = [], logs = [] }) {
    const [filtroInativo, setFiltroInativo] = useState(false);
    const form = useForm({ contato_id: '', fluxo_id: '' });

    const grupos = useMemo(() => {
        const mapa = new Map();

        logs.forEach((log) => {
            const chave = chaveDoDia(log.created_at);

            if (!mapa.has(chave)) {
                mapa.set(chave, []);
            }

            mapa.get(chave).push(log);
        });

        return [...mapa.entries()];
    }, [logs]);

    const mensagensRecentes = useMemo(
        () => [...mensagens].sort((a, b) => b.id - a.id).slice(0, 8),
        [mensagens],
    );

    const executar = (evento) => {
        evento.preventDefault();
        form.post('/execucoes/manuais', {
            preserveScroll: true,
            onSuccess: () => {
                setFiltroInativo(true);
                form.reset();
            },
        });
    };

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Painel de operação"
                descricao="Contatos, mensagens e atividade da conta em uma única leitura. A execução manual usa os contatos e fluxos ativos desta conta."
                acoes={
                    <>
                        <Link href="/" className="v2-btn v2-btn--primario">
                            <MessageCircle aria-hidden="true" />
                            Abrir conversas
                        </Link>
                        <Link href="/agendamentos" className="v2-btn v2-btn--contorno">
                            <CalendarClock aria-hidden="true" />
                            Agendamentos
                        </Link>
                    </>
                }
            />

            <div className="v2-metricas mt-4">
                <Metrica rotulo="Contatos" valor={contatos.length} unidade={contatos.length === 1 ? 'contato' : 'contatos'} />
                <Metrica rotulo="Mensagens recentes" valor={mensagens.length} unidade="carregadas" />
                <Metrica rotulo="Fluxos ativos" valor={fluxos.length} unidade="em operação" />
                <Metrica rotulo="Atividade" valor={logs.length} unidade="eventos" />
            </div>

            <div className="v2-grade v2-grade--painel mt-5">
                <div className="min-w-0">
                    <Secao
                        id="painel-execucao"
                        titulo="Executar fluxo manualmente"
                        nota="Escolha um contato e um fluxo ativo. A execução é enfileirada imediatamente."
                    >
                        <form onSubmit={executar} className="v2-painel v2-painel__corpo">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
                                <Campo rotulo="Contato" htmlFor="manual-contato" erro={form.errors.contato_id}>
                                    <select
                                        id="manual-contato"
                                        className="v2-entrada"
                                        value={form.data.contato_id}
                                        onChange={(evento) => {
                                            form.setData('contato_id', evento.target.value);
                                            form.clearErrors('contato_id');
                                        }}
                                        aria-invalid={Boolean(form.errors.contato_id)}
                                    >
                                        <option value="">Selecione um contato</option>
                                        {contatos.map((contato) => (
                                            <option key={contato.id} value={contato.id}>
                                                {nomeDoContato(contato)}
                                            </option>
                                        ))}
                                    </select>
                                </Campo>

                                <Campo rotulo="Fluxo ativo" htmlFor="manual-fluxo" erro={form.errors.fluxo_id}>
                                    <select
                                        id="manual-fluxo"
                                        className="v2-entrada"
                                        value={form.data.fluxo_id}
                                        onChange={(evento) => {
                                            form.setData('fluxo_id', evento.target.value);
                                            form.clearErrors('fluxo_id');
                                        }}
                                        aria-invalid={Boolean(form.errors.fluxo_id)}
                                    >
                                        <option value="">Selecione um fluxo</option>
                                        {fluxos.map((fluxo) => (
                                            <option key={fluxo.id} value={fluxo.id}>
                                                {fluxo.nome}
                                            </option>
                                        ))}
                                    </select>
                                </Campo>

                                <button type="submit" className="v2-btn v2-btn--primario" disabled={form.processing}>
                                    <Play aria-hidden="true" />
                                    {form.processing ? 'Executando…' : 'Executar agora'}
                                </button>
                            </div>
                        </form>

                        {filtroInativo && (
                            <div className="mt-3">
                                <Aviso tom="sucesso" titulo="Execução solicitada">
                                    O fluxo foi enfileirado. O andamento aparece em Atividade e nas mensagens do contato.
                                </Aviso>
                            </div>
                        )}
                    </Secao>

                    <Secao
                        id="painel-atividade"
                        titulo="Atividade"
                        nota="Eventos administrativos de suspensão não aparecem para a conta do cliente."
                    >
                        <div className="v2-painel">
                            {grupos.length === 0 ? (
                                <Vazio
                                    icone={CheckCircle2}
                                    titulo="Nenhum evento registrado"
                                    texto="A atividade aparece aqui conforme contatos, fluxos e agendamentos são executados."
                                />
                            ) : (
                                <ol className="v2-timeline">
                                    {grupos.map(([dia, itens]) => (
                                        <Fragment key={dia}>
                                            <li className="v2-timeline__grupo">{formatarDiaLongo(`${dia}T12:00:00`)}</li>
                                            {itens.map((log) => (
                                                <li key={log.id} className="v2-timeline__item">
                                                    <span className="v2-timeline__hora">{formatarHora(log.created_at)}</span>
                                                    <div className="v2-timeline__conteudo">
                                                        <p className="v2-timeline__evento">{log.evento}</p>
                                                        <p className="v2-timeline__descricao">{log.descricao}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </Fragment>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </Secao>
                </div>

                <aside className="min-w-0 space-y-5">
                    <Secao id="painel-conta" titulo="Sua conta">
                        <div className="v2-painel v2-painel__corpo space-y-2.5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium">Fluxos ativos</p>
                                    <p className="mt-0.5 text-[0.6875rem] text-[var(--v2-ink-2)]">
                                        {fluxos.length > 0
                                            ? fluxos.map((fluxo) => fluxo.nome).join(' · ')
                                            : 'Nenhum fluxo ativo no momento.'}
                                    </p>
                                </div>
                                <Chip tom={fluxos.length > 0 ? 'positivo' : 'atencao'}>
                                    {fluxos.length > 0 ? 'Em operação' : 'Sem fluxo'}
                                </Chip>
                            </div>
                            <div className="flex items-start justify-between gap-3 border-t border-[var(--v2-line)] pt-2.5">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium">Conexão do Messenger</p>
                                    <p className="mt-0.5 text-[0.6875rem] text-[var(--v2-ink-2)]">
                                        Token, Página e OAuth ficam em Configurações → Conexão.
                                    </p>
                                </div>
                                <Link href="/configuracoes/conexao" className="v2-btn v2-btn--contorno v2-btn--pequeno shrink-0">
                                    <Settings2 aria-hidden="true" />
                                    Abrir
                                </Link>
                            </div>
                        </div>
                    </Secao>

                    <Secao id="painel-contatos" titulo="Contatos" acoes={<Chip>{contatos.length}</Chip>}>
                        <TabelaArea rotulo="Contatos da conta">
                            <table className="v2-tabela v2-tabela--compacta">
                                <thead>
                                    <tr>
                                        <th scope="col">Contato</th>
                                        <th scope="col" className="text-right">Mensagens</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contatos.slice(0, 8).map((contato) => (
                                        <tr key={contato.id}>
                                            <th scope="row" className="text-left">
                                                <Link href={`/?contato=${contato.id}`} className="v2-tabela__principal hover:text-[var(--v2-destaque)]">
                                                    {nomeDoContato(contato)}
                                                </Link>
                                                <span className="v2-tabela__secundario v2-mono">{contato.psid}</span>
                                            </th>
                                            <td className="v2-numerico text-right">{contato.mensagens_count ?? 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TabelaArea>
                        {contatos.length === 0 && (
                            <p className="mt-2 v2-campo__ajuda">Os contatos aparecem aqui quando a Página receber a primeira mensagem.</p>
                        )}
                    </Secao>

                    <Secao id="painel-mensagens" titulo="Mensagens recentes" acoes={<Chip>{mensagens.length}</Chip>}>
                        <ul className="v2-lista v2-painel">
                            {mensagensRecentes.map((mensagem) => (
                                <li key={mensagem.id} className="v2-linha">
                                    <div className="v2-linha__corpo">
                                        <div className="v2-linha__titulo">
                                            <span className="v2-linha__nome">
                                                {mensagem.direcao === 'enviada' ? 'Enviada' : 'Recebida'} ·{' '}
                                                {nomeDoContato(mensagem.contato)}
                                            </span>
                                            <span className="v2-micro v2-numerico">{formatarHora(mensagem.created_at)}</span>
                                        </div>
                                        <p className="v2-linha__texto">{resumoMensagem(mensagem)}</p>
                                    </div>
                                </li>
                            ))}
                            {mensagensRecentes.length === 0 && (
                                <li className="v2-linha">
                                    <p className="text-xs text-[var(--v2-ink-2)]">Nenhuma mensagem registrada ainda.</p>
                                </li>
                            )}
                        </ul>
                    </Secao>
                </aside>
            </div>
        </div>
    );
}

Painel.layout = [LayoutV2];
