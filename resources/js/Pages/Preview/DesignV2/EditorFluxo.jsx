import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    AudioLines,
    Braces,
    ChevronLeft,
    ChevronRight,
    Clock3,
    FileText,
    Image as ImageIcon,
    Info,
    Keyboard,
    PauseCircle,
    Plus,
    Split,
    Trash2,
    Type,
    Upload,
    Video,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import LayoutPreview from './_components/LayoutPreview';
import {
    Aviso,
    CabecalhoPagina,
    Campo,
    Chip,
    Dialogo,
    Interruptor,
    Secao,
    SeloDemo,
    SeloLeitura,
} from './_components/pecas';
import { contatos, fluxos, nomeDoContato, rotulosTipoConteudo } from './_data/demonstracao';

const tiposConteudo = [
    { valor: 'texto', rotulo: 'Texto', icone: Type },
    { valor: 'imagem', rotulo: 'Imagem', icone: ImageIcon },
    { valor: 'audio', rotulo: 'Áudio', icone: AudioLines },
    { valor: 'video', rotulo: 'Vídeo', icone: Video },
    { valor: 'arquivo', rotulo: 'Arquivo', icone: FileText },
];

const arquivosDeExemplo = {
    imagem: { nome: 'demo-vestido-terracota.jpg', tamanho: '402 KB', limite: 'JPG, PNG ou GIF · até 8 MB' },
    audio: { nome: 'demo-audio-boas-vindas.mp3', tamanho: '1,2 MB', limite: 'MP3, M4A, AAC ou WAV · até 25 MB' },
    video: { nome: 'demo-video-colecao.mp4', tamanho: '8,4 MB', limite: 'MP4, MOV, AVI, WEBM ou OGG · até 25 MB' },
    arquivo: { nome: 'demo-catalogo-primavera.pdf', tamanho: '1,8 MB', limite: 'PDF, DOC, XLS, PPT, TXT, CSV ou ZIP · até 25 MB' },
};

const opcoesForaHorario = [
    { valor: 'nao_iniciar', rotulo: 'Não iniciar', descricao: 'Fora da janela, o fluxo simplesmente não começa.' },
    { valor: 'aguardar', rotulo: 'Aguardar', descricao: 'A execução fica pendente até a próxima abertura da janela.' },
];

const variaveis = [
    { valor: '{{nome}}', rotulo: 'Nome do contato' },
    { valor: '{{psid}}', rotulo: 'PSID do contato' },
];

const fluxoBase = fluxos[0];
const contatoDemonstracao = contatos[0];

function copiarEtapas(etapas) {
    return etapas.map((etapa) => ({ ...etapa, condicoes: etapa.condicoes?.map((condicao) => ({ ...condicao })) }));
}

