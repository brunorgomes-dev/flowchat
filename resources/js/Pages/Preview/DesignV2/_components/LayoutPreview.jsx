import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    Ban,
    CalendarClock,
    LayoutDashboard,
    LogIn,
    MessageCircle,
    MonitorSmartphone,
    Settings2,
    ShieldCheck,
    SlidersHorizontal,
    UserPlus,
    Users,
    Workflow,
} from 'lucide-react';
import { MarcaFlowChat } from '@/components/MarcaFlowChat';
import { NavegacaoV2 } from '@/components/v2/NavegacaoV2';
import { useBarraDeRolagemVisivel } from '@/components/v2/pecas';
import { definirPreferenciaTema, lerPreferenciaTema } from '@/lib/tema';
import { SeloLeitura } from './pecas';
import '@/components/v2/estilo-v2.css';

/**
 * Casca do preview de design V2.
 *
 * Reproduz a navegação da interface promovida, mas todos os dados são
 * fictícios e as ações apenas simulam o resultado. Nenhum dado real do
 * cliente é exibido aqui.
 */

const BASE = '/preview/design-v2';

const gruposDeNavegacao = [
    {
        titulo: 'Operação',
        itens: [
            { href: `${BASE}/painel`, rotulo: 'Painel', icone: LayoutDashboard },
            { href: `${BASE}/conversas`, rotulo: 'Conversas', icone: MessageCircle },
            { href: `${BASE}/agendamentos`, rotulo: 'Agendamentos', icone: CalendarClock },
        ],
    },
    {
        titulo: 'Automação',
        itens: [
            { href: `${BASE}/fluxos`, rotulo: 'Fluxos', icone: Workflow },
            { href: `${BASE}/fluxos/editor`, rotulo: 'Editor de fluxo', icone: SlidersHorizontal },
        ],
    },
    {
        titulo: 'Conta',
        itens: [
            {
                href: `${BASE}/configuracoes`,
                rotulo: 'Configurações',
                icone: Settings2,
                filhos: [
                    { href: `${BASE}/configuracoes`, rotulo: 'Geral' },
                    { href: `${BASE}/configuracoes/conexao`, rotulo: 'Conexão' },
                ],
            },
        ],
    },
    {
        titulo: 'Administração',
        itens: [
            { href: `${BASE}/admin/contas`, rotulo: 'Contas', icone: Users },
            { href: `${BASE}/admin/convites`, rotulo: 'Convites', icone: ShieldCheck },
        ],
    },
    {
        titulo: 'Entrada e estados',
        itens: [
            { href: `${BASE}/entrar`, rotulo: 'Login', icone: LogIn },
            { href: `${BASE}/cadastro`, rotulo: 'Cadastro e convite', icone: UserPlus },
            { href: `${BASE}/sessoes`, rotulo: 'Limite de sessões', icone: MonitorSmartphone },
            { href: `${BASE}/conta-suspensa`, rotulo: 'Conta suspensa', icone: Ban },
        ],
    },
];

const opcoesTema = [
    { valor: 'sistema', rotulo: 'Sistema' },
    { valor: 'claro', rotulo: 'Claro' },
    { valor: 'escuro', rotulo: 'Escuro' },
];

function telaAtual(caminho) {
    return gruposDeNavegacao
        .flatMap((grupo) => grupo.itens.flatMap((item) => (item.filhos
            ? item.filhos.map((filho) => ({ ...filho, rotulo: `${item.rotulo} · ${filho.rotulo}` }))
            : [item])))
        .filter((item) => caminho === item.href || caminho.startsWith(`${item.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

function AlternadorDeTema({ compacto = false }) {
    const [preferencia, setPreferencia] = useState(() => lerPreferenciaTema());

    const alterar = (valor) => {
        setPreferencia(valor);
        definirPreferenciaTema(valor);
    };

    return (
        <div className="v2-segmentado" role="group" aria-label="Tema da interface">
            {opcoesTema.map((opcao) => (
                <button
                    key={opcao.valor}
                    type="button"
                    aria-pressed={preferencia === opcao.valor}
                    onClick={() => alterar(opcao.valor)}
                >
                    {compacto && opcao.valor === 'sistema' ? 'Auto' : opcao.rotulo}
                </button>
            ))}
        </div>
    );
}

export default function LayoutPreview({ children, semNavegacao = false }) {
    const pagina = usePage();
    const caminho = (pagina.url ?? '').split('?')[0].replace(/\/$/, '');
    const atual = telaAtual(caminho);

    useBarraDeRolagemVisivel();

    if (semNavegacao) {
        return (
            <div className="v2-root">
                <a className="v2-pular" href="#conteudo-preview">
                    Ir para o conteúdo
                </a>
                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--v2-line)] bg-[var(--v2-surface)] px-3 py-1.5">
                    <Link href={BASE} className="v2-btn v2-btn--fantasma v2-btn--pequeno">
                        Mapa do preview
                    </Link>
                    <SeloLeitura />
                    <div className="ml-auto">
                        <AlternadorDeTema compacto />
                    </div>
                </div>
                <div id="conteudo-preview" className="v2-rolagem" style={{ height: 'calc(100dvh - 2.75rem)', overflowY: 'auto' }}>
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className="v2-root">
            <a className="v2-pular" href="#conteudo-preview">
                Ir para o conteúdo
            </a>

            <div className="v2-shell">
                <aside className="v2-rail">
                    <div className="v2-rail__marca">
                        <MarcaFlowChat tamanho="md" sombra={false} />
                        <span className="min-w-0">
                            <span className="v2-rail__marca-nome block">FlowChat</span>
                            <span className="v2-rail__marca-nota block">Preview de design · V2</span>
                        </span>
                    </div>

                    <NavegacaoV2 caminho={caminho} grupos={gruposDeNavegacao} />

                    <div className="v2-rail__rodape">
                        <p className="font-medium text-[var(--v2-rail-ink)]">Sessão de demonstração</p>
                        <p className="mt-0.5">Operador de demonstração</p>
                        <p className="v2-rail__status">
                            <span className="v2-ponto text-[var(--v2-areia)]" aria-hidden="true" />
                            Nenhuma escrita no banco
                        </p>
                        <Link
                            href="/painel"
                            className="mt-2 inline-flex items-center gap-1.5 underline underline-offset-2 hover:text-[var(--v2-rail-ink)]"
                        >
                            Interface real
                        </Link>
                    </div>
                </aside>

                <div className="v2-coluna">
                    <header className="v2-topo">
                        <div className="v2-topo__trilha">
                            <Link href={BASE} className="hover:text-[var(--v2-ink)]">
                                Preview V2
                            </Link>
                            <span aria-hidden="true">/</span>
                            <strong aria-current="page">{atual?.rotulo ?? 'Mapa do preview'}</strong>
                        </div>
                        <div className="v2-topo__acoes">
                            <SeloLeitura />
                            <AlternadorDeTema compacto />
                        </div>
                    </header>

                    <div className="v2-navegacao-movel" role="navigation" aria-label="Telas do preview V2 (compacto)">
                        {gruposDeNavegacao.flatMap((grupo) => grupo.itens).flatMap((item) => (item.filhos
                            ? item.filhos.map((filho) => ({ ...filho, rotulo: `${item.rotulo} · ${filho.rotulo}` }))
                            : [item])).map((item) => (
                                <Link key={`${item.href}-${item.rotulo}`} href={item.href} aria-current={caminho === item.href ? 'page' : undefined}>
                                    {item.rotulo}
                                </Link>
                            ))}
                    </div>

                    <main id="conteudo-preview" className="v2-principal">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
