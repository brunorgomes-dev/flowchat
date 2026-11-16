<?php

namespace Tests\Feature;

use App\Jobs\ProcessarMensagemEntrante;
use App\Models\Account;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class WebhookMessengerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.messenger.verify_token' => 'token_verificacao',
            'services.messenger.app_secret' => 'segredo_teste',
        ]);
    }

    public function test_verificacao_aceita_token_correto(): void
    {
        $resposta = $this->get('/webhook/messenger?hub_mode=subscribe&hub_verify_token=token_verificacao&hub_challenge=desafio123');

        $resposta->assertOk();
        $this->assertSame('desafio123', $resposta->getContent());
    }

    public function test_verificacao_rejeita_token_errado(): void
    {
        $this->get('/webhook/messenger?hub_mode=subscribe&hub_verify_token=errado&hub_challenge=desafio123')
            ->assertForbidden();
    }

    public function test_recebimento_despacha_processamento_da_mensagem(): void
    {
        Queue::fake();
        $conta = Account::factory()->create();
        $conta->messengerIntegration()->create(['page_id' => 'pagina_1', 'page_access_token' => 'token_teste']);
        $payload = [
            'entry' => [
                [
                    'id' => 'pagina_1',
                    'messaging' => [
                        [
                            'sender' => ['id' => '12345'],
                            'message' => ['mid' => 'mensagem_1', 'text' => 'Olá'],
                        ],
                    ],
                ],
            ],
        ];
        $corpo = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $assinatura = 'sha256='.hash_hmac('sha256', $corpo, 'segredo_teste');

        $this->call('POST', '/webhook/messenger', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $assinatura,
        ], $corpo)->assertOk();

        Queue::assertPushed(ProcessarMensagemEntrante::class, fn ($job) => $job->accountId === $conta->id);
    }

    public function test_recebimento_registra_estrutura_ao_despachar_mensagem(): void
    {
        Queue::fake();
        Log::spy();
        $conta = Account::factory()->create();
        $conta->messengerIntegration()->create(['page_id' => 'pagina_1', 'page_access_token' => 'token_teste']);
        $payload = [
            'entry' => [
                [
                    'id' => 'pagina_1',
                    'messaging' => [
                        [
                            'sender' => ['id' => '12345'],
                            'message' => ['mid' => 'mensagem_1', 'text' => 'Olá'],
                        ],
                    ],
                ],
            ],
        ];
        $corpo = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $assinatura = 'sha256='.hash_hmac('sha256', $corpo, 'segredo_teste');

        $this->call('POST', '/webhook/messenger', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $assinatura,
        ], $corpo)->assertOk();

        Log::shouldHaveReceived('info')->withArgs(
            fn (string $mensagem, array $contexto = []): bool => $mensagem === 'Webhook Messenger: estrutura da entrada recebida.'
                && $contexto['page_id'] === 'pagina_1'
                && $contexto['integracao_encontrada'] === true
                && $contexto['campos'] === ['messaging' => [['sender', 'message']]]
        );
        Log::shouldHaveReceived('info')->withArgs(
            fn (string $mensagem, array $contexto = []): bool => $mensagem === 'Webhook Messenger: mensagem despachada para processamento.'
                && $contexto['page_id'] === 'pagina_1'
        );
    }

    public function test_recebimento_ignora_evento_sem_mensagem_e_registra_estrutura(): void
    {
        Queue::fake();
        Log::spy();
        $conta = Account::factory()->create();
        $conta->messengerIntegration()->create(['page_id' => 'pagina_leitura', 'page_access_token' => 'token_teste']);
        $payload = [
            'entry' => [
                [
                    'id' => 'pagina_leitura',
                    'messaging' => [
                        [
                            'sender' => ['id' => '12345'],
                            'read' => ['watermark' => 1234567890, 'seq' => 0],
                        ],
                    ],
                ],
            ],
        ];
        $corpo = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $assinatura = 'sha256='.hash_hmac('sha256', $corpo, 'segredo_teste');

        $this->call('POST', '/webhook/messenger', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $assinatura,
        ], $corpo)->assertOk();

        Queue::assertNothingPushed();
        Log::shouldHaveReceived('info')->withArgs(
            fn (string $mensagem, array $contexto = []): bool => $mensagem === 'Webhook Messenger: estrutura da entrada recebida.'
                && $contexto['page_id'] === 'pagina_leitura'
                && $contexto['integracao_encontrada'] === true
                && $contexto['campos'] === ['messaging' => [['sender', 'read']]]
        );
    }

    public function test_recebimento_ignora_mensagem_repetida_do_mesmo_mid(): void
    {
        Queue::fake();
        $conta = Account::factory()->create();
        $conta->messengerIntegration()->create(['page_id' => 'pagina_repetida', 'page_access_token' => 'token_teste']);
        $payload = [
            'entry' => [
                [
                    'id' => 'pagina_repetida',
                    'messaging' => [
                        [
                            'sender' => ['id' => '12345'],
                            'message' => ['mid' => 'mensagem_repetida', 'text' => 'Olá'],
                        ],
                    ],
                ],
            ],
        ];
        $corpo = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $assinatura = 'sha256='.hash_hmac('sha256', $corpo, 'segredo_teste');
        $cabecalhos = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $assinatura,
        ];

        $this->call('POST', '/webhook/messenger', [], [], [], $cabecalhos, $corpo)->assertOk();
        $this->call('POST', '/webhook/messenger', [], [], [], $cabecalhos, $corpo)->assertOk();

        Queue::assertPushed(ProcessarMensagemEntrante::class, 1);
    }
}
