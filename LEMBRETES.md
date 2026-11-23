# Lembrete: conectar o Facebook ao FlowChat

Este documento registra o trabalho necessário para disponibilizar a conexão de Páginas do Facebook pelo OAuth do FlowChat. A configuração do aplicativo Meta é feita uma vez pela equipe responsável pelo FlowChat; cada cliente autoriza o FlowChat e escolhe a Página que deseja conectar. O cliente não deve precisar criar ou configurar um aplicativo no Meta for Developers.

> As permissões e telas do Meta mudam com o tempo. Antes de enviar o app para análise, confirmar os requisitos vigentes no painel do app e na documentação oficial da Meta.

## Prioridades atuais — 16/11/2026

Ordem definida pelo usuário:

1. **Corrigir, ativar e validar a janela de 24 horas da Meta nos agendamentos.** A migration `2026_11_16_141723_adicionar_ultima_mensagem_recebida_aos_contatos.php` existe, mas não foi aplicada; `app` e `fila` ainda executam imagem anterior. A revisão final LongCat confirmou as correções de eco, fail-closed para timestamp desconhecido, flag não-mensagem, teste isolado de schema e faixa do timestamp, sem achados altos/críticos. A rodada adicional também evita renovar a janela quando o timestamp Meta está ausente/inválido; o implementer reportou **29 testes/77 asserções** nos dois arquivos direcionados e Pint `--dirty` aprovados. Uma nova revisão dessa última alteração está em andamento.
   - A revisão anterior apontou dois problemas médios de retry/efeitos parciais em `ExecutarAgendamento` e `ProcessarMensagemEntrante`, preexistentes e fora da autorização de janela atual; decidir se devem ser tarefa separada antes de ampliar uso. O ponto baixo sobre deduplicação de referrals também fica separado.
   - `README.md:90` ainda diz que só eventos de texto contam e que “aguardar horário” não passa pela validação; propor atualização documental separada antes da ativação, sem editar README ainda.
   - Postbacks/referrals não renovam a janela até confirmar regra Meta; não automatizar navegação no Developer Dashboard.
   - A migration permanece pendente, o runtime não foi atualizado. Não aplicar migration/build/Docker/reiniciar sem autorização operacional específica.
   - Sem backfill: contatos antigos não têm janela conhecida até receberem nova mensagem; agendamentos existentes sem timestamp devem falhar fechado após a migration.
   - Execução manual de fluxo e envio de etapas que ultrapassem a janela permanecem fora do escopo acordado.
   - A janela só fica ativa depois de código atualizado em runtime **e** migration aplicada. Não aplicar/recriar nada sem autorização operacional separada.
2. **Depois, escolher/preparar hospedagem.** VPS nenhuma foi confirmada. O domínio público é atendido pelo Cloudflare Tunnel do Compose local; isso não é hospedagem independente para produção. Escolher o destino antes de alterar infraestrutura, definir configuração HTTPS/`APP_URL`, workers, scheduler, segredos e operação de backup/restore. Cada ação operacional exige autorização específica.

### Refinamento de movimento — navegação V2

- O usuário relatou que a interface parece “seca”: Configurações abre abruptamente e o hamburger/trilho recolhível não tem leveza.
- Escopo atual: transições sutis e rápidas no submenu Configurações, gaveta/hamburger móvel e recolhimento do rail desktop; preservar affordances, foco/teclado, `aria-expanded`, foco reduzido e layout.
- Implementação delimitada concluída pelo `flowchat-implementer` em `LayoutV2.jsx`, `NavegacaoV2.jsx`, `estilo-v2.css` e `layout-v2.css`; sem mudanças de conteúdo ou dependências. O usuário autorizou build/recriação somente de `app`: `docker compose build app` e `docker compose up -d --no-deps --force-recreate app` passaram; `app` está saudável. Nenhuma migration ou alteração no banco; fila, scheduler e túnel não foram recriados. Revisão LongCat final ainda pendente.
- Nos screenshots enviados, o usuário apontou dois desalinhamentos: hamburger colado ao nome no rail expandido e ícone de Configurações fora do eixo no rail compacto. Correção mínima aplicada: alternador vai à borda direita no rail expandido (sem deslocar o botão no rail compacto) e botão do flyout ocupa a largura do rail para centralizar o ícone. Build/recriação do `app` foi repetido e está saudável.
- O detector Impeccable foi executado. Apontou uma borda lateral de 3 px já existente no aviso global (`estilo-v2.css:1064`), sem relação com a navegação; mantida fora do escopo.
- Não foram executados testes. A revisão visual das transições continua pendente: não há sessão demo autenticada; uma sessão do app mostrou conversas reais, então foi fechada e nenhuma captura foi guardada/compartilhada. Para conferir a tela Conversas, pedir ao usuário que faça login manual com conta demo/teste e não compartilhe credenciais.

### Teste real de mídia em agendamento — 17/11/2026

- O usuário escolheu um teste real na Meta e enviou uma nova mensagem para abrir a janela. Consulta agregada read-only encontrou um envio recente do tipo arquivo e fluxo concluído, mas nenhuma linha de agendamento criada/atualizada na mesma janela; portanto, o envio de mídia parece ter funcionado, porém **não está confirmado que ocorreu pelo caminho agendado** (pode ter sido disparado pelo fluxo de entrada). Nenhum texto, nome de contato, PSID ou conteúdo do arquivo foi lido.
- Caminho de código: `ExecutarAgendamento` inicia uma execução e despacha `EnviarEtapaFluxo`; este mesmo job atende mídia em fluxos imediatos e agendados, usando Attachment Upload API, `attachment_id` reutilizável por Página e reupload em caso de ID inválido/expirado. A cobertura existente testa o envio de mídia no job diretamente com HTTP fake, mas não o percurso agendamento→mídia junto e não valida a Graph API real.
- Após autorização do usuário, Docker/Compose local foi iniciado/retomado. `app`, `db`, `fila`, `agendador` e `tunnel` estavam ativos/saudáveis na última consulta; `https://flowchat.inovawebdesigns.com/up` respondeu “Application up”. Consulta agregada read-only: `jobs=0`, `failed_jobs=0`, `agendamentos pendentes=1`, vencidos=0 (UTC-3). Não foram lidos textos de mensagens.
- A validação de 24 h ainda não está ativa no runtime: a migration `ultima_mensagem_recebida_aos_contatos` continua pendente e `fila` usa imagem anterior. Para um teste real, escolher Página e contato de teste controlados, confirmar uma mensagem de entrada há menos de 24 h e usar um arquivo sintético sem dados pessoais. Nunca enviar a um cliente real sem autorização específica do arquivo, destinatário e horário.
- O usuário reportou defeitos no editor e saiu sem salvar, portanto não há alteração dessa tentativa a preservar: textarea/variáveis aparecem junto à mídia; uma etapa de condição não tem ação para remover o bloco; mídia parece causar rolagem dupla/overflow; checkbox + selo “Ativo/Inativo” são redundantes/desalinhados. Também pediu novos fluxos ativos por padrão.
- Correções implementadas pelo `flowchat-implementer`: textarea/variáveis apenas em etapas de texto; em mídia, aviso e ação explícita para limpar texto; etapa de condição pode ser removida pelo diálogo existente; badge removido e checkbox alinhado. O usuário autorizou que todo fluxo novo comece ativo; `FluxoController::store` e o teste correspondente foram atualizados, e `GerenciarFluxosTest` passou (7 testes/38 asserções) + Pint `--dirty`.
- Revisão LongCat encontrou um erro médio de reindexação de validação ao remover uma condição interna e estados de erros que podiam persistir em campos ocultos; uma rodada adicional do implementer está em andamento. Build ainda não executado neste lote.
- O scroll duplo ainda precisa de reprodução visual segura; não aplicar `overflow:hidden` às cegas. O editor de criação não foi salvo e não houve envio adicional de mídia.

### Modelos e perfis dos subagentes

- Configuração local criada em `.opencode/agents/`:
  - `flowchat-explore` → `opencode/glm-5.3-flash-free` (ativo no catálogo, custo por token informado como zero).
  - `flowchat-implementer` → `opencode-go/deepseek-v4.1-flash` (ativo e barato, **mas não gratuito**: catálogo informa US$ 0,15/1M tokens de entrada e US$ 0,60/1M de saída).
  - `flowchat-reviewer` → `opencode/longcat-2.5-free` (ativo no catálogo, custo por token informado como zero; usar somente para revisão e avaliar a qualidade nos primeiros pareceres).
- As definições mantêm explore/reviewer somente leitura; implementer não pode delegar, shell pede confirmação e operações de risco requerem autorização específica.
- GPT-6 Luna continua sendo o modelo principal desta sessão; a configuração dos subagentes não altera o modelo principal.
- A seleção de modelo não controla se a cota do provedor é diária, semanal ou mensal. Essa janela e eventuais limites/rate limits são definidos pelo provedor/plano; não foram consultados. Modelos gratuitos têm preço por token zero no catálogo, mas isso não prova ausência de outros limites. O DeepSeek via `opencode-go` pode consumir a cota mensal desse provedor.
- O catálogo atual listou os três modelos como ativos; ainda não foi feito teste de execução com eles. Se os modelos OpenCode gratuitos não resolverem no runtime/conta, parar e pedir ao usuário alternativas; não trocar automaticamente.
- `.opencode/` está no `.gitignore`: as configurações são locais e não serão versionadas sem decisão explícita.

### Revisão de relatórios pendentes

- Os relatórios anteriormente marcados **Não lido** foram lidos e revisados. As entradas aprovadas foram atualizadas em `RELATORIOS.md` com limitações/pendências explícitas.
- Pontos anotados: a proposta antiga de CI cita `pint --test`, proibido pela regra atual do projeto; um relatório afirma que referrals/postbacks são ignorados, mas o controller trata `entry[].messaging[].referral` e `postback.referral`; a janela de 24 h está implementada no código, mas não ativa no runtime e tem achados pendentes de revisão.
- O primeiro parecer do `flowchat-reviewer` usando LongCat foi específico e acionável, sem achados altos/críticos; a qualidade parece promissora, mas uma revisão é amostra insuficiente para avaliação definitiva. A mensagem do usuário não é usada como instrução para reduzir proteção ou expor conteúdo.
- Não sobrescrever relatórios antigos. A atualização das entradas do índice não significa que as pendências técnicas estejam concluídas.

## Plano histórico de 16/11 — triagem de agendamentos + janela de 24h

### Restrições obrigatórias

