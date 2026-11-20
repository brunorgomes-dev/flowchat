<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessarMensagemEntrante;
use App\Jobs\RegistrarOrigemContato;
use App\Models\MessengerIntegration;
use App\Support\TimestampEventoMeta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

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

        // Comparação em tempo constante: evita descobrir o token por diferença
        // de tempo entre as respostas.
        if ($modo === 'subscribe' && is_string($tokenConfigurado) && $tokenConfigurado !== ''
            && is_string($token) && hash_equals($tokenConfigurado, $token)) {
            return response($request->query('hub_challenge', ''));
        }

        abort(403);
    }

    /**
     * Recebimento de eventos do Messenger.
     */
    public function receber(Request $request)
    {
        $segredo = config('services.messenger.app_secret');
        $assinatura = $request->header('X-Hub-Signature-256');
        if (! is_string($segredo) || $segredo === '' || ! is_string($assinatura)
            || ! hash_equals('sha256='.hash_hmac('sha256', $request->getContent(), $segredo), $assinatura)) {
            abort(403);
        }

        foreach ($request->input('entry', []) as $entrada) {
            $pageId = (string) ($entrada['id'] ?? '');
            $integracao = MessengerIntegration::where('page_id', $pageId)->first();

            // Diagnóstico temporário: registra apenas a estrutura (campos e
            // chaves de cada evento), nunca o conteúdo das mensagens.
            Log::info('Webhook Messenger: estrutura da entrada recebida.', [
                'page_id' => $pageId,
                'integracao_encontrada' => $integracao !== null,
                'campos' => collect($entrada)
                    ->filter(fn ($valor, $campo) => $campo !== 'id' && is_array($valor))
                    ->mapWithKeys(fn ($valor, $campo) => [
                        $campo => array_map(
                            static fn (array $evento): array => array_keys($evento),
                            array_values(array_filter($valor, 'is_array')),
                        ),
                    ])
                    ->all(),
            ]);

            if ($integracao === null) {
                Log::warning('Webhook Messenger recebido para Página sem integração FlowChat.', ['page_id' => $pageId]);

                continue;
            }

            if ($integracao->account?->estaSuspensa()) {
                Log::info('Webhook Messenger ignorado para conta suspensa.', ['page_id' => $pageId]);

                continue;
            }

            foreach ($entrada['messaging'] ?? [] as $evento) {
                $psid = $evento['sender']['id'] ?? null;
                if (! is_string($psid) || $psid === '') {
                    continue;
                }

                $mensagem = is_array($evento['message'] ?? null) ? $evento['message'] : null;

                // Eco é uma mensagem enviada pela própria Página, nunca uma
                // mensagem recebida: descarta antes da origem, da
                // deduplicação e do despacho.
                if (($mensagem['is_echo'] ?? false) === true) {
                    continue;
                }

                $referral = $this->extrairReferral($evento);

                // Origens de anúncio chegam em eventos próprios (`referral`) ou
                // no referral de um postback, inclusive sem mensagem de texto.
                if ($referral !== null) {
                    $chaveOrigem = 'webhook:messenger:page:'.$pageId.':origem:'.sha1(json_encode([
                        $psid,
                        $evento['timestamp'] ?? null,
                        $referral['dados'],
                    ]));

                    if (Cache::add($chaveOrigem, true, now()->addDay())) {
                        RegistrarOrigemContato::dispatch(
                            $integracao->account_id,
                            $psid,
                            $referral['dados'],
                            $referral['evento'],
                            is_string($mensagem['text'] ?? null) ? $mensagem['text'] : null,
                        );
                    }
                }

                if ($mensagem === null) {
                    continue;
                }

                $mid = $mensagem['mid'] ?? null;
                if (is_string($mid) && ! Cache::add('webhook:messenger:page:'.$pageId.':mid:'.$mid, true, now()->addDay())) {
                    continue;
                }

                ProcessarMensagemEntrante::dispatch(
                    $integracao->account_id,
                    $psid,
                    is_string($mensagem['text'] ?? null) ? $mensagem['text'] : null,
                    TimestampEventoMeta::normalizar($evento['timestamp'] ?? null),
                );

                Log::info('Webhook Messenger: mensagem despachada para processamento.', ['page_id' => $pageId]);
            }
        }

        return response('EVENTO RECEBIDO', 200);
    }

    /**
     * Extrai o referral dos formatos documentados pela Meta: evento
     * `messaging_referrals` (topo) e `messaging_postbacks` (dentro de
     * `postback`). Devolve null quando o evento não traz uma referência.
     *
     * @param  array<string, mixed>  $evento
     * @return array{dados: array<string, mixed>, evento: string}|null
     */
    private function extrairReferral(array $evento): ?array
    {
        if (is_array($evento['referral'] ?? null)) {
            return ['dados' => $evento['referral'], 'evento' => 'referral'];
        }

        if (is_array($evento['postback']['referral'] ?? null)) {
            return ['dados' => $evento['postback']['referral'], 'evento' => 'postback'];
        }

        return null;
    }
}
