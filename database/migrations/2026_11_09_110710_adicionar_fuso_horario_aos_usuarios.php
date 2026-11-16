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
        Schema::table('users', function (Blueprint $table) {
            // Identificador IANA do fuso horário da conta (ex.: America/Sao_Paulo).
            // Nulo significa "não detectado/não configurado": nunca assumimos
            // um padrão silenciosamente quando a detecção falha.
            $table->string('timezone', 64)->nullable()->after('password');
            // Estado da configuração: false = detectado aguardando confirmação
            // (ou ausente); true = confirmado explicitamente pelo usuário.
            $table->boolean('timezone_confirmado')->default(false)->after('timezone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['timezone', 'timezone_confirmado']);
        });
    }
};
