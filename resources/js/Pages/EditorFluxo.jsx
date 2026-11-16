import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    ArrowLeft,
    AudioLines,
    Braces,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    CircleDot,
    Clock3,
    FileText,
    Hash,
    Image as ImageIcon,
    Info,
    LoaderCircle,
    MessageCircle,
    Play,
    Plus,
    Trash2,
    Type,
    Upload,
    UserRound,
    Video,
    X,
} from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { ModalFlowChat } from '@/components/ModalFlowChat';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const gatilhos = [
    { valor: 'novo_contato', rotulo: 'Novo contato' },
    { valor: 'mensagem_recebida', rotulo: 'Mensagem recebida' },
];

/*
 * Tipos de conteúdo e limites confirmados na documentação atual da Meta.
 * O backend valida novamente MIME, extensão e tamanho; o accept do navegador
 * é apenas uma ajuda de seleção.
 */
const tiposConteudo = [
    {
        valor: 'texto',
        rotulo: 'Texto',
        icone: Type,
        accept: null,
        descricaoPicker: null,
        limiteMb: null,
        extensoes: [],
    },
    {
        valor: 'imagem',
        rotulo: 'Imagem',
        icone: ImageIcon,
        accept: 'image/png,image/jpeg,image/gif,.png,.jpg,.jpeg,.gif',
        descricaoPicker: 'uma imagem',
        limiteMb: 8,
        extensoes: ['jpg', 'jpeg', 'png', 'gif'],
    },
    {
        valor: 'audio',
        rotulo: 'Áudio',
        icone: AudioLines,
        accept: 'audio/mpeg,audio/mp4,audio/aac,audio/wav,.mp3,.m4a,.aac,.wav,.mp4',
        descricaoPicker: 'um arquivo de áudio',
        limiteMb: 25,
        extensoes: ['mp3', 'm4a', 'aac', 'wav', 'mp4'],
    },
    {
        valor: 'video',
        rotulo: 'Vídeo',
        icone: Video,
        accept: 'video/mp4,video/quicktime,video/x-msvideo,video/webm,video/ogg,.mp4,.mov,.avi,.webm,.ogg',
        descricaoPicker: 'um arquivo de vídeo',
        limiteMb: 25,
        extensoes: ['mp4', 'mov', 'avi', 'webm', 'ogg'],
    },
    {
        valor: 'arquivo',
        rotulo: 'Arquivo/Documento',
        icone: FileText,
        accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,application/pdf',
        descricaoPicker: 'um arquivo ou documento',
        limiteMb: 25,
        extensoes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip'],
    },
];

const variaveis = [
    { valor: '{{nome}}', rotulo: 'Nome do contato', icone: UserRound },
    { valor: '{{psid}}', rotulo: 'PSID do contato', icone: Hash },
];

const INDICADOR_DIGITACAO_PADRAO_SEGUNDOS = 2;
const INDICADOR_DIGITACAO_MAXIMO_SEGUNDOS = 20;

function criarEtapaVazia() {
    return {
        tipo: 'mensagem',
        texto: '',
        pausa_segundos: 0,
        indicador_digitacao_ativo: false,
        indicador_digitacao_segundos: INDICADOR_DIGITACAO_PADRAO_SEGUNDOS,
        encerra_apos: false,
        tipoConteudo: 'texto',
        anexo: null,
        arquivo: null,
        anexoLocalId: null,
        removerAnexo: false,
    };
}

function estaAtivo(valor) {
    return valor === true || valor === 1 || valor === '1';
}

function segundosIndicadorValidos(valor) {
    const segundos = Math.round(Number(valor) || 0);

    return Math.min(INDICADOR_DIGITACAO_MAXIMO_SEGUNDOS, Math.max(1, segundos));
}

function normalizarDestino(valor) {
    const numero = Number(valor);

    return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function criarCondicaoVazia() {
    return { inicio: '', fim: '', destino_ordem: null };
}

function criarEtapaCondicaoVazia() {
    return {
        ...criarEtapaVazia(),
        tipo: 'condicao_horario',
        texto: '',
        condicoes: [criarCondicaoVazia()],
        destino_nao_ordem: null,
    };
}

function prepararCondicoes(etapa) {
    return (etapa.condicoes ?? []).map((condicao) => ({
        inicio: normalizarHora(condicao.inicio) || '',
        fim: normalizarHora(condicao.fim) || '',
        destino_ordem: normalizarDestino(condicao.destino_ordem),
    }));
}

function prepararEtapas(fluxo) {
    if (!fluxo) {
        return [criarEtapaVazia()];
    }

    return (fluxo.etapas ?? []).map((etapa) => {
        const tipo = etapa.tipo === 'condicao_horario' ? 'condicao_horario' : 'mensagem';
        const tipoConteudo = tipo !== 'condicao_horario'
            && tiposConteudo.some((tipoEditor) => tipoEditor.valor === etapa.tipo_conteudo)
            ? etapa.tipo_conteudo
            : 'texto';
        const temAnexo = tipo !== 'condicao_horario'
            && tipoConteudo !== 'texto'
            && Boolean(etapa.anexo_caminho);

        return {
            tipo,
            texto: etapa.texto ?? '',
            pausa_segundos: tipo === 'condicao_horario' ? 0 : Number(etapa.pausa_segundos ?? 0),
            indicador_digitacao_ativo: estaAtivo(etapa.indicador_digitacao_ativo),
            indicador_digitacao_segundos: segundosIndicadorValidos(etapa.indicador_digitacao_segundos ?? INDICADOR_DIGITACAO_PADRAO_SEGUNDOS),
            condicoes: prepararCondicoes(etapa),
            destino_nao_ordem: normalizarDestino(etapa.destino_nao_ordem),
            encerra_apos: tipo !== 'condicao_horario' && estaAtivo(etapa.encerra_apos),
            tipoConteudo,
            anexo: temAnexo
                ? {
                    existente: true,
                    nome: etapa.anexo_nome_original ?? 'Arquivo',
                    tamanho: etapa.anexo_tamanho_bytes ?? null,
                    formato: etapa.anexo_mime ?? null,
                    url: fluxo?.id && etapa.id ? `/fluxos/${fluxo.id}/etapas/${etapa.id}/anexo` : null,
                }
                : null,
            arquivo: null,
            anexoLocalId: null,
            removerAnexo: false,
        };
    });
}

function formatarTamanhoBytes(bytes) {
    const valor = Number(bytes);

    if (!Number.isFinite(valor) || valor <= 0) {
        return null;
    }

    if (valor < 1024) {
        return `${valor} B`;
    }

    const formatador = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

    if (valor < 1024 * 1024) {
        return `${formatador.format(valor / 1024)} KB`;
    }

    return `${formatador.format(valor / (1024 * 1024))} MB`;
}

function descreverAnexo(anexo) {
    if (!anexo) {
        return null;
    }

    const nome = anexo.nome ?? '';
    const extensao = nome.includes('.') ? nome.slice(nome.lastIndexOf('.') + 1).toUpperCase() : null;
    const mime = anexo.formato ? anexo.formato.split('/').pop()?.toUpperCase() : null;
    const partes = [extensao ?? mime, formatarTamanhoBytes(anexo.tamanho)].filter(Boolean);

    return partes.length > 0 ? partes.join(' · ') : null;
}

function configuracaoTipoConteudo(valor) {
    return tiposConteudo.find((tipo) => tipo.valor === valor) ?? tiposConteudo[0];
}

function validarArquivoLocal(arquivo, tipoConteudo) {
    const configuracao = configuracaoTipoConteudo(tipoConteudo);

    if (!arquivo || configuracao.valor === 'texto') {
        return null;
    }

    const nome = arquivo.name ?? '';
    const extensao = nome.includes('.') ? nome.slice(nome.lastIndexOf('.') + 1).toLowerCase() : '';

    if (!configuracao.extensoes.includes(extensao)) {
        return `Formato não suportado. Use ${configuracao.extensoes.map((item) => item.toUpperCase()).join(', ')}.`;
    }

    if (arquivo.size > configuracao.limiteMb * 1024 * 1024) {
        return `O arquivo excede o limite de ${configuracao.limiteMb} MB para ${configuracao.rotulo.toLowerCase()}.`;
    }

    return null;
}

function validarMidiaDasEtapas(etapas, suportaMidia) {
    for (let indice = 0; indice < etapas.length; indice += 1) {
        const etapa = etapas[indice];
        if (etapa.tipo === 'condicao_horario') {
            continue;
        }

        const tipoConteudo = etapa.tipoConteudo ?? 'texto';
        const texto = (etapa.texto ?? '').trim();

        if (tipoConteudo === 'texto') {
            if (etapa.arquivo) {
                return {
                    indice,
                    campo: `etapas.${indice}.anexo`,
                    mensagem: 'Escolha um tipo de mídia para enviar o arquivo selecionado.',
                };
            }

            if (!texto) {
                return {
                    indice,
                    campo: `etapas.${indice}.texto`,
                    mensagem: 'Escreva o conteúdo desta etapa antes de salvar.',
                };
            }

            continue;
        }

        if (!suportaMidia) {
            return {
                indice,
                campo: `etapas.${indice}.tipo_conteudo`,
                mensagem: 'A migration de mídia das etapas ainda não foi executada neste banco de dados.',
            };
        }

        if (texto) {
            return {
                indice,
                campo: `etapas.${indice}.texto`,
                mensagem: 'A Meta aceita texto ou anexo, mas não ambos neste formato. Remova o texto ou use uma etapa de texto.',
            };
        }

        if (!etapa.arquivo && !etapa.anexo?.existente) {
            return {
                indice,
                campo: `etapas.${indice}.anexo`,
                mensagem: `Selecione um arquivo de ${configuracaoTipoConteudo(tipoConteudo).rotulo.toLowerCase()}.`,
            };
        }

        if (etapa.arquivo) {
            const erroArquivo = validarArquivoLocal(etapa.arquivo, tipoConteudo);

            if (erroArquivo) {
                return {
                    indice,
                    campo: `etapas.${indice}.anexo`,
                    mensagem: erroArquivo,
                };
            }
        }
    }

    return null;
}

function renderizarTextoComVariaveis(texto) {
    return texto.split(/(\{\{[^{}]*\}\})/g).map((parte, indice) => (
        /^\{\{[^{}]*\}\}$/.test(parte) ? (
            <span
                key={indice}
                className="mx-px inline-block rounded-md bg-areia px-1.5 py-px align-baseline text-xs font-semibold text-[#101014]"
            >
                {parte}
            </span>
        ) : (
            parte
        )
    ));
}

function prepararGatilhos(fluxo) {
    const estado = Object.fromEntries(gatilhos.map((gatilho) => [gatilho.valor, false]));

    for (const regra of fluxo?.regras ?? []) {
        if (Object.hasOwn(estado, regra.gatilho)) {
            estado[regra.gatilho] = estaAtivo(regra.ativo);
        }
    }

    return estado;
}

function prepararPausas(etapas) {
    return etapas.map((etapa) => Number(etapa.pausa_segundos) > 0);
}

// Normaliza "HH:MM:SS" guardado no banco para o formato "HH:MM" do input de hora.
function normalizarHora(valor) {
    const texto = String(valor ?? '').trim();

    return /^\d{2}:\d{2}/.test(texto) ? texto.slice(0, 5) : '';
}

function prepararHorario(fluxo) {
    return {
        ativo: estaAtivo(fluxo?.horario_inicio_ativo),
        inicio: normalizarHora(fluxo?.horario_inicio),
        fim: normalizarHora(fluxo?.horario_fim),
        fora_horario: fluxo?.fora_horario === 'aguardar' ? 'aguardar' : 'nao_iniciar',
    };
}

const opcoesForaHorario = [
    {
        valor: 'nao_iniciar',
        rotulo: 'Não iniciar',
        descricao: 'A mensagem fora do horário não inicia o fluxo; uma nova mensagem dentro do horário permitido poderá iniciá-lo.',
    },
    {
        valor: 'aguardar',
        rotulo: 'Aguardar próximo horário',
        descricao: 'Registra um agendamento e inicia o fluxo na próxima janela permitida, sem exigir uma nova mensagem.',
    },
];

// Pausa inicial sugerida ao ativar o controle numa etapa nova (coerente com o seeder).
const PAUSA_PADRAO_SEGUNDOS = 5;

function formatarSegundosEmUnidade(segundos, unidade) {
    if (unidade === 'minutos') {
        return String(Math.round((Number(segundos) / 60) * 1000) / 1000);
    }

    return String(Math.round(Number(segundos) || 0));
}

function converterSegundosDoInput(valor, unidade) {
    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero < 0) {
        return 0;
    }

    return unidade === 'minutos' ? Math.round(numero * 60) : Math.round(numero);
}