- Pint: somente `vendor/bin/pint --dirty --format agent` (`--test` é proibido neste projeto).
- Banco ativo (MySQL, container `db`): somente leitura por padrão; qualquer UPDATE/migration aplicada exige autorização explícita do usuário no momento.
- Migration nova pode ser criada como arquivo, mas executá-la no banco ativo precisa de confirmação (verificar antes se `docker/entrypoint.sh` roda `migrate` no boot do container `app`).
- Não usar navegação automatizada em facebook.com/developers.facebook.com (provocou checkpoint na conta de desenvolvedor); interação com a Meta somente por instruções ao usuário ou API read-only do servidor.
- Relatórios novos em `relatorios/` indexados em `RELATORIOS.md` como **Não lido**; nunca sobrescrever relatórios anteriores.
- Commitar em blocos temáticos com mensagens descritivas; push só com a suíte verde. Estado atual: `main` em `c638f16`, working tree limpo, em sincronia com origin, 124 testes/1.069 asserções passando.
- Fuso: o app grava timestamps em UTC-3 (horário local); `NOW()` do MySQL é UTC — usar janelas deslocadas ou datas fixas em consultas.
- Recebimento Messenger está validado E2E (16/11): webhook → job → contato/mensagem → fluxo → respostas, sem erros.
- Consultas ao banco: o MCP Laravel Boost pode não estar disponível; usar `docker compose exec -T app php artisan tinker --execute "..."` (aspas duplas no PowerShell com `` $ `` escapado por crase, strings PHP em aspas simples) — padrão já usado em 16/11.
- A restrição inicial “sem subagentes” deste plano foi superada pela autorização posterior do usuário para configurar e usar os perfis auxiliares com modelos de baixo custo descritos acima.

### Tarefa 1 — Triagem dos agendamentos em `falhou` (fazer primeiro, é rápida)

Dados já coletados em 16/11 (consultas read-only):
- Agendamento **id 7**: fluxo "Boas-vindas", contato com psid prefixo `psid_t` (resíduo de teste), `executar_em` 2026-11-09 12:00 (local), criado 09/11.
- Agendamento **id 10**: fluxo "Fluxo Demonstração — Boas-vindas", contato prefixo `DEMO-J` (demonstração), `executar_em` 2026-11-12 16:00, criado 10/11.
- Há também **1 agendamento `pendente` futuro** (aprox. 2026-12-01) provavelmente de teste/demo — confirmar prefixo do contato antes de decidir.

Confirmado por consultas read-only em 16/11 (correção de premissa do plano):
- **id 7** — conta 1 "Brunno Teste", contato 1 `psid_teste_1` (nome nulo, 1 mensagem "Ola" de 07/10), fluxo 1 "Boas-vindas" (inativo). Falha real em 09/11 15:05 UTC, log `agendamento_falhou` #135: "já existe uma execução em andamento para o PSID psid_teste_1". Resíduo de teste confirmado.
- **id 10** — conta 7 "Demonstração FlowChat — dados fictícios", contato 10 `DEMO-JOAO-04` (3 mensagens sintéticas), fluxo 10 demo. **Não houve falha de execução**: `created_at` == `updated_at` (10/11 12:40) e não existe log `agendamento_falhou` para ele; o estado `falhou` veio pronto do seeder de demonstração. O plano supunha falha em execução; a premissa estava errada.
- **id 11 (`pendente`)** — conta 7 demo, contato 13 `DEMO-JULIANA-07`, `executar_em` 2026-12-01 13:00 UTC (10:00 local). Demonstração confirmada.
- **Caminho de aplicação**: `AgendamentoController@cancelar` só transiciona `pendente` → `cancelado`; **não existe** rota/controller para cancelar registro já em `falhou`. Cancelar id 7/10 exigiria UPDATE direto ou código novo, ambos fora do permitido sem autorização explícita.

Passos:
1. Confirmar por consultas read-only que os contatos dos ids 7 e 10 são teste/demo (tabela `contatos` + `mensagens` deles).
2. Apresentar o achado ao usuário e perguntar: **(a)** cancelar os registros (estado `cancelado` + log `agendamento_cancelado` com motivo), **(b)** apenas documentar a triagem sem tocar no banco, ou **(c)** excluir registros de teste.
3. Preferir sempre caminho de aplicação (rota/controller) se existir para cancelamento; se não existir, não inventar UPDATE SQL sem autorização explícita.
4. Registrar a decisão e o resultado no relatório da tarefa.

### Tarefa 2 — Janela de 24h da Meta nos agendamentos (implementação)

Problema: a Meta só aceita mensagem livre até 24h depois da última mensagem do contato. Agendamentos criados fora dessa janela tendem a falhar na Graph API na hora da execução (e hoje só geram estado `falhou` sem prevenção). Escopo MVP: **bloquear a criação fora da janela com mensagem clara**; não implementar tags de mensagem.

Design acordado (baseado no parecer de 06/11, item 8):
1. Migration nova em `contatos`: coluna `ultima_mensagem_recebida_em` (timestamp nullable, índice). Nome de arquivo seguindo o padrão `2026_11_16_..._adicionar_ultima_mensagem_recebida_aos_contatos.php`.
2. Atualizar a coluna em `ProcessarMensagemEntrante` quando `$this->texto !== null` (junto da criação da mensagem recebida, ~linha 40). Eventos sem texto (delivery/read) não atualizam.
3. Backfill histórico (MAX de `mensagens.created_at` com `direcao='recebida'` por contato): avaliar com o usuário; sem backfill, contatos antigos são tratados como "sem janela" (fora da janela).
4. Validação em `AgendamentoController` (método de criação, validação em ~linha 50): após resolver `$contato`, se `ultima_mensagem_recebida_em` é null ou `executar_em` > `ultima_mensagem_recebida_em + 24h`, lançar ValidationException com mensagem explicando a janela e exibindo o horário-limite no fuso do usuário (`fusoHorarioEfetivo()`). Atenção: `executar_em` é convertido para `config('app.timezone')` para comparação com `now()` — manter esse padrão.
5. UI (escopo mínimo): mensagem de validação já aparece no formulário de `Agendamentos` (V2 e legado). Exibição pró-ativa da janela restante por contato é opcional se for barata.
6. `ExecutarAgendamento` mantém o comportamento de falha atual (estado `falhou` + log com o erro da Graph API).
7. Execução manual fora da janela: fora do escopo; registrar como limitação no README.

Testes (feature, revisar `tests/Feature` de agendamentos existentes para nome/padrão e não duplicar):
- contato sem `ultima_mensagem_recebida_em` → criação recusada.
- agendamento dentro da janela (ex.: 23h depois) → criado.
- agendamento fora da janela (ex.: 25h depois) → recusado com mensagem.
- mensagem recebida via webhook atualiza a coluna do contato (assert no teste de webhook/IsolamentoContas existente).

Verificação e entrega: `php artisan test --compact`; `vendor/bin/pint --dirty --format agent`; `npm run build`; commits em blocos (migration+model/job; controller+UI; testes se separado); push após suíte verde. Documentar a janela de 24h na seção de limitações do README e no relatório `relatorios/2026-11-16-janela-24h-agendamentos.md`.

### Resultado da execução (16/11, tarde)

- **Tarefa 1:** triagem concluída somente por leitura. Usuário decidiu **apenas documentar** — nenhum UPDATE, DELETE ou migration aplicada; ids 7, 10 e 11 permanecem intactos. Relatório: `relatorios/2026-11-16-janela-24h-agendamentos.md`.
- **Tarefa 2:** implementada sem alterar UI. Migration `2026_11_16_141723_adicionar_ultima_mensagem_recebida_aos_contatos.php` **criada e pendente no MySQL ativo**. `agendamentos:processar`/`ProcessarMensagemEntrante` e `AgendamentoController` usam `Schema::hasColumn`, então sem a coluna o comportamento anterior é preservado e a validação fica desativada.
- Verificações: 5 testes novos (12 asserções), suíte completa **129 testes/1.081 asserções**, Pint `--dirty` e `npm run build` passaram. `docker/entrypoint.sh` confirmado sem `migrate` no boot.
- Sem backfill histórico e sem validação na execução manual nem nos agendamentos automáticos de “aguardar horário” — limitações registradas no README e no relatório.
- Runtime: os containers usam a imagem anterior (o Compose não monta o código do host). O código novo só entra em `app`/`fila`/`agendador` após rebuild autorizado; a janela de 24 h só fica ativa depois de rebuild + migration aplicada.
- Próximo passo bloqueado por autorização: aplicar a migration no MySQL ativo (e reconstruir a imagem quando o usuário autorizar) para ativar a janela de 24h no runtime.

### Pendências fora do escopo deste plano (não iniciar sem pedido)

- GitHub Actions de CI; atualização do Laravel ≥13.40.0 (CVE-2026-128083); retenção LGPD; identidade do `composer.json`; remover logs temporários de diagnóstico do `WebhookMessengerController` (após estabilidade); limites de texto 2000; validação visual da lista de convites/Atividade; concorrência MySQL.

## Estado atual do FlowChat

- **Webhook Messenger — estado após o reteste controlado (16/11/2026):** o usuário confirmou privadamente que App ID e App Secret correspondem ao app Meta e que callback, Página e os três eventos assinados conferem. O novo POST retornou HTTP 200; logs registraram entrada e despacho do Job, sem aviso de Página sem integração. Consulta agregada e read-only registrou 1 mensagem recebida e 1 evento `mensagem_recebida` recentes; `jobs` e `failed_jobs` estavam vazios. O conteúdo da conversa não foi lido nem registrado. O POST foi recebido e processado com sucesso.
- Os 15 POSTs 403 reportados para uma janela anterior permanecem como histórico; o teste recente mostra que o problema não se reproduziu. Não presumir qual variável/alteração resolveu a diferença. Se voltar a ocorrer 403, investigar assinatura HMAC/configuração efetiva antes de fila ou interface.
- A conexão manual continua em uso; OAuth é opção e não o único caminho. Não há VPS confirmada: o endpoint público chega ao Compose local via Cloudflare Tunnel. O app Meta continua em desenvolvimento, limitado a pessoas com papel no app para testes.
- Há logs temporários de estrutura do evento e despacho em `WebhookMessengerController`. Depois de alguns dias estáveis, propor a remoção delimitada desses logs e testes correspondentes; requer autorização para editar e para rebuild/recriação.
- O arquivo `relatorios/2026-11-16-diagnostico-webhook-meta.md` não deve ser sobrescrito: ele registra um diagnóstico anterior (2 POSTs 200 e divergência de Página). O índice tem duas entradas para esse mesmo caminho e ambas agora explicam a divergência histórica.
- Não navegar automaticamente em `facebook.com/developers.facebook.com`; conduzir conferências Meta por instruções ao usuário. Nunca pedir ou imprimir IDs, tokens, segredos, payloads ou conteúdo de conversa.

### Histórico de diagnósticos Meta anteriores a esta retomada

Os registros abaixo documentam etapas anteriores de 16/11/2026; são históricos, não o estado atual do webhook. Para a retomada, usar primeiro as confirmações e o diagnóstico operacional anotados acima.

