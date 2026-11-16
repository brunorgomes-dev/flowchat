import { useEffect, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { Globe, LoaderCircle } from 'lucide-react';
import { ModalFlowChat } from '@/components/ModalFlowChat';
import { SeletorFuso } from '@/components/SeletorFuso';
import { Button } from '@/components/ui/button';
import { detectarFuso, formatarHoraLocal } from '@/lib/fusos';
/**
 * Modal de confirmação do fuso horário, exibido uma única vez logo após a
 * criação da conta (flag de flash do cadastro). A detecção do navegador é
 * apenas a sugestão: o usuário confirma ou escolhe outro. Fechar sem
 * decidir guarda o fuso detectado como "pendente de confirmação" — nada é
 * confirmado automaticamente.
 */
export function ModalFusoConfirmacao() {
    const pagina = usePage();
    const fuso = pagina.props.auth?.user?.fuso;
    const fusoConfirmar = pagina.props.flash?.fuso_confirmar;
    const disponivel = fuso?.disponivel === true;

    const [aberto, setAberto] = useState(false);
    const [selecionado, setSelecionado] = useState(null);
    const [agora, setAgora] = useState(() => new Date());
    const form = useForm({ timezone: '', timezone_confirmado: true });

    // Abre quando o cadastro sinaliza e a conta ainda não confirmou o fuso;
    // a detecção do navegador serve apenas de sugestão inicial
    useEffect(() => {
        if (fusoConfirmar && disponivel && fuso?.confirmado === false) {
            setSelecionado(fuso.atual ?? detectarFuso());
            setAberto(true);
        }
    }, [fusoConfirmar, disponivel, fuso?.atual, fuso?.confirmado]);

    // Relógio do fuso selecionado, atualizado a cada 30 segundos
    useEffect(() => {
        const intervalo = setInterval(() => setAgora(new Date()), 30000);

        return () => clearInterval(intervalo);
    }, []);

    const fechar = () => setAberto(false);

    const confirmar = () => {
        if (!selecionado || form.processing) {
            return;
        }

        form.setData('timezone', selecionado);
        form.setData('timezone_confirmado', true);
        form.post('/configuracoes/fuso', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Fuso horário confirmado', {
                    description: `Os horários passarão a considerar ${selecionado}.`,
                });
                // Atualiza o estado compartilhado do usuário para o aviso de
                // fuso pendente desaparecer de imediato (sem nova navegação)
                router.reload({ only: ['auth'] });
                fechar();
            },
            onError: () => toast.error('Não foi possível confirmar o fuso horário'),
        });
    };

    // "Agora não": guarda o fuso detectado como pendente (sem confirmar) para
    // que o aviso discreto continue existindo; sem detecção, não guarda nada
    const adiar = () => {
        const fusoDetectado = detectarFuso();

        if (fuso?.atual === null && fusoDetectado) {
            form.setData('timezone', fusoDetectado);
            form.setData('timezone_confirmado', false);
            form.post('/configuracoes/fuso', {
                preserveScroll: true,
                // Atualiza o estado partilhado do usuário para o aviso
                // pendente aparecer de imediato no topo
                onSuccess: () => router.reload({ only: ['auth'] }),
            });
        }

        fechar();
    };

    if (!disponivel) {
        return null;
    }

    return (
        <ModalFlowChat open={aberto} onClose={adiar} labelledBy="fuso-modal-titulo" className="max-w-md">
            <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-terracota/10 text-terracota">
                        <Globe className="size-5" strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <h2 id="fuso-modal-titulo" className="text-base font-semibold text-foreground">
                            Confirme o seu fuso horário?
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Detectamos este fuso no seu navegador — ele garante que os horários dos fluxos e agendamentos sejam respeitados corretamente.
                        </p>
                    </div>
                </div>

                {selecionado && (
                    <div className="mt-4 rounded-xl border border-areia/70 bg-areia/20 px-3.5 py-2.5">
                        <p className="text-sm font-medium text-foreground">{selecionado}</p>
                        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                            Horário local: {formatarHoraLocal(selecionado, agora)}
                        </p>
                    </div>
                )}

                <div className="mt-4">
                    <SeletorFuso
                        fusos={pagina.props.flash?.fusos ?? []}
                        valor={selecionado}
                        aoSelecionar={setSelecionado}
                        idInput="fuso-modal"
                    />
                    <p className="mt-2 text-[11px] text-muted-foreground">
                        Não é isso? Pesquise por país, cidade ou identificador e escolha o seu fuso.
                    </p>
                </div>

                {form.errors.timezone && <span role="alert" className="mt-2 block text-xs text-destructive">{form.errors.timezone}</span>}

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={adiar}
                        disabled={form.processing}
                        className="h-10 text-muted-foreground hover:text-foreground"
                    >
                        Agora não
                    </Button>
                    <Button type="button" onClick={confirmar} disabled={form.processing || !selecionado} className="h-10">
                        {form.processing && <LoaderCircle className="animate-spin" />}
                        {form.processing ? 'Confirmando…' : 'Confirmar fuso horário'}
                    </Button>
                </div>
            </div>
        </ModalFlowChat>
    );
}
