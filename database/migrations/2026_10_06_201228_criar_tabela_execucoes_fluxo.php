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
        Schema::create('execucoes_fluxo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contato_id')->constrained('contatos')->cascadeOnDelete();
            $table->foreignId('fluxo_id')->constrained('fluxos')->cascadeOnDelete();
            $table->unsignedInteger('etapa_atual')->default(1);
            $table->timestamp('concluida_em')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('execucoes_fluxo');
    }
};
