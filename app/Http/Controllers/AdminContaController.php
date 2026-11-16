<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\ExecucaoFluxo;
use App\Models\LogSistema;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminContaController extends Controller
{
    /**
     * Suspende uma conta de cliente e invalida as sessões dos seus usuários.
     * O ator da ação vem exclusivamente da sessão autenticada.
     */
    public function suspender(Request $request, Account $account): RedirectResponse
    {
        $dados = $request->validate([
            'motivo' => ['required', 'string', 'max:1000'],
            'administrador_responsavel_id' => ['nullable', 'integer', Rule::in($this->idsAdministradores())],
        ], [
            'motivo.required' => 'Informe o motivo da suspensão.',
            'motivo.max' => 'O motivo deve ter no máximo 1000 caracteres.',
            'administrador_responsavel_id.in' => 'Selecione um administrador responsável válido.',
        ]);

        DB::transaction(function () use ($request, $account, $dados): void {
            $conta = Account::query()->whereKey($account->id)->lockForUpdate()->firstOrFail();

            if ($conta->estaSuspensa()) {
                throw ValidationException::withMessages([
                    'conta' => 'Esta conta já está suspensa.',
                ]);
            }

            if ($conta->user?->isAdministradorPlataforma() === true) {
                throw ValidationException::withMessages([
                    'conta' => 'A conta do administrador da plataforma não pode ser suspensa.',
                ]);
            }

            $conta->update([
                'suspensa' => true,
                'suspensa_em' => now(),
                'motivo_suspensao' => trim($dados['motivo']),
                'suspensa_por' => $request->user()->id,
                'administrador_responsavel_id' => $dados['administrador_responsavel_id'] ?? null,
            ]);

            $execucoesEncerradas = ExecucaoFluxo::query()
                ->where('account_id', $conta->id)
                ->whereNull('concluida_em')
                ->update(['concluida_em' => now()]);

            $this->invalidarSessoesDaConta($conta);

            LogSistema::create([
                'account_id' => $conta->id,
                'evento' => 'conta_suspensa',
                'descricao' => "Conta {$conta->id} suspensa pelo administrador {$request->user()->id}",
            ]);

            if ($execucoesEncerradas > 0) {
                LogSistema::create([
                    'account_id' => $conta->id,
                    'evento' => 'fluxo_encerrado_conta_suspensa',
                    'descricao' => "{$execucoesEncerradas} execução(ões) encerrada(s) pela suspensão da conta",
                ]);
            }
        });

        return redirect()->route('admin.convites.index')
            ->with('mensagem', 'Conta suspensa. O acesso e as automações foram interrompidos.');
    }

    /**
     * Reativa uma conta suspensa. O ator da ação vem exclusivamente da sessão.
     */
    public function reativar(Request $request, Account $account): RedirectResponse
    {
        $dados = $request->validate([
            'administrador_responsavel_id' => ['nullable', 'integer', Rule::in($this->idsAdministradores())],
        ], [
            'administrador_responsavel_id.in' => 'Selecione um administrador responsável válido.',
        ]);

        DB::transaction(function () use ($request, $account, $dados): void {
            $conta = Account::query()->whereKey($account->id)->lockForUpdate()->firstOrFail();

            if (! $conta->estaSuspensa()) {
                throw ValidationException::withMessages([
                    'conta' => 'Esta conta já está ativa.',
                ]);
            }

            $atributos = [
                'suspensa' => false,
                'reativada_em' => now(),
                'reativada_por' => $request->user()->id,
            ];

            if (array_key_exists('administrador_responsavel_id', $dados)) {
                $atributos['administrador_responsavel_id'] = $dados['administrador_responsavel_id'] ?? null;
            }

            $conta->update($atributos);

            LogSistema::create([
                'account_id' => $conta->id,
                'evento' => 'conta_reativada',
                'descricao' => "Conta {$conta->id} reativada pelo administrador {$request->user()->id}",
            ]);
        });

        return redirect()->route('admin.convites.index')
            ->with('mensagem', 'Conta reativada com sucesso.');
    }

    /**
     * @return list<string>
     */
    private function idsAdministradores(): array
    {
        $emails = config('flowchat.administradores_plataforma', []);

        if ($emails === []) {
            return [];
        }

        return User::query()
            ->whereIn(DB::raw('LOWER(email)'), $emails)
            ->pluck('id')
            ->map(fn (mixed $id): string => (string) $id)
            ->all();
    }

    private function invalidarSessoesDaConta(Account $conta): void
    {
        $utilizadores = User::query()->where('account_id', $conta->id)->get();

        if ($utilizadores->isEmpty()) {
            return;
        }

        DB::table('sessions')->whereIn('user_id', $utilizadores->pluck('id'))->delete();

        // Invalida também cookies "lembrar-me" antigos.
        $utilizadores->each(function (User $utilizador): void {
            $utilizador->setRememberToken(Str::random(60));
            $utilizador->save();
        });
    }
}
