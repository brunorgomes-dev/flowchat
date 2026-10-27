# FlowChat — Mapa do Projeto

Plataforma simples de automação de conversas, integrada ao Facebook Messenger (MVP).

## Stack

- Laravel 13 + PHP 8.3
- React 19 + Inertia.js 3 (Vite)
- MySQL 8.4
- Laravel Queue (driver: database, sem Redis)
- Docker (app + fila + MySQL)
- Facebook Messenger Platform API (Graph API v23.0)
- shadcn/ui + lucide-react + Sonner (tokens terracota/areia em `resources/css/app.css`; preferência de tema `sistema|claro|escuro` persistida em `localStorage` (`flowchat-tema`); `sistema` acompanha `prefers-color-scheme`)

## Fluxo do MVP

Facebook Messenger → Webhook `/webhook/messenger` (POST) → job `ProcessarMensagemEntrante` → identificar/salvar contato → iniciar execução do fluxo ativo → job `EnviarEtapaFluxo` → enviar mensagem via Graph API → registrar mensagem e log → aguardar `pausa_segundos` da etapa → enviar próxima etapa → concluir execução e registrar log.

## Estrutura principal

| Caminho | Função |
| --- | --- |
| `app/Http/Controllers/WebhookMessengerController.php` | Verificação (GET) e recebimento (POST) de eventos do Messenger |
| `app/Http/Controllers/PaginaInicialController.php` | Página Inertia com contatos, mensagens e logs |
| `app/Http/Controllers/FluxoController.php` | Gerenciamento de fluxos no painel (listar, criar, editar etapas, ativar/desativar) |
| `app/Http/Controllers/AgendamentoController.php` | Agendamento de fluxos (criar, listar, cancelar pendentes) |
| `app/Http/Controllers/ExecutarFluxoController.php` | Execução manual imediata de fluxo para um contato |
| `app/Http/Controllers/HistoricoContatoController.php` | Histórico de mensagens de um contato (ordem cronológica, por contato) |
| `app/Http/Controllers/ConfiguracoesController.php` | Página de configurações visuais (preferência de tema no navegador) |
| `app/Http/Middleware/HandleInertiaRequests.php` | Middleware Inertia |
| `app/Jobs/ProcessarMensagemEntrante.php` | Salva contato, registra mensagem recebida, inicia execução do fluxo |
| `app/Jobs/EnviarEtapaFluxo.php` | Envia etapa via Messenger API, agenda próxima com pausa, conclui execução |
| `app/Jobs/ExecutarAgendamento.php` | Inicia o fluxo agendado no horário (transição atômica pendente→executado impede execução dupla) |
| `app/Console/Commands/ProcessarAgendamentos.php` | `agendamentos:processar` — varredura de pendentes vencidos (scheduler a cada minuto, em `routes/console.php`) |
| `app/Models/` | Contato, Fluxo, EtapaFluxo, ExecucaoFluxo, Mensagem, LogSistema, RegraInicioFluxo |
| `routes/web.php` | Tela principal: `/` (Conversas); painel anterior: `/painel`; configurações (`/configuracoes`); responder (`POST /contatos/{id}/responder`); execução manual (`/execucoes/manuais`); histórico (`/contatos/{id}/historico`); fluxos (`/fluxos`) e rotas do webhook (CSRF desativado) |
| `resources/js/Pages/Conversas.jsx` | Tela principal: lista, atendimento, detalhes e acesso ao histórico do contato (`conversas`, `conversa`), envio via Sonner |
| `resources/js/Pages/Configuracoes.jsx` | Preferência de tema do navegador: sistema, claro ou escuro |
| `resources/js/components/` | `AppLayout` (sidebar persistente e navegação desktop/mobile), `PageHeader`, `MensagemBubble`, `SeletorTema`, `ToasterFlowChat` (Sonner global) e componentes shadcn/ui |
| `resources/js/lib/tema.js` | Leitura e persistência da preferência de tema (`sistema`, `claro`, `escuro`) |
| `resources/js/app.jsx` | Inicialização Inertia com `AppLayout` persistente e toaster global |
| `resources/js/Pages/PaginaInicial.jsx` | Página inicial React (contatos, mensagens, logs) |
| `resources/js/Pages/Fluxos.jsx` | Página React de gerenciamento de fluxos (nome, etapas, pausas, ativo) |
| `resources/js/Pages/Agendamentos.jsx` | Página React de agendamento de fluxos (fluxo, contato, data/hora, estados) |
| `resources/js/Pages/HistoricoContato.jsx` | Página React do histórico de mensagens de um contato (direção, texto, data/hora) |
| `resources/views/app.blade.php` | Root view do Inertia e aplicação inicial da preferência de tema antes da primeira pintura |
| `database/migrations/` | contatos, fluxos, etapas_fluxo, execucoes_fluxo, mensagens, logs, agendamentos |
| `database/seeders/DatabaseSeeder.php` | Fluxo "Boas-vindas" de exemplo |
| `tests/Feature/WebhookMessengerTest.php` | Testes do webhook (verificação e recebimento) |
| `tests/Feature/ExecucaoFluxoTest.php` | Testes do fluxo ponta a ponta |
| `tests/Feature/GerenciarFluxosTest.php` | Testes do gerenciamento de fluxos pelo painel |
| `tests/Feature/HistoricoContatoTest.php` | Testes do histórico de mensagens por contato |

## Banco de dados

- `contatos` (psid, nome)
- `fluxos` (nome, ativo)
- `etapas_fluxo` (fluxo_id, ordem, texto, pausa_segundos)
- `execucoes_fluxo` (contato_id, fluxo_id, etapa_atual, concluida_em)
- `mensagens` (contato_id, direcao: recebida|enviada, texto)
- `logs` (evento, descricao)
- `agendamentos` (fluxo_id, contato_id, executar_em, estado: pendente|executado|cancelado|falhou)
- `regras_inicio_fluxo` (fluxo_id, gatilho: novo_contato|mensagem_recebida, ativo)

## Configuração (.env)

- `DB_*` — MySQL (no Docker: host `db`)
- `MESSENGER_PAGE_ACCESS_TOKEN` — token da página do Facebook
- `MESSENGER_VERIFY_TOKEN` — token de verificação do webhook
- `QUEUE_CONNECTION=database`

## Execução

- Docker: `docker compose up -d db app fila` (app: porta 8000; fila: `queue:work` + `schedule:work` — varredura de agendamentos a cada minuto)
- Webhook: `https://<host>/webhook/messenger` (GET verificação, POST eventos)
- Fuso horário: `America/Sao_Paulo` (`config/app.php`) — horários de agendamento em horário local
- Testes: `php artisan test` (requer `npm run build` antes, pelo manifest do Vite)

## Limitações do MVP (não implementar sem pedido)

- Apenas Facebook Messenger (uma página), sem Instagram/WhatsApp/Ads Manager
- Sem login/autenticação, multi-tenant, Redis, builder visual, tags, remarketing, condições
- Fluxo iniciado apenas por mensagem recebida; ignora mensagens durante execução em andamento
