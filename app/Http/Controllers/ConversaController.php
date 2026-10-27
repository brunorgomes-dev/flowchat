<?php

namespace App\Http\Controllers;

use App\Models\Contato;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConversaController extends Controller
{
    /**
     * Lista de conversas e, quando selecionada via ?contato, a conversa do contato.
     */
    public function __invoke(Request $request): Response
    {
        return Inertia::render('Conversas', [
            // Somente avaliada na visita completa ou quando pedida no reload parcial
            'conversas' => fn () => Contato::with('ultimaMensagem')
                ->withCount('mensagens')
                ->orderByDesc('id')
                ->get(),

            // Closure avaliada por recarregamento parcial (:only) da página `/conversas?contato={id}`
            'conversa' => function () use ($request) {
                $id = $request->integer('contato');

                if ($id <= 0) {
                    return null;
                }

                $contato = Contato::findOrFail($id);

                return [
                    'contato' => $contato,
                    // Últimas 100 mensagens, reordenadas em cronológico para a interface
                    'mensagens' => $contato->mensagens()
                        ->orderByDesc('id')
                        ->limit(100)
                        ->get()
                        ->sortBy('id')
                        ->values(),
                ];
            },
        ]);
    }
}
