<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class UltimoAcessoTest extends TestCase
{
    public function test_login_bem_sucedido_registra_ultimo_acesso(): void
    {
        $utilizador = User::factory()->create(['password' => 'SenhaSegura123']);

        $this->assertNull($utilizador->last_login_at);

        $this->post('/login', [
            'email' => $utilizador->email,
            'password' => 'SenhaSegura123',
        ])->assertRedirect(route('pagina-inicial'));

        $this->assertAuthenticatedAs($utilizador);
        $this->assertNotNull($utilizador->fresh()->last_login_at);
    }

    public function test_login_falho_nao_altera_ultimo_acesso(): void
    {
        $anterior = now()->subDay()->startOfSecond();
        $utilizador = User::factory()->create([
            'password' => 'SenhaSegura123',
            'last_login_at' => $anterior,
        ]);

        $this->post('/login', [
            'email' => $utilizador->email,
            'password' => 'senha-incorreta',
        ])->assertSessionHasErrors('email');

        $this->assertTrue($utilizador->fresh()->last_login_at->equalTo($anterior));
    }

    public function test_lista_administrativa_exibe_ultimo_acesso_sem_usar_sessoes(): void
    {
        config(['flowchat.administradores_plataforma' => ['admin@example.test']]);

        $administrador = User::factory()->create(['email' => 'admin@example.test']);
        $acesso = now()->subHours(3)->startOfSecond();
        $utilizador = User::factory()->create(['last_login_at' => $acesso]);

        $this->actingAs($administrador)
            ->get('/admin/convites')
            ->assertInertia(fn ($pagina) => $pagina
                ->component('V2/AdminContas')
                ->where('contas.data', function ($contas) use ($utilizador, $acesso): bool {
                    $conta = collect($contas)->firstWhere('email', $utilizador->email);

                    return $conta !== null
                        && $conta['ultimo_acesso'] === $acesso->toIso8601String();
                }));
    }
}