/*
 * Instantâneo comparável do estado do editor (apenas campos persistidos pelo
 * backend: nome, ativo, texto e pausa_segundos das etapas, gatilhos e horário).
 */
function capturarEstado({ nome = '', ativo = false, etapas = [], gatilhosAtivos = {}, horario = {} }) {
    return {
        nome,
        ativo: Boolean(ativo),
        etapas: etapas.map((etapa) => ({
            tipo: etapa.tipo === 'condicao_horario' ? 'condicao_horario' : 'mensagem',
            texto: etapa.texto ?? '',
            pausa_segundos: Math.round(Number(etapa.pausa_segundos) || 0),
            indicador_digitacao_ativo: Boolean(etapa.indicador_digitacao_ativo),
            indicador_digitacao_segundos: segundosIndicadorValidos(etapa.indicador_digitacao_segundos),
            condicoes: (etapa.condicoes ?? []).map((condicao) => ({
                inicio: condicao.inicio ?? '',
                fim: condicao.fim ?? '',
                destino_ordem: normalizarDestino(condicao.destino_ordem),
            })),
            destino_nao_ordem: normalizarDestino(etapa.destino_nao_ordem),
            encerra_apos: Boolean(etapa.encerra_apos),
            tipo_conteudo: etapa.tipo === 'condicao_horario' ? 'texto' : (etapa.tipoConteudo ?? 'texto'),
            anexo_nome: etapa.arquivo?.name ?? etapa.anexo?.nome ?? null,
            anexo_tamanho: etapa.arquivo?.size ?? etapa.anexo?.tamanho ?? null,
            anexo_existente: Boolean(etapa.anexo?.existente && !etapa.arquivo),
            anexo_local_id: etapa.anexoLocalId ?? null,
            remover_anexo: Boolean(etapa.removerAnexo),
        })),
        regras: {
            novo_contato: Boolean(gatilhosAtivos.novo_contato),
            mensagem_recebida: Boolean(gatilhosAtivos.mensagem_recebida),
        },
        horario: {
            ativo: Boolean(horario.ativo),
            inicio: horario.ativo ? horario.inicio ?? '' : '',
            fim: horario.ativo ? horario.fim ?? '' : '',
            fora_horario: horario.fora_horario ?? 'nao_iniciar',
        },
    };
}

function estadosIguais(a, b) {
    return a.nome === b.nome
        && a.ativo === b.ativo
        && a.regras.novo_contato === b.regras.novo_contato
        && a.regras.mensagem_recebida === b.regras.mensagem_recebida
        && a.horario.ativo === b.horario.ativo
        && a.horario.inicio === b.horario.inicio
        && a.horario.fim === b.horario.fim
        && a.horario.fora_horario === b.horario.fora_horario
        && JSON.stringify(a.etapas) === JSON.stringify(b.etapas);
}

function estadoInicialDoFluxo(fluxo) {
    return capturarEstado({
        nome: fluxo?.nome ?? '',
        ativo: estaAtivo(fluxo?.ativo),
        etapas: prepararEtapas(fluxo),
        gatilhosAtivos: prepararGatilhos(fluxo),
        horario: prepararHorario(fluxo),
    });
}

function minutosDaHoraTexto(hora) {
    const [horas, minutos] = String(hora ?? '').split(':');

    return (Number(horas) || 0) * 60 + (Number(minutos) || 0);
}

function validarCondicoesDasEtapas(etapas) {
    for (let indice = 0; indice < etapas.length; indice += 1) {
        const etapa = etapas[indice];
        if (etapa.tipo !== 'condicao_horario') {
            continue;
        }

        const condicoes = etapa.condicoes ?? [];
        if (condicoes.length === 0) {
            return {
                indice,
                campo: `etapas.${indice}.condicoes`,
                mensagem: 'Adicione pelo menos uma condição de horário.',
            };
        }

        const intervalos = [];

        for (let posicao = 0; posicao < condicoes.length; posicao += 1) {
            const condicao = condicoes[posicao];
            if (!condicao.inicio || !condicao.fim) {
                return {
                    indice,
                    campo: `etapas.${indice}.condicoes.${posicao}.inicio`,
                    mensagem: 'Informe o horário inicial e final desta condição.',
                };
            }

            if (condicao.inicio >= condicao.fim) {
                return {
                    indice,
                    campo: `etapas.${indice}.condicoes.${posicao}.fim`,
                    mensagem: 'O horário final deve ser posterior ao inicial e a janela não pode atravessar a meia-noite.',
                };
            }

            const destino = Number(condicao.destino_ordem);
            if (!Number.isInteger(destino) || destino <= indice + 1 || destino > etapas.length) {
                return {
                    indice,
                    campo: `etapas.${indice}.condicoes.${posicao}.destino_ordem`,
                    mensagem: 'Escolha uma etapa de destino posterior a esta condição.',
                };
            }

            const inicio = minutosDaHoraTexto(condicao.inicio);
            const fim = minutosDaHoraTexto(condicao.fim);

            for (const [outroInicio, outroFim] of intervalos) {
                if (inicio <= outroFim && outroInicio <= fim) {
                    return {
                        indice,
                        campo: `etapas.${indice}.condicoes.${posicao}.inicio`,
                        mensagem: 'Este intervalo se sobrepõe a outra condição do mesmo bloco.',
                    };
                }
            }

            intervalos.push([inicio, fim]);
        }

        const destinoNao = etapa.destino_nao_ordem;
        if (destinoNao !== null && destinoNao !== '' && destinoNao !== undefined) {
            const ordem = Number(destinoNao);
            if (!Number.isInteger(ordem) || ordem <= indice + 1 || ordem > etapas.length) {
                return {
                    indice,
                    campo: `etapas.${indice}.destino_nao_ordem`,
                    mensagem: 'Escolha uma etapa posterior para a saída NÃO ou deixe em branco para encerrar.',
                };
            }
        }
    }

    return null;
}

function descreverDestino(etapas, ordem) {
    const destino = Number(ordem);

    if (!Number.isInteger(destino) || destino < 1) {
        return 'Encerrar fluxo';
    }

    const etapa = etapas[destino - 1];
    if (!etapa) {
        return `Etapa ${destino}`;
    }

    const resumo = etapa.tipo === 'condicao_horario'
        ? 'Condição por horário'
        : (etapa.texto?.trim() || 'Etapa sem texto');

    return `Etapa ${destino} · ${resumo.length > 34 ? `${resumo.slice(0, 34)}…` : resumo}`;
}

function AnexoMidiaPreview({ etapa }) {
    const arquivo = etapa?.arquivo ?? null;
    const anexo = etapa?.anexo ?? null;
    const tipoConteudo = etapa?.tipoConteudo ?? 'texto';
    const configuracao = configuracaoTipoConteudo(tipoConteudo);
    const urlObjeto = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : null), [arquivo]);
    const nome = arquivo?.name ?? anexo?.nome ?? 'Arquivo';
    const tamanho = arquivo?.size ?? anexo?.tamanho ?? null;
    const url = urlObjeto ?? anexo?.url ?? null;
    const Icone = configuracao.icone;
    const tamanhoFormatado = formatarTamanhoBytes(tamanho);

    useEffect(() => () => {
        if (urlObjeto) {
            URL.revokeObjectURL(urlObjeto);
        }
    }, [urlObjeto]);

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
            {configuracao.valor === 'imagem' && url && (
                <img src={url} alt={nome} loading="lazy" className="max-h-56 w-full object-cover" />
            )}

            {configuracao.valor === 'audio' && url && (
                <audio controls preload="metadata" src={url} className="w-full px-2 pt-2" />
            )}

            {configuracao.valor === 'video' && url && (
                <video controls preload="metadata" src={url} className="max-h-56 w-full bg-black" />
            )}

            <div className="flex items-center gap-2.5 p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-terracota/10 text-terracota">
                    <Icone className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{nome}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {configuracao.rotulo}
                        {tamanhoFormatado ? ` · ${tamanhoFormatado}` : ''}
                        {!arquivo && anexo?.existente ? ' · salvo' : ''}
                    </p>
                </div>
            </div>
        </div>
    );
}

function CondicaoPreview({ etapa, indice, total, etapas }) {
    const condicoes = etapa?.condicoes ?? [];

    return (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                <div className="flex size-8 items-center justify-center rounded-xl bg-terracota/10 text-terracota">
                    <Clock3 className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-foreground">Condição por horário</h2>
                    <p className="truncate text-[11px] text-muted-foreground">
                        {total > 0 ? `Etapa ${indice + 1} de ${total}` : 'Sem etapas'}
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                {condicoes.map((condicao, posicao) => (
                    <div key={posicao} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold tabular-nums text-foreground">
                                {condicao.inicio || '--:--'} até {condicao.fim || '--:--'}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {descreverDestino(etapas, condicao.destino_ordem)}
                            </p>
                        </div>
                        <ChevronRight className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                    </div>
                ))}
                <div className="flex items-start justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2.5">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground">NÃO</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {descreverDestino(etapas, etapa?.destino_nao_ordem)}
                        </p>
                    </div>
                    <ChevronRight className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                </div>
            </div>

            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                O horário é avaliado no fuso confirmado da conta ao chegar nesta etapa. Os limites são inclusivos.
            </p>
        </section>
    );
}

