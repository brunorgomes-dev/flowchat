<?php

namespace App\Http\Controllers;

use App\Models\Contato;
use App\Models\Fluxo;
use App\Models\LogSistema;
use App\Models\Mensagem;
use Inertia\Inertia;
use Inertia\Response;

class PaginaInicialController extends Controller
{
    /**
     * Página inicial com contatos, mensagens e logs recentes.
     */
    public function __invoke(): Response
    {
        return Inertia::render('PaginaInicial', [
            'contatos' => Contato::withCount('mensagens')->latest('id')->get(),
            'fluxos' => Fluxo::where('ativo', true)->orderBy('id')->get(['id', 'nome']),
            'mensagens' => Mensagem::with('contato:id,psid,nome')->latest('id')->limit(50)->get(),
            'logs' => LogSistema::latest('id')->limit(50)->get(),
        ]);
    }
}
