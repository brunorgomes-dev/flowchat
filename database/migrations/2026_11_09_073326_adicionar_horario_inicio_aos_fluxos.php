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
        Schema::table('fluxos', function (Blueprint $table) {
            $table->boolean('horario_inicio_ativo')->default(false)->after('ativo');
            $table->time('horario_inicio')->nullable()->after('horario_inicio_ativo');
            $table->time('horario_fim')->nullable()->after('horario_inicio');
            // Comportamento fora da janela: 'nao_iniciar' ou 'aguardar'
            $table->string('fora_horario', 20)->default('nao_iniciar')->after('horario_fim');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fluxos', function (Blueprint $table) {
            $table->dropColumn(['horario_inicio_ativo', 'horario_inicio', 'horario_fim', 'fora_horario']);
        });
    }
};
