<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('convites', function (Blueprint $table): void {
            $table->id();
            $table->string('email');
            $table->char('token_hash', 64)->unique();
            $table->foreignId('emitido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('resgatado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expira_em')->index();
            $table->timestamp('resgatado_em')->nullable();
            $table->timestamp('revogado_em')->nullable();
            $table->timestamps();

            $table->index(['email', 'resgatado_em', 'revogado_em'], 'convites_email_estado_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('convites');
    }
};
