# Auditoria Ponytail — fechamento da Fase 3

**Data:** 23/11/2026
**Branch:** `refactor/fase-3-frontend`
**Referência anterior:** não localizada. Esta auditoria passa a ser a primeira referência preservada para comparações futuras.

## O que o repositório faz

FlowChat é um MVP Laravel + React/Inertia para automação e atendimento pelo Facebook Messenger. Recebe webhooks, grava conversas, executa fluxos em fila e permite administração de contas. A escala considerada é pequena, com um worker e uma implantação Compose conforme README; o efeito sob carga maior foi sinalizado quando relevante.

## Resultado

Não encontrei `Must fix` novo que impeça a Fase 3. Os itens abaixo têm cenário reproduzível e devem ser triados em mudanças próprias.

### Should fix

1. **Métricas de contas parecem totais globais** (`resources/js/Pages/V2/AdminContas.jsx:50-51`)
   - **O que é:** A lista de contas é paginada em grupos de 15.
   - **Problema:** Com 16 contas, os cards “Ativas” e “Suspensas” contam apenas as 15 linhas da página, embora os rótulos pareçam representar o total.
   - **Correção mínima:** Indicar “nesta página” ou fornecer os agregados globais pelo servidor.
   - **Se ficar assim:** O administrador vê contagens incompletas como se fossem totais.

2. **Histórico salta para o fim ao carregar mensagens antigas** (`resources/js/components/v2/conversas/useConversas.js:74-80, 218-241`)
   - **O que é:** O efeito de rolagem envia a thread ao fim quando muda o número de mensagens.
   - **Problema:** Carregar mensagens anteriores insere itens no início e dispara o mesmo efeito; a posição que a pessoa estava lendo se perde.
   - **Correção mínima:** Preservar a posição visual durante a inserção no início; manter a rolagem ao fim para novas mensagens e troca de contato.
   - **Se ficar assim:** É preciso procurar novamente no histórico depois de cada página carregada.

3. **Falha ao carregar histórico não aparece na interface** (`resources/js/components/v2/conversas/useConversas.js:27, 218-241`)
   - **O que é:** O hook grava a falha em `erroThread`.
   - **Problema:** Nenhum componente consome esse estado; uma resposta HTTP inválida ou falha de rede deixa a pessoa sem explicação.
   - **Correção mínima:** Exibir o erro junto ao histórico e oferecer nova tentativa.
   - **Se ficar assim:** A ação parece não fazer nada quando o histórico não carrega.

4. **Scheduler pode enfileirar repetidamente os mesmos agendamentos** (`app/Console/Commands/ProcessarAgendamentos.php:18-22`)
   - **O que é:** A cada ciclo, o comando percorre todos os agendamentos pendentes vencidos e despacha seus IDs.
   - **Problema:** Se a fila atrasar, cada ciclo publica os mesmos IDs outra vez; jobs redundantes aumentam o atraso e o volume de trabalho.
   - **Correção mínima:** Limitar o lote e reservar os itens de forma atômica ou tornar o job único.
   - **Se ficar assim:** O backlog pode crescer mais rápido que a capacidade do worker.

5. **Duas contas podem conectar a mesma Página em uma corrida** (`app/Http/Controllers/ConectarMessengerController.php:201-205`; `app/Http/Controllers/WebhookMessengerController.php:48`)
   - **O que é:** A seleção consulta se a Página já pertence a outra conta e depois grava a integração.
   - **Problema:** Duas seleções concorrentes podem passar pela consulta antes que qualquer uma grave. O webhook então resolve a Página pela primeira linha encontrada.
   - **Correção mínima:** Garantir unicidade de `page_id` no banco após conferir duplicatas existentes e tratar a violação na seleção.
   - **Se ficar assim:** Eventos dessa Página podem ser associados à conta errada.

### Nice to have

6. **Cabeçalhos de proxy confiáveis aceitam qualquer endereço** (`bootstrap/app.php:20-25`)
   - **O que é:** Laravel confia em cabeçalhos encaminhados por qualquer proxy (`at: '*'`).
   - **Problema:** Se o app for exposto diretamente, um cliente pode forjar `X-Forwarded-For` e contornar controles baseados no IP. O Compose atual limita a porta do app a loopback e prevê o Cloudflare Tunnel.
   - **Correção mínima:** Antes de expor o app diretamente ou mudar de hospedagem, limitar proxies confiáveis aos endereços reais.
   - **Se ficar assim:** A limitação por IP deixa de ser confiável em uma implantação fora da topologia atual.

## Busca pelo audit inicial

Procurei em `relatorios/`, `RELATORIOS.md`, Markdown do projeto, histórico Git, arquivos temporários do OpenCode e no banco/log local de sessões do OpenCode. Há uma auditoria de webhook Meta e uma auditoria de prontidão operacional, mas não um audit Ponytail geral anterior à Fase 0. Portanto, não é possível calcular quais achados foram resolvidos desde aquele ponto. Este relatório é a nova referência para a próxima auditoria.

## Verificações da Fase 3

- PHP: 154 testes, 1.007 asserções; Pint limpo.
- Vitest: 19/19; Playwright: 14/14.
- Playwright adicional: login e rotas Painel, Conversas, Fluxos, Editor, Agendamentos, Configurações e Conexão sem `console.error` ou erro de página.
- Comparação visual: 32 imagens claras e 20 escuras idênticas ao baseline nas quatro larguras verificadas.
- ESLint terminou com zero erros e nove warnings existentes; build concluído. Tamanhos e warnings estão detalhados em `PLANO_REFATORACAO.md`.
- CSS órfão removido no commit `d34995d`.

## Não verificado

- Concorrência real em MySQL com múltiplos workers.
- OAuth/webhook e envios reais na Meta.
- Carga de produção e revisão linha a linha de todos os arquivos do repositório.
- Relatório Ponytail inicial, que não foi encontrado.
