<?php

namespace App\Support;

/**
 * Normaliza o timestamp enviado pela Meta nos eventos do webhook, que chega
 * em milissegundos desde a época. Valores em segundos, zero, negativos ou
 * fora de uma faixa plausível são descartados para que o processamento use
 * o momento atual como fallback.
 */
final class TimestampEventoMeta
{
    /**
     * 2000-01-01T00:00:00Z em milissegundos.
     */
    private const MINIMO_MS = 946_684_800_000;

    /**
     * 2100-01-01T00:00:00Z em milissegundos.
     */
    private const MAXIMO_MS = 4_102_444_800_000;

    public static function normalizar(mixed $valor): ?int
    {
        if (is_string($valor) && ctype_digit($valor)) {
            $valor = (int) $valor;
        }

        if (! is_int($valor) || $valor < self::MINIMO_MS || $valor > self::MAXIMO_MS) {
            return null;
        }

        return $valor;
    }
}
