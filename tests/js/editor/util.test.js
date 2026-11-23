import { describe, expect, it } from 'vitest';
import {
    capturarEstado,
    converterSegundosDoInput,
    estadosIguais,
    formatarSegundosEmUnidade,
    normalizarDestino,
    validarCondicoesDasEtapas,
    validarMidiaDasEtapas,
} from '@/components/v2/editor/util';

function etapaTexto(alteracoes = {}) {
    return {
        tipo: 'mensagem',
        tipoConteudo: 'texto',
        texto: 'Olá',
        pausa_segundos: 0,
        indicador_digitacao_ativo: false,
        indicador_digitacao_segundos: 2,
        encerra_apos: false,
        condicoes: [],
        destino_nao_ordem: null,
        anexo: null,
        arquivo: null,
        removerAnexo: false,
        anexoLocalId: null,
        ...alteracoes,
    };
}

function etapaCondicao(alteracoes = {}) {
    return {
        tipo: 'condicao_horario',
        condicoes: [{ inicio: '08:00', fim: '09:00', destino_ordem: 2 }],
        destino_nao_ordem: null,
        ...alteracoes,
    };
}

describe('normalizarDestino', () => {
    it('aceita apenas inteiros positivos', () => {
        expect(normalizarDestino(3)).toBe(3);
        expect(normalizarDestino('4')).toBe(4);
        expect(normalizarDestino(0)).toBeNull();
        expect(normalizarDestino(-1)).toBeNull();
        expect(normalizarDestino(1.5)).toBeNull();
        expect(normalizarDestino('abc')).toBeNull();
        expect(normalizarDestino(null)).toBeNull();
    });
});

describe('formatarSegundosEmUnidade', () => {
    it('formata segundos e minutos sem casas desnecessárias', () => {
        expect(formatarSegundosEmUnidade(90, 'segundos')).toBe('90');
        expect(formatarSegundosEmUnidade(90, 'minutos')).toBe('1.5');
        expect(formatarSegundosEmUnidade(45, 'minutos')).toBe('0.75');
        expect(formatarSegundosEmUnidade('30', 'segundos')).toBe('30');
        expect(formatarSegundosEmUnidade(undefined, 'segundos')).toBe('0');
    });
});

describe('converterSegundosDoInput', () => {
    it('converte o valor digitado conforme a unidade', () => {
        expect(converterSegundosDoInput('90', 'segundos')).toBe(90);
        expect(converterSegundosDoInput('1.5', 'minutos')).toBe(90);
        expect(converterSegundosDoInput('2.6', 'segundos')).toBe(3);
    });

    it('trata valores inválidos ou negativos como zero', () => {
        expect(converterSegundosDoInput('0,5', 'minutos')).toBe(0);
        expect(converterSegundosDoInput('abc', 'segundos')).toBe(0);
        expect(converterSegundosDoInput('-3', 'segundos')).toBe(0);
    });
});

describe('capturarEstado', () => {
    it('normaliza etapas, anexos, regras e horário', () => {
        const estado = capturarEstado({
            nome: 'Boas-vindas',
            ativo: 1,
            etapas: [
                etapaTexto({
                    texto: 'Oi',
                    pausa_segundos: '5',
                    indicador_digitacao_ativo: 1,
                    indicador_digitacao_segundos: 99,
                    tipoConteudo: 'arquivo',
                    anexo: { existente: true, nome: 'antigo.pdf', tamanho: 1024 },
                    arquivo: { name: 'novo.pdf', size: 2048 },
                    removerAnexo: true,
                    anexoLocalId: 'local-1',
                }),
                etapaCondicao({
                    condicoes: [{ inicio: '08:00', fim: '09:00', destino_ordem: '2' }],
                    destino_nao_ordem: 'inválido',
                }),
            ],
            gatilhosAtivos: { novo_contato: true },
            horario: { ativo: true, inicio: '08:00', fim: '18:00', fora_horario: 'aguardar' },
        });

        expect(estado.nome).toBe('Boas-vindas');
        expect(estado.ativo).toBe(true);
        expect(estado.etapas[0]).toMatchObject({
            tipo: 'mensagem',
            texto: 'Oi',
            pausa_segundos: 5,
            indicador_digitacao_ativo: true,
            indicador_digitacao_segundos: 20,
            tipo_conteudo: 'arquivo',
            anexo_nome: 'novo.pdf',
            anexo_tamanho: 2048,
            anexo_existente: false,
            anexo_local_id: 'local-1',
            remover_anexo: true,
        });
        expect(estado.etapas[1]).toMatchObject({
            tipo: 'condicao_horario',
            tipo_conteudo: 'texto',
            destino_nao_ordem: null,
            condicoes: [{ inicio: '08:00', fim: '09:00', destino_ordem: 2 }],
        });
        expect(estado.regras).toEqual({ novo_contato: true, mensagem_recebida: false });
        expect(estado.horario).toEqual({
            ativo: true,
            inicio: '08:00',
            fim: '18:00',
            fora_horario: 'aguardar',
        });
    });

    it('ignora as horas quando o horário está desativado', () => {
        const estado = capturarEstado({
            horario: { ativo: false, inicio: '08:00', fim: '18:00' },
        });

        expect(estado.horario).toEqual({
            ativo: false,
            inicio: '',
            fim: '',
            fora_horario: 'nao_iniciar',
        });
    });
});