function MensagemPreview({ etapa, indice, total, etapas = [] }) {
    if (etapa?.tipo === 'condicao_horario') {
        return <CondicaoPreview etapa={etapa} indice={indice} total={total} etapas={etapas} />;
    }

    const configuracaoMidia = configuracaoTipoConteudo(etapa?.tipoConteudo ?? 'texto');

    if (configuracaoMidia.valor !== 'texto') {
        const IconeMidia = configuracaoMidia.icone;

        return (
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-terracota/10 text-terracota">
                        <IconeMidia className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-foreground">Pré-visualização</h2>
                        <p className="truncate text-[11px] text-muted-foreground">
                            {total > 0 ? `Etapa ${indice + 1} de ${total} · ${configuracaoMidia.rotulo}` : configuracaoMidia.rotulo}
                        </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                        <IconeMidia className="size-3" />
                        {configuracaoMidia.rotulo}
                    </span>
                </div>

                <div className="rounded-2xl bg-muted p-3">
                    <AnexoMidiaPreview etapa={etapa} />
                    {etapa?.texto?.trim() && (
                        <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] leading-5 text-destructive">
                            A Meta aceita texto ou anexo, mas não ambos neste formato. Remova o texto para enviar a mídia.
                        </p>
                    )}
                </div>

                <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                    O arquivo fica em armazenamento privado e é enviado à Meta como anexo reutilizável da Página conectada.
                </p>
            </section>
        );
    }

    const tipo = configuracaoMidia;
    const IconeTipo = tipo.icone;
    const temTexto = Boolean(etapa?.texto?.trim());
    const tipoComAnexo = tipo.valor !== 'texto';
    const anexo = tipoComAnexo ? etapa?.anexo ?? null : null;
    const metaAnexo = descreverAnexo(anexo);

    return (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                <div className="flex size-8 items-center justify-center rounded-xl bg-terracota/10 text-terracota">
                    <MessageCircle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-foreground">Pré-visualização</h2>
                    <p className="truncate text-[11px] text-muted-foreground">
                        {total > 0 ? `Etapa ${indice + 1} de ${total} · ${tipo.rotulo}` : `Sem etapas · ${tipo.rotulo}`}
                    </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                    <IconeTipo className="size-3" />
                    {tipo.rotulo}
                </span>
            </div>

            <div className="flex min-h-40 flex-col items-end gap-1.5 rounded-2xl bg-muted p-3">
                {tipoComAnexo && (tipo.valor === 'video' ? (
                    <div className="w-full max-w-[88%] overflow-hidden rounded-2xl rounded-br-md bg-primary text-primary-foreground shadow-sm">
                        <div className="flex aspect-video items-center justify-center bg-primary-foreground/10">
                            <span className="flex size-10 items-center justify-center rounded-full bg-areia text-[#101014] shadow-sm">
                                <Play className="size-4 translate-x-px" fill="currentColor" />
                            </span>
                        </div>
                        <div className="px-3 py-2">
                            <p className="truncate text-xs font-medium">{anexo?.nome ?? 'Vídeo não selecionado'}</p>
                            <p className="text-[10px] text-primary-foreground/75">
                                {metaAnexo ?? 'Selecione um arquivo de vídeo no editor'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex w-full max-w-[88%] items-center gap-2.5 rounded-2xl rounded-br-md bg-primary px-3 py-2.5 text-primary-foreground shadow-sm">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-areia text-[#101014]">
                            <IconeTipo className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">
                                {anexo?.nome ?? `${tipo.rotulo} não selecionado`}
                            </span>
                            <span className="block text-[10px] text-primary-foreground/75">
                                {metaAnexo ?? 'Selecione um arquivo no editor'}
                            </span>
                        </span>
                    </div>
                ))}

                {temTexto ? (
                    <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-primary-foreground shadow-sm">
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                            {renderizarTextoComVariaveis(etapa.texto)}
                        </p>
                    </div>
                ) : !tipoComAnexo ? (
                    <div className="max-w-[88%] rounded-2xl rounded-br-md border border-dashed border-border bg-card/60 px-3.5 py-2.5 text-xs leading-5 text-muted-foreground">
                        Escreva o conteúdo da etapa para pré-visualizar a mensagem.
                    </div>
                ) : null}
            </div>

            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                As variáveis aparecem como texto até serem substituídas durante uma execução.
            </p>
            {tipoComAnexo && (
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    Apenas o texto é persistido e enviado pelo backend atual; o arquivo é uma pré-visualização local.
                </p>
            )}
        </section>
    );
}

