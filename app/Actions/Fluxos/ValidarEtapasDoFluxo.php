<?php

namespace App\Actions\Fluxos;

use App\Models\EtapaFluxo;
use App\Support\ArmazenamentoMidia;
use App\Support\Fluxos\DisponibilidadeDeColunas;
use App\Support\MidiaEtapa;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Valida as etapas enviadas pelo editor antes de qualquer escrita.
 *
 * Todas as mensagens usam as chaves do formulário (`etapas.N.campo`) para que
 * o editor continue exibindo o erro no campo certo.
 */
final class ValidarEtapasDoFluxo
{
    /**
     * Valida as etapas de mensagem e os blocos de condição por horário.
     * Intervalos usam limites inclusivos e precisão de minuto, sem permitir
     * sobreposição nem janelas que atravessem a meia-noite.
     *
     * @param  array<int, array<string, mixed>>  $etapas
     * @param  array<int, EtapaFluxo>  $existentes  Etapas atuais indexadas por ordem.
     */
    public function validar(array $etapas, array $existentes = []): void
    {
        $condicoesDisponiveis = DisponibilidadeDeColunas::condicaoHorario();
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
    public function identificadores(array $etapas, array $existentesPorId): bool
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

    private static function minutosDaHora(string $hora): int
    {
        $partes = explode(':', $hora);

        return ((int) ($partes[0] ?? 0)) * 60 + ((int) ($partes[1] ?? 0));
    }
}
