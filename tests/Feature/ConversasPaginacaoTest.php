<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class ConversasPaginacaoTest extends TestCase
{
    public function test_lista_de_conversas_e_paginada_com_ordem_estavel(): void
    {
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;

        foreach (range(1, 30) as $indice) {
            $contato = $conta->contatos()->create([
                'psid' => 'PAGINA-'.str_pad((string) $indice, 2, '0', STR_PAD_LEFT),
                'nome' => 'Contato '.str_pad((string) $indice, 2, '0', STR_PAD_LEFT),
            ]);
            $contato->mensagens()->create([
                'direcao' => 'recebida',
                'texto' => 'Mensagem '.str_pad((string) $indice, 2, '0', STR_PAD_LEFT),
            ]);
        }

        $this->actingAs($utilizador)
            ->get('/conversas')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->component('V2/Conversas')
                ->has('conversas.data', 25)
                ->where('conversas.total', 30)
                ->where('conversas.current_page', 1)
                ->where('conversas.last_page', 2));

        $this->actingAs($utilizador)
            ->get('/conversas?page=2')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->has('conversas.data', 5)
                ->where('conversas.current_page', 2));
    }

    public function test_busca_e_filtro_sao_aplicados_no_servidor(): void
    {
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;

        $encontrado = $conta->contatos()->create(['psid' => 'BUSCA-01', 'nome' => 'Mariana Pesquisa']);
        $encontrado->mensagens()->create(['direcao' => 'recebida', 'texto' => 'Mensagem sobre orçamento']);

        $conta->contatos()->create(['psid' => 'BUSCA-02', 'nome' => 'Outro Contato'])
            ->mensagens()->create(['direcao' => 'recebida', 'texto' => 'Assunto diferente']);

        $this->actingAs($utilizador)
            ->get('/conversas?busca=Mariana')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->has('conversas.data', 1)
                ->where('conversas.data.0.nome', 'Mariana Pesquisa'));

        $this->actingAs($utilizador)
            ->get('/conversas?busca=orçamento')
            ->assertOk()
            ->assertInertia(fn ($pagina) => $pagina
                ->has('conversas.data', 1)
                ->where('conversas.data.0.nome', 'Mariana Pesquisa'));
    }

    public function test_historico_incremental_retorna_paginas_anteriores(): void
    {
        $utilizador = User::factory()->create();
        $conta = $utilizador->account;

        $contato = $conta->contatos()->create(['psid' => 'HIST-01', 'nome' => 'Histórico']);
        foreach (range(1, 35) as $indice) {
            $contato->mensagens()->create([
                'direcao' => 'recebida',
                'texto' => 'Mensagem '.str_pad((string) $indice, 2, '0', STR_PAD_LEFT),
            ]);
        }

        $primeiraPagina = $this->actingAs($utilizador)
            ->getJson("/contatos/{$contato->id}/mensagens")
            ->assertOk()
            ->json();

        $this->assertCount(30, $primeiraPagina['mensagens']);
        $this->assertTrue($primeiraPagina['tem_mais']);
        $this->assertSame(6, $primeiraPagina['mensagens'][0]['id']);

        $segundaPagina = $this->actingAs($utilizador)
            ->getJson("/contatos/{$contato->id}/mensagens?antes=6")
            ->assertOk()
            ->json();

        $this->assertCount(5, $segundaPagina['mensagens']);
        $this->assertFalse($segundaPagina['tem_mais']);
        $this->assertSame(1, $segundaPagina['mensagens'][0]['id']);
    }
}
