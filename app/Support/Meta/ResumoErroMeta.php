<?php

namespace App\Support\Meta;

use Illuminate\Http\Client\Response;

/**
 * Resume a rejeição da Graph API numa linha de log, sem despejar o payload.
 */
final class ResumoErroMeta
{
    public static function de(Response $resposta): string
    {
        $erro = $resposta->json('error');

        if (! is_array($erro)) {
            return 'HTTP '.$resposta->status();
        }

        $partes = [];

        foreach (['code' => 'code', 'error_subcode' => 'subcode', 'message' => 'message'] as $chave => $rotulo) {
            $valor = $erro[$chave] ?? null;

            if (is_scalar($valor) && (string) $valor !== '') {
                $partes[] = $rotulo.'='.mb_substr((string) $valor, 0, 200);
            }
        }

        return 'HTTP '.$resposta->status().($partes === [] ? '' : ' — '.implode(' | ', $partes));
    }
}
