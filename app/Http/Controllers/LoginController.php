<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Design;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LoginController extends Controller
{
    private const MAX_SESSOES_ATIVAS = 2;

    /**
     * Página de entrada da conta.
     */
    public function criar(): Response
    {
        return Inertia::render(Design::componente('V2/Login', 'Login'));
    }

    /**
     * Valida as credenciais e inicia a sessão do utilizador.
     */
    public function entrar(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ], [
            'email.required' => 'Informe o seu email.',
            'email.email' => 'Informe um endereço de email válido.',
            'password.required' => 'Informe a sua senha.',
        ]);

        // Limita tentativas por credencial e por endereço de origem
        // (5 tentativas falhadas por janela de 5 minutos)
        $chave = 'login:'.mb_strtolower($dados['email']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($chave, 5)) {
            $segundos = RateLimiter::availableIn($chave);

            throw ValidationException::withMessages([
                'email' => 'Muitas tentativas de entrada. Tente novamente em '.ceil($segundos / 60).' minuto(s).',
            ]);
        }

        $credenciais = ['email' => $dados['email'], 'password' => $dados['password']];

        if (! Auth::validate($credenciais)) {
            RateLimiter::hit($chave, 300);

            throw ValidationException::withMessages([
                'email' => 'Estas credenciais não correspondem a uma conta.',
            ]);
        }

        RateLimiter::clear($chave);

        $utilizador = User::where('email', $dados['email'])->firstOrFail();

        if ($this->contaSuspensa($utilizador)) {
            RateLimiter::clear($chave);

            return redirect()->route('conta.suspensa');
        }

        $precisaSubstituir = DB::transaction(function () use ($utilizador, $request): bool {
            User::whereKey($utilizador->id)->lockForUpdate()->firstOrFail();
            if ($this->sessoesAtivas($utilizador->id)->count() >= self::MAX_SESSOES_ATIVAS) {
                return true;
            }

            Auth::login($utilizador, $request->boolean('lembrar'));
            $request->session()->regenerate();
            $request->session()->save();

            $utilizador->forceFill(['last_login_at' => now()])->save();

            return false;
        });

        if ($precisaSubstituir) {
            $request->session()->put('login_pendente', [
                'user_id' => $utilizador->id,
                'lembrar' => $request->boolean('lembrar'),
                'expira_em' => now()->addMinutes(5)->timestamp,
            ]);

            return redirect()->route('login.sessoes');
        }

        return redirect()->intended(route('pagina-inicial'));
    }

    /**
     * Exibe as sessões atuais para que o usuário escolha qual substituir.
     */
    public function sessoes(Request $request): Response|RedirectResponse
    {
        $pendente = $request->session()->get('login_pendente');
        if (! is_array($pendente) || ($pendente['expira_em'] ?? 0) < now()->timestamp) {
            $request->session()->forget('login_pendente');

            return redirect()->route('login');
        }

        $utilizador = User::find((int) $pendente['user_id']);

        if ($utilizador === null || $this->contaSuspensa($utilizador)) {
            $request->session()->forget('login_pendente');

            return redirect()->route('conta.suspensa');
        }

        $sessoes = $this->sessoesAtivas((int) $pendente['user_id'])
            ->map(fn ($sessao): array => [
                // Nunca expõe o ID real da sessão na resposta Inertia.
                'id' => hash_hmac('sha256', $sessao->id, config('app.key')),
                'dispositivo' => $this->rotuloDispositivo($sessao->user_agent),
                'ip' => $sessao->ip_address,
                'ultimo_acesso' => now()->setTimestamp($sessao->last_activity)->diffForHumans(),
            ])->values();

        return Inertia::render(Design::componente('V2/SessoesLogin', 'SessoesLogin'), ['sessoes' => $sessoes]);
    }

    /**
     * Encerra uma sessão escolhida e conclui o login atual.
     */
    public function substituirSessao(Request $request, string $sessao): RedirectResponse
    {
        $pendente = $request->session()->get('login_pendente');
        if (! is_array($pendente) || ($pendente['expira_em'] ?? 0) < now()->timestamp) {
            $request->session()->forget('login_pendente');

            return redirect()->route('login');
        }

        $utilizador = User::findOrFail((int) $pendente['user_id']);

        if ($this->contaSuspensa($utilizador)) {
            $request->session()->forget('login_pendente');

            return redirect()->route('conta.suspensa');
        }

        DB::transaction(function () use ($utilizador, $sessao, $request, $pendente): void {
            User::whereKey($utilizador->id)->lockForUpdate()->firstOrFail();
            $ativas = $this->sessoesAtivas($utilizador->id);

            if ($ativas->count() >= self::MAX_SESSOES_ATIVAS) {
                $sessaoAlvo = $ativas->first(fn ($item): bool => hash_equals(
                    hash_hmac('sha256', $item->id, config('app.key')),
                    $sessao
                ));
                abort_if($sessaoAlvo === null, 404);
                DB::table('sessions')->where('user_id', $utilizador->id)->where('id', $sessaoAlvo->id)->delete();

                // Impede que o navegador removido volte a autenticar-se por
                // um cookie "lembrar-me" antigo. Sessões ainda abertas seguem válidas.
                $utilizador->setRememberToken(Str::random(60));
                $utilizador->save();
            }

            $request->session()->forget('login_pendente');
            Auth::login($utilizador, (bool) ($pendente['lembrar'] ?? false));
            $request->session()->regenerate();
            $request->session()->save();

            $utilizador->forceFill(['last_login_at' => now()])->save();
        });

        return redirect()->intended(route('pagina-inicial'));
    }

    public function cancelarLoginPendente(Request $request): RedirectResponse
    {
        $request->session()->forget('login_pendente');

        return redirect()->route('login');
    }

    /**
     * Termina a sessão de forma segura.
     */
    public function sair(Request $request): RedirectResponse
    {
        Auth::guard()->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Pede ao cliente para limpar a cache de histórico do Inertia na
        // próxima resposta; com a encriptação ativa, páginas privadas não
        // voltam a aparecer pelo botão voltar após a saída
        Inertia::clearHistory();

        return redirect()->route('login')->with('mensagem', 'A sua sessão foi encerrada com segurança.');
    }

    private function contaSuspensa(User $utilizador): bool
    {
        return ! $utilizador->isAdministradorPlataforma()
            && $utilizador->account?->estaSuspensa() === true;
    }

    private function sessoesAtivas(int $userId): Collection
    {
        return DB::table('sessions')
            ->where('user_id', $userId)
            ->where('last_activity', '>=', now()->subMinutes(config('session.lifetime'))->timestamp)
            ->orderByDesc('last_activity')
            ->get();
    }

    private function rotuloDispositivo(?string $userAgent): string
    {
        if (! is_string($userAgent) || $userAgent === '') {
            return 'Navegador desconhecido';
        }

        foreach (['Edge' => 'Edge', 'Edg/' => 'Edge', 'Firefox' => 'Firefox', 'Chrome' => 'Chrome', 'Safari' => 'Safari'] as $busca => $nome) {
            if (str_contains($userAgent, $busca)) {
                return $nome;
            }
        }

        return 'Outro navegador';
    }
}
