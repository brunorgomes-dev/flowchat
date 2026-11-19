<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use Tests\TestCase;

/**
 * Garante que as rotas de produto apresentam o design V2 com dados reais.
 *
 * Extraído de `PreviewDesignV2Test` quando o preview e o legado foram
 * removidos na Fase 1 da refatoração.
 */
class DesignV2Test extends TestCase
{
    private User $cliente;

    protected function setUp(): void
    {
        parent::setUp();

        $this->cliente = User::factory()->create(['email' => 'cliente@example.test']);
    }

    public function test_rotas_normais_apresentam_o_design_v2_com_dados_reais(): void
    {
        $contato = $this->cliente->account->contatos()->create([
            'psid' => 'PSID-REAL-1',
            'nome' => 'Contato Real do Teste',
        ]);

        $this->actingAs($this->cliente)
            ->get('/painel')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('V2/Painel')
                ->where('contatos.0.nome', 'Contato Real do Teste'));

        $this->actingAs($this->cliente)
            ->get('/conversas')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('V2/Conversas')
                ->where('conversas.data.0.id', $contato->id));

        $this->actingAs($this->cliente)
            ->get('/fluxos')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->component('V2/Fluxos'));

        $this->actingAs($this->cliente)
            ->get('/agendamentos')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->component('V2/Agendamentos'));

        $this->actingAs($this->cliente)
            ->get('/configuracoes')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->component('V2/Configuracoes'));

        $this->actingAs($this->cliente)
            ->get('/configuracoes/conexao')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('V2/Conexao')
                ->has('messenger'));
    }

    public function test_carregamento_incremental_de_conversas_usa_cursor_e_escopo_da_conta(): void
    {
        $outraConta = Account::factory()->create();
        $outraConta->contatos()->create(['psid' => 'PSID-OUTRA-CONTA', 'nome' => 'Contato de outra conta']);

        foreach (range(1, 30) as $indice) {
            $this->cliente->account->contatos()->create([
                'psid' => 'PSID-MAIS-'.$indice,
                'nome' => 'Contato '.str_pad((string) $indice, 2, '0', STR_PAD_LEFT),
            ]);
        }

        $ultimoDaPrimeiraPagina = $this->cliente->account->contatos()->orderByDesc('id')->first();

        $this->actingAs($this->cliente)
            ->getJson('/conversas/mais?antes_id='.$ultimoDaPrimeiraPagina->id)
            ->assertOk()
            ->assertJsonCount(25, 'conversas')
            ->assertJsonPath('tem_mais', true)
            ->assertJsonMissing(['psid' => 'PSID-OUTRA-CONTA']);
    }
}
