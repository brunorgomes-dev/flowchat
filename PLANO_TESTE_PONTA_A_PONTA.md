# Plano de testes ponta a ponta do FlowChat

> **Estado:** plano criado; execução não iniciada.
>
> **Objetivo:** validar o FlowChat como uma pessoa usuária faria, do acesso inicial até a automação por Messenger e anúncio, e registrar evidências e pendências num relatório final.

## 1. Regras para executar com segurança

- Começar em ambiente de staging, com banco, credenciais, domínio e arquivos separados dos dados locais e de qualquer ambiente de produção.
- Não usar clientes, contatos, tokens ou anúncios de terceiros. Para a integração Meta, usar Página e conta controladas pelos participantes do teste, com autorização explícita.
- Enquanto o app Meta estiver em desenvolvimento, limitar a interação às contas com função no app. Testar com pessoas fora dessas funções ou com clientes reais somente depois das permissões e liberações necessárias da Meta e da aprovação do responsável pelo piloto.
- O teste de anúncio pago é um gate separado: só avançar quando a configuração Meta estiver liberada, a política de privacidade estiver publicada e revisada, houver Página/anúncio de teste autorizado e estiver definido o limite de gasto. Não impulsionar anúncio como parte dos testes automatizados.
- Identificar todos os dados de teste com prefixo `E2E-` e anotar como removê-los. Não executar `migrate:fresh`, limpeza em massa ou comandos de demonstração em ambiente compartilhado/Cloud.
- Guardar evidências sem expor senhas, tokens, conteúdo privado de conversas ou dados pessoais desnecessários. Em falha, interromper o cenário dependente, registrar o problema e preservar logs/horários para investigação.

## 2. Preparação e critérios de entrada

Antes da bateria, registrar:

- Ambiente, versão/commit implantado, URL, navegador e horário de início/fim.
- Estado do banco e confirmação de que é exclusivo de staging; migrations aplicadas e resultado do backup/restore, se configurado.
- Estado dos processos web, fila e scheduler; conexão de banco; armazenamento persistente de anexos; logs e alertas disponíveis.
- `APP_DEBUG` desligado, HTTPS ativo, domínio/callbacks corretos e segredos definidos no ambiente — sem copiar valores secretos para o relatório.
- `APP_KEY` estável, guardada com segurança e exclusiva do staging. O token da Página é criptografado com essa chave; perder ou trocar a chave pode impedir sua leitura. Não reutilizar a chave local.
- Configuração Meta usada (app de staging, modo, funções dos testers, Página, webhook e permissões), ocultando IDs sensíveis e tokens.
- Política de privacidade e URLs exigidas pela Meta: registrar como bloqueio se ainda aguardarem a advogada; não preencher com texto provisório para liberar o teste.
- Estado inicial vazio ou conhecido. Criar uma conta de teste, uma Página controlada, dois contatos participantes e fluxos identificados como `E2E-`.

**Bloqueios atuais conhecidos:** não há ambiente Laravel Cloud provisionado; o destino de mídia persistente ainda precisa ser decidido; e a integração Meta real depende da política revisada, app de staging, Página controlada, funções/permissões, redirect OAuth, webhook HTTPS e credenciais configuradas. O cadastro não tem verificação de e-mail nem recuperação de senha; esses comportamentos ficam fora desta bateria até serem implementados. Playwright exige browsers instalados localmente.

**Gate de entrada:** staging responde por HTTPS, migrations estão aplicadas, fila e scheduler podem ser observados, anexos sobrevivem a reinício/redeploy e nenhum dado real será alterado. Se qualquer item falhar, não começar os testes funcionais no staging. A suíte automatizada local pode estabelecer a linha de base antes desse gate, desde que cada comando abaixo seja executado somente no ambiente indicado.

### 2.1 Linha de base e limites dos comandos

Executar inicialmente, em ambiente local de teste, para registrar o estado atual do código:

