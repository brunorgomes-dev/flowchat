<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class GarantirAdministradorPlataforma
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->isAdministradorPlataforma(), 404);

        return $next($request);
    }
}
