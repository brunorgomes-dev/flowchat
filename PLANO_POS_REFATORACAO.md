# Plano de evolução pós-refatoração do FlowChat

> **Estado:** Fases 1, 3 e 4 concluídas; Fase 2 (versionamento de fluxo) adiada por decisão do usuário. Migration da Fase 4 aplicada ao banco Docker local em 23/11/2026. A refatoração das Fases 0–3 está encerrada em `checkpoint/fase-3`.
>
> **Escopo aprovado para planejamento:** exclusividade e tratamento de corrida na conexão de Página; regra de versão das execuções de fluxo; concorrência com MySQL; gatilho de fluxo por anúncio/campanha.
>
> **Fora deste plano por decisão do usuário:** cobrança, múltiplos usuários por conta, relatórios e IA.

## Objetivo

Evoluir a confiabilidade dos envios e acrescentar automação por anúncio sem alterar o comportamento atual até que cada regra esteja definida e coberta. Cada fase terá seus próprios testes, revisão e rollback. Mudanças de schema serão aditivas; aplicar migrations, reconstruir containers ou alterar ambientes ativos exige autorização operacional específica.

## Estado confirmado no código

- A tabela `messenger_integrations` já tem índices únicos para `account_id` e `page_id`. A unicidade global de Página já impede associação duplicada no banco; **não criar outra migration para isso**. Veja `database/migrations/2026_11_09_121141_criar_tabela_integracoes_messenger.php`.
- O OAuth verifica se a Página pertence a outra conta antes de assinar o webhook e gravar a integração. Se duas contas conectarem a mesma Página em paralelo, ou a mesma conta escolher duas Páginas ao mesmo tempo, as restrições únicas de `page_id` e `account_id` protegem o banco, mas a gravação/atualização ou a consistência da inscrição Meta ainda podem falhar. A inscrição é um efeito externo anterior à gravação.
- Uma execução guarda `fluxo_id` e `etapa_atual`. `EnviarEtapaFluxo` procura a etapa atual no fluxo editável a cada job; ainda não há snapshot/versionamento imutável. Uma edição enquanto a execução está em andamento pode afetar etapas futuras daquela execução.
- Origens de contato já guardam `ad_id`, mas as regras de início disponíveis são `novo_contato` e `mensagem_recebida`. Fluxos automáticos elegíveis são resolvidos pelo ID mais antigo.
- O Compose define um único serviço worker por padrão. Os inícios manual, por mensagem e por agendamento bloqueiam a linha do contato em transação e verificam execuções abertas antes de criar outra. O harness MySQL abaixo prova esses caminhos com processos separados.
- As funcionalidades de billing, múltiplos usuários, relatórios e IA não serão iniciadas nem incluídas como dependências deste plano.

**Andamento da Fase 1:** a gravação OAuth agora bloqueia a linha da conta, repete a verificação de disponibilidade após a inscrição Meta e trata conflito de unicidade sem remover a inscrição usada pela conexão vencedora. Nenhuma migration foi criada. Verificação: teste direcionado 4/4 (27 asserções), suíte PHP 158/158 (1.034 asserções) e Pint aprovado. Commits `58a9315` e `350f9de`.

**Andamento da Fase 3:** mensagens e agendamentos usam o mesmo bloqueio por contato do início manual; agendamento também recusa qualquer execução aberta para esse contato. Testes focados 23/23 (109 asserções), suíte PHP 160/160 (1.042 asserções), Pint aprovado e prova MySQL 8.4 aprovada em três cenários concorrentes. O banco foi um container temporário com dados em memória, encerrado após o teste.

## Ordem de execução

### Fase 1 — Corrida na conexão da Página

**Prioridade:** recomendada antes de onboarding OAuth simultâneo de várias contas; a chave única existente já protege a associação e o roteamento entre contas.
**Viabilidade:** alta; esforço pequeno/médio; sem migration prevista. O risco é erro inesperado/estado externo inconsistente na tentativa perdedora, não vínculo duplicado.

**Estado:** concluída em `58a9315` e `350f9de`; aceite verificado por teste direcionado e suíte completa.

