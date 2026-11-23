import { useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import LayoutV2 from '@/components/v2/LayoutV2';
import DialogoCancelamento from '@/components/v2/agendamentos/DialogoCancelamento';
import FormularioNovoAgendamento from '@/components/v2/agendamentos/FormularioNovoAgendamento';
import TabelaAgendamentos from '@/components/v2/agendamentos/TabelaAgendamentos';
import { CabecalhoPagina, Metrica } from '@/components/v2/pecas';

export default function Agendamentos({ fluxos = [], contatos = [], agendamentos = [] }) {
    const [filtro, setFiltro] = useState('todos');
    const [paraCancelar, setParaCancelar] = useState(null);
    const [cancelando, setCancelando] = useState(false);
    const form = useForm({ fluxo_id: '', contato_id: '', executar_em: '' });

    const lista = useMemo(
        () => agendamentos.filter((agendamento) => filtro === 'todos' || agendamento.estado === filtro),
        [agendamentos, filtro],
    );

    const pendentes = agendamentos.filter((agendamento) => agendamento.estado === 'pendente').length;
    const executados = agendamentos.filter((agendamento) => agendamento.estado === 'executado').length;
    const falhas = agendamentos.filter((agendamento) => agendamento.estado === 'falhou').length;

    const agendar = (evento) => {
        evento.preventDefault();
        form.post('/agendamentos', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                toast.success('Agendamento criado');
            },
        });
    };

    const cancelar = () => {
        if (!paraCancelar) {
            return;
        }

        router.post(`/agendamentos/${paraCancelar.id}/cancelar`, {}, {
            preserveScroll: true,
            onStart: () => setCancelando(true),
            onSuccess: () => {
                setParaCancelar(null);
                toast.success('Agendamento cancelado');
            },
            onFinish: () => setCancelando(false),
        });
    };

    return (
        <div className="v2-conteudo">
            <CabecalhoPagina
                titulo="Agendamentos"
                descricao="Programe execuções futuras e acompanhe o estado de cada uma. O horário é interpretado no fuso confirmado da conta."
                acoes={
                    <Link href="/fluxos" className="v2-btn v2-btn--contorno">
                        Ver fluxos
                    </Link>
                }
            />

            <div className="v2-metricas mt-4">
                <Metrica rotulo="Pendentes" valor={pendentes} unidade="na fila" />
                <Metrica rotulo="Executados" valor={executados} unidade="concluídos" />
                <Metrica rotulo="Falharam" valor={falhas} unidade="exigem atenção" />
                <Metrica rotulo="Total" valor={agendamentos.length} unidade="registros" />
            </div>

            <FormularioNovoAgendamento fluxos={fluxos} contatos={contatos} form={form} aoAgendar={agendar} />

            <TabelaAgendamentos
                agendamentos={agendamentos}
                lista={lista}
                filtro={filtro}
                aoFiltrar={setFiltro}
                aoCancelar={setParaCancelar}
            />

            <DialogoCancelamento
                agendamento={paraCancelar}
                cancelando={cancelando}
                aoFechar={() => setParaCancelar(null)}
                aoConfirmar={cancelar}
            />
        </div>
    );
}

Agendamentos.layout = [LayoutV2];
