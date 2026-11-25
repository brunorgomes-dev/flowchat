import { useEffect, useMemo } from 'react';
import {
    AudioLines,
    FileText,
    Hash,
    Image as ImageIcon,
    Type,
    UserRound,
    Video,
} from 'lucide-react';

let sequenciaEtapaLocal = 0;

export const gatilhos = [
    { valor: 'novo_contato', rotulo: 'Novo contato' },
    { valor: 'mensagem_recebida', rotulo: 'Mensagem recebida' },
];

export const tiposConteudo = [
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

export const variaveis = [
    { valor: '{{nome}}', rotulo: 'Nome do contato', icone: UserRound },
    { valor: '{{psid}}', rotulo: 'PSID do contato', icone: Hash },
];

export const INDICADOR_DIGITACAO_PADRAO_SEGUNDOS = 2;
export const INDICADOR_DIGITACAO_MAXIMO_SEGUNDOS = 20;
export const PAUSA_PADRAO_SEGUNDOS = 5;

export const opcoesForaHorario = [
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

export function estaAtivo(valor) {
    return valor === true || valor === 1 || valor === '1';
}

export function segundosIndicadorValidos(valor) {
    const segundos = Math.round(Number(valor) || 0);

    return Math.min(INDICADOR_DIGITACAO_MAXIMO_SEGUNDOS, Math.max(1, segundos));
}

export function normalizarDestino(valor) {
    const numero = Number(valor);

    return Number.isInteger(numero) && numero > 0 ? numero : null;
}

export function criarCondicaoVazia() {
    return { inicio: '', fim: '', destino_ordem: null };
}

export function criarEtapaVazia() {
    return {
        chaveLocal: `etapa-local-${++sequenciaEtapaLocal}`,
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

export function criarEtapaCondicaoVazia() {
    return {
        ...criarEtapaVazia(),
        tipo: 'condicao_horario',
        texto: '',
        condicoes: [criarCondicaoVazia()],
        destino_nao_ordem: null,
    };
}

export function prepararCondicoes(etapa) {
    return (etapa.condicoes ?? []).map((condicao) => ({
        inicio: normalizarHora(condicao.inicio) || '',
        fim: normalizarHora(condicao.fim) || '',
        destino_ordem: normalizarDestino(condicao.destino_ordem),
    }));
}

export function prepararEtapas(fluxo) {
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
            id: etapa.id,
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

export function formatarTamanhoBytes(bytes) {
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

export function descreverAnexo(anexo) {
    if (!anexo) {
        return null;
    }

    const nome = anexo.nome ?? '';
    const extensao = nome.includes('.') ? nome.slice(nome.lastIndexOf('.') + 1).toUpperCase() : null;
    const mime = anexo.formato ? anexo.formato.split('/').pop()?.toUpperCase() : null;
    const partes = [extensao ?? mime, formatarTamanhoBytes(anexo.tamanho)].filter(Boolean);

    return partes.length > 0 ? partes.join(' · ') : null;
}

export function configuracaoTipoConteudo(valor) {
    return tiposConteudo.find((tipo) => tipo.valor === valor) ?? tiposConteudo[0];
}

export function validarArquivoLocal(arquivo, tipoConteudo) {
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

export function validarMidiaDasEtapas(etapas, suportaMidia) {
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

export function renderizarTextoComVariaveis(texto) {
    return texto.split(/(\{\{[^{}]*\}\})/g).map((parte, indice) => (
        /^\{\{[^{}]*\}\}$/.test(parte) ? (
            <span key={indice} className="v2-editor-fluxo__variavel">
                {parte}
            </span>
        ) : (
            parte
        )
    ));
}

export function prepararGatilhos(fluxo) {
    const estado = Object.fromEntries(gatilhos.map((gatilho) => [gatilho.valor, false]));

    for (const regra of fluxo?.regras ?? []) {
        if (Object.hasOwn(estado, regra.gatilho)) {
            estado[regra.gatilho] = estaAtivo(regra.ativo);
        }
    }

    return estado;
}

export function prepararAnuncioId(fluxo) {
    const regra = (fluxo?.regras ?? []).find((item) => item.gatilho === 'mensagem_recebida');

    return typeof regra?.ad_id === 'string' ? regra.ad_id : '';
}

export function prepararPausas(etapas) {
    return etapas.map((etapa) => Number(etapa.pausa_segundos) > 0);
}

export function normalizarHora(valor) {
    const texto = String(valor ?? '').trim();

    return /^\d{2}:\d{2}/.test(texto) ? texto.slice(0, 5) : '';
}

export function prepararHorario(fluxo) {
    return {
        ativo: estaAtivo(fluxo?.horario_inicio_ativo),
        inicio: normalizarHora(fluxo?.horario_inicio),
        fim: normalizarHora(fluxo?.horario_fim),
        fora_horario: fluxo?.fora_horario === 'aguardar' ? 'aguardar' : 'nao_iniciar',
    };
}

export function formatarSegundosEmUnidade(segundos, unidade) {
    if (unidade === 'minutos') {
        return String(Math.round((Number(segundos) / 60) * 1000) / 1000);
    }

    return String(Math.round(Number(segundos) || 0));
}

export function converterSegundosDoInput(valor, unidade) {
    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero < 0) {
        return 0;
    }

    return unidade === 'minutos' ? Math.round(numero * 60) : Math.round(numero);
}

export function capturarEstado({ nome = '', ativo = false, etapas = [], gatilhosAtivos = {}, anuncioId = '', horario = {} }) {
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
            anuncio_id: anuncioId || '',
        },
        horario: {
            ativo: Boolean(horario.ativo),
            inicio: horario.ativo ? horario.inicio ?? '' : '',
            fim: horario.ativo ? horario.fim ?? '' : '',
            fora_horario: horario.fora_horario ?? 'nao_iniciar',
        },
    };
}

export function estadosIguais(a, b) {
    return a.nome === b.nome
        && a.ativo === b.ativo
        && a.regras.novo_contato === b.regras.novo_contato
        && a.regras.mensagem_recebida === b.regras.mensagem_recebida
        && a.regras.anuncio_id === b.regras.anuncio_id
        && a.horario.ativo === b.horario.ativo
        && a.horario.inicio === b.horario.inicio
        && a.horario.fim === b.horario.fim
        && a.horario.fora_horario === b.horario.fora_horario
        && JSON.stringify(a.etapas) === JSON.stringify(b.etapas);
}

export function estadoInicialDoFluxo(fluxo) {
    return capturarEstado({
        nome: fluxo?.nome ?? '',
        ativo: estaAtivo(fluxo?.ativo),
        etapas: prepararEtapas(fluxo),
        gatilhosAtivos: prepararGatilhos(fluxo),
        anuncioId: prepararAnuncioId(fluxo),
        horario: prepararHorario(fluxo),
    });
}

export function minutosDaHoraTexto(hora) {
    const [horas, minutos] = String(hora ?? '').split(':');

    return (Number(horas) || 0) * 60 + (Number(minutos) || 0);
}

export function validarCondicoesDasEtapas(etapas) {
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

export function descreverDestino(etapas, ordem) {
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

export function AnexoMidiaPreview({ etapa, compacto = false }) {
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
    const classesAnexo = [
        'v2-editor-fluxo__anexo',
        compacto ? 'v2-editor-fluxo__anexo--compacto' : '',
        compacto && tipoConteudo === 'audio' ? 'v2-editor-fluxo__anexo--compacto-audio' : '',
    ].filter(Boolean).join(' ');
    const classesMidia = [
        'v2-editor-fluxo__anexo-midia',
        tipoConteudo === 'audio' ? 'v2-editor-fluxo__anexo-midia--audio' : '',
        compacto && tipoConteudo !== 'audio' ? 'v2-editor-fluxo__anexo-midia--compacta' : '',
    ].filter(Boolean).join(' ');

    useEffect(() => () => {
        if (urlObjeto) {
            URL.revokeObjectURL(urlObjeto);
        }
    }, [urlObjeto]);

    return (
        <div className={classesAnexo}>
            {configuracao.valor === 'imagem' && url && (
                <img src={url} alt={nome} loading="lazy" className={classesMidia} />
            )}

            {configuracao.valor === 'audio' && url && (
                <audio controls preload="metadata" src={url} className={classesMidia} />
            )}

            {configuracao.valor === 'video' && url && (
                <video controls preload="metadata" src={url} className={classesMidia} />
            )}

            <div className="v2-editor-fluxo__anexo-info">
                <span className="v2-editor-fluxo__anexo-icone" aria-hidden="true">
                    <Icone />
                </span>
                <div className="v2-editor-fluxo__anexo-texto">
                    <p className="v2-editor-fluxo__anexo-nome">{nome}</p>
                    <p className="v2-editor-fluxo__anexo-meta">
                        {configuracao.rotulo}
                        {tamanhoFormatado ? ` · ${tamanhoFormatado}` : ''}
                        {!arquivo && anexo?.existente ? ' · salvo' : ''}
                    </p>
                </div>
            </div>
        </div>
    );
}
