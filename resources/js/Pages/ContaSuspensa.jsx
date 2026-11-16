import { Link } from '@inertiajs/react';
import { ShieldAlert } from 'lucide-react';
import { MarcaFlowChat } from '@/components/MarcaFlowChat';

// Página pública: dispensa o layout da aplicação (sidebar)
ContaSuspensa.layout = false;

export default function ContaSuspensa() {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10 font-sans text-foreground">
            <div className="w-full max-w-md">
                <div className="mb-6 flex items-center justify-center gap-3">
                    <MarcaFlowChat tamanho="lg" />
                    <div className="min-w-0">
                        <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">FlowChat</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-terracota-escuro dark:text-muted-foreground">Atendimento</p>
                    </div>
                </div>

                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                        <ShieldAlert className="size-5" strokeWidth={1.8} />
                    </div>
                    <h1 className="mt-4 text-base font-semibold text-foreground">Conta suspensa</h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        O acesso desta conta está temporariamente suspenso. Entre em contato com o administrador da plataforma para regularizar a situação e solicitar a reativação.
                    </p>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Seus dados e a integração com o Messenger permanecem preservados enquanto a conta estiver suspensa.
                    </p>
                    <Link
                        href="/login"
                        className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-terracota px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-terracota-escuro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        Voltar para o login
                    </Link>
                </section>
            </div>
        </div>
    );
}
