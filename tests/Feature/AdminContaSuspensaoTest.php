<?php

namespace Tests\Feature;

use App\Jobs\EnviarEtapaFluxo;
use App\Jobs\ExecutarAgendamento;
use App\Jobs\ProcessarMensagemEntrante;
use App\Models\Account;
use App\Models\ExecucaoFluxo;
use App\Models\LogSistema;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class AdminContaSuspensaoTest extends TestCase
{
    private User $administrador;

    private Account $contaCliente;

    private User $cliente;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'flowchat.administradores_plataforma' => ['admin@example.test'],
        ]);

        $this->administrador = User::factory()->create(['email' => 'admin@example.test']);
        $this->contaCliente = Account::factory()->create(['name' => 'Cliente Teste']);
        $this->cliente = User::factory()->create([
            'account_id' => $this->contaCliente->id,
            'email' => 'cliente@example.test',
            'password' => 'senha-cliente',
        ]);
    }

    public function test_painel_lista_contas_com_paginacao_e_administradores(): void
    {
        Account::factory()->count(14)->create();

        $this->actingAs($this->administrador)
            ->get('/admin/convites')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('V2/AdminContas')
                ->has('contas.data', 15)
                ->where('contas.current_page', 1)
                ->where('contas.last_page', 2)
                ->where('contas.total', 16)
                ->where('contas.data.1.nome', 'Cliente Teste')
                ->where('contas.data.1.email', 'cliente@example.test')
                ->where('contas.data.1.estado', 'ativa')
                ->has('administradores', 1)
                ->where('administradores.0.id', $this->administrador->id));
    }

    public function test_usuario_sem_email_administrativo_nao_suspende_conta(): void
    {
        $outro = User::factory()->create();

        $this->actingAs($outro)
            ->post("/admin/contas/{$this->contaCliente->id}/suspender", [
                'motivo' => 'Tentativa indevida',
            ])
            ->assertNotFound();

        $this->assertFalse($this->contaCliente->fresh()->suspensa);
    }

    public function test_suspensao_registra_auditoria_invalida_sessoes_e_encerra_execucoes(): void
    {
        $tokenAnterior = $this->cliente->getRememberToken();
        DB::table('sessions')->insert([
            'id' => 'sessao-cliente-teste',
            'user_id' => $this->cliente->id,
            'ip_address' => '192.0.2.10',
            'user_agent' => 'Chrome Teste',
            'payload' => '',
            'last_activity' => now()->timestamp,
        ]);

        $fluxo = $this->contaCliente->fluxos()->create(['nome' => 'Fluxo', 'ativo' => true]);
        $contato = $this->contaCliente->contatos()->create(['psid' => 'psid-cliente']);
        $execucao = $this->contaCliente->execucoes()->create([
            'contato_id' => $contato->id,
            'fluxo_id' => $fluxo->id,
            'etapa_atual' => 1,
        ]);
        $outro = User::factory()->create();

        $resposta = $this->suspender([
            'suspensa_por' => $outro->id,
        ]);

        $resposta->assertRedirect(route('admin.convites.index'))
            ->assertSessionHas('mensagem');

        $conta = $this->contaCliente->fresh();
        $this->assertTrue($conta->suspensa);
        $this->assertNotNull($conta->suspensa_em);
        $this->assertSame('Motivo de teste', $conta->motivo_suspensao);
        $this->assertSame($this->administrador->id, $conta->suspensa_por);
        $this->assertSame($this->administrador->id, $conta->administrador_responsavel_id);
        $this->assertDatabaseMissing('sessions', ['id' => 'sessao-cliente-teste']);
        $this->assertNotSame($tokenAnterior, $this->cliente->fresh()->getRememberToken());
        $this->assertNotNull($execucao->fresh()->concluida_em);
        $this->assertDatabaseHas('logs', ['evento' => 'conta_suspensa']);
    }

    public function test_reativacao_registra_ator_e_data(): void
    {
        $this->suspender();

        $this->actingAs($this->administrador)
            ->post("/admin/contas/{$this->contaCliente->id}/reativar", [
                'administrador_responsavel_id' => $this->administrador->id,
            ])
            ->assertRedirect(route('admin.convites.index'))
            ->assertSessionHas('mensagem');

        $conta = $this->contaCliente->fresh();
        $this->assertFalse($conta->suspensa);
        $this->assertNotNull($conta->reativada_em);
        $this->assertSame($this->administrador->id, $conta->reativada_por);
        $this->assertDatabaseHas('logs', ['evento' => 'conta_reativada']);
    }

    public function test_suspensao_repetida_e_reativacao_de_conta_ativa_sao_rejeitadas(): void
    {
        $this->suspender();

        $this->suspender()->assertSessionHasErrors('conta');

        $this->actingAs($this->administrador)
            ->post("/admin/contas/{$this->contaCliente->id}/reativar", [])
            ->assertRedirect(route('admin.convites.index'));

        $this->actingAs($this->administrador)
            ->post("/admin/contas/{$this->contaCliente->id}/reativar", [])
            ->assertSessionHasErrors('conta');

        $this->assertSame(1, LogSistema::where('evento', 'conta_suspensa')->count());
        $this->assertSame(1, LogSistema::where('evento', 'conta_reativada')->count());
    }

    public function test_conta_do_administrador_da_plataforma_nao_pode_ser_suspensa(): void
    {
        $this->actingAs($this->administrador)
            ->post("/admin/contas/{$this->administrador->account_id}/suspender", [
                'motivo' => 'Tentativa indevida',
            ])
            ->assertSessionHasErrors('conta');

        $this->assertFalse($this->administrador->account->fresh()->suspensa);
    }

    public function test_administrador_responsavel_invalido_e_rejeitado(): void
    {
        $outro = User::factory()->create();

        $this->suspender([
            'administrador_responsavel_id' => $outro->id,
        ])->assertSessionHasErrors('administrador_responsavel_id');

        $this->assertFalse($this->contaCliente->fresh()->suspensa);
    }

    public function test_login_de_conta_suspensa_e_bloqueado(): void
    {
        $this->suspender();
        $this->post('/sair');

        $this->post('/login', [
            'email' => 'cliente@example.test',
            'password' => 'senha-cliente',
        ])->assertRedirect(route('conta.suspensa'));

        $this->assertGuest();
    }

    public function test_requisicao_autenticada_de_conta_suspensa_e_encerrada(): void
    {
        $this->suspender();

        $this->actingAs($this->cliente)
            ->get('/')
            ->assertRedirect(route('conta.suspensa'));

        $this->assertGuest();
    }

    public function test_pagina_de_conta_suspensa_abre_sem_sessao(): void
    {
        $this->get('/conta-suspensa')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->component('V2/ContaSuspensa'));
    }

    public function test_job_de_envio_nao_envia_midia_ou_texto_para_conta_suspensa(): void
    {
        $this->suspender();

        $fluxo = $this->contaCliente->fluxos()->create(['nome' => 'Fluxo', 'ativo' => true]);
        $contato = $this->contaCliente->contatos()->create(['psid' => 'psid-job']);
        $fluxo->etapas()->create(['ordem' => 1, 'texto' => 'Não deve sair', 'pausa_segundos' => 0]);
        $execucao = $this->contaCliente->execucoes()->create([
            'contato_id' => $contato->id,
            'fluxo_id' => $fluxo->id,
            'etapa_atual' => 1,
        ]);

        Http::preventStrayRequests();
        Http::fake();

        (new EnviarEtapaFluxo($execucao->id))->handle();

        Http::assertNothingSent();
        $this->assertNotNull($execucao->fresh()->concluida_em);
        $this->assertDatabaseMissing('mensagens', ['direcao' => 'enviada']);
    }

    public function test_processamento_de_mensagem_recebida_e_ignorado_para_conta_suspensa(): void
    {
        $this->suspender();

        Http::preventStrayRequests();
        Http::fake();

        (new ProcessarMensagemEntrante($this->contaCliente->id, 'psid-novo', 'Olá'))->handle();

        Http::assertNothingSent();
        $this->assertDatabaseMissing('contatos', ['psid' => 'psid-novo']);
        $this->assertDatabaseMissing('mensagens', ['texto' => 'Olá']);
    }

    public function test_agendamento_de_conta_suspensa_falha_sem_enviar(): void
    {
        $this->suspender();

        $fluxo = $this->contaCliente->fluxos()->create(['nome' => 'Fluxo agendado', 'ativo' => true]);
        $contato = $this->contaCliente->contatos()->create(['psid' => 'psid-agendado']);
        $agendamento = $this->contaCliente->agendamentos()->create([
            'fluxo_id' => $fluxo->id,
            'contato_id' => $contato->id,
            'executar_em' => now()->subMinute(),
            'estado' => 'pendente',
        ]);

        (new ExecutarAgendamento($agendamento->id))->handle();

        $this->assertSame('falhou', $agendamento->fresh()->estado);
        $this->assertSame(0, ExecucaoFluxo::where('fluxo_id', $fluxo->id)->count());
        $this->assertDatabaseHas('logs', ['evento' => 'agendamento_nao_executado_conta_suspensa']);
        $this->assertDatabaseMissing('logs', ['evento' => 'agendamento_falhou']);
    }

    public function test_webhook_nao_despacha_automacao_para_conta_suspensa(): void
    {
        config([
            'services.messenger.verify_token' => 'token_verificacao',
            'services.messenger.app_secret' => 'segredo_teste',
        ]);

        $this->suspender();
        $this->contaCliente->messengerIntegration()->create([
            'page_id' => 'pagina_suspensa',
            'page_access_token' => 'token_teste',
        ]);

        Queue::fake();

        $payload = [
            'entry' => [[
                'id' => 'pagina_suspensa',
                'messaging' => [[
                    'sender' => ['id' => 'psid-webhook'],
                    'message' => ['mid' => 'mid-webhook', 'text' => 'Olá'],
                ]],
            ]],
        ];
        $corpo = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $assinatura = 'sha256='.hash_hmac('sha256', $corpo, 'segredo_teste');

        $this->call('POST', '/webhook/messenger', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $assinatura,
        ], $corpo)->assertOk();

        Queue::assertNothingPushed();
    }

    /**
     * @param  array<string, mixed>  $dados
     */
    private function suspender(array $dados = []): TestResponse
    {
        return $this->actingAs($this->administrador)
            ->post("/admin/contas/{$this->contaCliente->id}/suspender", [
                'motivo' => 'Motivo de teste',
                'administrador_responsavel_id' => $this->administrador->id,
                ...$dados,
            ]);
    }
}
