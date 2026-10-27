<?php

namespace App\Http\Controllers;

use App\Models\Fluxo;
use App\Models\RegraInicioFluxo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FluxoController extends Controller
{
    /**
     * Página de gerenciamento dos fluxos e suas etapas.
     */
    public function index(): Response
    {
        return Inertia::render('Fluxos', [
            'fluxos' => Fluxo::with('etapas')->with('regras')->orderBy('id')->get(),
        ]);
    }

    /**
     * Cria um novo fluxo.
     */
    public function store(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'regras' => ['sometimes', 'array'],
        ]);

        $fluxo = Fluxo::create([...$dados, 'ativo' => false]);

        if ($request->has('regras')) {
            $this->sincronizarRegras($fluxo, $request->input('regras', []));
        }

        return redirect()->route('fluxos.index');
    }

    /**
     * Atualiza nome, status e etapas do fluxo.
     */
    public function update(Request $request, Fluxo $fluxo): RedirectResponse
    {
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'ativo' => ['required', 'boolean'],
            'etapas' => ['present', 'array'],
            'etapas.*.texto' => ['required', 'string'],
            'etapas.*.pausa_segundos' => ['required', 'integer', 'min:0'],
            'regras' => ['sometimes', 'array'],
        ]);

        $fluxo->update([
            'nome' => $dados['nome'],
            'ativo' => $dados['ativo'],
        ]);

        // Substitui a sequência de etapas pelas configuradas no painel
        $fluxo->etapas()->delete();
        foreach ($dados['etapas'] as $indice => $etapa) {
            $fluxo->etapas()->create([
                'ordem' => $indice + 1,
                'texto' => $etapa['texto'],
                'pausa_segundos' => $etapa['pausa_segundos'],
            ]);
        }

        if (array_key_exists('regras', $dados)) {
            $this->sincronizarRegras($fluxo, $dados['regras']);
        }

        return redirect()->route('fluxos.index');
    }

    private function sincronizarRegras(Fluxo $fluxo, mixed $entrada): void
    {
        $estados = [];

        if (is_array($entrada)) {
            if (array_is_list($entrada)) {
                foreach ($entrada as $item) {
                    if (! is_array($item)) {
                        continue;
                    }

                    $gatilho = $item['gatilho'] ?? $item['trigger'] ?? null;
                    if (! in_array($gatilho, ['novo_contato', 'mensagem_recebida'], true)) {
                        continue;
                    }

                    $ativo = $item['ativo'] ?? $item['active'] ?? true;
                    $estados[$gatilho] = (bool) $ativo;
                }
            } else {
                foreach (['novo_contato', 'mensagem_recebida'] as $gatilho) {
                    if (! array_key_exists($gatilho, $entrada)) {
                        continue;
                    }

                    $valor = $entrada[$gatilho];
                    if (is_array($valor)) {
                        $valor = $valor['ativo'] ?? $valor['active'] ?? true;
                    }

                    $estados[$gatilho] = (bool) $valor;
                }
            }
        }

        foreach ($estados as $gatilho => $ativo) {
            RegraInicioFluxo::updateOrCreate(
                ['fluxo_id' => $fluxo->id, 'gatilho' => $gatilho],
                ['ativo' => $ativo],
            );
        }
    }
}