function ResumoFluxo({ nome, gatilhosAtivos, etapas, pausasAtivas, horario, estadoGravacao }) {
    const pausasConfiguradas = pausasAtivas.reduce((total, ativa, indice) => (
        total + (ativa
            && !etapas[indice]?.encerra_apos
            && indice < etapas.length - 1
            && Number(etapas[indice]?.pausa_segundos) > 0 ? 1 : 0)
    ), 0);
    const indicadoresConfigurados = etapas.filter((etapa) => etapa.indicador_digitacao_ativo).length;
    const condicoesConfiguradas = etapas.filter((etapa) => etapa.tipo === 'condicao_horario').length;
    const opcaoForaHorario = opcoesForaHorario.find((opcao) => opcao.valor === horario.fora_horario);

    return (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Visão geral</h2>
            <dl className="mt-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <dt className="text-xs text-muted-foreground">Fluxo</dt>
                    <dd className="max-w-[65%] break-words text-right text-xs font-medium text-foreground">{nome || 'Sem nome'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                    <dt className="text-xs text-muted-foreground">Gatilhos ativos</dt>
                    <dd className="max-w-[65%] text-right text-xs font-medium text-foreground">
                        {gatilhosAtivos.length > 0 ? gatilhosAtivos.join(', ') : 'Nenhum'}
                    </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                    <dt className="text-xs text-muted-foreground">Horário de início</dt>
                    <dd className="max-w-[65%] text-right text-xs font-medium tabular-nums text-foreground">
                        {horario.ativo ? `${horario.inicio} às ${horario.fim}` : 'Qualquer hora'}
                    </dd>
                </div>
                {horario.ativo && (
                    <div className="flex items-start justify-between gap-4">
                        <dt className="text-xs text-muted-foreground">Fora do horário</dt>
                        <dd className="max-w-[65%] text-right text-xs font-medium text-foreground">{opcaoForaHorario?.rotulo ?? '—'}</dd>
                    </div>
                )}
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-xs text-muted-foreground">Etapas</dt>
                    <dd className="text-xs font-medium tabular-nums text-foreground">{etapas.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-xs text-muted-foreground">Tipos de conteúdo</dt>
                    <dd className="text-xs font-medium text-foreground">{etapas.length > 0 ? 'Texto' : 'Nenhum'}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-xs text-muted-foreground">Pausas configuradas</dt>
                    <dd className="text-xs font-medium tabular-nums text-foreground">{pausasConfiguradas}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-xs text-muted-foreground">Indicadores de digitação</dt>
                    <dd className="text-xs font-medium tabular-nums text-foreground">{indicadoresConfigurados}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-xs text-muted-foreground">Blocos de condição</dt>
                    <dd className="text-xs font-medium tabular-nums text-foreground">{condicoesConfiguradas}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                    <dt className="text-xs text-muted-foreground">Gravação</dt>
                    <dd className={`inline-flex items-center gap-1.5 text-xs font-medium ${estadoGravacao === 'guardado' ? 'text-terracota-escuro dark:text-foreground' : estadoGravacao === 'erro' ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {estadoGravacao === 'a_guardar' ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                        {estadoGravacao === 'guardado' ? 'Salvo' : estadoGravacao === 'a_guardar' ? 'Salvando' : estadoGravacao === 'erro' ? 'Erro ao salvar' : 'Alterações não salvas'}
                    </dd>
                </div>
            </dl>

            {etapas.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Etapas</h3>
                    <ol className="space-y-2">
                        {etapas.map((etapa, indice) => (
                            <li key={indice} className="flex min-w-0 items-start gap-2">
                                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-medium tabular-nums text-muted-foreground">
                                    {indice + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                    {etapa.tipo === 'condicao_horario' ? (
                                        <p className="inline-flex max-w-full items-center gap-1.5 truncate text-xs text-foreground">
                                            <Clock3 className="size-3 shrink-0 text-terracota" />
                                            Condição por horário · {(etapa.condicoes ?? []).length} {(etapa.condicoes ?? []).length === 1 ? 'intervalo' : 'intervalos'}
                                        </p>
                                    ) : etapa.tipoConteudo && etapa.tipoConteudo !== 'texto' ? (
                                        <p className="truncate text-xs text-foreground">
                                            Mídia ({configuracaoTipoConteudo(etapa.tipoConteudo).rotulo})
                                            {etapa.arquivo?.name || etapa.anexo?.nome ? ` · ${etapa.arquivo?.name ?? etapa.anexo.nome}` : ''}
                                        </p>
                                    ) : (
                                        <p className="truncate text-xs text-foreground">{etapa.texto || 'Etapa sem texto'}</p>
                                    )}
                                    {etapa.tipo !== 'condicao_horario' && etapa.encerra_apos && (
                                        <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-terracota-escuro dark:text-terracota">
                                            Encerra o fluxo após esta etapa
                                        </p>
                                    )}
                                    {etapa.tipo !== 'condicao_horario' && !etapa.encerra_apos && indice < etapas.length - 1 && pausasAtivas[indice] && Number(etapa.pausa_segundos) > 0 && (
                                        <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <Clock3 className="size-3" />
                                            {etapa.pausa_segundos} s
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </section>
    );
}

function EditorCondicaoHorario({
    etapa,
    indice,
    etapas,
    erros,
    fusoConta,
    aoAlterarCondicao,
    aoAdicionarCondicao,
    aoRemoverCondicao,
    aoAlterarDestinoNao,
}) {
    const condicoes = etapa.condicoes ?? [];
    const destinosPossiveis = etapas
        .map((outraEtapa, posicao) => ({ etapa: outraEtapa, ordem: posicao + 1 }))
        .filter((destino) => destino.ordem > indice + 1);
    const erroDe = (campo) => erros[`etapas.${indice}.${campo}`] ?? null;
    // O backend envia `timezone`; `atual` é mantido como compatibilidade com
    // o formato partilhado em auth.user.fuso.
    const fusoAtual = fusoConta?.timezone ?? fusoConta?.atual ?? null;
    const fusoConfirmado = Boolean(fusoAtual && fusoConta?.confirmado);

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-terracota/25 bg-terracota/5 p-3.5 sm:p-4">
                <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-terracota/15 text-terracota">
                        <Clock3 className="size-4" />
                    </span>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Condição por horário</h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Ao chegar nesta etapa, o fluxo segue o primeiro intervalo que contém o horário atual. Se nenhum corresponder, segue a saída NÃO.
                        </p>
                    </div>
                </div>
                <p className={`mt-3 rounded-lg border px-3 py-2 text-[11px] leading-5 ${fusoConfirmado
                    ? 'border-border bg-background text-muted-foreground'
                    : 'border-destructive/30 bg-destructive/5 text-destructive'}`}>
                    {fusoConfirmado
                        ? `Horário avaliado no fuso confirmado da conta: ${fusoAtual}.`
                        : 'O fuso horário da conta não está confirmado. Confirme em Configurações para que este bloco funcione corretamente.'}
                </p>
            </div>

            <div className="space-y-3">
                {condicoes.map((condicao, posicao) => (
                    <div key={posicao} className="rounded-xl border border-border bg-background p-3.5">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground">Condição {posicao + 1}</p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remover condição ${posicao + 1}`}
                                title="Remover condição"
                                onClick={() => aoRemoverCondicao(indice, posicao)}
                                disabled={condicoes.length <= 1}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 />
                            </Button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                                Das
                                <Input
                                    type="time"
                                    step={60}
                                    value={condicao.inicio}
                                    onChange={(evento) => aoAlterarCondicao(indice, posicao, 'inicio', evento.target.value)}
                                    aria-invalid={Boolean(erroDe(`condicoes.${posicao}.inicio`))}
                                    className="h-10 bg-card text-sm tabular-nums text-foreground"
                                />
                            </label>
                            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                                Até
                                <Input
                                    type="time"
                                    step={60}
                                    value={condicao.fim}
                                    onChange={(evento) => aoAlterarCondicao(indice, posicao, 'fim', evento.target.value)}
                                    aria-invalid={Boolean(erroDe(`condicoes.${posicao}.fim`))}
                                    className="h-10 bg-card text-sm tabular-nums text-foreground"
                                />
                            </label>
                        </div>

                        <label className="mt-3 flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                            Seguir para
                            <select
                                value={condicao.destino_ordem ?? ''}
                                onChange={(evento) => aoAlterarCondicao(indice, posicao, 'destino_ordem', evento.target.value === '' ? null : Number(evento.target.value))}
                                aria-invalid={Boolean(erroDe(`condicoes.${posicao}.destino_ordem`))}
                                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                <option value="">Escolha uma etapa</option>
                                {destinosPossiveis.map((destino) => (
                                    <option key={`condicao-${posicao}-destino-${destino.ordem}`} value={destino.ordem}>
                                        {descreverDestino(etapas, destino.ordem)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {['inicio', 'fim', 'destino_ordem'].map((campo) => (
                            erroDe(`condicoes.${posicao}.${campo}`)
                                ? <p key={campo} role="alert" className="mt-1.5 text-xs text-destructive">{erroDe(`condicoes.${posicao}.${campo}`)}</p>
                                : null
                        ))}
                    </div>
                ))}
            </div>

            {erroDe('condicoes') && (
                <p role="alert" className="text-xs text-destructive">{erroDe('condicoes')}</p>
            )}

            <Button type="button" variant="outline" size="sm" onClick={() => aoAdicionarCondicao(indice)} disabled={destinosPossiveis.length === 0}>
                <Plus />
                Adicionar condição
            </Button>

            {destinosPossiveis.length === 0 && (
                <p className="text-[11px] leading-5 text-muted-foreground">
                    Adicione etapas depois desta condição para usá-las como destino.
                </p>
            )}

            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3.5">
                <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                    Se nenhuma condição corresponder (NÃO)
                    <select
                        value={etapa.destino_nao_ordem ?? ''}
                        onChange={(evento) => aoAlterarDestinoNao(indice, evento.target.value)}
                        aria-invalid={Boolean(erroDe('destino_nao_ordem'))}
                        className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        <option value="">Encerrar fluxo</option>
                        {destinosPossiveis.map((destino) => (
                            <option key={`nao-destino-${destino.ordem}`} value={destino.ordem}>
                                {descreverDestino(etapas, destino.ordem)}
                            </option>
                        ))}
                    </select>
                </label>
                {erroDe('destino_nao_ordem') && (
                    <p role="alert" className="mt-1.5 text-xs text-destructive">{erroDe('destino_nao_ordem')}</p>
                )}
            </div>

            <p className="text-[11px] leading-5 text-muted-foreground">
                Os limites são inclusivos e usam precisão de minuto. Intervalos do mesmo bloco não podem se sobrepor nem atravessar a meia-noite. Os destinos precisam apontar para etapas posteriores.
            </p>
        </div>
    );
}

export default function EditorFluxo({
    fluxo = null,
    suportaIndicadorDigitacao = true,
    suportaCondicaoHorario = false,
    podeCondicaoHorario = false,
    suportaMidia = false,
    fusoConta = null,
}) {
    const criando = !fluxo?.id;
    const [nome, setNome] = useState(fluxo?.nome ?? '');
    const [ativo, setAtivo] = useState(estaAtivo(fluxo?.ativo));
    const [etapas, setEtapas] = useState(() => prepararEtapas(fluxo));
    const [gatilhosAtivos, setGatilhosAtivos] = useState(() => prepararGatilhos(fluxo));
    const [horario, setHorario] = useState(() => prepararHorario(fluxo));
    const [pausasAtivas, setPausasAtivas] = useState(() => prepararPausas(prepararEtapas(fluxo)));
    const [etapaSelecionada, setEtapaSelecionada] = useState(0);
    const [estadoGravacao, setEstadoGravacao] = useState(criando ? 'alterado' : 'guardado');
    const [erros, setErros] = useState({});
    const [etapaParaExcluir, setEtapaParaExcluir] = useState(null);
    const [dadosBase, setDadosBase] = useState(() => estadoInicialDoFluxo(fluxo));
    const [avisoSaidaAberto, setAvisoSaidaAberto] = useState(false);
    const [pausaUnidade, setPausaUnidade] = useState('segundos');
    const [pausaInput, setPausaInput] = useState('');
    const destinoSaidaRef = useRef(null);
    const liberarSaidaRef = useRef(false);
    const areaTexto = useRef(null);
    const seletorFicheiro = useRef(null);
    const etapaAtual = etapas[etapaSelecionada] ?? null;
    const tipoAtual = tiposConteudo.find((tipo) => tipo.valor === (etapaAtual?.tipoConteudo ?? 'texto')) ?? tiposConteudo[0];

    // Comparação fiável entre o estado atual e o último estado guardado/inicial.
    const temAlteracoes = !estadosIguais(
        dadosBase,
        capturarEstado({ nome, ativo, etapas, gatilhosAtivos, horario }),
    );

    const versaoFluxo = `${fluxo?.id ?? 'novo'}:${fluxo?.updated_at ?? ''}`;
    const [sincronizacaoForcada, setSincronizacaoForcada] = useState(0);

    // Depois de criar/guardar, o Inertia devolve o fluxo persistido. Sincroniza
    // o estado local para que o editor reabra com a mídia salva e sem arquivos
    // pendentes de um envio anterior.
    useEffect(() => {
        if (!fluxo?.id) {
            return;
        }

        const etapasPersistidas = prepararEtapas(fluxo);
        const gatilhosPersistidos = prepararGatilhos(fluxo);
        const horarioPersistido = prepararHorario(fluxo);

        setNome(fluxo.nome ?? '');
        setAtivo(estaAtivo(fluxo.ativo));
        setEtapas(etapasPersistidas);
        setGatilhosAtivos(gatilhosPersistidos);
        setHorario(horarioPersistido);
        setPausasAtivas(prepararPausas(etapasPersistidas));
        setDadosBase(capturarEstado({
            nome: fluxo.nome ?? '',
            ativo: estaAtivo(fluxo.ativo),
            etapas: etapasPersistidas,
            gatilhosAtivos: gatilhosPersistidos,
            horario: horarioPersistido,
        }));
        setEstadoGravacao('guardado');
        setErros({});
        setEtapaSelecionada((atual) => Math.min(atual, Math.max(0, etapasPersistidas.length - 1)));
    }, [versaoFluxo, sincronizacaoForcada]);

    useEffect(() => {
        if (!temAlteracoes) {
            return undefined;
        }

        const avisarAntesDeFechar = (evento) => {
            evento.preventDefault();
            evento.returnValue = '';
        };

        window.addEventListener('beforeunload', avisarAntesDeFechar);
        const removerEventoAntesDaVisita = router.on('before', (evento) => {
            const visita = evento.detail?.visit;

            if ((visita?.method ?? 'get') !== 'get') {
                return undefined;
            }

            if (liberarSaidaRef.current) {
                liberarSaidaRef.current = false;
                return undefined;
            }

            if (destinoSaidaRef.current !== null) {
                return undefined;
            }

            destinoSaidaRef.current = visita?.url ? String(visita.url) : null;
            setAvisoSaidaAberto(true);
            evento.preventDefault();
            return undefined;
        });

        return () => {
            window.removeEventListener('beforeunload', avisarAntesDeFechar);
            removerEventoAntesDaVisita();
        };
    }, [temAlteracoes]);

    const marcarAlteracao = () => setEstadoGravacao('alterado');

    const alterarNome = (valor) => {
        setNome(valor);
        setErros((errosAtuais) => ({ ...errosAtuais, nome: null }));
        marcarAlteracao();
    };

    const alterarEtapa = (indice, campo, valor) => {
        setEtapas((etapasAtuais) => etapasAtuais.map((etapa, posicao) => (
            posicao === indice ? { ...etapa, [campo]: valor } : etapa
        )));
        setErros((errosAtuais) => ({ ...errosAtuais, [`etapas.${indice}.${campo}`]: null }));
        marcarAlteracao();
    };

    const alterarGatilho = (gatilho) => {
        setGatilhosAtivos((estadoAtual) => ({ ...estadoAtual, [gatilho]: !estadoAtual[gatilho] }));
        marcarAlteracao();
    };

    const alterarHorario = (campo, valor) => {
        setHorario((estadoAtual) => ({ ...estadoAtual, [campo]: valor }));
        setErros((errosAtuais) => ({ ...errosAtuais, horario: null }));
        marcarAlteracao();
    };

    const adicionarEtapa = () => {
        setEtapas((etapasAtuais) => [...etapasAtuais, criarEtapaVazia()]);
        setPausasAtivas((pausasAtuais) => [...pausasAtuais, false]);
        setEtapaSelecionada(etapas.length);
        setErros((errosAtuais) => ({ ...errosAtuais, etapas: null }));
        marcarAlteracao();
    };

    const adicionarCondicao = () => {
        if (!podeCondicaoHorario) {
            return;
        }

        setEtapas((etapasAtuais) => [...etapasAtuais, criarEtapaCondicaoVazia()]);
        setPausasAtivas((pausasAtuais) => [...pausasAtuais, false]);
        setEtapaSelecionada(etapas.length);
        setErros((errosAtuais) => ({ ...errosAtuais, etapas: null }));
        marcarAlteracao();
    };

    const remapearDestinoAposExclusao = (destino, indiceRemovido) => {
        const ordem = Number(destino);

        if (!Number.isInteger(ordem) || ordem < 1) {
            return null;
        }

        if (ordem === indiceRemovido + 1) {
            return null;
        }

        return ordem > indiceRemovido + 1 ? ordem - 1 : ordem;
    };

    const confirmarExclusaoEtapa = () => {
        if (etapaParaExcluir === null) {
            return;
        }

        const indice = etapaParaExcluir;
        const novasEtapas = etapas
            .filter((_, posicao) => posicao !== indice)
            .map((etapa) => {
                if (etapa.tipo !== 'condicao_horario') {
                    return etapa;
                }

                return {
                    ...etapa,
                    condicoes: (etapa.condicoes ?? []).map((condicao) => ({
                        ...condicao,
                        destino_ordem: remapearDestinoAposExclusao(condicao.destino_ordem, indice),
                    })),
                    destino_nao_ordem: remapearDestinoAposExclusao(etapa.destino_nao_ordem, indice),
                };
            });
        const novasPausas = pausasAtivas.filter((_, posicao) => posicao !== indice);

        setEtapas(novasEtapas);
        setPausasAtivas(novasPausas);
        setEtapaSelecionada(Math.min(indice, Math.max(0, novasEtapas.length - 1)));
        setEtapaParaExcluir(null);
        setErros({});
        marcarAlteracao();
    };

    const alterarCondicao = (indiceEtapa, indiceCondicao, campo, valor) => {
        setEtapas((etapasAtuais) => etapasAtuais.map((etapa, posicao) => {
            if (posicao !== indiceEtapa) {
                return etapa;
            }

            return {
                ...etapa,
                condicoes: (etapa.condicoes ?? []).map((condicao, posicaoCondicao) => (
                    posicaoCondicao === indiceCondicao ? { ...condicao, [campo]: valor } : condicao
                )),
            };
        }));
        setErros((errosAtuais) => ({
            ...errosAtuais,
            [`etapas.${indiceEtapa}.condicoes.${indiceCondicao}.${campo}`]: null,
        }));
        marcarAlteracao();
    };

    const adicionarCondicaoNoBloco = (indiceEtapa) => {
        setEtapas((etapasAtuais) => etapasAtuais.map((etapa, posicao) => (
            posicao === indiceEtapa
                ? { ...etapa, condicoes: [...(etapa.condicoes ?? []), criarCondicaoVazia()] }
                : etapa
        )));
        setErros((errosAtuais) => ({ ...errosAtuais, [`etapas.${indiceEtapa}.condicoes`]: null }));
        marcarAlteracao();
    };

    const removerCondicaoDoBloco = (indiceEtapa, indiceCondicao) => {
        setEtapas((etapasAtuais) => etapasAtuais.map((etapa, posicao) => (
            posicao === indiceEtapa
                ? {
                    ...etapa,
                    condicoes: (etapa.condicoes ?? []).filter((_, posicaoCondicao) => posicaoCondicao !== indiceCondicao),
                }
                : etapa
        )));
        marcarAlteracao();
    };

    const alternarPausa = (indice, habilitada) => {
        setPausasAtivas((pausasAtuais) => pausasAtuais.map((pausa, posicao) => (
            posicao === indice ? habilitada : pausa
        )));

        if (!habilitada) {
            alterarEtapa(indice, 'pausa_segundos', 0);
            return;
        }

        // Valor inicial sensato ao ativar a pausa; preserva valor já configurado.
        const segundosAtuais = Math.round(Number(etapas[indice].pausa_segundos) || 0);
        if (segundosAtuais <= 0) {
            alterarEtapa(indice, 'pausa_segundos', PAUSA_PADRAO_SEGUNDOS);
        }

        setPausaInput(formatarSegundosEmUnidade(
            Math.max(segundosAtuais, segundosAtuais > 0 ? segundosAtuais : PAUSA_PADRAO_SEGUNDOS),
            pausaUnidade,
        ));
        setErros((errosAtuais) => ({ ...errosAtuais, [`etapas.${indice}.pausa_segundos`]: null }));
        marcarAlteracao();
    };

    const alternarIndicadorDigitacao = (indice, habilitado) => {
        alterarEtapa(indice, 'indicador_digitacao_ativo', habilitado);

        const segundosAtuais = Number(etapas[indice]?.indicador_digitacao_segundos) || 0;
        if (habilitado && segundosAtuais < 1) {
            alterarEtapa(indice, 'indicador_digitacao_segundos', INDICADOR_DIGITACAO_PADRAO_SEGUNDOS);
        }
    };

    const alterarSegundosIndicador = (indice, valor) => {
        alterarEtapa(indice, 'indicador_digitacao_segundos', valor === '' ? '' : Number(valor));
    };

    const alterarUnidadePausa = (unidade) => {
        if (unidade === pausaUnidade) {
            return;
        }

        setPausaUnidade(unidade);

        if (pausasAtivas[etapaSelecionada] && etapas[etapaSelecionada]) {
            setPausaInput(formatarSegundosEmUnidade(etapas[etapaSelecionada].pausa_segundos, unidade));
        }
    };

    const alterarPausaInput = (valor) => {
        setPausaInput(valor);
        alterarEtapa(etapaSelecionada, 'pausa_segundos', converterSegundosDoInput(valor, pausaUnidade));
    };

    useEffect(() => {
        if (pausasAtivas[etapaSelecionada] && etapas[etapaSelecionada]) {
            setPausaInput(formatarSegundosEmUnidade(etapas[etapaSelecionada].pausa_segundos, pausaUnidade));
        }
    }, [etapaSelecionada, pausaUnidade]);

    const fecharAvisoSaida = () => {
        setAvisoSaidaAberto(false);
        destinoSaidaRef.current = null;
    };

    const confirmarSaidaSemGuardar = () => {
        const destino = destinoSaidaRef.current;
        setAvisoSaidaAberto(false);
        destinoSaidaRef.current = null;

        if (destino) {
            liberarSaidaRef.current = true;
            router.visit(destino);
        }
    };

    const inserirVariavel = (variavel) => {
        if (etapaSelecionada < 0 || !etapaAtual) {
            return;
        }

        const textarea = areaTexto.current;
        const textoAtual = etapaAtual.texto ?? '';
        const inicio = textarea?.selectionStart ?? textoAtual.length;
        const fim = textarea?.selectionEnd ?? inicio;
        const texto = `${textoAtual.slice(0, inicio)}${variavel}${textoAtual.slice(fim)}`;

        alterarEtapa(etapaSelecionada, 'texto', texto);
        requestAnimationFrame(() => {
            textarea?.focus();
            textarea?.setSelectionRange(inicio + variavel.length, inicio + variavel.length);
        });
    };

    const alterarTipoEtapa = (indice, tipoConteudo) => {
        if (!suportaMidia && tipoConteudo !== 'texto') {
            return;
        }

        setEtapas((etapasAtuais) => etapasAtuais.map((etapa, posicao) => {
            if (posicao !== indice || etapa.tipo === 'condicao_horario') {
                return etapa;
            }

            if ((etapa.tipoConteudo ?? 'texto') === tipoConteudo) {
                return etapa;
            }

            const tinhaAnexo = Boolean(etapa.arquivo || etapa.anexo?.existente);

            return {
                ...etapa,
                tipoConteudo,
                arquivo: null,
                anexo: null,
                anexoLocalId: null,
                removerAnexo: tinhaAnexo ? true : etapa.removerAnexo,
            };
        }));
        setErros((errosAtuais) => ({
            ...errosAtuais,
            [`etapas.${indice}.anexo`]: null,
            [`etapas.${indice}.tipo_conteudo`]: null,
        }));
        marcarAlteracao();
    };

    const selecionarAnexo = (indice, ficheiro) => {
        if (!ficheiro) {
            return;
        }

        setEtapas((etapasAtuais) => etapasAtuais.map((etapa, posicao) => (
            posicao === indice
                ? {
                    ...etapa,
                    arquivo: ficheiro,
                    anexo: {
                        existente: false,
                        nome: ficheiro.name,
                        tamanho: ficheiro.size,
                        formato: ficheiro.type || null,
                        url: null,
                    },
                    anexoLocalId: `${Date.now()}-${Math.random()}`,
                    removerAnexo: false,
                }
                : etapa
        )));
        setErros((errosAtuais) => ({ ...errosAtuais, [`etapas.${indice}.anexo`]: null }));
        marcarAlteracao();
    };

    const removerAnexo = (indice) => {
        setEtapas((etapasAtuais) => etapasAtuais.map((etapa, posicao) => {
            if (posicao !== indice) {
                return etapa;
            }

            return {
                ...etapa,
                tipoConteudo: 'texto',
                arquivo: null,
                anexo: null,
                anexoLocalId: null,
                removerAnexo: Boolean(etapa.anexo?.existente || etapa.removerAnexo),
            };
        }));
        setErros((errosAtuais) => ({ ...errosAtuais, [`etapas.${indice}.anexo`]: null }));
        marcarAlteracao();
    };

    const salvar = (evento) => {
        evento.preventDefault();
        const nomeValido = nome.trim();

        if (!nomeValido) {
            setErros({ nome: 'Informe um nome para o fluxo.' });
            setEstadoGravacao('erro');
            return;
        }

        if (criando && etapas.length === 0) {
            setErros({ etapas: 'Adiciona pelo menos uma etapa antes de criar o fluxo.' });
            setEstadoGravacao('erro');
            return;
        }

        const erroMidia = validarMidiaDasEtapas(etapas, suportaMidia);
        if (erroMidia) {
            setEtapaSelecionada(erroMidia.indice);
            setErros({ [erroMidia.campo]: erroMidia.mensagem });
            setEstadoGravacao('erro');
            return;
        }

        const erroCondicao = validarCondicoesDasEtapas(etapas);
        if (erroCondicao) {
            setEtapaSelecionada(erroCondicao.indice);
            setErros({ [erroCondicao.campo]: erroCondicao.mensagem });
            setEstadoGravacao('erro');
            return;
        }

        const pausaInvalida = pausasAtivas.findIndex((habilitada, indice) => (
            habilitada
            && etapas[indice]?.tipo !== 'condicao_horario'
            && !etapas[indice]?.encerra_apos
            && indice < etapas.length - 1
            && Number(etapas[indice].pausa_segundos) <= 0
        ));
        if (pausaInvalida !== -1) {
            setEtapaSelecionada(pausaInvalida);
            setErros({ [`etapas.${pausaInvalida}.pausa_segundos`]: 'Informe uma pausa maior que zero.' });
            setEstadoGravacao('erro');
            return;
        }

        const indicadorInvalido = etapas.findIndex((etapa) => {
            if (!etapa.indicador_digitacao_ativo) {
                return false;
            }

            const segundos = Number(etapa.indicador_digitacao_segundos);

            return !Number.isFinite(segundos)
                || segundos < 1
                || segundos > INDICADOR_DIGITACAO_MAXIMO_SEGUNDOS;
        });
        if (indicadorInvalido !== -1) {
            setEtapaSelecionada(indicadorInvalido);
            setErros({
                [`etapas.${indicadorInvalido}.indicador_digitacao_segundos`]:
                    `Informe uma duração entre 1 e ${INDICADOR_DIGITACAO_MAXIMO_SEGUNDOS} segundos.`,
            });
            setEstadoGravacao('erro');
            return;
        }

        if (horario.ativo && (!horario.inicio || !horario.fim)) {
            setErros({ horario: 'Define a hora inicial e a hora final do horário permitido.' });
            setEstadoGravacao('erro');
            return;
        }

        if (horario.ativo && horario.inicio === horario.fim) {
            setErros({ horario: 'A hora inicial e a hora final devem ser diferentes.' });
            setEstadoGravacao('erro');
            return;
        }

        setErros({});
        const dados = {
            nome: nomeValido,
            ativo,
            etapas: etapas.map((etapa, indice) => ({
                tipo: etapa.tipo,
                tipo_conteudo: etapa.tipo === 'condicao_horario' ? 'texto' : (etapa.tipoConteudo ?? 'texto'),
                texto: etapa.tipo === 'condicao_horario'
                    ? ''
                    : (etapa.tipoConteudo === 'texto' ? etapa.texto : ''),
                anexo: etapa.tipo !== 'condicao_horario' ? (etapa.arquivo ?? null) : null,
                remover_anexo: etapa.tipo !== 'condicao_horario' && Boolean(etapa.removerAnexo),
                pausa_segundos: etapa.tipo !== 'condicao_horario'
                    && !etapa.encerra_apos
                    && pausasAtivas[indice]
                    ? Math.round(Number(etapa.pausa_segundos)) || 0
                    : 0,
                indicador_digitacao_ativo: etapa.tipo !== 'condicao_horario'
                    && Boolean(etapa.indicador_digitacao_ativo),
                indicador_digitacao_segundos: segundosIndicadorValidos(etapa.indicador_digitacao_segundos),
                condicoes: etapa.tipo === 'condicao_horario'
                    ? (etapa.condicoes ?? []).map((condicao) => ({
                        inicio: condicao.inicio,
                        fim: condicao.fim,
                        destino_ordem: Number(condicao.destino_ordem),
                    }))
                    : [],
                destino_nao_ordem: etapa.tipo === 'condicao_horario'
                    ? normalizarDestino(etapa.destino_nao_ordem)
                    : null,
                encerra_apos: etapa.tipo !== 'condicao_horario' && Boolean(etapa.encerra_apos),
            })),
            regras: Object.entries(gatilhosAtivos).map(([gatilho, ativoGatilho]) => ({
                gatilho,
                ativo: ativoGatilho,
            })),
            horario: {
                ativo: horario.ativo,
                inicio: horario.ativo ? horario.inicio : null,
                fim: horario.ativo ? horario.fim : null,
                fora_horario: horario.fora_horario,
            },
        };

        const opcoes = {
            preserveScroll: true,
            forceFormData: true,
            onStart: () => setEstadoGravacao('a_guardar'),
            onSuccess: () => {
                setNome(nomeValido);
                setSincronizacaoForcada((valor) => valor + 1);
                setEstadoGravacao('guardado');
                toast.success(criando ? 'Fluxo criado' : 'Alterações salvas', {
                    description: `“${nomeValido}” foi salvo no sistema.`,
                });
            },
            onError: (errosRecebidos) => {
                setErros(errosRecebidos);
                const erroDeEtapa = Object.keys(errosRecebidos).find((campo) => campo.startsWith('etapas.'));
                const indiceComErro = erroDeEtapa ? Number(erroDeEtapa.split('.')[1]) : -1;

                if (indiceComErro >= 0 && indiceComErro < etapas.length) {
                    setEtapaSelecionada(indiceComErro);
                }

                setEstadoGravacao('erro');
                toast.error('Não foi possível salvar o fluxo', {
                    description: Object.values(errosRecebidos)[0] ?? 'Verifica os campos e tenta novamente.',
                });
            },
            onHttpException: () => {
                setEstadoGravacao('erro');
                toast.error('Não foi possível salvar o fluxo', {
                    description: 'O servidor não confirmou a gravação.',
                });
            },
            onNetworkError: () => {
                setEstadoGravacao('erro');
                toast.error('Não foi possível salvar o fluxo', {
                    description: 'Verifica a ligação e tenta novamente.',
                });
            },
            onFinish: () => setEstadoGravacao((estado) => (
                estado === 'a_guardar' ? 'erro' : estado
            )),
        };

        if (fluxo?.id) {
            // Multipart não é interpretado pelo PHP em PUT; envia POST com
            // method spoofing para que o Laravel leia arquivos corretamente.
            router.post(`/fluxos/${fluxo.id}`, { ...dados, _method: 'PUT' }, opcoes);
        } else {
            router.post('/fluxos', dados, opcoes);
        }
    };

    const nomeGatilhosSelecionados = gatilhos
        .filter((gatilho) => gatilhosAtivos[gatilho.valor])
        .map((gatilho) => gatilho.rotulo);

    const pausasConfiguradas = pausasAtivas.filter((pausa, indice) => (
        pausa && indice < etapas.length - 1 && Number(etapas[indice]?.pausa_segundos) > 0
    )).length;

    return (
        <>
            <form onSubmit={salvar} className="flex h-full min-h-0 flex-col bg-background">
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
                        <PageHeader
                            eyebrow="Fluxos"
                            title={criando ? 'Novo fluxo' : 'Editar fluxo'}
                            description="Organiza as etapas e configura como este fluxo é iniciado."
                            actions={(
                                <Button asChild type="button" variant="outline" className="h-10">
                                    <Link href="/fluxos">
                                        <ArrowLeft />
                                        Voltar à central
                                    </Link>
                                </Button>
                            )}
                        />

                        <section className="mb-4 grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
                            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                                Nome do fluxo
                                <Input
                                    value={nome}
                                    onChange={(evento) => {
                                        setNome(evento.target.value);
                                        setErros((errosAtuais) => ({ ...errosAtuais, nome: null }));
                                        marcarAlteracao();
                                    }}
                                    aria-invalid={Boolean(erros.nome)}
                                    className="h-10 bg-background text-sm font-medium text-foreground"
                                />
                                {erros.nome && <span role="alert" className="text-xs text-destructive">{erros.nome}</span>}
                            </label>
                            <div className="inline-flex min-h-10 items-center gap-2.5 rounded-xl px-2">
                                <Switch
                                    id="fluxo-ativo"
                                    checked={ativo}
                                    onCheckedChange={(verificado) => {
                                        setAtivo(verificado);
                                        marcarAlteracao();
                                    }}
                                />
                                <label htmlFor="fluxo-ativo" className="cursor-pointer text-sm font-medium text-foreground select-none">
                                    Fluxo ativo
                                </label>
                                <span
                                    aria-hidden="true"
                                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ativo
                                        ? 'bg-terracota/10 text-terracota-escuro dark:text-terracota'
                                        : 'bg-muted text-muted-foreground'}`}
                                >
                                    {ativo ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </section>

                        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
                            <div className="min-w-0 space-y-4">
                                <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h2 className="text-sm font-semibold text-foreground">Início do fluxo</h2>
                                            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                                                Escolha os gatilhos que iniciam este fluxo automaticamente quando chega uma mensagem.
                                            </p>
                                        </div>
                                    </div>
                                    <fieldset className="mt-3 flex flex-wrap gap-2">
                                        <legend className="sr-only">Gatilhos que iniciam o fluxo</legend>
                                        {gatilhos.map((gatilho) => {
                                            const gatilhoAtivo = Boolean(gatilhosAtivos[gatilho.valor]);

                                            return (
                                                <button
                                                    key={gatilho.valor}
                                                    type="button"
                                                    aria-pressed={gatilhoAtivo}
                                                    onClick={() => alterarGatilho(gatilho.valor)}
                                                    className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${gatilhoAtivo
                                                        ? 'border-terracota/30 bg-terracota/10 text-terracota-escuro dark:text-terracota'
                                                        : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                                >
                                                    <span className={`flex size-4 items-center justify-center rounded-md transition-colors ${gatilhoAtivo
                                                        ? 'bg-terracota text-primary-foreground'
                                                        : 'border border-input bg-background'}`}>
                                                        {gatilhoAtivo && <Check className="size-3" />}
                                                    </span>
                                                    {gatilho.rotulo}
                                                </button>
                                            );
                                        })}
                                    </fieldset>
                                </section>

                                <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h2 className="text-sm font-semibold text-foreground">Horário de início</h2>
                                            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                                                Opcional: quando ativado, mensagens recebidas só iniciam este fluxo dentro da janela permitida.
                                            </p>
                                        </div>
                                        <div className="inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-xl px-2">
                                            <Switch
                                                id="horario-inicio-ativo"
                                                checked={horario.ativo}
                                                onCheckedChange={(verificado) => alterarHorario('ativo', verificado)}
                                            />
                                            <label htmlFor="horario-inicio-ativo" className="cursor-pointer text-sm font-medium text-foreground select-none">
                                                Ativar horário
                                            </label>
                                        </div>
                                    </div>

                                    {horario.ativo && (
                                        <div className="mt-4 space-y-4">
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                                                    Início permitido
                                                    <Input
                                                        type="time"
                                                        step={60}
                                                        value={horario.inicio}
                                                        onChange={(evento) => alterarHorario('inicio', evento.target.value)}
                                                        aria-invalid={Boolean(erros.horario)}
                                                        className="h-10 bg-background text-sm tabular-nums text-foreground"
                                                    />
                                                </label>
                                                <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                                                    Fim permitido
                                                    <Input
                                                        type="time"
                                                        step={60}
                                                        value={horario.fim}
                                                        onChange={(evento) => alterarHorario('fim', evento.target.value)}
                                                        aria-invalid={Boolean(erros.horario)}
                                                        className="h-10 bg-background text-sm tabular-nums text-foreground"
                                                    />
                                                </label>
                                            </div>
                                            <p className="text-[11px] leading-5 text-muted-foreground">
                                                Formato de 24 horas, com limites inclusivos. Suporta janelas que atravessam a meia-noite (ex.: 22:00 às 06:00).
                                                A janela é avaliada no fuso horário da aplicação; a avaliação pelo fuso da conta chega com o isolamento multi-conta.
                                            </p>
                                            <fieldset>
                                                <legend className="mb-2 block text-xs font-medium text-muted-foreground">
                                                    Quando uma mensagem chega fora do horário
                                                </legend>
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {opcoesForaHorario.map((opcao) => {
                                                        const selecionada = horario.fora_horario === opcao.valor;

                                                        return (
                                                            <button
                                                                key={opcao.valor}
                                                                type="button"
                                                                aria-pressed={selecionada}
                                                                onClick={() => alterarHorario('fora_horario', opcao.valor)}
                                                                className={`flex min-h-10 cursor-pointer flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${selecionada
                                                                    ? 'border-terracota/30 bg-terracota/10'
                                                                    : 'border-border hover:bg-accent'}`}
                                                            >
                                                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${selecionada ? 'text-terracota-escuro dark:text-terracota' : 'text-foreground'}`}>
                                                                    <span className={`flex size-4 items-center justify-center rounded-md transition-colors ${selecionada
                                                                        ? 'bg-terracota text-primary-foreground'
                                                                        : 'border border-input bg-background'}`}>
                                                                        {selecionada && <Check className="size-3" />}
                                                                    </span>
                                                                    {opcao.rotulo}
                                                                </span>
                                                                <span className="text-[11px] leading-5 text-muted-foreground">{opcao.descricao}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </fieldset>
                                        </div>
                                    )}

                                    {erros.horario && (
                                        <p role="alert" className="mt-3 text-xs text-destructive">{erros.horario}</p>
                                    )}
                                </section>

                                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                                    <div className="flex min-w-0 items-center gap-2 overflow-x-auto border-b border-border p-3">
                                        <div role="tablist" aria-label="Etapas do fluxo" className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
                                            {etapas.map((etapa, indice) => (
                                                <button
                                                    key={indice}
                                                    type="button"
                                                    role="tab"
                                                    id={`tab-etapa-${indice}`}
                                                    aria-controls="painel-etapa"
                                                    aria-selected={etapaSelecionada === indice}
                                                    onClick={() => setEtapaSelecionada(indice)}
                                                    className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${etapaSelecionada === indice
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                                >
                                                    <span className="tabular-nums">{indice + 1}</span>
                                                    <span>{etapa.tipo === 'condicao_horario' ? 'Condição' : `Etapa ${indice + 1}`}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={adicionarCondicao}
                                            disabled={!podeCondicaoHorario}
                                            title={!suportaCondicaoHorario
                                                ? 'A migration de condições por horário ainda não foi executada'
                                                : !podeCondicaoHorario
                                                    ? 'Confirme o fuso horário da conta em Configurações para usar condições'
                                                    : 'Adicionar bloco de condição por horário'}
                                            className="shrink-0"
                                        >
                                            <Clock3 />
                                            Condição
                                        </Button>
                                        <Button type="button" variant="outline" size="icon-sm" aria-label="Adicionar etapa" title="Adicionar etapa" onClick={adicionarEtapa}>
                                            <Plus />
                                        </Button>
                                    </div>
                                    {erros.etapas && (
                                        <p role="alert" className="border-b border-border bg-destructive/5 px-4 py-2 text-xs text-destructive">
                                            {erros.etapas}
                                        </p>
                                    )}

                                    {etapaAtual ? (
                                        <div id="painel-etapa" role="tabpanel" aria-labelledby={`tab-etapa-${etapaSelecionada}`} className="space-y-5 p-4 sm:p-5">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-terracota-escuro dark:text-muted-foreground">Etapa {etapaSelecionada + 1} de {etapas.length}</p>
                                                    <h2 className="mt-1 text-base font-semibold text-foreground">
                                                        {etapaAtual.tipo === 'condicao_horario' ? 'Ramificação por horário' : 'Conteúdo da mensagem'}
                                                    </h2>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setEtapaParaExcluir(etapaSelecionada)}
                                                    className="h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <Trash2 />
                                                    Remover etapa
                                                </Button>
                                            </div>

                                            {etapaAtual.tipo === 'condicao_horario' ? (
                                                <EditorCondicaoHorario
                                                    etapa={etapaAtual}
                                                    indice={etapaSelecionada}
                                                    etapas={etapas}
                                                    erros={erros}
                                                    fusoConta={fusoConta}
                                                    aoAlterarCondicao={alterarCondicao}
                                                    aoAdicionarCondicao={adicionarCondicaoNoBloco}
                                                    aoRemoverCondicao={removerCondicaoDoBloco}
                                                    aoAlterarDestinoNao={(indice, valor) => alterarEtapa(indice, 'destino_nao_ordem', normalizarDestino(valor))}
                                                />
                                            ) : (
                                            <>
                                            <div>
                                                <span id="tipo-conteudo-rotulo" className="mb-2 block text-xs font-medium text-muted-foreground">Tipo de conteúdo</span>
                                                <div role="group" aria-labelledby="tipo-conteudo-rotulo" className="flex flex-wrap gap-1.5">
                                                    {tiposConteudo.map((tipo) => {
                                                        const Icone = tipo.icone;
                                                        const selecionado = tipoAtual.valor === tipo.valor;
                                                        const desabilitado = !suportaMidia && tipo.valor !== 'texto';

                                                        return (
                                                            <button
                                                                key={tipo.valor}
                                                                type="button"
                                                                aria-pressed={selecionado}
                                                                disabled={desabilitado}
                                                                onClick={() => alterarTipoEtapa(etapaSelecionada, tipo.valor)}
                                                                title={desabilitado ? 'A migration de mídia ainda não foi executada' : undefined}
                                                                className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${selecionado
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                                            >
                                                                <Icone className="size-3.5" />
                                                                {tipo.rotulo}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {!suportaMidia && (
                                                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                                                        A migration de mídia ainda não foi executada; apenas texto está disponível.
                                                    </p>
                                                )}
                                            </div>

                                            {tipoAtual.valor !== 'texto' && (
                                                <div>
                                                    <input
                                                        ref={seletorFicheiro}
                                                        type="file"
                                                        accept={tipoAtual.accept ?? undefined}
                                                        tabIndex={-1}
                                                        aria-hidden="true"
                                                        className="hidden"
                                                        onChange={(evento) => {
                                                            selecionarAnexo(etapaSelecionada, evento.target.files?.[0] ?? null);
                                                            evento.target.value = '';
                                                        }}
                                                    />

                                                    {(etapaAtual.arquivo || etapaAtual.anexo) ? (
                                                        <div className="space-y-2">
                                                            <AnexoMidiaPreview etapa={etapaAtual} />
                                                            <div className="flex flex-wrap gap-2">
                                                                <Button type="button" variant="outline" size="sm" onClick={() => seletorFicheiro.current?.click()}>
                                                                    <Upload />
                                                                    Substituir arquivo
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removerAnexo(etapaSelecionada)}
                                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                >
                                                                    <X />
                                                                    Remover mídia
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => seletorFicheiro.current?.click()}
                                                            className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:border-terracota/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                                                        >
                                                            <span className="flex size-10 items-center justify-center rounded-xl bg-terracota/10 text-terracota">
                                                                <Upload className="size-5" />
                                                            </span>
                                                            <span className="text-sm font-medium text-foreground">Selecionar {tipoAtual.descricaoPicker}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {tipoAtual.extensoes.map((extensao) => extensao.toUpperCase()).join(', ')} · até {tipoAtual.limiteMb} MB
                                                            </span>
                                                        </button>
                                                    )}

                                                    {erros[`etapas.${etapaSelecionada}.anexo`] && (
                                                        <p role="alert" className="mt-1.5 text-xs text-destructive">
                                                            {erros[`etapas.${etapaSelecionada}.anexo`]}
                                                        </p>
                                                    )}
                                                    <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
                                                        <Info className="mt-px size-3.5 shrink-0" />
                                                        O arquivo é guardado em armazenamento privado e enviado como anexo reutilizável da Página conectada. A Meta aceita um anexo por mensagem.
                                                    </p>
                                                </div>
                                            )}

                                            <div>
                                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                    <label htmlFor="conteudo-etapa" className="text-xs font-medium text-muted-foreground">
                                                        {tipoAtual.valor === 'texto' ? 'Texto' : 'Texto (não suportado junto com mídia)'}
                                                    </label>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="mr-1 text-[11px] text-muted-foreground">Inserir variável</span>
                                                        <DropdownMenu.Root>
                                                            <DropdownMenu.Trigger asChild>
                                                                <Button type="button" size="xs" variant="outline">
                                                                    <Braces />
                                                                    Variáveis
                                                                    <ChevronDown />
                                                                </Button>
                                                            </DropdownMenu.Trigger>
                                                            <DropdownMenu.Portal>
                                                                <DropdownMenu.Content
                                                                    align="end"
                                                                    sideOffset={6}
                                                                    className="z-50 min-w-60 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
                                                                >
                                                                    <DropdownMenu.Label className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                                        Variáveis disponíveis
                                                                    </DropdownMenu.Label>
                                                                    {variaveis.map((variavel) => {
                                                                        const Icone = variavel.icone;

                                                                        return (
                                                                            <DropdownMenu.Item
                                                                                key={variavel.valor}
                                                                                onSelect={() => inserirVariavel(variavel.valor)}
                                                                                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 outline-none select-none data-[highlighted]:bg-accent"
                                                                            >
                                                                                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-terracota/10 text-terracota">
                                                                                    <Icone className="size-3.5" />
                                                                                </span>
                                                                                <span className="min-w-0 flex-1">
                                                                                    <span className="block truncate text-xs font-medium text-foreground">{variavel.rotulo}</span>
                                                                                    <span className="block text-[11px] text-muted-foreground">{variavel.valor}</span>
                                                                                </span>
                                                                            </DropdownMenu.Item>
                                                                        );
                                                                    })}
                                                                </DropdownMenu.Content>
                                                            </DropdownMenu.Portal>
                                                        </DropdownMenu.Root>
                                                    </div>
                                                </div>
                                                <Textarea
                                                    id="conteudo-etapa"
                                                    ref={areaTexto}
                                                    value={etapaAtual.texto}
                                                    onChange={(evento) => alterarEtapa(etapaSelecionada, 'texto', evento.target.value)}
                                                    aria-invalid={Boolean(erros[`etapas.${etapaSelecionada}.texto`])}
                                                    aria-label={`Texto da etapa ${etapaSelecionada + 1}`}
                                                    placeholder={tipoAtual.valor === 'texto'
                                                        ? 'Escreva a mensagem desta etapa...'
                                                        : 'Deixe vazio para enviar apenas a mídia...'}
                                                    rows={7}
                                                    className="min-h-40 resize-y bg-background text-sm leading-6"
                                                />
                                                {erros[`etapas.${etapaSelecionada}.texto`] && (
                                                    <p role="alert" className="mt-1.5 text-xs text-destructive">
                                                        {erros[`etapas.${etapaSelecionada}.texto`]}
                                                    </p>
                                                )}
                                                {tipoAtual.valor === 'texto' ? (
                                                    <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                                                        As variáveis {'{{nome}}'} e {'{{psid}}'} são substituídas no envio.
                                                    </p>
                                                ) : etapaAtual.texto?.trim() ? (
                                                    <p role="alert" className="mt-1.5 text-xs text-destructive">
                                                        A Meta aceita texto ou anexo, mas não ambos neste formato. Remova o texto ou use uma etapa de texto.
                                                    </p>
                                                ) : (
                                                    <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                                                        Esta etapa envia apenas o anexo. Use uma etapa de texto separada se precisar de legenda.
                                                    </p>
                                                )}
                                            </div>

                                            <section className="rounded-xl border border-border bg-background p-3.5 sm:p-4">
                                                <div className="flex items-start gap-3">
                                                    <Switch
                                                        id={`indicador-digitacao-${etapaSelecionada}`}
                                                        checked={Boolean(etapaAtual.indicador_digitacao_ativo)}
                                                        disabled={!suportaIndicadorDigitacao}
                                                        onCheckedChange={(habilitado) => alternarIndicadorDigitacao(etapaSelecionada, habilitado)}
                                                        className="mt-0.5"
                                                    />
                                                    <div>
                                                        <label htmlFor={`indicador-digitacao-${etapaSelecionada}`} className="block cursor-pointer text-sm font-medium text-foreground select-none">
                                                            Mostrar indicador de digitação
                                                        </label>
                                                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                                                            Exibe “digitando…” antes desta mensagem. É independente da pausa para a próxima etapa.
                                                        </span>
                                                    </div>
                                                </div>
                                                {etapaAtual.indicador_digitacao_ativo && (
                                                    <div className="mt-3 max-w-xs">
                                                        <label htmlFor={`indicador-segundos-${etapaSelecionada}`} className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                                            Duração do indicador
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                id={`indicador-segundos-${etapaSelecionada}`}
                                                                type="number"
                                                                inputMode="numeric"
                                                                min={1}
                                                                max={INDICADOR_DIGITACAO_MAXIMO_SEGUNDOS}
                                                                step={1}
                                                                value={etapaAtual.indicador_digitacao_segundos}
                                                                onChange={(evento) => alterarSegundosIndicador(etapaSelecionada, evento.target.value)}
                                                                aria-invalid={Boolean(erros[`etapas.${etapaSelecionada}.indicador_digitacao_segundos`])}
                                                                className="h-10 max-w-24 bg-card text-sm tabular-nums"
                                                            />
                                                            <span className="text-xs text-muted-foreground">segundos</span>
                                                        </div>
                                                        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                                                            Entre 1 e {INDICADOR_DIGITACAO_MAXIMO_SEGUNDOS} segundos, o limite atual da Send API.
                                                        </p>
                                                        {erros[`etapas.${etapaSelecionada}.indicador_digitacao_segundos`] && (
                                                            <p role="alert" className="mt-1.5 text-xs text-destructive">
                                                                {erros[`etapas.${etapaSelecionada}.indicador_digitacao_segundos`]}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                {!suportaIndicadorDigitacao && (
                                                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                                                        A migration do indicador de digitação ainda não foi executada neste banco; a opção ficará disponível após a autorização.
                                                    </p>
                                                )}
                                            </section>

                                            {etapaSelecionada < etapas.length - 1 && (
                                                <section className="rounded-xl border border-border bg-background p-3.5 sm:p-4">
                                                    <div className="flex items-start gap-3">
                                                        <Switch
                                                            id={`encerra-apos-${etapaSelecionada}`}
                                                            checked={Boolean(etapaAtual.encerra_apos)}
                                                            disabled={!suportaCondicaoHorario}
                                                            onCheckedChange={(habilitado) => {
                                                                alterarEtapa(etapaSelecionada, 'encerra_apos', habilitado);
                                                                if (habilitado) {
                                                                    setPausasAtivas((pausasAtuais) => pausasAtuais.map((pausa, posicao) => (
                                                                        posicao === etapaSelecionada ? false : pausa
                                                                    )));
                                                                }
                                                            }}
                                                            className="mt-0.5"
                                                        />
                                                        <div>
                                                            <label htmlFor={`encerra-apos-${etapaSelecionada}`} className="block cursor-pointer text-sm font-medium text-foreground select-none">
                                                                Encerrar fluxo após esta etapa
                                                            </label>
                                                            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                                                                Útil em ramos independentes: a execução termina sem seguir para a próxima etapa da lista.
                                                            </span>
                                                        </div>
                                                    </div>
                                                </section>
                                            )}

                                            {etapaSelecionada < etapas.length - 1 && !etapaAtual.encerra_apos ? (
                                                <section className="rounded-xl border border-border bg-background p-3.5 sm:p-4">
                                                    <div className="flex items-start gap-3">
                                                        <Switch
                                                            id="pausa-etapa-atual"
                                                            checked={Boolean(pausasAtivas[etapaSelecionada])}
                                                            onCheckedChange={(habilitada) => alternarPausa(etapaSelecionada, habilitada)}
                                                            className="mt-0.5"
                                                        />
                                                        <div>
                                                            <label htmlFor="pausa-etapa-atual" className="block cursor-pointer text-sm font-medium text-foreground select-none">
                                                                Adicionar pausa antes da próxima etapa
                                                            </label>
                                                            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">Desativada por padrão; configurada em segundos ou minutos.</span>
                                                        </div>
                                                    </div>
                                                    {pausasAtivas[etapaSelecionada] && (
                                                        <div className="mt-3 max-w-xs">
                                                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                                                <label htmlFor="pausa-etapa" className="block text-xs font-medium text-muted-foreground">Duração da pausa</label>
                                                                <div role="group" aria-label="Unidade da pausa" className="flex items-center gap-1">
                                                                    {[{ valor: 'segundos', rotulo: 'Segundos' }, { valor: 'minutos', rotulo: 'Minutos' }].map((unidade) => (
                                                                        <button
                                                                            key={unidade.valor}
                                                                            type="button"
                                                                            aria-pressed={pausaUnidade === unidade.valor}
                                                                            onClick={() => alterarUnidadePausa(unidade.valor)}
                                                                            className={`inline-flex h-7 cursor-pointer items-center rounded-lg px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${pausaUnidade === unidade.valor
                                                                                ? 'bg-primary text-primary-foreground'
                                                                                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                                                        >
                                                                            {unidade.rotulo}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <Input
                                                                id="pausa-etapa"
                                                                type="number"
                                                                step="any"
                                                                min={pausaUnidade === 'minutos' ? 1 / 60 : 1}
                                                                value={pausaInput}
                                                                onChange={(evento) => alterarPausaInput(evento.target.value)}
                                                                aria-invalid={Boolean(erros[`etapas.${etapaSelecionada}.pausa_segundos`]) || etapaAtual.pausa_segundos <= 0}
                                                                className="h-10 bg-card text-sm tabular-nums"
                                                            />
                                                            {(erros[`etapas.${etapaSelecionada}.pausa_segundos`] || etapaAtual.pausa_segundos <= 0) && (
                                                                <p role="alert" className="mt-1.5 text-xs text-destructive">
                                                                    {erros[`etapas.${etapaSelecionada}.pausa_segundos`] || 'Informe uma pausa maior que zero.'}
                                                                </p>
                                                            )}
                                                            {pausaUnidade === 'minutos' && (
                                                                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                                                                    Convertido automaticamente para segundos ao salvar.
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </section>
                                            ) : etapaSelecionada >= etapas.length - 1 ? (
                                                <p className="rounded-xl border border-border bg-muted/60 px-3.5 py-3 text-xs leading-5 text-muted-foreground">
                                                    Esta é a última etapa; não há uma etapa seguinte para aguardar.
                                                </p>
                                            ) : null}

                                            </>
                                            )}

                                            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setEtapaSelecionada((indice) => Math.max(0, indice - 1))}
                                                    disabled={etapaSelecionada === 0}
                                                >
                                                    Anterior
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setEtapaSelecionada((indice) => Math.min(etapas.length - 1, indice + 1))}
                                                    disabled={etapaSelecionada >= etapas.length - 1}
                                                >
                                                    Próxima etapa
                                                    <ChevronRight />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="px-4 py-10 text-center">
                                            <p className="text-sm font-medium text-foreground">Ainda não há etapas</p>
                                            <p className="mt-1 text-xs text-muted-foreground">Adiciona uma etapa para começar a editar o conteúdo.</p>
                                            <Button type="button" variant="outline" className="mt-4 h-10" onClick={adicionarEtapa}>
                                                <Plus />
                                                Adicionar etapa
                                            </Button>
                                        </div>
                                    )}
                                </section>
                            </div>

                            <aside className="min-w-0 space-y-4">
                                <MensagemPreview etapa={etapaAtual} indice={etapaSelecionada} total={etapas.length} etapas={etapas} />
                                <ResumoFluxo
                                    nome={nome}
                                    gatilhosAtivos={nomeGatilhosSelecionados}
                                    etapas={etapas}
                                    pausasAtivas={pausasAtivas}
                                    horario={horario}
                                    estadoGravacao={estadoGravacao}
                                />
                            </aside>
                        </div>
                    </div>
                </div>

                <footer className="z-10 shrink-0 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-4px_16px_-12px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:px-6 lg:px-8">
                    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-2 text-xs">
                            {estadoGravacao === 'a_guardar' ? <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" /> : null}
                            {estadoGravacao === 'guardado' ? <CheckCircle2 className="size-4 shrink-0 text-terracota" /> : null}
                            {estadoGravacao === 'alterado' ? <CircleDot className="size-4 shrink-0 text-muted-foreground" /> : null}
                            {estadoGravacao === 'erro' ? <X className="size-4 shrink-0 text-destructive" /> : null}
                            <span className={`truncate ${estadoGravacao === 'erro' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {estadoGravacao === 'guardado' ? 'Salvo com sucesso' : estadoGravacao === 'a_guardar' ? 'Salvando…' : estadoGravacao === 'erro' ? 'Revise os campos antes de salvar' : 'Alterações não salvas'}
                            </span>
                        </div>
                        <Button type="submit" disabled={estadoGravacao === 'a_guardar'} className="h-10 w-full sm:w-auto">
                            {estadoGravacao === 'a_guardar' && <LoaderCircle className="animate-spin" />}
                            {estadoGravacao === 'a_guardar' ? 'Salvando…' : criando ? 'Criar fluxo' : 'Salvar alterações'}
                        </Button>
                    </div>
                </footer>
            </form>

            <ModalFlowChat
                open={etapaParaExcluir !== null}
                onClose={() => setEtapaParaExcluir(null)}
                labelledBy="excluir-etapa-titulo"
                className="max-w-md"
            >
                {etapaParaExcluir !== null && (
                    <div className="p-5 sm:p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                                <Trash2 className="size-5" />
                            </div>
                            <div>
                                <h2 id="excluir-etapa-titulo" className="text-base font-semibold text-foreground">Excluir etapa?</h2>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    A etapa {etapaParaExcluir + 1} será removida das alterações locais. A exclusão só será persistida quando guardares o fluxo.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button type="button" variant="outline" onClick={() => setEtapaParaExcluir(null)} className="h-10">
                                Cancelar
                            </Button>
                            <Button type="button" variant="destructive" onClick={confirmarExclusaoEtapa} className="h-10">
                                Excluir etapa
                            </Button>
                        </div>
                    </div>
                )}
            </ModalFlowChat>

            <ModalFlowChat
                open={avisoSaidaAberto}
                onClose={fecharAvisoSaida}
                labelledBy="sair-do-editor-titulo"
                className="max-w-md"
            >
                <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                            <Info className="size-5" />
                        </div>
                        <div>
                            <h2 id="sair-do-editor-titulo" className="text-base font-semibold text-foreground">Alterações não salvas?</h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Existem alterações ainda não salvas no editor. Ao sair sem salvar, elas serão descartadas.
                            </p>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" onClick={fecharAvisoSaida} className="h-10">
                            Continuar a editar
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmarSaidaSemGuardar} className="h-10">
                            Sair sem salvar
                        </Button>
                    </div>
                </div>
            </ModalFlowChat>
        </>
    );
}