```text
php artisan test --compact
npm test
npm run lint
npm run build
```

Esses quatro comandos formam a **linha de base automatizada** recomendada. Registrar resultado, duração e falhas; não corrigir código nesta etapa sem autorização específica.

Comandos condicionais, fora da linha de base:

- `npm run e2e`: somente local, após conferir que `playwright.config.js` aponta para `database/e2e.sqlite`. O servidor E2E executa `migrate:fresh`; nunca executar em Cloud, staging, produção ou banco compartilhado. Credenciais/seeder E2E são apenas para o ambiente descartável.
- `FLOWCHAT_MYSQL_CONCURRENCY_TEST=1 php tests/Concurrency/verify_mysql.php`: somente com o MySQL descartável exigido pelo harness (`127.0.0.1:3308`, banco `flowchat_concurrency_test` e usuário `flowchat_test`). O harness também recria o banco; nunca usar em ambiente compartilhado.
- `vendor/bin/pint --dirty --format agent`: formatador que pode modificar arquivos PHP. Não é teste; usar apenas quando houver arquivos PHP intencionalmente alterados e a formatação fizer parte do escopo aprovado.
- `composer audit` e `npm audit`: revisão de dependências, não teste ponta a ponta. Executar como gate separado de segurança/release e registrar falhas sem atualizar dependências automaticamente.

Mapeamento dos testes de fase, todos executados localmente contra a base de teste:

```text
# A — cadastro, convite e bootstrap administrativo
php artisan test --compact tests/Feature/CadastroContaTest.php tests/Feature/ConviteTest.php tests/Feature/CriarAdministradorPlataformaTest.php
# B — login e sessões
php artisan test --compact tests/Feature/LoginSessionLimitTest.php tests/Feature/UltimoAcessoTest.php
# C — integração sintética; não substitui OAuth/webhook real
php artisan test --compact tests/Feature/ConectarMessengerTest.php
# D — gestão de fluxos, mídia e horários
php artisan test --compact tests/Feature/GerenciarFluxosTest.php tests/Feature/MidiaFluxoTest.php tests/Feature/HorarioInicioFluxoTest.php
# E — execução, webhook e conversas
php artisan test --compact tests/Feature/ExecucaoFluxoTest.php tests/Feature/WebhookMessengerTest.php tests/Feature/ConversasPaginacaoTest.php tests/Feature/HistoricoContatoTest.php
# F — janela de envio e agendamentos
php artisan test --compact tests/Feature/Janela24hAgendamentoTest.php tests/Feature/ExecucaoFluxoPresaTest.php
# G — gatilho sintético; não substitui anúncio real
php artisan test --compact tests/Feature/GatilhoAnuncioFluxoTest.php
# H — isolamento, suspensão e concorrência (harness isolado, conforme acima)
php artisan test --compact tests/Feature/IsolamentoContasTest.php tests/Feature/AdminContaSuspensaoTest.php
# I — interface ponta a ponta local
npm run e2e
```

Na Fase F, Compose já declara localmente o worker `php artisan queue:work --tries=3 --sleep=1 --timeout=90` e o scheduler `php artisan schedule:work`; `routes/console.php` agenda `agendamentos:processar` a cada minuto e `fluxos:encerrar-presas` de hora em hora. Isso não configura esses processos na Cloud: o ambiente hospedado ainda precisa de worker e scheduler próprios (por exemplo, uma execução periódica de `schedule:run`) e observabilidade.

## 3. Ordem da bateria

Cada cenário recebe um estado: **Aprovado**, **Reprovado**, **Bloqueado** ou **Não executado**. Para cada um, guardar passo, resultado esperado, resultado observado, horário e evidência sanitizada.

### Fase A — Primeiro acesso e cadastro

