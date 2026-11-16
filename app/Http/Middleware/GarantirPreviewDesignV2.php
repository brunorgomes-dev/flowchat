<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restringe a área de preview de design V2.
 *
 * A área só existe quando FLOWCHAT_PREVIEW_DESIGN_V2=true ou, sem a variável,
 * quando APP_ENV=local. Em qualquer outro caso a resposta é 404, para não
 * revelar nem expor telas de avaliação em produção.
 */
class GarantirPreviewDesignV2
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($this->habilitado(), 404);

        return $next($request);
    }

    private function habilitado(): bool
    {
        $configurado = config('flowchat.preview_design_v2');

        if ($configurado !== null) {
            return (bool) $configurado;
        }

        return app()->environment('local');
    }
}
