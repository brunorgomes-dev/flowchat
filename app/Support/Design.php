<?php

namespace App\Support;

/**
 * Resolve qual componente Inertia deve ser renderizado para uma tela.
 *
 * As rotas normais usam o design V2. As rotas cujo nome começa com "legado."
 * continuam renderizando as páginas antigas, preservadas como referência.
 * Os controllers e as regras de negócio permanecem os mesmos.
 */
final class Design
{
    public static function componente(string $telaV2, string $telaLegado): string
    {
        $rota = request()->route()?->getName() ?? '';

        return str_starts_with($rota, 'legado.') ? $telaLegado : $telaV2;
    }
}
