<?php

namespace Tests\Feature;

use App\Jobs\ProcessarMensagemEntrante;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\LogSistema;
use App\Models\Mensagem;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ExecucaoFluxoTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['services.messenger.page_access_token' => 'token_teste']);
    }

    public function test_fluxo_executa_ponta_a_ponta(): void
    {
        Http::fake();

        $fluxo = Fluxo::create(['nome' => 'Teste', 'ativo' => true]);
        $fluxo->etapas()->createMany([
            ['ordem' => 1, 'texto' => 'Primeira mensagem', 'pausa_segundos' => 5],
            ['ordem' => 2, 'texto' => 'Segunda mensagem', 'pausa_segundos' => 0],
        ]);

        (new ProcessarMensagemEntrante('12345', 'Olá'))->handle();

        // Contato identificado e salvo, mensagem recebida registrada
        $this->assertDatabaseHas('contatos', ['psid' => '12345']);
        $this->assertDatabaseHas('mensagens', ['direcao' => 'recebida', 'texto' => 'Olá']);

        // Duas mensagens enviadas pela Messenger Platform API
        $this->assertSame(2, Mensagem::where('direcao', 'enviada')->count());
        Http::assertSentCount(2);

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

        $fluxo = Fluxo::create(['nome' => 'Teste', 'ativo' => true]);
        $fluxo->etapas()->createMany([
            ['ordem' => 1, 'texto' => 'Primeira mensagem', 'pausa_segundos' => 0],
        ]);

        // Primeira execução: fluxo já concluído (uma etapa, queue sync)
        (new ProcessarMensagemEntrante('12345', 'Olá'))->handle();

        // Fluxo com duas etapas para a segunda parte do teste
        $fluxo->etapas()->create(['ordem' => 2, 'texto' => 'Segunda mensagem', 'pausa_segundos' => 0]);
        ExecucaoFluxo::first()->update(['concluida_em' => null, 'etapa_atual' => 1]);

        (new ProcessarMensagemEntrante('12345', 'De novo'))->handle();

        // Execução em andamento não gera segunda execução
        $this->assertSame(1, ExecucaoFluxo::where('contato_id', 1)->count());
    }

    public function test_api_rejeita_envio_registra_erro(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['error' => ['message' => 'token invalido']], 400),
        ]);

        $fluxo = Fluxo::create(['nome' => 'Teste', 'ativo' => true]);
        $fluxo->etapas()->create(['ordem' => 1, 'texto' => 'Primeira mensagem', 'pausa_segundos' => 0]);

        (new ProcessarMensagemEntrante('12345', 'Olá'))->handle();

        $this->assertSame(0, Mensagem::where('direcao', 'enviada')->count());
        $this->assertSame(1, LogSistema::where('evento', 'erro_envio')->count());
    }

    public function test_token_ausente_nao_envia_e_registra_erro(): void
    {
        config(['services.messenger.page_access_token' => null]);
        Http::fake();

        $fluxo = Fluxo::create(['nome' => 'Teste', 'ativo' => true]);
        $fluxo->etapas()->create(['ordem' => 1, 'texto' => 'Primeira mensagem', 'pausa_segundos' => 0]);

        (new ProcessarMensagemEntrante('12345', 'Olá'))->handle();

        Http::assertNothingSent();
        $this->assertSame(0, Mensagem::where('direcao', 'enviada')->count());
        $this->assertSame(1, LogSistema::where('evento', 'erro_envio')->count());
    }
}