1. Abrir a página inicial sem sessão; confirmar que não revela dados internos e encaminha ao login.
2. Verificar a regra atual de criação de conta: cadastro público bloqueado por padrão; validar cadastro por convite se esse for o fluxo habilitado para o piloto.
3. Com convite válido, cadastrar usuário com nome, e-mail e senha; confirmar criação de conta própria, vínculo correto, confirmação do fuso e acesso à área autenticada.
4. Tentar convite inválido, vencido, revogado e já usado; confirmar rejeição sem criar conta/sessão. Confirmar que o e-mail do convite não pode ser trocado no resgate.
5. Validar entradas inválidas, e-mail existente, senha inválida e limite de tentativas; mensagens devem ser compreensíveis e não revelar detalhes internos.

### Fase B — Login, sessão e saída

1. Entrar com credenciais válidas; confirmar destino, sessão autenticada e registro de último acesso.
2. Tentar senha incorreta; confirmar que o acesso é recusado e o último acesso não é atualizado.
3. Abrir nova sessão até o limite configurado; testar a escolha de sessão a encerrar e o cancelamento do login pendente.
4. Sair e tentar voltar usando a sessão encerrada; confirmar bloqueio.
5. Verificar páginas protegidas sem login e conta suspensa; nenhuma deve permitir ações autenticadas.

### Fase C — Integração com Página do Messenger

1. Conectar o Facebook pela tela de Configurações; concluir OAuth com uma conta autorizada e selecionar a Página controlada.
2. Confirmar estado conectado, Página exibida e webhook inscrito; recarregar a tela e confirmar persistência.
3. Cancelar o fluxo OAuth e testar erros/recusas de permissão sem deixar conexão parcial.
4. Tentar conectar Página já vinculada a outra conta de teste; confirmar conflito claro e que a integração existente continua ativa.
5. Desconectar e reconectar; confirmar atualização da integração e da inscrição sem duplicação.
6. Verificar que tokens não aparecem em tela, URL, mensagens de erro ou logs.

**Gate Meta:** se a Meta não permitir a interação no modo e com as funções atuais, marcar os cenários dependentes como **Bloqueado por acesso Meta**, sem tentar contornar o controle.

### Fase D — Fluxos: criação, edição e validação

1. Criar fluxo `E2E-Texto` com duas etapas; salvar, recarregar, reabrir e confirmar conteúdo, ordem e estado.
2. Editar e reordenar etapas; confirmar que o editor persiste a ordem e os destinos corretos.
3. Testar variáveis disponíveis, pausas, indicador de digitação e encerramento de etapa.
4. Criar condição por horário com intervalos válidos; verificar caminhos dentro/fora do horário, limites, sobreposição inválida e condição que cruza meia-noite.
5. Anexar uma amostra autorizada de cada tipo suportado (imagem, áudio, vídeo e documento); confirmar prévia, persistência, substituição e remoção.
6. Tentar tipo/MIME incompatível, tamanho acima do limite, texto e mídia incompatíveis e arquivo ausente; confirmar validação clara e ausência de arquivo órfão.
7. Desativar, reativar e excluir um fluxo de teste; confirmar que somente o fluxo esperado fica elegível para iniciar.

### Fase E — Execução e conversas

1. Iniciar fluxo manualmente para um contato de teste; acompanhar cada etapa na fila e confirmar mensagens enviadas e execução concluída.
2. Enviar mensagem real à Página a partir da conta tester participante; confirmar recebimento no webhook, criação/atualização do contato, registro da mensagem e início automático do fluxo configurado.
3. Reenviar o mesmo evento de webhook; confirmar deduplicação sem duplicar mensagem ou execução.
4. Responder manualmente pela caixa de conversas; confirmar resposta no Messenger e histórico com direção e horário corretos.
5. Conferir busca, filtro, paginação/carregamento incremental, ficha do contato, histórico e origem de anúncio sem misturar dados entre contatos.
6. Testar evento de entrega/eco da Página e mensagem sem texto (anexo), conforme suportado; confirmar que não iniciam automação indevida.
7. Expirar ou simular a janela de mensagens permitida em staging; confirmar que o envio é bloqueado e registrado de forma segura, sem insistência/reenvio indevido.

