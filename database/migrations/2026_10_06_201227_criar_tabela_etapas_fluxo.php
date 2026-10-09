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
        Schema::create('etapas_fluxo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fluxo_id')->constrained('fluxos')->cascadeOnDelete();
            $table->unsignedInteger('ordem');
            $table->text('texto');
            $table->unsignedInteger('pausa_segundos')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('etapas_fluxo');
    }
};
