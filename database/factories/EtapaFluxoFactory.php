<?php

namespace Database\Factories;

use App\Models\EtapaFluxo;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EtapaFluxo>
 */
class EtapaFluxoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'ordem' => 1,
            'texto' => 'Mensagem '.fake()->sentence(),
            'pausa_segundos' => 0,
        ];
    }
}