### Fase F — Agendamentos e fuso horário

1. Confirmar ou alterar fuso da conta e verificar que a interface exibe horários nesse fuso.
2. Agendar fluxo para horário futuro; confirmar estado pendente, fluxo/contato corretos e data mostrada.
3. Cancelar antes do horário; confirmar estado cancelado e nenhuma mensagem enviada.
4. Deixar um agendamento de teste vencer; confirmar que scheduler o detecta, worker executa uma única vez e estado final fica coerente.
5. Reprocessar o mesmo agendamento e simular dois processadores concorrentes; confirmar execução única.
6. Testar horário inexistente/ambíguo por mudança de horário de verão, horário passado, conta suspensa e fluxo/contato inválidos; confirmar tratamento definido e visível.
7. Verificar agendamento fora da janela de conversa Meta; confirmar que o sistema não envia mensagem fora do permitido e informa/finaliza adequadamente.

### Fase G — Gatilho por anúncio (piloto controlado)

**Pré-requisitos:** política revisada/publicada; requisitos Meta e permissões aprovados para o tipo de teste; app e Página autorizados; anúncio Click-to-Messenger de teste controlado; participante ciente; gasto máximo aprovado.

1. Criar fluxo `E2E-Anuncio` associado ao `ad_id` exato do anúncio controlado e manter um fluxo genérico como comparação.
2. Fazer o participante abrir a conversa pelo anúncio e enviar a primeira mensagem; confirmar origem registrada e fluxo específico escolhido.
3. Confirmar dados de origem disponíveis na conversa (por exemplo, ID/título quando enviados pela Meta), sem inventar campos ausentes.
4. Repetir evento/referral e mandar mensagens seguintes; confirmar que não cria execuções repetidas nem reinicia indevidamente o fluxo.
5. Mandar mensagem sem contexto de anúncio; confirmar uso do fluxo genérico, não do fluxo específico.
6. Testar contato com execução já aberta e limite temporal permitido para a conversa originada pelo anúncio; confirmar prioridade, deduplicação e bloqueio de envio após expiração.
7. Encerrar o teste, pausar/remover o anúncio e registrar gasto observado. Não usar público amplo nem clientes reais nesta etapa sem liberação explícita.

Se esse gate ainda não estiver liberado, manter a fase **Bloqueada** e executar apenas os testes sintéticos já cobertos pela suíte, sem simular sucesso real da Meta.

### Fase H — Isolamento, falhas e segurança operacional

1. Criar uma segunda conta de teste e verificar acesso cruzado a contatos, mensagens, mídia, fluxos, agendamentos e Página; todas as tentativas devem ser recusadas.
2. Testar conta suspensa: login, sessão ativa, webhook, jobs e agendamentos não devem continuar automatizando envios.
3. Simular falha da API Meta, token inválido, timeout, worker parado e arquivo de mídia indisponível; verificar estado final, logs e recuperação sem duplicar mensagens.
4. Confirmar que requisições repetidas, cliques duplos e eventos concorrentes não criam execuções/envios duplicados.
5. Revisar logs e respostas de erro: sem tokens, senhas, corpo bruto desnecessário de conversas ou stack trace público.
6. Reiniciar/reimplantar staging conforme procedimento acordado; confirmar persistência do banco e das mídias, fila retomada e webhook alcançável.

### Fase I — Interface e regressão final

