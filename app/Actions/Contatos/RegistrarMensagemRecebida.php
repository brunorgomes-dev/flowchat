<?php

namespace App\Actions\Contatos;

use App\Models\Contato;
use App\Models\LogSistema;
use App\Support\Contatos\JanelaDeMensagemLivre;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

/**
 * Persiste a mensagem recebida do contato: nome do perfil, janela de 24 horas,
 * texto e a mensagem inicial da origem.
 */
final class RegistrarMensagemRecebida
{
    public function __construct(private readonly JanelaDeMensagemLivre $janela) {}

    public function executar(Contato $contato, ?string $texto, ?int $timestampEventoMs, ?string $token): void
    {
        $this->preencherNome($contato, $token);

        $this->janela->renovar($contato, $timestampEventoMs);

        if ($texto === null) {
            return;
        }

        $contato->mensagens()->create(['direcao' => 'recebida', 'texto' => $texto]);
        // O texto integral fica apenas na tabela de mensagens; o log
        // funcional registra o evento sem expor a conversa.
        LogSistema::create(['account_id' => $contato->account_id, 'evento' => 'mensagem_recebida', 'descricao' => "Mensagem recebida do PSID {$contato->psid}"]);
        $this->preencherMensagemInicialDaOrigem($contato, $texto);
    }

    /**
     * Completa a mensagem inicial de uma origem recente que ainda não a tem.
     * O referral de anúncio pode chegar num postback antes da primeira
     * mensagem de texto; nesse caso o texto real é preservado aqui.
     */
    private function preencherMensagemInicialDaOrigem(Contato $contato, string $texto): void
    {
        if (! Schema::hasTable('origens_contato') || trim($texto) === '') {
            return;
        }

        $origem = $contato->origens()
            ->whereNull('mensagem_inicial')
            ->where('created_at', '>=', now()->subDay())
            ->latest('id')
            ->first();

        if ($origem !== null) {
            $origem->update(['mensagem_inicial' => $texto]);
        }
    }

    /**
     * Busca o nome do perfil do contato na Graph API, se ainda não tiver nome salvo.
     */
    private function preencherNome(Contato $contato, ?string $token): void
    {
        if ($contato->nome !== null && $contato->nome !== '') {
            return;
        }

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
