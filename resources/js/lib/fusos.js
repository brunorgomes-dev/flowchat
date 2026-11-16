// Utilitários de fuso horário (identificadores IANA) para as telas de
// cadastro e configurações regionais. A detecção usa a API nativa do
// navegador e não exige GPS nem permissão de localização.

const nomesDePaisCache = new Map();

/**
 * Nome do país em português a partir do código ISO 3166-1 alpha-2
 * (ex.: BR -> Brasil), usando a base de dados do próprio navegador.
 */
export function nomeDoPais(codigo) {
    if (!codigo) {
        return null;
    }

    if (!nomesDePaisCache.has(codigo)) {
        try {
            nomesDePaisCache.set(codigo, new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(codigo) ?? codigo);
        } catch {
            nomesDePaisCache.set(codigo, codigo);
        }
    }

    return nomesDePaisCache.get(codigo);
}

/**
 * Detecta o fuso horário do navegador (identificador IANA, ex.:
 * America/Sao_Paulo). Devolve null quando o navegador não fornece um
 * identificador válido — a detecção falha em silêncio, sem sugerir padrão.
 */
export function detectarFuso() {
    try {
        const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone;

        return typeof fuso === 'string' && fuso.includes('/') ? fuso : null;
    } catch {
        return null;
    }
}

/**
 * Data/hora formatada no fuso IANA indicado (com offset, ex.: -03).
 * Devolve null quando o identificador não é reconhecido pelo navegador.
 */
export function formatarHoraLocal(fuso, data = new Date()) {
    if (!fuso) {
        return null;
    }

    try {
        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: fuso,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'shortOffset',
        }).format(data);
    } catch {
        return null;
    }
}
