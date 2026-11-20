<?php

namespace App\Support\Fluxos;

use Illuminate\Support\Facades\Schema;

/**
 * Consulta, em um só lugar, se as migrations opcionais de fluxo já rodaram.
 *
 * As telas e a validação ficam fail-closed: sem a coluna, o recurso continua
 * indisponível em vez de assumir que existe.
 */
final class DisponibilidadeDeColunas
{
    public static function condicaoHorario(): bool
    {
        return Schema::hasTable('condicoes_horario_etapa')
            && Schema::hasColumn('etapas_fluxo', 'tipo')
            && Schema::hasColumn('etapas_fluxo', 'destino_nao_ordem')
            && Schema::hasColumn('etapas_fluxo', 'encerra_apos');
    }

    public static function indicadorDigitacao(): bool
    {
        return Schema::hasColumn('etapas_fluxo', 'indicador_digitacao_ativo');
    }

    public static function horario(): bool
    {
        return Schema::hasColumn('fluxos', 'horario_inicio_ativo');
    }

    public static function fuso(): bool
    {
        return Schema::hasColumn('users', 'timezone');
    }
}
