<?php

namespace Database\Seeders;

use App\Models\Fluxo;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $fluxo = Fluxo::create(['nome' => 'Boas-vindas', 'ativo' => true]);
        $fluxo->etapas()->createMany([
            ['ordem' => 1, 'texto' => 'Olá! Bem-vindo ao FlowChat.', 'pausa_segundos' => 5],
            ['ordem' => 2, 'texto' => 'Em que podemos ajudar hoje?', 'pausa_segundos' => 0],
        ]);
    }
}
