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
        Schema::create('agendamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fluxo_id')->constrained('fluxos')->cascadeOnDelete();
            $table->foreignId('contato_id')->constrained('contatos')->cascadeOnDelete();
            $table->dateTime('executar_em');
            $table->string('estado')->default('pendente');
            $table->timestamps();
            $table->index(['estado', 'executar_em']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agendamentos');
    }
};
