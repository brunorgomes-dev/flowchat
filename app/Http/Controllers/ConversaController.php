<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class ConversaController extends Controller
{
    /**
     * Lista de conversas e, quando selecionada via ?contato, a conversa do contato.
     */
    public function __invoke(Request $request): Response
    {
        $origensDisponiveis = Schema::hasTable('origens_contato');

        return Inertia::render('V2/Conversas', [
            // Somente avaliada na visita completa ou quando pedida no reload parcial
            'conversas' => fn () => $this->consultaConversas($request, $origensDisponiveis)
                ->orderByDesc('id')
                ->paginate(25)
                ->withQueryString(),

            // Closure avaliada por recarregamento parcial (:only) da página `/conversas?contato={id}`
            'conversa' => function () use ($request, $origensDisponiveis) {
                $id = $request->integer('contato');

                if ($id <= 0) {
                    return null;
                }

                $contato = $request->user()->account->contatos()->findOrFail($id);

                if ($origensDisponiveis) {
                    $contato->load('origemMaisRecente');
                }

                $antes = $request->integer('mensagens_antes');
                $consulta = $contato->mensagens()->orderByDesc('id');
                if ($antes > 0) {
                    $consulta->where('id', '<', $antes);
                }

                $mensagens = $consulta->limit(31)->get();
                $temMais = $mensagens->count() > 30;
                $mensagens = $mensagens->take(30)->sortBy('id')->values();

                return [
                    'contato' => $contato,
                    'mensagens' => $mensagens,
                    'tem_mais' => $temMais,
                    'total_mensagens' => $contato->mensagens()->count(),
                ];
            },
        ]);
    }

    /**
     * Carregamento incremental da lista de conversas, por cursor de id.
     *
     * Mantém a mesma busca e o mesmo filtro por anúncio da listagem inicial,
     * sempre limitado à conta autenticada.
     */
    public function mais(Request $request): JsonResponse
    {
        $origensDisponiveis = Schema::hasTable('origens_contato');
        $consulta = $this->consultaConversas($request, $origensDisponiveis);

        $antesId = $request->integer('antes_id');
        if ($antesId > 0) {
            $consulta->where('id', '<', $antesId);
        }

        $contatos = $consulta->orderByDesc('id')->limit(26)->get();
        $temMais = $contatos->count() > 25;

        return response()->json([
            'conversas' => $contatos->take(25)->values(),
            'tem_mais' => $temMais,
        ]);
    }

    /**
     * Consulta base da caixa de entrada: conta autenticada, relações e filtros.
     */
    private function consultaConversas(Request $request, bool $origensDisponiveis): HasMany
    {
        $relacoes = ['ultimaMensagem'];
        if ($origensDisponiveis) {
            $relacoes[] = 'origemMaisRecente';
        }

        $consultaConversas = $request->user()->account->contatos()
            ->with($relacoes)
            ->withCount('mensagens');

        $termoBusca = trim((string) $request->query('busca', ''));
        if ($termoBusca !== '') {
            $like = '%'.$termoBusca.'%';
            $consultaConversas->where(function ($consulta) use ($like, $origensDisponiveis): void {
                $consulta->where('nome', 'like', $like)
                    ->orWhere('psid', 'like', $like)
                    ->orWhereHas('mensagens', fn ($mensagens) => $mensagens->where('texto', 'like', $like));

                if ($origensDisponiveis) {
                    $consulta->orWhereHas('origens', function ($origens) use ($like): void {
                        $origens->where('ad_id', 'like', $like)
                            ->orWhere('ad_title', 'like', $like)
                            ->orWhere('referencia', 'like', $like)
                            ->orWhere('mensagem_inicial', 'like', $like);
                    });
                }
            });
        }

        // Filtro real por anúncio (além da busca livre da interface)
        if ($origensDisponiveis && $request->filled('ad_id')) {
            $adId = trim((string) $request->query('ad_id'));

            $consultaConversas->whereHas('origens', fn ($consulta) => $consulta->comAdId($adId));
        }

        return $consultaConversas;
    }
}
