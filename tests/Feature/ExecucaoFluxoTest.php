<?php

namespace Tests\Feature;

use App\Jobs\EnviarEtapaFluxo;
use App\Jobs\ProcessarMensagemEntrante;
use App\Models\Account;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\LogSistema;
use App\Models\Mensagem;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ExecucaoFluxoTest extends TestCase
{
    private Account $conta;

    protected function setUp(): void
    {
        parent::setUp();
        $this->conta = Account::factory()->create();
        $this->conta->messengerIntegration()->create(['page_id' => fake()->unique()->numerify('##########'), 'page_access_token' => 'token_teste']);
    }

    public function test_fluxo_executa_ponta_a_ponta(): void
    {
        Http::fake();

        $fluxo = $this->conta->fluxos()->create(['nome' => 'Teste', 'ativo' => true]);
        $fluxo->etapas()->createMany([
            ['ordem' => 1, 'texto' => 'Primeira mensagem', 'pausa_segundos' => 5],
            ['ordem' => 2, 'texto' => 'Segunda mensagem', 'pausa_segundos' => 0],
        ]);
        $fluxo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);

        (new ProcessarMensagemEntrante($this->conta->id, '12345', 'Olá', now()->getTimestampMs()))->handle();

        // Contato identificado e salvo, mensagem recebida registrada
        $this->assertDatabaseHas('contatos', ['psid' => '12345']);
        $this->assertDatabaseHas('mensagens', ['direcao' => 'recebida', 'texto' => 'Olá']);

        // Duas mensagens enviadas pela Messenger Platform API
        $this->assertSame(2, Mensagem::where('direcao', 'enviada')->count());
        Http::assertSentCount(3);

        // Execução concluída após a última etapa
        $execucao = ExecucaoFluxo::first();
        $this->assertNotNull($execucao->concluida_em);
        $this->assertSame(3, $execucao->etapa_atual);

        // Logs registrados
        $this->assertSame(1, LogSistema::where('evento', 'fluxo_iniciado')->count());
        $this->assertSame(2, LogSistema::where('evento', 'mensagem_enviada')->count());
        $this->assertSame(1, LogSistema::where('evento', 'fluxo_concluido')->count());
    }

    public function test_mensagem_repetida_nao_reinicia_fluxo_em_andamento(): void
    {
        Http::fake();

        $fluxo = $this->conta->fluxos()->create(['nome' => 'Teste', 'ativo' => true]);
        $fluxo->etapas()->createMany([
            ['ordem' => 1, 'texto' => 'Primeira mensagem', 'pausa_segundos' => 0],
        ]);
        $fluxo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);

        // Primeira execução: fluxo já concluído (uma etapa, queue sync)
        (new ProcessarMensagemEntrante($this->conta->id, '12345', 'Olá', now()->getTimestampMs()))->handle();

        // Fluxo com duas etapas para a segunda parte do teste
        $fluxo->etapas()->create(['ordem' => 2, 'texto' => 'Segunda mensagem', 'pausa_segundos' => 0]);
        ExecucaoFluxo::first()->update(['concluida_em' => null, 'etapa_atual' => 1]);

        (new ProcessarMensagemEntrante($this->conta->id, '12345', 'De novo', now()->getTimestampMs()))->handle();

        // Execução em andamento não gera segunda execução
        $this->assertSame(1, ExecucaoFluxo::where('contato_id', 1)->count());
    }

    public function test_somente_o_fluxo_ativo_mais_antigo_inicia_no_mesmo_gatilho(): void
    {
        Http::fake();

        $antigo = $this->conta->fluxos()->create(['nome' => 'Antigo', 'ativo' => true]);
        $antigo->etapas()->create(['ordem' => 1, 'texto' => 'Mensagem do fluxo antigo', 'pausa_segundos' => 0]);
        $antigo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);

        $novo = $this->conta->fluxos()->create(['nome' => 'Novo', 'ativo' => true]);
        $novo->etapas()->create(['ordem' => 1, 'texto' => 'Mensagem do fluxo novo', 'pausa_segundos' => 0]);
        $novo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);

        (new ProcessarMensagemEntrante($this->conta->id, '12345', 'Olá', now()->getTimestampMs()))->handle();

        $this->assertSame(1, ExecucaoFluxo::count());
        $this->assertSame($antigo->id, ExecucaoFluxo::first()->fluxo_id);
        $this->assertSame(1, Mensagem::where('direcao', 'enviada')->where('texto', 'Mensagem do fluxo antigo')->count());
        $this->assertSame(0, Mensagem::where('direcao', 'enviada')->where('texto', 'Mensagem do fluxo novo')->count());
        $this->assertSame(1, LogSistema::where('evento', 'fluxo_iniciado')->count());
    }

    public function test_envio_usa_uma_tentativa_e_termina_antes_do_timeout_do_worker(): void
    {
        $job = new EnviarEtapaFluxo(1);

        $this->assertSame(1, $job->tries);
        $this->assertSame(80, $job->timeout);
        $this->assertLessThan(90, $job->timeout);
    }

    public function test_job_nao_reenvia_execucao_ja_concluida(): void
    {
        Http::fake();

        $contato = $this->conta->contatos()->create(['psid' => '12345']);
        $fluxo = $this->conta->fluxos()->create(['nome' => 'Teste', 'ativo' => true]);
        $execucao = $this->conta->execucoes()->create([
            'contato_id' => $contato->id,
            'fluxo_id' => $fluxo->id,
            'etapa_atual' => 1,
            'concluida_em' => now(),
        ]);

        (new EnviarEtapaFluxo($execucao->id))->handle();

        Http::assertNothingSent();
        $this->assertSame(0, Mensagem::count());
    }

    public function test_api_rejeita_envio_registra_erro(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['error' => ['message' => 'token invalido']], 400),
        ]);

        $fluxo = $this->conta->fluxos()->create(['nome' => 'Teste', 'ativo' => true]);
        $fluxo->etapas()->create(['ordem' => 1, 'texto' => 'Primeira mensagem', 'pausa_segundos' => 0]);
        $fluxo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);

        (new ProcessarMensagemEntrante($this->conta->id, '12345', 'Olá', now()->getTimestampMs()))->handle();

        $this->assertSame(0, Mensagem::where('direcao', 'enviada')->count());
        $this->assertSame(1, LogSistema::where('evento', 'erro_envio')->count());
    }

    public function test_logs_nao_guardam_texto_da_conversa_nem_campos_sensiveis_da_meta(): void
    {
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

        $fluxo = $this->conta->fluxos()->create(['nome' => 'Teste', 'ativo' => true]);
        $fluxo->etapas()->create(['ordem' => 1, 'texto' => 'Resposta do fluxo', 'pausa_segundos' => 0]);
        $fluxo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);

        $textoRecebido = 'Conteúdo confidencial recebido do contato';
        (new ProcessarMensagemEntrante($this->conta->id, '12345', $textoRecebido, now()->getTimestampMs()))->handle();

        foreach (LogSistema::all() as $log) {
            $this->assertStringNotContainsString($textoRecebido, $log->descricao);
            $this->assertStringNotContainsString('SEGREDO_NAO_LOGAR', $log->descricao);
        }

        $this->assertDatabaseHas('logs', ['evento' => 'mensagem_recebida']);
        $this->assertDatabaseHas('logs', ['evento' => 'erro_envio']);
    }

    public function test_token_ausente_nao_envia_e_registra_erro(): void
    {
        $this->conta->messengerIntegration()->delete();
        Http::fake();

        $fluxo = $this->conta->fluxos()->create(['nome' => 'Teste', 'ativo' => true]);
        $fluxo->etapas()->create(['ordem' => 1, 'texto' => 'Primeira mensagem', 'pausa_segundos' => 0]);
        $fluxo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);

        (new ProcessarMensagemEntrante($this->conta->id, '12345', 'Olá', now()->getTimestampMs()))->handle();

        Http::assertNothingSent();
        $this->assertSame(0, Mensagem::where('direcao', 'enviada')->count());
        $this->assertSame(1, LogSistema::where('evento', 'erro_envio')->count());
    }
}
