/**
 * Formatadores e leitores de dados usados pelas telas V2 reais.
 * Não contêm fixtures nem regras de negócio: apenas apresentação.
 */

const formatadorData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatadorDataHora = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});
const formatadorDataHoraCurta = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});
const formatadorHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const formatadorDiaLongo = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

function comoData(valor) {
    if (!valor) {
        return null;
    }

    const data = new Date(valor);

    return Number.isNaN(data.getTime()) ? null : data;
}

export function formatarData(valor) {
    const data = comoData(valor);

    return data ? formatadorData.format(data) : '—';
}

export function formatarDataHora(valor) {
    const data = comoData(valor);

    return data ? formatadorDataHora.format(data) : '—';
}

export function formatarDataHoraCurta(valor) {
    const data = comoData(valor);

    return data ? formatadorDataHoraCurta.format(data) : '—';
}

export function formatarHora(valor) {
    const data = comoData(valor);

    return data ? formatadorHora.format(data) : '—';
}

export function formatarDiaLongo(valor) {
    const data = comoData(valor);

    return data ? formatadorDiaLongo.format(data) : '—';
}

export function chaveDoDia(valor) {
    const data = comoData(valor);

    if (!data) {
        return 'sem-data';
    }

    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${data.getFullYear()}-${mes}-${dia}`;
}

export function nomeDoContato(contato) {
    return contato?.nome?.trim() || contato?.psid || 'Contato sem identificação';
}

export function iniciais(nome) {
    const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean);

    if (partes.length === 0) {
        return '—';
    }

    if (partes.length === 1) {
        return partes[0].slice(0, 2).toUpperCase();
    }

    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

const rotulosMidia = {
    imagem: 'Imagem',
    audio: 'Áudio',
    video: 'Vídeo',
    arquivo: 'Arquivo',
};

export function rotuloMidia(tipo) {
    return rotulosMidia[tipo] ?? 'Mídia';
}

export function resumoMensagem(mensagem) {
    if (!mensagem) {
        return 'Nenhuma mensagem registrada';
    }

    if (mensagem.tipo_conteudo && mensagem.tipo_conteudo !== 'texto') {
        return `${rotuloMidia(mensagem.tipo_conteudo)}: ${mensagem.anexo_nome_original ?? 'anexo'}`;
    }

    return mensagem.texto || 'Nenhuma mensagem registrada';
}

export function urlSegura(valor) {
    if (typeof valor !== 'string' || valor.trim() === '') {
        return null;
    }

    try {
        const url = new URL(valor);

        return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
    } catch {
        return null;
    }
}
