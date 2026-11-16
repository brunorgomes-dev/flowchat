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
            // mensagem ou condicao_horario; etapas existentes continuam sequenciais
            $table->string('tipo', 30)->default('mensagem')->after('ordem');
            // Destino da saída NÃO; null encerra a execução
            $table->unsignedInteger('destino_nao_ordem')->nullable()->after('pausa_segundos');
            // Encerra o fluxo após esta etapa, permitindo ramos independentes
            $table->boolean('encerra_apos')->default(false)->after('destino_nao_ordem');
        });

        Schema::create('condicoes_horario_etapa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('etapa_fluxo_id')->constrained('etapas_fluxo')->cascadeOnDelete();
            $table->unsignedInteger('ordem');
            $table->time('inicio');
            $table->time('fim');
            // Ordem da etapa de destino no mesmo fluxo
            $table->unsignedInteger('destino_ordem');
            $table->timestamps();

            $table->unique(['etapa_fluxo_id', 'ordem'], 'condicoes_horario_etapa_etapa_ordem_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('condicoes_horario_etapa');

        Schema::table('etapas_fluxo', function (Blueprint $table) {
            $table->dropColumn(['tipo', 'destino_nao_ordem', 'encerra_apos']);
        });
    }
};
