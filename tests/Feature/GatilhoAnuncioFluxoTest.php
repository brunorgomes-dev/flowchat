<?php

namespace Tests\Feature;

use App\Jobs\EnviarEtapaFluxo;
use App\Jobs\ProcessarMensagemEntrante;
use App\Jobs\RegistrarOrigemContato;
use App\Models\Account;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\User;
use App\Support\RegistradorOrigemContato;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GatilhoAnuncioFluxoTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.messenger.app_secret' => 'segredo_teste',
            'services.messenger.api_url' => 'https://graph.facebook.com/v23.0',
        ]);
    }

    public function test_primeira_mensagem_com_referral_inicia_fluxo_especifico_e_deduplica_evento(): void
    {
        Http::fake();
        $conta = User::factory()->create()->account;
        $conta->messengerIntegration()->create(['page_id' => 'pagina-anuncio', 'page_access_token' => 'token-teste']);

        $generico = $this->criarFluxo($conta, 'Genérico', null);
        $especifico = $this->criarFluxo($conta, 'Anúncio', 'ad-123');

        $payload = [
            'entry' => [[
                'id' => 'pagina-anuncio',
                'messaging' => [[
                    'sender' => ['id' => 'psid-anuncio'],
                    'timestamp' => now()->getTimestampMs(),
                    'referral' => [
                        'source' => 'ADS',
                        'ad_id' => 'ad-123',
                        'ads_context_data' => ['ad_title' => 'Campanha de teste'],
                    ],
                    'message' => ['mid' => 'mid-anuncio-1', 'text' => 'Olá'],
                ]],
            ]],
        ];
        $corpo = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $cabecalhos = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $corpo, 'segredo_teste'),
        ];

        $this->call('POST', '/webhook/messenger', [], [], [], $cabecalhos, $corpo)->assertOk();
        $this->call('POST', '/webhook/messenger', [], [], [], $cabecalhos, $corpo)->assertOk();

        $this->assertSame(1, ExecucaoFluxo::count());
        $this->assertSame($especifico->id, ExecucaoFluxo::firstOrFail()->fluxo_id);
        $this->assertDatabaseCount('origens_contato', 1);
        $origem = $conta->origensContato()->firstOrFail();
        $this->assertNotNull($origem->associada_em);
        $this->assertSame('ad-123', $origem->dados_brutos['ad_id'] ?? null);
        $this->assertNotSame($generico->id, ExecucaoFluxo::firstOrFail()->fluxo_id);
    }

    public function test_mensagem_sem_referral_usa_regra_generica_e_nao_a_regra_de_anuncio(): void
    {
        Http::fake();
        $conta = User::factory()->create()->account;
        $conta->messengerIntegration()->create(['page_id' => 'pagina-generica', 'page_access_token' => 'token-teste']);
        $generico = $this->criarFluxo($conta, 'Genérico', null);
        $this->criarFluxo($conta, 'Anúncio', 'ad-123');

        $payload = [
            'entry' => [[
                'id' => 'pagina-generica',
                'messaging' => [[
                    'sender' => ['id' => 'psid-generico'],
                    'timestamp' => now()->getTimestampMs(),
                    'message' => ['mid' => 'mid-generico-1', 'text' => 'Olá'],
                ]],
            ]],
        ];
        $corpo = json_encode($payload, JSON_UNESCAPED_SLASHES);

        $this->call('POST', '/webhook/messenger', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $corpo, 'segredo_teste'),
        ], $corpo)->assertOk();

        $this->assertSame($generico->id, ExecucaoFluxo::firstOrFail()->fluxo_id);
    }

    public function test_referral_em_postback_e_associado_a_mensagem_recebida_depois(): void
    {
        Http::fake();
        $conta = User::factory()->create()->account;
        $conta->messengerIntegration()->create(['page_id' => 'pagina-postback', 'page_access_token' => 'token-teste']);
        $especifico = $this->criarFluxo($conta, 'Anúncio', 'ad-postback');
        $timestamp = now()->getTimestampMs();

        $this->postWebhook([
            'entry' => [[
                'id' => 'pagina-postback',
                'messaging' => [[
                    'sender' => ['id' => 'psid-postback'],
                    'timestamp' => $timestamp,
                    'postback' => [
                        'title' => 'Começar',
                        'payload' => 'COMEÇAR',
                        'referral' => ['source' => 'ADS', 'ad_id' => 'ad-postback'],
                    ],
                ]],
            ]],
        ]);

        $this->assertDatabaseCount('origens_contato', 1);
        $this->assertSame(0, ExecucaoFluxo::count());

        $this->postWebhook([
            'entry' => [[
                'id' => 'pagina-postback',
                'messaging' => [[
                    'sender' => ['id' => 'psid-postback'],
                    'timestamp' => $timestamp + 1000,
                    'message' => ['mid' => 'mid-postback-1', 'text' => 'Olá'],
                ]],
            ]],
        ]);

        $this->assertSame($especifico->id, ExecucaoFluxo::firstOrFail()->fluxo_id);
        $this->assertNotNull($conta->origensContato()->firstOrFail()->associada_em);
    }

    public function test_contato_com_execucao_aberta_consume_o_referral_sem_criar_execucao_duplicada(): void
    {
        Http::fake();
        $conta = User::factory()->create()->account;
        $conta->messengerIntegration()->create(['page_id' => 'pagina-aberta', 'page_access_token' => 'token-teste']);
        $fluxo = $this->criarFluxo($conta, 'Anúncio', 'ad-123');
        $contato = $conta->contatos()->create([
            'psid' => 'psid-aberto',
            'ultima_mensagem_recebida_em' => now(),
        ]);
        ExecucaoFluxo::create([
            'account_id' => $conta->id,
            'contato_id' => $contato->id,
            'fluxo_id' => $fluxo->id,
            'etapa_atual' => 1,
        ]);

        (new RegistrarOrigemContato(
            $conta->id,
            $contato->psid,
            ['source' => 'ADS', 'ad_id' => 'ad-123'],
            'referral',
        ))->handle(app(RegistradorOrigemContato::class));
        (new ProcessarMensagemEntrante(
            $conta->id,
            $contato->psid,
            'Olá',
            now()->getTimestampMs(),
        ))->handle();

        $this->assertSame(1, ExecucaoFluxo::count());
        $this->assertNotNull($conta->origensContato()->firstOrFail()->associada_em);
    }

    public function test_janela_de_conversa_com_anuncio_pode_durar_sete_dias(): void
    {
        $inicio = Carbon::parse('2026-11-16 09:00:00');
        $this->travelTo($inicio);
        $conta = User::factory()->create()->account;
        $contato = $conta->contatos()->create([
            'psid' => 'psid-janela-anuncio',
            'ultima_mensagem_recebida_em' => $inicio,
        ]);
        $contato->origens()->create([
            'account_id' => $conta->id,
            'evento' => 'referral',
            'categoria' => 'anuncio',
            'ad_id' => 'ad-123',
            'associada_em' => $inicio,
        ]);

        $this->assertSame('2026-11-23 09:00:00', $contato->limiteDaJanelaDeMensagemLivre()?->format('Y-m-d H:i:s'));
        $this->travelTo($inicio->copy()->addDays(7));
        $this->assertTrue(now()->greaterThanOrEqualTo($contato->fresh()->limiteDaJanelaDeMensagemLivre()));
    }

    public function test_etapa_atrasada_apos_a_janela_da_meta_nao_e_enviada(): void
    {
        Http::fake();
        $inicio = Carbon::parse('2026-11-16 09:00:00');
        $this->travelTo($inicio->copy()->addDays(8));
        $conta = User::factory()->create()->account;
        $conta->messengerIntegration()->create(['page_id' => 'pagina-expirada', 'page_access_token' => 'token-teste']);
        $fluxo = $this->criarFluxo($conta, 'Anúncio', 'ad-123');
        $contato = $conta->contatos()->create([
            'psid' => 'psid-expirado',
            'ultima_mensagem_recebida_em' => $inicio,
        ]);
        $contato->origens()->create([
            'account_id' => $conta->id,
            'evento' => 'referral',
            'categoria' => 'anuncio',
            'ad_id' => 'ad-123',
            'associada_em' => $inicio,
        ]);
        $execucao = ExecucaoFluxo::create([
            'account_id' => $conta->id,
            'contato_id' => $contato->id,
            'fluxo_id' => $fluxo->id,
            'etapa_atual' => 1,
        ]);

        (new EnviarEtapaFluxo($execucao->id))->handle();

        Http::assertNothingSent();
        $this->assertNotNull($execucao->fresh()->concluida_em);
        $this->assertDatabaseHas('logs', ['account_id' => $conta->id, 'evento' => 'fluxo_falhou']);
    }

    private function criarFluxo(Account $conta, string $nome, ?string $adId): Fluxo
    {
        $fluxo = $conta->fluxos()->create(['nome' => $nome, 'ativo' => true]);
        $fluxo->etapas()->create(['ordem' => 1, 'texto' => 'Resposta', 'pausa_segundos' => 0]);
        $fluxo->regras()->create([
            'gatilho' => 'mensagem_recebida',
            'ativo' => true,
            'ad_id' => $adId,
        ]);

        return $fluxo;
    }

    /** @param array<string, mixed> $payload */
    private function postWebhook(array $payload): void
    {
        $corpo = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $this->call('POST', '/webhook/messenger', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $corpo, 'segredo_teste'),
        ], $corpo)->assertOk();
    }
}
