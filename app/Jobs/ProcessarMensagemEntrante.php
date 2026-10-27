<?php

namespace App\Jobs;

use App\Models\Contato;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\LogSistema;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;

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

        $this->preencherNome($contato);

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

        // Gatilhos aplicáveis ao evento; um mesmo fluxo inicia uma única vez
        // (whereHas não duplica o fluxo mesmo se dois gatilhos casarem)
        $gatilhos = ['mensagem_recebida'];
        if ($contato->wasRecentlyCreated) {
            $gatilhos[] = 'novo_contato';
        }

        $fluxos = Fluxo::where('ativo', true)
            ->whereHas('regras', fn ($consulta) => $consulta
                ->where('ativo', true)
                ->whereIn('gatilho', $gatilhos))
            ->orderBy('id')
            ->get();

        foreach ($fluxos as $fluxo) {
            $execucao = ExecucaoFluxo::create([
                'contato_id' => $contato->id,
                'fluxo_id' => $fluxo->id,
                'etapa_atual' => 1,
            ]);

            LogSistema::create(['evento' => 'fluxo_iniciado', 'descricao' => "PSID {$this->psid} iniciou o fluxo {$fluxo->nome}"]);

            EnviarEtapaFluxo::dispatch($execucao->id);
        }
    }

    /**
     * Busca o nome do perfil do contato na Graph API, se ainda não tiver nome salvo.
     */
    private function preencherNome(Contato $contato): void
    {
        if ($contato->nome !== null && $contato->nome !== '') {
            return;
        }

        $token = config('services.messenger.page_access_token');
        if (! $token) {
            return;
        }

        $resposta = Http::get(config('services.messenger.api_url').'/'.$contato->psid, [
            'fields' => 'first_name,last_name',
            'access_token' => $token,
        ]);

        if (! $resposta->successful()) {
            return;
        }

        $partes = [$resposta->json('first_name') ?? '', $resposta->json('last_name') ?? ''];
        $nome = trim(implode(' ', array_filter($partes)));

        if ($nome === '') {
            return;
        }

        $contato->update(['nome' => $nome]);
    }
}
