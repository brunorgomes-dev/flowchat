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
        Schema::table('accounts', function (Blueprint $table): void {
            $table->boolean('suspensa')->default(false)->after('timezone_confirmado');
            $table->timestamp('suspensa_em')->nullable()->after('suspensa');
            $table->text('motivo_suspensao')->nullable()->after('suspensa_em');
            $table->foreignId('suspensa_por')
                ->nullable()
                ->after('motivo_suspensao')
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('reativada_em')->nullable()->after('suspensa_por');
            $table->foreignId('reativada_por')
                ->nullable()
                ->after('reativada_em')
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('administrador_responsavel_id')
                ->nullable()
                ->after('reativada_por')
                ->constrained('users')
                ->nullOnDelete();
            $table->index('suspensa', 'accounts_suspensa_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table): void {
            $table->dropIndex('accounts_suspensa_index');
            $table->dropConstrainedForeignId('administrador_responsavel_id');
            $table->dropConstrainedForeignId('reativada_por');
            $table->dropConstrainedForeignId('suspensa_por');
            $table->dropColumn(['suspensa', 'suspensa_em', 'motivo_suspensao', 'reativada_em']);
        });
    }
};
