<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CriarAdministradorPlataformaTest extends TestCase
{
    public function test_comando_cria_conta_e_usuario_quando_email_esta_na_allowlist(): void
    {
        config(['flowchat.administradores_plataforma' => ['admin@example.test']]);

        $this->artisan('flowchat:criar-administrador')
            ->expectsQuestion('Nome do administrador', 'Administrador Teste')
            ->expectsQuestion('Email do administrador', 'ADMIN@example.test')
            ->expectsQuestion('Senha (mínimo 12 caracteres, com letras e números)', 'SenhaForte123')
            ->expectsQuestion('Confirme a senha', 'SenhaForte123')
            ->expectsConfirmation('Criar uma nova conta e usuário para o email informado?', 'yes')
            ->assertExitCode(0);

        $utilizador = User::where('email', 'admin@example.test')->firstOrFail();

        $this->assertSame('Administrador Teste', $utilizador->name);
        $this->assertNotNull($utilizador->account_id);
        $this->assertTrue(Hash::check('SenhaForte123', $utilizador->password));
        $this->assertNull($utilizador->last_login_at);
    }

    public function test_comando_recusa_email_fora_da_allowlist(): void
    {
        config(['flowchat.administradores_plataforma' => ['admin@example.test']]);

        $this->artisan('flowchat:criar-administrador')
            ->expectsQuestion('Nome do administrador', 'Outro Administrador')
            ->expectsQuestion('Email do administrador', 'outro@example.test')
            ->assertExitCode(1);

        $this->assertDatabaseMissing('users', ['email' => 'outro@example.test']);
    }

    public function test_comando_nao_duplica_usuario_existente(): void
    {
        config(['flowchat.administradores_plataforma' => ['admin@example.test']]);

        $utilizador = User::factory()->create(['email' => 'admin@example.test']);
        $hashAnterior = $utilizador->password;

        $this->artisan('flowchat:criar-administrador')
            ->expectsQuestion('Nome do administrador', 'Outro Nome')
            ->expectsQuestion('Email do administrador', 'admin@example.test')
            ->assertExitCode(1);

        $this->assertSame(1, User::where('email', 'admin@example.test')->count());
        $this->assertSame($hashAnterior, $utilizador->fresh()->password);
    }

    public function test_comando_recusa_confirmacao_de_senha_diferente(): void
    {
        config(['flowchat.administradores_plataforma' => ['admin@example.test']]);

        $this->artisan('flowchat:criar-administrador')
            ->expectsQuestion('Nome do administrador', 'Administrador Teste')
            ->expectsQuestion('Email do administrador', 'admin@example.test')
            ->expectsQuestion('Senha (mínimo 12 caracteres, com letras e números)', 'SenhaForte123')
            ->expectsQuestion('Confirme a senha', 'OutraSenha123')
            ->assertExitCode(1);

        $this->assertDatabaseMissing('users', ['email' => 'admin@example.test']);
    }

    public function test_comando_recusa_allowlist_vazia(): void
    {
        config(['flowchat.administradores_plataforma' => []]);

        $this->artisan('flowchat:criar-administrador')
            ->assertExitCode(1);

        $this->assertDatabaseCount('users', 0);
    }

    public function test_bootstrap_login_e_pagina_admin_sao_acessiveis(): void
    {
        config(['flowchat.administradores_plataforma' => ['admin@example.test']]);

        $this->artisan('flowchat:criar-administrador')
            ->expectsQuestion('Nome do administrador', 'Administrador Teste')
            ->expectsQuestion('Email do administrador', 'admin@example.test')
            ->expectsQuestion('Senha (mínimo 12 caracteres, com letras e números)', 'SenhaForte123')
            ->expectsQuestion('Confirme a senha', 'SenhaForte123')
            ->expectsConfirmation('Criar uma nova conta e usuário para o email informado?', 'yes')
            ->assertExitCode(0);

        $this->post('/login', [
            'email' => 'admin@example.test',
            'password' => 'SenhaForte123',
        ])->assertRedirect(route('pagina-inicial'));

        $this->assertAuthenticated();

        $this->get('/admin/convites')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->component('V2/AdminContas'));
    }

    public function test_comando_rejeita_modo_nao_interativo(): void
    {
        config(['flowchat.administradores_plataforma' => ['admin@example.test']]);

        $this->artisan('flowchat:criar-administrador', ['--no-interaction' => true])
            ->expectsOutputToContain('Este comando exige entrada interativa')
            ->assertExitCode(1);

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('accounts', 0);
    }
}
