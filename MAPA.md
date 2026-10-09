# FlowChat — Mapa do Projeto

Plataforma simples de automação de conversas, integrada ao Facebook Messenger (MVP).

## Stack

- Laravel 13 + PHP 8.3
- React 19 + Inertia.js 3 (Vite)
- MySQL 8.4
- Laravel Queue (driver: database, sem Redis)
- Docker (app + fila + MySQL)
- Facebook Messenger Platform API (Graph API v23.0)

## Fluxo do MVP

Facebook Messenger → Webhook `/webhook/messenger` (POST) → job `ProcessarMensagemEntrante` → identificar/salvar contato → iniciar execução do fluxo ativo → job `EnviarEtapaFluxo` → enviar mensagem via Graph API → registrar mensagem e log → aguardar `pausa_segundos` da etapa → enviar próxima etapa → concluir execução e registrar log.

## Estrutura principal

| Caminho | Função |
| --- | --- |
| `app/Http/Controllers/WebhookMessengerController.php` | Verificação (GET) e recebimento (POST) de eventos do Messenger |
| `app/Http/Controllers/PaginaInicialController.php` | Página Inertia com contatos, mensagens e logs |
| `app/Http/Middleware/HandleInertiaRequests.php` | Middleware Inertia |
| `app/Jobs/ProcessarMensagemEntrante.php` | Salva contato, registra mensagem recebida, inicia execução do fluxo |
| `app/Jobs/EnviarEtapaFluxo.php` | Envia etapa via Messenger API, agenda próxima com pausa, conclui execução |
| `app/Models/` | Contato, Fluxo, EtapaFluxo, ExecucaoFluxo, Mensagem, LogSistema |
| `routes/web.php` | Página inicial + rotas do webhook (CSRF desativado para o webhook) |
| `resources/js/Pages/PaginaInicial.jsx` | Página inicial React (contatos, mensagens, logs) |
| `resources/views/app.blade.php` | Root view do Inertia |
| `database/migrations/` | contatos, fluxos, etapas_fluxo, execucoes_fluxo, mensagens, logs |
| `database/seeders/DatabaseSeeder.php` | Fluxo "Boas-vindas" de exemplo |
| `tests/Feature/WebhookMessengerTest.php` | Testes do webhook (verificação e recebimento) |
| `tests/Feature/ExecucaoFluxoTest.php` | Testes do fluxo ponta a ponta |

## Banco de dados

- `contatos` (psid, nome)
- `fluxos` (nome, ativo)
- `etapas_fluxo` (fluxo_id, ordem, texto, pausa_segundos)
- `execucoes_fluxo` (contato_id, fluxo_id, etapa_atual, concluida_em)
- `mensagens` (contato_id, direcao: recebida|enviada, texto)
- `logs` (evento, descricao)

## Configuração (.env)

- `DB_*` — MySQL (no Docker: host `db`)
- `MESSENGER_PAGE_ACCESS_TOKEN` — token da página do Facebook
- `MESSENGER_VERIFY_TOKEN` — token de verificação do webhook
- `QUEUE_CONNECTION=database`

## Execução

- Docker: `docker compose up -d db app fila` (app: porta 8000; fila: `queue:work`)
- Webhook: `https://<host>/webhook/messenger` (GET verificação, POST eventos)
- Testes: `php artisan test` (requer `npm run build` antes, pelo manifest do Vite)

## Limitações do MVP (não implementar sem pedido)

- Apenas Facebook Messenger (uma página), sem Instagram/WhatsApp/Ads Manager
- Sem login/autenticação, multi-tenant, Redis, builder visual, tags, remarketing, condições
- Fluxo iniciado apenas por mensagem recebida; ignora mensagens durante execução em andamento
