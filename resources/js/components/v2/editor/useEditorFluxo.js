import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    capturarEstado,
    converterSegundosDoInput,
    criarEtapaCondicaoVazia,
    criarEtapaVazia,
    estadoInicialDoFluxo,
    estadosIguais,
    estaAtivo,
    formatarSegundosEmUnidade,
    gatilhos,
    INDICADOR_DIGITACAO_MAXIMO_SEGUNDOS,
    INDICADOR_DIGITACAO_PADRAO_SEGUNDOS,
    normalizarDestino,
    PAUSA_PADRAO_SEGUNDOS,
    prepararEtapas,
    prepararGatilhos,
    prepararHorario,
    prepararPausas,
    segundosIndicadorValidos,
    validarCondicoesDasEtapas,
    validarMidiaDasEtapas,
} from '@/components/v2/editor/util';

/**
 * Estado e ações do editor de fluxo: configuração, etapas, pausas, condições,
 * mídia, validação, salvamento e proteção contra saída com alterações.
 */
export default function useEditorFluxo({ fluxo = null, suportaMidia = false, podeCondicaoHorario = false }) {
    const criando = !fluxo?.id;
    const [nome, setNome] = useState(fluxo?.nome ?? '');
    const [ativo, setAtivo] = useState(() => (criando ? true : estaAtivo(fluxo?.ativo)));
    const [etapas, setEtapas] = useState(() => prepararEtapas(fluxo));
    const [gatilhosAtivos, setGatilhosAtivos] = useState(() => prepararGatilhos(fluxo));
    const [horario, setHorario] = useState(() => prepararHorario(fluxo));
    const [pausasAtivas, setPausasAtivas] = useState(() => prepararPausas(prepararEtapas(fluxo)));
    const [etapaSelecionada, setEtapaSelecionada] = useState(0);
    const [estadoGravacao, setEstadoGravacao] = useState(criando ? 'alterado' : 'guardado');
    const [erros, setErros] = useState({});
    const [mensagemReordenacao, setMensagemReordenacao] = useState('');
    const [etapaParaExcluir, setEtapaParaExcluir] = useState(null);
    const [dadosBase, setDadosBase] = useState(() => {
        const estadoPersistido = estadoInicialDoFluxo(fluxo);

        return criando ? { ...estadoPersistido, ativo: true } : estadoPersistido;
    });
    const [avisoSaidaAberto, setAvisoSaidaAberto] = useState(false);
    const [pausaUnidade, setPausaUnidade] = useState('segundos');
    const [pausaInput, setPausaInput] = useState('');
    const [painelAtivo, setPainelAtivo] = useState('editar');
    const destinoSaidaRef = useRef(null);
    const liberarSaidaRef = useRef(false);
    const areaTextoRef = useRef(null);
    const painelEdicaoRef = useRef(null);
    const focoEdicaoPendenteRef = useRef(false);
    const etapaAtual = etapas[etapaSelecionada] ?? null;

    const temAlteracoes = !estadosIguais(
        dadosBase,
        capturarEstado({ nome, ativo, etapas, gatilhosAtivos, horario }),
    );

    const versaoFluxo = `${fluxo?.id ?? 'novo'}:${fluxo?.updated_at ?? ''}`;
    const [sincronizacaoForcada, setSincronizacaoForcada] = useState(0);

    useEffect(() => {
        if (!fluxo?.id) {
            return;
        }

        const etapasPersistidas = prepararEtapas(fluxo);
        const gatilhosPersistidos = prepararGatilhos(fluxo);
        const horarioPersistido = prepararHorario(fluxo);

        setNome(fluxo.nome ?? '');
        setAtivo(estaAtivo(fluxo?.ativo));
        setEtapas(etapasPersistidas);
        setGatilhosAtivos(gatilhosPersistidos);
        setHorario(horarioPersistido);
        setPausasAtivas(prepararPausas(etapasPersistidas));
        setDadosBase(capturarEstado({
            nome: fluxo.nome ?? '',
            ativo: estaAtivo(fluxo?.ativo),
            etapas: etapasPersistidas,
            gatilhosAtivos: gatilhosPersistidos,
            horario: horarioPersistido,
        }));
        setEstadoGravacao('guardado');
        setErros({});
        setEtapaSelecionada((atual) => Math.min(atual, Math.max(0, etapasPersistidas.length - 1)));
    }, [versaoFluxo, sincronizacaoForcada]);

    useEffect(() => {
        if (!focoEdicaoPendenteRef.current || painelAtivo !== 'editar') {
            return;
        }

        focoEdicaoPendenteRef.current = false;
        painelEdicaoRef.current?.focus();
    }, [etapaSelecionada, painelAtivo]);

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

    const alterarAtivo = (verificado) => {
        setAtivo(verificado);
        marcarAlteracao();
    };

    const selecionarEtapa = (indice) => {
        setEtapaSelecionada(indice);

        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
            focoEdicaoPendenteRef.current = true;
        }

        setPainelAtivo('editar');
    };

    const selecionarEtapaAnterior = () => setEtapaSelecionada((atual) => Math.max(0, atual - 1));

    const selecionarEtapaSeguinte = () => setEtapaSelecionada((atual) => Math.min(etapas.length - 1, atual + 1));

    const alterarEtapa = (indice, campo, valor) => {
        setEtapas((etapasAtuais) => etapasAtuais.map((etapa, posicao) => (
            posicao === indice ? { ...etapa, [campo]: valor } : etapa
        )));
        if (campo === 'encerra_apos' && valor) {
            setPausasAtivas((pausasAtuais) => pausasAtuais.map((pausa, posicao) => (
                posicao === indice ? false : pausa
            )));
        }
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

    const moverEtapa = (indice, deslocamento) => {
        const novoIndice = indice + deslocamento;

        if (novoIndice < 0 || novoIndice >= etapas.length) {
            return;
        }

        const indicesNovos = etapas.map((_, indiceOriginal) => {
            if (indiceOriginal === indice) {
                return novoIndice;
            }

            if (indice < novoIndice && indiceOriginal > indice && indiceOriginal <= novoIndice) {
                return indiceOriginal - 1;
            }

            if (indice > novoIndice && indiceOriginal >= novoIndice && indiceOriginal < indice) {
                return indiceOriginal + 1;
            }

            return indiceOriginal;
        });
        let destinoInvalido = false;
        const etapasComDestinosRemapeados = etapas.map((etapa, indiceOriginal) => {
            if (etapa.tipo !== 'condicao_horario') {
                return etapa;
            }

            const novaOrdemCondicao = indicesNovos[indiceOriginal] + 1;
            const remapearDestino = (destino) => {
                const ordemOriginal = normalizarDestino(destino);

                if (ordemOriginal === null || ordemOriginal > etapas.length) {
                    return destino;
                }

                const ordemDestino = indicesNovos[ordemOriginal - 1] + 1;

                if (ordemDestino <= novaOrdemCondicao) {
                    destinoInvalido = true;
                }

                return ordemDestino;
            };

            return {
                ...etapa,
                condicoes: (etapa.condicoes ?? []).map((condicao) => ({
                    ...condicao,
                    destino_ordem: remapearDestino(condicao.destino_ordem),
                })),
                destino_nao_ordem: remapearDestino(etapa.destino_nao_ordem),
            };
        });

        if (destinoInvalido) {
            const mensagem = 'Não é possível mover esta etapa: o movimento faria uma condição apontar para uma etapa anterior. Ajuste os destinos e tente novamente.';

            toast.error(mensagem);
            setMensagemReordenacao(mensagem);

            return;
        }

        const novasEtapas = [...etapasComDestinosRemapeados];
        const [etapaMovida] = novasEtapas.splice(indice, 1);
        novasEtapas.splice(novoIndice, 0, etapaMovida);
        const novasPausas = [...pausasAtivas];
        const [pausaMovida] = novasPausas.splice(indice, 1);
        novasPausas.splice(novoIndice, 0, pausaMovida);

        setEtapas(novasEtapas);
        setPausasAtivas(novasPausas);
        setEtapaSelecionada(novoIndice);
        setErros((errosAtuais) => Object.fromEntries(
            Object.entries(errosAtuais).map(([campo, mensagemAtual]) => {
                const correspondencia = campo.match(/^etapas\.(\d+)(.*)$/);

                if (!correspondencia) {
                    return [campo, mensagemAtual];
                }

                const indiceOriginal = Number(correspondencia[1]);

                if (indiceOriginal >= indicesNovos.length) {
                    return [campo, mensagemAtual];
                }

                return [`etapas.${indicesNovos[indiceOriginal]}${correspondencia[2]}`, mensagemAtual];
            }),
        ));
        setMensagemReordenacao(`Etapa movida para a posição ${novoIndice + 1} de ${etapas.length}.`);
        marcarAlteracao();
    };

    const solicitarExclusaoEtapa = (indice) => setEtapaParaExcluir(indice);

    const fecharExclusaoEtapa = () => setEtapaParaExcluir(null);

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
                ? { ...etapa, condicoes: [...(etapa.condicoes ?? []), { inicio: '', fim: '', destino_ordem: null }] }
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
        const prefixoCondicoes = `etapas.${indiceEtapa}.condicoes`;
        setErros((errosAtuais) => Object.fromEntries(
            Object.entries(errosAtuais).map(([campo, mensagem]) => {
                if (campo === prefixoCondicoes) {
                    return [campo, null];
                }

                if (!campo.startsWith(`${prefixoCondicoes}.`)) {
                    return [campo, mensagem];
                }

                const [, , , indiceErro, ...restoCampo] = campo.split('.');
                const posicaoErro = Number(indiceErro);

                if (!Number.isInteger(posicaoErro) || posicaoErro < indiceCondicao) {
                    return [campo, mensagem];
                }

                if (posicaoErro === indiceCondicao) {
                    return [campo, null];
                }

                return [`${prefixoCondicoes}.${posicaoErro - 1}.${restoCampo.join('.')}`, mensagem];
            }),
        ));
        marcarAlteracao();
    };

    const alterarDestinoNao = (indice, valor) => {
        alterarEtapa(indice, 'destino_nao_ordem', normalizarDestino(valor));
    };

    const alternarPausa = (indice, habilitada) => {
        setPausasAtivas((pausasAtuais) => pausasAtuais.map((pausa, posicao) => (
            posicao === indice ? habilitada : pausa
        )));

        if (!habilitada) {
            alterarEtapa(indice, 'pausa_segundos', 0);
            return;
        }

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

        if (!habilitado) {
            setErros((errosAtuais) => ({
                ...errosAtuais,
                [`etapas.${indice}.indicador_digitacao_segundos`]: null,
            }));
        }

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

        if (etapaAtual.tipo === 'condicao_horario' || (etapaAtual.tipoConteudo ?? 'texto') !== 'texto') {
            return;
        }

        const textarea = areaTextoRef.current;
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
            [`etapas.${indice}.texto`]: null,
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
                ...(!criando ? { id: etapa.id ?? null } : {}),
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
            router.post(`/fluxos/${fluxo.id}`, { ...dados, _method: 'PUT' }, opcoes);
        } else {
            router.post('/fluxos', dados, opcoes);
        }
    };

    const nomeGatilhosSelecionados = gatilhos
        .filter((gatilho) => gatilhosAtivos[gatilho.valor])
        .map((gatilho) => gatilho.rotulo);

    return {
        criando,
        nome,
        ativo,
        etapas,
        gatilhosAtivos,
        horario,
        pausasAtivas,
        etapaSelecionada,
        estadoGravacao,
        erros,
        mensagemReordenacao,
        etapaParaExcluir,
        avisoSaidaAberto,
        pausaUnidade,
        pausaInput,
        painelAtivo,
        etapaAtual,
        temAlteracoes,
        nomeGatilhosSelecionados,
        areaTextoRef,
        painelEdicaoRef,
        setPainelAtivo,
        alterarNome,
        alterarAtivo,
        selecionarEtapa,
        selecionarEtapaAnterior,
        selecionarEtapaSeguinte,
        alterarEtapa,
        alterarGatilho,
        alterarHorario,
        adicionarEtapa,
        adicionarCondicao,
        moverEtapa,
        solicitarExclusaoEtapa,
        fecharExclusaoEtapa,
        confirmarExclusaoEtapa,
        alterarCondicao,
        adicionarCondicaoNoBloco,
        removerCondicaoDoBloco,
        alterarDestinoNao,
        alternarPausa,
        alternarIndicadorDigitacao,
        alterarSegundosIndicador,
        alterarUnidadePausa,
        alterarPausaInput,
        fecharAvisoSaida,
        confirmarSaidaSemGuardar,
        inserirVariavel,
        alterarTipoEtapa,
        selecionarAnexo,
        removerAnexo,
        salvar,
    };
}
