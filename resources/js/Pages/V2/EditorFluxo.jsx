import { useEffect, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { ArrowLeft, Check, CheckCircle2, CircleDot, LoaderCircle, X } from 'lucide-react';
import LayoutV2 from '@/components/v2/LayoutV2';
import { EditorCondicaoHorario } from '@/components/v2/editor/EditorCondicaoHorario';
import { EditorEtapa } from '@/components/v2/editor/EditorEtapa';
import { ListaEtapas } from '@/components/v2/editor/ListaEtapas';
import { PreviaMensagem } from '@/components/v2/editor/PreviaMensagem';
import { ResumoFluxo } from '@/components/v2/editor/ResumoFluxo';
import { DialogoExcluirEtapa, DialogoSaida } from '@/components/v2/editor/Dialogos';
import {
    capturarEstado,
    converterSegundosDoInput,
    criarEtapaCondicaoVazia,
    criarEtapaVazia,
    estadoInicialDoFluxo,
    estadosIguais,
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
import { Interruptor } from '@/components/v2/editor/Interruptor';
import '@/components/v2/editor/editor-fluxo.css';

export default function EditorFluxoV2({
    fluxo = null,
    suportaIndicadorDigitacao = true,
    suportaCondicaoHorario = false,
    podeCondicaoHorario = false,
    suportaMidia = false,
    fusoConta = null,
}) {
    const criando = !fluxo?.id;
    const [nome, setNome] = useState(fluxo?.nome ?? '');
    const [ativo, setAtivo] = useState(() => {
        const ativoValor = fluxo?.ativo;
        return ativoValor === true || ativoValor === 1 || ativoValor === '1';
    });
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
        setAtivo(fluxo?.ativo === true || fluxo?.ativo === 1 || fluxo?.ativo === '1');
        setEtapas(etapasPersistidas);
        setGatilhosAtivos(gatilhosPersistidos);
        setHorario(horarioPersistido);
        setPausasAtivas(prepararPausas(etapasPersistidas));
        setDadosBase(capturarEstado({
            nome: fluxo.nome ?? '',
            ativo: fluxo?.ativo === true || fluxo?.ativo === 1 || fluxo?.ativo === '1',
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

    const selecionarEtapa = (indice) => {
        setEtapaSelecionada(indice);

        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
            focoEdicaoPendenteRef.current = true;
        }

        setPainelAtivo('editar');
    };

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
            router.post(`/fluxos/${fluxo.id}`, { ...dados, _method: 'PUT' }, opcoes);
        } else {
            router.post('/fluxos', dados, opcoes);
        }
    };

    const nomeGatilhosSelecionados = gatilhos
        .filter((gatilho) => gatilhosAtivos[gatilho.valor])
        .map((gatilho) => gatilho.rotulo);

    const paineis = [
        { valor: 'estrutura', rotulo: 'Etapas' },
        { valor: 'editar', rotulo: 'Editar' },
        { valor: 'contexto', rotulo: 'Prévia' },
    ];

    return (
        <>
            <form onSubmit={salvar} className={`v2-conteudo v2-editor-fluxo v2-editor-fluxo--painel-${painelAtivo}`}>
                <header className="v2-editor-fluxo__cabecalho">
                    <div>
                        <h1 className="v2-editor-fluxo__titulo">
                            <Link href="/fluxos">Fluxos</Link>
                            {' / '}
                            {criando ? 'Novo fluxo' : 'Editar fluxo'}
                        </h1>
                        <p className="v2-descricao-pagina">
                            Monte a sequência de mensagens e configure como este fluxo é iniciado.
                        </p>
                    </div>
                    <div className="v2-editor-fluxo__cabecalho-acoes">
                        <Link href="/fluxos" className="v2-btn v2-btn--contorno">
                            <ArrowLeft />
                            Voltar à central
                        </Link>
                    </div>
                </header>

                <section className="v2-painel v2-editor-fluxo__painel">
                    <div className="v2-editor-fluxo__painel-corpo">
                        <div className="v2-editor-fluxo__campo-linha">
                            <label className="v2-campo" style={{ flex: 1 }}>
                                <span className="v2-campo__rotulo">Nome do fluxo</span>
                                <input
                                    type="text"
                                    value={nome}
                                    onChange={(evento) => alterarNome(evento.target.value)}
                                    aria-invalid={Boolean(erros.nome)}
                                    className="v2-entrada"
                                />
                                {erros.nome && <span role="alert" className="v2-campo__erro">{erros.nome}</span>}
                            </label>
                            <div className="v2-editor-fluxo__campo-linha" style={{ flex: 'none' }}>
                                <Interruptor
                                    id="fluxo-ativo"
                                    checked={ativo}
                                    onCheckedChange={(verificado) => {
                                        setAtivo(verificado);
                                        marcarAlteracao();
                                    }}
                                    titulo="Fluxo ativo"
                                />
                                <span className={`v2-chip ${ativo ? 'v2-chip--positivo' : ''}`}>
                                    {ativo ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="v2-painel v2-editor-fluxo__painel">
                    <div className="v2-editor-fluxo__painel-corpo">
                        <div className="v2-editor-fluxo__secao-cabecalho">
                            <div>
                                <h2 className="v2-editor-fluxo__secao-titulo">Início do fluxo</h2>
                                <p className="v2-editor-fluxo__secao-nota">Escolha os gatilhos que iniciam este fluxo automaticamente quando chega uma mensagem.</p>
                            </div>
                        </div>
                        <fieldset className="v2-editor-fluxo__grupo-botoes">
                            <legend className="v2-oculto-visual">Gatilhos que iniciam o fluxo</legend>
                            {gatilhos.map((gatilho) => {
                                const gatilhoAtivo = Boolean(gatilhosAtivos[gatilho.valor]);

                                return (
                                    <button
                                        key={gatilho.valor}
                                        type="button"
                                        aria-pressed={gatilhoAtivo}
                                        onClick={() => alterarGatilho(gatilho.valor)}
                                        className="v2-editor-fluxo__botao-gatilho"
                                    >
                                        <span className="v2-editor-fluxo__caixa-marcacao" aria-hidden="true">
                                            {gatilhoAtivo && <Check style={{ width: '0.75rem', height: '0.75rem' }} />}
                                        </span>
                                        {gatilho.rotulo}
                                    </button>
                                );
                            })}
                        </fieldset>
                    </div>
                </section>

                <section className="v2-painel v2-editor-fluxo__painel">
                    <div className="v2-editor-fluxo__painel-corpo">
                        <div className="v2-editor-fluxo__secao-cabecalho">
                            <div>
                                <h2 className="v2-editor-fluxo__secao-titulo">Horário de início</h2>
                                <p className="v2-editor-fluxo__secao-nota">Opcional: quando ativado, mensagens recebidas só iniciam este fluxo dentro da janela permitida.</p>
                            </div>
                            <Interruptor
                                id="horario-inicio-ativo"
                                checked={horario.ativo}
                                onCheckedChange={(verificado) => alterarHorario('ativo', verificado)}
                                titulo="Ativar horário"
                            />
                        </div>

                        {horario.ativo && (
                            <div className="v2-editor-fluxo__grupo">
                                <div className="v2-editor-fluxo__condicao-campos v2-editor-fluxo__condicao-campos--duas">
                                    <label className="v2-campo">
                                        <span className="v2-campo__rotulo">Início permitido</span>
                                        <input
                                            type="time"
                                            step={60}
                                            value={horario.inicio}
                                            onChange={(evento) => alterarHorario('inicio', evento.target.value)}
                                            aria-invalid={Boolean(erros.horario)}
                                            className="v2-entrada v2-numerico"
                                        />
                                    </label>
                                    <label className="v2-campo">
                                        <span className="v2-campo__rotulo">Fim permitido</span>
                                        <input
                                            type="time"
                                            step={60}
                                            value={horario.fim}
                                            onChange={(evento) => alterarHorario('fim', evento.target.value)}
                                            aria-invalid={Boolean(erros.horario)}
                                            className="v2-entrada v2-numerico"
                                        />
                                    </label>
                                </div>
                                <p className="v2-campo__ajuda">
                                    Formato de 24 horas, com limites inclusivos. Suporta janelas que atravessam a meia-noite (ex.: 22:00 às 06:00).
                                </p>
                                <fieldset className="v2-campo">
                                    <legend className="v2-campo__rotulo">Quando uma mensagem chega fora do horário</legend>
                                    <div className="v2-editor-fluxo__condicao-campos v2-editor-fluxo__condicao-campos--duas">
                                        {[
                                            { valor: 'nao_iniciar', rotulo: 'Não iniciar', descricao: 'A mensagem fora do horário não inicia o fluxo; uma nova mensagem dentro do horário permitido poderá iniciá-lo.' },
                                            { valor: 'aguardar', rotulo: 'Aguardar próximo horário', descricao: 'Registra um agendamento e inicia o fluxo na próxima janela permitida, sem exigir uma nova mensagem.' },
                                        ].map((opcao) => {
                                            const selecionada = horario.fora_horario === opcao.valor;

                                            return (
                                                <button
                                                    key={opcao.valor}
                                                    type="button"
                                                    aria-pressed={selecionada}
                                                    onClick={() => alterarHorario('fora_horario', opcao.valor)}
                                                    className="v2-editor-fluxo__botao-opcao"
                                                >
                                                    <span className="v2-editor-fluxo__botao-opcao-titulo">
                                                        <span className="v2-editor-fluxo__caixa-marcacao" aria-hidden="true">
                                                            {selecionada && <span className="v2-oculto-visual">Selecionado</span>}
                                                        </span>
                                                        {opcao.rotulo}
                                                    </span>
                                                    <span className="v2-editor-fluxo__botao-opcao-descricao">{opcao.descricao}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            </div>
                        )}

                        {erros.horario && (
                            <p role="alert" className="v2-campo__erro">{erros.horario}</p>
                        )}
                    </div>
                </section>

                <div className="v2-editor-fluxo__seletor-painel">
                    <span className="v2-campo__rotulo">Painel visível</span>
                    <div role="group" aria-label="Painel visível" className="v2-segmentado">
                        {paineis.map((painel) => (
                            <button
                                key={painel.valor}
                                type="button"
                                aria-pressed={painelAtivo === painel.valor}
                                onClick={() => setPainelAtivo(painel.valor)}
                            >
                                {painel.rotulo}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="v2-editor-fluxo__grade">
                    <div className="v2-editor-fluxo__coluna v2-editor-fluxo__coluna--estrutura">
                        <ListaEtapas
                            etapas={etapas}
                            etapaSelecionada={etapaSelecionada}
                            erros={erros}
                            podeCondicaoHorario={podeCondicaoHorario}
                            suportaCondicaoHorario={suportaCondicaoHorario}
                            aoSelecionar={selecionarEtapa}
                            aoAdicionarEtapa={adicionarEtapa}
                            aoAdicionarCondicao={adicionarCondicao}
                        />
                    </div>

                    <div className="v2-editor-fluxo__coluna v2-editor-fluxo__coluna--editar">
                        <section className="v2-painel v2-editor-fluxo__painel" aria-label="Edição da etapa">
                            {etapaAtual ? (
                                <div
                                    id="painel-etapa"
                                    ref={painelEdicaoRef}
                                    tabIndex={-1}
                                    role="tabpanel"
                                    aria-labelledby={`tab-etapa-${etapaSelecionada}`}
                                    className="v2-editor-fluxo__painel-corpo"
                                >
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
                                        <EditorEtapa
                                            etapa={etapaAtual}
                                            indice={etapaSelecionada}
                                            total={etapas.length}
                                            etapas={etapas}
                                            erros={erros}
                                            suportaMidia={suportaMidia}
                                            suportaIndicadorDigitacao={suportaIndicadorDigitacao}
                                            suportaCondicaoHorario={suportaCondicaoHorario}
                                            pausasAtivas={pausasAtivas}
                                            pausaUnidade={pausaUnidade}
                                            pausaInput={pausaInput}
                                            areaTextoRef={areaTextoRef}
                                            aoAlterarEtapa={alterarEtapa}
                                            aoAlterarTipoEtapa={alterarTipoEtapa}
                                            aoSelecionarAnexo={selecionarAnexo}
                                            aoRemoverAnexo={removerAnexo}
                                            aoInserirVariavel={inserirVariavel}
                                            aoAlternarIndicadorDigitacao={alternarIndicadorDigitacao}
                                            aoAlterarSegundosIndicador={alterarSegundosIndicador}
                                            aoAlternarPausa={alternarPausa}
                                            aoAlterarPausaInput={alterarPausaInput}
                                            aoAlterarUnidadePausa={alterarUnidadePausa}
                                            aoVoltar={() => setEtapaSelecionada((i) => Math.max(0, i - 1))}
                                            aoAvancar={() => setEtapaSelecionada((i) => Math.min(etapas.length - 1, i + 1))}
                                            aoSolicitarExclusao={setEtapaParaExcluir}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="v2-vazio">
                                    <p className="v2-vazio__titulo">Ainda não há etapas</p>
                                    <p className="v2-vazio__texto">Adicione uma etapa para começar a editar o conteúdo.</p>
                                    <button type="button" className="v2-btn v2-btn--contorno" onClick={adicionarEtapa}>
                                        Adicionar etapa
                                    </button>
                                </div>
                            )}
                        </section>
                    </div>

                    <div className="v2-editor-fluxo__coluna v2-editor-fluxo__coluna--contexto">
                        <div className="v2-editor-fluxo__grupo">
                            <PreviaMensagem
                                etapa={etapaAtual}
                                indice={etapaSelecionada}
                                total={etapas.length}
                                etapas={etapas}
                            />
                            <ResumoFluxo
                                nome={nome}
                                gatilhosAtivos={nomeGatilhosSelecionados}
                                etapas={etapas}
                                pausasAtivas={pausasAtivas}
                                horario={horario}
                                estadoGravacao={estadoGravacao}
                            />
                        </div>
                    </div>
                </div>

                <footer className="v2-editor-fluxo__rodape">
                    <div className="v2-editor-fluxo__estado">
                        {estadoGravacao === 'a_guardar' && <LoaderCircle className="v2-editor-fluxo__spinner" />}
                        {estadoGravacao === 'guardado' && <CheckCircle2 style={{ width: '1rem', height: '1rem', color: 'var(--v2-verde)' }} />}
                        {estadoGravacao === 'alterado' && <CircleDot style={{ width: '1rem', height: '1rem', color: 'var(--v2-ink-2)' }} />}
                        {estadoGravacao === 'erro' && <X style={{ width: '1rem', height: '1rem', color: 'var(--v2-perigo)' }} />}
                        <span className={estadoGravacao === 'erro' ? 'v2-editor-fluxo__estado--erro' : ''}>
                            {estadoGravacao === 'guardado' ? 'Salvo com sucesso' : estadoGravacao === 'a_guardar' ? 'Salvando…' : estadoGravacao === 'erro' ? 'Revise os campos antes de salvar' : 'Alterações não salvas'}
                        </span>
                    </div>
                    <button type="submit" disabled={estadoGravacao === 'a_guardar'} className="v2-btn v2-btn--primario">
                        {estadoGravacao === 'a_guardar' && <LoaderCircle className="v2-editor-fluxo__spinner" />}
                        {estadoGravacao === 'a_guardar' ? 'Salvando…' : criando ? 'Criar fluxo' : 'Salvar alterações'}
                    </button>
                </footer>
            </form>

            <DialogoExcluirEtapa
                aberto={etapaParaExcluir !== null}
                etapaParaExcluir={etapaParaExcluir}
                aoFechar={() => setEtapaParaExcluir(null)}
                aoConfirmar={confirmarExclusaoEtapa}
            />

            <DialogoSaida
                aberto={avisoSaidaAberto}
                aoFechar={fecharAvisoSaida}
                aoConfirmar={confirmarSaidaSemGuardar}
            />
        </>
    );
}

EditorFluxoV2.layout = [LayoutV2];
