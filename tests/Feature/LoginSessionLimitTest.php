<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class LoginSessionLimitTest extends TestCase
{
    public function test_terceiro_login_pede_escolha_e_encera_a_sessao_selecionada(): void
    {
        config(['session.driver' => 'database']);
        $utilizador = User::factory()->create(['password' => 'senha-segura']);
        $rememberTokenAnterior = $utilizador->getRememberToken();
        $sessoes = collect([Str::random(40), Str::random(40)]);

        foreach ($sessoes as $sessao) {
            DB::table('sessions')->insert([
                'id' => $sessao,
                'user_id' => $utilizador->id,
                'ip_address' => '192.0.2.1',
                'user_agent' => 'Chrome Test',
                'payload' => '',
                'last_activity' => now()->timestamp,
            ]);
        }

        $this->post('/login', [
            'email' => $utilizador->email,
            'password' => 'senha-segura',
        ])->assertRedirect(route('login.sessoes'));

        $this->assertGuest();
        $this->get('/login/sessoes')->assertOk()->assertInertia(
            fn ($pagina) => $pagina->component('V2/SessoesLogin')->has('sessoes', 2)
        );

        $seletor = hash_hmac('sha256', $sessoes->first(), config('app.key'));
        $this->post("/login/sessoes/{$seletor}/substituir")
            ->assertRedirect(route('pagina-inicial'));

        $this->assertAuthenticatedAs($utilizador);
        $this->assertDatabaseMissing('sessions', ['id' => $sessoes->first()]);
        $this->assertDatabaseHas('sessions', ['id' => $sessoes->last(), 'user_id' => $utilizador->id]);
        $this->assertNotSame($rememberTokenAnterior, $utilizador->fresh()->getRememberToken());
        $this->assertNotNull($utilizador->fresh()->last_login_at);
    }
}
