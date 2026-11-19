<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContaSuspensaController extends Controller
{
    /**
     * Página pública exibida quando uma conta suspensa tenta acessar o app.
     */
    public function __invoke(Request $request): Response|RedirectResponse
    {
        $utilizador = $request->user();

        if ($utilizador !== null && $utilizador->account?->estaSuspensa() !== true) {
            return redirect()->route('pagina-inicial');
        }

        return Inertia::render('V2/ContaSuspensa');
    }
}
