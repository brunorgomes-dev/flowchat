# FlowChat

Plataforma de automação de conversas no Facebook Messenger, organizada por conta de cliente. O FlowChat recebe eventos do webhook, registra contatos e mensagens, executa fluxos com pausas, mídia e condições de horário e permite atendimento manual pelo painel.

Este repositório contém o MVP em Laravel + React/Inertia. O ambiente online, o domínio/HTTPS, as credenciais Meta e o provedor de email ainda dependem de decisões e configuração fora do código; nada disso é provisionado automaticamente por este README.

## Stack

- Laravel 13, PHP 8.3 e MySQL 8.4
- React 19 + Inertia.js 3 + Vite, com Tailwind CSS 4 e componentes shadcn/ui
- Fila e cache no banco (`database`), sem Redis
- Apache/PHP no container `app`; worker e agendador em serviços separados
- Docker Compose com `app`, `db`, `fila`, `agendador` e `tunnel` opcional
- Graph API v23.0 para o Messenger

## Áreas do produto

| Área | Descrição |
| --- | --- |
| Conversas | Lista paginada de contatos, busca no servidor, prévia da última mensagem, atendimento manual e carregamento incremental do histórico |
| Painel | Visão inicial com contatos, mensagens e atividade recente da conta |
| Fluxos | Criação e edição de etapas de texto/mídia, pausas, indicador de digitação, condições por horário e encerramento de ramo |
| Agendamentos | Execução de fluxos em data/hora futura, com estados pendente, executado, cancelado e falhou |
| Configurações | Fuso horário da conta, tema e conexão/desconexão do Messenger por OAuth |
| Convites e contas | Área administrativa da plataforma para emitir/revogar convites e suspender/reativar contas |
| Acesso | Login com limite de duas sessões simultâneas, cadastro público desativado por padrão e aceite de convite |

## Execução local

Pré-requisitos: Docker Desktop, PHP 8.3 e Node 24 para comandos fora dos containers. No Windows, os scripts de backup exigem Git Bash ou WSL.

1. Crie o `.env` a partir de `.env.example` e preencha os valores exigidos pelo Compose: `APP_KEY`, `APP_URL`, `DB_PASSWORD` e, se for usar o túnel, `CLOUDFLARE_TUNNEL_TOKEN`. Nunca faça commit do `.env` nem de segredos.
2. Suba o mínimo necessário para o painel:

   ```bash
   docker compose up -d db app
   ```

   Para processar fila e agendamentos, acrescente `fila agendador`. O serviço `tunnel` só deve ser iniciado quando houver token e destino de hospedagem definidos.
3. Aplique as migrations no banco local autorizado:

   ```bash
   docker compose exec app php artisan migrate --force
   ```

   Em ambientes com dados de cliente, migrations são aplicadas de forma consciente e autorizada, nunca com `migrate:fresh` ou equivalentes destrutivos.
4. Acesse `http://127.0.0.1:8000`. O MySQL fica exposto apenas em `127.0.0.1:3307` para inspeção local.
5. O primeiro administrador da plataforma é criado somente por console, com o email já presente em `FLOWCHAT_PLATFORM_ADMIN_EMAILS`:

   ```bash
   docker compose exec app php artisan flowchat:criar-administrador
   ```

6. O cadastro público permanece desativado por padrão (`FLOWCHAT_PUBLIC_REGISTRATION=false`). Novas contas entram por convite emitido na área administrativa.

## Dados demonstrativos

O comando abaixo cria uma conta fictícia chamada **Demonstração FlowChat — dados fictícios**, com contatos, mensagens, origens, fluxos, execuções, agendamentos, logs e mídias sintéticas em português. Ele é opt-in, idempotente e não cria convites, integrações Messenger, tokens, chamadas à Meta nem jobs de envio.

```bash
docker compose exec -e APP_ENV=local app php artisan flowchat:demo-popular --confirm
```

O comando pede a senha demo de forma interativa. Para automação, use `--senha-file=/caminho/dentro/do/container`; o arquivo precisa existir **dentro do container** e deve ser removido depois. Não use a senha demo fora do ambiente local.

Guardas do comando:

- exige `--confirm`;
- exige `APP_ENV=local`, `DB_HOST=db` e `DB_DATABASE=flowchat`;
- recusa conta/usuário conflitante e não apaga registros existentes;
- a senha é usada apenas na primeira criação do usuário demo e deve ter pelo menos 12 caracteres, com letras e números;
- o login demo é `demo@flowchat.invalid`; não reutilize essa senha fora do ambiente local.

Todos os PSIDs e anúncios usam o prefixo `DEMO-`. A remoção futura é manual e deve identificar a conta pelo nome exato; não existe comando de limpeza automática. Antes de remover, confira mensagens, origens, logs, execuções, agendamentos, etapas de fluxo e arquivos em `storage/app/private/flowchat/etapas/{account_id}`. Nunca remova dados de contas reais por engano.

## Arquitetura

