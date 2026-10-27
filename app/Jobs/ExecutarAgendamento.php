<?php

namespace App\Jobs;

use App\Models\Agendamento;
use App\Models\ExecucaoFluxo;
use App\Models\LogSistema;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ExecutarAgendamento implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(public int $agendamentoId) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $agendamento = Agendamento::find($this->agendamentoId);
        if (! $agendamento || $agendamento->estado !== 'pendente') {
            return;
        }

        if (! $agendamento->fluxo || ! $agendamento->contato) {
            $agendamento->update(['estado' => 'falhou']);

            return;
        }

        // Transição atômica pendente -> executado: impede que o agendamento
        // execute o fluxo mais de uma vez, inclusive em tentativas repetidas
        $transicionado = Agendamento::where('id', $agendamento->id)
            ->where('estado', 'pendente')
            ->update(['estado' => 'executado']);
        if (! $transicionado) {
            return;
        }

        // Inicia o fluxo pelo mesmo mecanismo usado para mensagens recebidas
        $execucao = ExecucaoFluxo::create([
            'contato_id' => $agendamento->contato_id,
            'fluxo_id' => $agendamento->fluxo_id,
            'etapa_atual' => 1,
        ]);

        LogSistema::create([
            'evento' => 'agendamento_executado',
            'descricao' => "Agendamento {$agendamento->id} iniciou o fluxo {$agendamento->fluxo->nome} para o PSID {$agendamento->contato->psid}",
        ]);

        EnviarEtapaFluxo::dispatch($execucao->id);
    }
}
