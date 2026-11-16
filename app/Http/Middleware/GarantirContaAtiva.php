<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class GarantirContaAtiva
{
    /**
     * Encerra a sessão de uma conta suspensa e impede novas requisições
     * autenticadas. Administradores da plataforma continuam com acesso às
     * rotas administrativas para poderem reativar a conta.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $utilizador = $request->user();

        if ($utilizador === null || $utilizador->isAdministradorPlataforma()) {
            return $next($request);
        }

        if ($utilizador->account?->estaSuspensa() === true) {
            Auth::guard()->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('conta.suspensa');
        }

        return $next($request);
    }
}
