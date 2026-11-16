<?php

namespace Tests\Feature;

use App\Jobs\EnviarEtapaFluxo;
use App\Jobs\ExecutarAgendamento;
use App\Jobs\ProcessarMensagemEntrante;
use App\Jobs\RegistrarOrigemContato;
use App\Models\Contato;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\LogSistema;
use App\Models\User;
use App\Support\RegistradorOrigemContato;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class IsolamentoContasTest extends TestCase
{
    public function test_conta_nao_acessa_conversa_historico_nem_responde_contato_de_outra_conta(): void
    {
        $utilizadorA = User::factory()->create();
        $contaB = User::factory()->create()->account;
        $contatoB = Contato::factory()->create(['account_id' => $contaB->id]);
        $contatoB->mensagens()->create(['direcao' => 'recebida', 'texto' => 'Mensagem privada']);

        Http::preventStrayRequests();
        Http::fake();

        $this->actingAs($utilizadorA)
            ->get('/conversas?contato='.$contatoB->id)
            ->assertNotFound();
        $this->actingAs($utilizadorA)
            ->get("/contatos/{$contatoB->id}/historico")
            ->assertNotFound();
        $this->actingAs($utilizadorA)
            ->post("/contatos/{$contatoB->id}/responder", ['texto' => 'Tentativa'])
            ->assertNotFound();

        Http::assertNothingSent();
        $this->assertDatabaseMissing('mensagens', ['texto' => 'Tentativa']);
    }

    public function test_resposta_manual_nao_registra_corpo_bruto_nem_token_da_meta(): void
    {
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $conta->messengerIntegration()->create(['page_id' => 'pagina_manual', 'page_access_token' => 'token-manual']);
        $contato = $conta->contatos()->create(['psid' => 'psid-manual']);

        Http::preventStrayRequests();
        Http::fake([
            'graph.facebook.com/*' => Http::response([
                'error' => [
                    'code' => 190,
                    'message' => 'Token inválido',
                    'debug_token' => 'SEGREDO_NAO_LOGAR',
                ],
            ], 400),
        ]);

        $this->actingAs($utilizador)
            ->post("/contatos/{$contato->id}/responder", ['texto' => 'Resposta manual'])
            ->assertSessionHasErrors('texto');

        $log = LogSistema::query()->where('evento', 'erro_envio')->firstOrFail();
        $this->assertStringContainsString('code=190', $log->descricao);
        $this->assertStringNotContainsString('SEGREDO_NAO_LOGAR', $log->descricao);
        $this->assertStringNotContainsString('token-manual', $log->descricao);
        $this->assertDatabaseMissing('mensagens', ['texto' => 'Resposta manual']);
    }

    public function test_conta_nao_executa_fluxo_de_outra_conta(): void
    {
        $utilizadorA = User::factory()->create();
        $contaB = User::factory()->create()->account;
        $fluxoB = Fluxo::factory()->create(['account_id' => $contaB->id, 'ativo' => true]);
        $contatoB = Contato::factory()->create(['account_id' => $contaB->id]);

        Queue::fake();

        $this->actingAs($utilizadorA)
            ->post('/execucoes/manuais', [
                'fluxo_id' => $fluxoB->id,
                'contato_id' => $contatoB->id,
            ])
            ->assertNotFound();

        $this->assertDatabaseMissing('execucoes_fluxo', ['account_id' => $contaB->id]);
        Queue::assertNothingPushed();
    }

    public function test_conta_nao_agenda_fluxo_de_outra_conta(): void
    {
        $utilizadorA = User::factory()->create();
        $utilizadorA->account->update(['timezone' => 'America/Sao_Paulo', 'timezone_confirmado' => true]);
        $contaB = User::factory()->create()->account;
        $fluxoB = Fluxo::factory()->create(['account_id' => $contaB->id, 'ativo' => true]);
        $contatoB = Contato::factory()->create(['account_id' => $contaB->id]);

        $this->actingAs($utilizadorA)
            ->post('/agendamentos', [
                'fluxo_id' => $fluxoB->id,
                'contato_id' => $contatoB->id,
                'executar_em' => now()->addHour()->format('Y-m-d H:i:s'),
            ])
            ->assertSessionHasErrors('fluxo_id');

        $this->assertDatabaseMissing('agendamentos', ['account_id' => $contaB->id]);
    }

    public function test_conta_nao_cancela_agendamento_de_outra_conta(): void
    {
        $utilizadorA = User::factory()->create();
        $contaB = User::factory()->create()->account;
        $fluxoB = Fluxo::factory()->create(['account_id' => $contaB->id, 'ativo' => true]);
        $contatoB = Contato::factory()->create(['account_id' => $contaB->id]);
        $agendamentoB = $contaB->agendamentos()->create([
            'fluxo_id' => $fluxoB->id,
            'contato_id' => $contatoB->id,
            'executar_em' => now()->addHour(),
            'estado' => 'pendente',
        ]);

        $this->actingAs($utilizadorA)
            ->post("/agendamentos/{$agendamentoB->id}/cancelar")
            ->assertRedirect();

        $this->assertSame('pendente', $agendamentoB->fresh()->estado);
    }

    public function test_agendamento_processado_duas_vezes_executa_uma_unica_vez(): void
    {
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $conta->messengerIntegration()->create(['page_id' => 'pagina_agenda', 'page_access_token' => 'token']);
        $fluxo = $conta->fluxos()->create(['nome' => 'Fluxo agendado', 'ativo' => true]);
        $fluxo->etapas()->create(['ordem' => 1, 'texto' => 'Mensagem', 'pausa_segundos' => 0]);
        $contato = $conta->contatos()->create(['psid' => 'psid-agenda']);
        $agendamento = $conta->agendamentos()->create([
            'fluxo_id' => $fluxo->id,
            'contato_id' => $contato->id,
            'executar_em' => now()->subMinute(),
            'estado' => 'pendente',
        ]);

        Queue::fake();

        (new ExecutarAgendamento($agendamento->id))->handle();
        (new ExecutarAgendamento($agendamento->id))->handle();

        $this->assertSame(1, ExecucaoFluxo::count());
        $this->assertSame('executado', $agendamento->fresh()->estado);
        Queue::assertPushed(EnviarEtapaFluxo::class, 1);
    }

    public function test_execucao_manual_nao_duplica_execucao_em_andamento(): void
    {
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;
        $fluxo = $conta->fluxos()->create(['nome' => 'Fluxo manual', 'ativo' => true]);
        $fluxo->etapas()->create(['ordem' => 1, 'texto' => 'Mensagem', 'pausa_segundos' => 0]);
        $contato = $conta->contatos()->create(['psid' => 'psid-manual']);

        Queue::fake();

        $this->actingAs($utilizador)
            ->post('/execucoes/manuais', [
                'fluxo_id' => $fluxo->id,
                'contato_id' => $contato->id,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->actingAs($utilizador)
            ->post('/execucoes/manuais', [
                'fluxo_id' => $fluxo->id,
                'contato_id' => $contato->id,
            ])
            ->assertSessionHasErrors('contato_id');

        $this->assertSame(1, ExecucaoFluxo::count());
        Queue::assertPushed(EnviarEtapaFluxo::class, 1);
    }

    public function test_enviar_etapa_fluxo_nao_envia_quando_fluxo_pertence_a_outra_conta(): void
    {
        $utilizadorA = User::factory()->create();
        $contaA = $utilizadorA->account;
        $contaA->messengerIntegration()->create([
            'page_id' => 'pagina_teste_a',
            'page_access_token' => 'token-teste-a',
        ]);
        $contaB = User::factory()->create()->account;
        $contaB->messengerIntegration()->create([
            'page_id' => 'pagina_teste_b',
            'page_access_token' => 'token-teste-b',
        ]);
        $fluxoB = Fluxo::factory()->create(['account_id' => $contaB->id, 'ativo' => true]);
        $fluxoB->etapas()->create(['ordem' => 1, 'texto' => 'Mensagem isolada', 'pausa_segundos' => 0]);
        $contatoA = $contaA->contatos()->create(['psid' => 'psid-fluxo-b-contato-a']);

        $execucao = $contaA->execucoes()->create([
            'contato_id' => $contatoA->id,
            'fluxo_id' => $fluxoB->id,
            'etapa_atual' => 1,
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'graph.facebook.com/*' => Http::response(['recipient_id' => 'fake-recipient'], 200),
        ]);
        Queue::fake();

        (new EnviarEtapaFluxo($execucao->id))->handle();

        Http::assertNothingSent();
        $this->assertDatabaseMissing('mensagens', ['contato_id' => $contatoA->id]);
        $this->assertDatabaseMissing('logs', ['account_id' => $contaA->id]);
        $this->assertDatabaseMissing('logs', ['account_id' => $contaB->id]);
        $this->assertNull($execucao->fresh()->concluida_em);
        $this->assertSame(1, $execucao->fresh()->etapa_atual);
        Queue::assertNothingPushed();
    }

    public function test_enviar_etapa_fluxo_nao_envia_quando_contato_pertence_a_outra_conta(): void
    {
        $utilizadorA = User::factory()->create();
        $contaA = $utilizadorA->account;
        $contaA->messengerIntegration()->create([
            'page_id' => 'pagina_teste_a',
            'page_access_token' => 'token-teste-a',
        ]);
        $contaB = User::factory()->create()->account;
        $contaB->messengerIntegration()->create([
            'page_id' => 'pagina_teste_b',
            'page_access_token' => 'token-teste-b',
        ]);
        $fluxoA = $contaA->fluxos()->create(['nome' => 'Fluxo isolado A', 'ativo' => true]);
        $fluxoA->etapas()->create(['ordem' => 1, 'texto' => 'Mensagem isolada', 'pausa_segundos' => 0]);
        $contatoB = Contato::factory()->create(['account_id' => $contaB->id]);

        $execucao = $contaA->execucoes()->create([
            'contato_id' => $contatoB->id,
            'fluxo_id' => $fluxoA->id,
            'etapa_atual' => 1,
        ]);

        Http::preventStrayRequests();
        Http::fake([
            'graph.facebook.com/*' => Http::response(['recipient_id' => 'fake-recipient'], 200),
        ]);
        Queue::fake();

        (new EnviarEtapaFluxo($execucao->id))->handle();

        Http::assertNothingSent();
        $this->assertDatabaseMissing('mensagens', ['contato_id' => $contatoB->id]);
        $this->assertDatabaseMissing('logs', ['account_id' => $contaA->id]);
        $this->assertDatabaseMissing('logs', ['account_id' => $contaB->id]);
        $this->assertNull($execucao->fresh()->concluida_em);
        $this->assertSame(1, $execucao->fresh()->etapa_atual);
        Queue::assertNothingPushed();
    }

    public function test_executar_agendamento_falha_quando_fluxo_pertence_a_outra_conta(): void
    {
        $utilizadorA = User::factory()->create();
        $contaA = $utilizadorA->account;
        $contaB = User::factory()->create()->account;
        $fluxoB = Fluxo::factory()->create(['account_id' => $contaB->id, 'ativo' => true]);
        $contatoA = $contaA->contatos()->create(['psid' => 'psid-agenda-fluxo-b']);

        $agendamento = $contaA->agendamentos()->create([
            'fluxo_id' => $fluxoB->id,
            'contato_id' => $contatoA->id,
            'executar_em' => now()->subMinute(),
            'estado' => 'pendente',
        ]);

        Queue::fake();

        (new ExecutarAgendamento($agendamento->id))->handle();

        $this->assertSame('falhou', $agendamento->fresh()->estado);
        $this->assertDatabaseMissing('execucoes_fluxo', ['account_id' => $contaA->id]);
        $this->assertDatabaseMissing('execucoes_fluxo', ['account_id' => $contaB->id]);
        Queue::assertNothingPushed();
    }

    public function test_executar_agendamento_falha_quando_contato_pertence_a_outra_conta(): void
    {
        $utilizadorA = User::factory()->create();
        $contaA = $utilizadorA->account;
        $contaB = User::factory()->create()->account;
        $fluxoA = $contaA->fluxos()->create(['nome' => 'Fluxo agendado A', 'ativo' => true]);
        $contatoB = Contato::factory()->create(['account_id' => $contaB->id]);

        $agendamento = $contaA->agendamentos()->create([
            'fluxo_id' => $fluxoA->id,
            'contato_id' => $contatoB->id,
            'executar_em' => now()->subMinute(),
            'estado' => 'pendente',
        ]);

        Queue::fake();

        (new ExecutarAgendamento($agendamento->id))->handle();

        $this->assertSame('falhou', $agendamento->fresh()->estado);
        $this->assertDatabaseMissing('execucoes_fluxo', ['account_id' => $contaA->id]);
        $this->assertDatabaseMissing('execucoes_fluxo', ['account_id' => $contaB->id]);
        Queue::assertNothingPushed();
    }

    public function test_processar_mensagem_entrante_usa_contato_da_conta_correta_quando_psid_existe_em_outra_conta(): void
    {
        $utilizadorA = User::factory()->create();
        $contaA = $utilizadorA->account;
        $contaA->messengerIntegration()->create([
            'page_id' => 'pagina_perfil_a',
            'page_access_token' => 'token-perfil-a',
        ]);
        $contaB = User::factory()->create()->account;
        $psid = 'psid-isolado-entrante';
        $contatoB = $contaB->contatos()->create(['psid' => $psid]);

        $fluxoB = $contaB->fluxos()->create(['nome' => 'Fluxo isolado B', 'ativo' => true]);
        $fluxoB->etapas()->create(['ordem' => 1, 'texto' => 'Etapa isolada', 'pausa_segundos' => 0]);
        $fluxoB->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);

        Http::preventStrayRequests();
        Http::fake([
            config('services.messenger.api_url').'/'.$psid.'*' => Http::response([
                'first_name' => 'Nome',
                'last_name' => 'Teste',
            ], 200),
        ]);
        Queue::fake();

        (new ProcessarMensagemEntrante($contaA->id, $psid, 'Olá'))->handle();

        $this->assertSame(2, Contato::count());
        $this->assertDatabaseMissing('execucoes_fluxo', ['account_id' => $contaA->id]);
        $this->assertDatabaseMissing('execucoes_fluxo', ['account_id' => $contaB->id]);
        Queue::assertNothingPushed();

        $contatoA = $contaA->contatos()->where('psid', $psid)->firstOrFail();
        $this->assertNotSame($contatoB->id, $contatoA->id);
        $this->assertSame('Nome Teste', $contatoA->fresh()->nome);
        $this->assertNull($contatoB->fresh()->nome);

        Http::assertSentCount(1);
        Http::assertSent(fn (ClientRequest $requisicao) => str_starts_with(
            $requisicao->url(),
            config('services.messenger.api_url').'/'.$psid,
        ) && str_contains($requisicao->url(), 'access_token=token-perfil-a'));

        $this->assertDatabaseHas('mensagens', [
            'contato_id' => $contatoA->id,
            'direcao' => 'recebida',
            'texto' => 'Olá',
        ]);
        $this->assertDatabaseMissing('mensagens', ['contato_id' => $contatoB->id]);
    }

    public function test_registrar_origem_contato_vincula_a_conta_correta_quando_psid_existe_em_outra_conta(): void
    {
        $utilizadorA = User::factory()->create();
        $contaA = $utilizadorA->account;
        $contaB = User::factory()->create()->account;
        $psid = 'psid-isolado-origem';
        $contatoB = $contaB->contatos()->create(['psid' => $psid, 'nome' => 'Contato B']);

        (new RegistrarOrigemContato(
            $contaA->id,
            $psid,
            ['source' => 'ADS', 'ad_id' => 'anuncio-123'],
            'referral',
            'Mensagem inicial'
        ))->handle(app(RegistradorOrigemContato::class));

        $this->assertSame(2, Contato::count());

        $contatoA = $contaA->contatos()->where('psid', $psid)->firstOrFail();
        $this->assertNotSame($contatoB->id, $contatoA->id);

        $this->assertDatabaseHas('origens_contato', [
            'account_id' => $contaA->id,
            'contato_id' => $contatoA->id,
            'evento' => 'referral',
            'categoria' => 'anuncio',
            'ad_id' => 'anuncio-123',
            'mensagem_inicial' => 'Mensagem inicial',
        ]);
        $this->assertDatabaseMissing('origens_contato', ['contato_id' => $contatoB->id]);

        $this->assertDatabaseHas('logs', [
            'account_id' => $contaA->id,
            'evento' => 'origem_contato_registrada',
        ]);
    }
}
