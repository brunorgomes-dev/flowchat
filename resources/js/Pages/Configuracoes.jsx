import { useEffect, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SeletorTema } from '@/components/SeletorTema';
import { SeletorFuso } from '@/components/SeletorFuso';
import { Button } from '@/components/ui/button';
import { definirPreferenciaTema, lerPreferenciaTema } from '@/lib/tema';
import { detectarFuso, formatarHoraLocal } from '@/lib/fusos';

const estilosEstadoFuso = {
    confirmado: 'border border-primary/20 bg-primary/10 text-terracota-escuro dark:text-foreground',
    pendente: 'border border-areia/70 bg-areia/20 text-foreground',
    ausente: 'border border-border bg-muted text-muted-foreground',
};

export default function Configuracoes({ fuso = null, fusos = [], messenger = null }) {
    const pagina = usePage();
    const mensagem = pagina.props.flash?.mensagem;
    const erroMessenger = pagina.props.errors?.messenger;
    const [preferenciaTema, setPreferenciaTema] = useState(lerPreferenciaTema);
    const [selecionado, setSelecionado] = useState(fuso?.disponivel ? fuso.atual : null);
    const [agora, setAgora] = useState(() => new Date());

    // Sem fuso configurado, a detecção do navegador serve apenas de
    // sugestão inicial — a confirmação continua sendo um passo do usuário
    useEffect(() => {
        if (fuso?.disponivel && !selecionado) {
            const fusoNavegador = detectarFuso();

            if (fusoNavegador) {
                setSelecionado(fusoNavegador);
            }
        }
    }, [fuso?.disponivel, selecionado]);

    // Relógio do fuso selecionado, atualizado a cada 30 segundos
    useEffect(() => {
        const intervalo = setInterval(() => setAgora(new Date()), 30000);

        return () => clearInterval(intervalo);
    }, []);

    const alterarPreferenciaTema = (preferencia) => {
        setPreferenciaTema(preferencia);
        definirPreferenciaTema(preferencia);
    };

    const form = useForm({ timezone: '' });
    const messengerForm = useForm({ page_id: messenger?.page_id ?? '', page_access_token: '' });

    const submeter = (evento) => {
        evento.preventDefault();

        if (!selecionado) {
            return;
        }

        form.setData('timezone', selecionado);
        form.post('/configuracoes/fuso', { preserveScroll: true });
    };

    const salvarMessenger = (evento) => {
        evento.preventDefault();
        messengerForm.post('/configuracoes/messenger', {
            preserveScroll: true,
            onSuccess: () => messengerForm.setData('page_access_token', ''),
        });
    };

    const rotuloEstado = !fuso?.disponivel
        ? null
        : !fuso.atual
            ? 'Não configurado'
            : fuso.confirmado
                ? 'Confirmado'
                : 'Pendente de confirmação';
    const estiloEstado = !fuso?.disponivel
        ? null
        : !fuso.atual
            ? estilosEstadoFuso.ausente
            : fuso.confirmado
                ? estilosEstadoFuso.confirmado
                : estilosEstadoFuso.pendente;

    return (
        <div className="min-h-full w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-5xl">
                <PageHeader
                    eyebrow="Preferências"
                    title="Configurações"
                    description="Ajuste a aparência e a região do FlowChat para combinar com o seu ambiente de trabalho."
                />

                {mensagem && (
                    <p className="mb-5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-terracota-escuro dark:text-foreground" role="status">
                        {mensagem}
                    </p>
                )}

                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border px-5 py-4 sm:px-6 sm:py-5">
                        <h2 id="preferencia-tema-titulo" className="text-sm font-semibold text-foreground">
                            Aparência
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Escolha um tema fixo ou acompanhe a preferência do sistema.
                        </p>
                    </div>
                    <div className="p-5 sm:p-6">
                        <SeletorTema
                            valor={preferenciaTema}
                            aoAlterar={alterarPreferenciaTema}
                        />
                        <p className="mt-4 text-xs text-muted-foreground">
                            A preferência fica salva neste navegador.
                        </p>
                    </div>
                </section>

                <section id="fuso-horario" className="relative z-10 mt-6 overflow-visible rounded-2xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border px-5 py-4 sm:px-6 sm:py-5">
                        <h2 id="fuso-horario-titulo" className="text-sm font-semibold text-foreground">
                            Fuso horário
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            A região da conta, usada para interpretar os seus horários locais nos agendamentos.
                        </p>
                    </div>
                    <div className="p-5 sm:p-6">
                        {!fuso?.disponivel ? (
                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-5 text-amber-700 dark:text-amber-400" role="status">
                                A migration de fuso horário ainda não foi executada neste banco de dados.
                                Execute <code className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs">php artisan migrate</code> para habilitar a configuração regional.
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-muted-foreground">Fuso atual da conta</p>
                                        <p className="mt-1 truncate text-sm font-medium text-foreground">
                                            {fuso.atual ?? 'Não configurado'}
                                        </p>
                                    </div>
                                    {rotuloEstado && (
                                        <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-medium ${estiloEstado}`}>
                                            {rotuloEstado}
                                        </span>
                                    )}
                                    {fuso.atual && (
                                        <p className="text-sm tabular-nums text-muted-foreground">
                                            Horário local: {formatarHoraLocal(fuso.atual, agora)}
                                        </p>
                                    )}
                                </div>

                                {fuso.atual && !fuso.confirmado && (
                                    <p className="mt-3 rounded-xl border border-areia/70 bg-areia/20 px-3 py-2 text-xs leading-5 text-foreground" role="status">
                                        Este fuso foi detectado automaticamente e aguarda a sua confirmação.
                                        Confirme-o abaixo para habilitar agendamentos e janelas de horário.
                                    </p>
                                )}

                                <form onSubmit={submeter} className="mt-4 space-y-3">
                                    <SeletorFuso
                                        fusos={fusos}
                                        valor={selecionado}
                                        aoSelecionar={setSelecionado}
                                        idInput="fuso-configuracoes"
                                    />

                                    {selecionado && (
                                        <p className="text-xs text-muted-foreground">
                                            Horário local em <span className="font-medium text-foreground">{selecionado}</span>:{' '}
                                            {formatarHoraLocal(selecionado, agora)}
                                        </p>
                                    )}

                                    {form.errors.timezone && <span role="alert" className="block text-xs text-destructive">{form.errors.timezone}</span>}

                                    <Button type="submit" disabled={form.processing || !selecionado} className="h-10">
                                        {form.processing && <LoaderCircle className="animate-spin" />}
                                        {form.processing ? 'Salvando…' : 'Confirmar fuso horário'}
                                    </Button>
                                </form>
                            </>
                        )}
                    </div>
                </section>

                <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border px-5 py-4 sm:px-6 sm:py-5">
                        <h2 className="text-sm font-semibold text-foreground">Integração com o Messenger</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Conecte a Página do Facebook usada por esta conta.</p>
                    </div>
                    <div className="p-5 sm:p-6">
                        {!messenger?.disponivel ? (
                            <p className="text-sm text-muted-foreground">A estrutura da integração Messenger por conta ainda não está disponível neste banco.</p>
                        ) : (
                            <div className="max-w-xl space-y-4">
                                {messenger.configurado && (
                                    <p className="text-sm text-muted-foreground">
                                        Página conectada: <span className="font-medium text-foreground">{messenger.page_id}</span>
                                    </p>
                                )}

                                {erroMessenger && (
                                    <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                        {erroMessenger}
                                    </p>
                                )}

                                {messenger.oauth_disponivel ? (
                                    <>
                                        <p className="text-sm leading-6 text-muted-foreground">
                                            Conecte sua Página pelo Facebook. Você fará login, escolherá a Página e autorizará as permissões solicitadas. Não precisa abrir o Meta for Developers.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button type="button" className="h-10" onClick={() => window.location.assign('/configuracoes/messenger/conectar')}>
                                                {messenger.configurado ? 'Alterar Página conectada' : 'Conectar com Facebook'}
                                            </Button>
                                            {messenger.configurado && (
                                                <Button type="button" variant="outline" className="h-10" onClick={() => router.delete('/configuracoes/messenger')}>
                                                    Desconectar
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-5 text-amber-700 dark:text-amber-400">
                                        O FlowChat ainda precisa configurar o aplicativo Meta. Isso é feito uma vez pela equipe; os clientes conectarão suas Páginas aqui.
                                        {messenger.callback_url && (
                                            <p className="mt-2 break-all text-xs">URL de retorno OAuth: <code>{messenger.callback_url}</code></p>
                                        )}
                                    </div>
                                )}

                                <details open={!messenger.oauth_disponivel} className="rounded-xl border border-border p-4">
                                    <summary className="cursor-pointer text-sm font-medium text-foreground">
                                        {messenger.oauth_disponivel ? 'Configuração manual temporária' : 'Configurar Página e token manualmente'}
                                    </summary>
                                    <form onSubmit={salvarMessenger} className="mt-4 space-y-4">
                                        {messenger.configurado && <p className="text-xs text-muted-foreground">Para trocar manualmente a Página, informe um token novo.</p>}
                                        <label className="block space-y-1.5 text-sm font-medium text-foreground">
                                            ID da Página do Facebook
                                            <input value={messengerForm.data.page_id} onChange={(evento) => messengerForm.setData('page_id', evento.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal" autoComplete="off" />
                                            {messengerForm.errors.page_id && <span role="alert" className="block text-xs text-destructive">{messengerForm.errors.page_id}</span>}
                                        </label>
                                        <label className="block space-y-1.5 text-sm font-medium text-foreground">
                                            Token de acesso da Página
                                            <input type="password" value={messengerForm.data.page_access_token} onChange={(evento) => messengerForm.setData('page_access_token', evento.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 font-normal" autoComplete="new-password" placeholder={messenger.configurado ? 'Token armazenado com segurança' : 'Cole o token da Página'} />
                                            {messengerForm.errors.page_access_token && <span role="alert" className="block text-xs text-destructive">{messengerForm.errors.page_access_token}</span>}
                                        </label>
                                        <p className="text-xs leading-5 text-muted-foreground">O token é criptografado no banco e nunca é devolvido à interface.</p>
                                        <Button type="submit" disabled={messengerForm.processing} className="h-10">
                                            {messengerForm.processing && <LoaderCircle className="animate-spin" />}
                                            {messengerForm.processing ? 'Salvando…' : 'Salvar integração manual'}
                                        </Button>
                                    </form>
                                </details>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
