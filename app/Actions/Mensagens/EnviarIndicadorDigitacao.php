<?php

namespace App\Actions\Mensagens;

use App\Models\LogSistema;
use App\Support\Meta\ResumoErroMeta;
use Illuminate\Support\Facades\Http;

/**
 * Envia uma ação de remetente (`typing_on` ou `typing_off`) à Send API.
 */
final class EnviarIndicadorDigitacao
{
    public function executar(?string $token, string $psid, string $acao, int $accountId): bool
    {
        if (! $token) {
            LogSistema::create([
                'account_id' => $accountId,
                'evento' => 'erro_indicador_digitacao',
                'descricao' => 'Token da Página do Messenger não configurado para enviar '.$acao,
            ]);

            return false;
        }

        $resposta = Http::withToken($token)
            ->connectTimeout(5)
            ->timeout(15)
            ->post(config('services.messenger.api_url').'/me/messages', [
                'recipient' => ['id' => $psid],
                'sender_action' => $acao,
            ]);

        if ($resposta->successful()) {
            return true;
        }

        LogSistema::create([
            'account_id' => $accountId,
            'evento' => 'erro_indicador_digitacao',
            'descricao' => 'Graph API rejeitou '.$acao.': '.ResumoErroMeta::de($resposta),
        ]);

        return false;
    }
}
