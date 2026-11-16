<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Convite;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class ConviteTest extends TestCase
{
    private User $administrador;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'flowchat.cadastro_publico' => false,
            'flowchat.administradores_plataforma' => ['admin@example.test'],
        ]);

        $this->administrador = User::factory()->create(['email' => 'admin@example.test']);
    }

    public function test_cadastro_publico_bloqueado_por_padrao(): void
    {
        $this->get('/cadastro')->assertNotFound();

        $this->post('/cadastro', [
            'name' => 'Cadastro Público',
            'email' => 'publico@example.test',
            'password' => 'senha-segura',
            'password_confirmation' => 'senha-segura',
        ])->assertNotFound();

        $this->assertDatabaseMissing('users', ['email' => 'publico@example.test']);

        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('V2/Login')
                ->where('flash.cadastro_publico', false));
    }

    public function test_cadastro_publico_funciona_quando_reativado(): void
    {
        config(['flowchat.cadastro_publico' => true]);

        $this->get('/cadastro')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina->component('V2/Cadastro'));

        $this->post('/cadastro', [
            'name' => 'Conta Pública',
            'email' => 'publico-reativado@example.test',
            'password' => 'senha-segura',
            'password_confirmation' => 'senha-segura',
        ])->assertRedirect(route('pagina-inicial'))
            ->assertSessionHas('fuso_confirmar', true);

        $utilizador = User::where('email', 'publico-reativado@example.test')->firstOrFail();

        $this->assertAuthenticatedAs($utilizador);
        $this->assertNotNull($utilizador->account);
        $this->assertDatabaseHas('users', [
            'id' => $utilizador->id,
            'account_id' => $utilizador->account_id,
        ]);
    }

    public function test_login_exibe_link_de_cadastro_quando_reativado(): void
    {
        config(['flowchat.cadastro_publico' => true]);

        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('V2/Login')
                ->where('flash.cadastro_publico', true));
    }

    public function test_usuario_nao_autenticado_nao_acessa_nem_altera_painel_de_convites(): void
    {
        $this->get('/admin/convites')->assertRedirect(route('login'));
        $this->post('/admin/convites', ['email' => 'sem-login@example.test'])
            ->assertRedirect(route('login'));

        $this->assertDatabaseCount('convites', 0);
    }

    public function test_usuario_sem_email_administrativo_nao_acessa_nem_altera_painel_de_convites(): void
    {
        $utilizador = User::factory()->create(['email' => 'comum@example.test']);

        $this->actingAs($utilizador)
            ->get('/admin/convites')
            ->assertNotFound();
        $this->actingAs($utilizador)
            ->post('/admin/convites', ['email' => 'sem-admin@example.test'])
            ->assertNotFound();

        $this->assertDatabaseCount('convites', 0);
    }

    public function test_admin_emite_convite_e_link_contem_token_que_nao_foi_armazenado(): void
    {
        $resposta = $this->actingAs($this->administrador)
            ->post('/admin/convites', ['email' => 'Convidado@Example.test']);

        $resposta->assertRedirect(route('admin.convites.create'))
            ->assertSessionHas('link_convite');

        $link = (string) $resposta->getSession()->get('link_convite');
        $token = basename((string) parse_url($link, PHP_URL_PATH));
        $convite = Convite::query()->firstOrFail();

        $this->assertSame('convidado@example.test', $convite->email);
        $this->assertSame(hash('sha256', $token), $convite->token_hash);
        $this->assertNotSame($token, $convite->token_hash);
        $this->assertStringNotContainsString($token, $convite->token_hash);

        $this->get('/admin/convites/emitir')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('V2/AdminConvites')
                ->where('linkConvite', $link)
                ->has('convites', 1)
                ->where('convites.0.email', 'convidado@example.test')
                ->where('convites.0.estado', 'pendente')
                ->where('convites.0.emissor.id', $this->administrador->id)
                ->where('convites.0.emissor.name', $this->administrador->name)
                ->where('convites.0.emissor.email', $this->administrador->email)
                ->missing('convites.0.token')
                ->missing('convites.0.token_hash'));
    }

    public function test_convite_sem_emissor_apresenta_emissor_nulo_na_lista(): void
    {
        $convite = Convite::create([
            'email' => 'sem-emissor@example.test',
            'token_hash' => hash('sha256', Str::random(64)),
            'emitido_por' => null,
            'expira_em' => now()->addDay(),
        ]);

        $this->actingAs($this->administrador)
            ->get('/admin/convites/emitir')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('V2/AdminConvites')
                ->has('convites', 1)
                ->where('convites.0.email', 'sem-emissor@example.test')
                ->where('convites.0.emissor', null)
                ->missing('convites.0.token')
                ->missing('convites.0.token_hash'));

        $this->assertNull($convite->fresh()->emitido_por);
    }

    public function test_admin_rejeita_email_invalido(): void
    {
        $this->actingAs($this->administrador)
            ->post('/admin/convites', ['email' => 'email-invalido'])
            ->assertSessionHasErrors('email');

        $this->assertDatabaseCount('convites', 0);
    }

    public function test_admin_rejeita_email_de_conta_existente(): void
    {
        User::factory()->create(['email' => 'existente@example.test']);

        $this->actingAs($this->administrador)
            ->post('/admin/convites', ['email' => 'existente@example.test'])
            ->assertSessionHasErrors('email');

        $this->assertDatabaseCount('convites', 0);
    }

    public function test_admin_revoga_convite_pendente(): void
    {
        [$convite, $token] = $this->criarConvite('revogar@example.test');

        $this->actingAs($this->administrador)
            ->delete("/admin/convites/{$convite->id}")
            ->assertRedirect(route('admin.convites.create'));

        $this->assertNotNull($convite->fresh()->revogado_em);
        $this->actingAs($this->administrador)
            ->get('/admin/convites/emitir')
            ->assertInertia(fn ($pagina) => $pagina
                ->component('V2/AdminConvites')
                ->where('convites.0.estado', 'revogado')
                ->has('convites.0.criado_em')
                ->has('convites.0.expira_em')
                ->has('convites.0.revogado_em'));
        $this->post('/sair')->assertRedirect(route('login'));
        $this->get("/convites/{$token}")->assertNotFound();
    }

    public function test_revogacao_nao_altera_convite_ja_resgatado(): void
    {
        $utilizador = User::factory()->create(['email' => 'resgatado@example.test']);
        [$convite] = $this->criarConvite('resgatado@example.test', [
            'resgatado_por' => $utilizador->id,
            'resgatado_em' => now(),
        ]);

        $this->actingAs($this->administrador)
            ->delete("/admin/convites/{$convite->id}")
            ->assertRedirect(route('admin.convites.create'));

        $this->assertNull($convite->fresh()->revogado_em);
        $this->assertNotNull($convite->fresh()->resgatado_em);
    }

    public function test_tokens_invalido_expirado_revogado_ou_usado_sao_rejeitados(): void
    {
        [$expirado, $tokenExpirado] = $this->criarConvite('expirado@example.test', [
            'expira_em' => now()->subMinute(),
        ]);
        [$revogado, $tokenRevogado] = $this->criarConvite('revogado@example.test', [
            'revogado_em' => now(),
        ]);
        [$usado, $tokenUsado] = $this->criarConvite('usado@example.test', [
            'resgatado_em' => now(),
            'resgatado_por' => $this->administrador->id,
        ]);

        $this->assertNotNull($expirado->expira_em);
        $this->assertNotNull($revogado->revogado_em);
        $this->assertNotNull($usado->resgatado_em);

        foreach ([$tokenExpirado, $tokenRevogado, $tokenUsado, 'token-inexistente'] as $token) {
            $this->get("/convites/{$token}")->assertNotFound();
            $this->post("/convites/{$token}", $this->dadosRegistro())->assertNotFound();
        }

        $this->assertDatabaseMissing('users', ['email' => 'expirado@example.test']);
        $this->assertDatabaseMissing('users', ['email' => 'revogado@example.test']);
        $this->assertDatabaseMissing('users', ['email' => 'usado@example.test']);
    }

    public function test_convite_valido_cria_conta_autentica_e_sinaliza_fuso(): void
    {
        [$convite, $token] = $this->criarConvite('novo@example.test');
        $sessaoAntes = $this->app['session']->getId();

        $this->get("/convites/{$token}")
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('V2/Cadastro')
                ->where('convite.email', 'novo@example.test')
                ->where('urlCadastro', route('convites.registrar', ['token' => $token])));

        $this->post("/convites/{$token}", $this->dadosRegistro())
            ->assertRedirect(route('pagina-inicial'))
            ->assertSessionHas('fuso_confirmar', true);

        $utilizador = User::where('email', 'novo@example.test')->firstOrFail();

        $this->assertAuthenticatedAs($utilizador);
        $this->assertNotNull($utilizador->account);
        $this->assertSame('Novo Convidado', $utilizador->name);
        $this->assertTrue(Hash::check('senha-segura', $utilizador->password));
        $this->assertNotSame($sessaoAntes, $this->app['session']->getId());

        $convite->refresh();
        $this->assertNotNull($convite->resgatado_em);
        $this->assertSame($utilizador->id, $convite->resgatado_por);
        $this->assertDatabaseHas('accounts', ['id' => $utilizador->account_id]);
    }

    public function test_convite_ignora_email_enviado_e_vincula_ao_email_emitido(): void
    {
        [$convite, $token] = $this->criarConvite('destino@example.test');

        $this->post("/convites/{$token}", [
            ...$this->dadosRegistro(),
            'email' => 'outro@example.test',
        ])->assertRedirect(route('pagina-inicial'));

        $this->assertDatabaseHas('users', ['email' => 'destino@example.test']);
        $this->assertDatabaseMissing('users', ['email' => 'outro@example.test']);
        $this->assertSame('destino@example.test', $convite->fresh()->email);
        $this->assertNotNull($convite->fresh()->resgatado_em);
    }

    public function test_convite_so_pode_ser_resgatado_uma_vez(): void
    {
        [, $token] = $this->criarConvite('unico@example.test');

        $this->post("/convites/{$token}", $this->dadosRegistro())
            ->assertRedirect(route('pagina-inicial'));

        $this->post('/sair')->assertRedirect(route('login'));

        $this->post("/convites/{$token}", $this->dadosRegistro())
            ->assertNotFound();

        $this->assertSame(1, User::where('email', 'unico@example.test')->count());
        $this->assertSame(1, Account::where('name', 'Novo Convidado')->count());
    }

    public function test_rotas_de_convite_respeitam_limite_de_tentativas(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->get('/convites/token-inexistente')->assertNotFound();
        }

        $this->get('/convites/token-inexistente')->assertStatus(429);
    }

    public function test_emissao_de_convites_respeita_limite_de_tentativas(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $this->actingAs($this->administrador)
                ->post('/admin/convites', ['email' => "limite{$i}@example.test"])
                ->assertRedirect(route('admin.convites.create'));
        }

        $this->actingAs($this->administrador)
            ->post('/admin/convites', ['email' => 'limite-bloqueado@example.test'])
            ->assertStatus(429);

        $this->assertDatabaseCount('convites', 20);
    }

    /**
     * @param  array<string, mixed>  $atributos
     * @return array{Convite, string}
     */
    private function criarConvite(string $email, array $atributos = []): array
    {
        $token = Str::random(64);
        $convite = Convite::create([
            'email' => $email,
            'token_hash' => hash('sha256', $token),
            'emitido_por' => $this->administrador->id,
            'expira_em' => now()->addDay(),
            ...$atributos,
        ]);

        return [$convite, $token];
    }

    /**
     * @return array{name: string, password: string, password_confirmation: string}
     */
    private function dadosRegistro(): array
    {
        return [
            'name' => 'Novo Convidado',
            'password' => 'senha-segura',
            'password_confirmation' => 'senha-segura',
        ];
    }
}
