<?php

return [
    'administradores_plataforma' => array_values(array_filter(array_map(
        static fn (string $email): string => mb_strtolower(trim($email)),
        explode(',', (string) env('FLOWCHAT_PLATFORM_ADMIN_EMAILS', '')),
    ))),
    'cadastro_publico' => filter_var(env('FLOWCHAT_PUBLIC_REGISTRATION', false), FILTER_VALIDATE_BOOLEAN),
];