- `app/Http/Controllers/` — webhook, conversas, atendimento manual, fluxos, agendamentos, configurações, convites e administração de contas.
- `app/Jobs/` — processamento de mensagem entrante, envio de etapas, registro de origem e execução de agendamentos.
- `app/Models/` — contas, usuários, contatos, fluxos, etapas, condições, mensagens, origens, logs, convites e integrações.
- `resources/js/Pages/` — telas Inertia (React); `resources/js/components/` concentra layout e componentes reutilizáveis.
- `database/migrations/` — evolução aditiva do schema; migrations destrutivas exigem revisão e autorização.
- `docker/backup/` — scripts, Compose isolado, testes de shell e documentação de backup/restore.
- `tests/Feature/` — suíte de comportamento em SQLite em memória, sem chamadas reais à Meta.

O fluxo principal é: webhook `/webhook/messenger` → job `ProcessarMensagemEntrante` → contato/mensagem → execução de fluxo → job `EnviarEtapaFluxo` → Graph API → próxima etapa. Origens de anúncio são persistidas separadamente e não iniciam fluxo por si só.

### Janela de 24 horas da Meta

A Meta só aceita mensagem livre até 24 horas depois da última mensagem enviada pelo contato. O job `ProcessarMensagemEntrante` registra esse instante em `contatos.ultima_mensagem_recebida_em` (somente eventos de texto; delivery/read não contam) e a criação de agendamentos é recusada fora da janela, com o horário-limite exibido no fuso da conta. Contato sem o registro é tratado como fora da janela. A validação fica desativada enquanto a migration da coluna não estiver aplicada no banco. A execução manual de fluxos e os agendamentos criados automaticamente pela regra "aguardar horário" não passam por essa validação e ainda podem falhar na Graph API.

## Testes, estilo e build

```bash
php artisan test --compact
vendor/bin/pint --dirty --format agent
npm run build
composer audit
npm audit
```

A suíte usa SQLite em memória e não acessa o banco local de desenvolvimento. O build do frontend é necessário para refletir alterações React na imagem/volume servido pelo Apache. Os testes de shell do backup não precisam de banco ou volume ativo:

```bash
bash docker/backup/tests/run.sh
```

## Backup e restauração

O procedimento completo está em [`docker/backup/README.md`](docker/backup/README.md). Resumo da política aprovada para o piloto pequeno:

- backup diário, com retenção de 14 backups diários;
- RPO de até 24 horas e RTO alvo de até 4 horas;
- `APP_KEY` guardada separadamente em cofre de senhas/segredos, nunca junto do backup;
- sem expurgo automático de conversas de clientes reais;
- prazos provisórios apenas para dados de teste: mensagens/anexos de demonstração até 30 dias ou fim da rodada; logs operacionais 90 dias; logs administrativos/segurança 180 dias;
- criptografia e cópia fora do host somente quando o destino de hospedagem for escolhido;
- nenhuma tarefa agendada no Windows nem rotina de backup para o banco local atual.

O restore é fail-closed: recusa projeto/container/volume ativo, volume de mídia em uso ou preenchido, checksums inválidos, schema incompatível e backups antigos sem metadados de schema. O ambiente isolado usa MySQL descartável e exige senha alfanumérica por limitação do entrypoint. O ensaio realizado até aqui usou somente dados sintéticos; restauração com dados reais e recuperação de token criptografado com a `APP_KEY` ainda precisam ser validadas no ambiente escolhido.

## CI local — proposta (não publicada)

Não há workflow publicado nem serviço externo conectado. A proposta é um job sem segredo, com PHP 8.3, Node 24 e SQLite em memória, executando:

```bash
composer install --no-interaction --prefer-dist
php artisan test --compact
vendor/bin/pint --test --format agent
npm ci
npm run build
composer audit
npm audit --omit=dev
```

Para os testes de shell, usar uma imagem Linux com Bash (ou Git Bash no Windows). Não é necessário banco, volume, credencial Meta ou `APP_KEY` de produção para essa etapa. Um segundo job com MySQL 8.4 pode ser adicionado depois para provar concorrência real, migrations e isolamento de transações; isso continua sendo uma decisão separada. Nenhum workflow deve receber segredos de runtime nem publicar imagens sem revisão explícita.

## Limites e pendências que dependem de hospedagem

- Hospedagem, VPS, domínio, HTTPS e túnel não são definidos por este repositório e estão fora do escopo local.
- `APP_URL` público, credenciais Meta (`MESSENGER_APP_ID`, `MESSENGER_APP_SECRET`, `MESSENGER_VERIFY_TOKEN`), callback OAuth e webhook real precisam ser configurados e validados no ambiente escolhido.
- Email transacional, verificação de email e recuperação de senha não estão implementados; o ambiente usa mail em modo log.
- OAuth/webhook, envio real de mídia e concorrência de transações MySQL ainda não foram provados ponta a ponta.
- Criptografia em repouso, cópia off-site, RPO/RTO medidos e ensaio de restore com dados reais dependem do destino de hospedagem.
- O MVP atende apenas Facebook Messenger, uma Página por conta; WhatsApp, Instagram, cobrança automática e IA estão fora do escopo atual.
- A conferência visual da Atividade com sessão autenticada pode ficar pendente quando não há navegador conectado; ela não substitui teste automatizado.

## Segurança

Nunca versione `.env`, `APP_KEY`, senhas, tokens Meta, dumps de banco ou mídia privada. A imagem Docker não deve conter `.env`, `.git`, testes ou metadados locais. Backups contêm dados pessoais e devem ficar fora do repositório, com acesso restrito e criptografia quando houver destino definido.
