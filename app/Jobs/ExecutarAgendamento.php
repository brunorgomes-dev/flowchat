<?php

namespace App\Jobs;

use App\Models\Agendamento;
use App\Models\Contato;
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
        $agendamento = Agendamento::with(['account', 'fluxo', 'contato'])->find($this->agendamentoId);
        if (! $agendamento || $agendamento->estado !== 'pendente') {
            return;
        }

        if ($agendamento->account === null
            || (int) $agendamento->fluxo?->account_id !== (int) $agendamento->account_id
            || (int) $agendamento->contato?->account_id !== (int) $agendamento->account_id) {
            $agendamento->update(['estado' => 'falhou']);

            return;
        }

        if (! $agendamento->fluxo || ! $agendamento->contato) {
            $agendamento->update(['estado' => 'falhou']);

            return;
        }

        if ($agendamento->account->estaSuspensa()) {
            $agendamento->update(['estado' => 'falhou']);

            LogSistema::create([
                'account_id' => $agendamento->account_id,
                'evento' => 'agendamento_nao_executado_conta_suspensa',
                'descricao' => "Agendamento {$agendamento->id} não iniciou o fluxo {$agendamento->fluxo->nome}: conta suspensa",
            ]);

            return;
        }

        // Revalida a janela de 24 horas no momento da execução: um agendamento
        // criado perto do limite pode vencer antes de ser processado.
        if ($this->janelaDeMensagemLivreExpirada($agendamento)) {
            $agendamento->update(['estado' => 'falhou']);

            LogSistema::create([
                'account_id' => $agendamento->account_id,
                'evento' => 'agendamento_nao_executado_janela_expirada',
                'descricao' => "Agendamento {$agendamento->id} não iniciou o fluxo {$agendamento->fluxo->nome}: janela de 24 horas da Meta expirada para o PSID {$agendamento->contato->psid}",
            ]);

            return;
        }

        // Não inicia uma segunda execução concorrente do mesmo fluxo para o
        // contato; o propósito do agendamento já está sendo cumprido por ela
        $emAndamento = ExecucaoFluxo::where('contato_id', $agendamento->contato_id)
            ->where('fluxo_id', $agendamento->fluxo_id)
            ->whereNull('concluida_em')
            ->exists();

        if ($emAndamento) {
            $agendamento->update(['estado' => 'falhou']);

            LogSistema::create([
                'account_id' => $agendamento->account_id,
                'evento' => 'agendamento_falhou',
                'descricao' => "Agendamento {$agendamento->id} não iniciou o fluxo {$agendamento->fluxo->nome}: já existe uma execução em andamento para o PSID {$agendamento->contato->psid}",
            ]);

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
        $execucao = $agendamento->account->execucoes()->create([
            'contato_id' => $agendamento->contato_id,
            'fluxo_id' => $agendamento->fluxo_id,
            'etapa_atual' => 1,
        ]);

        LogSistema::create([
            'account_id' => $agendamento->account_id,
            'evento' => 'agendamento_executado',
            'descricao' => "Agendamento {$agendamento->id} iniciou o fluxo {$agendamento->fluxo->nome} para o PSID {$agendamento->contato->psid}",
        ]);

        EnviarEtapaFluxo::dispatch($execucao->id);
    }

    /**
     * Indica se o agendamento venceu a janela de 24 horas da Meta. Quando a
     * coluna existe e o contato nunca teve mensagem registrada, falha
     * fechado: sem instante conhecido não há janela válida. Apenas quando a
     * coluna ainda não existe o comportamento anterior é preservado.
     */
    private function janelaDeMensagemLivreExpirada(Agendamento $agendamento): bool
    {
        if (! Contato::janelaDeMensagemLivreDisponivel()) {
            return false;
        }

        $limite = $agendamento->contato->limiteDaJanelaDeMensagemLivre();

        return $limite === null || now()->greaterThanOrEqualTo($limite);
    }
}
