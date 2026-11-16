<?php

namespace Tests\Feature;

use App\Jobs\ProcessarMensagemEntrante;
use App\Models\Account;
use App\Models\Fluxo;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GerenciarFluxosTest extends TestCase
{
    private Account $conta;

    protected function setUp(): void
    {
        parent::setUp();
        $utilizador = User::factory()->create();
        $this->conta = $utilizador->account;
        $this->actingAs($utilizador);
    }

    public function test_pagina_lista_fluxos_com_etapas(): void
    {
        $fluxo = $this->conta->fluxos()->create(['nome' => 'Boas-vindas', 'ativo' => true]);
        $fluxo->etapas()->createMany([
            ['ordem' => 1, 'texto' => 'Olá', 'pausa_segundos' => 5],
            ['ordem' => 2, 'texto' => 'Tudo bem?', 'pausa_segundos' => 0],
        ]);

        $resposta = $this->get('/fluxos');

        $resposta->assertOk()->assertInertia(
            fn ($pagina) => $pagina
                ->component('V2/Fluxos')
                ->where('fluxos.0.nome', 'Boas-vindas')
                ->where('fluxos.0.etapas.0.texto', 'Olá')
                ->where('fluxos.0.etapas.1.pausa_segundos', 0)
        );
    }

    public function test_cria_fluxo_desativado(): void
    {
        $this->post('/fluxos', ['nome' => 'Promocional']);

        $this->assertDatabaseHas('fluxos', ['nome' => 'Promocional', 'ativo' => false]);
        $this->assertDatabaseCount('etapas_fluxo', 0);
    }

    public function test_edita_fluxo_substituindo_etapas(): void
    {
        $fluxo = $this->conta->fluxos()->create(['nome' => 'Teste', 'ativo' => true]);
        $fluxo->etapas()->createMany([
            ['ordem' => 1, 'texto' => 'Antiga', 'pausa_segundos' => 0],
        ]);

        $this->put("/fluxos/{$fluxo->id}", [
            'nome' => 'Renomeado',
            'ativo' => true,
            'etapas' => [
                ['texto' => 'Primeira', 'pausa_segundos' => 10],
                ['texto' => 'Segunda', 'pausa_segundos' => 0],
            ],
        ]);

        $this->assertDatabaseHas('fluxos', ['id' => $fluxo->id, 'nome' => 'Renomeado', 'ativo' => true]);
        $this->assertDatabaseMissing('etapas_fluxo', ['texto' => 'Antiga']);
        $this->assertDatabaseHas('etapas_fluxo', ['fluxo_id' => $fluxo->id, 'ordem' => 1, 'texto' => 'Primeira', 'pausa_segundos' => 10]);
        $this->assertDatabaseHas('etapas_fluxo', ['fluxo_id' => $fluxo->id, 'ordem' => 2, 'texto' => 'Segunda']);
    }

    public function test_desativa_fluxo_pelo_painel(): void
    {
        $fluxo = $this->conta->fluxos()->create(['nome' => 'Teste', 'ativo' => true]);

        $this->put("/fluxos/{$fluxo->id}", [
            'nome' => $fluxo->nome,
            'ativo' => false,
            'etapas' => [],
        ]);

        $this->assertDatabaseHas('fluxos', ['id' => $fluxo->id, 'ativo' => false]);
    }

    public function test_valida_dados_do_fluxo(): void
    {
        $this->post('/fluxos', ['nome' => ''])->assertSessionHasErrors('nome');

        $fluxo = $this->conta->fluxos()->create(['nome' => 'Teste', 'ativo' => true]);
        $this->put("/fluxos/{$fluxo->id}", [
            'nome' => 'Válido',
            'ativo' => true,
            'etapas' => [['texto' => '', 'pausa_segundos' => 0]],
        ])->assertSessionHasErrors('etapas.0.texto');
    }

    public function test_executor_usa_fluxo_ativo_configurado_no_painel(): void
    {
        Http::fake();

        $this->conta->messengerIntegration()->create(['page_id' => '1234567890', 'page_access_token' => 'token_teste']);
        $fluxo = $this->conta->fluxos()->create(['nome' => 'Configurado no painel', 'ativo' => true]);
        $fluxo->etapas()->createMany([
            ['ordem' => 1, 'texto' => 'Mensagem do painel', 'pausa_segundos' => 0],
        ]);
        $fluxo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);

        (new ProcessarMensagemEntrante($this->conta->id, '999', 'oi'))->handle();

        $this->assertDatabaseHas('mensagens', ['direcao' => 'enviada', 'texto' => 'Mensagem do painel']);
        $this->assertDatabaseHas('logs', [
            'evento' => 'fluxo_iniciado',
            'descricao' => 'PSID 999 iniciou o fluxo Configurado no painel',
        ]);
    }

    public function test_nao_exibe_ou_edita_fluxo_de_outra_conta(): void
    {
        $fluxoAlheio = Fluxo::factory()->create(['nome' => 'Privado']);

        $this->get('/fluxos')->assertOk()->assertInertia(fn ($pagina) => $pagina->missing('fluxos.0.nome'));
        $this->get("/fluxos/{$fluxoAlheio->id}/editar")->assertNotFound();
        $this->put("/fluxos/{$fluxoAlheio->id}", [
            'nome' => 'Alterado', 'ativo' => true, 'etapas' => [],
        ])->assertNotFound();
        $this->assertDatabaseHas('fluxos', ['id' => $fluxoAlheio->id, 'nome' => 'Privado']);
    }
}
