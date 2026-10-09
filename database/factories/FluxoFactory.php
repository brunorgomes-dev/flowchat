<?php

namespace Database\Factories;

use App\Models\Fluxo;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Fluxo>
 */
class FluxoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nome' => 'Fluxo '.fake()->word(),
            'ativo' => true,
        ];
    }
}
