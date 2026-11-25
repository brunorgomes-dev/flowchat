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
        Schema::table('regras_inicio_fluxo', function (Blueprint $table) {
            $table->string('ad_id', 64)->nullable()->unique();
        });

        Schema::table('origens_contato', function (Blueprint $table) {
            $table->timestamp('associada_em')->nullable();
            $table->boolean('contato_criado_pela_origem')->default(false);
            $table->index(
                ['account_id', 'contato_id', 'categoria', 'associada_em'],
                'origens_contato_assoc_lookup_index',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('origens_contato', function (Blueprint $table) {
            $table->dropIndex('origens_contato_assoc_lookup_index');
            $table->dropColumn(['associada_em', 'contato_criado_pela_origem']);
        });

        Schema::table('regras_inicio_fluxo', function (Blueprint $table) {
            $table->dropUnique(['ad_id']);
            $table->dropColumn('ad_id');
        });
    }
};
