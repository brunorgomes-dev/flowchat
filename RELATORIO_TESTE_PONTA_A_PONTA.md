# FlowChat — Relatório de testes ponta a ponta

**Data/período:** 25/11/2026, execução única (aprox. 12:20–12:35, horário local).
**Ambiente:** máquina local Windows; nada executado em Cloud, staging ou produção.
**Código testado:** working tree sobre o commit `8d41c4d` (2026-11-23), com 28 arquivos modificados e 5 não rastreados pendentes (incluindo `PLANO_TESTE_PONTA_A_PONTA.md`, a migration de anúncio, `tests/Concurrency/` e `GatilhoAnuncioFluxoTest.php`). O teste reflete o estado local, **não** um build implantado.
**Stack:** PHP 8.3.29, Laravel 13.35.0, Node 20.20.0, npm 10.8.2, Playwright 1.65.1 (Chromium 1255).
**Banco:** a suíte usa SQLite em memória (`phpunit.xml`). O banco local `flowchat` (MySQL, 127.0.0.1) **não foi lido nem alterado**. Playwright usou apenas `database/e2e.sqlite` (descartável, ignorado pelo Git).

## Resumo

**Estado atual (27/11/2026): validação sintética local aprovada, com pendências operacionais.** O registro inicial abaixo foi atualizado pelos acompanhamentos: PHP 166/166, Vitest 19/19, Playwright 14/14, build/lint aprovados, Composer audit limpo e os três cenários do harness MySQL passaram em instância descartável. A execução original de 25/11 teve um teste JS falho e não tinha MySQL disponível; ambos foram resolvidos depois, conforme os acompanhamentos. Nenhuma integração real com Meta ou Cloud foi validada. O piloto com clientes continua pendente de staging, validação manual e liberações Meta.

Cenários: aprovados **9 de 9 fases no escopo sintético** | falhas atuais conhecidas **0** (D1 e D2 resolvidos) | bloqueados **integrações reais C/G com Meta** | não executados **itens manuais de staging**. Concorrência passou no harness MySQL local descartável; ainda não foi exercitada em Cloud.

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
| H — Isolamento/falhas | **Aprovado no escopo sintético e no harness local** | 29 testes / 161 asserções: `IsolamentoContasTest`, `AdminContaSuspensaoTest`; acompanhamento de 27/11 validou `message-message`, `manual-message` e `schedule-message`, uma execução cada | Restart/redeploy e concorrência em Cloud: não executados |
| I — Interface/regressão | **Aprovado parcial** | `npm run e2e`: 14/14; lint sem erros; build OK; acompanhamento D1 confirma `npm test`: 19/19 | Viewport móvel e tema escuro não percorridos |

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
3. **Concorrência validada localmente, ainda não em Cloud.** O harness passou em MySQL 8.4.11 descartável em `127.0.0.1:3308`, conforme acompanhamento de 27/11. Restart/redeploy e comportamento sob concorrência no ambiente Cloud continuam sem validação.
4. **`APP_DEBUG=true` no `.env` local.** Aceitável aqui; staging precisa de `APP_DEBUG=false`.
5. **Credenciais de teste versionadas** (`e2e@example.test`/`senha-e2e`) e senha demo: uso restrito a banco descartável/local; nunca em staging.
6. **Cobertura parcial de fuso/DST** e ausência de teste dedicado para reutilização de sessão encerrada.
7. **Sem validação móvel/tema escuro** e sem teste real de upload de mídia.

## Bloqueios de Cloud e Meta

- **Laravel Cloud/staging:** não provisionado. O projeto requer PHP 8.3+ e Laravel 13; o código ainda usa disco `local` para mídia e não declara o adaptador S3 (`league/flysystem-aws-s3-v3`). `ArmazenamentoMidia` usa caminhos absolutos/`response()->file`, então mudar apenas `FILESYSTEM_DISK` não basta: adaptar acesso e entrega dos arquivos para storage privado remoto, preservando autorização por conta. Planejar banco, `APP_KEY`/segredos, HTTPS, worker e scheduler. O provisionamento fica para depois da orientação jurídica.
- **Meta:** app de staging, testers/funções, Página controlada, callbacks OAuth/webhook, `MESSENGER_*` e política de privacidade publicada (aguardando revisão jurídica). Sem isso, fases C e G reais ficam **Bloqueado por acesso Meta**.
- **Anúncio pago:** gate separado (conta de anúncio, Click-to-Messenger de teste, limite de gasto, participante ciente). Não iniciado.
- **E-mail:** sem verificação/recuperação de senha; o piloto depende de convite por link.

## Dados de teste e limpeza

- Nenhum dado de cliente, conta real, Página, token ou anúncio foi acessado.
- `database/e2e.sqlite` foi recriado pelo Playwright (arquivo descartável, ignorado pelo Git; pode ser apagado a qualquer momento).
- `public/build/` foi regenerado (ignorado pelo Git).
- Nenhum registro foi criado no banco local `flowchat`.

## Próximos passos

1. [x] D1 corrigido; `npm test`: 19/19.
2. [x] D2 corrigido com Laravel 13.44.1; PHP 166/166 e Composer audit limpo.
3. [x] Harness MySQL local descartável passou nos três cenários, em 27/11.
4. [ ] Após orientação da advogada, preparar staging Cloud: decidir base limpa ou cópia de dados, implementar storage privado remoto compatível com a API atual de mídia, configurar banco/segredos, provisionar worker e scheduler.
5. [ ] Com política revisada e publicada, concluir configuração e permissões do app Meta/Página/testers e validar OAuth/webhook reais.
6. [x] Checklist de execução manual criada fora do repositório: `C:\Users\Brunno\Documents\Default Project\TESTES_MANUAIS_FLOWCHAT.html`. Executar após staging, registrando evidências sem dados sensíveis.
7. [ ] Depois da validação manual e autorização Meta, avaliar o teste controlado do gatilho por anúncio.

## Conclusão

**Apto para continuar preparação local; ainda não pronto para piloto com clientes reais.** O escopo sintético está verde, incluindo a concorrência no harness MySQL descartável. Ainda não há staging Cloud nem integração real com Meta; a mídia precisa ser adaptada para storage remoto privado, e reinício/redeploy ainda precisa ser validado. A checklist manual está pronta fora do repositório. A política e a configuração Meta aguardam a advogada; após isso, preparar staging e executar a checklist antes de qualquer piloto.

## Acompanhamento dos achados — 25–27/11/2026

- **D1 resolvido:** a expectativa de `capturarEstado` foi atualizada para incluir `anuncio_id: ''`, que faz parte do estado normalizado do editor. `npm test`: 19/19 aprovados.
- **D2 resolvido:** advisory oficial [GHSA-63hm-g96r-2m2q](https://github.com/laravel/framework/security/advisories/GHSA-63hm-g96r-2m2q) corrigido a partir de Laravel 13.40.0; `laravel/framework` atualizado de 13.35.0 para 13.44.1 dentro da restrição já existente. A aplicação não usa `Concurrency::run`. `php artisan test --compact`: 166/166 aprovados; `composer audit`: nenhum advisory encontrado.
- **Concorrência MySQL validada em 27/11/2026:** harness executado em MySQL 8.4.11 descartável, vinculado somente a `127.0.0.1:3308`, com `/var/lib/mysql` em tmpfs e sem volumes. Passaram `message-message`, `manual-message` e `schedule-message`, cada cenário com exatamente uma execução. Container removido após o teste; banco normal do FlowChat em `3307` não foi tocado.
- Não houve deploy, provisionamento de Cloud, chamadas reais à Meta nem alteração de dados locais do MySQL `flowchat`.
