<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use Tests\TestCase;

class PreviewDesignV2Test extends TestCase
{
    private const TELAS = [
        '/preview/design-v2' => 'Preview/DesignV2/Mapa',
        '/preview/design-v2/painel' => 'Preview/DesignV2/Painel',
        '/preview/design-v2/conversas' => 'Preview/DesignV2/Conversas',
        '/preview/design-v2/conversas/historico' => 'Preview/DesignV2/HistoricoContato',
        '/preview/design-v2/fluxos' => 'Preview/DesignV2/Fluxos',
        '/preview/design-v2/fluxos/editor' => 'Preview/DesignV2/EditorFluxo',
        '/preview/design-v2/agendamentos' => 'Preview/DesignV2/Agendamentos',
        '/preview/design-v2/configuracoes' => 'Preview/DesignV2/Configuracoes',
        '/preview/design-v2/messenger/paginas' => 'Preview/DesignV2/SelecionarPagina',
        '/preview/design-v2/entrar' => 'Preview/DesignV2/Login',
        '/preview/design-v2/cadastro' => 'Preview/DesignV2/Cadastro',
        '/preview/design-v2/sessoes' => 'Preview/DesignV2/SessoesLogin',
        '/preview/design-v2/conta-suspensa' => 'Preview/DesignV2/ContaSuspensa',
    ];

    private const TELAS_ADMINISTRATIVAS = [
        '/preview/design-v2/admin/contas' => 'Preview/DesignV2/AdminContas',
        '/preview/design-v2/admin/convites' => 'Preview/DesignV2/AdminConvites',
    ];

    private User $cliente;

    private User $administrador;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'flowchat.administradores_plataforma' => ['admin@example.test'],
        ]);

        $this->cliente = User::factory()->create(['email' => 'cliente@example.test']);
        $this->administrador = User::factory()->create(['email' => 'admin@example.test']);
    }

    public function test_preview_fica_desativada_por_padrao_fora_do_ambiente_local(): void
    {
        config(['flowchat.preview_design_v2' => null]);

        $this->assertSame('testing', app()->environment());

        $this->actingAs($this->cliente)
            ->get('/preview/design-v2/painel')
            ->assertNotFound();

        $this->actingAs($this->administrador)
            ->get('/preview/design-v2')
            ->assertNotFound();
    }

    public function test_preview_pode_ser_desativada_explicitamente_mesmo_no_ambiente_local(): void
    {
        config(['flowchat.preview_design_v2' => false]);

        $this->actingAs($this->cliente)
            ->get('/preview/design-v2/conversas')
            ->assertNotFound();
    }

    public function test_preview_habilitada_renderiza_todas_as_telas_principais(): void
    {
        config(['flowchat.preview_design_v2' => true]);

        foreach (self::TELAS as $rota => $componente) {
            $this->actingAs($this->cliente)
                ->get($rota)
                ->assertOk()
                ->assertInertia(fn ($pagina) => $pagina->component($componente));
        }
    }

    public function test_telas_administrativas_exigem_autorizacao_de_administrador(): void
    {
        config(['flowchat.preview_design_v2' => true]);

        foreach (array_keys(self::TELAS_ADMINISTRATIVAS) as $rota) {
            $this->actingAs($this->cliente)
                ->get($rota)
                ->assertNotFound();

            $this->actingAs($this->administrador)
                ->get($rota)
                ->assertOk()
                ->assertInertia(fn ($pagina) => $pagina->component(self::TELAS_ADMINISTRATIVAS[$rota]));
        }
    }

    public function test_preview_exige_sessao_autenticada(): void
    {
        config(['flowchat.preview_design_v2' => true]);

        $this->get('/preview/design-v2/painel')->assertRedirect('/login');
        $this->get('/preview/design-v2/admin/convites')->assertRedirect('/login');
    }

    public function test_conta_suspensa_nao_acessa_o_preview(): void
    {
        config(['flowchat.preview_design_v2' => true]);

        $conta = Account::factory()->create(['suspensa' => true]);
        $suspenso = User::factory()->create([
            'account_id' => $conta->id,
            'email' => 'suspenso@example.test',
        ]);

        $this->actingAs($suspenso)
            ->get('/preview/design-v2/painel')
            ->assertRedirect(route('conta.suspensa'));
    }

    public function test_preview_nao_expoe_rotas_de_escrita(): void
    {
        config(['flowchat.preview_design_v2' => true]);

        foreach (['/preview/design-v2/painel', '/preview/design-v2/agendamentos', '/preview/design-v2/admin/convites'] as $rota) {
            $this->actingAs($this->administrador)
                ->post($rota)
                ->assertStatus(405);
        }
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

    public function test_area_de_legado_preserva_as_paginas_antigas(): void
    {
        $this->actingAs($this->cliente)
            ->get('/legado/painel')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->component('PaginaInicial'));

        $this->actingAs($this->cliente)
            ->get('/legado/conversas')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->component('Conversas'));

        $this->actingAs($this->cliente)
            ->get('/legado/fluxos')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->component('Fluxos'));

        $this->actingAs($this->cliente)
            ->get('/legado/agendamentos')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->component('Agendamentos'));

        $this->actingAs($this->cliente)
            ->get('/legado/configuracoes')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->component('Configuracoes'));
    }

    public function test_legado_exige_autenticacao(): void
    {
        $this->get('/legado/painel')->assertRedirect('/login');
        $this->get('/legado/admin/convites')->assertRedirect('/login');
    }

    public function test_legado_administrativo_exige_administrador(): void
    {
        $this->actingAs($this->cliente)
            ->get('/legado/admin/convites')
            ->assertNotFound();

        $this->actingAs($this->administrador)
            ->get('/legado/admin/convites')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->component('AdminConvites'));
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

    public function test_rotas_de_preview_nao_alteram_as_rotas_de_produto(): void
    {
        $rotas = collect(app('router')->getRoutes()->getRoutes())
            ->map(fn ($rota) => $rota->uri())
            ->all();

        $this->assertContains('preview/design-v2/painel', $rotas);
        $this->assertContains('painel', $rotas);
        $this->assertContains('fluxos/{fluxo}/editar', $rotas);
        $this->assertContains('preview/design-v2/fluxos/editor', $rotas);

        $this->assertNotContains('preview/design-v2/fluxos/{fluxo}/editar', $rotas);
    }
}
