<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\MessengerIntegration;
use App\Models\User;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ConectarMessengerTest extends TestCase
{
    public function test_conecta_pagina_e_remove_a_inscricao_anterior(): void
    {
        $utilizador = User::factory()->create();
        $utilizador->account->messengerIntegration()->create([
            'page_id' => 'pagina_anterior',
            'page_access_token' => 'token_anterior',
        ]);
        $nonce = $this->prepararPaginas($utilizador, [[
            'id' => 'pagina_nova',
            'name' => 'Página nova',
            'access_token' => 'token_novo',
        ]]);

        Http::fake([
            'https://graph.facebook.com/v23.0/pagina_nova/subscribed_apps' => Http::response(['success' => true]),
            'https://graph.facebook.com/v23.0/pagina_anterior/subscribed_apps' => Http::response([], 200),
        ]);

        $this->actingAs($utilizador)
            ->withSession(['messenger_oauth_paginas' => $nonce])
            ->post('/configuracoes/messenger/paginas', ['page_id' => 'pagina_nova'])
            ->assertRedirect(route('configuracoes.index'));

        $integracao = $utilizador->account->messengerIntegration()->firstOrFail();
        $this->assertSame('pagina_nova', $integracao->page_id);
        $this->assertSame('token_novo', $integracao->page_access_token);

        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'POST'
            && str_ends_with($request->url(), '/pagina_nova/subscribed_apps'));
        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'DELETE'
            && str_ends_with($request->url(), '/pagina_anterior/subscribed_apps'));
    }

    public function test_recusa_pagina_que_ja_pertence_a_outra_conta_antes_de_chamar_a_meta(): void
    {
        $utilizador = User::factory()->create();
        $outraConta = Account::factory()->create();
        $outraConta->messengerIntegration()->create([
            'page_id' => 'pagina_ocupada',
            'page_access_token' => 'token_vencedor',
        ]);
        $nonce = $this->prepararPaginas($utilizador, [[
            'id' => 'pagina_ocupada',
            'name' => 'Página ocupada',
            'access_token' => 'token_perdedor',
        ]]);

        Http::fake();

        $this->actingAs($utilizador)
            ->withSession(['messenger_oauth_paginas' => $nonce])
            ->from(route('messenger.oauth.paginas'))
            ->post('/configuracoes/messenger/paginas', ['page_id' => 'pagina_ocupada'])
            ->assertRedirect(route('messenger.oauth.paginas'))
            ->assertSessionHasErrors('page_id');

        Http::assertNothingSent();
        $this->assertSame(
            (int) $outraConta->id,
            (int) MessengerIntegration::query()->where('page_id', 'pagina_ocupada')->value('account_id'),
        );
    }

    public function test_corrida_ao_conectar_pagina_nao_remove_a_inscricao_da_conta_vencedora(): void
    {
        $utilizador = User::factory()->create();
        $contaVencedora = Account::factory()->create();
        $nonce = $this->prepararPaginas($utilizador, [[
            'id' => 'pagina_em_corrida',
            'name' => 'Página em corrida',
            'access_token' => 'token_perdedor',
        ]]);

        Http::fake(function (ClientRequest $request) use ($contaVencedora) {
            if ($request->method() === 'POST') {
                $contaVencedora->messengerIntegration()->create([
                    'page_id' => 'pagina_em_corrida',
                    'page_access_token' => 'token_vencedor',
                ]);

                return Http::response(['success' => true]);
            }

            return Http::response([], 200);
        });

        $this->actingAs($utilizador)
            ->withSession(['messenger_oauth_paginas' => $nonce])
            ->from(route('messenger.oauth.paginas'))
            ->post('/configuracoes/messenger/paginas', ['page_id' => 'pagina_em_corrida'])
            ->assertRedirect(route('messenger.oauth.paginas'))
            ->assertSessionHasErrors('page_id');

        Http::assertSentCount(1);
        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'POST'
            && str_ends_with($request->url(), '/pagina_em_corrida/subscribed_apps'));
        Http::assertNotSent(fn (ClientRequest $request): bool => $request->method() === 'DELETE'
            && str_ends_with($request->url(), '/pagina_em_corrida/subscribed_apps'));

        $integracao = MessengerIntegration::query()->where('page_id', 'pagina_em_corrida')->firstOrFail();
        $this->assertSame((int) $contaVencedora->id, (int) $integracao->account_id);
        $this->assertSame('token_vencedor', $integracao->page_access_token);
    }

    /**
     * @param  array<int, array{id: string, name: string, access_token: string}>  $paginas
     */
    private function prepararPaginas(User $utilizador, array $paginas): string
    {
        $nonce = 'nonce-selecao-pagina';
        Cache::put(
            'messenger:oauth:paginas:'.$utilizador->id.':'.$nonce,
            Crypt::encryptString(json_encode($paginas, JSON_THROW_ON_ERROR)),
            now()->addMinutes(10),
        );

        return $nonce;
    }
}
