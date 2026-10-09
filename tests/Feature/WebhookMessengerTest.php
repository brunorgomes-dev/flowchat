<?php

namespace Tests\Feature;

use App\Jobs\ProcessarMensagemEntrante;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class WebhookMessengerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['services.messenger.verify_token' => 'token_verificacao']);
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

        $this->post('/webhook/messenger', [
            'entry' => [
                [
                    'messaging' => [
                        [
                            'sender' => ['id' => '12345'],
                            'message' => ['text' => 'Olá'],
                        ],
                    ],
                ],
            ],
        ])->assertOk();

        Queue::assertPushed(ProcessarMensagemEntrante::class, 1);
    }
}
