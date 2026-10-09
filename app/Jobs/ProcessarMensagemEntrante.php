<?php

namespace App\Jobs;

use App\Models\Contato;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\LogSistema;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessarMensagemEntrante implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(public string $psid, public ?string $texto) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Identificar e salvar contato
        $contato = Contato::firstOrCreate(['psid' => $this->psid]);

        if ($this->texto !== null) {
            $contato->mensagens()->create(['direcao' => 'recebida', 'texto' => $this->texto]);
            LogSistema::create(['evento' => 'mensagem_recebida', 'descricao' => "PSID {$this->psid}: {$this->texto}"]);
        }

        // Não inicia novo fluxo se já existe execução em andamento
        $emAndamento = ExecucaoFluxo::where('contato_id', $contato->id)
            ->whereNull('concluida_em')
            ->exists();
        if ($emAndamento) {
            return;
        }

        $fluxo = Fluxo::where('ativo', true)->orderBy('id')->first();
        if (! $fluxo) {
            return;
        }

        $execucao = ExecucaoFluxo::create([
            'contato_id' => $contato->id,
            'fluxo_id' => $fluxo->id,
            'etapa_atual' => 1,
        ]);

        LogSistema::create(['evento' => 'fluxo_iniciado', 'descricao' => "PSID {$this->psid} iniciou o fluxo {$fluxo->nome}"]);

        EnviarEtapaFluxo::dispatch($execucao->id);
    }
}
