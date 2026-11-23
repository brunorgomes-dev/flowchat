import { CalendarClock, LoaderCircle } from 'lucide-react';
import { Campo, Secao } from '@/components/v2/pecas';
import { nomeDoContato } from '@/components/v2/formato';

/**
 * Formulário de criação de agendamento: fluxo, contato e data/hora
 * interpretados no fuso confirmado da conta.
 */
export default function FormularioNovoAgendamento({ fluxos, contatos, form, aoAgendar }) {
    return (
        <Secao
            id="agendamentos-novo"
            titulo="Novo agendamento"
            nota="O servidor recusa datas no passado e exige o fuso da conta confirmado."
        >
            <form onSubmit={aoAgendar} className="v2-painel v2-painel__corpo">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
                    <Campo rotulo="Fluxo" htmlFor="ag-fluxo" erro={form.errors.fluxo_id}>
                        <select
                            id="ag-fluxo"
                            className="v2-entrada"
                            value={form.data.fluxo_id}
                            onChange={(evento) => {
                                form.setData('fluxo_id', evento.target.value);
                                form.clearErrors('fluxo_id');
                            }}
                            aria-invalid={Boolean(form.errors.fluxo_id)}
                        >
                            <option value="">Selecione um fluxo</option>
                            {fluxos.map((fluxo) => (
                                <option key={fluxo.id} value={fluxo.id}>{fluxo.nome}</option>
                            ))}
                        </select>
                    </Campo>

                    <Campo rotulo="Contato" htmlFor="ag-contato" erro={form.errors.contato_id}>
                        <select
                            id="ag-contato"
                            className="v2-entrada"
                            value={form.data.contato_id}
                            onChange={(evento) => {
                                form.setData('contato_id', evento.target.value);
                                form.clearErrors('contato_id');
                            }}
                            aria-invalid={Boolean(form.errors.contato_id)}
                        >
                            <option value="">Selecione um contato</option>
                            {contatos.map((contato) => (
                                <option key={contato.id} value={contato.id}>{nomeDoContato(contato)}</option>
                            ))}
                        </select>
                    </Campo>

                    <Campo rotulo="Data e horário" htmlFor="ag-data" erro={form.errors.executar_em}>
                        <input
                            id="ag-data"
                            type="datetime-local"
                            className="v2-entrada v2-numerico"
                            value={form.data.executar_em}
                            onChange={(evento) => {
                                form.setData('executar_em', evento.target.value);
                                form.clearErrors('executar_em');
                            }}
                            aria-invalid={Boolean(form.errors.executar_em)}
                        />
                    </Campo>

                    <button type="submit" className="v2-btn v2-btn--primario" disabled={form.processing}>
                        {form.processing ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <CalendarClock aria-hidden="true" />}
                        {form.processing ? 'Agendando…' : 'Agendar'}
                    </button>
                </div>
                <p className="v2-campo__ajuda mt-2">
                    O horário é interpretado no fuso da conta, com horário de verão respeitado.
                </p>
            </form>
        </Secao>
    );
}