1. Preservar as unicidades existentes de `account_id` e `page_id`; confirmar que OAuth e configuração manual tratam ambas de forma coerente.
2. Tratar violações dessas chaves no OAuth como conflitos esperados, com retorno claro em vez de erro 500.
3. Coordenar tentativas concorrentes para que apenas a integração persistida permaneça assinada na Meta. Se a Página já pertencer à conta vencedora da corrida, não remover a inscrição compartilhada dela. Garantir que tokens não apareçam em logs nem em mensagens de erro.
4. Cobrir conexão normal, Página ligada a outra conta, seleção concorrente da mesma Página por duas contas e escolha concorrente de duas Páginas pela mesma conta, usando HTTP fake e conflitos de unicidade.

**Aceite:** no máximo uma integração por Página e por conta; a integração persistida corresponde à inscrição Meta ativa; a tentativa perdedora recebe conflito compreensível e não quebra a conexão vencedora.

### Fase 2 — Regra de versão do fluxo em execução

**Prioridade:** alta antes de clientes dependerem de editar fluxos com execuções em andamento.
**Viabilidade:** média/alta; provável migration; requer decisão sobre conteúdo e mídia.

**Decisão a fechar antes de codificar:** recomendação inicial: congelar a definição do fluxo no início de cada execução. Edições passam a valer para novas execuções; execuções abertas continuam usando as etapas, condições, pausas e textos existentes no snapshot.

1. Confirmar essa regra de produto. Definir também o que acontece com execuções que já estão abertas quando a funcionalidade entrar.
2. Escolher o formato de armazenamento do snapshot e identificar quais dados da etapa são necessários para continuar sem consultar a versão editável.
3. Resolver referências de mídia: manter os arquivos e IDs Meta disponíveis enquanto qualquer execução aberta ainda os utiliza; não duplicar nem apagar mídia silenciosamente.
4. Implementar a leitura pelo snapshot no job, sem mudar a ordem de envio, as regras de horário, o formato do webhook ou as mensagens para a Meta.
5. Cobrir execução aberta seguida de edição, inclusão, remoção e reordenação de etapas; fluxo encerrado; branches/condições; falha e retomada; mídias.

**Aceite:** uma edição não altera o conteúdo que uma execução congelada ainda enviará; novas execuções usam a nova definição; execuções anteriores recebem tratamento explícito e testado.

### Fase 3 — Serialização de início e prova de concorrência MySQL

**Prioridade:** alta antes de permitir ações manuais e automáticas concorrentes com uso real; obrigatória antes de escalar workers.
**Viabilidade:** média; requer ambiente MySQL descartável e coordenação entre caminhos de início.
**Estado:** concluída; teste MySQL 8.4 aprovado em 23/11/2026.

1. Inventariar os caminhos que iniciam execução: mensagem recebida, agenda e início manual. O caminho manual já bloqueia a linha do contato; os outros precisam adotar a mesma regra.
2. Definir uma única regra de exclusão por contato e garantir que todos os caminhos apliquem a mesma serialização no banco.
3. Avaliar bloqueio transacional da linha do contato e/ou restrições adequadas. Manter chamadas HTTP externas fora da transação; a transação deve proteger a decisão e a criação, não aguardar a Meta.
4. Rever os jobs de agendamento e a reserva condicional de estado para evitar trabalho duplicado. Reenfileirar o mesmo ID hoje não duplica a execução: `ExecutarAgendamento` muda `pendente` para `executado` atomicamente; o risco atual é consumo redundante da fila.
5. Harness permanente em `tests/Concurrency/verify_mysql.php` e `flow_start_worker.php`. Validado com dois processos por cenário: mensagem + mensagem, início manual + mensagem e agendamento + mensagem. O harness só aceita `127.0.0.1:3308`, banco `flowchat_concurrency_test` e usuário `flowchat_test`; o container MySQL 8.4 usado foi descartável, com `/var/lib/mysql` em memória.

**Aceite:** atendido. Concorrência simultânea criou uma execução por contato nos três cenários; testes de isolamento existentes e suíte SQLite passaram; o MySQL 8.4 confirmou o bloqueio entre processos.

### Fase 4 — Gatilho por anúncio/campanha

**Necessidade:** confirmada pelo usuário.
**Prioridade:** após validar a concorrência; o versionamento de fluxo foi adiado e não bloqueia esta fase.
**Viabilidade:** média; provavelmente exige mudança de schema nas regras de fluxo e na UI.

