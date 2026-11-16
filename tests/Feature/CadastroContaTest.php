<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class CadastroContaTest extends TestCase
{
    public function test_cadastro_cria_uma_conta_propria_para_o_usuario(): void
    {
        config(['flowchat.cadastro_publico' => true]);

        $this->post('/cadastro', [
            'name' => 'Conta Isolada',
            'email' => 'conta-isolada@example.test',
            'password' => 'senha-segura',
            'password_confirmation' => 'senha-segura',
        ])->assertRedirect(route('pagina-inicial'));

        $utilizador = User::where('email', 'conta-isolada@example.test')->firstOrFail();

        $this->assertDatabaseCount('accounts', 1);
        $this->assertDatabaseHas('users', [
            'id' => $utilizador->id,
            'account_id' => $utilizador->account_id,
        ]);
        $this->assertSame($utilizador->id, $utilizador->account->user->id);
        $this->assertAuthenticatedAs($utilizador);
    }
}
