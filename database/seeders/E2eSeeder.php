<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class E2eSeeder extends Seeder
{
    /**
     * Cria o minimo para a fumaca de navegacao. Recusa rodar fora do banco e2e.
     */
    public function run(): void
    {
        $conexao = config('database.default');
        $banco = config("database.connections.{$conexao}.database");

        $caminhoNormalizado = is_string($banco) ? str_replace('\\', '/', $banco) : '';

        if (! str_ends_with($caminhoNormalizado, 'e2e.sqlite')) {
            throw new RuntimeException(
                'E2eSeeder recusou rodar: o banco atual nao termina em e2e.sqlite.'
            );
        }

        $utilizador = User::factory()->create([
            'name' => 'Cliente E2E',
            'email' => 'e2e@example.test',
            'password' => 'senha-e2e',
        ]);

        $conta = $utilizador->account;
        $conta->update([
            'name' => 'Conta E2E',
            'timezone' => 'America/Sao_Paulo',
            'timezone_confirmado' => true,
        ]);

        $contato = $conta->contatos()->create([
            'psid' => 'psid-e2e',
            'nome' => 'Contato E2E',
            'ultima_mensagem_recebida_em' => now(),
        ]);

        $contato->mensagens()->create([
            'direcao' => 'recebida',
            'texto' => 'Ola, teste E2E',
            'tipo_conteudo' => 'texto',
        ]);

        $fluxo = $conta->fluxos()->create([
            'nome' => 'Fluxo E2E',
            'ativo' => true,
        ]);

        $fluxo->etapas()->create([
            'ordem' => 1,
            'texto' => 'Boas-vindas E2E',
            'pausa_segundos' => 0,
        ]);

        $fluxo->regras()->create([
            'gatilho' => 'mensagem_recebida',
            'ativo' => true,
        ]);
    }
}
