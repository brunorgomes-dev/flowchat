<?php

namespace App\Jobs;

use App\Models\EtapaFluxo;
use App\Models\ExecucaoFluxo;
use App\Models\LogSistema;
use App\Models\Mensagem;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;

class EnviarEtapaFluxo implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(public int $execucaoId) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $execucao = ExecucaoFluxo::find($this->execucaoId);
        if (! $execucao || $execucao->concluida_em !== null) {
            return;
        }

        $etapa = EtapaFluxo::where('fluxo_id', $execucao->fluxo_id)
            ->where('ordem', $execucao->etapa_atual)
            ->first();

        // Sem próxima etapa: fluxo concluído
        if (! $etapa) {
            $execucao->update(['concluida_em' => now()]);
            LogSistema::create(['evento' => 'fluxo_concluido', 'descricao' => "Execução {$execucao->id} concluída"]);

            return;
        }

        if (! $this->enviarMensagem($execucao->contato->psid, $etapa->texto)) {
            return;
        }

        Mensagem::create([
            'contato_id' => $execucao->contato_id,
            'direcao' => 'enviada',
            'texto' => $etapa->texto,
        ]);
        LogSistema::create(['evento' => 'mensagem_enviada', 'descricao' => "Etapa {$etapa->ordem} enviada ao PSID {$execucao->contato->psid}"]);

        $execucao->increment('etapa_atual');

        // Aguarda a pausa da etapa antes de enviar a próxima
        EnviarEtapaFluxo::dispatch($execucao->id)->delay($etapa->pausa_segundos);
    }

    /**
     * Envia mensagem pela Facebook Messenger Platform API.
     */
    private function enviarMensagem(string $psid, string $texto): bool
    {
        if (! config('services.messenger.page_access_token')) {
            LogSistema::create(['evento' => 'erro_envio', 'descricao' => 'MESSENGER_PAGE_ACCESS_TOKEN não configurado']);

            return false;
        }

        $resposta = Http::post(config('services.messenger.api_url').'/me/messages', [
            'recipient' => ['id' => $psid],
            'message' => ['text' => $texto],
        ]);

        return $resposta->successful();
    }
}