- O fluxo OAuth, a seleção de Página, a inscrição da Página no webhook e a desconexão foram implementados no código. Diagnóstico de 16/11: a Meta entregou eventos de uma Página que está inscrita no app, mas cujo ID não existe na tabela `messenger_integrations`; há uma integração registrada para outra Página. O webhook atual registra aviso, ignora o evento e responde 200, então a Meta não tenta novamente.
- Reteste após a conexão feita pelo usuário: o registro atual em `messenger_integrations` termina em `6729`, enquanto a Página “FlowChat” mostrada como inscrita no Developer Dashboard termina em `5743`. Se essa é a Página usada no teste, a conexão ainda está apontando para outra Página. Não alterei a integração.
- Correção OAuth de 16/11, após autorização: o erro da Meta era App Domains vazio; a lista de Valid OAuth Redirect URIs também estava vazia. Foram salvos somente `flowchat.inovawebdesigns.com` e o callback exato `/configuracoes/messenger/retorno`; o OAuth então completou e a Página “FlowChat” terminada em `5743` foi selecionada com acesso restrito a essa Página. O runtime/DB agora aponta para ela e a conta está ativa. A Meta não confirmou a remoção da assinatura manual anterior; isso não bloqueia a nova inscrição, mas deve ser monitorado.
- Revisão em 16/11/2026: o código usa Graph API v23.0. A documentação de versionamento da Meta lista v27.0 como atual; v23.0 permanece suportada até 08/10/2027, então a atualização não é pré-requisito imediato do primeiro teste. Revisar o changelog antes de atualizar a versão.
- Para receber o webhook messages, a Meta exige a permissão pages_messaging e um token de Página obtido por pessoa com tarefa MESSAGING; o código já solicita pages_messaging e pages_manage_metadata e assina messages, messaging_postbacks e messaging_referrals. Confirmar o acesso efetivo no painel antes do teste.
- O callback configurado pelo Laravel deve ser conferido em Configurações do Messenger; cadastrar exatamente essa URL nas URLs de redirecionamento OAuth válidas do app Meta. Em 16/11, o painel Meta e o runtime foram conferidos: host/path do callback coincidem, o campo do Verify Token está preenchido e `APP_URL` usa o host público.
- O código espera as configurações `MESSENGER_APP_ID`, `MESSENGER_APP_SECRET` e `MESSENGER_VERIFY_TOKEN`; `MESSENGER_LOGIN_CONFIG_ID` é opcional, conforme a configuração de Login for Business usada pelo app.
- Não colocar segredos em commits, prompts, capturas de tela ou mensagens. Configurar `MESSENGER_APP_SECRET` apenas no ambiente protegido do servidor.
- A URL pública do webhook deve usar HTTPS. O webhook valida a assinatura usando o App Secret.
- App ID do runtime coincide com o app Meta; App Secret e Verify Token estão presentes no runtime (valores não exibidos). Duas entregas Meta recentes passaram pela validação da assinatura e chegaram ao controller, mas foram descartadas pelo vínculo de Página ausente. O worker está saudável; como o controller não despacha o Job sem integração, a fila permanece vazia.
- Após a conexão recente, não há mensagem, log `mensagem_recebida` nem Job nos últimos 30 minutos. O último POST Meta observado retornou 200, mas o corpo/evento não foi capturado; não é possível afirmar que esse POST era uma mensagem de usuário. No Developer Dashboard, o caso de uso Messenger ainda aparece como “Teste não iniciado”; o app segue em desenvolvimento/não publicado.
- Após a correção OAuth, ainda falta um novo teste real de mensagem: a integração da Página 5743 já existe, a conta não está suspensa e o túnel/app estão saudáveis, mas as últimas contagens continuam sem mensagem nem Job. O teste deve vir de uma pessoa com papel no app enquanto ele estiver em desenvolvimento.
- Novo bloqueio (16/11 à tarde): o token de Página salvo passou a ser rejeitado pela Graph API (erro OAuthException code 200, "Cannot call API for app ... on behalf of user ...", em `/me` e `/subscribed_fields`). Ao mesmo tempo, a conta de desenvolvedor entrou em checkpoint de confirmação ("atividade incomum") em `facebook.com/checkpoint/...`; o usuário está concluindo a verificação. Nenhum POST do webhook chegou após o rebuild com instrumentação (logs de estrutura no `WebhookMessengerController`, container `app` recriado e saudável). Quando a conta voltar: refazer "Alterar Página conectada" para gerar token novo e reinscrever a Página, confirmar a inscrição e então enviar mensagem de teste de pessoa com papel no app.
- Decisão (16/11): após o checkpoint da Meta ser possivelmente gatilhado por automação do agente no site, não usar mais navegação automatizada em facebook.com/developers.facebook.com; interagir com a Meta somente por instruções ao usuário e chamadas de API do servidor (read-only quando diagnóstico). Verificações locais (logs, banco) continuam liberadas.
- Resolvido (16/11, fim de tarde): após o usuário concluir a verificação da conta, refazer o OAuth manualmente (sem automação) e enviar mensagem de teste, o circuito completo funcionou: webhook recebeu a mensagem, Job processou, contato/log criados, fluxo executou e enviou 2 respostas (`mensagem_enviada` ×2, `fluxo_concluido`), sem `erro_envio` nem `failed_jobs`. Observação de leitura de banco: o app grava timestamps em UTC-3, então consultas com `NOW()` (UTC) precisam de janela deslocada. Diagnóstico `/me` do token exige `pages_read_engagement`, que não é pedida no OAuth — apenas limita diagnóstico, não mensagens.
- Limpeza pendente: remover os logs temporários de "estrutura da entrada" e "mensagem despachada" do `WebhookMessengerController` quando o fluxo estiver estável por alguns dias, com rebuild do `app` (os testes que cobrem esses logs também precisam de ajuste).
- O app Meta está em modo de desenvolvimento/não publicado e as permissões `pages_messaging`, `pages_manage_metadata`, `pages_show_list` estão prontas para teste, não aprovadas para clientes externos. Testes em desenvolvimento devem usar pessoas com papel no app e ativos administrados por elas.

## Roteiro por etapas

### 1. Preparar o aplicativo Meta do FlowChat

- Definir a conta e a organização que serão responsáveis pelo aplicativo Meta de produção. Essa é a conta operacional/mestre do FlowChat, não uma conta especial de cliente dentro do FlowChat.
- Criar ou selecionar o aplicativo Meta apropriado para a integração com Messenger e Login for Business, conforme as opções atuais do painel.
- Registrar os responsáveis administrativos e proteger a conta com autenticação de dois fatores.
- Adicionar os produtos/recursos necessários para Login for Business e Messenger Platform.
- Configurar as URLs OAuth, incluindo a URL de callback mostrada pelo FlowChat.
- Configurar o webhook com a URL pública `/webhook/messenger`, o token de verificação do ambiente e os campos de eventos necessários para mensagens. Confirmar no painel que a Página ficou inscrita após a autorização.
- Preencher no FlowChat/servidor o App ID, App Secret e Verify Token. Manter o Login Configuration ID vazio até que Login for Business esteja configurado e o identificador correto seja conhecido.

### 2. Fazer o primeiro teste em modo de desenvolvimento

- Adicionar o dono da conta de teste como administrador, desenvolvedor ou testador do aplicativo Meta, conforme o papel disponível no painel.
- Usar uma Página de teste administrada por uma conta que tenha acesso à aplicação.
- Entrar no FlowChat com a conta normal do usuário, iniciar a conexão do Facebook, revisar as permissões solicitadas e selecionar a Página.
- Conferir se o FlowChat exibe a mesma Página inscrita na Meta. No reteste de 16/11, a Página inscrita “FlowChat” termina em `5743`, enquanto a Página salva pela conexão atual termina em `6729`. Se “FlowChat” é a Página de teste, conectá-la via Configurações → Conexão. A troca substitui a Página salva na conta; confirmar antes de concluir.
- Testar também cancelamento, troca de Página e desconexão; confirmar no painel Meta se a inscrição do webhook foi removida quando aplicável.
- Não usar tokens pessoais ou de longa duração copiados manualmente como solução de produção.

Em modo de desenvolvimento, o teste costuma ficar restrito a pessoas com papel no app e ativos que elas podem administrar. Confirmar as limitações apresentadas pelo painel Meta no momento do teste.

### 3. Preparar a análise da Meta e o acesso de clientes externos

Antes de submeter:

- Confirmar no painel o nome exato e o nível de acesso disponível para cada permissão usada no OAuth. O código atual solicita `pages_show_list`, `pages_messaging` e `pages_manage_metadata` no fluxo padrão; a configuração de Login for Business pode determinar a solicitação efetiva.
- Solicitar Advanced Access/análise para as permissões que exigirem esse nível para autorizar pessoas que não têm função no app. Não presumir que modo de desenvolvimento atende clientes externos.
- Verificar se a Meta exige verificação do negócio para o app, permissões ou acesso pretendido. Verificação do negócio e análise de permissões são etapas relacionadas, mas distintas.
- Completar informações públicas do app, categoria, ícone, domínio e contatos, conforme exigido pelo painel.
- Publicar uma política de privacidade acessível por URL pública e preparar instruções de exclusão/remoção de dados e URL de solicitação de exclusão, caso exigidas.
- Fornecer à Meta instruções claras para acessar o FlowChat, conectar uma Página de teste e demonstrar o uso de cada permissão.
- Gravar uma demonstração sem dados pessoais sensíveis mostrando login, consentimento, seleção da Página, recebimento de mensagem e resposta pelo FlowChat.
- Descrever o uso mínimo necessário de cada permissão; não pedir permissões sem funcionalidade correspondente.
- Enviar a solicitação pelo painel e acompanhar perguntas, rejeições ou pedidos de ajustes. Atualizar o produto e reenviar quando necessário.

A Meta pode solicitar materiais ou verificações adicionais. A lista acima é um checklist de preparação; os itens definitivos serão os mostrados no painel e na documentação vigente.

### 4. Antes de abrir para clientes

- Confirmar aprovação e nível de acesso de todas as permissões necessárias para o público pretendido.
- Validar OAuth em domínio HTTPS de produção e revisar URLs permitidas.
- Confirmar isolamento dos dados por conta, armazenamento cifrado dos tokens, logs sem segredos e tratamento de revogação/expiração de permissões.
- Definir suporte para Página desconectada, token inválido, permissões revogadas e reautorização.
- Revisar política de privacidade, retenção e exclusão de dados conforme requisitos legais e da Meta.

## Referências oficiais para consultar

