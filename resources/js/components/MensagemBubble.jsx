function formatarDataCompleta(valor) {
    if (!valor) {
        return null;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(data);
}

export function MensagemBubble({ mensagem }) {
    const enviada = mensagem.direcao === 'enviada';
    const horario = formatarDataCompleta(mensagem.created_at);

    return (
        <div className={`flex w-full ${enviada ? 'justify-end' : 'justify-start'}`}>
            <article className={`max-w-[min(82%,42rem)] rounded-2xl border px-4 py-3 ${enviada
                ? 'rounded-br-lg border-transparent bg-primary text-primary-foreground'
                : 'rounded-bl-lg border-border bg-card text-card-foreground'}`}>
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{mensagem.texto}</p>
                <div className={`mt-2 flex items-center gap-2 text-[10px] ${enviada
                    ? 'justify-end text-primary-foreground/70'
                    : 'justify-start text-muted-foreground'}`}>
                    <span>{enviada ? 'Enviada' : 'Recebida'}</span>
                    {horario && <span>{horario}</span>}
                </div>
            </article>
        </div>
    );
}
