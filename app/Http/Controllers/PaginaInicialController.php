<?php

namespace App\Http\Controllers;

use App\Models\LogSistema;
use App\Models\Mensagem;
use App\Support\Design;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaginaInicialController extends Controller
{
    /**
     * Página inicial com contatos, mensagens e logs recentes.
     */
    public function __invoke(Request $request): Response
    {
        $conta = $request->user()->account;

        return Inertia::render(Design::componente('V2/Painel', 'PaginaInicial'), [
            'contatos' => $conta->contatos()->withCount('mensagens')->latest('id')->get(),
            'fluxos' => $conta->fluxos()->where('ativo', true)->orderBy('id')->get(['id', 'nome']),
            'mensagens' => Mensagem::whereHas('contato', fn ($consulta) => $consulta->where('account_id', $conta->id))->with('contato:id,psid,nome')->latest('id')->limit(50)->get(),
            // Esconde eventos administrativos antes do limite para que a
            // atividade mostre até 50 entradas visíveis ao cliente.
            'logs' => $conta->logs()
                ->whereNotIn('evento', LogSistema::EVENTOS_OCULTOS_ATIVIDADE_CLIENTE)
                ->latest('id')
                ->limit(50)
                ->get(['id', 'evento', 'descricao', 'created_at']),
        ]);
    }
}
