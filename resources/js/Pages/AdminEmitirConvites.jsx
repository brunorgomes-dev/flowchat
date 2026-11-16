import { router, useForm } from '@inertiajs/react';
import { Copy, LoaderCircle, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';

function dataLocal(data) {
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(data));
}

export default function AdminEmitirConvites({ convites, linkConvite }) {
    const [copiado, setCopiado] = useState(false);
    const form = useForm({ email: '' });

    const emitir = (evento) => {
        evento.preventDefault();
        form.post('/admin/convites', {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    const copiarLink = async () => {
        await navigator.clipboard.writeText(linkConvite);
        setCopiado(true);
    };

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
            <PageHeader titulo="Emitir convite" descricao="Crie um link de entrada e acompanhe os convites recentes." />

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <h2 className="text-sm font-semibold text-foreground">Novo convite</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">O link vale por 7 dias e só pode ser usado uma vez. Envie-o diretamente ao email informado.</p>
                <form onSubmit={emitir} className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
                        Email do convidado
                        <Input
                            type="email"
                            required
                            value={form.data.email}
                            onChange={(evento) => form.setData('email', evento.target.value)}
                            autoComplete="email"
                            className="mt-1.5 h-10 bg-background text-sm text-foreground"
                        />
                        {form.errors.email && <span role="alert" className="mt-1 block text-xs text-destructive">{form.errors.email}</span>}
                    </label>
                    <Button type="submit" disabled={form.processing} className="h-10 self-end">
                        {form.processing ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
                        Criar convite
                    </Button>
                </form>

                {linkConvite && (
                    <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <p className="text-xs font-semibold text-foreground">Link criado — copie e envie ao destinatário</p>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <Input readOnly value={linkConvite} aria-label="Link do convite" className="bg-background text-xs" />
                            <Button type="button" variant="outline" onClick={copiarLink} className="shrink-0">
                                <Copy />
                                {copiado ? 'Copiado' : 'Copiar link'}
                            </Button>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Este link só é mostrado agora. Se perder, revogue o convite e crie outro.</p>
                    </div>
                )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-4">
                    <h2 className="text-sm font-semibold text-foreground">Convites recentes</h2>
                </div>
                {convites.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum convite emitido ainda.</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {convites.map((convite) => (
                            <li key={convite.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">{convite.email}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Estado: {convite.estado}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Emitido em: {dataLocal(convite.criado_em)} · Expira em: {dataLocal(convite.expira_em)}
                                        {convite.resgatado_em && <> · Resgatado em: {dataLocal(convite.resgatado_em)}</>}
                                        {convite.revogado_em && <> · Revogado em: {dataLocal(convite.revogado_em)}</>}
                                    </p>
                                </div>
                                {convite.estado === 'pendente' && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.delete(`/admin/convites/${convite.id}`, {
                                            preserveScroll: true,
                                            onSuccess: () => toast.success('Convite revogado'),
                                        })}
                                    >
                                        <X />
                                        Revogar
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
