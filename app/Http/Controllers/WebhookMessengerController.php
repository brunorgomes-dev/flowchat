<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessarMensagemEntrante;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class WebhookMessengerController extends Controller
{
    /**
     * Verificação do webhook pelo Facebook (hub.challenge).
     */
    public function verificar(Request $request)
    {
        $modo = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $tokenConfigurado = config('services.messenger.verify_token');

        if ($modo === 'subscribe' && $tokenConfigurado !== null && $token === $tokenConfigurado) {
            return response($request->query('hub_challenge', ''));
        }

        abort(403);
    }

    /**
     * Recebimento de eventos do Messenger.
     */
    public function receber(Request $request)
    {
        foreach ($request->input('entry', []) as $entrada) {
            foreach ($entrada['messaging'] ?? [] as $evento) {
                if (! isset($evento['message'])) {
                    continue;
                }

                $mid = $evento['message']['mid'] ?? null;
                if (is_string($mid) && ! Cache::add('webhook:messenger:mid:'.$mid, true, now()->addDay())) {
                    continue;
                }

                ProcessarMensagemEntrante::dispatch(
                    $evento['sender']['id'],
                    $evento['message']['text'] ?? null
                );
            }
        }

        return response('EVENTO RECEBIDO', 200);
    }
}
