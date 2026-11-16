// Marca do FlowChat: símbolo do logotipo (canal aberto) dentro do tile terracota.
// Fonte do desenho: símbolo produzido pelo kit de identidade; usar sempre por este componente.
const CAMINHO_SIMBOLO =
    'M244 176.0 V194 A50 50 0 0 1 194 244 H62 A50 50 0 0 1 12 194 V62 A50 50 0 0 1 62 12 ' +
    'H194 A50 50 0 0 1 244 62 V80.0 H200 V64 A8 8 0 0 0 192 56 H64 A8 8 0 0 0 56 64 ' +
    'V192 A8 8 0 0 0 64 200 H192 A8 8 0 0 0 200 192 V176.0 Z';

const TAMANHOS = {
    sm: { caixa: 'size-8', icone: 'size-4' },
    md: { caixa: 'size-10', icone: 'size-[19px]' },
    lg: { caixa: 'size-11', icone: 'size-5' },
};

// Só o símbolo; herda a cor do texto ao redor (currentColor) e não é anunciado por leitores de tela
// porque o nome "FlowChat" sempre aparece ao lado.
export function SimboloFlowChat({ className = 'size-5' }) {
    return (
        <svg
            viewBox="0 0 256 256"
            className={className}
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path fillRule="evenodd" d={CAMINHO_SIMBOLO} />
        </svg>
    );
}

export function MarcaFlowChat({ tamanho = 'md', sombra = true, className = '' }) {
    const { caixa, icone } = TAMANHOS[tamanho] ?? TAMANHOS.md;

    return (
        <div
            className={`flex shrink-0 items-center justify-center rounded-xl bg-terracota text-primary-foreground ${caixa} ${sombra ? 'shadow-sm' : ''} ${className}`}
        >
            <SimboloFlowChat className={icone} />
        </div>
    );
}
