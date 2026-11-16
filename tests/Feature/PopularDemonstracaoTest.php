<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Contato;
use App\Models\ExecucaoFluxo;
use App\Models\Fluxo;
use App\Models\Mensagem;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PopularDemonstracaoTest extends TestCase
{
    private ?string $senhaFile = null;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        config([
            'app.env' => 'local',
            'database.connections.mysql.host' => 'db',
            'database.connections.mysql.database' => 'flowchat',
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->senhaFile !== null && file_exists($this->senhaFile)) {
            unlink($this->senhaFile);
        }

        parent::tearDown();
    }

    public function test_comando_cria_dados_demo_e_e_idempotente(): void
    {
        $this->senhaFile = $this->criarArquivoSenha();

        $this->artisan('flowchat:demo-popular', [
            '--confirm' => true,
            '--senha-file' => $this->senhaFile,
        ])->assertExitCode(0);

        $conta = Account::query()->where('name', 'Demonstração FlowChat — dados fictícios')->firstOrFail();
        $this->assertSame(1, $conta->user()->count());
        $this->assertSame(8, $conta->contatos()->count());
        $this->assertSame(3, $conta->fluxos()->count());
        $this->assertDatabaseCount('messenger_integrations', 0);
        $this->assertDatabaseCount('convites', 0);
        $this->assertDatabaseCount('jobs', 0);

        Storage::disk('local')->assertExists('flowchat/etapas/'.$conta->id.'/demo-orcamento.png');
        Storage::disk('local')->assertExists('flowchat/etapas/'.$conta->id.'/demo-briefing.txt');

        $contagensAntes = $this->contagensDaConta($conta);

        $this->artisan('flowchat:demo-popular', [
            '--confirm' => true,
            '--senha-file' => $this->senhaFile,
        ])->assertExitCode(0);

        $this->assertSame($contagensAntes, $this->contagensDaConta($conta->fresh()));
    }

    public function test_comando_recusa_sem_confirmacao(): void
    {
        $this->artisan('flowchat:demo-popular')
            ->assertExitCode(1);

        $this->assertDatabaseMissing('accounts', ['name' => 'Demonstração FlowChat — dados fictícios']);
    }

    public function test_comando_recusa_ambiente_que_nao_seja_o_banco_local(): void
    {
        config(['database.connections.mysql.database' => 'outro_banco']);

        $this->artisan('flowchat:demo-popular', ['--confirm' => true])
            ->assertExitCode(1);

        $this->assertDatabaseMissing('accounts', ['name' => 'Demonstração FlowChat — dados fictícios']);
    }

    /**
     * @return array<string, int>
     */
    private function contagensDaConta(Account $conta): array
    {
        return [
            'users' => User::query()->where('account_id', $conta->id)->count(),
            'contacts' => Contato::query()->where('account_id', $conta->id)->count(),
            'messages' => Mensagem::query()->whereHas('contato', fn ($q) => $q->where('account_id', $conta->id))->count(),
            'flows' => Fluxo::query()->where('account_id', $conta->id)->count(),
            'executions' => ExecucaoFluxo::query()->where('account_id', $conta->id)->count(),
        ];
    }

    private function criarArquivoSenha(): string
    {
        $caminho = tempnam(sys_get_temp_dir(), 'flowchat-demo-');
        file_put_contents($caminho, 'SenhaDemo1234');

        return $caminho;
    }
}
