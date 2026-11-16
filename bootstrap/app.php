<?php

use App\Http\Middleware\GarantirAdministradorPlataforma;
use App\Http\Middleware\GarantirContaAtiva;
use App\Http\Middleware\GarantirPreviewDesignV2;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // O Apache recebe tráfego HTTP do Cloudflare Tunnel na rede privada.
        // Confiar nos cabeçalhos encaminhados mantém URLs e redirects em HTTPS.
        $middleware->trustProxies(
            at: '*',
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT
                | Request::HEADER_X_FORWARDED_PROTO,
        );

        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        // Visitantes sem sessão são encaminhados para a página de entrada
        $middleware->redirectGuestsTo(fn () => route('login'));

        $middleware->alias([
            'admin.plataforma' => GarantirAdministradorPlataforma::class,
            'conta.ativa' => GarantirContaAtiva::class,
            'preview.design-v2' => GarantirPreviewDesignV2::class,
        ]);

        // Webhook do Messenger é chamado pelo Facebook sem sessão/CSRF
        $middleware->validateCsrfTokens(except: ['webhook/messenger']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
