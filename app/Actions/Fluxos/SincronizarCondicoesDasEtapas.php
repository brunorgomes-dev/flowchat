<?php

namespace App\Actions\Fluxos;

use App\Models\EtapaFluxo;
use App\Support\Fluxos\DisponibilidadeDeColunas;

/**
 * Regras das condições por horário de uma etapa do fluxo.
 */
final class SincronizarCondicoesDasEtapas
{
    /**
     * @param  array<string, mixed>  $etapa
     * @return array<string, mixed>
     */
    public function atributos(array $etapa): array
    {
        if (! DisponibilidadeDeColunas::condicaoHorario()) {
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
    public function sincronizar(EtapaFluxo $etapa, array $dadosEtapa): void
    {
        if (! DisponibilidadeDeColunas::condicaoHorario() || ! $etapa->ehCondicaoHorario()) {
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
}
