<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Registra quando o contato enviou a última mensagem. A Meta só aceita
     * mensagem livre até 24 horas depois desse instante; a coluna é opcional
     * porque conversas antigas ainda não têm o dado (backfill separado).
     */
    public function up(): void
    {
        Schema::table('contatos', function (Blueprint $table) {
            $table->timestamp('ultima_mensagem_recebida_em')->nullable()->after('nome');
            $table->index('ultima_mensagem_recebida_em');
        });
    }

    /**
     * Reverte a coluna e o índice da janela de 24 horas.
     */
    public function down(): void
    {
        Schema::table('contatos', function (Blueprint $table) {
            $table->dropIndex(['ultima_mensagem_recebida_em']);
            $table->dropColumn('ultima_mensagem_recebida_em');
        });
    }
};
