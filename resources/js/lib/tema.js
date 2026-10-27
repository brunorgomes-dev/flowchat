const CHAVE_TEMA = 'flowchat-tema';
const PREFERENCIAS_TEMA = ['sistema', 'claro', 'escuro'];

export function lerPreferenciaTema() {
    try {
        const preferenciaSalva = localStorage.getItem(CHAVE_TEMA);

        return PREFERENCIAS_TEMA.includes(preferenciaSalva) ? preferenciaSalva : 'sistema';
    } catch (erro) {
        return 'sistema';
    }
}

export function definirPreferenciaTema(preferencia) {
    const preferenciaValida = PREFERENCIAS_TEMA.includes(preferencia) ? preferencia : 'sistema';

    if (typeof window.definirPreferenciaTema === 'function') {
        window.definirPreferenciaTema(preferenciaValida);
        return;
    }

    try {
        localStorage.setItem(CHAVE_TEMA, preferenciaValida);
    } catch (erro) {
        // Mantém a escolha visual na aba mesmo quando o armazenamento não está disponível.
    }

    const sistemaPrefereEscuro = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    const escuro = preferenciaValida === 'escuro' || (preferenciaValida === 'sistema' && sistemaPrefereEscuro);

    document.documentElement.classList.toggle('dark', escuro);
}
