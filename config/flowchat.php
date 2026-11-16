<?php

$previewDesignV2 = env('FLOWCHAT_PREVIEW_DESIGN_V2');

return [
    'administradores_plataforma' => array_values(array_filter(array_map(
        static fn (string $email): string => mb_strtolower(trim($email)),
        explode(',', (string) env('FLOWCHAT_PLATFORM_ADMIN_EMAILS', '')),
    ))),
    'cadastro_publico' => filter_var(env('FLOWCHAT_PUBLIC_REGISTRATION', false), FILTER_VALIDATE_BOOLEAN),

    /*
     * Área de preview de design (/preview/design-v2).
     *
     * - null (variável ausente ou vazia): habilitada apenas em APP_ENV=local.
     * - true: habilitada explicitamente (continua exigindo sessão autenticada,
     *   conta ativa e autorização administrativa nas telas de administração).
     * - false: desabilitada, respondendo 404 mesmo em ambiente local.
     *
     * Fora do ambiente local a área fica desativada por padrão: nenhuma tela
     * de preview fica exposta sem configuração explícita.
     */
    'preview_design_v2' => ($previewDesignV2 === null || $previewDesignV2 === '')
        ? null
        : filter_var($previewDesignV2, FILTER_VALIDATE_BOOLEAN),
];
