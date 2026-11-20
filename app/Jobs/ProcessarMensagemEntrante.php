<?php

namespace App\Jobs;

use App\Actions\Contatos\RegistrarMensagemRecebida;
use App\Actions\Fluxos\IniciarFluxosDoContato;
use App\Models\Account;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessarMensagemEntrante implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     *
     * O timestamp do evento chega em milissegundos, como enviado pela Meta.
     * Quando ele está ausente ou fora da faixa válida, a janela de 24 horas
     * não é renovada (o contato fica sem janela conhecida); eventos sem
     * objeto de mensagem (read/delivery) usam mensagemRecebida = false.
     */
    public function __construct(
        public int $accountId,
        public string $psid,
        public ?string $texto,
        public ?int $timestampEventoMs = null,
        public bool $mensagemRecebida = true,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $conta = Account::find($this->accountId);
        if ($conta === null || $conta->estaSuspensa()) {
            return;
        }

        // Eventos sem objeto de mensagem (read/delivery) não são eventos de
        // mensagem: não criam contato, não renovam a janela e não disparam
        // gatilhos de mensagem_recebida ou novo_contato.
        if (! $this->mensagemRecebida) {
            return;
        }

        $contato = $conta->contatos()->firstOrCreate(['psid' => $this->psid]);

        app(RegistrarMensagemRecebida::class)->executar(
            $contato,
            $this->texto,
            $this->timestampEventoMs,
            $conta->messengerIntegration?->page_access_token,
        );

        app(IniciarFluxosDoContato::class)->executar($conta, $contato);
    }
}
