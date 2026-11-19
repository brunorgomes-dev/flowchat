<?php

namespace App\Http\Controllers;

use App\Models\EtapaFluxo;
use App\Models\Fluxo;
use App\Models\RegraInicioFluxo;
use App\Models\User;
use App\Support\ArmazenamentoMidia;
use App\Support\MidiaEtapa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
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
    public function store(Request $request, ArmazenamentoMidia $armazenamento): RedirectResponse
    {
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'ativo' => ['sometimes', 'boolean'],
            'etapas' => ['sometimes', 'array'],
            'etapas.*.id' => ['prohibited'],
            'etapas.*.tipo' => ['sometimes', 'in:mensagem,condicao_horario'],
            'etapas.*.texto' => ['nullable', 'string'],
            'etapas.*.pausa_segundos' => ['required', 'integer', 'min:0'],
            'etapas.*.tipo_conteudo' => ['sometimes', 'in:texto,imagem,audio,video,arquivo'],
            'etapas.*.anexo' => ['nullable', 'file', 'max:25600'],
            'etapas.*.remover_anexo' => ['sometimes', 'boolean'],
            'etapas.*.indicador_digitacao_ativo' => ['sometimes', 'boolean'],
            'etapas.*.indicador_digitacao_segundos' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'etapas.*.condicoes' => ['sometimes', 'array'],
            'etapas.*.condicoes.*.inicio' => ['required', 'date_format:H:i'],
            'etapas.*.condicoes.*.fim' => ['required', 'date_format:H:i'],
            'etapas.*.condicoes.*.destino_ordem' => ['required', 'integer', 'min:1'],
            'etapas.*.destino_nao_ordem' => ['nullable', 'integer', 'min:1'],
            'etapas.*.encerra_apos' => ['sometimes', 'boolean'],
            'regras' => ['sometimes', 'array'],
            'horario' => ['sometimes', 'array'],
            'horario.ativo' => ['sometimes', 'boolean'],
            'horario.inicio' => ['nullable', 'date_format:H:i'],
            'horario.fim' => ['nullable', 'date_format:H:i'],
            'horario.fora_horario' => ['nullable', 'in:nao_iniciar,aguardar'],
        ]);

        $atributosHorario = $this->atributosHorario($dados, $request->user());
        $etapas = $dados['etapas'] ?? [];
        $this->validarEtapas($etapas);

        $conta = $request->user()->account;
        $novosAnexos = $this->armazenarNovosAnexos($etapas, $conta->id, $armazenamento);

        try {
            $fluxo = DB::transaction(function () use ($dados, $atributosHorario, $etapas, $novosAnexos, $conta): Fluxo {
                $fluxo = $conta->fluxos()->create([
                    'nome' => $dados['nome'],
                    'ativo' => $dados['ativo'] ?? true,
                    ...$atributosHorario,
                ]);

                $this->sincronizarEtapas($fluxo, $etapas, $novosAnexos);

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
    public function update(Request $request, int $fluxo, ArmazenamentoMidia $armazenamento): RedirectResponse
    {
        $fluxo = $request->user()->account->fluxos()->findOrFail($fluxo);
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'ativo' => ['required', 'boolean'],
            'etapas' => ['present', 'array'],
            'etapas.*.id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'etapas.*.tipo' => ['sometimes', 'in:mensagem,condicao_horario'],
            'etapas.*.texto' => ['nullable', 'string'],
            'etapas.*.pausa_segundos' => ['required', 'integer', 'min:0'],
            'etapas.*.tipo_conteudo' => ['sometimes', 'in:texto,imagem,audio,video,arquivo'],
            'etapas.*.anexo' => ['nullable', 'file', 'max:25600'],
            'etapas.*.remover_anexo' => ['sometimes', 'boolean'],
            'etapas.*.indicador_digitacao_ativo' => ['sometimes', 'boolean'],
            'etapas.*.indicador_digitacao_segundos' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'etapas.*.condicoes' => ['sometimes', 'array'],
            'etapas.*.condicoes.*.inicio' => ['required', 'date_format:H:i'],
            'etapas.*.condicoes.*.fim' => ['required', 'date_format:H:i'],
            'etapas.*.condicoes.*.destino_ordem' => ['required', 'integer', 'min:1'],
            'etapas.*.destino_nao_ordem' => ['nullable', 'integer', 'min:1'],
            'etapas.*.encerra_apos' => ['sometimes', 'boolean'],
            'regras' => ['sometimes', 'array'],
            'horario' => ['sometimes', 'array'],
            'horario.ativo' => ['sometimes', 'boolean'],
            'horario.inicio' => ['nullable', 'date_format:H:i'],
            'horario.fim' => ['nullable', 'date_format:H:i'],
            'horario.fora_horario' => ['nullable', 'in:nao_iniciar,aguardar'],
        ]);

        $atributosHorario = $this->atributosHorario($dados, $request->user());
        $etapasExistentes = $fluxo->etapas()->get();
        $existentesPorOrdem = $etapasExistentes->keyBy('ordem');
        $existentesPorId = $etapasExistentes->keyBy('id');
        $usarIdsEtapas = $this->validarIdentificadoresEtapas($dados['etapas'], $existentesPorId->all());
        $existentesParaValidacao = [];

        foreach ($dados['etapas'] as $indice => $dadosEtapa) {
            $idEtapa = $dadosEtapa['id'] ?? null;
            $existentesParaValidacao[$indice + 1] = $usarIdsEtapas
                ? ($idEtapa !== null ? $existentesPorId->get((int) $idEtapa) : null)
                : $existentesPorOrdem->get($indice + 1);
        }

        $this->validarEtapas($dados['etapas'], $existentesParaValidacao);

        $novosAnexos = $this->armazenarNovosAnexos($dados['etapas'], $fluxo->account_id, $armazenamento);

        try {
            $caminhosAntigos = DB::transaction(function () use ($fluxo, $dados, $atributosHorario, $novosAnexos, $usarIdsEtapas): array {
                $fluxo->update([
                    'nome' => $dados['nome'],
                    'ativo' => $dados['ativo'],
                    ...$atributosHorario,
                ]);

                $caminhosAntigos = $this->sincronizarEtapas($fluxo, $dados['etapas'], $novosAnexos, $usarIdsEtapas);

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
        $condicoesDisponiveis = $this->colunasCondicaoDisponiveis();

        return [
            'suportaIndicadorDigitacao' => Schema::hasColumn('etapas_fluxo', 'indicador_digitacao_ativo'),
            'suportaCondicaoHorario' => $condicoesDisponiveis,
            'podeCondicaoHorario' => $condicoesDisponiveis && $utilizador->fusoConfirmado(),
            'suportaMidia' => MidiaEtapa::disponivel(),
            'fusoConta' => $utilizador->dadosFusoHorario(),
        ];
    }

    /**
     * Indica se a estrutura de ramificação por horário já existe no banco.
     */
    private function colunasCondicaoDisponiveis(): bool
    {
        return Schema::hasTable('condicoes_horario_etapa')
            && Schema::hasColumn('etapas_fluxo', 'tipo')
            && Schema::hasColumn('etapas_fluxo', 'destino_nao_ordem')
            && Schema::hasColumn('etapas_fluxo', 'encerra_apos');
    }

    /**
     * Valida as etapas de mensagem e os blocos de condição por horário.
     * Intervalos usam limites inclusivos e precisão de minuto, sem permitir
     * sobreposição nem janelas que atravessem a meia-noite.
     *
     * @param  array<int, array<string, mixed>>  $etapas
     * @param  array<int, EtapaFluxo>  $existentes  Etapas atuais indexadas por ordem.
     */
    private function validarEtapas(array $etapas, array $existentes = []): void
    {
        $condicoesDisponiveis = $this->colunasCondicaoDisponiveis();
        $total = count($etapas);

        foreach ($etapas as $indice => $etapa) {
            $ordem = $indice + 1;
            $tipo = ($etapa['tipo'] ?? 'mensagem') === 'condicao_horario'
                ? 'condicao_horario'
                : 'mensagem';

            if ($tipo !== 'condicao_horario') {
                $this->validarEtapaMensagem($indice, $etapa, $existentes[$ordem] ?? null);

                continue;
            }

            if (($etapa['anexo'] ?? null) instanceof UploadedFile) {
                throw ValidationException::withMessages([
                    "etapas.{$indice}.anexo" => 'Uma condição por horário não pode ter um arquivo de mídia.',
                ]);
            }

            if (! $condicoesDisponiveis) {
                throw ValidationException::withMessages([
                    'etapas' => 'A migration de condições por horário ainda não foi executada neste banco de dados.',
                ]);
            }

            $condicoes = $etapa['condicoes'] ?? null;
            if (! is_array($condicoes) || $condicoes === []) {
                throw ValidationException::withMessages([
                    "etapas.{$indice}.condicoes" => 'Adicione pelo menos uma condição de horário.',
                ]);
            }

            $intervalos = [];

            foreach ($condicoes as $indiceCondicao => $condicao) {
                $inicio = (string) ($condicao['inicio'] ?? '');
                $fim = (string) ($condicao['fim'] ?? '');
                $destino = (int) ($condicao['destino_ordem'] ?? 0);

                if ($inicio >= $fim) {
                    throw ValidationException::withMessages([
                        "etapas.{$indice}.condicoes.{$indiceCondicao}.fim" => 'O horário final deve ser posterior ao inicial e a janela não pode atravessar a meia-noite.',
                    ]);
                }

                if ($destino <= $ordem || $destino > $total) {
                    throw ValidationException::withMessages([
                        "etapas.{$indice}.condicoes.{$indiceCondicao}.destino_ordem" => 'Escolha uma etapa de destino posterior a esta condição.',
                    ]);
                }

                $minutoInicio = self::minutosDaHora($inicio);
                $minutoFim = self::minutosDaHora($fim);

                foreach ($intervalos as [$outroInicio, $outroFim]) {
                    if ($minutoInicio <= $outroFim && $outroInicio <= $minutoFim) {
                        throw ValidationException::withMessages([
                            "etapas.{$indice}.condicoes.{$indiceCondicao}.inicio" => 'Este intervalo se sobrepõe a outra condição do mesmo bloco.',
                        ]);
                    }
                }

                $intervalos[] = [$minutoInicio, $minutoFim];
            }

            $destinoNao = $etapa['destino_nao_ordem'] ?? null;
            if ($destinoNao !== null && ((int) $destinoNao <= $ordem || (int) $destinoNao > $total)) {
                throw ValidationException::withMessages([
                    "etapas.{$indice}.destino_nao_ordem" => 'Escolha uma etapa posterior para a saída NÃO ou deixe em branco para encerrar.',
                ]);
            }
        }
    }

    /**
     * Valida IDs de etapas existentes sem permitir referências a outro fluxo.
     *
     * @param  array<int, array<string, mixed>>  $etapas
     * @param  array<int, EtapaFluxo>  $existentesPorId
     */
    private function validarIdentificadoresEtapas(array $etapas, array $existentesPorId): bool
    {
        $idsInformados = false;

        foreach ($etapas as $dadosEtapa) {
            if (array_key_exists('id', $dadosEtapa)) {
                $idsInformados = true;

                break;
            }
        }

        if (! $idsInformados) {
            return false;
        }

        $idsUsados = [];

        foreach ($etapas as $indice => $dadosEtapa) {
            if (! array_key_exists('id', $dadosEtapa)) {
                throw ValidationException::withMessages([
                    "etapas.{$indice}.id" => 'Recarregue o fluxo antes de reordenar suas etapas.',
                ]);
            }

            $idEtapa = $dadosEtapa['id'];

            if ($idEtapa === null) {
                continue;
            }

            $idEtapa = (int) $idEtapa;

            if (! array_key_exists($idEtapa, $existentesPorId) || isset($idsUsados[$idEtapa])) {
                throw ValidationException::withMessages([
                    "etapas.{$indice}.id" => 'Uma etapa informada não pertence a este fluxo ou foi repetida. Recarregue e tente novamente.',
                ]);
            }

            $idsUsados[$idEtapa] = true;
        }

        return true;
    }

    /**
     * Valida uma etapa de mensagem de texto ou de mídia.
     *
     * @param  array<string, mixed>  $etapa
     */
    private function validarEtapaMensagem(int $indice, array $etapa, ?EtapaFluxo $existente): void
    {
        $texto = trim((string) ($etapa['texto'] ?? ''));
        $tipoConteudo = (string) ($etapa['tipo_conteudo'] ?? MidiaEtapa::TipoTexto);
        $anexo = $etapa['anexo'] ?? null;
        $removerAnexo = filter_var($etapa['remover_anexo'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($tipoConteudo === MidiaEtapa::TipoTexto) {
            if ($anexo instanceof UploadedFile) {
                throw ValidationException::withMessages([
                    "etapas.{$indice}.anexo" => 'Escolha um tipo de mídia para enviar o arquivo selecionado.',
                ]);
            }

            if ($texto === '') {
                throw ValidationException::withMessages([
                    "etapas.{$indice}.texto" => 'Escreva o conteúdo desta etapa antes de salvar.',
                ]);
            }

            return;
        }

        if (! MidiaEtapa::tipoValido($tipoConteudo)) {
            throw ValidationException::withMessages([
                "etapas.{$indice}.tipo_conteudo" => 'Selecione um tipo de mídia válido.',
            ]);
        }

        if (! MidiaEtapa::disponivel()) {
            throw ValidationException::withMessages([
                'etapas' => 'A migration de mídia das etapas ainda não foi executada neste banco de dados.',
            ]);
        }

        if ($texto !== '') {
            throw ValidationException::withMessages([
                "etapas.{$indice}.texto" => 'A Meta aceita texto ou anexo, mas não ambos neste formato. Remova o texto ou use uma etapa de texto.',
            ]);
        }

        if ($anexo instanceof UploadedFile) {
            MidiaEtapa::validarArquivo($anexo, $tipoConteudo, "etapas.{$indice}.anexo");

            return;
        }

        $arquivoPreservado = $existente !== null
            && ! $removerAnexo
            && $existente->tipo_conteudo === $tipoConteudo
            && is_string($existente->anexo_caminho)
            && $existente->anexo_caminho !== ''
            && Storage::disk(ArmazenamentoMidia::DISCO)->exists($existente->anexo_caminho);

        if ($arquivoPreservado) {
            return;
        }

        throw ValidationException::withMessages([
            "etapas.{$indice}.anexo" => $existente?->anexo_caminho
                ? 'O arquivo atual não está mais disponível. Selecione um novo arquivo.'
                : 'Selecione um arquivo de '.MidiaEtapa::rotulo($tipoConteudo).'.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $etapa
     * @return array<string, mixed>
     */
    private function atributosCondicaoEtapa(array $etapa): array
    {
        if (! $this->colunasCondicaoDisponiveis()) {
            return [];
        }

        $tipo = ($etapa['tipo'] ?? 'mensagem') === 'condicao_horario'
            ? 'condicao_horario'
            : 'mensagem';
        $destinoNao = $etapa['destino_nao_ordem'] ?? null;

        return [
            'tipo' => $tipo,
            'destino_nao_ordem' => $tipo === 'condicao_horario' && $destinoNao !== null
                ? (int) $destinoNao
                : null,
            'encerra_apos' => $tipo !== 'condicao_horario'
                && filter_var($etapa['encerra_apos'] ?? false, FILTER_VALIDATE_BOOLEAN),
        ];
    }

    /**
     * @param  array<string, mixed>  $dadosEtapa
     */
    private function sincronizarCondicoes(EtapaFluxo $etapa, array $dadosEtapa): void
    {
        if (! $this->colunasCondicaoDisponiveis() || ! $etapa->ehCondicaoHorario()) {
            return;
        }

        foreach ($dadosEtapa['condicoes'] ?? [] as $indice => $condicao) {
            $etapa->condicoes()->create([
                'ordem' => $indice + 1,
                'inicio' => $condicao['inicio'],
                'fim' => $condicao['fim'],
                'destino_ordem' => (int) $condicao['destino_ordem'],
            ]);
        }
    }

    /**
     * Armazena os novos arquivos antes da transação. Se algo falhar, remove
     * apenas os arquivos recém-gravados.
     *
     * @param  array<int, array<string, mixed>>  $etapas
     * @return array<int, array{caminho: string, extensao: string, mime: string, nome: string, tamanho: int}>
     */
    private function armazenarNovosAnexos(array $etapas, int $accountId, ArmazenamentoMidia $armazenamento): array
    {
        $novos = [];

        try {
            foreach ($etapas as $indice => $etapa) {
                $tipoEtapa = ($etapa['tipo'] ?? 'mensagem') === 'condicao_horario'
                    ? 'condicao_horario'
                    : 'mensagem';
                $tipoConteudo = (string) ($etapa['tipo_conteudo'] ?? MidiaEtapa::TipoTexto);
                $arquivo = $etapa['anexo'] ?? null;

                if ($tipoEtapa === 'condicao_horario'
                    || ! $arquivo instanceof UploadedFile
                    || ! MidiaEtapa::tipoValido($tipoConteudo)) {
                    continue;
                }

                $metadados = MidiaEtapa::validarArquivo($arquivo, $tipoConteudo, "etapas.{$indice}.anexo");
                $caminho = $armazenamento->armazenar($arquivo, $accountId, $metadados['extensao']);

                $novos[$indice] = [
                    'caminho' => $caminho,
                    ...$metadados,
                ];
            }
        } catch (Throwable $excecao) {
            $armazenamento->apagarOrfaos(array_column($novos, 'caminho'));

            throw $excecao;
        }

        return $novos;
    }

    /**
     * Atualiza as etapas por ordem, preservando IDs e arquivos não alterados.
     * Retorna os caminhos antigos que devem ser limpos após o commit.
     *
     * @param  array<int, array<string, mixed>>  $etapas
     * @param  array<int, array{caminho: string, extensao: string, mime: string, nome: string, tamanho: int}>  $novosAnexos
     * @return list<string>
     */
    private function sincronizarEtapas(Fluxo $fluxo, array $etapas, array $novosAnexos, bool $usarIdsEtapas = false): array
    {
        $existentesPorId = $fluxo->etapas()->get()->keyBy('id');
        $existentesPorOrdem = $existentesPorId->keyBy('ordem');
        $caminhosAntigos = [];
        $idsMantidos = [];

        foreach ($etapas as $indice => $dadosEtapa) {
            $ordem = $indice + 1;
            $idEtapa = $dadosEtapa['id'] ?? null;
            $existente = $usarIdsEtapas
                ? ($idEtapa !== null ? $existentesPorId->get((int) $idEtapa) : null)
                : $existentesPorOrdem->get($ordem);
            $caminhoAnterior = $existente?->anexo_caminho;

            if ($existente !== null) {
                $idsMantidos[$existente->id] = true;
            }

            $atributos = [
                'ordem' => $ordem,
                'texto' => $dadosEtapa['texto'] ?? '',
                'pausa_segundos' => $dadosEtapa['pausa_segundos'],
                ...$this->atributosIndicadorDigitacao($dadosEtapa),
                ...$this->atributosCondicaoEtapa($dadosEtapa),
                ...$this->atributosMidiaEtapa($existente, $dadosEtapa, $novosAnexos[$indice] ?? null),
            ];

            if ($existente !== null) {
                $existente->update($atributos);
                $etapa = $existente;
            } else {
                $etapa = $fluxo->etapas()->create($atributos);
            }

            if ($caminhoAnterior !== null && $caminhoAnterior !== ($atributos['anexo_caminho'] ?? null)) {
                $caminhosAntigos[] = $caminhoAnterior;
            }

            $etapa->condicoes()->delete();
            $this->sincronizarCondicoes($etapa, $dadosEtapa);
        }

        foreach ($existentesPorId as $existente) {
            if (isset($idsMantidos[$existente->id])) {
                continue;
            }

            if (is_string($existente->anexo_caminho) && $existente->anexo_caminho !== '') {
                $caminhosAntigos[] = $existente->anexo_caminho;
            }

            $existente->delete();
        }

        return array_values(array_unique($caminhosAntigos));
    }

    /**
     * @param  array<string, mixed>  $dadosEtapa
     * @param  array{caminho: string, extensao: string, mime: string, nome: string, tamanho: int}|null  $novoAnexo
     * @return array<string, mixed>
     */
    private function atributosMidiaEtapa(?EtapaFluxo $existente, array $dadosEtapa, ?array $novoAnexo): array
    {
        if (! MidiaEtapa::disponivel()) {
            return [];
        }

        $tipoEtapa = ($dadosEtapa['tipo'] ?? 'mensagem') === 'condicao_horario'
            ? 'condicao_horario'
            : 'mensagem';
        $tipoConteudo = (string) ($dadosEtapa['tipo_conteudo'] ?? MidiaEtapa::TipoTexto);

        if ($tipoEtapa === 'condicao_horario' || ! MidiaEtapa::tipoValido($tipoConteudo)) {
            return [
                'tipo_conteudo' => MidiaEtapa::TipoTexto,
                'anexo_caminho' => null,
                'anexo_nome_original' => null,
                'anexo_mime' => null,
                'anexo_tamanho_bytes' => null,
                'anexo_attachment_id' => null,
                'anexo_attachment_page_id' => null,
                'anexo_attachment_expira_em' => null,
            ];
        }

        if ($novoAnexo !== null) {
            return [
                'tipo_conteudo' => $tipoConteudo,
                'anexo_caminho' => $novoAnexo['caminho'],
                'anexo_nome_original' => $novoAnexo['nome'],
                'anexo_mime' => $novoAnexo['mime'],
                'anexo_tamanho_bytes' => $novoAnexo['tamanho'],
                // O arquivo mudou: o attachment_id anterior pertencia ao
                // conteúdo antigo e não pode ser reutilizado.
                'anexo_attachment_id' => null,
                'anexo_attachment_page_id' => null,
                'anexo_attachment_expira_em' => null,
            ];
        }

        $removerAnexo = filter_var($dadosEtapa['remover_anexo'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($existente !== null
            && ! $removerAnexo
            && $existente->tipo_conteudo === $tipoConteudo
            && is_string($existente->anexo_caminho)
            && $existente->anexo_caminho !== '') {
            return [
                'tipo_conteudo' => $tipoConteudo,
                'anexo_caminho' => $existente->anexo_caminho,
                'anexo_nome_original' => $existente->anexo_nome_original,
                'anexo_mime' => $existente->anexo_mime,
                'anexo_tamanho_bytes' => $existente->anexo_tamanho_bytes,
                'anexo_attachment_id' => $existente->anexo_attachment_id,
                'anexo_attachment_page_id' => $existente->anexo_attachment_page_id,
                'anexo_attachment_expira_em' => $existente->anexo_attachment_expira_em,
            ];
        }

        return [
            'tipo_conteudo' => $tipoConteudo,
            'anexo_caminho' => null,
            'anexo_nome_original' => null,
            'anexo_mime' => null,
            'anexo_tamanho_bytes' => null,
            'anexo_attachment_id' => null,
            'anexo_attachment_page_id' => null,
            'anexo_attachment_expira_em' => null,
        ];
    }

    private static function minutosDaHora(string $hora): int
    {
        $partes = explode(':', $hora);

        return ((int) ($partes[0] ?? 0)) * 60 + ((int) ($partes[1] ?? 0));
    }

    /**
     * Atributos do indicador de digitação. Enquanto a migration não for
     * executada, devolve um array vazio e o fluxo mantém o comportamento atual.
     *
     * @param  array<string, mixed>  $etapa
     * @return array<string, mixed>
     */
    private function atributosIndicadorDigitacao(array $etapa): array
    {
        if (! Schema::hasColumn('etapas_fluxo', 'indicador_digitacao_ativo')) {
            return [];
        }

        $ativo = filter_var($etapa['indicador_digitacao_ativo'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $segundos = (int) ($etapa['indicador_digitacao_segundos'] ?? 2);

        return [
            'indicador_digitacao_ativo' => $ativo,
            'indicador_digitacao_segundos' => $ativo ? max(1, min(20, $segundos)) : 2,
        ];
    }

    /**
     * Valida a consistência da janela de horário e devolve os atributos a
     * persistir no fluxo. Devolve um array vazio enquanto as colunas de
     * horário não existirem no banco, preservando o comportamento atual.
     *
     * @param  array<string, mixed>  $dados
     * @return array<string, mixed>
     */
    private function atributosHorario(array $dados, ?User $utilizador): array
    {
        if (! $this->colunasHorarioDisponiveis()) {
            if (filter_var($dados['horario']['ativo'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                throw ValidationException::withMessages([
                    'horario' => 'A migration de horário de início ainda não foi executada neste banco de dados.',
                ]);
            }

            return [];
        }

        $horario = $dados['horario'] ?? [];
        $ativo = filter_var($horario['ativo'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if (! $ativo) {
            // Configuração desativada: limpa a janela e mantém o comportamento atual
            return [
                'horario_inicio_ativo' => false,
                'horario_inicio' => null,
                'horario_fim' => null,
                'fora_horario' => 'nao_iniciar',
            ];
        }

        // Enquanto o fuso horário da conta não estiver confirmado, novas
        // janelas de horário ficam bloqueadas: o horário informado pelo
        // usuário precisa ser interpretado numa região conhecida. Enquanto
        // a migration de fuso não correr, o comportamento atual é preservado.
        if ($this->colunasFusoDisponiveis() && ($utilizador === null || ! $utilizador->fusoConfirmado())) {
            throw ValidationException::withMessages([
                'horario' => 'Confirme o seu fuso horário em Configurações antes de ativar o horário de início.',
            ]);
        }

        $inicio = $horario['inicio'] ?? null;
        $fim = $horario['fim'] ?? null;

        if ($inicio === null || $fim === null) {
            throw ValidationException::withMessages([
                'horario' => 'Define a hora inicial e a hora final para ativar o horário de início.',
            ]);
        }

        if ($inicio === $fim) {
            throw ValidationException::withMessages([
                'horario' => 'A hora inicial e a hora final devem ser diferentes.',
            ]);
        }

        return [
            'horario_inicio_ativo' => true,
            'horario_inicio' => $inicio,
            'horario_fim' => $fim,
            'fora_horario' => in_array($horario['fora_horario'] ?? null, ['nao_iniciar', 'aguardar'], true)
                ? $horario['fora_horario']
                : 'nao_iniciar',
        ];
    }

    /**
     * Indica se as colunas de horário já existem na tabela de fluxos.
     */
    private function colunasHorarioDisponiveis(): bool
    {
        return Schema::hasColumn('fluxos', 'horario_inicio_ativo');
    }

    /**
     * Indica se as colunas de fuso horário já existem na tabela de usuários.
     */
    private function colunasFusoDisponiveis(): bool
    {
        return Schema::hasColumn('users', 'timezone');
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
