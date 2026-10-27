<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>FlowChat</title>
    <script>
        // Tema: mantém a preferência (sistema, claro ou escuro) em localStorage.
        // Aplica tudo antes da primeira pintura para evitar flash de tema incorreto.
        (function () {
            var CHAVE_TEMA = 'flowchat-tema';
            var sistema = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
            var preferencia = 'sistema';

            try {
                var salvo = localStorage.getItem(CHAVE_TEMA);
                if (salvo === 'sistema' || salvo === 'claro' || salvo === 'escuro') {
                    preferencia = salvo;
                }
            } catch (erro) {
                preferencia = 'sistema';
            }

            var aplicar = function (escuro) {
                document.documentElement.classList.toggle('dark', escuro);
            };

            var aplicarPreferencia = function () {
                var escuro = preferencia === 'escuro' || (preferencia === 'sistema' && sistema && sistema.matches);
                aplicar(Boolean(escuro));
            };

            var sincronizarSistema = function () {
                if (preferencia === 'sistema') {
                    aplicarPreferencia();
                }
            };

            aplicarPreferencia();

            if (sistema && sistema.addEventListener) {
                sistema.addEventListener('change', sincronizarSistema);
            } else if (sistema && sistema.addListener) {
                sistema.addListener(sincronizarSistema);
            }

            // Chamado pela página de Configurações ao atualizar a preferência.
            window.definirPreferenciaTema = function (novaPreferencia) {
                if (novaPreferencia !== 'sistema' && novaPreferencia !== 'claro' && novaPreferencia !== 'escuro') {
                    return;
                }

                preferencia = novaPreferencia;
                aplicarPreferencia();

                try {
                    localStorage.setItem(CHAVE_TEMA, preferencia);
                } catch (erro) {
                    // Sem persistência disponível; mantém a escolha só nesta aba.
                }
            };

            window.addEventListener('storage', function (evento) {
                if (evento.key !== CHAVE_TEMA) {
                    return;
                }

                preferencia = evento.newValue === 'claro' || evento.newValue === 'escuro' || evento.newValue === 'sistema'
                    ? evento.newValue
                    : 'sistema';
                aplicarPreferencia();
            });

        })();
    </script>
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @inertiaHead
</head>
<body class="font-sans antialiased">
    @inertia
</body>
</html>
