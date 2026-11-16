import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * Campo de senha com botão de mostrar/ocultar (olhinho). Repassa todas as
 * propriedades ao Input e mantém o tipo "password" até ser alternado.
 */
export function CampoSenha({ className = '', ...propriedades }) {
    const [visivel, setVisivel] = useState(false);

    return (
        <div className="relative">
            <Input
                type={visivel ? 'text' : 'password'}
                className={`pr-10 ${className}`}
                {...propriedades}
            />
            <button
                type="button"
                aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={visivel}
                title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setVisivel((atual) => !atual)}
                className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
                {visivel ? <EyeOff className="size-4" strokeWidth={1.8} /> : <Eye className="size-4" strokeWidth={1.8} />}
            </button>
        </div>
    );
}
