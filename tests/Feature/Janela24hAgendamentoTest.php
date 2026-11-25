<?php

namespace Tests\Feature;

use App\Jobs\ExecutarAgendamento;
use App\Jobs\ProcessarMensagemEntrante;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class Janela24hAgendamentoTest extends TestCase
{
    /**
     * Conta com fuso confirmado: sem isso o controller recusa o agendamento
     * antes de chegar à validação da janela de 24 horas.
     */
    private function contaComFusoConfirmado(string $fuso = 'America/Sao_Paulo'): User
    {
        $utilizador = User::factory()->create();
        $utilizador->account->update([
            'timezone' => $fuso,
            'timezone_confirmado' => true,
        ]);

        return $utilizador->fresh();
    }

    public function test_contato_sem_mensagem_recebida_nao_pode_ser_agendado(): void
    {
        $utilizador = $this->contaComFusoConfirmado();
        $fluxo = $utilizador->account->fluxos()->create(['nome' => 'Fluxo janela', 'ativo' => true]);
        $contato = $utilizador->account->contatos()->create(['psid' => 'psid-janela-sem-mensagem']);

        $this->actingAs($utilizador)
            ->post('/agendamentos', [
                'fluxo_id' => $fluxo->id,
                'contato_id' => $contato->id,
                'executar_em' => now()->addHour()->format('Y-m-d H:i:s'),
            ])
            ->assertSessionHasErrors([
                'executar_em' => 'Este contato ainda não enviou mensagem com horário conhecido. A janela de mensagens da Meta não pode ser confirmada.',
            ]);

        $this->assertDatabaseCount('agendamentos', 0);
    }

    public function test_agendamento_dentro_da_janela_de_24_horas_e_criado(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00'));

        $utilizador = $this->contaComFusoConfirmado();
        $fluxo = $utilizador->account->fluxos()->create(['nome' => 'Fluxo janela', 'ativo' => true]);
        $contato = $utilizador->account->contatos()->create([
            'psid' => 'psid-janela-dentro',
            'ultima_mensagem_recebida_em' => now(),
        ]);

        $this->actingAs($utilizador)
            ->post('/agendamentos', [
                'fluxo_id' => $fluxo->id,
                'contato_id' => $contato->id,
                'executar_em' => now()->addHours(23)->format('Y-m-d H:i:s'),
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('agendamentos.index'));

        $this->assertDatabaseHas('agendamentos', [
            'contato_id' => $contato->id,
            'fluxo_id' => $fluxo->id,
            'estado' => 'pendente',
        ]);
    }

    public function test_agendamento_fora_da_janela_de_24_horas_e_recusado_com_o_limite(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00'));

        $utilizador = $this->contaComFusoConfirmado();
        $fluxo = $utilizador->account->fluxos()->create(['nome' => 'Fluxo janela', 'ativo' => true]);
        $contato = $utilizador->account->contatos()->create([
            'psid' => 'psid-janela-fora',
            'ultima_mensagem_recebida_em' => now(),
        ]);

        $this->actingAs($utilizador)
            ->post('/agendamentos', [
                'fluxo_id' => $fluxo->id,
                'contato_id' => $contato->id,
                'executar_em' => now()->addHours(25)->format('Y-m-d H:i:s'),
            ])
            ->assertSessionHasErrors([
                'executar_em' => 'O horário escolhido está fora da janela de mensagens permitida pela Meta. Para este contato, o limite é 17/11/2026 09:00.',
            ]);

        $this->assertDatabaseCount('agendamentos', 0);
    }

    public function test_agendamento_no_instante_exato_de_24_horas_e_recusado(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00'));

        $utilizador = $this->contaComFusoConfirmado();
        $fluxo = $utilizador->account->fluxos()->create(['nome' => 'Fluxo janela', 'ativo' => true]);
        $contato = $utilizador->account->contatos()->create([
            'psid' => 'psid-janela-fronteira',
            'ultima_mensagem_recebida_em' => now(),
        ]);

        $this->actingAs($utilizador)
            ->post('/agendamentos', [
                'fluxo_id' => $fluxo->id,
                'contato_id' => $contato->id,
                'executar_em' => now()->addHours(24)->format('Y-m-d H:i:s'),
            ])
            ->assertSessionHasErrors([
                'executar_em' => 'O horário escolhido está fora da janela de mensagens permitida pela Meta. Para este contato, o limite é 17/11/2026 09:00.',
            ]);

        $this->assertDatabaseCount('agendamentos', 0);
    }

    public function test_mensagem_recebida_atualiza_o_instante_da_ultima_mensagem(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 12:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;

        (new ProcessarMensagemEntrante($conta->id, 'psid-janela-job', 'Olá', now()->getTimestampMs()))->handle();

        $contato = $conta->contatos()->where('psid', 'psid-janela-job')->firstOrFail();
        $this->assertSame('2026-11-16 12:00:00', $contato->ultima_mensagem_recebida_em?->format('Y-m-d H:i:s'));
    }

    public function test_mensagem_sem_timestamp_valido_nao_renova_a_janela(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 12:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;

        (new ProcessarMensagemEntrante($conta->id, 'psid-janela-sem-timestamp-evento', 'Olá'))->handle();

        $contato = $conta->contatos()->where('psid', 'psid-janela-sem-timestamp-evento')->firstOrFail();
        $this->assertNull($contato->ultima_mensagem_recebida_em);
        $this->assertDatabaseHas('mensagens', ['contato_id' => $contato->id, 'texto' => 'Olá']);
        $this->assertDatabaseHas('logs', ['account_id' => $conta->id, 'evento' => 'mensagem_recebida']);
    }

    public function test_instante_da_janela_vem_do_timestamp_do_evento_e_nao_do_processamento(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 12:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;
        $eventoEm = Carbon::parse('2026-11-16 10:15:00');

        (new ProcessarMensagemEntrante($conta->id, 'psid-janela-evento', 'Olá', $eventoEm->getTimestampMs()))->handle();

        $contato = $conta->contatos()->where('psid', 'psid-janela-evento')->firstOrFail();
        $this->assertSame('2026-11-16 10:15:00', $contato->ultima_mensagem_recebida_em?->format('Y-m-d H:i:s'));
    }

    public function test_evento_fora_de_ordem_nao_retrocede_a_janela(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 12:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;
        $conta->contatos()->create([
            'psid' => 'psid-janela-atrasada',
            'ultima_mensagem_recebida_em' => Carbon::parse('2026-11-16 12:00:00'),
        ]);

        $eventoAtrasado = Carbon::parse('2026-11-16 10:00:00');
        (new ProcessarMensagemEntrante($conta->id, 'psid-janela-atrasada', 'Antiga', $eventoAtrasado->getTimestampMs()))->handle();

        $contato = $conta->contatos()->where('psid', 'psid-janela-atrasada')->firstOrFail();
        $this->assertSame('2026-11-16 12:00:00', $contato->ultima_mensagem_recebida_em?->format('Y-m-d H:i:s'));
    }

    public function test_mensagem_sem_texto_com_anexo_atualiza_a_janela_sem_guardar_conteudo(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 12:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;
        $eventoEm = Carbon::parse('2026-11-16 11:30:00');

        (new ProcessarMensagemEntrante($conta->id, 'psid-janela-anexo', null, $eventoEm->getTimestampMs()))->handle();

        $contato = $conta->contatos()->where('psid', 'psid-janela-anexo')->firstOrFail();
        $this->assertSame('2026-11-16 11:30:00', $contato->ultima_mensagem_recebida_em?->format('Y-m-d H:i:s'));
        $this->assertDatabaseCount('mensagens', 0);
    }

    public function test_evento_sem_objeto_de_mensagem_nao_cria_contato_nem_dispara_gatilhos(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 12:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;
        $fluxo = $conta->fluxos()->create(['nome' => 'Fluxo mensagem', 'ativo' => true]);
        $fluxo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);
        $fluxo->regras()->create(['gatilho' => 'novo_contato', 'ativo' => true]);

        // Evento read/delivery: não é mensagem, mesmo que traga um timestamp.
        $eventoEm = Carbon::parse('2026-11-16 13:00:00');
        (new ProcessarMensagemEntrante($conta->id, 'psid-evento-nao-mensagem', null, $eventoEm->getTimestampMs(), false))->handle();

        $this->assertDatabaseMissing('contatos', ['psid' => 'psid-evento-nao-mensagem']);
        $this->assertDatabaseCount('mensagens', 0);
        $this->assertDatabaseCount('execucoes_fluxo', 0);
        $this->assertDatabaseCount('agendamentos', 0);
        $this->assertDatabaseCount('logs', 0);
        Queue::assertNothingPushed();
    }

    public function test_espera_automatica_cria_agendamento_quando_o_inicio_cabe_na_janela(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;
        $fluxo = $conta->fluxos()->create([
            'nome' => 'Fluxo espera',
            'ativo' => true,
            'horario_inicio_ativo' => true,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
            'fora_horario' => 'aguardar',
        ]);
        $fluxo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);

        $eventoEm = Carbon::parse('2026-11-16 09:00:00');
        (new ProcessarMensagemEntrante($conta->id, 'psid-espera-dentro', 'Olá', $eventoEm->getTimestampMs()))->handle();

        $contato = $conta->contatos()->where('psid', 'psid-espera-dentro')->firstOrFail();
        $this->assertDatabaseHas('agendamentos', [
            'fluxo_id' => $fluxo->id,
            'contato_id' => $contato->id,
            'estado' => 'pendente',
            'executar_em' => '2026-11-16 10:00:00',
        ]);
        $this->assertDatabaseHas('logs', ['evento' => 'fluxo_aguardando_horario']);
    }

    public function test_espera_automatica_nao_cria_agendamento_alem_da_janela(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;
        $fluxo = $conta->fluxos()->create([
            'nome' => 'Fluxo espera',
            'ativo' => true,
            'horario_inicio_ativo' => true,
            'horario_inicio' => '10:00:00',
            'horario_fim' => '11:00:00',
            'fora_horario' => 'aguardar',
        ]);
        $fluxo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);

        // Evento atrasado: a janela termina hoje às 09:00, antes do próximo
        // início permitido do fluxo (10:00).
        $eventoEm = Carbon::parse('2026-11-15 09:00:00');
        (new ProcessarMensagemEntrante($conta->id, 'psid-espera-fora', 'Olá', $eventoEm->getTimestampMs()))->handle();

        $this->assertDatabaseCount('agendamentos', 0);
        $this->assertDatabaseCount('execucoes_fluxo', 0);
        $this->assertDatabaseHas('logs', ['evento' => 'fluxo_aguardando_sem_janela']);
        Queue::assertNothingPushed();
    }

    public function test_agendamento_expirado_nao_inicia_fluxo_no_momento_da_execucao(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 12:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;
        $fluxo = $conta->fluxos()->create(['nome' => 'Fluxo agendado', 'ativo' => true]);
        $contato = $conta->contatos()->create([
            'psid' => 'psid-janela-expirada',
            'ultima_mensagem_recebida_em' => now()->subHours(25),
        ]);
        $agendamento = $conta->agendamentos()->create([
            'fluxo_id' => $fluxo->id,
            'contato_id' => $contato->id,
            'executar_em' => now()->subMinute(),
            'estado' => 'pendente',
        ]);

        (new ExecutarAgendamento($agendamento->id))->handle();

        $this->assertSame('falhou', $agendamento->fresh()->estado);
        $this->assertDatabaseCount('execucoes_fluxo', 0);
        $this->assertDatabaseHas('logs', ['evento' => 'agendamento_nao_executado_janela_expirada']);
        Queue::assertNothingPushed();
    }

    public function test_agendamento_legado_sem_timestamp_nao_inicia_fluxo(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 12:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;
        $fluxo = $conta->fluxos()->create(['nome' => 'Fluxo agendado', 'ativo' => true]);
        $contato = $conta->contatos()->create([
            'psid' => 'psid-janela-sem-timestamp',
            'ultima_mensagem_recebida_em' => null,
        ]);
        $agendamento = $conta->agendamentos()->create([
            'fluxo_id' => $fluxo->id,
            'contato_id' => $contato->id,
            'executar_em' => now()->subMinute(),
            'estado' => 'pendente',
        ]);

        (new ExecutarAgendamento($agendamento->id))->handle();

        $this->assertSame('falhou', $agendamento->fresh()->estado);
        $this->assertDatabaseCount('execucoes_fluxo', 0);
        $this->assertDatabaseHas('logs', ['evento' => 'agendamento_nao_executado_janela_expirada']);
        Queue::assertNothingPushed();
    }

    public function test_agendamento_dentro_da_janela_executa_no_momento_previsto(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 12:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;
        $fluxo = $conta->fluxos()->create(['nome' => 'Fluxo agendado', 'ativo' => true]);
        $contato = $conta->contatos()->create([
            'psid' => 'psid-janela-valida',
            'ultima_mensagem_recebida_em' => now()->subHours(23),
        ]);
        $agendamento = $conta->agendamentos()->create([
            'fluxo_id' => $fluxo->id,
            'contato_id' => $contato->id,
            'executar_em' => now()->subMinute(),
            'estado' => 'pendente',
        ]);

        (new ExecutarAgendamento($agendamento->id))->handle();

        $this->assertSame('executado', $agendamento->fresh()->estado);
        $this->assertDatabaseCount('execucoes_fluxo', 1);
        $this->assertDatabaseHas('logs', ['evento' => 'agendamento_executado']);
    }

    public function test_limite_e_apresentado_no_fuso_da_conta_respeitando_o_horario_de_verao(): void
    {
        $this->travelTo(Carbon::parse('2026-03-29 08:00:00', 'Europe/Lisbon'));

        $utilizador = $this->contaComFusoConfirmado('Europe/Lisbon');
        $fluxo = $utilizador->account->fluxos()->create(['nome' => 'Fluxo janela', 'ativo' => true]);
        $contato = $utilizador->account->contatos()->create([
            'psid' => 'psid-janela-dst',
            // 28/03/2026 12:00 em Lisboa (UTC+0), antes da mudança de hora.
            'ultima_mensagem_recebida_em' => Carbon::parse('2026-03-28 12:00:00', 'Europe/Lisbon')
                ->timezone(config('app.timezone')),
        ]);

        $this->actingAs($utilizador)
            ->post('/agendamentos', [
                'fluxo_id' => $fluxo->id,
                'contato_id' => $contato->id,
                'executar_em' => '2026-03-29 14:00:00',
            ])
            ->assertSessionHasErrors([
                'executar_em' => 'O horário escolhido está fora da janela de mensagens permitida pela Meta. Para este contato, o limite é 29/03/2026 13:00.',
            ]);

        $this->assertDatabaseCount('agendamentos', 0);
    }

    public function test_sem_coluna_da_janela_o_comportamento_anterior_e_preservado(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00'));
        Queue::fake();

        // Simula apenas a ausência da coluna, sem alterar o schema da conexão
        // de testes: todas as demais colunas continuam disponíveis.
        Schema::shouldReceive('hasColumn')
            ->with('contatos', 'ultima_mensagem_recebida_em')
            ->andReturnFalse();
        Schema::shouldReceive('hasColumn')->andReturnTrue();
        Schema::shouldReceive('hasTable')->andReturnTrue();

        $utilizador = $this->contaComFusoConfirmado();
        $fluxo = $utilizador->account->fluxos()->create(['nome' => 'Fluxo sem coluna', 'ativo' => true]);
        $contato = $utilizador->account->contatos()->create(['psid' => 'psid-sem-coluna']);

        $this->actingAs($utilizador)
            ->post('/agendamentos', [
                'fluxo_id' => $fluxo->id,
                'contato_id' => $contato->id,
                'executar_em' => now()->addHours(25)->format('Y-m-d H:i:s'),
            ])
            ->assertSessionHasNoErrors();

        $agendamento = $utilizador->account->agendamentos()->firstOrFail();

        (new ProcessarMensagemEntrante($utilizador->account->id, 'psid-sem-coluna', 'Olá'))->handle();
        (new ExecutarAgendamento($agendamento->id))->handle();

        $this->assertSame('executado', $agendamento->fresh()->estado);
        $this->assertDatabaseCount('execucoes_fluxo', 1);
    }
}