1. Percorrer login, cadastro/convite, conversas, ficha/histórico, painel, fluxos, editor, agendamentos e configurações em desktop e viewport móvel.
2. Verificar erros visuais, estados vazios, carregamento, validação, navegação, foco de teclado e tema claro/escuro.
3. Confirmar que as telas não retornam erro 5xx e que o console do navegador não registra erros durante o percurso.
4. Executar a linha de base da seção 2.1 e os testes de fase aplicáveis no ambiente local descartável; registrar comando, duração, resultado e falhas sem editar dados reais. Playwright é exclusivamente local por causa do `migrate:fresh` configurado no webServer.
5. Repetir o percurso crítico completo uma vez após corrigir falhas bloqueadoras: login → conexão da Página → fluxo → mensagem → resposta → agendamento → anúncio, se liberado.

## 4. Critérios de conclusão

- Todos os cenários críticos das fases A–F e H–I estão aprovados ou têm bloqueio/risco aceito com responsável e próximo passo registrado.
- A fase G só conta como aprovada se o teste real controlado for autorizado e concluído; testes sintéticos não substituem a validação da integração Meta real.
- Não há falha crítica aberta envolvendo isolamento de contas, envio duplicado, credenciais, janela de mensagens ou persistência de dados.
- Filas e scheduler processam tarefas de teste, falhas são observáveis e o app recupera sem duplicar envios.
- O relatório final foi preenchido, revisado e inclui recomendação explícita: **apto para piloto controlado**, **apto com ressalvas** ou **não apto**.

## 5. Modelo do relatório final

```text
FlowChat — Relatório de testes ponta a ponta
Data/período:
Ambiente e commit/build:
Responsáveis/participantes:
Configuração Meta (modo, Página e permissões; sem tokens):

Resumo: aprovado / aprovado com ressalvas / não apto
Cenários: aprovados __ | reprovados __ | bloqueados __ | não executados __

Fase | Resultado | Evidência | Defeito/risco | Responsável/próximo passo

Defeitos críticos:
Defeitos altos/médios/baixos:
Pendências Meta/política:
Observações de fila, scheduler, armazenamento e desempenho:
Dados de teste criados e procedimento de limpeza:
Gasto de anúncio (se autorizado):

Conclusão e recomendação para o piloto:
```

## 6. Base existente no repositório

O plano aproveita as coberturas já existentes em `tests/Feature` para cadastro, convites, login/sessões, OAuth sintético, isolamento, fluxos, mídia, execução, janela de mensagens, agendamentos, webhook e gatilho por anúncio. `tests/Browser/smoke.spec.js` cobre fluxos principais de interface; `tests/Concurrency` contém o harness MySQL de concorrência. Na execução futura, registrar essas coberturas antes de repetir cenários manualmente e usar a bateria manual para validar integração real, operação em staging e jornada de produto.

O repositório não tem ambiente Laravel Cloud provisionado nem workflow de CI definido. Antes da bateria hospedada, provisionar app/processo web, MySQL isolado, worker, scheduler, HTTPS, `APP_KEY` persistente, variáveis Meta e armazenamento durável de mídia. O armazenamento atual usa `FILESYSTEM_DISK=local` e `storage/app/private/flowchat/etapas/{account_id}`; é preciso decidir entre volume persistente suportado no ambiente ou object storage compatível e validar upload/download depois de restart/redeploy. Sem isso, a Fase C real, as Fases E/G com Messenger e os testes de persistência da Fase H ficam bloqueados.

Para Meta, staging requer app de desenvolvimento próprio, conta tester com função no app, Página controlada, URL pública HTTPS para OAuth/webhook e credenciais de integração configuradas (`MESSENGER_APP_ID`, `MESSENGER_APP_SECRET`, `MESSENGER_LOGIN_CONFIG_ID` e `MESSENGER_VERIFY_TOKEN`). Não registrar valores secretos no relatório. A política de privacidade ainda aguarda a advogada; portanto, interação com clientes fora das funções do app e anúncio real ficam bloqueados até a revisão/publicação e as liberações necessárias da Meta. Até lá, usar somente as coberturas sintéticas já existentes.

Este documento é somente o plano: nenhum comando foi executado como parte de sua criação.
