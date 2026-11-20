<?php

namespace App\Http\Controllers;

use App\Actions\Fluxos\ArmazenarAnexosDasEtapas;
use App\Actions\Fluxos\SincronizarEtapasDoFluxo;
use App\Actions\Fluxos\ValidarEtapasDoFluxo;
use App\Http\Requests\Fluxos\StoreFluxoRequest;
use App\Http\Requests\Fluxos\UpdateFluxoRequest;
use App\Models\Fluxo;
use App\Models\RegraInicioFluxo;
use App\Models\User;
use App\Support\ArmazenamentoMidia;
use App\Support\Fluxos\DisponibilidadeDeColunas;
use App\Support\Fluxos\HorarioDeInicio;
use App\Support\MidiaEtapa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class FluxoController extends Controller
{
    /**
     * Página de gerenciamento dos fluxos e suas etapas.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('V2/Fluxos', [
            'fluxos' => $request->user()->account->fluxos()->with(['etapas', 'regras'])
                ->withCount(['execucoes', 'agendamentos'])
                ->orderBy('id')
                ->get(),
        ]);
    }

    /**
     * Abre o editor sem criar um registro até o primeiro salvamento.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('V2/EditorFluxo', [
            'fluxo' => null,
            ...$this->recursosDoEditor($request->user()),
        ]);
    }

    /**
     * Abre o editor com os dados do fluxo existente.
     */
    public function edit(Request $request, int $fluxo): Response
    {
        $fluxo = $request->user()->account->fluxos()->findOrFail($fluxo);

        return Inertia::render('V2/EditorFluxo', [
            'fluxo' => $fluxo->load(['etapas.condicoes', 'regras']),
            ...$this->recursosDoEditor($request->user()),
        ]);
    }

    /**
     * Cria um novo fluxo.
     */
    public function store(
        StoreFluxoRequest $request,
        ArmazenamentoMidia $armazenamento,
        ValidarEtapasDoFluxo $validador,
        ArmazenarAnexosDasEtapas $armazenador,
        SincronizarEtapasDoFluxo $sincronizador,
        HorarioDeInicio $horario,
    ): RedirectResponse {
        $dados = $request->validated();

        $atributosHorario = $horario->atributos($dados, $request->user());
        $etapas = $dados['etapas'] ?? [];
        $validador->validar($etapas);

        $conta = $request->user()->account;
        $novosAnexos = $armazenador->executar($etapas, $conta->id, $armazenamento);

        try {
            $fluxo = DB::transaction(function () use ($dados, $atributosHorario, $etapas, $novosAnexos, $conta, $sincronizador): Fluxo {
                $fluxo = $conta->fluxos()->create([
                    'nome' => $dados['nome'],
                    'ativo' => $dados['ativo'] ?? true,
                    ...$atributosHorario,
                ]);

                $sincronizador->executar($fluxo, $etapas, $novosAnexos);

                if (array_key_exists('regras', $dados)) {
                    $this->sincronizarRegras($fluxo, $dados['regras']);
                }

                return $fluxo;
            });
        } catch (Throwable $excecao) {
            $armazenamento->apagarOrfaos(array_column($novosAnexos, 'caminho'));

            throw $excecao;
        }

        return redirect()->route('fluxos.edit', $fluxo);
    }

    /**
     * Atualiza nome, status e etapas do fluxo.
     */
    public function update(
        UpdateFluxoRequest $request,
        int $fluxo,
        ArmazenamentoMidia $armazenamento,
        ValidarEtapasDoFluxo $validador,
        ArmazenarAnexosDasEtapas $armazenador,
        SincronizarEtapasDoFluxo $sincronizador,
        HorarioDeInicio $horario,
    ): RedirectResponse {
        $fluxo = $request->user()->account->fluxos()->findOrFail($fluxo);
        $dados = $request->validated();

        $atributosHorario = $horario->atributos($dados, $request->user());
        $etapasExistentes = $fluxo->etapas()->get();
        $existentesPorOrdem = $etapasExistentes->keyBy('ordem');
        $existentesPorId = $etapasExistentes->keyBy('id');
        $usarIdsEtapas = $validador->identificadores($dados['etapas'], $existentesPorId->all());
        $existentesParaValidacao = [];

        foreach ($dados['etapas'] as $indice => $dadosEtapa) {
            $idEtapa = $dadosEtapa['id'] ?? null;
            $existentesParaValidacao[$indice + 1] = $usarIdsEtapas
                ? ($idEtapa !== null ? $existentesPorId->get((int) $idEtapa) : null)
                : $existentesPorOrdem->get($indice + 1);
        }

        $validador->validar($dados['etapas'], $existentesParaValidacao);

        $novosAnexos = $armazenador->executar($dados['etapas'], $fluxo->account_id, $armazenamento);

        try {
            $caminhosAntigos = DB::transaction(function () use ($fluxo, $dados, $atributosHorario, $novosAnexos, $usarIdsEtapas, $sincronizador): array {
                $fluxo->update([
                    'nome' => $dados['nome'],
                    'ativo' => $dados['ativo'],
                    ...$atributosHorario,
                ]);

                $caminhosAntigos = $sincronizador->executar($fluxo, $dados['etapas'], $novosAnexos, $usarIdsEtapas);

                if (array_key_exists('regras', $dados)) {
                    $this->sincronizarRegras($fluxo, $dados['regras']);
                }

                return $caminhosAntigos;
            });
        } catch (Throwable $excecao) {
            $armazenamento->apagarOrfaos(array_column($novosAnexos, 'caminho'));

            throw $excecao;
        }

        $armazenamento->apagarOrfaos($caminhosAntigos);

        return redirect()->route('fluxos.edit', $fluxo);
    }

    /**
     * Exclui somente fluxos sem execuções ou agendamentos vinculados.
     */
    public function destroy(Request $request, int $fluxo, ArmazenamentoMidia $armazenamento): RedirectResponse
    {
        $caminhosAntigos = [];

        $dependencias = DB::transaction(function () use ($request, $fluxo, &$caminhosAntigos): array {
            $fluxoBloqueado = $request->user()->account->fluxos()->lockForUpdate()->findOrFail($fluxo);
            $caminhosAntigos = MidiaEtapa::disponivel()
                ? $fluxoBloqueado->etapas()->whereNotNull('anexo_caminho')->pluck('anexo_caminho')->all()
                : [];
            $execucoes = $fluxoBloqueado->execucoes()->count();
            $agendamentos = $fluxoBloqueado->agendamentos()->count();

            if ($execucoes > 0 || $agendamentos > 0) {
                $dependencias = [];

                if ($execucoes > 0) {
                    $dependencias[] = $execucoes.' '.($execucoes === 1 ? 'execução' : 'execuções');
                }

                if ($agendamentos > 0) {
                    $dependencias[] = $agendamentos.' '.($agendamentos === 1 ? 'agendamento' : 'agendamentos');
                }

                return $dependencias;
            }

            $fluxoBloqueado->delete();

            return [];
        });

        if ($dependencias !== []) {
            return back()->withErrors([
                'exclusao' => 'O fluxo não pode ser excluído porque possui '.implode(' e ', $dependencias).' vinculados. Os registros foram preservados.',
            ]);
        }

        $armazenamento->apagarOrfaos($caminhosAntigos);

        return redirect()->route('fluxos.index');
    }

    /**
     * Recursos opcionais do editor, ativados apenas depois das migrations.
     *
     * @return array<string, mixed>
     */
    private function recursosDoEditor(User $utilizador): array
    {
        $condicoesDisponiveis = DisponibilidadeDeColunas::condicaoHorario();

        return [
            'suportaIndicadorDigitacao' => DisponibilidadeDeColunas::indicadorDigitacao(),
            'suportaCondicaoHorario' => $condicoesDisponiveis,
            'podeCondicaoHorario' => $condicoesDisponiveis && $utilizador->fusoConfirmado(),
            'suportaMidia' => MidiaEtapa::disponivel(),
            'fusoConta' => $utilizador->dadosFusoHorario(),
        ];
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
