<?php

namespace App\Jobs;

use App\Models\Account;
use App\Models\LogSistema;
use App\Support\RegistradorOrigemContato;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RegistrarOrigemContato implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, mixed>  $referral
     */
    public function __construct(
        public int $accountId,
        public string $psid,
        public array $referral,
        public string $evento,
        public ?string $mensagemInicial = null,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(RegistradorOrigemContato $registrador): void
    {
        $conta = Account::find($this->accountId);
        if ($conta === null || $conta->estaSuspensa()) {
            return;
        }

        $contato = $conta->contatos()->firstOrCreate(['psid' => $this->psid]);

        $origem = $registrador->registrar(
            $contato,
            $this->referral,
            $this->evento,
            $this->mensagemInicial,
            $contato->wasRecentlyCreated,
        );

        if ($origem === null) {
            return;
        }

        $detalheAnuncio = $origem->ad_id ? " (anúncio {$origem->ad_id})" : '';

        LogSistema::create([
            'account_id' => $conta->id,
            'evento' => 'origem_contato_registrada',
            'descricao' => "PSID {$this->psid}: origem {$origem->categoria}{$detalheAnuncio} registrada",
        ]);
    }
}
