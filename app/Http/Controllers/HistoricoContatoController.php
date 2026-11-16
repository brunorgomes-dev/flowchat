<?php

namespace App\Http\Controllers;

use App\Models\Contato;
use App\Support\Design;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HistoricoContatoController extends Controller
{
    /**
     * Histórico de mensagens do contato, em ordem cronológica.
     */
    public function __invoke(Request $request, int $contato): Response
    {
        $contato = $request->user()->account->contatos()->findOrFail($contato);

        return Inertia::render(Design::componente('V2/HistoricoContato', 'HistoricoContato'), [
            'contato' => $contato,
            'mensagens' => $contato->mensagens()->orderBy('id')->get(),
        ]);
    }

    /**
     * Mensagens anteriores para carregamento incremental no painel.
     */
    public function mensagens(Request $request, int $contato): JsonResponse
    {
        $contato = $request->user()->account->contatos()->findOrFail($contato);

        $antes = $request->integer('antes');
        $consulta = $contato->mensagens()->orderByDesc('id');
        if ($antes > 0) {
            $consulta->where('id', '<', $antes);
        }

        $mensagens = $consulta->limit(31)->get();
        $temMais = $mensagens->count() > 30;
        $mensagens = $mensagens->take(30)->sortBy('id')->values();

        return response()->json([
            'mensagens' => $mensagens,
            'tem_mais' => $temMais,
        ]);
    }
}