- [Meta for Developers](https://developers.facebook.com/): painel do aplicativo, permissões, revisão e requisitos vigentes.
- [Messenger Platform API — coleção oficial da Meta](https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api?entity=folder-22794852-9fcfb7b7-1d80-422d-b5c8-eb2b1003d4fc)
- [Login for Business — vídeo oficial da Meta](https://www.youtube.com/watch?v=Lmr5SLIs3TY)
- [Obter tokens de acesso das Páginas que você administra — coleção oficial da Meta](https://www.postman.com/meta/facebook/request/bqfxwbp/get-access-tokens-of-pages-you-manage)

## Próxima ação quando retomarmos este item

1. Abrir o painel Meta e identificar/criar o aplicativo operacional do FlowChat.
2. Conferir o estado atual das permissões e do produto Login for Business.
3. Configurar as credenciais e URLs no ambiente de desenvolvimento sem compartilhar segredos.
4. Executar o teste manual OAuth ponta a ponta com uma Página de teste.
5. Só depois preparar a análise de permissões e a liberação para clientes externos.

---

# Lembretes de melhorias do FlowChat

Esta lista registra melhorias futuras identificadas na revisão técnica. Ela serve como fila de trabalho, não como indicação de que os itens já foram implementados. O foco continua sendo o Facebook Messenger; ampliar para outros canais fica para uma etapa posterior, após validar estabilidade e uso real.

## Estado consolidado em 13/11/2026

- Auditoria de prontidão de 12/11: 86 testes aprovados, 598 asserções, sem falhas ou erros, em SQLite em memória. Nenhuma chamada real à Meta durante a suíte. A diferença de uma asserção em relação à suíte anterior não altera o resultado.
- Em 12/11/2026, dependências de runtime/build foram atualizadas de forma direcionada; `composer audit` e `npm audit` ficaram sem vulnerabilidades. A subpágina de convites passou a exibir as quatro datas. Nesta rodada, 46 testes direcionados (351 asserções) e o build passaram; a suíte completa não foi reexecutada.
- Em 12/11/2026, último acesso e bootstrap do administrador foram implementados e testados em SQLite. A migration `users.last_login_at` foi criada e, em 13/11/2026, aplicada **somente no MySQL local** após preflight (`Ran [11]`, 22 migrations); o comando `flowchat:criar-administrador` é somente console e não altera usuário existente.
- Em 13/11/2026, o fechamento offline confirmou Docker Desktop local, projeto `flowchat`, `DB_HOST=db` e banco `flowchat`. Antes da demo, as contagens agregadas eram 6 contas/6 contatos/43 mensagens; depois, 7/14/69, com a parte não demo preservada em 6/6/43. Nenhum dado do cliente foi apagado, alterado ou migrado de conta.
- Dados demonstrativos criados de forma idempotente e opt-in: conta **Demonstração FlowChat — dados fictícios**, usuário `demo@flowchat.invalid`, 8 contatos `DEMO-*`, 26 mensagens (com imagem e arquivo sintéticos), 3 fluxos, 2 execuções, 4 agendamentos, 4 origens e 27 logs. O comando não cria convites, integrações Messenger, tokens, chamadas à Meta nem jobs. A senha demo foi gravada apenas em arquivo temporário do host, não é exibida em relatórios e a cópia do container foi removida. A remoção futura é manual e não há comando de limpeza.
- Interface de conversas: lista paginada em 25 contatos com busca no servidor, prévia da última mensagem, estado vazio/loading/erro, histórico incremental em páginas de 30 e atualização automática a cada 30 s somente com a aba visível. O avatar usa iniciais quando não há foto; nenhuma foto real foi inventada nem houve chamada à Meta.
- Lacunas de backup/restore fechadas em 13/11/2026: recusa se **qualquer** container do projeto de destino usa o volume de mídia (inclusive do mesmo label, rodando ou parado), validação explícita de senha alfanumérica do MySQL isolado e recusa fail-closed de backup antigo sem metadados de schema, sem conversão automática insegura. Os 28 testes de shell, `bash -n` e o `docker compose config --quiet` do restore passaram. Não houve novo backup/restore real nesta revisão.
- Validação de 13/11/2026: suíte completa com 100 testes/729 asserções aprovada em SQLite em memória; `composer audit` e `npm audit --omit=dev` sem advisories; `npm run build` concluído. Somente o serviço `app` foi reconstruído e recriado; ficou `healthy`, `/up` e `/login` responderam 200 e `/conversas` sem sessão redirecionou 302. `db` não foi recriado nem reiniciado; `fila`, `agendador` e `tunnel` não foram iniciados.
- A conferência visual da Atividade com a conta demo ficou pendente: o navegador integrado desconectou durante a rodada e não havia sessão autenticada acessível. O filtro está no código/imagem e coberto por teste, mas a validação visual deve ser repetida quando o navegador estiver conectado.
- Na rodada anterior de 13/11/2026, as proteções de backup/restore foram validadas por testes de shell (24 no Git Bash, 26 no WSL) e por ensaio Docker real sintético: backup com schema completo; restore de 22 tabelas, 1 conta, 1 contato, 1 mensagem e 1 mídia; recusas de volume preenchido e schema incompatível antes de qualquer escrita. Em 13/11, após autorização do usuário, os quatro containers, oito volumes, quatro redes e artefatos temporários do ensaio foram removidos; a verificação posterior não encontrou recursos com o prefixo exclusivo do ensaio. `app` e `db` ativos permaneceram saudáveis.
- O Docker Desktop foi iniciado com autorização do usuário. `app` e `db` do projeto ativo foram retomados automaticamente pela política de restart do engine; nenhum comando de start/stop/recreate, backup, restore ou migration foi executado contra eles. Nenhum banco, volume ou dado ativo foi copiado para o ensaio.
- Limpeza do ensaio de 13/11 concluída após autorização: containers parados, volumes/redes e diretório temporário removidos pelo prefixo exclusivo. `app`/`db` ativos permaneceram saudáveis; demais recursos e dados do projeto não foram removidos.
- Migrations de convites, suspensão e último acesso aplicadas no MySQL local. A de suspensão consta como `Ran [10]`; a de último acesso, como `Ran [11]` desde 13/11/2026.
- Convites por link manual, listagem de contas e suspensão/reativação reversível estão implementados. O usuário confirmou o ciclo de suspender e reativar uma conta de teste.
- O app foi reconstruído; `app` e `db` ficaram saudáveis. O filtro de eventos administrativos foi incluído na imagem. A inspeção visual da atividade autenticada do cliente ainda está pendente.
- Auditoria de prontidão: worker e scheduler passaram por smoke isolado com saída graciosa (código 0); configurações corrigidas para `--timeout=90`, `retry_after=120`, `pcntl` e `SIGTERM`. Backup/restore foi ensaiado com dados sintéticos, incluindo mídia, checksums e 22 tabelas. Esses resultados validam apenas o ambiente descartável local; ainda não foi escolhida hospedagem para o teste online.
- Registro histórico de 13/11: o problema de encerramento com código 137 e a divergência timeout/retry foram corrigidos e validados no smoke descartável; naquela ocasião `fila` e `agendador` estavam parados. Em 16/11, com autorização e após verificar a fila, ambos foram iniciados e estão saudáveis.
- Registro histórico de 13/11: o domínio fixo respondeu HTTP 530 e o túnel local estava parado. Em 16/11, com autorização, o túnel foi iniciado; a origem do hostname foi corrigida no painel Cloudflare para `http://app:80` (porta interna do container). `/up` e `/login` retornaram 200 tanto localmente quanto pelo hostname público. Isso valida o túnel local, não uma hospedagem de produção.
- Verificação agregada de 16/11: `jobs` e `failed_jobs` vazios; um agendamento permanece pendente para `2026-12-01 10:00` no timestamp do banco (nenhum vencido); há dois registros de agendamento no estado `falhou`. A triagem de 16/11 (somente leitura) confirmou que o id 7 é resíduo de teste e o id 10 é fixture demo criada já em `falhou`; por decisão do usuário, nada foi alterado. A fila e o scheduler estão ativos por autorização do usuário.

## Roteiro recomendado: teste interno, piloto e evolução

### Plano de fechamento para teste real e produção

#### Fase 1 — fechar pendências operacionais antes de mensagens reais

- [ ] Conferir visualmente, em sessão autenticada do cliente/demo, que a Atividade não mostra suspensão/reativação. A imagem contém o filtro e o comportamento tem teste, mas a conferência visual de 13/11/2026 ficou pendente porque o navegador integrado desconectou. Repetir quando houver sessão acessível; verificar também se há logs históricos `agendamento_falhou` do caso de suspensão e decidir o tratamento sem editar dados nem migration não autorizada.
- [x] Corrigir e validar worker/scheduler em ambiente descartável: timeout 90, `retry_after=120`, `pcntl`, `SIGTERM` e encerramento gracioso com código 0. **A configuração passou no ambiente descartável; implantar e confirmar no ambiente online depois de escolher hospedagem.**
- [x] Antes de iniciar os workers no ambiente local, conferir a fila existente e decidir como tratar jobs antigos. Em 16/11, a contagem era zero jobs e zero `failed_jobs`; não havia agendamento vencido. Um agendamento futuro permanece para `2026-12-01 10:00`; dois agendamentos estão em estado `falhou` e ainda precisam de triagem, sem alterar seus dados.
- [ ] **Backup antes do online:** a política provisória aprovada para o piloto pequeno é backup diário com 14 cópias, RPO de até 24 h e RTO alvo de até 4 h. Escolher o destino definitivo, a criptografia e a cópia off-site quando a hospedagem for definida; executar o primeiro backup do novo ambiente antes de inserir dados reais. O ensaio até aqui usou somente dados sintéticos; o banco local com mensagens foi deliberadamente excluído.
- [x] Validar restauração isolada de backup sintético: 22 tabelas e um arquivo de mídia, com checksums conferidos. Ainda falta validar o procedimento com backup autorizado de dados reais e recuperar token cifrado com `APP_KEY` protegido.
- [x] Antes de guardar dados reais, registrar a política provisória do piloto pequeno: backup diário, retenção de 14 backups, RPO de até 24 h, RTO alvo de até 4 h, `APP_KEY` em cofre separado, sem expurgo automático de conversas reais e prazos apenas para dados de teste. Destino definitivo, criptografia, off-site, responsável e janela de consistência continuam pendentes da hospedagem.
- [ ] **Recuperação de segredos:** guardar a `APP_KEY` fora do servidor em cofre seguro e provar que pode recuperá-la no restore; sem ela, tokens Messenger cifrados no banco não são recuperáveis.
- [ ] Definir o calendário de repetição do ensaio de restauração no ambiente escolhido; RPO/RTO provisórios já aprovados (24 h/4 h) e responsável operacional ainda pendente.
- [ ] Escolher hospedagem para o teste online e confirmar domínio/HTTPS, `APP_URL` e serviços. O túnel local já foi iniciado e validado em 16/11, mas isso não confirma hospedagem de produção; o HTTP 530 de 13/11 é registro histórico.

**Gate:** não prosseguir para a Página Meta real até confirmar backup restaurável, destino HTTPS sob controle e operação segura da fila/agendador.

#### Fase 2 — preparar email e recuperação de acesso

- [ ] Escolher provedor transacional e configurar domínio/remetente, SPF, DKIM e DMARC; o ambiente atual usa mail em modo de log.
- [ ] Implementar e validar verificação de email e recuperação de senha com tokens de uso único, expiração e limitação de tentativas.
- [ ] Testar entrega e recuperação com endereços controlados. Convites podem continuar sendo enviados manualmente por link durante o primeiro teste interno.

**Gate:** concluir antes de convidar clientes externos; não é bloqueio para testar a Página própria no modo de desenvolvimento Meta.

#### Fase 3 — teste ponta a ponta com Página Meta de teste

- [ ] Configurar credenciais Meta, callback HTTPS, webhook e permissões mínimas; conectar uma Página de teste pelo OAuth.
- [ ] Com worker e agendador iniciados apenas no ambiente escolhido e monitorado, testar mensagem recebida, contato, gatilho, resposta, pausas, caixa de conversas e resposta manual.
- [ ] Testar tipos de mídia suportados, agendamento, desconexão, troca de Página, token/permissão revogados e recuperação da fila.
- [ ] Conferir política de mensagens vigente e confirmar que o webhook, as filas e logs funcionam sem expor tokens ou conversas em logs técnicos.

**Gate:** só considerar o Messenger validado após ida e volta real com a Página de teste e confirmação dos casos de falha/reconexão.

#### Fase 4 — piloto fechado

- [ ] Convidar poucos clientes aprovados manualmente; manter cadastro público fechado e suspensão manual disponível.
- [ ] Definir suporte, responsável por acompanhar fila/token/Página, procedimento de incidente e canal de contato.
- [ ] Definir retenção, exportação e exclusão de contatos, conversas, origens, logs e anexos; publicar política de privacidade e instruções de exclusão.
- [ ] Acompanhar erros, jobs atrasados/falhos, saúde do banco, uso de mídia e falhas do Messenger durante o piloto.
- [ ] Para piloto gratuito ou faturado manualmente, cobrança automática pode aguardar. Não anunciar plano pago recorrente sem ciclo de cobrança, cancelamento, tolerância e suspensão testados.

**Gate:** expandir o piloto somente depois de validar estabilidade, suporte, backup/restore e tratamento de desconexões.

#### Fase 5 — produção pública

- [ ] Implantar em hospedagem estável, independente do computador de desenvolvimento, com domínio/HTTPS, segredos exclusivos, backup automático, restore testado, monitoramento e alertas.
- [ ] Concluir acesso avançado/revisão Meta necessários para clientes sem papel no aplicativo e verificação do negócio se exigida.
- [ ] Completar privacidade, exclusão de dados, termos, suporte e cobrança conforme o modelo comercial.
- [ ] Fazer revisão final de concorrência MySQL, acesso entre contas, shutdown/retry dos workers, políticas de envio Meta e rollback/deploy.


### Controle de acesso comercial: convite e pagamento

**Estado em 13/11/2026:** cadastro público continua desativado por padrão; convite validado pela suíte e teste manual de emissão/aceite pelo usuário. As migrations de convite, suspensão e último acesso foram aplicadas no MySQL local; a de último acesso entrou em 13/11/2026 (`Ran [11]`). O painel administrativo separa emissão de convites e contas de clientes; a suspensão/reativação foi validada manualmente pelo usuário. O link do convite continua sendo copiado e enviado manualmente; email automático permanece opcional para o piloto.

- [x] Fechar o cadastro público antes de abrir o sistema; manter login e criar contas novas somente por convite autorizado. `GET` e `POST /cadastro` retornam 404 por padrão; o link só aparece com a configuração reativada.
- [x] Criar convite de uso único vinculado ao email, com prazo de validade, revogação e registro de quem convidou. O banco armazena somente `token_hash`; o token em texto puro aparece apenas no link devolvido ao administrador.
- [x] Criar uma função administrativa da plataforma, separada das contas dos clientes, para emitir, revogar e acompanhar convites. A allowlist de emails não concede acesso às conversas ou dados dos clientes.
- [x] No resgate, o email é o emitido (o formulário não o altera), a conta isolada é criada em transação e o convite é consumido com `lockForUpdate`; a sessão é regenerada. A concorrência real em MySQL ainda não foi provada.
- [ ] Documentar e validar o bootstrap do administrador da plataforma em uma instalação nova: allowlist via ambiente protegido, conta autorizada, recuperação/rotação do acesso e ausência de promoção pública ou senha padrão.
- [ ] Para o piloto, permitir convites aprovados manualmente e identificar a condição de acesso (por exemplo, piloto autorizado e validade), sem bloquear o desenvolvimento por cobrança automática.
- [ ] Para cobrar no lançamento, integrar um provedor de pagamento e fazer o acesso depender de uma assinatura/plano ativo, com período de tolerância para falhas de cobrança, suspensão reversível e tratamento de cancelamento. Convite controla quem pode entrar; sozinho não comprova pagamento.
- [ ] Testar abuso de convites: expirado, revogado, reutilizado, email diferente e tentativas repetidas já estão cobertos. Falta validar dois resgates concorrentes em MySQL real.

### Painel de gestão de clientes e contas

**Estado atual em 13/11/2026:** a área administrativa separa emissão de convites e listagem paginada de contas. Suspensão/reativação manual está implementada com modal, motivo, ator e administrador responsável. O cliente não recebe eventos administrativos atuais na Atividade; a confirmação visual após o rebuild continua pendente. O envio automático de convite por email não existe. A subpágina de convites exibe emissão, validade, resgate e revogação a partir dos dados já persistidos. A lista de contas exibe o último acesso registrado em `users.last_login_at`; a migration foi aplicada somente no MySQL local em 13/11/2026. `sessions.last_activity` continua sendo apenas atividade de sessão ativa, não histórico.

- [x] Listar contas de clientes com nome, email, data de criação e estado, com paginação.
- [x] Implementar `users.last_login_at`, atualização somente em login bem-sucedido e exibição na lista administrativa. A migration reversível foi aplicada somente no MySQL local em 13/11/2026 (`Ran [11]`); os testes usam SQLite em memória.
- [x] Autorizar e executar a migration de último acesso no MySQL local confirmado; sem a coluna, a lista administrativa que a consulta falharia. A aplicação no futuro banco de hospedagem faz parte do deploy autorizado.
- [x] Exibir as datas de emissão, validade, resgate e revogação na subpágina de convites; `revogado_em` passou a ser retornado pelo controller. O administrador emissor ainda não é exibido.
- [x] Exibir o administrador emissor dos convites recentes na V2; o controller faz eager loading de `emissor`, o payload expõe somente id/nome/email e a interface tem fallback para emissor indisponível. `ConviteTest` cobre emissor presente/nulo e ausência de token/hash no payload. A conferência visual autenticada continua pendente porque a sessão foi encerrada após a reconstrução local do `app`.
- [x] Implementar suspensão e reativação reversíveis com modal, motivo, data e ator registrado; a migration correspondente está aplicada no MySQL local.
- [x] Bloquear logins e sessões e impedir novos envios/inícios de fluxo para contas suspensas; dados são preservados. Execuções em andamento são encerradas.
- [ ] Exercitar concorrência real MySQL e shutdown de worker.
- [x] Manter o isolamento das conversas/anexos entre contas e limitar o painel administrativo a dados operacionais de acesso.
- [ ] Opcional para o piloto: enviar convites por email pelo FlowChat e permitir reenvio seguro. Hoje o administrador copia o link e envia por fora; configurar primeiro um serviço real de email, pois o ambiente de exemplo usa mail em modo log.

### Bootstrap do administrador da plataforma

**Estado:** `FLOWCHAT_PLATFORM_ADMIN_EMAILS` apenas autoriza um usuário que já exista. O comando somente-console `flowchat:criar-administrador` está implementado; não há seeder de administrador, senha padrão nem rota pública de promoção. O middleware responde 404 para quem não está na allowlist.

- [ ] Definir a allowlist no ambiente protegido, sem versionar e sem expor os emails em logs ou documentos.
- [x] Implementar o comando `flowchat:criar-administrador`, com entrada interativa de senha e confirmação, validação de email/senha, exigência de email já presente na allowlist e recusa de duplicação; coberto por testes em SQLite.
- [x] Cobrir em SQLite o fluxo de bootstrap → login → `/admin/convites` e a recusa do modo `--no-interaction`. Nenhuma credencial real foi usada.
- [ ] Executar o comando em uma instalação nova/isolada, revisar a saída e confirmar o acesso real a `/admin/convites`; isso não foi feito no banco ativo e requer ambiente descartável e autorização operacional.
- [ ] Recuperação/rotação: alterar a senha por console (não há reset por email), atualizar a allowlist no ambiente e recarregar a configuração conforme o deploy. Remover o email revoga o acesso administrativo na próxima requisição, mas não apaga a conta.
- [ ] Validar o procedimento de rotação/recuperação no ambiente escolhido; o comando de bootstrap não altera a senha de usuário existente.

### Etapa A — preparar um teste real restrito

- [x] Corrigir o helper `criarFluxoComEtapa` em `tests/Feature/MidiaFluxoTest.php` para gravar `texto => ''`, e executar novamente os testes direcionados e a suíte completa em SQLite em memória. Resultado daquela rodada de 10/11: 72 testes/511 asserções aprovados; a suíte posterior de 12/11 passou com 86 testes/598 asserções. Envio simulado de imagem/áudio/vídeo/documento validado.
- [x] Excluir `.env`, `.git` e demais arquivos privados do contexto Docker; injetar segredos somente em runtime. A imagem construída foi inspecionada e não contém `.env`, `.git`, `.npmrc`, `.mcp.json`, `tests` nem `phpunit.xml`. Se imagens antigas foram compartilhadas, avaliar rotação de credenciais.
- [x] Remover credenciais fixas do Compose, configurar `APP_KEY`, `APP_ENV`, `APP_DEBUG=false`, `APP_URL` e configurações de runtime protegidas; restringir a porta do banco ao acesso necessário.
- [x] Substituir o servidor PHP embutido e separar servidor, worker e scheduler com healthchecks. Apache validado; worker e scheduler passaram smoke isolado com encerramento SIGTERM e código 0. O túnel do ambiente online ainda depende da escolha de hospedagem e da configuração do domínio.
- [ ] Restringir o acesso ao ambiente de teste a pessoas autorizadas. Não abrir cadastro público para clientes enquanto não houver controle de acesso adequado.
- [ ] Preparar backup do banco e dos anexos e confirmar que é possível restaurá-los antes de guardar conversas reais.

### Etapa B — testar com a Página Meta de teste

- [x] Configurar OAuth/callback HTTPS, webhook, permissões e Página no app Meta; usuário confirmou manualmente callback, Página e os eventos `messages`, `messaging_postbacks`, `messaging_referrals`. A integração manual continua disponível e não depende de OAuth como única forma.
- [x] Validar recebimento de mensagem, criação do registro, despacho/processamento do Job e execução de fluxo com respostas de texto; nova tentativa controlada retornou HTTP 200 e persistiu uma mensagem recebida.
- [ ] Validar pausa, mídia real, caixa de conversas com sessão de cliente, agendamentos após ativar a janela de 24 h, desconexão/troca de Página, token revogado e recuperação da fila.
- [x] Restringir os testes atuais a Página e pessoa autorizadas enquanto o app permanece em desenvolvimento. Não abrir para clientes externos sem concluir análise/acesso Meta.

### Etapa C — antes de um piloto com clientes externos

- [ ] Confirmar acesso e análise das permissões Meta exigidos para pessoas que não tenham papel no aplicativo; concluir verificações do negócio se o painel exigir.
- [ ] Implementar ou confirmar verificação de email e recuperação de senha; o exemplo atual usa envio de email em modo de log. Manter cadastro controlado até esse fluxo estar pronto.
- [ ] Definir política de privacidade, retenção, exportação e exclusão de dados; documentar como remover conversas, contatos, anexos e dados de origem.
- [ ] Garantir que erros técnicos e logs não exponham tokens, segredos nem conteúdo integral das conversas.
- [ ] Adicionar monitoramento de erros, fila parada/atrasada, falhas de envio, armazenamento e saúde do banco; definir quem recebe alertas e como agir.
- [ ] Completar testes de regressão de isolamento entre contas em controllers, anexos, webhook, agendamentos e Jobs, além de concorrência e falhas da Graph API simuladas.
- [ ] Conferir as regras vigentes do Messenger para janela de envio e agendamentos e aplicar validação no backend quando necessário.

### Etapa D — priorizar após observar o uso

- [x] Paginar contatos/conversas e carregar histórico sob demanda para contas maiores. Lista paginada em 25, busca no servidor e histórico em páginas de 30, com testes em `tests/Feature/ConversasPaginacaoTest.php`.
- [x] Atualizar a lista e a prévia de mensagens automaticamente a cada 30 s, somente com a aba visível, e usar avatar com iniciais quando não há foto. Não simular presença online nem inventar foto real.
- [ ] Avaliar snapshot/versionamento de fluxos em execução, envio de anexos nas respostas, recebimento de anexos e automações vinculadas a anúncios.
- [ ] Considerar vários usuários por conta, cobrança, relatórios, IA ou outros canais somente após validar a necessidade com clientes reais.

### Registro histórico da rodada de 10/11/2026 (estado superado pelo consolidado acima)

- A migration de mídia foi executada e os containers anteriores tinham os limites PHP confirmados. A nova imagem Apache foi construída e validada com smoke test em SQLite isolado.
- A suíte usa SQLite em memória: 72 aprovados, 0 falhas, 0 erros e 511 asserções. Nenhum envio real à Meta foi testado.
- OAuth e webhook estão implementados no código, mas dependem da configuração Meta e do teste com a Página, ainda pendentes.
- Registro da auditoria de prontidão de 12/11: Docker Desktop acessível; `app`/`db` saudáveis, imagens reconstruídas, fila/agendador recriados mas mantidos parados no projeto ativo; smoke dos processos ocorreu somente em projeto descartável. O túnel local ficou parado e o domínio público retornou HTTP 530. Consulte `relatorios/2026-11-12-auditoria-prontidao-piloto.md` para evidências e limitações.

## Prioridade 1 — antes de clientes reais

- [x] **Validar encerramento e retry após falha de envio.** O job encerra a execução com `fluxo_falhou` em falha de texto/mídia e no método `failed()` após esgotar as tentativas. Testes cobrem falha de upload, falha de envio, `failed()` e nova tentativa sem reenvio; retries transitórios com a fila real ainda não foram exercitados.
- [x] **Excluir segredos e histórico Git das imagens Docker.** `.dockerignore` e injeção em runtime foram corrigidos; a imagem construída foi inspecionada e não contém `.env`, `.git`, `.npmrc`, `.mcp.json`, `tests` nem `phpunit.xml`. Se imagens antigas foram compartilhadas/publicadas, rotacionar credenciais potencialmente expostas.
- [ ] **Evitar execuções duplicadas em concorrência.** A execução manual usa bloqueio por contato e o agendamento tem transição atômica; o webhook ainda faz verificação/criação não atômica. A suíte cobre idempotência sequencial, mas não concorrência real em MySQL.
- [ ] **Verificar as regras vigentes da Meta para envio e agendamento.** Registrar a data da última mensagem recebida e avaliar como o FlowChat deve avisar ou impedir envios que não sejam permitidos. Confirmar políticas e exceções atuais da Meta antes de codificar a regra.
- [x] **Proteger os dados das contas com testes de regressão.** Além de conversas, histórico, resposta manual, fluxos, execuções, agendamentos e anexos, `IsolamentoContasTest` agora chama diretamente `EnviarEtapaFluxo`, `ExecutarAgendamento`, `ProcessarMensagemEntrante` e `RegistrarOrigemContato` com IDs/PSIDs cruzados entre contas. O HTTP é fakeado; nenhum envio real à Meta ocorre.
- [x] **Conectar e validar o recebimento básico via Meta.** App ID/Secret conferidos privadamente, callback/Página/eventos confirmados pelo usuário, POST recente HTTP 200 e mensagem registrada/processada. **Ainda pendem** troca/desconexão, token revogado e recuperação operacional.

## Prioridade 2 — robustez do Messenger

- [ ] **Definir privacidade e retenção.** O texto integral da conversa recebida e o corpo bruto de erros da Meta já não vão para os logs técnicos. Ainda faltam prazos de retenção e procedimentos de exclusão para mensagens, origens e logs.
- [ ] **Preservar a versão do fluxo em execução.** A edição atual é transacional, mas uma execução pode ler as etapas novas após uma edição. Avaliar versionamento ou snapshot das etapas para que cada execução termine com a configuração com que começou.
- [x] **Paginar listas extensas.** A caixa de conversas pagina 25 contatos com busca no servidor e carrega o histórico sob demanda em páginas de 30; a atualização automática respeita a visibilidade da aba.
- [ ] **Melhorar diagnóstico da conexão.** A nova área Configurações → Conexão agrupa estado da Página e OAuth; ainda falta diagnóstico real de validade/autorização, inscrição no webhook e instruções de reconexão sem revelar tokens.
- [ ] **Validar limites e conteúdo de mensagens.** Alinhar validação de mensagens do editor e respostas manuais às regras atuais da Send API e exibir erros compreensíveis antes do envio.
- [ ] **Completar a cobertura de testes para falhas e concorrência.** Coberto: Graph API rejeitando upload/envio, token ausente, retry de `attachment_id`, `failed()`, isolamento entre contas (incluindo chamadas diretas dos Jobs) e envio simulado de imagem/áudio/vídeo/documento. Ainda faltam concorrência real em MySQL, fila esgotada e indisponibilidade de rede.

## Prioridade 3 — preparação para produção e apresentação

- [ ] **Escolher e preparar hospedagem para o teste online.** Ainda não há VPS confirmada ou escolhida. O domínio fixo respondeu HTTP 530, o que sozinho não comprova a existência de servidor de origem. Fila e restore sintético foram validados localmente; configurar ambiente remoto, backup, criptografia/off-site e operação continua pendente.
- [x] **Atualizar a imagem de build do frontend.** Node 24 foi usado no build da auditoria de prontidão.
- [ ] **Pendência de segurança antes de expor o app:** `composer audit` e `npm audit --omit=dev` estavam limpos em 13/11/2026; em 16/11/2026 o audit encontrou advisory baixo em `laravel/framework v13.35.0` (CVE-2026-128083, corrigido a partir de 13.40.0). Busca estática não encontrou `Concurrency::run` em `app`, `routes` ou `tests`, caminho necessário para o cenário descrito no advisory; ainda assim, atualizar o framework e repetir a suíte antes da exposição pública. `npm audit --omit=dev` segue limpo. A atualização não foi feita sem autorização.
- [x] **Escrever um README do FlowChat.** README geral criado em 13/11/2026 com produto, stack, áreas, execução local, dados demo, arquitetura, testes, backup, política do piloto, proposta de CI e limites dependentes de hospedagem.
- [ ] **Adicionar CI para testes e estilo.** A proposta de CI local sem segredo está documentada no README. Em 16/11/2026, a suíte completa passou (122 testes/1.063 asserções), o build passou, `npm audit --omit=dev` ficou limpo e os testes isolados de backup/restore passaram (30/30); `composer audit` reportou CVE-2026-128083 em Laravel 13.35.0. `pint --test` não foi usado por regra do projeto. Nenhum workflow foi publicado/conectado; decidir implementação depois de avaliar a atualização do framework.
- [ ] **Organizar alterações em commits pequenos e revisáveis.** A auditoria de 12/11 encontrou 105 caminhos alterados/não rastreados no branch `main`; preservar tudo, revisar o diff e registrar a versão exata em commit/tag antes do deploy.

## Possibilidade de produto para anúncios

- [ ] **Avaliar automações vinculadas à origem/anúncio.** O projeto registra dados de referrals e anúncios, mas essa origem não inicia um fluxo por si só. Depois de estabilizar o Messenger, validar se o caso de uso precisa escolher fluxos diferentes por anúncio, campanha ou tipo de entrada.

## Deixar para depois

- [ ] Não iniciar integração com WhatsApp, Instagram, cobrança, IA ou editor visual avançado até validar o fluxo Messenger com usuários reais e identificar uma necessidade concreta.

## Decisões pendentes de operação, retenção e backup

Esta rodada registra apenas prazos provisórios para ambiente de teste; não define política legal nem prazos finais. As decisões abaixo continuam sendo do responsável pelo produto/operação antes de clientes reais:

### Escopo do ensaio de backup/restore de 12/11/2026

O ensaio anterior comprovou dump do banco sintético, arquivo do volume de mídia, checksums e restauração em projeto isolado (22 tabelas, 1 conta, 1 arquivo sintético). Em 13/11/2026, o ensaio Docker real com dados sintéticos comprovou backup com 22 migrations e schema completo, restore de 22 tabelas/1 conta/1 contato/1 mensagem/1 mídia, recusa de volume preenchido antes do banco e recusa de schema incompatível antes de qualquer escrita. **Não** comprovou restauração de dados reais, recuperação de token com a `APP_KEY` correta, criptografia, cópia off-site, RPO/RTO nem o ambiente online. Quando a hospedagem for escolhida, repetir com backup autorizado do ambiente real, guardar a `APP_KEY` em cofre separado, definir criptografia/off-site, testar a recuperação de um token e agendar ensaios periódicos.

### Política provisória aprovada para o piloto pequeno (13/11/2026)

Base documental aprovada, **não** é aconselhamento jurídico nem declaração de conformidade. Revisar os prazos antes de guardar dados de pessoas reais. Nenhum expurgo automático será implementado nesta etapa:

- **Frequência e retenção:** backup diário, com retenção de 14 backups diários.
- **RPO/RTO:** RPO de até 24 horas e RTO alvo de até 4 horas.
- **`APP_KEY`:** guardada separadamente em cofre de senhas/segredos, nunca junto dos backups; a recuperação de um token cifrado ainda precisa ser provada.
- **Conversas reais:** sem expurgo automático.
- **Mensagens e anexos de teste/demonstração:** até 30 dias ou exclusão ao encerrar a rodada, o que ocorrer primeiro.
- **Origens de teste:** acompanham a retenção do contato/conversa correspondente.
- **Logs operacionais:** 90 dias (somente dados de teste).
- **Logs administrativos/de segurança:** 180 dias (somente dados de teste).
- **Criptografia e off-site:** configurar somente quando o destino de hospedagem for escolhido; não estão ativas hoje.
- **Rotina local:** não criar tarefa agendada no Windows nem rotina de backup para o banco local atual.

Para excluir uma conta/contato, a ordem sugerida é:

1. **Mensagens:** apagar linhas e metadados; antes, identificar os caminhos de anexos referenciados.
2. **Anexos privados:** remover arquivos em `storage/app/private/flowchat/etapas/{account_id}` somente após conferir referências em mensagens e etapas; arquivo compartilhado não deve ser apagado.
3. **Origens:** apagar `origens_contato` do contato/conta (dados de anúncio, referência e mensagem inicial).
4. **Logs:** aplicar a retenção provisória acima; logs administrativos têm prazo diferente dos funcionais.
5. **Jobs/failed_jobs:** limpar payloads antigos, pois podem conter PSID e texto de mensagem mesmo após a exclusão das tabelas principais.
6. **Sessões/cache:** remover sessões e cache associados; não são conteúdo de conversa, mas contêm identificadores de acesso.

**Impactos:** excluir dados do banco **não** remove cópias já existentes nos backups; exclusão de contato não deve apagar mídia ainda referenciada por etapa de fluxo; requisitos legais de auditoria podem exigir retenção diferente da conversa.

- [ ] **Retenção de mensagens:** provisório para teste: 30 dias ou exclusão ao encerrar a rodada, o que ocorrer primeiro; revisar antes de dados de pessoas reais.
- [ ] **Exclusão de dados:** como atender pedidos de exclusão de contato/conta e o que apagar em mensagens, origens, logs e arquivos privados.
- [ ] **Logs:** provisório para teste: operacionais 90 dias e administrativos/segurança 180 dias; revisar prazos, acesso e revisão periódica antes de dados reais.
- [ ] **Backup do MySQL:** política aprovada: diário, 14 cópias, RPO de até 24 h e RTO alvo de até 4 h. Criptografia, destino local definitivo e off-site, responsável e janela de consistência continuam pendentes da hospedagem. Os scripts foram ensaiados com banco e mídia sintéticos; o banco local com mensagens não foi copiado. Primeiro backup do ambiente real, criptografia e off-site continuam pendentes.
- [x] **Proteções de backup/restore:** impedir `FLOWCHAT_BACKUP_DIR` igual ou dentro do repositório, exigir volume de mídia vazio antes do banco, validar schema fail-closed por migrations/hashes, recusar volume usado por **qualquer** container do projeto de destino (inclusive mesmo label/parado), validar senha alfanumérica do MySQL isolado e recusar backup antigo sem metadados de schema. Validadas com 28 testes de shell, `bash -n`, `compose config` estático e ensaio Docker real sintético em 13/11/2026, incluindo recusas antes de escrita. Não houve novo backup/restore real nesta revisão.
- [ ] **Backup da mídia:** o ensaio conjunto de banco e mídia sintéticos foi restaurado com sucesso; ainda falta definir janela operacional e validar com backup real autorizado.
- [ ] **Teste de restore:** RPO/RTO provisórios aprovados (24 h/4 h); proteger separadamente a `APP_KEY`, validar recuperação de token cifrado com backup autorizado e programar repetição periódica no ambiente escolhido.
- [ ] **Credenciais:** rotação de `APP_KEY`, senha do banco, token do túnel e credenciais Meta; registrar quem tem acesso e como revogar. A senha root aleatória do Compose só vale para um volume MySQL novo; o volume existente pode manter a credencial anterior.
- [ ] **Token revogado/Página desconectada:** procedimento operacional para identificar falhas, avisar o responsável e solicitar reconexão sem perder mídia.
- [ ] **Fila parada:** monitoramento, alerta e procedimento para reprocessar ou encerrar execuções presas.

## Preview de design V2 — estado em 13/11/2026

Escopo implementado nesta rodada, como área de avaliação visual isolada. Nada aqui substitui a interface atual nem altera dados.

**O que existe agora**

- Rotas em `/preview/design-v2/*` com grupo próprio, protegidas por `auth`, `conta.ativa` e `preview.design-v2`; contas e convites exigem também `admin.plataforma`.
- `FLOWCHAT_PREVIEW_DESIGN_V2` controla a área: vazio = apenas `APP_ENV=local`; `false` = 404 em qualquer ambiente; `true` = habilitada explicitamente. Fora do local, o padrão é desativado.
- Telas cobertas: mapa do preview, painel/atividade, conversas, histórico do contato, fluxos, editor de fluxo, agendamentos, configurações, administração de contas, administração de convites, login, cadastro/convite, limite de sessões, escolha de Página do Messenger e conta suspensa.
- `Mapa` concentra a documentação de cobertura, limites e os estados de interface (vazio, carregando, erro, confirmação e feedback).
- Conteúdo inteiramente fictício em `resources/js/Pages/Preview/DesignV2/_data/demonstracao.js`; nenhum model é consultado pelo controller.
- `resources/js/app.jsx` ganhou uma resolução aditiva para páginas aninhadas; a resolução das páginas existentes continua igual.
- `resources/css/app.css`, as páginas, os componentes e as rotas de produto **não** foram alterados.

**Pendências desta área**

- Conferência visual concluída em 13/11/2026 nas resoluções 1440×900, 1280×720 e 390×844, com o `app` reconstruído e apenas esse serviço recriado. Foram corrigidos 12 problemas confirmados por medição: sobreposição do ícone nos campos de busca, controles mobile/desktop que não escondiam por conflito de cascata, lista e conversa empilhadas no celular, rolagem do trilho em tela de 720 px, coluna de data cortada no painel, overflow horizontal das tabelas, desalinhamento das três colunas do editor, rótulos/inputs desalinhados em Agendamentos e Configurações, backticks visíveis, rolagem indevida ao abrir uma conversa no celular e overflow de 6 px em Agendamentos. Detalhes e evidências antes/depois na seção 11 de `relatorios/2026-11-13-preview-design-v2.md`. Ainda não foram cobertos: tablet 768×1024, tema claro capturado, Safari/Firefox e leitor de tela real.
- O preview usa uma amostra de fusos IANA; a tela real continua usando a lista completa de `FusosHorarios::listar()`.
- A escolha de Página do Messenger depende do retorno real do OAuth; no preview a lista é fictícia.
- `FLOWCHAT_PREVIEW_DESIGN_V2=true` está no `.env` local para permitir a visualização; remover ou definir `false` antes de qualquer deploy e recriar o `app`.
- Upload de mídia, validações de backend, jobs e chamadas à Meta não são executados.
- Se a V2 for promovida a interface oficial, decidir destino dos assets, do CSS e dos fixtures, além de remover o flag de preview.

## Interface padrão V2 e área de legado — estado em 15/11/2026

**O que mudou**

- As rotas normais passaram a renderizar a V2 com os dados reais: painel, conversas, histórico, fluxos, editor, agendamentos, configurações, conexão, administração, login, cadastro, sessões, escolha de Página e conta suspensa.
- `app/Support/Design.php` escolhe o componente pelo nome da rota; os controllers, validações e o isolamento por conta não foram duplicados.
- As páginas antigas continuam em `/legado/*`, autenticadas, com os mesmos controllers. As rotas de legado são GET; as ações de formulário seguem para os endpoints de produção e retornam para a V2.
- `Configurações` ganhou o submenu `Geral`/`Conexão`; `/configuracoes/conexao` concentra OAuth, status, desconexão e configuração manual. As rotas `configuracoes/messenger/*` (callbacks e seleção) permanecem intactas.
- Conversas não tem paginação numerada: a lista carrega por cursor em `/conversas/mais?antes_id=` com “Carregar mais”, e o histórico continua em `/contatos/{id}/mensagens?antes=`.
- Detalhes do contato em painel lateral (≥1400 px) e gaveta acessível abaixo disso, com o histórico dentro da ficha; o item “Histórico do contato” saiu do menu.
- A rolagem fica nas áreas internas, com barra fina que aparece ao rolar, no hover e no foco de teclado; o documento não rola no desktop.
- A identidade visual nova (`MarcaFlowChat`, favicon e `app.blade.php`) foi mantida e aplicada na casca V2.
- `resources/js/app.jsx` resolve `Pages/V2/*` e `Pages/Preview/DesignV2/*` por `import.meta.glob`; sem isso as telas promovidas abriam em branco.

**Pendências**

- Redesign do editor de fluxo implementado; build local e imagem `app` passaram em 15/11/2026. Inspeção visual inicial em 800 px confirmou que a casca V2 esconde o trilho lateral e mostra uma faixa horizontal de navegação no topo. A avaliação completa em desktop/mobile e os testes automatizados continuam pendentes; nenhuma gravação de fluxo foi feita.
- Navegação responsiva da V2 implementada: trilho lateral recolhível no desktop e hamburger com drawer vertical abaixo de 1024 px; faixa horizontal removida. Drawer testado em 800 px (abertura, submenu Configurações, Escape, backdrop e retorno de foco); falta validar em telefone e o rail compacto/flyout em desktop ≥1024 px antes de concluir a pendência.
- Validação da Conversa promovida com uma conta que tenha contatos/conversas reais; a conta autenticada na verificação estava sem contatos, então o fluxo completo foi validado no preview com fixtures.
- Tablet 768×1024, tema claro capturado, Safari/Firefox e leitor de tela real continuam sem cobertura.
- As páginas de legado navegam de volta para a V2 pelos próprios links; é uma área de referência visual, não uma segunda aplicação.
- `FLOWCHAT_PREVIEW_DESIGN_V2=true` permanece no `.env` local; remover ou definir `false` antes de deploy e recriar o `app`.
- Nenhuma captura da aplicação real com dados do cliente foi mantida; uma captura da tela de login com e-mail autofill foi apagada.

# Auditoria de código — 19/11/2026 (itens 4 a 12)

Relatório completo gerado na sessão de 19/11. Os itens 1, 2, 4 e 7 estão corrigidos; o item 3 foi adiado por decisão do usuário e o item 8 (código morto) foi resolvido pela Fase 1 da refatoração. Os demais ficam registrados para as próximas rodadas.

## Deveria corrigir

- [ ] **3. Mídia recebida não é guardada** (`app/Jobs/ProcessarMensagemEntrante.php:62-68`, `WebhookMessengerController.php:121-126`). O webhook repassa só `text`; quando o cliente manda foto, áudio ou documento, nada entra em `mensagens`. Decidido em 19/11 deixar para depois. A conversa mostra “Imagem recebida” só depois de persistir o anexo; o teste atual em `WebhookMessengerTest` já fixa o comportamento de descartar. Opções: guardar só o tipo (sem arquivo) ou baixar e gravar em disco privado, com limite de tamanho, allowlist de mime e retenção.
- [ ] **5. Busca de conversas varre a tabela de mensagens** (`app/Http/Controllers/ConversaController.php:108`). `like '%termo%'` não usa índice. Avaliar `FULLTEXT` em `mensagens.texto` (migration exige autorização) ou restringir a busca a nome/PSID. Medir com volume antes de mudar.
- [ ] **6. Webhook pode escolher a integração errada** (`app/Http/Controllers/WebhookMessengerController.php:45`). Não há unicidade em `messenger_integrations.page_id`; duas linhas com a mesma Página mandam mensagens para a primeira conta que o banco devolver. Antes de criar o índice único, conferir duplicatas existentes e decidir qual linha fica. Conferido em 19/11: 0 duplicados no banco local.
- [ ] **10. `cache` e `logs` crescem sem limite** (`CACHE_STORE=database`, tabela `logs`). Criar comando de limpeza (entradas de cache expiradas e logs além de 90 dias) e agendar. Definir retenção com o usuário antes de apagar qualquer coisa.

## Seria bom

- [ ] **9. Agendamento vencido republicado a cada minuto** (`app/Console/Commands/ProcessarAgendamentos.php:20-23`). Com fila atrasada, o mesmo agendamento entra várias vezes na fila. Considerar `->limit(50)` ou `ShouldBeUnique`.
- [ ] **11. `trustProxies(at: '*')`** (`bootstrap/app.php:18-23`). Hoje só alcançável pela rede do Compose, mas permite forjar `X-Forwarded-For` e escapar do limite de login por IP (`LoginController.php:46`) se a porta for exposta. Restringir aos IPs do túnel/proxy na hora de escolher a hospedagem.
- [ ] **12. Corrida na checagem de execução em andamento** (`ProcessarMensagemEntrante.php:71-76`). Hoje há 1 worker, então não ocorre. Antes de escalar a fila, usar `lockForUpdate()` no contato dentro de transação, como em `ExecutarFluxoController`.

## Corrigidos

- **1. Reenvio duplicado após timeout do worker** — commit `c4d5847`. `EnviarEtapaFluxo` agora tem `tries=1` e `timeout=80`, e todas as chamadas HTTP do job têm `connectTimeout(5)` com `timeout` de 15 s (envio) ou 45 s (upload). O pior caminho fica em 75 s, abaixo do `--timeout=90` do worker.
- **2. Execução presa bloqueia o contato para sempre** — commit `df35d0a`. Comando `fluxos:encerrar-presas {--minutos=360}` fecha execuções sem atividade e grava `fluxo_encerrado_sem_atividade`; roda de hora em hora. Coberto por `ExecucaoFluxoPresaTest` (4 casos).
- **4. Todos os fluxos compatíveis disparam juntos** — commit `1e481b6`. Regra definida: o **fluxo ativo mais antigo (menor `id`) vence**; os demais não iniciam no mesmo evento. Coberto por `test_somente_o_fluxo_ativo_mais_antigo_inicia_no_mesmo_gatilho`.
- **7. Comparação do token de verificação do webhook** — commit `4cdf263`. `hash_equals` no lugar de `===`, recusando também token vazio não configurado, com teste do caminho negado.
- **8. Código morto de preview e legado** — Fase 1 da refatoração (merge `16c7824`). Saíram ~6,2 mil linhas: páginas do legado, preview, `App\Support\Design`, controller/middleware de preview e componentes órfãos.

> As correções 1 e 2 já estão ativas nos containers (rebuild e recriação em 19/11). As correções 4 e 7 entram em vigor em `fila`/`app` no próximo rebuild.

## Como encerrar um lembrete

Marcar um item como concluído somente depois de revisar a implementação e o comportamento correspondente. Para tarefas que envolvam migration, manter a regra do projeto: apresentar a migration e aguardar autorização explícita antes de executá-la.

### Envio automático dos convites por email

- [ ] No piloto, manter a emissão com link para copiar e envio manual; isso permite validar convites sem depender da entregabilidade de email.
- [ ] Antes de automatizar, escolher um provedor de email transacional e configurar autenticação do domínio (SPF, DKIM e DMARC), remetente e política de tratamento de falhas.
- [ ] Implementar envio do convite pela fila e registrar estados de envio (pendente, enviado e falha), com opção de tentar novamente sem criar convites duplicados.
- [ ] Incluir no email a identidade do FlowChat, quem convidou quando aplicável, o prazo de sete dias para resgate e um link seguro de uso único.
- [ ] Manter a opção de copiar o link como alternativa quando o envio falhar; não expor nem armazenar o token em texto puro além do necessário para formar o link.
- [ ] Testar entrega e apresentação com endereços controlados antes de depender do envio automático para clientes.

# Refatoração — estado em 20/11/2026

- **Fase 0** (CI, Pint, ESLint, Playwright e baseline visual): tag `checkpoint/fase-0`.
- **Fase 1** (remoção de legado e preview, 12,8 mil linhas): commits `acdebf7` e `ee39212`, merge `16c7824`, tag `checkpoint/fase-1`; branch de arquivo `arquivo/preview-design-v2`.
- **Auditoria 4 e 7** (fluxo mais antigo vence; `hash_equals` no token): commits `1e481b6` e `4cdf263`, merge `bc73ce7`, tag `checkpoint/fix-auditoria-4-7`.
- **Fase 2** (backend): commits `5cf9954` (Form Requests), `5b60288` (validação/anexos/etapas), `b89ae48` (horário e fuso), `b1e7712` (envio de etapa) e `bfba276` (mensagem recebida), merge `fc5bb1a`, tag `checkpoint/fase-2`. Alvos: `FluxoController` 226 linhas, `EnviarEtapaFluxo` 207, `ProcessarMensagemEntrante` 50; suíte 154/1.007, Pint e build verdes, sem mudança de schema, rota, payload ou log.
- Pendente: reconstruir a imagem e recriar `app`/`fila`/`agendador` para ativar a Fase 2 no runtime; `main` segue local, sem push.
- Próximo: Fase 3 (frontend), começando por Login/Cadastro e Configurações, com Vitest e o teste de sair do editor com alteração não salva.

## Refatoração — estado em 23/11/2026

- Fase 3 retomada na branch `refactor/fase-3-frontend`; limpeza de CSS órfão concluída no commit `d34995d`.
- Verificação atual: PHP 154 testes/1.007 asserções, Pint limpo, Vitest 19/19, Playwright 14/14 e build aprovados. ESLint encerra com zero erros e nove avisos; consultar `PLANO_REFATORACAO.md` para os arquivos/avisos e tamanhos do bundle.
- Comparação visual pixel a pixel: 32 imagens claras e 20 escuras iguais aos baselines. Arquivos temporários fora do repositório: `%LOCALAPPDATA%\Temp\opencode\refatoracao` e `%LOCALAPPDATA%\Temp\flowchat-visual-pos-css`.
- Reconciliada a contagem de testes: 11 testes exclusivos do preview/legado saíram na Fase 1, dois comportamentos foram mantidos em `DesignV2Test` e oito testes foram adicionados depois (157 − 11 + 8 = 154).
- Pendências separadas encontradas na revisão (comportamentos preexistentes, não introduzidos pela Fase 3):
  - [ ] Em `resources/js/Pages/V2/AdminContas.jsx`, “Ativas” e “Suspensas” contam somente a página atual de até 15 contas. Tornar os rótulos explícitos (“nesta página”) ou fornecer totais globais.
  - [ ] Em `resources/js/components/v2/conversas/useConversas.js`, carregar mensagens anteriores aciona o efeito que rola a conversa para o fim; preservar a posição do histórico durante a inserção no início.
  - [ ] A mesma tela guarda erro de carregar histórico em `erroThread`, mas não o exibe. Mostrar feedback e oferecer retry.
- O audit inicial exigido pelo plano não foi localizado nos relatórios/Markdown disponíveis; a comparação histórica permanece impossível com os artefatos atuais. A auditoria final foi registrada abaixo; decidir se ausência do baseline inicial será aceita como limitação antes de criar a tag `checkpoint/fase-3`.
- ESLint desta retomada terminou com zero erros e nove warnings existentes: `HistoricoContato.jsx` e `button.jsx` (imports não usados), `useConversas.js` (`erroThread` não usado e dependência de memo), `EditorEtapa.jsx` (`etapas` não usado), `useEditorFluxo.js` (dependências de efeitos) e `tema.js` (variáveis de catch não usadas). Nenhum arquivo PHP foi alterado.

### Auditoria final de código — 23/11/2026

Escopo lido: README e dependências; Compose, configuração de middleware e rotas; webhook do Messenger, OAuth, jobs de entrada/envio/agendamento, despacho de agendamentos e testes associados. Não foi feita releitura arquivo a arquivo de toda a aplicação nem prova de carga/Meta real. Não encontrei `Must fix` novo atribuível à Fase 3. Itens concretos para triagem, não bloqueadores desta refatoração:

- [ ] **Erro ao carregar histórico fica invisível** (`resources/js/components/v2/conversas/useConversas.js:27, 227`). Se a API falhar, `erroThread` recebe uma mensagem, mas não há consumidor no frontend; informar a falha e permitir nova tentativa.
- [ ] **Agendamentos vencidos podem ser despachados repetidamente** (`app/Console/Commands/ProcessarAgendamentos.php:20-23`). Se a fila estiver atrasada, o scheduler enfileira os mesmos IDs em cada ciclo; com carga crescente isso amplia a fila. Limitar o lote e/ou tornar o job único, mantendo a transição de estado segura.
- [ ] **Proxy confiável aceita qualquer origem** (`bootstrap/app.php:20-25`). Se a porta do app for exposta fora da rede privada prevista, um cliente pode forjar `X-Forwarded-For` e contornar limites baseados em IP. Restringir aos proxies reais antes de expor o serviço; hoje o Compose documenta apenas acesso local e Cloudflare Tunnel.

O relatório inicial Ponytail pré-Fase 0 não consta em `relatorios/`, `RELATORIOS.md` nem nos Markdown pesquisados. Assim, a auditoria atual fica registrada, mas não se afirma redução comparável de dívida histórica. Também não foi feita prova de concorrência com MySQL nem chamada real à Meta nesta revisão.




