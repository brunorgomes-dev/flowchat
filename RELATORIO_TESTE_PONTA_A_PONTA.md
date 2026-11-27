# FlowChat — Relatório de testes ponta a ponta

**Data/período:** 25/11/2026, execução única (aprox. 12:20–12:35, horário local).
**Ambiente:** máquina local Windows; nada executado em Cloud, staging ou produção.
**Código testado:** working tree sobre o commit `8d41c4d` (2026-11-23), com 28 arquivos modificados e 5 não rastreados pendentes (incluindo `PLANO_TESTE_PONTA_A_PONTA.md`, a migration de anúncio, `tests/Concurrency/` e `GatilhoAnuncioFluxoTest.php`). O teste reflete o estado local, **não** um build implantado.
**Stack:** PHP 8.3.29, Laravel 13.35.0, Node 20.20.0, npm 10.8.2, Playwright 1.65.1 (Chromium 1255).
**Banco:** a suíte usa SQLite em memória (`phpunit.xml`). O banco local `flowchat` (MySQL, 127.0.0.1) **não foi lido nem alterado**. Playwright usou apenas `database/e2e.sqlite` (descartável, ignorado pelo Git).

## Resumo

**Apto com ressalvas.** A base automatizada de backend está verde (166 testes), o smoke de navegador passou (14/14) e build/lint não têm erros. Há **1 teste de unidade JS reprovado**, a concorrência MySQL não foi provada e nenhuma integração real com Meta/Cloud foi validada. O piloto real continua bloqueado até staging e liberações Meta.

Cenários: aprovados **9 de 9 fases no escopo sintético** | reprovados **1** (teste JS) | bloqueados **3** (C real, G real, H concorrência) | não executados **itens manuais de staging**.

## Comandos executados

| # | Comando | Duração | Resultado |
|---|---|---|---|
| 1 | `php artisan test --compact` | 42,5 s | **Aprovado** — 166 testes, 1065 asserções |
| 2 | `npm test` | 2,9 s | **Reprovado** — 18 passaram, 1 falhou |
| 3 | `npm run lint` | ~5 s | **Aprovado** — 0 erros, 9 avisos |
| 4 | `npm run build` | 31,9 s | **Aprovado** (exit 0) — avisos não bloqueantes |
| 5 | `php artisan test --compact` por fase (A–H) | 65,6 s no total | **Aprovado** em todas as fases |
| 6 | `npm run e2e` | 112,4 s | **Aprovado** — 14/14 |
| 7 | `composer audit` | ~4 s | **1 vulnerabilidade baixa** |
| 8 | `npm audit --omit=dev` | ~3 s | **Aprovado** — 0 vulnerabilidades |

## Resultado por fase

