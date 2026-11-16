<?php

return [
    /*
    |----------------------------------------------------------------------
    | Cache de histórico do Inertia
    |----------------------------------------------------------------------
    |
    | Com a encriptação ativa, o estado das páginas visitadas é guardado
    | cifrado na sessionStorage (não em texto no history.state do browser).
    | Assim, ao terminar a sessão, a limpeza de histórico impede que páginas
    | privadas voltem a aparecer pelo botão voltar.
    |
    */

    'history' => [
        'encrypt' => true,
    ],
];
