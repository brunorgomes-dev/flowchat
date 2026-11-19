<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CadastroController extends Controller
{
    /**
     * Página de criação de conta.
     */
    public function criar(): Response
    {
        abort_unless(config('flowchat.cadastro_publico'), 404);

        return Inertia::render('V2/Cadastro');
    }

    /**
     * Registra uma nova conta e inicia a sessão automaticamente. O fuso
     * horário não é pedido aqui: após o cadastro, o usuário recebe um modal
     * de confirmação com o fuso detectado no navegador.
     */
    public function registrar(Request $request): RedirectResponse
    {
        abort_unless(config('flowchat.cadastro_publico'), 404);

        // Limita a criação de contas por endereço de origem
        // (10 contas por janela de 1 hora)
        $chave = 'cadastro:'.$request->ip();

        if (RateLimiter::tooManyAttempts($chave, 10)) {
            $segundos = RateLimiter::availableIn($chave);

            throw ValidationException::withMessages([
                'email' => 'Muitas tentativas de cadastro. Tente novamente em '.ceil($segundos / 60).' minuto(s).',
            ]);
        }

        $dados = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'name.required' => 'Informe o seu nome.',
            'email.required' => 'Informe o seu email.',
            'email.email' => 'Informe um endereço de email válido.',
            'email.unique' => 'Este email já tem uma conta registrada.',
            'password.required' => 'Informe uma senha.',
            'password.min' => 'A senha deve ter pelo menos 8 caracteres.',
            'password.confirmed' => 'A confirmação da senha não coincide.',
        ]);

        RateLimiter::hit($chave, 3600);

        // Conta e usuário são criados juntos quando a estrutura já está disponível.
        $utilizador = DB::transaction(function () use ($dados): User {
            $atributos = [
                'name' => $dados['name'],
                'email' => $dados['email'],
                'password' => $dados['password'],
            ];

            if (Schema::hasTable('accounts') && Schema::hasColumn('users', 'account_id')) {
                $conta = Account::create(['name' => $dados['name']]);
                $atributos['account_id'] = $conta->id;
            }

            // O hash seguro da senha é aplicado pelo cast "hashed" do model User
            return User::create($atributos);
        });

        Auth::login($utilizador);

        $request->session()->regenerate();

        // Abre o modal de confirmação do fuso horário ao chegar na dashboard
        $request->session()->flash('fuso_confirmar', true);

        return redirect()->route('pagina-inicial');
    }
}
