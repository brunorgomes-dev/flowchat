<?php

namespace App\Actions\Mensagens;

use App\Models\LogSistema;
use App\Support\Meta\ResumoErroMeta;
use Illuminate\Support\Facades\Http;

/**
 * Envia o texto de uma etapa ao contato pela Send API.
 */
final class EnviarTextoDaEtapa
{
    public function executar(?string $token, string $psid, string $texto, int $accountId): bool
    {
        if (! $token) {
            LogSistema::create(['account_id' => $accountId, 'evento' => 'erro_envio', 'descricao' => 'Token da Página do Messenger não configurado']);

            return false;
        }

        $resposta = Http::withToken($token)
            ->connectTimeout(5)
            ->timeout(15)
            ->post(config('services.messenger.api_url').'/me/messages', [
                'recipient' => ['id' => $psid],
                'message' => ['text' => $texto],
            ]);

        if ($resposta->successful()) {
            return true;
        }

        // Registra a rejeição da Graph API para permitir diagnóstico
        LogSistema::create([
            'account_id' => $accountId,
            'evento' => 'erro_envio',
            'descricao' => 'Graph API rejeitou o envio: '.ResumoErroMeta::de($resposta),
        ]);

        return false;
    }
}