describe('estadosIguais', () => {
    const estadoBase = capturarEstado({
        nome: 'Fluxo',
        ativo: true,
        etapas: [etapaTexto()],
        gatilhosAtivos: { novo_contato: true },
        horario: { ativo: false },
    });

    it('compara nome, ativo, regras, horário e etapas', () => {
        expect(estadosIguais(estadoBase, { ...estadoBase })).toBe(true);
        expect(estadosIguais(estadoBase, { ...estadoBase, nome: 'Outro' })).toBe(false);
        expect(estadosIguais(estadoBase, { ...estadoBase, ativo: false })).toBe(false);
        expect(estadosIguais(estadoBase, {
            ...estadoBase,
            regras: { ...estadoBase.regras, novo_contato: false },
        })).toBe(false);
        expect(estadosIguais(estadoBase, {
            ...estadoBase,
            horario: { ...estadoBase.horario, ativo: true },
        })).toBe(false);
        expect(estadosIguais(estadoBase, {
            ...estadoBase,
            etapas: [{ ...estadoBase.etapas[0], texto: 'Alterado' }],
        })).toBe(false);
    });
});

describe('validarMidiaDasEtapas', () => {
    it('exige texto em etapas de texto', () => {
        expect(validarMidiaDasEtapas([etapaTexto({ texto: 'Oi' })], false)).toBeNull();
        expect(validarMidiaDasEtapas([etapaTexto({ texto: '   ' })], false)).toEqual({
            indice: 0,
            campo: 'etapas.0.texto',
            mensagem: 'Escreva o conteúdo desta etapa antes de salvar.',
        });
    });

    it('recusa anexo em etapa de texto', () => {
        expect(validarMidiaDasEtapas([
            etapaTexto({ arquivo: { name: 'foto.png', size: 100 } }),
        ], true)).toEqual({
            indice: 0,
            campo: 'etapas.0.anexo',
            mensagem: 'Escolha um tipo de mídia para enviar o arquivo selecionado.',
        });
    });

    it('recusa mídia quando o banco não suporta anexos', () => {
        expect(validarMidiaDasEtapas([
            etapaTexto({ tipoConteudo: 'imagem', texto: '' }),
        ], false)).toEqual({
            indice: 0,
            campo: 'etapas.0.tipo_conteudo',
            mensagem: 'A migration de mídia das etapas ainda não foi executada neste banco de dados.',
        });
    });

    it('recusa texto junto de mídia', () => {
        expect(validarMidiaDasEtapas([
            etapaTexto({ tipoConteudo: 'imagem', texto: 'legenda', anexo: { existente: true } }),
        ], true)).toEqual({
            indice: 0,
            campo: 'etapas.0.texto',
            mensagem: 'A Meta aceita texto ou anexo, mas não ambos neste formato. Remova o texto ou use uma etapa de texto.',
        });
    });

    it('exige um arquivo e valida extensão e tamanho', () => {
        expect(validarMidiaDasEtapas([
            etapaTexto({ tipoConteudo: 'imagem', texto: '' }),
        ], true)).toEqual({
            indice: 0,
            campo: 'etapas.0.anexo',
            mensagem: 'Selecione um arquivo de imagem.',
        });

        expect(validarMidiaDasEtapas([
            etapaTexto({
                tipoConteudo: 'imagem',
                texto: '',
                arquivo: { name: 'foto.txt', size: 100 },
            }),
        ], true)).toEqual({
            indice: 0,
            campo: 'etapas.0.anexo',
            mensagem: 'Formato não suportado. Use JPG, JPEG, PNG, GIF.',
        });

        expect(validarMidiaDasEtapas([
            etapaTexto({
                tipoConteudo: 'imagem',
                texto: '',
                arquivo: { name: 'foto.png', size: 9 * 1024 * 1024 },
            }),
        ], true)).toEqual({
            indice: 0,
            campo: 'etapas.0.anexo',
            mensagem: 'O arquivo excede o limite de 8 MB para imagem.',
        });

        expect(validarMidiaDasEtapas([
            etapaTexto({
                tipoConteudo: 'imagem',
                texto: '',
                arquivo: { name: 'foto.png', size: 1024 },
            }),
        ], true)).toBeNull();

        expect(validarMidiaDasEtapas([
            etapaTexto({
                tipoConteudo: 'imagem',
                texto: '',
                anexo: { existente: true, nome: 'foto.png' },
            }),
        ], true)).toBeNull();
    });

    it('ignora etapas de condição de horário', () => {
        expect(validarMidiaDasEtapas([etapaCondicao()], false)).toBeNull();
    });
});