**Decisões confirmadas pelo usuário:** associar por `ad_id` exato; iniciar somente na primeira mensagem recebida com contexto de anúncio; priorizar a regra específica sobre a regra genérica. Não iniciar pelo referral isolado.

**Implementação:** migration aditiva criada e aplicada ao banco Docker local; seleção do anúncio no editor de início do fluxo; anúncio mostrado na lista/detalhe; origem persistida antes do processamento da mensagem e associada ao primeiro início elegível.

**Conclusão (23/11/2026):** referrals validados nos formatos `referral` e `postback.referral`; origem registrada antes do job da mensagem; regra do anúncio tem prioridade, eventos repetidos não duplicam execução e execução aberta bloqueia novo início. A janela respeita 24 horas em geral e até 7 dias para Click-to-Messenger, contados desde a primeira mensagem após o clique. Etapas automáticas atrasadas são encerradas após a janela ou quando não há horário válido. Verificação: suíte PHP 166/166 (1.065 asserções) e Pint aprovado. Migration aplicada ao banco Docker local; status confirmado como `Ran`.

1. Associar um `ad_id` exato a uma regra/fluxo; não presumir agrupamento por campanha, pois a origem persiste `ad_id`, não uma entidade de campanha completa. **Implementado.**
2. Iniciar somente na primeira mensagem recebida após o referral; referral isolado não inicia fluxo. **Implementado e coberto por teste.**
3. Quando anúncio e gatilho comum coincidirem, priorizar a regra do anúncio; manter seleção genérica determinística. **Implementado e coberto por teste.**
4. Gravar o contexto antes do processamento assíncrono da mensagem. **Implementado e coberto por teste do webhook.**
5. Cobrir repetição, ausência de referral, contato com execução aberta e expiração da janela. **Coberto por testes sintéticos.**
6. Revisar a configuração e as permissões do app Meta desta instalação antes do primeiro uso real com anúncio. **Pendente; requer acesso ao painel Meta.**

**Aceite:** atendido no código e na suíte automatizada. O anúncio é consultado dentro da conta; duplicatas não geram nova execução; a regra específica precede a genérica; etapas automáticas respeitam a janela da conversa. Migration aplicada no Docker local. Conferir as permissões e a configuração do app no painel Meta antes do primeiro uso real.

## Dependências e gates

```text
Página exclusiva e OAuth sem erro inesperado
                  ↓
Início serializado e validado em MySQL
                  ↓
Gatilho por anúncio com prioridade e contexto definidos
```

O versionamento de execuções permanece planejado, mas está fora do caminho crítico acordado no momento.

- Uma fase por vez, commit pequeno e revisão antes da próxima.
- Apresentar migrations e consequências de dados antes de executá-las; autorização para escrever código não autoriza migration em ambiente ativo.
- Usar fixtures sintéticas e HTTP fakes. Sem tokens reais, contatos de clientes ou envios reais durante testes automatizados.
- Rodar teste PHP direcionado, suíte relevante, Pint para PHP, Vitest/Playwright para mudanças visuais e build quando aplicável.
- Não escalar worker nem fazer deploy como parte deste plano sem aprovação operacional própria.

## Questões que permanecem abertas

1. Confirmar se a regra proposta de snapshot imutável por execução é a esperada.
2. Definir tratamento das execuções que já estiverem abertas quando o snapshot for ativado.
3. Conferir as permissões e a configuração específicas do app Meta do FlowChat antes do primeiro uso real com anúncio.

## Referência Meta a validar na Fase 4

- [Webhooks for Messenger — Meta for Developers](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-messenger/)
- [Improvements between Click to Messenger, Lead Gen ads and Messenger Platform — changelog Meta](https://developers.facebook.com/documentation/business-messaging/instagram-messaging/changelog/)
- [Messenger Platform messaging policy — janela padrão de 24h ou até 7 dias para Click-to-Messenger/Click-to-Direct](https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy)

Documentação oficial consultada em 23/11/2026. A janela de até 7 dias é um limite máximo desde a primeira mensagem após o clique, não uma garantia de elegibilidade para toda conta ou tipo de anúncio. As permissões/configuração do app Meta desta instalação ainda precisam ser conferidas antes do primeiro uso real.
