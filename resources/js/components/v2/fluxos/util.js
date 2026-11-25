import { rotuloMidia } from '@/components/v2/formato';

export const rotulosGatilho = {
    novo_contato: 'Novo contato',
    mensagem_recebida: 'Mensagem recebida',
};

export function rotuloRegra(regra) {
    const rotulo = rotulosGatilho[regra.gatilho] ?? regra.gatilho;

    return regra.gatilho === 'mensagem_recebida' && regra.ad_id
        ? `${rotulo} · anúncio ${regra.ad_id}`
        : rotulo;
}

export function estaAtivo(valor) {
    return valor === true || valor === 1 || valor === '1';
}

export function descreverEtapa(etapa) {
    if (etapa.tipo === 'condicao_horario') {
        return 'Condição por horário';
    }

    if (etapa.tipo_conteudo && etapa.tipo_conteudo !== 'texto') {
        return `Mídia · ${rotuloMidia(etapa.tipo_conteudo)}`;
    }

    return etapa.texto?.trim() || 'Mensagem sem texto';
}