| Fase | Resultado | Escopo e evidência | Limitação |
|---|---|---|---|
| A — Primeiro acesso/cadastro | **Aprovado** | 25 testes / 284 asserções: `CadastroContaTest`, `ConviteTest`, `CriarAdministradorPlataformaTest` — cadastro público bloqueado, convite válido/inválido/expirado/revogado/usado, e-mail imutável no resgate, limites de tentativa | Cadastro/convite por UI não percorrido em staging |
| B — Login/sessão/saída | **Aprovado** | 4 testes / 41 asserções: `LoginSessionLimitTest`, `UltimoAcessoTest`; smoke real cobre login, logout e senha errada | Item de "sessão encerrada reutilizada" sem teste dedicado |
| C — Página do Messenger | **Aprovado (sintético)** | 4 testes / 27 asserções: `ConectarMessengerTest` com `Http::fake` — conexão, troca de inscrição, conflito de Página, corrida entre contas | **OAuth/webhook reais: Bloqueado por acesso Meta** |
| D — Fluxos | **Aprovado** | 40 testes / 225 asserções: `GerenciarFluxosTest`, `MidiaFluxoTest`, `HorarioInicioFluxoTest` — ordem, destinos, horário (inclui virada de meia-noite), mídia, MIME/limite, órfãos, ativar/desativar | Upload real de mídia na Graph API não validado |
| E — Execução/conversas | **Aprovado (sintético)** | 31 testes / 223 asserções: `ExecucaoFluxoTest`, `WebhookMessengerTest`, `ConversasPaginacaoTest`, `HistoricoContatoTest`, `DesignV2Test` — ponta a ponta, deduplicação por `mid`, eco/delivery, janela 24h, logs sem token/corpo | Envio real ao Messenger: **bloqueado** |
| F — Agendamentos/fuso | **Aprovado (sintético)** | 21 testes / 61 asserções: `Janela24hAgendamentoTest`, `ExecucaoFluxoPresaTest` — janela, expiração, execução única, `fluxos:encerrar-presas` | `agendamentos:processar` e `schedule:work` não observados em execução real |
| G — Anúncio | **Aprovado (sintético)** | 6 testes / 23 asserções: `GatilhoAnuncioFluxoTest` — referral inicia fluxo específico, dedup, fallback genérico, janela de 7 dias | **Anúncio real: Bloqueado (gate de política/gasto/Meta)** |
| H — Isolamento/falhas | **Aprovado parcial** | 29 testes / 161 asserções: `IsolamentoContasTest`, `AdminContaSuspensaoTest` — acesso cruzado, suspensão (login, sessão, job, webhook, agendamento), falha de API, token ausente | **Concorrência MySQL: Bloqueado** (porta 3308 fechada); restart/redeploy: não executado |
| I — Interface/regressão | **Aprovado parcial** | `npm run e2e`: 14/14 (painel, conversas, fluxos, editor, agendamento, ausência de 5xx/erros de console, login/logout); lint sem erros; build OK | **1 teste JS reprovado**; viewport móvel e tema escuro não percorridos |

## Defeitos encontrados

**D1 — Teste de unidade JS desatualizado (baixo; resolvido em 25/11/2026).**
`tests/js/editor/util.test.js:123` falha em `capturarEstado > normaliza etapas, anexos, regras e horário`. Evidência sanitizada: o esperado é `{ novo_contato: true, mensagem_recebida: false }`; o recebido inclui também `anuncio_id: ""`. O código do editor passou a expor o campo de anúncio e a expectativa do teste não foi atualizada.
**Resolução:** o estado normalizado do editor sempre inclui `anuncio_id`, inclusive vazio, para comparação consistente. A expectativa foi alinhada e `npm test` passou (19/19). Nenhuma função do produto foi criada ou alterada.

**D2 — Advisory de segurança baixo em dependência (baixo; resolvido em 25/11/2026).**
`composer audit`: CVE-2026-128083 / PKSA-yxbx-3c9s-cjt9, "Task Output Injection - Concurrency Process", em `laravel/framework >=13.0.0,<13.40.0`; instalado 13.35.0.
**Resolução:** `laravel/framework` atualizado para 13.44.1 dentro da restrição existente; suíte PHP passou (166/166) e `composer audit` não encontrou advisories. A aplicação não usa `Concurrency::run`, pré-condição indicada no advisory.

**D3 — Avisos não bloqueantes (informativo).**
9 avisos de ESLint (variáveis/hooks não usados, dependências de `useMemo`/`useEffect`), 0 erros. Build emite aviso de `__dirname` no `vite.config.js` (Vite 8, futura mudança de loader) e ausência do pacote opcional `fontaine`. Não impedem o build.

## Riscos e limitações dos testes sintéticos

1. **Nenhuma chamada real à Meta.** OAuth, Graph API, webhook assinado e referral foram simulados com `Http::fake`/payloads. Isso prova o comportamento do app, não a integração.
2. **`npm run e2e` executa `migrate:fresh`.** Contido porque o `playwright.config.js` fixa `DB_DATABASE` em `database/e2e.sqlite` e o `E2eSeeder` recusa outro caminho. Esse comando **não deve ser reaproveitado** em staging/Cloud.
3. **Concorrência real não provada.** O harness exige MySQL 8.4 descartável em `127.0.0.1:3308` (`flowchat_concurrency_test`/`flowchat_test`); a porta estava fechada e não foi provisionada. Nenhum container foi iniciado.
4. **`APP_DEBUG=true` no `.env` local.** Aceitável aqui; staging precisa de `APP_DEBUG=false`.
5. **Credenciais de teste versionadas** (`e2e@example.test`/`senha-e2e`) e senha demo: uso restrito a banco descartável/local; nunca em staging.
6. **Cobertura parcial de fuso/DST** e ausência de teste dedicado para reutilização de sessão encerrada.
7. **Sem validação móvel/tema escuro** e sem teste real de upload de mídia.

