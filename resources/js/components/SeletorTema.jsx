import { useId } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';

const opcoesTema = [
    {
        valor: 'sistema',
        titulo: 'Sistema',
        descricao: 'Acompanha a preferência do dispositivo.',
        icone: Monitor,
    },
    {
        valor: 'claro',
        titulo: 'Claro',
        descricao: 'Mantém a interface no modo claro.',
        icone: Sun,
    },
    {
        valor: 'escuro',
        titulo: 'Escuro',
        descricao: 'Mantém a interface no modo escuro.',
        icone: Moon,
    },
];

export function SeletorTema({ valor, aoAlterar }) {
    const idGrupo = useId();

    return (
        <div role="radiogroup" aria-label="Preferência de tema" className="grid gap-3 sm:grid-cols-3">
            {opcoesTema.map((opcao) => {
                const selecionada = valor === opcao.valor;
                const Icone = opcao.icone;

                return (
                    <label
                        key={opcao.valor}
                        htmlFor={`${idGrupo}-${opcao.valor}`}
                        className={`flex min-h-[120px] cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring/50 ${selecionada
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-background hover:bg-accent'}`}
                    >
                        <input
                            id={`${idGrupo}-${opcao.valor}`}
                            type="radio"
                            name={idGrupo}
                            value={opcao.valor}
                            checked={selecionada}
                            onChange={() => aoAlterar(opcao.valor)}
                            className="mt-1 size-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <Icone className={`size-4 ${selecionada ? 'text-terracota' : 'text-muted-foreground'}`} />
                                    {opcao.titulo}
                                </span>
                                {selecionada && <Check className="size-4 shrink-0 text-terracota" aria-hidden="true" />}
                            </span>
                            <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                                {opcao.descricao}
                            </span>
                        </span>
                    </label>
                );
            })}
        </div>
    );
}
