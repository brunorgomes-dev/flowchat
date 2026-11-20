<?php

namespace App\Actions\Fluxos;

use App\Support\ArmazenamentoMidia;
use App\Support\MidiaEtapa;
use Illuminate\Http\UploadedFile;
use Throwable;

/**
 * Armazena os novos arquivos das etapas antes da transação.
 *
 * Se algo falhar no meio, remove apenas os arquivos recém-gravados; os
 * anteriores continuam intactos.
 */
final class ArmazenarAnexosDasEtapas
{
    /**
     * @param  array<int, array<string, mixed>>  $etapas
     * @return array<int, array{caminho: string, extensao: string, mime: string, nome: string, tamanho: int}>
     */
    public function executar(array $etapas, int $accountId, ArmazenamentoMidia $armazenamento): array
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
}
