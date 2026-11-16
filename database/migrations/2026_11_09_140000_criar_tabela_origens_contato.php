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
        Schema::create('origens_contato', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('accounts')->restrictOnDelete();
            $table->foreignId('contato_id')->constrained('contatos')->cascadeOnDelete();
            // Evento do webhook que trouxe a referência: referral ou postback
            $table->string('evento', 20);
            // anuncio, link ou outro
            $table->string('categoria', 20)->default('outro');
            $table->string('source', 30)->nullable();
            $table->string('type', 30)->nullable();
            $table->string('referencia', 255)->nullable();
            $table->string('referer_uri', 2048)->nullable();
            $table->string('ad_id', 64)->nullable();
            $table->string('ad_title', 255)->nullable();
            $table->string('post_id', 64)->nullable();
            $table->string('product_id', 64)->nullable();
            $table->string('flow_id', 64)->nullable();
            $table->text('photo_url')->nullable();
            $table->text('video_url')->nullable();
            $table->text('mensagem_inicial')->nullable();
            // Preserva o objeto referral exatamente como recebido, para auditoria
            $table->json('dados_brutos')->nullable();
            $table->timestamps();

            $table->index(['account_id', 'ad_id'], 'origens_contato_account_id_ad_id_index');
            $table->index(['contato_id', 'created_at'], 'origens_contato_contato_id_created_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('origens_contato');
    }
};
