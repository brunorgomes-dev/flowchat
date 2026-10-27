<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('regras_inicio_fluxo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fluxo_id')->constrained('fluxos')->cascadeOnDelete();
            $table->string('gatilho'); // novo_contato | mensagem_recebida
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->unique(['fluxo_id', 'gatilho']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('regras_inicio_fluxo');
    }
};
