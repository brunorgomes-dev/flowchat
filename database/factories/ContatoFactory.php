<?php

namespace Database\Factories;

use App\Models\Contato;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Contato>
 */
class ContatoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'psid' => 'psid_'.fake()->unique()->numberBetween(100000, 999999),
            'nome' => fake()->name(),
        ];
    }
}
