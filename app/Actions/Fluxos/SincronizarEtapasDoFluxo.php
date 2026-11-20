<?php

namespace App\Actions\Fluxos;

use App\Models\EtapaFluxo;
use App\Models\Fluxo;
use App\Support\Fluxos\DisponibilidadeDeColunas;
use App\Support\MidiaEtapa;

/**
 * Atualiza as etapas do fluxo por ordem, preservando IDs e arquivos não
 * alterados, e devolve os caminhos antigos a limpar depois do commit.
 */
final class SincronizarEtapasDoFluxo
{
    public function __construct(private readonly SincronizarCondicoesDasEtapas $condicoes) {}

    /**
     * @param  array<int, array<string, mixed>>  $etapas
     * @param  array<int, array{caminho: string, extensao: string, mime: string, nome: string, tamanho: int}>  $novosAnexos
     * @return list<string>
     */
    public function executar(Fluxo $fluxo, array $etapas, array $novosAnexos, bool $usarIdsEtapas = false): array
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
                ...$this->condicoes->atributos($dadosEtapa),
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
            $this->condicoes->sincronizar($etapa, $dadosEtapa);
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

    /**
     * Atributos do indicador de digitação. Enquanto a migration não for
     * executada, devolve um array vazio e o fluxo mantém o comportamento atual.
     *
     * @param  array<string, mixed>  $etapa
     * @return array<string, mixed>
     */
    private function atributosIndicadorDigitacao(array $etapa): array
    {
        if (! DisponibilidadeDeColunas::indicadorDigitacao()) {
            return [];
        }

        $ativo = filter_var($etapa['indicador_digitacao_ativo'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $segundos = (int) ($etapa['indicador_digitacao_segundos'] ?? 2);

        return [
            'indicador_digitacao_ativo' => $ativo,
            'indicador_digitacao_segundos' => $ativo ? max(1, min(20, $segundos)) : 2,
        ];
    }
}
