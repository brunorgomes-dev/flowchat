import { Check } from 'lucide-react';
import { MarcaFlowChat } from '@/components/MarcaFlowChat';

/**
 * Coluna esquerda das telas públicas de acesso: marca, frase e lista de
 * garantias. A mesma casca é usada por Login e Cadastro.
 */
export default function PainelAcesso({ frase, itens, rodape, rodapeComIcone = false }) {
    return (
        <div className="v2-auth__marca">
            <div className="flex items-center gap-2.5">
                <MarcaFlowChat tamanho="lg" />
                <div>
                    <p className="text-[0.9375rem] font-semibold">FlowChat</p>
                    <p className="text-[0.6875rem] text-[var(--v2-rail-ink-2)]">Automação de conversas no Messenger</p>
                </div>
            </div>

            <div>
                <p className="v2-auth__frase">{frase}</p>
                <ul className="v2-auth__lista mt-5">
                    {itens.map((item) => (
                        <li key={item}>
                            <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--v2-areia)]" aria-hidden="true" />
                            {item}
                        </li>
                    ))}
                </ul>
            </div>

            {rodape && (
                <p
                    className={
                        rodapeComIcone
                            ? 'flex items-center gap-2 text-[0.6875rem] text-[var(--v2-rail-ink-2)]'
                            : 'text-[0.6875rem] text-[var(--v2-rail-ink-2)]'
                    }
                >
                    {rodape}
                </p>
            )}
        </div>
    );
}
