export function origemEhAnuncio(origem) {
    return Boolean(origem) && (origem.categoria === 'anuncio' || Boolean(origem.ad_id));
}

export function rotuloOrigem(origem) {
    if (!origem) {
        return null;
    }

    if (origemEhAnuncio(origem)) {
        return 'Anúncio';
    }

    return String(origem.source ?? '').toUpperCase() === 'SHORTLINK' ? 'Link' : 'Origem';
}

export function rotuloDoDia(dia) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date(`${dia}T12:00:00`));
}
