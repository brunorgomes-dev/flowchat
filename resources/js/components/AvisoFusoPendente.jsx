import { Link, usePage } from '@inertiajs/react';
import { Clock } from 'lucide-react';

/**
 * Aviso discreto de configuração regional pendente: aparece nas páginas
 * internas enquanto o fuso horário da conta não estiver confirmado
 * (detectado aguardando confirmação, ou não configurado).
 */
export function AvisoFusoPendente() {
    const pagina = usePage();
    const fuso = pagina.props.auth?.user?.fuso;

    // Sem migration de fuso ou com fuso já confirmado, não há aviso
    if (!fuso?.disponivel || fuso.confirmado) {
        return null;
    }

    return (
        <div className="border-b border-areia/60 bg-areia/20 px-4 py-2.5 text-xs sm:px-6" role="status">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1.5">
                <Clock className="size-4 shrink-0 text-terracota" strokeWidth={1.8} aria-hidden="true" />
                <p className="min-w-0 flex-1 text-foreground">
                    <span className="font-medium">Fuso horário pendente de confirmação.</span>{' '}
                    <span className="text-muted-foreground">
                        {fuso.atual
                            ? `Detectamos ${fuso.atual} — confirme a sua região para que os horários dos fluxos e agendamentos sejam respeitados corretamente.`
                            : 'Confirme a sua região para que os horários dos fluxos e agendamentos sejam respeitados corretamente.'}
                    </span>
                </p>
                <Link
                    href="/configuracoes#fuso-horario"
                    className="shrink-0 font-semibold text-terracota-escuro underline-offset-4 hover:underline dark:text-terracota"
                >
                    Configurar agora
                </Link>
            </div>
        </div>
    );
}
