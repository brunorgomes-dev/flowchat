<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Contato;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ExecucaoFluxoPresaTest extends TestCase
{
    private Account $conta;

    private Contato $contato;

    private Fluxo $fluxo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->conta = Account::factory()->create();
        $this->contato = $this->conta->contatos()->create(['psid' => '12345']);
        $this->fluxo = $this->conta->fluxos()->create(['nome' => 'Teste', 'ativo' => true]);
    }

    public function test_encerra_execucao_sem_atividade(): void
    {
        $execucao = $this->criarExecucao(now()->subHours(7));

        $this->artisan('fluxos:encerrar-presas')->assertSuccessful();

        $this->assertNotNull($execucao->fresh()->concluida_em);
        $this->assertDatabaseHas('logs', ['evento' => 'fluxo_encerrado_sem_atividade']);
    }

    public function test_nao_encerra_execucao_recente(): void
    {
        $execucao = $this->criarExecucao(now()->subMinutes(30));

        $this->artisan('fluxos:encerrar-presas')->assertSuccessful();

        $this->assertNull($execucao->fresh()->concluida_em);
        $this->assertDatabaseMissing('logs', ['evento' => 'fluxo_encerrado_sem_atividade']);
    }

    public function test_nao_encerra_execucao_ja_concluida(): void
    {
        $execucao = $this->criarExecucao(now()->subHours(7));
        $concluidaEm = now()->subHours(8);

        DB::table('execucoes_fluxo')->where('id', $execucao->id)->update([
            'concluida_em' => $concluidaEm,
        ]);

        $this->artisan('fluxos:encerrar-presas')->assertSuccessful();

        $this->assertSame(
            $concluidaEm->toDateTimeString(),
            (string) $execucao->fresh()->concluida_em,
        );
        $this->assertDatabaseMissing('logs', ['evento' => 'fluxo_encerrado_sem_atividade']);
    }

    public function test_limite_de_minutos_pode_ser_ajustado(): void
    {
        $execucao = $this->criarExecucao(now()->subMinutes(30));

        $this->artisan('fluxos:encerrar-presas', ['--minutos' => 10])->assertSuccessful();

        $this->assertNotNull($execucao->fresh()->concluida_em);
    }

    private function criarExecucao(Carbon $atualizadoEm): ExecucaoFluxo
    {
        $execucao = $this->conta->execucoes()->create([
            'contato_id' => $this->contato->id,
            'fluxo_id' => $this->fluxo->id,
            'etapa_atual' => 1,
        ]);

        DB::table('execucoes_fluxo')->where('id', $execucao->id)->update([
            'updated_at' => $atualizadoEm,
        ]);

        return $execucao->fresh();
    }
}
