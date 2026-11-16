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
            $table->string('tipo_conteudo', 20)->default('texto')->after('texto');
            $table->string('anexo_caminho', 512)->nullable()->after('tipo_conteudo');
            $table->string('anexo_nome_original', 255)->nullable()->after('anexo_caminho');
            $table->string('anexo_mime', 100)->nullable()->after('anexo_nome_original');
            $table->unsignedBigInteger('anexo_tamanho_bytes')->nullable()->after('anexo_mime');
            // Cached reusable attachment id from the Page that uploaded it.
            $table->string('anexo_attachment_id', 64)->nullable()->after('anexo_tamanho_bytes');
            $table->string('anexo_attachment_page_id', 64)->nullable()->after('anexo_attachment_id');
            $table->timestamp('anexo_attachment_expira_em')->nullable()->after('anexo_attachment_page_id');

            $table->index('anexo_caminho', 'etapas_fluxo_anexo_caminho_index');
        });

        Schema::table('mensagens', function (Blueprint $table) {
            $table->string('tipo_conteudo', 20)->default('texto')->after('texto');
            $table->string('anexo_caminho', 512)->nullable()->after('tipo_conteudo');
            $table->string('anexo_nome_original', 255)->nullable()->after('anexo_caminho');
            $table->string('anexo_mime', 100)->nullable()->after('anexo_nome_original');
            $table->unsignedBigInteger('anexo_tamanho_bytes')->nullable()->after('anexo_mime');

            $table->index('anexo_caminho', 'mensagens_anexo_caminho_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mensagens', function (Blueprint $table) {
            $table->dropIndex('mensagens_anexo_caminho_index');
            $table->dropColumn([
                'tipo_conteudo',
                'anexo_caminho',
                'anexo_nome_original',
                'anexo_mime',
                'anexo_tamanho_bytes',
            ]);
        });

        Schema::table('etapas_fluxo', function (Blueprint $table) {
            $table->dropIndex('etapas_fluxo_anexo_caminho_index');
            $table->dropColumn([
                'tipo_conteudo',
                'anexo_caminho',
                'anexo_nome_original',
                'anexo_mime',
                'anexo_tamanho_bytes',
                'anexo_attachment_id',
                'anexo_attachment_page_id',
                'anexo_attachment_expira_em',
            ]);
        });
    }
};
