<?php

namespace Tests\Feature;

use App\Models\Contato;
use Tests\TestCase;

class HistoricoContatoTest extends TestCase
{
    public function test_exibe_historico_do_contato_em_ordem_cronologica(): void
    {
        $contatoA = Contato::factory()->create(['psid' => '111']);
        $contatoB = Contato::factory()->create(['psid' => '222']);

        $contatoA->mensagens()->create(['direcao' => 'recebida', 'texto' => 'Primeira do A']);
        $contatoB->mensagens()->create(['direcao' => 'recebida', 'texto' => 'Primeira do B']);
        $contatoA->mensagens()->create(['direcao' => 'enviada', 'texto' => 'Segunda do A']);

        $this->get("/contatos/{$contatoA->id}/historico")->assertOk()->assertInertia(
            fn ($pagina) => $pagina
                ->component('HistoricoContato')
                ->where('contato.psid', '111')
                ->has('mensagens', 2)
                ->where('mensagens.0.direcao', 'recebida')
                ->where('mensagens.0.texto', 'Primeira do A')
                ->where('mensagens.1.direcao', 'enviada')
                ->where('mensagens.1.texto', 'Segunda do A')
                ->has('mensagens.0.created_at')
        );
    }

    public function test_historico_exibe_somente_mensagens_do_contato(): void
    {
        $contatoA = Contato::factory()->create(['psid' => '111']);
        $contatoB = Contato::factory()->create(['psid' => '222']);

        $contatoA->mensagens()->create(['direcao' => 'recebida', 'texto' => 'Mensagem do A']);
        $contatoB->mensagens()->createMany([
            ['direcao' => 'recebida', 'texto' => 'Mensagem do B 1'],
            ['direcao' => 'enviada', 'texto' => 'Mensagem do B 2'],
        ]);

        $this->get("/contatos/{$contatoB->id}/historico")->assertOk()->assertInertia(
            fn ($pagina) => $pagina
                ->has('mensagens', 2)
                ->where('mensagens.0.texto', 'Mensagem do B 1')
                ->where('mensagens.1.texto', 'Mensagem do B 2')
        );
    }

    public function test_contato_sem_mensagens_exibe_lista_vazia(): void
    {
        $contato = Contato::factory()->create(['psid' => '333']);

        $this->get("/contatos/{$contato->id}/historico")->assertOk()->assertInertia(
            fn ($pagina) => $pagina
                ->component('HistoricoContato')
                ->has('mensagens', 0)
        );
    }

    public function test_contato_inexistente_retorna_404(): void
    {
        $this->get('/contatos/999/historico')->assertNotFound();
    }
}
