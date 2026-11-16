import { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    Ban,
    CheckCircle2,
    CircleAlert,
    Inbox,
    LoaderCircle,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import LayoutPreview from './_components/LayoutPreview';
import {
    Aviso,
    CabecalhoPagina,
    Chip,
    Dialogo,
    Esqueleto,
    Secao,
    SeloDemo,
    SeloLeitura,
    TabelaArea,
    Vazio,
} from './_components/pecas';

const BASE = '/preview/design-v2';

const telasCobertas = [
    {
        tela: 'Painel e atividade',
        rota: '/painel',
        link: `${BASE}/painel`,
        cobertura: 'Métricas, execução manual, contatos, mensagens recentes e linha do tempo de atividade.',
        limite: 'Números e eventos fictícios; a execução manual não inicia fluxo.',
    },
    {
        tela: 'Conversas',
        rota: '/conversas',
        link: `${BASE}/conversas`,
        cobertura: 'Busca, filtro por origem, lista densa, conversa, detalhes do contato, cartão de anúncio e compositor com contador.',
        limite: 'Paginação e envio de resposta são simulados.',
    },
    {
        tela: 'Histórico do contato',
        rota: '/contatos/{contato}/historico',
        link: `${BASE}/conversas/historico`,
        cobertura: 'Cabeçalho do contato, cronologia completa, anexos e retorno à conversa.',
        limite: 'Carregamento de páginas anteriores simulado.',
    },
    {
        tela: 'Fluxos',
        rota: '/fluxos',
        link: `${BASE}/fluxos`,
        cobertura: 'Resumo, pesquisa, filtros por estado, tabela operacional, detalhes do fluxo e exclusão bloqueada por registros.',
        limite: 'Criar, editar e excluir não persistem.',
    },
    {
        tela: 'Editor de fluxo',
        rota: '/fluxos/criar e /fluxos/{fluxo}/editar',
        link: `${BASE}/fluxos/editor`,
        cobertura: 'Nome, estado, gatilhos, janela de horário, etapas, cinco tipos de conteúdo, variáveis, indicador de digitação, pausa, encerramento, condição por horário, prévia e resumo.',
        limite: 'Arquivos não são enviados e as validações do servidor não executam.',
    },
    {
        tela: 'Agendamentos',
        rota: '/agendamentos',
        link: `${BASE}/agendamentos`,
        cobertura: 'Formulário, filtros por estado, tabela e cancelamento de pendentes.',
        limite: 'Nada é criado ou cancelado; o fuso é ilustrativo.',
    },
    {
        tela: 'Configurações',
        rota: '/configuracoes',
        link: `${BASE}/configuracoes`,
        cobertura: 'Tema (funcional no navegador), fuso com hora local, integração Messenger conectada e formulário manual.',
        limite: 'Salvar fuso e integração não grava; a lista de fusos é uma amostra.',
    },
    {
        tela: 'Administração de contas',
        rota: '/admin/convites',
        link: `${BASE}/admin/contas`,
        cobertura: 'Busca, filtros, tabela com último acesso e suspensão/reativação com motivo e responsável.',
        limite: 'Restrita a administrador da plataforma; suspensão é simulada.',
    },
    {
        tela: 'Administração de convites',
        rota: '/admin/convites/emitir',
        link: `${BASE}/admin/convites`,
        cobertura: 'Formulário de emissão, link de exemplo, histórico com emissão/validade/resgate/revogação e revogação.',
        limite: 'Mock estático lido da fixture; nenhum convite é criado.',
    },
    {
        tela: 'Login, cadastro e sessões',
        rota: '/login, /cadastro e /login/sessoes',
        link: `${BASE}/entrar`,
        cobertura: 'Formulários, erros de validação locais, aceite de convite com email travado e limite de duas sessões.',
        limite: 'As páginas públicas reais não foram alteradas nem duplicadas em rota própria.',
    },
    {
        tela: 'Conta suspensa',
        rota: '/conta-suspensa',
        link: `${BASE}/conta-suspensa`,
        cobertura: 'Mensagem de orientação e caminho de contato.',
        limite: 'Página pública ilustrativa, sem sessão real.',
    },
    {
        tela: 'Escolher Página do Messenger',
        rota: '/configuracoes/messenger/paginas',
        link: `${BASE}/messenger/paginas`,
        cobertura: 'Lista de Páginas, conexão e cancelamento.',
        limite: 'Depende do retorno real do OAuth; aqui a lista é fictícia.',
    },
];

export default function Mapa() {
    const [dialogoAberto, setDialogoAberto] = useState(false);
    const [confirmado, setConfirmado] = useState(false);

    const confirmar = () => {
        setDialogoAberto(false);
        setConfirmado(true);
        toast.success('Ação simulada', {
            description: 'Nenhum dado foi alterado. O preview é somente leitura.',
        });
    };

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Preview de design — V2"
                descricao="Uma proposta visual para a operação diária do FlowChat: navegação mais clara, densidade maior e estados explícitos. Todas as telas abaixo usam dados fictícios e ficam fora da interface em produção."
                nota={
                    <div className="flex flex-wrap items-center gap-2">
                        <SeloLeitura />
                        <SeloDemo />
                    </div>
                }
                acoes={
                    <>
                        <Link href={`${BASE}/painel`} className="v2-btn v2-btn--primario">
                            Começar pelo painel
                            <ArrowRight aria-hidden="true" />
                        </Link>
                        <Link href="/painel" className="v2-btn v2-btn--contorno">
                            Interface atual
                        </Link>
                    </>
                }
            />

            <Aviso tom="info" titulo="Como comparar">
                Abra a interface atual em outra aba e percorra as mesmas tarefas aqui. A V2 preserva os campos, opções e
                regras de cada tela; o que muda é hierarquia, tipografia, espaçamento e o desenho dos estados. Nenhum
                formulário envia dados, nenhum job é criado e nenhuma chamada é feita à Meta.
            </Aviso>

            <Secao
                id="mapa-telas"
                titulo="Telas cobertas"
                nota="Cada linha indica a rota original correspondente e o limite conhecido do preview."
            >
                <TabelaArea rotulo="Telas cobertas pelo preview">
                    <table className="v2-tabela">
                        <thead>
                            <tr>
                                <th scope="col">Tela</th>
                                <th scope="col">Rota original</th>
                                <th scope="col">Cobertura na V2</th>
                                <th scope="col">Limite</th>
                                <th scope="col">
                                    <span className="v2-oculto-visual">Abrir</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {telasCobertas.map((item) => (
                                <tr key={item.tela}>
                                    <th scope="row" className="v2-tabela__principal text-left">
                                        {item.tela}
                                    </th>
                                    <td className="v2-mono text-[var(--v2-ink-2)]">{item.rota}</td>
                                    <td className="max-w-[22rem] text-[var(--v2-ink-2)]">{item.cobertura}</td>
                                    <td className="max-w-[18rem] text-[var(--v2-ink-3)]">{item.limite}</td>
                                    <td>
                                        <div className="v2-tabela__acoes">
                                            <Link href={item.link} className="v2-btn v2-btn--fantasma v2-btn--pequeno">
                                                Abrir
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TabelaArea>
            </Secao>

            <Secao
                id="mapa-estados"
                titulo="Estados e feedback"
                nota="Os mesmos padrões aparecem nas telas: vazio, carregando, erro, confirmação e aviso global."
            >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="v2-painel">
                        <div className="v2-painel__cabecalho">
                            <h3 className="text-[0.8125rem] font-semibold">Vazio</h3>
                            <Chip>Sem resultados</Chip>
                        </div>
                        <div className="v2-painel__corpo">
                            <Vazio
                                icone={Inbox}
                                titulo="Nenhuma conversa encontrada"
                                texto="Ajuste a busca ou volte para todas as conversas. O estado vazio sempre indica a próxima ação."
                            />
                        </div>
                    </div>

                    <div className="v2-painel">
                        <div className="v2-painel__cabecalho">
                            <h3 className="text-[0.8125rem] font-semibold">Carregando</h3>
                            <Chip>
                                <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
                                Em andamento
                            </Chip>
                        </div>
                        <div className="v2-painel__corpo v2-painel__corpo--sem-espaco">
                            <Esqueleto linhas={4} />
                        </div>
                    </div>

                    <div className="v2-painel">
                        <div className="v2-painel__cabecalho">
                            <h3 className="text-[0.8125rem] font-semibold">Erro</h3>
                            <Chip tom="erro">
                                <CircleAlert className="size-3" aria-hidden="true" />
                                Falha
                            </Chip>
                        </div>
                        <div className="v2-painel__corpo space-y-3">
                            <Aviso tom="erro" titulo="Não foi possível atualizar a lista">
                                Verifique a ligação e tente novamente. As mensagens já carregadas continuam visíveis.
                            </Aviso>
                            <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno">
                                Tentar novamente
                            </button>
                        </div>
                    </div>

                    <div className="v2-painel">
                        <div className="v2-painel__cabecalho">
                            <h3 className="text-[0.8125rem] font-semibold">Confirmação</h3>
                            <Chip tom="atencao">Ação destrutiva</Chip>
                        </div>
                        <div className="v2-painel__corpo space-y-3">
                            <p className="text-xs leading-5 text-[var(--v2-ink-2)]">
                                O diálogo descreve o efeito, mantém o foco dentro do painel e fecha com Escape.
                            </p>
                            <button
                                type="button"
                                className="v2-btn v2-btn--perigo v2-btn--pequeno"
                                onClick={() => setDialogoAberto(true)}
                            >
                                <Trash2 aria-hidden="true" />
                                Testar confirmação
                            </button>
                        </div>
                    </div>

                    <div className="v2-painel">
                        <div className="v2-painel__cabecalho">
                            <h3 className="text-[0.8125rem] font-semibold">Feedback</h3>
                            <Chip tom="positivo">Aviso global</Chip>
                        </div>
                        <div className="v2-painel__corpo space-y-3">
                            <p className="text-xs leading-5 text-[var(--v2-ink-2)]">
                                A confirmação usa o aviso global já existente no FlowChat, com a ressalva de simulação.
                            </p>
                            <button
                                type="button"
                                className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                onClick={() => toast.success('Ação simulada', { description: 'Nada foi gravado no banco.' })}
                            >
                                <CheckCircle2 aria-hidden="true" />
                                Disparar feedback
                            </button>
                        </div>
                    </div>

                    <div className="v2-painel">
                        <div className="v2-painel__cabecalho">
                            <h3 className="text-[0.8125rem] font-semibold">Controles desativados</h3>
                            <Chip>Somente leitura</Chip>
                        </div>
                        <div className="v2-painel__corpo space-y-3">
                            <p className="text-xs leading-5 text-[var(--v2-ink-2)]">
                                Controles que gravariam dados continuam visíveis, com explicação ao lado. Nada é enviado.
                            </p>
                            <button type="button" className="v2-btn v2-btn--primario v2-btn--pequeno" aria-disabled="true">
                                Salvar alterações
                            </button>
                        </div>
                    </div>
                </div>
            </Secao>

            <Secao id="mapa-isolamento" titulo="Isolamento e segurança">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="v2-painel v2-painel__corpo space-y-2 text-[0.8125rem] leading-6">
                        <p className="flex items-start gap-2">
                            <ShieldCheck className="mt-1 size-4 shrink-0 text-[var(--v2-destaque)]" aria-hidden="true" />
                            As rotas vivem em <code className="v2-mono">/preview/design-v2/</code> e exigem sessão
                            autenticada, conta ativa e a opção <code className="v2-mono">FLOWCHAT_PREVIEW_DESIGN_V2</code>.
                        </p>
                        <p className="flex items-start gap-2">
                            <ShieldCheck className="mt-1 size-4 shrink-0 text-[var(--v2-destaque)]" aria-hidden="true" />
                            Fora do ambiente local a área fica desativada por padrão e responde 404.
                        </p>
                        <p className="flex items-start gap-2">
                            <ShieldCheck className="mt-1 size-4 shrink-0 text-[var(--v2-destaque)]" aria-hidden="true" />
                            As telas administrativas também exigem a autorização de administrador da plataforma.
                        </p>
                    </div>
                    <div className="v2-painel v2-painel__corpo space-y-2 text-[0.8125rem] leading-6">
                        <p className="flex items-start gap-2">
                            <Ban className="mt-1 size-4 shrink-0 text-[var(--v2-perigo)]" aria-hidden="true" />
                            Nenhuma migration, seed, job, webhook, e-mail ou chamada à Graph API é executada.
                        </p>
                        <p className="flex items-start gap-2">
                            <Ban className="mt-1 size-4 shrink-0 text-[var(--v2-perigo)]" aria-hidden="true" />
                            Nenhum PSID, token, email ou conversa real é usado: tudo vem de fixtures em
                            <code className="v2-mono"> _data/demonstracao.js</code>.
                        </p>
                        <p className="flex items-start gap-2">
                            <Ban className="mt-1 size-4 shrink-0 text-[var(--v2-perigo)]" aria-hidden="true" />
                            As páginas, rotas e estilos originais não foram alterados; a V2 tem casca, navegação e
                            folha de estilo próprias.
                        </p>
                    </div>
                </div>
            </Secao>

            <Dialogo
                aberto={dialogoAberto}
                titulo="Remover este item?"
                descricao="Esta é uma confirmação de demonstração. Na interface real, a ação correspondente removeria o item selecionado."
                icone={Trash2}
                aoFechar={() => setDialogoAberto(false)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setDialogoAberto(false)}>
                            Cancelar
                        </button>
                        <button type="button" className="v2-btn v2-btn--perigo" onClick={confirmar}>
                            Simular remoção
                        </button>
                    </>
                }
            >
                {confirmado && (
                    <Aviso tom="sucesso" titulo="Confirmação registrada apenas na tela">
                        Nenhuma linha foi alterada no banco de dados.
                    </Aviso>
                )}
                {!confirmado && (
                    <p className="text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                        O foco fica no painel, o fundo não recebe cliques e a tecla Escape fecha o diálogo.
                    </p>
                )}
            </Dialogo>
        </div>
    );
}

Mapa.layout = [LayoutPreview];
