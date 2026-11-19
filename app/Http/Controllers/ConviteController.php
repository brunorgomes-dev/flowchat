<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Convite;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ConviteController extends Controller
{
    public function index(Request $request): Response
    {
        $contas = Account::query()
            ->with(['user:id,name,email,account_id,last_login_at', 'administradorResponsavel:id,name,email'])
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString();

        $contas->getCollection()->transform(fn (Account $conta): array => [
            'id' => $conta->id,
            'nome' => $conta->name,
            'email' => $conta->user?->email,
            'criado_em' => $conta->created_at?->toIso8601String(),
            'ultimo_acesso' => $conta->user?->last_login_at?->toIso8601String(),
            'estado' => $conta->estaSuspensa() ? 'suspensa' : 'ativa',
            'suspensa_em' => $conta->suspensa_em?->toIso8601String(),
            'motivo_suspensao' => $conta->motivo_suspensao,
            'reativada_em' => $conta->reativada_em?->toIso8601String(),
            'administrador_responsavel' => $conta->administradorResponsavel === null
                ? null
                : [
                    'id' => $conta->administradorResponsavel->id,
                    'name' => $conta->administradorResponsavel->name,
                    'email' => $conta->administradorResponsavel->email,
                ],
        ]);

        $emailsAdministradores = config('flowchat.administradores_plataforma', []);
        $administradores = $emailsAdministradores === []
            ? collect()
            : User::query()
                ->whereIn(DB::raw('LOWER(email)'), $emailsAdministradores)
                ->orderBy('name')
                ->get(['id', 'name', 'email'])
                ->map(fn (User $utilizador): array => [
                    'id' => $utilizador->id,
                    'name' => $utilizador->name,
                    'email' => $utilizador->email,
                ])
                ->values();

        return Inertia::render('V2/AdminContas', [
            'contas' => $contas,
            'administradores' => $administradores,
        ]);
    }

    public function criar(Request $request): Response
    {
        $convites = Convite::query()
            ->with(['emissor:id,name,email'])
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (Convite $convite): array => [
                'id' => $convite->id,
                'email' => $convite->email,
                'expira_em' => $convite->expira_em->toIso8601String(),
                'resgatado_em' => $convite->resgatado_em?->toIso8601String(),
                'revogado_em' => $convite->revogado_em?->toIso8601String(),
                'criado_em' => $convite->created_at->toIso8601String(),
                'estado' => $convite->resgatado_em !== null
                    ? 'resgatado'
                    : ($convite->revogado_em !== null
                        ? 'revogado'
                        : ($convite->disponivel() ? 'pendente' : 'expirado')),
                'emissor' => $convite->emissor === null
                    ? null
                    : [
                        'id' => $convite->emissor->id,
                        'name' => $convite->emissor->name,
                        'email' => $convite->emissor->email,
                    ],
            ]);

        return Inertia::render('V2/AdminConvites', [
            'convites' => $convites,
            'linkConvite' => $request->session()->get('link_convite'),
        ]);
    }

    public function emitir(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ], [
            'email.required' => 'Informe o email que receberá o convite.',
            'email.email' => 'Informe um endereço de email válido.',
        ]);

        $email = mb_strtolower(trim($dados['email']));

        if (User::query()->whereRaw('LOWER(email) = ?', [$email])->exists()) {
            throw ValidationException::withMessages([
                'email' => 'Este email já possui uma conta no FlowChat.',
            ]);
        }

        $token = Str::random(64);
        $convite = DB::transaction(function () use ($email, $request, $token): Convite {
            Convite::query()
                ->whereRaw('LOWER(email) = ?', [$email])
                ->whereNull('resgatado_em')
                ->whereNull('revogado_em')
                ->where('expira_em', '>', now())
                ->update(['revogado_em' => now()]);

            return Convite::create([
                'email' => $email,
                'token_hash' => hash('sha256', $token),
                'emitido_por' => $request->user()->id,
                'expira_em' => now()->addDays(7),
            ]);
        });

        return redirect()->route('admin.convites.create')->with(
            'link_convite',
            route('convites.aceitar', ['token' => $token]),
        );
    }

    public function aceitar(string $token): Response
    {
        $convite = $this->conviteValido($token);

        return Inertia::render('V2/Cadastro', [
            'convite' => ['email' => $convite->email],
            'urlCadastro' => route('convites.registrar', ['token' => $token]),
        ]);
    }

    public function registrar(Request $request, string $token): RedirectResponse
    {
        $dados = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'name.required' => 'Informe o seu nome.',
            'password.min' => 'A senha deve ter pelo menos 8 caracteres.',
            'password.confirmed' => 'A confirmação da senha não coincide.',
        ]);

        $utilizador = DB::transaction(function () use ($dados, $token): User {
            $convite = Convite::query()
                ->where('token_hash', hash('sha256', $token))
                ->lockForUpdate()
                ->first();

            if ($convite === null || ! $convite->disponivel()) {
                abort(404);
            }

            if (User::query()->whereRaw('LOWER(email) = ?', [$convite->email])->exists()) {
                throw ValidationException::withMessages([
                    'email' => 'Este convite não está mais disponível.',
                ]);
            }

            $conta = Account::create(['name' => $dados['name']]);
            $utilizador = User::create([
                'account_id' => $conta->id,
                'name' => $dados['name'],
                'email' => $convite->email,
                'password' => $dados['password'],
            ]);

            $convite->update([
                'resgatado_por' => $utilizador->id,
                'resgatado_em' => now(),
            ]);

            return $utilizador;
        });

        Auth::login($utilizador);
        $request->session()->regenerate();
        $request->session()->flash('fuso_confirmar', true);

        return redirect()->route('pagina-inicial');
    }

    public function revogar(Convite $convite): RedirectResponse
    {
        // Atualização condicional: não sobrescreve um convite que foi
        // resgatado ou revogado entre a leitura e a gravação.
        Convite::query()
            ->whereKey($convite->id)
            ->whereNull('resgatado_em')
            ->whereNull('revogado_em')
            ->update(['revogado_em' => now()]);

        return redirect()->route('admin.convites.create')->with('mensagem', 'Convite revogado.');
    }

    private function conviteValido(string $token): Convite
    {
        $convite = Convite::query()
            ->where('token_hash', hash('sha256', $token))
            ->first();

        abort_unless(
            $convite !== null
                && $convite->disponivel()
                && ! User::query()->whereRaw('LOWER(email) = ?', [$convite->email])->exists(),
            404,
        );

        return $convite;
    }
}