## Bloqueios de Cloud e Meta

- **Laravel Cloud/staging:** não provisionado (sem `.laravel-cloud/`, CLI ou ambiente). Faltam URL HTTPS, `APP_KEY`, worker, scheduler e armazenamento persistente. A mídia usa disco local (`storage/app/private/flowchat/etapas/{account_id}`), o que exige volume persistente ou object storage — decisão de infraestrutura, não apenas configuração.
- **Meta:** app de staging, testers/funções, Página controlada, callbacks OAuth/webhook, `MESSENGER_*` e política de privacidade publicada (aguardando revisão jurídica). Sem isso, fases C e G reais ficam **Bloqueado por acesso Meta**.
- **Anúncio pago:** gate separado (conta de anúncio, Click-to-Messenger de teste, limite de gasto, participante ciente). Não iniciado.
- **E-mail:** sem verificação/recuperação de senha; o piloto depende de convite por link.

## Dados de teste e limpeza

- Nenhum dado de cliente, conta real, Página, token ou anúncio foi acessado.
- `database/e2e.sqlite` foi recriado pelo Playwright (arquivo descartável, ignorado pelo Git; pode ser apagado a qualquer momento).
- `public/build/` foi regenerado (ignorado pelo Git).
- Nenhum registro foi criado no banco local `flowchat`.

## Próximos passos

1. [x] Resolver D1 e confirmar `npm test` (19/19).
2. [x] Resolver D2 com Laravel 13.44.1; suíte PHP 166/166 e Composer audit limpo.
3. Rodar o harness de concorrência em MySQL 8.4 descartável na porta 3308 (bloqueado até Docker/DB isolado estar disponível).
4. Provisionar staging com HTTPS, worker, scheduler e armazenamento persistente de mídia.
5. Liberar app/Página/testers e publicar a política de privacidade na Meta.
6. Executar as fases manuais A–F e H em staging, com dados `E2E-` e evidências sanitizadas.
7. Só então avaliar o gate da fase G (anúncio controlado, com limite de gasto).

## Conclusão

**Apto com ressalvas para validação sintética local.** O núcleo funcional (cadastro por convite, sessões, fluxos, mídia, execução, webhook, janela de 24h, agendamentos, isolamento e gatilho por anúncio) está coberto no escopo sintético, e a interface principal não apresenta 5xx nem erros de console no smoke. D1 e D2 foram resolvidos no acompanhamento abaixo. Concorrência MySQL continua não provada e não houve validação real de staging ou Meta. **Não há base para declarar o sistema pronto para piloto com clientes reais** antes de staging, validação operacional e liberações Meta.

## Acompanhamento dos achados — 25/11/2026

- **D1 resolvido:** a expectativa de `capturarEstado` foi atualizada para incluir `anuncio_id: ''`, que faz parte do estado normalizado do editor. `npm test`: 19/19 aprovados.
- **D2 resolvido:** advisory oficial [GHSA-63hm-g96r-2m2q](https://github.com/laravel/framework/security/advisories/GHSA-63hm-g96r-2m2q) corrigido a partir de Laravel 13.40.0; `laravel/framework` atualizado de 13.35.0 para 13.44.1 dentro da restrição já existente. A aplicação não usa `Concurrency::run`. `php artisan test --compact`: 166/166 aprovados; `composer audit`: nenhum advisory encontrado.
- **Concorrência MySQL validada em 27/11/2026:** harness executado em MySQL 8.4.11 descartável, vinculado somente a `127.0.0.1:3308`, com `/var/lib/mysql` em tmpfs e sem volumes. Passaram `message-message`, `manual-message` e `schedule-message`, cada cenário com exatamente uma execução. Container removido após o teste; banco normal do FlowChat em `3307` não foi tocado.
- Não houve deploy, provisionamento de Cloud, chamadas reais à Meta nem alteração de dados locais do MySQL `flowchat`.
