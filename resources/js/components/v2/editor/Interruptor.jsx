export function Interruptor({
    id,
    checked,
    onCheckedChange,
    disabled = false,
    titulo,
    descricao = null,
}) {
    return (
        <label htmlFor={id} className="v2-editor-fluxo__interruptor" style={{ opacity: disabled ? 0.55 : 1 }}>
            <input
                id={id}
                type="checkbox"
                checked={Boolean(checked)}
                onChange={(evento) => onCheckedChange(evento.target.checked)}
                disabled={disabled}
            />
            <span className="v2-editor-fluxo__interruptor-texto">
                <span className="v2-editor-fluxo__interruptor-titulo">{titulo}</span>
                {descricao && <span className="v2-editor-fluxo__interruptor-descricao">{descricao}</span>}
            </span>
        </label>
    );
}
