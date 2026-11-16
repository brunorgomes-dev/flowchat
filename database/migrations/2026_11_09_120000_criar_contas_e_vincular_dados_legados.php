<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tabelasComDadosLegados = [
            'contatos',
            'fluxos',
            'logs',
            'execucoes_fluxo',
            'agendamentos',
        ];
        $usuarios = DB::table('users')->orderBy('id')->get([
            'id',
            'name',
            'timezone',
            'timezone_confirmado',
        ]);
        $haDadosLegados = false;

        foreach ($tabelasComDadosLegados as $tabela) {
            if (DB::table($tabela)->exists()) {
                $haDadosLegados = true;
                break;
            }
        }

        $usuarioLegadoId = $usuarios->count() === 1
            ? (int) $usuarios->first()->id
            : (int) env('FLOWCHAT_LEGACY_USER_ID', 0);

        if ($usuarios->count() > 1 && $haDadosLegados
            && ($usuarioLegadoId === 0 || ! $usuarios->contains(fn ($usuario): bool => (int) $usuario->id === $usuarioLegadoId))) {
            throw new RuntimeException(
                'A migration de contas encontrou vários usuários e dados legados sem proprietário definido. '
                .'Defina FLOWCHAT_LEGACY_USER_ID com o ID do único usuário responsável pelos dados legados.'
            );
        }

        if ($usuarios->isEmpty() && $haDadosLegados) {
            throw new RuntimeException(
                'A migration de contas encontrou dados legados sem usuário proprietário. '
                .'Defina uma conta responsável antes de executar esta migration.'
            );
        }

        if (Schema::hasTable('accounts')) {
            throw new RuntimeException(
                'A tabela accounts já existe, mas esta migration ainda não foi registrada. '
                .'Verifique se houve uma execução parcial antes de continuar.'
            );
        }

        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('timezone', 64)->nullable();
            $table->boolean('timezone_confirmado')->default(false);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('account_id')
                ->nullable()
                ->after('id')
                ->constrained('accounts')
                ->restrictOnDelete();
            $table->unique('account_id', 'users_account_id_unique');
        });

        Schema::table('contatos', function (Blueprint $table) {
            $table->dropUnique('contatos_psid_unique');
            $table->foreignId('account_id')
                ->nullable()
                ->after('id')
                ->constrained('accounts')
                ->restrictOnDelete();
            $table->unique(['account_id', 'psid'], 'contatos_account_id_psid_unique');
        });

        foreach (['fluxos', 'logs', 'execucoes_fluxo', 'agendamentos'] as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->foreignId('account_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('accounts')
                    ->restrictOnDelete();
            });
        }

        $contasPorUsuario = [];

        foreach ($usuarios as $usuario) {
            $agora = now();
            $contaId = DB::table('accounts')->insertGetId([
                'name' => $usuario->name,
                'timezone' => $usuario->timezone,
                'timezone_confirmado' => (bool) $usuario->timezone_confirmado,
                'created_at' => $agora,
                'updated_at' => $agora,
            ]);

            DB::table('users')->where('id', $usuario->id)->update([
                'account_id' => $contaId,
            ]);

            $contasPorUsuario[$usuario->id] = $contaId;
        }

        if ($haDadosLegados && $usuarioLegadoId > 0) {
            $contaLegadaId = $contasPorUsuario[$usuarioLegadoId];

            foreach ($tabelasComDadosLegados as $tabela) {
                DB::table($tabela)->whereNull('account_id')->update([
                    'account_id' => $contaLegadaId,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $haPsidsDuplicados = DB::table('contatos')
            ->select('psid')
            ->groupBy('psid')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($haPsidsDuplicados) {
            throw new RuntimeException(
                'Não é possível reverter a migration de contas porque existem PSIDs repetidos entre contas.'
            );
        }

        if (Schema::hasTable('accounts') && Schema::hasColumn('users', 'account_id')) {
            DB::table('users')
                ->join('accounts', 'users.account_id', '=', 'accounts.id')
                ->update([
                    'users.timezone' => DB::raw('accounts.timezone'),
                    'users.timezone_confirmado' => DB::raw('accounts.timezone_confirmado'),
                ]);
        }

        Schema::table('agendamentos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('account_id');
        });

        Schema::table('execucoes_fluxo', function (Blueprint $table) {
            $table->dropConstrainedForeignId('account_id');
        });

        Schema::table('logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('account_id');
        });

        Schema::table('fluxos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('account_id');
        });

        Schema::table('contatos', function (Blueprint $table) {
            $table->dropUnique('contatos_account_id_psid_unique');
            $table->dropConstrainedForeignId('account_id');
            $table->unique('psid');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_account_id_unique');
            $table->dropConstrainedForeignId('account_id');
        });

        Schema::dropIfExists('accounts');
    }
};
