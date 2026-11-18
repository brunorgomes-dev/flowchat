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

    public function test_cria_fluxo_ativo_por_padrao(): void
    {
        $this->post('/fluxos', ['nome' => 'Promocional']);

        $this->assertDatabaseHas('fluxos', ['nome' => 'Promocional', 'ativo' => true]);
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

    public function test_salva_janela_de_horario_enviada_como_formulario(): void
    {
        $this->conta->update(['timezone' => 'America/Sao_Paulo', 'timezone_confirmado' => true]);

        $this->post('/fluxos', [
            'nome' => 'Fora do horário',
            'ativo' => '1',
            'etapas' => [
                ['texto' => 'Olá', 'pausa_segundos' => 0],
            ],
            'horario' => [
                'ativo' => '1',
                'inicio' => '08:00',
                'fim' => '18:00',
                'fora_horario' => 'aguardar',
            ],
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseHas('fluxos', [
            'nome' => 'Fora do horário',
            'ativo' => true,
            'horario_inicio_ativo' => true,
            'horario_inicio' => '08:00',
            'horario_fim' => '18:00',
            'fora_horario' => 'aguardar',
        ]);
    }

    public function test_atualiza_janela_de_horario_recebida_como_formulario(): void
    {
        $this->conta->update(['timezone' => 'America/Sao_Paulo', 'timezone_confirmado' => true]);

        $fluxo = $this->conta->fluxos()->create([
            'nome' => 'Plantão',
            'ativo' => true,
            'horario_inicio_ativo' => true,
            'horario_inicio' => '07:00',
            'horario_fim' => '13:00',
            'fora_horario' => 'nao_iniciar',
        ]);

        $this->put("/fluxos/{$fluxo->id}", [
            'nome' => 'Plantão',
            'ativo' => '1',
            'etapas' => [],
            'horario' => [
                'ativo' => '1',
                'inicio' => '09:00',
                'fim' => '19:00',
                'fora_horario' => 'aguardar',
            ],
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseHas('fluxos', [
            'id' => $fluxo->id,
            'horario_inicio_ativo' => true,
            'horario_inicio' => '09:00',
            'horario_fim' => '19:00',
            'fora_horario' => 'aguardar',
        ]);
    }

    public function test_reordena_etapas_identificadas_preservando_destinos_de_condicao(): void
    {
        $fluxo = $this->conta->fluxos()->create(['nome' => 'Fluxo com condição', 'ativo' => true]);
        $etapaCondicao = $fluxo->etapas()->create([
            'ordem' => 1,
            'tipo' => 'condicao_horario',
            'texto' => '',
            'pausa_segundos' => 0,
            'destino_nao_ordem' => 4,
        ]);
        $etapaA = $fluxo->etapas()->create([
            'ordem' => 2,
            'tipo' => 'mensagem',
            'texto' => 'Etapa A',
            'pausa_segundos' => 0,
        ]);
        $etapaB = $fluxo->etapas()->create([
            'ordem' => 3,
            'tipo' => 'mensagem',
            'texto' => 'Etapa B',
            'pausa_segundos' => 0,
        ]);
        $etapaD = $fluxo->etapas()->create([
            'ordem' => 4,
            'tipo' => 'mensagem',
            'texto' => 'Etapa D',
            'pausa_segundos' => 0,
        ]);
        $etapaCondicao->condicoes()->create([
            'ordem' => 1,
            'inicio' => '08:00',
            'fim' => '12:00',
            'destino_ordem' => 3,
        ]);

        $this->put("/fluxos/{$fluxo->id}", [
            'nome' => $fluxo->nome,
            'ativo' => true,
            'etapas' => [
                $this->dadosEtapaIdentificada($etapaA->id, ['texto' => 'Etapa A']),
                $this->dadosEtapaIdentificada($etapaCondicao->id, [
                    'tipo' => 'condicao_horario',
                    'texto' => '',
                    'condicoes' => [[
                        'inicio' => '08:00',
                        'fim' => '12:00',
                        'destino_ordem' => 4,
                    ]],
                    'destino_nao_ordem' => 3,
                ]),
                $this->dadosEtapaIdentificada($etapaD->id, ['texto' => 'Etapa D']),
                $this->dadosEtapaIdentificada($etapaB->id, ['texto' => 'Etapa B']),
            ],
        ])->assertSessionHasNoErrors()->assertRedirect();

        $etapasReordenadas = $fluxo->etapas()->orderBy('ordem')->get();
        $etapaCondicaoAtualizada = $fluxo->etapas()->findOrFail($etapaCondicao->id);

        $this->assertSame(
            [(int) $etapaA->id, (int) $etapaCondicao->id, (int) $etapaD->id, (int) $etapaB->id],
            $etapasReordenadas->map(fn ($etapa): int => (int) $etapa->id)->all(),
        );
        $this->assertSame(2, (int) $etapaCondicaoAtualizada->ordem);
        $this->assertSame(3, (int) $etapaCondicaoAtualizada->destino_nao_ordem);
        $this->assertSame(4, (int) $etapaCondicaoAtualizada->condicoes()->firstOrFail()->destino_ordem);
    }

    public function test_rejeita_id_de_etapa_que_nao_pertence_ao_fluxo_atual(): void
    {
        $fluxo = $this->conta->fluxos()->create(['nome' => 'Fluxo atual', 'ativo' => true]);
        $etapaAtual = $fluxo->etapas()->create([
            'ordem' => 1,
            'texto' => 'Não alterar',
            'pausa_segundos' => 0,
        ]);
        $outroFluxo = $this->conta->fluxos()->create(['nome' => 'Outro fluxo', 'ativo' => true]);
        $etapaDeOutroFluxo = $outroFluxo->etapas()->create([
            'ordem' => 1,
            'texto' => 'Pertence a outro fluxo',
            'pausa_segundos' => 0,
        ]);

        $this->put("/fluxos/{$fluxo->id}", [
            'nome' => $fluxo->nome,
            'ativo' => true,
            'etapas' => [
                $this->dadosEtapaIdentificada($etapaDeOutroFluxo->id, ['texto' => 'Tentativa inválida']),
            ],
        ])->assertSessionHasErrors('etapas.0.id');

        $this->assertDatabaseHas('etapas_fluxo', [
            'id' => $etapaAtual->id,
            'fluxo_id' => $fluxo->id,
            'texto' => 'Não alterar',
            'ordem' => 1,
        ]);
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

    /**
     * @param  array<string, mixed>  $atributos
     * @return array<string, mixed>
     */
    private function dadosEtapaIdentificada(int $id, array $atributos = []): array
    {
        return [
            'id' => $id,
            'tipo' => 'mensagem',
            'tipo_conteudo' => 'texto',
            'texto' => 'Etapa',
            'anexo' => null,
            'remover_anexo' => false,
            'pausa_segundos' => 0,
            'indicador_digitacao_ativo' => false,
            'indicador_digitacao_segundos' => 2,
            'condicoes' => [],
            'destino_nao_ordem' => null,
            'encerra_apos' => false,
            ...$atributos,
        ];
    }
}
