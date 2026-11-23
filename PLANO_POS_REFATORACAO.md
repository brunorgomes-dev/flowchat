# Plano de evolução pós-refatoração do FlowChat

> **Estado:** proposta de execução, ainda sem mudanças de código. A refatoração das Fases 0–3 está encerrada em `checkpoint/fase-3`.
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
- O Compose define um único serviço worker por padrão. O início manual já bloqueia a linha do contato em transação, mas o início automático por mensagem e por agendamento não usa a mesma serialização. Uma ação manual simultânea com esses caminhos ainda pode competir mesmo sem escalar workers. A suíte PHP usa SQLite em memória; não prova concorrência real em MySQL.
- As funcionalidades de billing, múltiplos usuários, relatórios e IA não serão iniciadas nem incluídas como dependências deste plano.

## Ordem de execução

### Fase 1 — Corrida na conexão da Página

**Prioridade:** recomendada antes de onboarding OAuth simultâneo de várias contas; a chave única existente já protege a associação e o roteamento entre contas.
**Viabilidade:** alta; esforço pequeno/médio; sem migration prevista. O risco é erro inesperado/estado externo inconsistente na tentativa perdedora, não vínculo duplicado.

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

1. Inventariar os caminhos que iniciam execução: mensagem recebida, agenda e início manual. O caminho manual já bloqueia a linha do contato; os outros precisam adotar a mesma regra.
2. Definir uma única regra de exclusão por contato e garantir que todos os caminhos apliquem a mesma serialização no banco.
3. Avaliar bloqueio transacional da linha do contato e/ou restrições adequadas. Manter chamadas HTTP externas fora da transação; a transação deve proteger a decisão e a criação, não aguardar a Meta.
4. Rever os jobs de agendamento e a reserva condicional de estado para evitar trabalho duplicado. Reenfileirar o mesmo ID hoje não duplica a execução: `ExecutarAgendamento` muda `pendente` para `executado` atomicamente; o risco atual é consumo redundante da fila.
5. Criar testes de integração isolados com MySQL 8.4 e pelo menos dois processos concorrentes; não usar o banco local nem clientes reais.

**Aceite:** concorrência simultânea não cria duas execuções incompatíveis para o mesmo contato; dados de contas diferentes continuam isolados; suíte SQLite permanece verde e o teste MySQL comprova o lock/constraint real.

### Fase 4 — Gatilho por anúncio/campanha

**Necessidade:** confirmada pelo usuário.
**Prioridade:** após as regras de versão e concorrência, para que contexto e início sejam consistentes com múltiplos workers.
**Viabilidade:** média; provavelmente exige mudança de schema nas regras de fluxo e na UI.

1. Especificar seleção do anúncio: proposta inicial é associar um `ad_id` exato a uma regra/fluxo. Não presumir agrupamento por campanha, pois a origem hoje persiste `ad_id`, não uma entidade de campanha completa.
2. Definir o evento que inicia o fluxo: referral/click, primeira mensagem recebida com contexto do anúncio, ou outro evento. **Não iniciar envios a partir de referral isolado sem confirmar a regra e a janela aplicável da Meta.**
3. Definir prioridade quando um anúncio e um gatilho comum casarem. Recomendação: correspondência específica do anúncio precede a regra genérica; dentro da mesma prioridade, manter uma regra determinística e documentada.
4. Resolver o contexto de referral de forma consistente com jobs concorrentes. Hoje a origem e a mensagem podem ser despachadas para jobs distintos; o início não deve depender de uma gravação assíncrona que ainda não ocorreu.
5. Considerar evento repetido, referral separado da mensagem, mensagem sem referral, anúncio desconhecido, conta suspensa e contato com execução aberta.
6. Cobrir payloads sintéticos versionados e comportamento determinístico. Antes de qualquer teste real, validar formato do evento, assinatura de `messaging_referrals`, permissões e regras de mensagem na documentação e no app Meta configurado.

**Aceite:** somente a conta dona do anúncio pode casar; um evento repetido não inicia fluxos duplicados; a regra específica/generica e o evento de início ficam previsíveis; nenhum envio viola a janela ou política aplicável da Meta.

## Dependências e gates

```text
Página exclusiva e OAuth sem erro inesperado
                  ↓
Regra e snapshot de execução definidos
                  ↓
Início serializado e validado em MySQL
                  ↓
Gatilho por anúncio com prioridade e contexto definidos
```

- Uma fase por vez, commit pequeno e revisão antes da próxima.
- Apresentar migrations e consequências de dados antes de executá-las; autorização para escrever código não autoriza migration em ambiente ativo.
- Usar fixtures sintéticas e HTTP fakes. Sem tokens reais, contatos de clientes ou envios reais durante testes automatizados.
- Rodar teste PHP direcionado, suíte relevante, Pint para PHP, Vitest/Playwright para mudanças visuais e build quando aplicável.
- Não escalar worker nem fazer deploy como parte deste plano sem aprovação operacional própria.

## Questões que permanecem abertas

1. Confirmar se a regra proposta de snapshot imutável por execução é a esperada.
2. Definir tratamento das execuções que já estiverem abertas quando o snapshot for ativado.
3. Definir se o gatilho por anúncio dispara no referral ou somente na primeira mensagem associada.
4. Definir se o match inicial será apenas por `ad_id` exato e qual precedência terá sobre gatilhos comuns.

## Referência Meta a validar na Fase 4

- [Webhooks for Messenger — Meta for Developers](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-messenger/)
- [Improvements between Click to Messenger, Lead Gen ads and Messenger Platform — changelog Meta](https://developers.facebook.com/documentation/business-messaging/instagram-messaging/changelog/)

As páginas e permissões da Meta podem mudar. Registrar no relatório da fase quais payloads e regras foram confirmados antes de implementar qualquer envio real.