describe('validarCondicoesDasEtapas', () => {
    const etapasBase = () => [etapaCondicao(), etapaTexto(), etapaTexto()];

    it('aceita condições válidas e ignora etapas de mensagem', () => {
        expect(validarCondicoesDasEtapas(etapasBase())).toBeNull();
    });

    it('exige pelo menos uma condição', () => {
        const etapas = etapasBase();
        etapas[0] = etapaCondicao({ condicoes: [] });

        expect(validarCondicoesDasEtapas(etapas)).toEqual({
            indice: 0,
            campo: 'etapas.0.condicoes',
            mensagem: 'Adicione pelo menos uma condição de horário.',
        });
    });

    it('exige início e fim preenchidos', () => {
        const etapas = etapasBase();
        etapas[0] = etapaCondicao({ condicoes: [{ inicio: '', fim: '09:00', destino_ordem: 2 }] });

        expect(validarCondicoesDasEtapas(etapas)).toEqual({
            indice: 0,
            campo: 'etapas.0.condicoes.0.inicio',
            mensagem: 'Informe o horário inicial e final desta condição.',
        });
    });

    it('exige intervalo crescente e sem sobreposição', () => {
        const invertida = etapasBase();
        invertida[0] = etapaCondicao({ condicoes: [{ inicio: '09:00', fim: '08:00', destino_ordem: 2 }] });

        expect(validarCondicoesDasEtapas(invertida)).toEqual({
            indice: 0,
            campo: 'etapas.0.condicoes.0.fim',
            mensagem: 'O horário final deve ser posterior ao inicial e a janela não pode atravessar a meia-noite.',
        });

        const sobreposta = etapasBase();
        sobreposta[0] = etapaCondicao({
            condicoes: [
                { inicio: '08:00', fim: '09:00', destino_ordem: 2 },
                { inicio: '08:30', fim: '10:00', destino_ordem: 3 },
            ],
        });

        expect(validarCondicoesDasEtapas(sobreposta)).toEqual({
            indice: 0,
            campo: 'etapas.0.condicoes.1.inicio',
            mensagem: 'Este intervalo se sobrepõe a outra condição do mesmo bloco.',
        });
    });

    it('exige destino posterior à condição', () => {
        const etapas = etapasBase();
        etapas[0] = etapaCondicao({ condicoes: [{ inicio: '08:00', fim: '09:00', destino_ordem: 1 }] });

        expect(validarCondicoesDasEtapas(etapas)).toEqual({
            indice: 0,
            campo: 'etapas.0.condicoes.0.destino_ordem',
            mensagem: 'Escolha uma etapa de destino posterior a esta condição.',
        });
    });

    it('valida o destino da saída NÃO', () => {
        const etapas = etapasBase();
        etapas[0] = etapaCondicao({ condicoes: [{ inicio: '08:00', fim: '09:00', destino_ordem: 2 }], destino_nao_ordem: 1 });

        expect(validarCondicoesDasEtapas(etapas)).toEqual({
            indice: 0,
            campo: 'etapas.0.destino_nao_ordem',
            mensagem: 'Escolha uma etapa posterior para a saída NÃO ou deixe em branco para encerrar.',
        });
    });
});
