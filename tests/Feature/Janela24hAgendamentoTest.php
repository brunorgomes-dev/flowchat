<?php

namespace Tests\Feature;

use App\Jobs\ProcessarMensagemEntrante;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class Janela24hAgendamentoTest extends TestCase
{
    /**
     * Conta com fuso confirmado: sem isso o controller recusa o agendamento
     * antes de chegar à validação da janela de 24 horas.
     */
    private function contaComFusoConfirmado(): User
    {
        $utilizador = User::factory()->create();
        $utilizador->account->update([
            'timezone' => 'America/Sao_Paulo',
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
                'executar_em' => 'Este contato ainda não enviou mensagem. A Meta só permite mensagem livre até 24 horas após a última mensagem recebida.',
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
                'executar_em' => 'A Meta só permite mensagem livre até 24 horas após a última mensagem do contato. Para este contato, o limite é 17/11/2026 09:00.',
            ]);

        $this->assertDatabaseCount('agendamentos', 0);
    }

    public function test_mensagem_recebida_atualiza_o_instante_da_ultima_mensagem(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 12:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;

        (new ProcessarMensagemEntrante($conta->id, 'psid-janela-job', 'Olá'))->handle();

        $contato = $conta->contatos()->where('psid', 'psid-janela-job')->firstOrFail();
        $this->assertSame('2026-11-16 12:00:00', $contato->ultima_mensagem_recebida_em?->format('Y-m-d H:i:s'));
    }

    public function test_evento_sem_texto_nao_atualiza_o_instante_da_ultima_mensagem(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 12:00:00'));
        Queue::fake();

        $conta = User::factory()->create()->account;

        (new ProcessarMensagemEntrante($conta->id, 'psid-janela-sem-texto', null))->handle();

        $contato = $conta->contatos()->where('psid', 'psid-janela-sem-texto')->firstOrFail();
        $this->assertNull($contato->ultima_mensagem_recebida_em);
    }
}