export default function EditorFluxo() {
    const [nome, setNome] = useState(fluxoBase.nome);
    const [ativo, setAtivo] = useState(fluxoBase.ativo);
    const [etapas, setEtapas] = useState(() => copiarEtapas(fluxoBase.etapas));
    const [selecionada, setSelecionada] = useState(0);
    const [gatilhos, setGatilhos] = useState({ novo_contato: true, mensagem_recebida: true });
    const [horario, setHorario] = useState({ ...fluxoBase.horario });
    const [alterado, setAlterado] = useState(false);
    const [dialogoExcluir, setDialogoExcluir] = useState(false);
    const [dialogoDescarte, setDialogoDescarte] = useState(false);
    const [dialogoSaida, setDialogoSaida] = useState(false);
    const [unidadePausa, setUnidadePausa] = useState('segundos');

    const etapa = etapas[selecionada] ?? null;

    const resumo = useMemo(() => ({
        pausas: etapas.filter((item) => Number(item.pausa_segundos) > 0).length,
        digitando: etapas.filter((item) => item.indicador_digitacao_ativo).length,
        condicoes: etapas.filter((item) => item.tipo === 'condicao_horario').length,
        gatilhos: Object.entries(gatilhos).filter(([, ativoNoGatilho]) => ativoNoGatilho).map(([chave]) => chave),
    }), [etapas, gatilhos]);

    const marcar = () => setAlterado(true);

    const atualizar = (campo, valor) => {
        setEtapas((atuais) => atuais.map((item, indice) => (indice === selecionada ? { ...item, [campo]: valor } : item)));
        marcar();
    };

    const atualizarCondicao = (indiceCondicao, campo, valor) => {
        setEtapas((atuais) => atuais.map((item, indice) => {
            if (indice !== selecionada) {
                return item;
            }

            return {
                ...item,
                condicoes: item.condicoes.map((condicao, posicao) => (
                    posicao === indiceCondicao ? { ...condicao, [campo]: valor } : condicao
                )),
            };
        }));
        marcar();
    };

    const adicionarEtapa = () => {
        setEtapas((atuais) => [
            ...atuais,
            {
                id: Date.now(),
                ordem: atuais.length + 1,
                tipo: 'mensagem',
                tipo_conteudo: 'texto',
                texto: '',
                pausa_segundos: 0,
                indicador_digitacao_ativo: false,
                indicador_digitacao_segundos: 2,
            },
        ]);
        setSelecionada(etapas.length);
        marcar();
    };

    const adicionarCondicao = () => {
        setEtapas((atuais) => [
            ...atuais,
            {
                id: Date.now(),
                ordem: atuais.length + 1,
                tipo: 'condicao_horario',
                tipo_conteudo: 'texto',
                texto: '',
                condicoes: [{ inicio: '08:00', fim: '12:00', destino_ordem: atuais.length + 2 }],
                destino_nao_ordem: null,
                pausa_segundos: 0,
                indicador_digitacao_ativo: false,
                indicador_digitacao_segundos: 2,
            },
        ]);
        setSelecionada(etapas.length);
        marcar();
    };

    const removerEtapa = () => {
        setEtapas((atuais) => atuais.filter((_, indice) => indice !== selecionada));
        setSelecionada((atual) => Math.max(0, Math.min(atual, etapas.length - 2)));
        setDialogoExcluir(false);
        marcar();
    };

    const alterarTipoConteudo = (valor) => {
        setEtapas((atuais) => atuais.map((item, indice) => {
            if (indice !== selecionada) {
                return item;
            }

            if (valor === 'texto') {
                return {
                    ...item,
                    tipo_conteudo: 'texto',
                    anexo_nome_original: null,
                    anexo_tamanho_bytes: null,
                };
            }

            const arquivo = arquivosDeExemplo[valor];

            return {
                ...item,
                tipo_conteudo: valor,
                texto: '',
                anexo_nome_original: arquivo.nome,
                anexo_tamanho_bytes: null,
            };
        }));
        marcar();
    };

    const mostrarPrevia = (texto) => (texto ?? '')
        .replaceAll('{{nome}}', nomeDoContato(contatoDemonstracao))
        .replaceAll('{{psid}}', contatoDemonstracao.psid);

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo={fluxoBase.nome}
                descricao="Editor em três colunas: estrutura à esquerda, etapa selecionada no centro e prévia à direita. A ordem das etapas é uma sequência real, por isso recebe numeração."
                nota={
                    <div className="flex flex-wrap items-center gap-2">
                        <SeloLeitura />
                        <SeloDemo />
                        <Chip tom={alterado ? 'atencao' : 'positivo'}>
                            {alterado ? 'Alterações não salvas' : 'Salvo com sucesso'}
                        </Chip>
                    </div>
                }
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setDialogoSaida(true)}>
                            <ChevronLeft aria-hidden="true" />
                            Voltar aos fluxos
                        </button>
                        <button
                            type="button"
                            className="v2-btn v2-btn--fantasma"
                            onClick={() => {
                                setEtapas(copiarEtapas(fluxoBase.etapas));
                                setNome(fluxoBase.nome);
                                setAtivo(fluxoBase.ativo);
                                setSelecionada(0);
                                setHorario({ ...fluxoBase.horario });
                                setGatilhos({ novo_contato: true, mensagem_recebida: true });
                                setAlterado(false);
                                toast.info('Alterações locais descartadas');
                            }}
                        >
                            Descartar
                        </button>
                    </>
                }
            />

            <div className="v2-editor mt-5">
                <div className="space-y-4">
                    <div className="v2-painel">
                        <div className="v2-painel__cabecalho">
                            <h2 className="v2-secao__titulo" id="editor-estrutura">
                                Estrutura
                            </h2>
                        </div>
                        <div className="v2-painel__corpo space-y-3">
                            <Campo rotulo="Nome do fluxo" htmlFor="fluxo-nome" ajuda="Aparece na lista de fluxos e no histórico.">
                                <input
                                    id="fluxo-nome"
                                    className="v2-entrada"
                                    value={nome}
                                    maxLength={255}
                                    onChange={(evento) => {
                                        setNome(evento.target.value);
                                        marcar();
                                    }}
                                />
                            </Campo>

                            <Interruptor
                                id="fluxo-ativo"
                                marcado={ativo}
                                aoAlterar={(valor) => {
                                    setAtivo(valor);
                                    marcar();
                                }}
                                titulo="Fluxo ativo"
                                descricao="Somente fluxos ativos iniciam automaticamente."
                            />

                            <fieldset>
                                <legend className="v2-campo__rotulo mb-1.5">Gatilhos que iniciam o fluxo</legend>
                                <div className="space-y-2">
                                    {[
                                        { valor: 'novo_contato', rotulo: 'Novo contato', descricao: 'Primeiro contato do PSID.' },
                                        { valor: 'mensagem_recebida', rotulo: 'Mensagem recebida', descricao: 'Qualquer mensagem, sem execução em andamento.' },
                                    ].map((opcao) => (
                                        <label key={opcao.valor} className="flex items-start gap-2 text-[0.8125rem]">
                                            <input
                                                type="checkbox"
                                                className="mt-1 size-4 accent-[var(--v2-primario)]"
                                                checked={gatilhos[opcao.valor]}
                                                onChange={(evento) => {
                                                    setGatilhos((atuais) => ({ ...atuais, [opcao.valor]: evento.target.checked }));
                                                    marcar();
                                                }}
                                            />
                                            <span>
                                                <span className="font-medium">{opcao.rotulo}</span>
                                                <span className="block text-[0.6875rem] text-[var(--v2-ink-2)]">{opcao.descricao}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="border-t border-[var(--v2-line)] pt-3">
                                <Interruptor
                                    id="horario-ativo"
                                    marcado={horario.ativo}
                                    aoAlterar={(valor) => {
                                        setHorario((atual) => ({ ...atual, ativo: valor }));
                                        marcar();
                                    }}
                                    titulo="Janela de horário"
                                    descricao="Avaliada no fuso confirmado da conta."
                                />
                                {horario.ativo && (
                                    <div className="mt-3 space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Campo rotulo="Início" htmlFor="horario-inicio">
                                                <input
                                                    id="horario-inicio"
                                                    type="time"
                                                    step={60}
                                                    className="v2-entrada v2-numerico"
                                                    value={horario.inicio}
                                                    onChange={(evento) => {
                                                        setHorario((atual) => ({ ...atual, inicio: evento.target.value }));
                                                        marcar();
                                                    }}
                                                />
                                            </Campo>
                                            <Campo rotulo="Fim" htmlFor="horario-fim">
                                                <input
                                                    id="horario-fim"
                                                    type="time"
                                                    step={60}
                                                    className="v2-entrada v2-numerico"
                                                    value={horario.fim}
                                                    onChange={(evento) => {
                                                        setHorario((atual) => ({ ...atual, fim: evento.target.value }));
                                                        marcar();
                                                    }}
                                                />
                                            </Campo>
                                        </div>
                                        <fieldset>
                                            <legend className="v2-campo__rotulo mb-1.5">Fora do horário</legend>
                                            <div className="grid gap-2">
                                                {opcoesForaHorario.map((opcao) => (
                                                    <label
                                                        key={opcao.valor}
                                                        className={`flex cursor-pointer items-start gap-2 border p-2 ${
                                                            horario.foraHorario === opcao.valor
                                                                ? 'border-[var(--v2-terracota)] bg-[color-mix(in_oklab,var(--v2-terracota)_8%,var(--v2-surface))]'
                                                                : 'border-[var(--v2-line)]'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="fora-horario"
                                                            className="mt-0.5 accent-[var(--v2-primario)]"
                                                            checked={horario.foraHorario === opcao.valor}
                                                            onChange={() => {
                                                                setHorario((atual) => ({ ...atual, foraHorario: opcao.valor }));
                                                                marcar();
                                                            }}
                                                        />
                                                        <span>
                                                            <span className="block text-[0.75rem] font-medium">{opcao.rotulo}</span>
                                                            <span className="block text-[0.6875rem] leading-4 text-[var(--v2-ink-2)]">
                                                                {opcao.descricao}
                                                            </span>
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </fieldset>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <Secao
                        id="editor-etapas"
                        titulo="Etapas"
                        acoes={
                            <div className="flex gap-1">
                                <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno" onClick={adicionarCondicao}>
                                    <Clock3 aria-hidden="true" />
                                    Condição
                                </button>
                                <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno" onClick={adicionarEtapa}>
                                    <Plus aria-hidden="true" />
                                    Etapa
                                </button>
                            </div>
                        }
                    >
                        <div className="v2-painel v2-painel__corpo--sem-espaco">
                            {etapas.length === 0 ? (
                                <div className="p-4">
                                    <p className="text-[0.8125rem] font-medium">Ainda não há etapas</p>
                                    <p className="mt-0.5 text-xs text-[var(--v2-ink-2)]">
                                        Adicione uma etapa para começar a editar o conteúdo.
                                    </p>
                                    <button type="button" className="v2-btn v2-btn--contorno v2-btn--pequeno mt-3" onClick={adicionarEtapa}>
                                        <Plus aria-hidden="true" />
                                        Adicionar etapa
                                    </button>
                                </div>
                            ) : (
                                <ol className="v2-etapas">
                                    {etapas.map((item, indice) => (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                className="v2-etapa"
                                                aria-current={indice === selecionada}
                                                onClick={() => setSelecionada(indice)}
                                            >
                                                <span className="v2-etapa__numero">{indice + 1}</span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="v2-etapa__titulo">
                                                        {item.tipo === 'condicao_horario' ? 'Condição por horário' : `Etapa ${indice + 1}`}
                                                    </span>
                                                    <span className="v2-etapa__meta">
                                                        {item.tipo === 'condicao_horario'
                                                            ? `${item.condicoes?.length ?? 0} intervalos`
                                                            : `${rotulosTipoConteudo[item.tipo_conteudo] ?? 'Texto'} · ${
                                                                item.texto?.trim() ? `${item.texto.slice(0, 28)}…` : 'sem texto'
                                                            }`}
                                                    </span>
                                                </span>
                                                {item.encerra_apos && <Chip tom="atencao">fim</Chip>}
                                            </button>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </Secao>
                </div>

                <div className="min-w-0">
                    {etapa ? (
                        <div className="v2-painel">
                            <div className="v2-painel__cabecalho">
                                <div>
                                    <p className="v2-micro">
                                        Etapa {selecionada + 1} de {etapas.length}
                                    </p>
                                    <h2 className="text-[0.9375rem] font-semibold">
                                        {etapa.tipo === 'condicao_horario' ? 'Ramificação por horário' : 'Conteúdo da mensagem'}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        className="v2-btn v2-btn--fantasma v2-btn--pequeno"
                                        onClick={() => setSelecionada((atual) => Math.max(0, atual - 1))}
                                        disabled={selecionada === 0}
                                    >
                                        <ChevronLeft aria-hidden="true" />
                                        Anterior
                                    </button>
                                    <button
                                        type="button"
                                        className="v2-btn v2-btn--fantasma v2-btn--pequeno"
                                        onClick={() => setSelecionada((atual) => Math.min(etapas.length - 1, atual + 1))}
                                        disabled={selecionada >= etapas.length - 1}
                                    >
                                        Próxima
                                        <ChevronRight aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        className="v2-btn v2-btn--perigo v2-btn--pequeno"
                                        onClick={() => setDialogoExcluir(true)}
                                    >
                                        <Trash2 aria-hidden="true" />
                                        Remover
                                    </button>
                                </div>
                            </div>

                            <div className="v2-painel__corpo space-y-4">
                                {etapa.tipo === 'condicao_horario' ? (
                                    <EditorCondicao
                                        etapa={etapa}
                                        etapas={etapas}
                                        indice={selecionada}
                                        aoAlterarCondicao={atualizarCondicao}
                                        aoAlterarEtapa={atualizar}
                                    />
                                ) : (
                                    <>
                                        <div>
                                            <span className="v2-campo__rotulo mb-1.5 block">Tipo de conteúdo</span>
                                            <div className="flex flex-wrap gap-1">
                                                {tiposConteudo.map((tipo) => {
                                                    const Icone = tipo.icone;
                                                    const selecionado = itemIgual(etapa.tipo_conteudo, tipo.valor);

                                                    return (
                                                        <button
                                                            key={tipo.valor}
                                                            type="button"
                                                            className={`v2-btn v2-btn--pequeno ${
                                                                selecionado ? 'v2-btn--primario' : 'v2-btn--contorno'
                                                            }`}
                                                            aria-pressed={selecionado}
                                                            onClick={() => alterarTipoConteudo(tipo.valor)}
                                                        >
                                                            <Icone aria-hidden="true" />
                                                            {tipo.rotulo}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {etapa.tipo_conteudo !== 'texto' && (
                                            <div className="space-y-2">
                                                {etapa.anexo_nome_original ? (
                                                    <div className="v2-anexo m-0">
                                                        <span className="v2-anexo__icone">
                                                            <FileText className="size-3.5" aria-hidden="true" />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[0.75rem] font-medium">
                                                                {etapa.anexo_nome_original}
                                                            </span>
                                                            <span className="block text-[0.6875rem] text-[var(--v2-ink-2)]">
                                                                {arquivosDeExemplo[etapa.tipo_conteudo]?.tamanho} ·{' '}
                                                                {arquivosDeExemplo[etapa.tipo_conteudo]?.limite}
                                                            </span>
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="flex w-full flex-col items-center gap-1.5 border border-dashed border-[var(--v2-line-forte)] bg-[var(--v2-surface)] px-3 py-5 text-center hover:border-[var(--v2-terracota)]"
                                                        onClick={() => {
                                                            const arquivo = arquivosDeExemplo[etapa.tipo_conteudo];
                                                            atualizar('anexo_nome_original', arquivo.nome);
                                                        }}
                                                    >
                                                        <Upload className="size-4 text-[var(--v2-destaque)]" aria-hidden="true" />
                                                        <span className="text-[0.8125rem] font-medium">
                                                            Selecionar {rotulosTipoConteudo[etapa.tipo_conteudo]?.toLowerCase()}
                                                        </span>
                                                        <span className="text-[0.6875rem] text-[var(--v2-ink-2)]">
                                                            {arquivosDeExemplo[etapa.tipo_conteudo]?.limite}
                                                        </span>
                                                    </button>
                                                )}
                                                <div className="flex flex-wrap gap-1">
                                                    <button
                                                        type="button"
                                                        className="v2-btn v2-btn--contorno v2-btn--pequeno"
                                                        onClick={() => {
                                                            const arquivo = arquivosDeExemplo[etapa.tipo_conteudo];
                                                            atualizar('anexo_nome_original', arquivo.nome);
                                                            toast.info('Arquivo de demonstração selecionado', {
                                                                description: 'Nenhum upload é feito no preview.',
                                                            });
                                                        }}
                                                    >
                                                        <Upload aria-hidden="true" />
                                                        Substituir arquivo
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="v2-btn v2-btn--perigo v2-btn--pequeno"
                                                        onClick={() => atualizar('anexo_nome_original', null)}
                                                    >
                                                        <X aria-hidden="true" />
                                                        Remover mídia
                                                    </button>
                                                </div>
                                                <p className="v2-campo__ajuda flex items-start gap-1">
                                                    <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                                                    O arquivo real fica em armazenamento privado e é enviado como anexo
                                                    reutilizável da Página. O preview não abre o seletor de arquivos.
                                                </p>
                                            </div>
                                        )}

                                        <div>
                                            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                                <label className="v2-campo__rotulo" htmlFor="etapa-texto">
                                                    {etapa.tipo_conteudo === 'texto' ? 'Texto' : 'Texto (não suportado junto com mídia)'}
                                                </label>
                                                <details className="relative">
                                                    <summary className="v2-btn v2-btn--contorno v2-btn--pequeno list-none">
                                                        <Braces aria-hidden="true" />
                                                        Inserir variável
                                                    </summary>
                                                    <div className="absolute right-0 z-20 mt-1 w-56 border border-[var(--v2-line-forte)] bg-[var(--v2-surface)] p-1 shadow-lg">
                                                        {variaveis.map((variavel) => (
                                                            <button
                                                                key={variavel.valor}
                                                                type="button"
                                                                className="block w-full px-2 py-1.5 text-left text-[0.75rem] hover:bg-[var(--v2-surface-2)]"
                                                                onClick={() => {
                                                                    atualizar('texto', `${etapa.texto ?? ''} ${variavel.valor}`.trim());
                                                                }}
                                                            >
                                                                <span className="block font-medium">{variavel.rotulo}</span>
                                                                <span className="v2-mono block text-[var(--v2-ink-2)]">{variavel.valor}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </details>
                                            </div>
                                            <textarea
                                                id="etapa-texto"
                                                className="v2-entrada"
                                                rows={6}
                                                value={etapa.texto ?? ''}
                                                onChange={(evento) => atualizar('texto', evento.target.value)}
                                                placeholder={
                                                    etapa.tipo_conteudo === 'texto'
                                                        ? 'Escreva a mensagem desta etapa…'
                                                        : 'Deixe vazio para enviar apenas a mídia…'
                                                }
                                            />
                                            {etapa.tipo_conteudo !== 'texto' && etapa.texto?.trim() ? (
                                                <p className="v2-campo__erro" role="alert">
                                                    A Meta aceita texto ou anexo, mas não ambos neste formato. Remova o texto ou
                                                    use uma etapa de texto.
                                                </p>
                                            ) : (
                                                <p className="v2-campo__ajuda">
                                                    As variáveis {'{{nome}}'} e {'{{psid}}'} são substituídas no envio.
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-3 border-t border-[var(--v2-line)] pt-3">
                                            <Interruptor
                                                id="etapa-digitacao"
                                                marcado={Boolean(etapa.indicador_digitacao_ativo)}
                                                aoAlterar={(valor) => atualizar('indicador_digitacao_ativo', valor)}
                                                titulo="Mostrar indicador de digitação"
                                                descricao="Exibe “digitando…” antes desta mensagem. É independente da pausa para a próxima etapa."
                                            />
                                            {etapa.indicador_digitacao_ativo && (
                                                <div className="max-w-[12rem]">
                                                    <Campo rotulo="Duração do indicador" htmlFor="etapa-digitacao-segundos" ajuda="Entre 1 e 20 segundos, o limite atual da Send API.">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                id="etapa-digitacao-segundos"
                                                                type="number"
                                                                min={1}
                                                                max={20}
                                                                step={1}
                                                                className="v2-entrada v2-numerico max-w-24"
                                                                value={etapa.indicador_digitacao_segundos}
                                                                onChange={(evento) => atualizar('indicador_digitacao_segundos', Number(evento.target.value))}
                                                            />
                                                            <span className="v2-micro">segundos</span>
                                                        </div>
                                                    </Campo>
                                                </div>
                                            )}
                                        </div>

                                        {selecionada < etapas.length - 1 && (
                                            <div className="border-t border-[var(--v2-line)] pt-3">
                                                <Interruptor
                                                    id="etapa-encerra"
                                                    marcado={Boolean(etapa.encerra_apos)}
                                                    aoAlterar={(valor) => atualizar('encerra_apos', valor)}
                                                    titulo="Encerrar fluxo após esta etapa"
                                                    descricao="Útil em ramos independentes: a execução termina sem seguir para a próxima etapa."
                                                />
                                            </div>
                                        )}

                                        {selecionada < etapas.length - 1 && !etapa.encerra_apos && (
                                            <div className="border-t border-[var(--v2-line)] pt-3">
                                                <Interruptor
                                                    id="etapa-pausa"
                                                    marcado={Number(etapa.pausa_segundos) > 0}
                                                    aoAlterar={(valor) => atualizar('pausa_segundos', valor ? 5 : 0)}
                                                    titulo="Adicionar pausa antes da próxima etapa"
                                                    descricao="Desativada por padrão; configurada em segundos ou minutos."
                                                />
                                                {Number(etapa.pausa_segundos) > 0 && (
                                                    <div className="mt-3 max-w-[14rem]">
                                                        <div className="mb-1.5 flex items-center justify-between gap-2">
                                                            <label className="v2-campo__rotulo" htmlFor="etapa-pausa-valor">
                                                                Duração da pausa
                                                            </label>
                                                            <div className="v2-segmentado" role="group" aria-label="Unidade da pausa">
                                                                {[
                                                                    { valor: 'segundos', rotulo: 'Segundos' },
                                                                    { valor: 'minutos', rotulo: 'Minutos' },
                                                                ].map((unidade) => (
                                                                    <button
                                                                        key={unidade.valor}
                                                                        type="button"
                                                                        aria-pressed={unidadePausa === unidade.valor}
                                                                        onClick={() => setUnidadePausa(unidade.valor)}
                                                                    >
                                                                        {unidade.rotulo}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <input
                                                            id="etapa-pausa-valor"
                                                            type="number"
                                                            step="any"
                                                            min={unidadePausa === 'minutos' ? 1 / 60 : 1}
                                                            className="v2-entrada v2-numerico"
                                                            value={
                                                                unidadePausa === 'minutos'
                                                                    ? Number((Number(etapa.pausa_segundos) / 60).toFixed(2))
                                                                    : etapa.pausa_segundos
                                                            }
                                                            onChange={(evento) => {
                                                                const valor = Number(evento.target.value) || 0;
                                                                atualizar(
                                                                    'pausa_segundos',
                                                                    Math.max(0, Math.round(unidadePausa === 'minutos' ? valor * 60 : valor)),
                                                                );
                                                            }}
                                                        />
                                                        <p className="v2-campo__ajuda">
                                                            {unidadePausa === 'minutos'
                                                                ? 'Convertido automaticamente para segundos ao salvar.'
                                                                : `Equivale a ${Number(etapa.pausa_segundos)} segundos.`}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {selecionada >= etapas.length - 1 && (
                                            <p className="border border-[var(--v2-line)] bg-[var(--v2-surface-2)] px-2.5 py-2 text-[0.6875rem] leading-5 text-[var(--v2-ink-2)]">
                                                Esta é a última etapa; não há uma etapa seguinte para aguardar.
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="v2-painel v2-painel__corpo text-center">
                            <p className="text-[0.8125rem] font-medium">Nenhuma etapa selecionada</p>
                            <p className="mt-1 text-xs text-[var(--v2-ink-2)]">
                                Adicione uma etapa na coluna de estrutura para editar o conteúdo.
                            </p>
                            <button type="button" className="v2-btn v2-btn--contorno mt-3" onClick={adicionarEtapa}>
                                <Plus aria-hidden="true" />
                                Adicionar etapa
                            </button>
                        </div>
                    )}
                </div>

                <aside className="min-w-0 space-y-4">
                    <div className="v2-previa">
                        <div className="v2-previa__topo">
                            <span className="v2-ponto text-[var(--v2-verde)]" aria-hidden="true" />
                            Prévia · {nomeDoContato(contatoDemonstracao)}
                        </div>
                        <div className="v2-previa__corpo">
                            {etapa ? (
                                etapa.tipo === 'condicao_horario' ? (
                                    <div className="v2-bolha v2-bolha--recebida">
                                        <p className="v2-bolha__texto">
                                            Bloco de condição: a execução escolhe um dos {etapa.condicoes?.length ?? 0}{' '}
                                            caminhos pelo horário de São Paulo.
                                        </p>
                                        <p className="v2-bolha__meta">Nenhuma mensagem é enviada por este bloco</p>
                                    </div>
                                ) : (
                                    <div className="v2-bolha v2-bolha--enviada">
                                        {etapa.tipo_conteudo !== 'texto' && etapa.anexo_nome_original && (
                                            <div className="v2-anexo">
                                                <span className="v2-anexo__icone">
                                                    <FileText className="size-3.5" aria-hidden="true" />
                                                </span>
                                                <span className="min-w-0 flex-1 truncate text-[0.6875rem]">
                                                    {etapa.anexo_nome_original}
                                                </span>
                                            </div>
                                        )}
                                        {etapa.texto?.trim() ? (
                                            <p className="v2-bolha__texto">{mostrarPrevia(etapa.texto)}</p>
                                        ) : (
                                            <p className="v2-bolha__texto text-[var(--v2-ink-3)]">
                                                {etapa.tipo_conteudo === 'texto'
                                                    ? 'A prévia aparece aqui conforme você escreve.'
                                                    : 'Esta etapa envia apenas o anexo.'}
                                            </p>
                                        )}
                                        <p className="v2-bolha__meta">
                                            {etapa.indicador_digitacao_ativo && (
                                                <>
                                                    <Keyboard className="size-2.5" aria-hidden="true" />
                                                    digitando {etapa.indicador_digitacao_segundos}s
                                                </>
                                            )}
                                            {Number(etapa.pausa_segundos) > 0 && (
                                                <>
                                                    <PauseCircle className="size-2.5" aria-hidden="true" />
                                                    pausa {etapa.pausa_segundos}s
                                                </>
                                            )}
                                        </p>
                                    </div>
                                )
                            ) : (
                                <p className="text-xs text-[var(--v2-ink-2)]">Selecione uma etapa para visualizar.</p>
                            )}
                        </div>
                    </div>

                    <div className="v2-painel v2-painel__corpo">
                        <p className="v2-micro">Resumo do fluxo</p>
                        <dl className="v2-dados mt-2">
                            <div>
                                <dt>Estado</dt>
                                <dd>{ativo ? 'Ativo' : 'Inativo'}</dd>
                            </div>
                            <div>
                                <dt>Gatilhos</dt>
                                <dd>
                                    {resumo.gatilhos.length > 0
                                        ? resumo.gatilhos.map((chave) => (chave === 'novo_contato' ? 'Novo contato' : 'Mensagem recebida')).join(', ')
                                        : 'Nenhum'}
                                </dd>
                            </div>
                            <div>
                                <dt>Etapas</dt>
                                <dd className="v2-numerico">{etapas.length}</dd>
                            </div>
                            <div>
                                <dt>Pausas</dt>
                                <dd className="v2-numerico">{resumo.pausas}</dd>
                            </div>
                            <div>
                                <dt>Indicadores</dt>
                                <dd className="v2-numerico">{resumo.digitando}</dd>
                            </div>
                            <div>
                                <dt>Condições</dt>
                                <dd className="v2-numerico">{resumo.condicoes}</dd>
                            </div>
                            <div>
                                <dt>Janela</dt>
                                <dd>{horario.ativo ? `${horario.inicio}–${horario.fim}` : 'Sem janela'}</dd>
                            </div>
                            <div>
                                <dt>Gravação</dt>
                                <dd>{alterado ? 'Alterada' : 'Salva'}</dd>
                            </div>
                        </dl>
                    </div>

                    <Aviso tom="info" titulo="Comparação honesta">
                        O editor real valida extensão, MIME e tamanho no servidor. Este preview mantém todos os campos e
                        mensagens de ajuda, mas não envia arquivos nem executa as validações do backend.
                    </Aviso>
                </aside>
            </div>

            <div className="v2-barra-fixa">
                <div className="flex min-w-0 items-center gap-2 text-xs">
                    <span
                        className={`v2-ponto ${alterado ? 'text-[var(--v2-ambar)]' : 'text-[var(--v2-verde)]'}`}
                        aria-hidden="true"
                    />
                    <span className="text-[var(--v2-ink-2)]">
                        {alterado ? 'Alterações não salvas neste preview' : 'Tudo salvo · nenhuma alteração local'}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setDialogoDescarte(true)}>
                        Descartar alterações
                    </button>
                    <button
                        type="button"
                        className="v2-btn v2-btn--primario"
                        onClick={() => {
                            setAlterado(false);
                            toast.success('Salvamento simulado', {
                                description: 'Nenhuma etapa foi gravada. O fluxo original permanece intacto.',
                            });
                        }}
                    >
                        Salvar alterações
                    </button>
                </div>
            </div>

            <Dialogo
                aberto={dialogoExcluir}
                titulo="Excluir etapa?"
                descricao="A etapa será removida das alterações locais. A exclusão só seria persistida ao salvar o fluxo."
                icone={Trash2}
                aoFechar={() => setDialogoExcluir(false)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setDialogoExcluir(false)}>
                            Cancelar
                        </button>
                        <button type="button" className="v2-btn v2-btn--perigo" onClick={removerEtapa}>
                            Excluir etapa
                        </button>
                    </>
                }
            >
                {etapa && (
                    <p className="text-[0.8125rem] leading-6 text-[var(--v2-ink-2)]">
                        Etapa {selecionada + 1}: {etapa.tipo === 'condicao_horario' ? 'condição por horário' : etapa.texto || 'sem texto'}.
                        Os destinos das condições são remapeados na exclusão real.
                    </p>
                )}
            </Dialogo>

            <Dialogo
                aberto={dialogoDescarte}
                titulo="Descartar alterações locais?"
                descricao="Esta ação repõe os dados de demonstração do fluxo. Nada do fluxo real é alterado."
                icone={Info}
                aoFechar={() => setDialogoDescarte(false)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setDialogoDescarte(false)}>
                            Continuar editando
                        </button>
                        <button
                            type="button"
                            className="v2-btn v2-btn--perigo"
                            onClick={() => {
                                setEtapas(copiarEtapas(fluxoBase.etapas));
                                setNome(fluxoBase.nome);
                                setSelecionada(0);
                                setAlterado(false);
                                setDialogoDescarte(false);
                            }}
                        >
                            Descartar
                        </button>
                    </>
                }
            />

            <Dialogo
                aberto={dialogoSaida}
                titulo="Sair do editor?"
                descricao="Na interface atual, sair com alterações não salvas pede confirmação. A V2 mantém o mesmo aviso."
                icone={Info}
                aoFechar={() => setDialogoSaida(false)}
                acoes={
                    <>
                        <button type="button" className="v2-btn v2-btn--contorno" onClick={() => setDialogoSaida(false)}>
                            Continuar editando
                        </button>
                        <Link href="/preview/design-v2/fluxos" className="v2-btn v2-btn--primario">
                            Sair sem salvar
                        </Link>
                    </>
                }
            />
        </div>
    );
}

function itemIgual(valor, referencia) {
    return (valor ?? 'texto') === referencia;
}

function EditorCondicao({ etapa, etapas, indice, aoAlterarCondicao, aoAlterarEtapa }) {
    const destinos = etapas.slice(indice + 1);

    return (
        <div className="space-y-4">
            <Aviso tom="atencao" titulo="Intervalos inclusivos, sem sobreposição e sem atravessar a meia-noite">
                A condição usa o fuso confirmado da conta. Cada intervalo aponta para uma etapa posterior; a saída NÃO
                cobre o restante.
            </Aviso>

            <div className="space-y-3">
                {etapa.condicoes?.map((condicao, indiceCondicao) => (
                    <div key={indiceCondicao} className="border border-[var(--v2-line)] p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[0.75rem] font-medium">Intervalo {indiceCondicao + 1}</p>
                            <button
                                type="button"
                                className="v2-btn v2-btn--perigo v2-btn--pequeno"
                                onClick={() => {
                                    aoAlterarEtapa('condicoes', etapa.condicoes.filter((_, posicao) => posicao !== indiceCondicao));
                                }}
                                disabled={etapa.condicoes.length === 1}
                            >
                                <X aria-hidden="true" />
                                Remover
                            </button>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                            <Campo rotulo="Início" htmlFor={`cond-inicio-${indiceCondicao}`}>
                                <input
                                    id={`cond-inicio-${indiceCondicao}`}
                                    type="time"
                                    className="v2-entrada v2-numerico"
                                    value={condicao.inicio}
                                    onChange={(evento) => aoAlterarCondicao(indiceCondicao, 'inicio', evento.target.value)}
                                />
                            </Campo>
                            <Campo rotulo="Fim" htmlFor={`cond-fim-${indiceCondicao}`}>
                                <input
                                    id={`cond-fim-${indiceCondicao}`}
                                    type="time"
                                    className="v2-entrada v2-numerico"
                                    value={condicao.fim}
                                    onChange={(evento) => aoAlterarCondicao(indiceCondicao, 'fim', evento.target.value)}
                                />
                            </Campo>
                            <Campo rotulo="Destino" htmlFor={`cond-destino-${indiceCondicao}`}>
                                <select
                                    id={`cond-destino-${indiceCondicao}`}
                                    className="v2-entrada"
                                    value={condicao.destino_ordem ?? ''}
                                    onChange={(evento) => aoAlterarCondicao(indiceCondicao, 'destino_ordem', Number(evento.target.value))}
                                >
                                    <option value="">Escolha a etapa</option>
                                    {destinos.map((destino) => (
                                        <option key={destino.id} value={indice + 2 + destinos.indexOf(destino)}>
                                            Etapa {indice + 2 + destinos.indexOf(destino)}
                                        </option>
                                    ))}
                                </select>
                            </Campo>
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="button"
                className="v2-btn v2-btn--contorno v2-btn--pequeno"
                onClick={() => {
                    aoAlterarEtapa('condicoes', [
                        ...(etapa.condicoes ?? []),
                        { inicio: '12:00', fim: '18:00', destino_ordem: indice + 2 },
                    ]);
                }}
            >
                <Plus aria-hidden="true" />
                Adicionar intervalo
            </button>

            <div className="border-t border-[var(--v2-line)] pt-3">
                <Campo rotulo="Saída NÃO" htmlFor="cond-destino-nao" ajuda="Sem destino, o fluxo encerra quando nenhum intervalo corresponde.">
                    <select
                        id="cond-destino-nao"
                        className="v2-entrada max-w-sm"
                        value={etapa.destino_nao_ordem ?? ''}
                        onChange={(evento) => aoAlterarEtapa('destino_nao_ordem', evento.target.value ? Number(evento.target.value) : null)}
                    >
                        <option value="">Encerrar o fluxo</option>
                        {destinos.map((destino) => (
                            <option key={destino.id} value={indice + 2 + destinos.indexOf(destino)}>
                                Ir para etapa {indice + 2 + destinos.indexOf(destino)}
                            </option>
                        ))}
                    </select>
                </Campo>
            </div>

            <div className="flex flex-wrap gap-1">
                <Chip tom="atencao">
                    <Split className="size-2.5" aria-hidden="true" />
                    {etapa.condicoes?.length ?? 0} caminhos
                </Chip>
                <Chip>
                    <Clock3 className="size-2.5" aria-hidden="true" />
                    America/Sao_Paulo
                </Chip>
            </div>
        </div>
    );
}

EditorFluxo.layout = [LayoutPreview];
