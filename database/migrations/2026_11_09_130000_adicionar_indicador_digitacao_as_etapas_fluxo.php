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
        Schema::table('etapas_fluxo', function (Blueprint $table) {
            $table->boolean('indicador_digitacao_ativo')->default(false)->after('pausa_segundos');
            // A Send API mantém o indicador por até 20 segundos; valores fora
            // desse intervalo são rejeitados pela validação da aplicação.
            $table->unsignedSmallInteger('indicador_digitacao_segundos')->default(2)->after('indicador_digitacao_ativo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('etapas_fluxo', function (Blueprint $table) {
            $table->dropColumn(['indicador_digitacao_ativo', 'indicador_digitacao_segundos']);
        });
    }
};
