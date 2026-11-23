# Plano de refatoração do FlowChat

> **Status:** Fases 0–3 concluídas; refatoração planejada encerrada. Atualizado em 23/11/2026.
>
> **Baseline original:** commit `d0c2613` (18/11/2026). Os números da seção 2 são uma fotografia histórica, não o estado atual.
>
> **Estado atual:** branch `refactor/fase-3-frontend`; fases 0, 1, 2 e 3 tagueadas (`checkpoint/fase-0` a `checkpoint/fase-3`). A limpeza CSS ficou em commit próprio. As triagens pós-auditoria estão em `LEMBRETES.md`.
>
> **Objetivo:** reduzir complexidade e duplicação sem mudar comportamento, com cada fase reversível e verificável isoladamente.

---

## 0. Resumo executivo

| Fase | Entrega | Risco | Esforço estimado |
|---|---|---|---|
| **0** | Rede de segurança: CI, lint, testes de fumaça e baseline visual | Baixo | 2–4 dias |
| **1** | Remoção do legado e do preview (~9.700 linhas) | Baixo | 1–2 dias |
| **2** | Reestruturação do backend (controllers/jobs → requests e actions) | Médio | 5–8 dias |
| **3** | Refatoração do frontend V2 (páginas grandes, hooks, CSS) | Alto | 10–15 dias |

**Regra de ouro:** cada fase começa após a anterior estar verde, tagueada e com rollback conhecido. Este plano encerra na Fase 3; evolução posterior fica em documento separado.

### Estado da execução em 23/11/2026

| Fase | Estado | Evidência / pendência |
|---|---|---|
| 0 | Concluída e tagueada | `checkpoint/fase-0` existe. Consulte os commits da fase para os gates executados. |
| 1 | Concluída e tagueada | `checkpoint/fase-1` existe. |
| 2 | Concluída e tagueada | `checkpoint/fase-2` existe. |
| 3 | Concluída e tagueada | Tag `checkpoint/fase-3`. PHP 154/154 (1.007 asserções), Pint, Vitest 19/19, Playwright 14/14, verificação de console e build passaram. ESLint encerrou com 0 erros e 9 warnings; CSS órfão removido em `d34995d`. Audit inicial não localizado; audit final preservado como primeira referência em `relatorios/2026-11-23-auditoria-ponytail-fase-3.md`. |

**Fechamento:** revisão Ponytail por página concluída para as páginas refatoradas. Foram comparadas 32 capturas claras e 20 escuras pixel a pixel com o baseline existente (todas idênticas); também foram inspecionadas oito rotas em quatro tamanhos. O CSS órfão foi removido em commit separado. Capturas e comparações temporárias: `%LOCALAPPDATA%\Temp\opencode\refatoracao` (baselines e recortes) e `%LOCALAPPDATA%\Temp\flowchat-visual-pos-css` (64 capturas atuais); são artefatos locais fora do repositório. Pendências de produto e confiabilidade permanecem no lembrete e no plano pós-refatoração.

**Achado da revisão — `Should fix`:** em `resources/js/Pages/V2/AdminContas.jsx`, os cards “Ativas” e “Suspensas” contam apenas `contas.data`, mas a lista é paginada com 15 itens. Quando há mais de 15 contas, esses rótulos parecem totais gerais e mostram contagens incompletas. Correção mínima: rotular como “Ativas nesta página” e “Suspensas nesta página”, ou fornecer totais globais do servidor. De acordo com a regra 1.5, não incluir essa correção de cópia no commit de refatoração; triá-la em alteração separada.

**Achado da revisão — `Should fix` preexistente:** em `resources/js/components/v2/conversas/useConversas.js`, a rolagem automática leva a thread para o final sempre que a quantidade de mensagens muda. Ao clicar em “Carregar mensagens anteriores”, as mensagens antigas entram no início, mas a rolagem salta para o fim e o usuário perde a posição do histórico. O mesmo efeito já existia antes da extração para o hook; não é regressão introduzida por esta branch. Correção mínima: ao carregar anteriores, preservar a posição visual usando a diferença de altura do conteúdo antes/depois, sem alterar a rolagem ao selecionar contato ou receber mensagem nova. Triar em alteração separada.

**Achado da revisão — `Should fix` preexistente:** `useConversas.js` guarda o erro de rede ao carregar mensagens antigas em `erroThread`, mas nenhum componente consome esse estado (busca global sem referências além do hook). Se a requisição falhar, o usuário não recebe explicação nem ação de retry visível. Exibir o erro junto ao histórico e manter a possibilidade de tentar novamente; triagem em alteração separada.

**Skills:** as skills locais do projeto estão em `.agents/skills/`; `ponytail-review` e `ponytail-audit` estão disponíveis no diretório global do OpenCode. Não é necessária cópia/instalação adicional para esta sessão.

---

## 1. Princípios e regras de segurança

### 1.1 O que a refatoração pode fazer

- Mover código de lugar sem mudar contratos públicos.
- Extrair classes, hooks e componentes com responsabilidade única.
- Remover código comprovadamente morto.
- Renomear símbolos internos quando todos os usos forem atualizados.
- Adicionar testes que descrevem o comportamento atual.

### 1.2 O que a refatoração NÃO pode fazer nestas fases

- Alterar schema, migrations, colunas, índices ou dados.
- Alterar payloads de webhook, nomes de eventos de log ou textos de erro exibidos ao usuário.
- Alterar a ordem ou o conteúdo das mensagens enviadas à Meta.
- Alterar assinatura de construtores de Jobs já enfileirados (`ProcessarMensagemEntrante`, `EnviarEtapaFluxo`, `ExecutarAgendamento`, `RegistrarOrigemContato`).
- Adicionar ou remover dependências sem autorização explícita.
- Recriar containers, aplicar migration ou reiniciar fila/agendador sem autorização operacional.
- Usar dados reais de clientes em testes ou capturas.

### 1.3 Regras por alteração

1. **Um assunto por commit.** Se o commit precisa de “e” no título, provavelmente são dois.
2. **Teste antes de mover.** Antes de extrair uma classe, garantir que existe teste cobrindo o caminho feliz e o principal caminho de erro.
3. **Sem “melhorias de passagem”.** Não corrigir estilo, texto ou comportamento no mesmo commit da refatoração.
4. **Diff pequeno.** Meta: até ~300 linhas por commit; acima disso, dividir.
5. **Nada de `git reset --hard` ou `checkout --`.** Reverter com `git revert` do commit problemático.
6. **Checkpoint por fase.** Criar tag anotada apenas quando testes + build estiverem verdes.
7. **Preservar o comportamento observável.** Se o comportamento precisar mudar, é feature e sai deste plano.

### 1.4 Ponytail como disciplina de escopo

A skill [Ponytail](https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail/SKILL.md) não é um método de refatoração; é uma disciplina de **menor mudança completa**. Ela será usada neste plano como critério de execução:

- deleção antes de adição;
- reutilizar o que já existe no projeto;
- não criar abstração “para depois”;
- toda lógica não trivial extraída ganha um teste pequeno;
- entre opções do mesmo tamanho, escolher a correta nos casos de borda.

**Limite:** “menor mudança” não pode justificar manter duplicação estrutural que o plano existe para remover. Ponytail orienta o **como**, não o **se**.

### 1.5 Revisão independente (`ponytail-review` e `ponytail-audit`)

Duas skills complementares, instaladas em `~/.config/opencode/skills/` (escopo global, fora do repositório):

| Skill | Alcance | O que entrega |
|---|---|---|
| `ponytail-review` | Uma mudança (diff, branch, PR, arquivos) | Achados em **Must fix / Should fix / Nice to have**, cada um com caso concreto, correção mínima e veredito |
| `ponytail-audit` | Repo inteiro | Até 20 achados ranqueados, incluindo o que deletar, fundir ou dividir |

**Onde entram no plano:**

- `ponytail-review` é gate da **Fase 1** (diff inteiro da remoção) e, na **Fase 2**, de cada extração de risco. Na **Fase 3**, só por página refatorada e com alvo explícito.
- `ponytail-audit` roda **uma vez antes da Fase 0**, para registrar a dívida de partida, e **uma vez no fim da Fase 3**, para comparar o que sobrou.

**Regras de uso:**

1. Achado só vale com caso concreto. Sem cenário (“este input leva a este resultado”), é opinião e é descartado.
2. Só achados **Must fix** interrompem a fase. `Should fix` e `Nice to have` vão para `LEMBRETES.md`, não para o commit atual.
3. A review **não executa teste**. Ela lê código; a suíte continua sendo o gate executável.
4. Ela não conhece Laravel, Inertia nem a API da Meta. Regra de framework só vale se o código mostrar.
5. Na Fase 3, o viés “lean” da skill é **ignorado** quando conflitar com o objetivo de dividir páginas — ali o alvo é estrutura, não redução de linhas.

**Limite:** review não substitui o `flowchat-reviewer` nem os testes. É uma terceira leitura, focada em chamador quebrado, caso de borda e código que não deveria existir.

---

## 2. Baseline técnico

### 2.1 Números atuais

| Item | Valor |
|---|---|
| PHP | 8.3.29 |
| Laravel | 13.35.0 |
| Node / npm | 20.20.0 / 10.8.2 |
| MySQL | 8.4 |
| Arquivos PHP | 51, ~5.335 linhas |
| Arquivos JS/JSX | 81, ~18.714 linhas |
| Arquivos CSS | 4, ~3.127 linhas |
| Páginas legadas | 14, ~4.792 linhas |
| Páginas V2 | 15, ~4.006 linhas |
| Preview (telas + componentes) | 18 arquivos, ~4.919 linhas |
| Testes | 157 testes / 1.178 asserções no baseline original (`d0c2613`) |

Na retomada, a suíte completa passou com **154 testes / 1.007 asserções**. A diferença de contagem foi reconciliada: 11 testes exclusivos do preview/legado foram removidos na Fase 1, dois comportamentos úteis foram preservados em `DesignV2Test`, e oito testes foram adicionados nas fases seguintes; saldo líquido: 157 − 11 + 8 = 154. A redução para 154 é explicada e não indica perda líquida de cobertura desses comportamentos preservados.

### 2.2 Maiores arquivos (dívida visível)

| Linhas | Arquivo |
|---:|---|
| 2.166 | `resources/js/Pages/EditorFluxo.jsx` (legado) |
| 1.680 | `resources/js/components/v2/estilo-v2.css` |
| 1.026 | `resources/js/Pages/Preview/DesignV2/EditorFluxo.jsx` |
| 981 | `resources/js/Pages/V2/EditorFluxo.jsx` |
| 883 | `resources/js/components/v2/editor/editor-fluxo.css` |
| 819 | `tests/Feature/MidiaFluxoTest.php` |
| 740 | `resources/js/Pages/Conversas.jsx` (legado) |
| 734 | `app/Http/Controllers/FluxoController.php` |
| 671 | `resources/js/Pages/V2/Conversas.jsx` |
| 588 | `resources/js/Pages/Preview/DesignV2/Conversas.jsx` |
| 540 | `resources/js/Pages/Fluxos.jsx` (legado) |
| 508 | `resources/js/components/v2/editor/util.jsx` |
| 500 | `app/Jobs/EnviarEtapaFluxo.php` |
| 487 | `app/Console/Commands/PopularDemonstracao.php` |
| 438 | `resources/js/components/v2/LayoutV2.jsx` |
| 395 | `resources/js/components/v2/pecas.jsx` |
| 384 | `resources/js/components/AppLayout.jsx` (legado) |

### 2.3 Verificação de baseline (executar e registrar)

```powershell
git status --short
git log --oneline -8
php artisan test --compact
vendor/bin/pint --dirty --format agent
npm run build
php artisan route:list --except-vendor
```

Resultado esperado: suíte 157/157, Pint limpo, build OK, rotas listadas sem erro.

### 2.4 Serviços atuais

`app`, `db`, `fila`, `agendador` e `tunnel` ativos. Nenhuma etapa deste plano deve reiniciar serviço sem autorização.

---

## 3. FASE 0 — Rede de segurança

### 3.1 Objetivo

Criar uma barreira automática que detecte regressões **antes** de tocar no frontend ou no backend. Sem esta fase, a Fase 3 depende 100% de inspeção visual manual.

### 3.2 Decisões necessárias antes de executar

| ID | Decisão | Opções | Recomendação |
|---|---|---|---|
| D1 | Adicionar dependências de desenvolvimento? | (a) ESLint + Playwright + Vitest; (b) não adicionar, usar checklist manual | (a) |
| D2 | Rodar estilo no CI? | (a) não incluir; (b) incluir `pint --test`; (c) incluir apenas `pint --dirty` local | (a) inicialmente, decidir (b) com aprovação |
| D3 | Estratégia de branch | (a) commits diretos em `main` + tags; (b) branch curta por fase + merge | (b) |

> A regra atual do projeto proíbe `pint --test`. Por isso o CI inicial cobre testes e build; estilo continua sendo gate local (`pint --format agent`). Mudar essa regra exige decisão explícita.

### 3.3 Passo a passo

#### 0.1 — Criar tag do baseline

```powershell
git tag -a checkpoint/refatoracao-baseline -m "Baseline antes da refatoracao (d0c2613)"
git tag --list "checkpoint/*"
```

Não fazer push de tags sem autorização.

#### 0.2 — Criar o workflow de CI

Arquivo novo: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

jobs:
  backend:
    name: Backend (PHP 8.3)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: mbstring, pdo_sqlite, fileinfo, openssl, tokenizer, xml, ctype, json, bcmath
          coverage: none
      - run: composer install --no-interaction --prefer-dist --no-progress
      - run: cp .env.example .env
      - run: php artisan key:generate
      - run: php artisan test --compact

  frontend:
    name: Frontend (Node 20)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
      - run: npm ci
      - run: npm run build
```

**Por que não sobe MySQL:** `phpunit.xml` força `DB_CONNECTION=sqlite` e `DB_DATABASE=:memory:`. Os testes atuais são compatíveis. A validação de concorrência com MySQL será especificada no [plano pós-refatoração](PLANO_POS_REFATORACAO.md).

#### 0.3 — Lint do frontend (requer D1 = a)

Adicionar em `devDependencies`:

```text
eslint
@eslint/js
eslint-plugin-react
eslint-plugin-react-hooks
globals
```

Criar `eslint.config.js` com:

- `files: ['resources/js/**/*.{js,jsx}']`
- `languageOptions.parserOptions.ecmaFeatures.jsx = true`
- regras iniciais **somente de correção provável**:
  - `no-unused-vars` (como warning na primeira rodada)
  - `react/jsx-uses-react` desligada (React 19 + JSX transform)
  - `react-hooks/rules-of-hooks` (error)
  - `react-hooks/exhaustive-deps` (warning)
- ignorar `resources/js/Pages/Preview/**` na primeira rodada, pois será removido na Fase 1.

Scripts em `package.json`:

```json
"lint": "eslint resources/js",
"lint:fix": "eslint resources/js --fix"
```

**Não corrigir todos os warnings de uma vez.** Primeiro registrar a linha de base; corrigir apenas erros que quebram o CI.

#### 0.4 — Testes de fumaça com Playwright (requer D1 = a)

Adicionar `@playwright/test` em `devDependencies`.

Criar:

```text
playwright.config.js
tests/Browser/smoke.spec.js
tests/Browser/global-setup.js
database/seeders/E2eSeeder.php
```

**Configuração obrigatória de segurança:**

- `APP_ENV=e2e`
- `DB_CONNECTION=sqlite`
- `DB_DATABASE=database/e2e.sqlite` (arquivo descartável, fora do Git)
- `MAIL_MAILER=log`
- `QUEUE_CONNECTION=database` e worker **parado**
- conta sem `MessengerIntegration`
- nunca clicar em “Enviar mensagem” nem executar fluxo manual
- nunca apontar para o banco `flowchat` real

**`E2eSeeder` (esboço):**

```php
<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class E2eSeeder extends Seeder
{
    public function run(): void
    {
        $utilizador = User::factory()->create([
            'name' => 'Cliente E2E',
            'email' => 'e2e@example.test',
            'password' => Hash::make('senha-e2e'),
        ]);

        $conta = $utilizador->account;
        $conta->update(['timezone' => 'America/Sao_Paulo', 'timezone_confirmado' => true]);

        $contato = $conta->contatos()->create([
            'psid' => 'psid-e2e',
            'nome' => 'Contato E2E',
            'ultima_mensagem_recebida_em' => now(),
        ]);
        $contato->mensagens()->create(['direcao' => 'recebida', 'texto' => 'Olá, teste E2E']);

        $fluxo = $conta->fluxos()->create(['nome' => 'Fluxo E2E', 'ativo' => true]);
        $fluxo->etapas()->create(['ordem' => 1, 'texto' => 'Boas-vindas E2E', 'pausa_segundos' => 0]);
        $fluxo->regras()->create(['gatilho' => 'mensagem_recebida', 'ativo' => true]);
    }
}
```

**Roteiro mínimo de fumaça (8 cenários):**

1. Login com `e2e@example.test`.
2. `/painel` responde e mostra o nome da conta.
3. `/conversas` lista o contato e abre a ficha.
4. `/fluxos` lista o “Fluxo E2E”.
5. `/fluxos/criar`: adiciona etapa de texto, salva, recarrega e confirma persistência.
6. `/agendamentos` abre sem erro.
7. `/configuracoes` e `/configuracoes/conexao` abrem.
8. Nenhum `console.error` e nenhuma resposta HTTP ≥ 500 durante o roteiro.

**Captura de erros:**

```js
page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('response', (res) => {
    if (res.status() >= 500) responsesComErro.push(`${res.status()} ${res.url()}`);
});
```

#### 0.5 — Baseline visual

Antes de qualquer mudança de UI, capturar as telas principais em 4 larguras:

- 390 × 844 (mobile)
- 768 × 1024 (tablet)
- 1366 × 768 (notebook)
- 1440 × 900 (desktop)

Telas: Login, Painel, Conversas (lista + ficha), Fluxos, Editor de fluxo, Agendamentos, Configurações, Conexão.

Guardar em `C:\Users\Brunno\AppData\Local\Temp\opencode\refatoracao\antes\`. **Não commitar imagens.**

#### 0.6 — Script local de verificação

Criar `scripts/verificar.ps1` **somente com aprovação** (o projeto não tem pasta `scripts`). Conteúdo:

```powershell
$ErrorActionPreference = 'Stop'

php artisan test --compact
if ($LASTEXITCODE -ne 0) { throw 'Testes falharam' }

vendor/bin/pint --dirty --format agent
if ($LASTEXITCODE -ne 0) { throw 'Pint falhou' }

npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build falhou' }

Write-Host 'Verificacao local concluida com sucesso.'
```

Alternativa sem nova pasta: documentar os três comandos no README.

### 3.4 Critérios de aceite da Fase 0

- [ ] CI executa em push e pull request.
- [ ] Job de backend verde com 157 testes.
- [ ] Job de frontend verde com `npm run build`.
- [ ] `npm run lint` executa (se D1 = a).
- [ ] Um PR de teste falha de propósito quando um teste quebra (validar o gate).
- [ ] Roteiro Playwright passa localmente no banco E2E.
- [ ] Baseline visual salvo fora do repositório.
- [ ] Tag `checkpoint/fase-0` criada.

### 3.5 Riscos e mitigação

| Risco | Mitigação |
|---|---|
| CI falhar por versão de extensão PHP | Fixar `php-version: '8.3'` e listar extensões |
| Testes dependentes de fuso/horário | Já usam `travelTo`; conferir antes de ativar CI |
| Playwright tocar banco real | Variáveis explícitas + verificação no `global-setup` (abortar se `DB_DATABASE` não terminar em `e2e.sqlite`) |
| Lint gerar centenas de warnings | Primeira rodada só com `rules-of-hooks` como erro |

### 3.6 Rollback

Reverter commits da Fase 0. Nenhum impacto em produção; nenhuma migration.

---

## 4. FASE 1 — Remover legado e preview

### 4.1 Objetivo

Eliminar duas gerações de UI que não são usadas pelo cliente, reduzindo ~9.700 linhas e a necessidade de implementar cada tela 2–3 vezes.

### 4.2 Decisão D4 — Preview antes de remover

O preview é útil como referência visual. Antes de apagar:

| Opção | O que acontece | Recomendação |
|---|---|---|
| A | Apagar do repositório | Simples, mas perde a referência |
| B | Mover para branch `arquivo/preview-design-v2` e apagar de `main` | Preserva histórico sem peso no build |
| C | Manter, mas fora do build de produção | Complexidade desnecessária |

**Recomendação:** B. Criar a branch de arquivo, remover de `main`, registrar no commit que a referência vive na branch.

### 4.3 Ordem de execução

#### 1.1 — Preservar os testes de produção

`tests/Feature/PreviewDesignV2Test.php` mistura testes de preview/legado com testes da UI real. Antes de apagar:

1. Criar `tests/Feature/DesignV2Test.php`.
2. Mover para ele:
   - `test_rotas_normais_apresentam_o_design_v2_com_dados_reais`
   - `test_carregamento_incremental_de_conversas_usa_cursor_e_escopo_da_conta`
3. Rodar `php artisan test --compact tests/Feature/DesignV2Test.php`.
4. Só então remover os demais métodos.

Métodos que serão removidos junto com preview/legado:

- `test_preview_fica_desativada_por_padrao_fora_do_ambiente_local`
- `test_preview_pode_ser_desativada_explicitamente_mesmo_no_ambiente_local`
- `test_preview_habilitada_renderiza_todas_as_telas_principais`
- `test_telas_administrativas_exigem_autorizacao_de_administrador`
- `test_preview_exige_sessao_autenticada`
- `test_conta_suspensa_nao_acessa_o_preview`
- `test_preview_nao_expoe_rotas_de_escrita`
- `test_area_de_legado_preserva_as_paginas_antigas`
- `test_legado_exige_autenticacao`
- `test_legado_administrativo_exige_administrador`
- `test_rotas_de_preview_nao_alteram_as_rotas_de_produto`

#### 1.2 — Remover o preview

**Rotas:** excluir o bloco de `routes/web.php` entre o comentário “Preview de design V2” e o fechamento do grupo (linhas ~104–137), incluindo o `use PreviewDesignV2Controller`.

**Backend:**

- apagar `app/Http/Controllers/PreviewDesignV2Controller.php`
- apagar `app/Http/Middleware/GarantirPreviewDesignV2.php`
- remover o alias `'preview.design-v2'` em `bootstrap/app.php`
- remover `use App\Http\Middleware\GarantirPreviewDesignV2;` em `bootstrap/app.php`
- remover a chave `preview_design_v2` de `config/flowchat.php`
- remover `FLOWCHAT_PREVIEW_DESIGN_V2` de `.env.example`

**Frontend:**

- apagar `resources/js/Pages/Preview/**` (18 arquivos + `_data`)
- remover `const paginasPreviewDesignV2 = import.meta.glob(...)` de `resources/js/app.jsx`
- remover o bloco `if (name.startsWith('Preview/DesignV2/'))` de `resources/js/app.jsx`
- atualizar o comentário do topo de `app.jsx`

**Testes:**

- apagar `tests/Feature/PreviewDesignV2Test.php` após a extração da etapa 1.1

**Verificação:**

```powershell
php artisan route:list --except-vendor | Select-String "preview"
Get-ChildItem resources\js\Pages -Recurse | Select-String "Preview/DesignV2"
```

Esperado: nenhuma ocorrência.

#### 1.3 — Remover o legado

**Rotas:** excluir o bloco “Área de legado” inteiro (linhas ~139–175 de `routes/web.php`).

**Backend:**

- apagar `app/Support/Design.php`
- trocar as 16 chamadas `Inertia::render(Design::componente('V2/X', 'Y'), ...)` por `Inertia::render('V2/X', ...)`

Lista exata:

| Arquivo | Linha | Chamada |
|---|---:|---|
| `AgendamentoController.php` | 28 | `V2/Agendamentos` |
| `CadastroController.php` | 27 | `V2/Cadastro` |
| `ConectarMessengerController.php` | 169 | `V2/SelecionarPagina` |
| `ConfiguracoesController.php` | 28 | `V2/Configuracoes` |
| `ContaSuspensaController.php` | 24 | `V2/ContaSuspensa` |
| `ConversaController.php` | 22 | `V2/Conversas` |
| `ConviteController.php` | 61 | `V2/AdminContas` |
| `ConviteController.php` | 95 | `V2/AdminConvites` |
| `ConviteController.php` | 145 | `V2/Cadastro` |
| `FluxoController.php` | 30 | `V2/Fluxos` |
| `FluxoController.php` | 43 | `V2/EditorFluxo` |
| `FluxoController.php` | 56 | `V2/EditorFluxo` |
| `HistoricoContatoController.php` | 21 | `V2/HistoricoContato` |
| `LoginController.php` | 27 | `V2/Login` |
| `LoginController.php` | 133 | `V2/SessoesLogin` |
| `PaginaInicialController.php` | 21 | `V2/Painel` |

**Páginas legadas a apagar** (14):

```text
resources/js/Pages/AdminConvites.jsx
resources/js/Pages/AdminEmitirConvites.jsx
resources/js/Pages/Agendamentos.jsx
resources/js/Pages/Cadastro.jsx
resources/js/Pages/Configuracoes.jsx
resources/js/Pages/ContaSuspensa.jsx
resources/js/Pages/Conversas.jsx
resources/js/Pages/EditorFluxo.jsx
resources/js/Pages/Fluxos.jsx
resources/js/Pages/HistoricoContato.jsx
resources/js/Pages/Login.jsx
resources/js/Pages/PaginaInicial.jsx
resources/js/Pages/SelecionarPaginaMessenger.jsx
resources/js/Pages/SessoesLogin.jsx
```

**Layout global:**

- apagar `resources/js/components/AppLayout.jsx`
- remover o import e a opção `layout: () => AppLayout` de `resources/js/app.jsx`

> As páginas V2 definem `Pagina.layout = [LayoutV2]`, então não dependem do layout global. Confirmar com uma navegação real após a remoção.

#### 1.4 — Auditoria de código órfão

Não apagar por suposição. Rodar a busca e confirmar cada item:

```powershell
Get-ChildItem resources\js -Recurse -Include *.jsx,*.js |
  Select-String -Pattern "MensagemBubble|ModalFlowChat|PageHeader|SeletorFuso|SeletorTema|components/ui"
```

Candidatos a órfãos (confirmar antes):

- `resources/js/components/MensagemBubble.jsx`
- `resources/js/components/ModalFlowChat.jsx`
- `resources/js/components/PageHeader.jsx`
- `resources/js/components/SeletorFuso.jsx`
- `resources/js/components/SeletorTema.jsx`
- `resources/js/components/ui/**` (button, input, scroll-area, separator, switch, textarea e demais)

**Atenção:** `radix-ui` também é usado por `resources/js/components/v2/editor/EditorEtapa.jsx` — **não remover** a dependência. `clsx` e `tailwind-merge` são usados por `resources/js/lib/utils.js` — manter.

Dependências possivelmente órfãs após a limpeza (decidir em commit separado, com aprovação):

- `class-variance-authority` (só em `components/ui/button.jsx`)
- `cn` (só nos componentes `components/ui/*`)

#### 1.5 — Documentação

- Atualizar `README.md` se mencionar preview/legado (a busca atual não encontrou).
- Atualizar `.env.example` (remover a variável do preview).
- Registrar no commit que a referência visual do preview vive na branch de arquivo.

#### 1.6 — Review da fase

Antes de fechar a fase, rodar `@ponytail-review` sobre o diff completo (baseline → HEAD):

```text
@ponytail-review revise o diff entre checkpoint/refatoracao-baseline e HEAD
```

O foco é o risco R3: referência órfã que o build não pega — string dinâmica, `import.meta.glob`, nome de componente em array, rota citada em teste.

Triagem:

- **Must fix** → corrigir em commit próprio, dentro da fase.
- **Should fix / Nice to have** → registrar em `LEMBRETES.md`; não abrir escopo agora.
- Achado sem caso concreto → descartar e anotar o motivo.

### 4.4 Critérios de aceite da Fase 1

- [ ] `php artisan route:list --except-vendor` não mostra `/legado` nem `/preview/design-v2`.
- [ ] Nenhuma página legada ou de preview no build.
- [ ] Nenhuma referência a `Design::componente`, `Preview/DesignV2`, `AppLayout` ou `FLOWCHAT_PREVIEW_DESIGN_V2`.
- [ ] Suíte completa verde (estimativa: ~147 testes após remover os de preview/legado).
- [ ] Build verde e menor que o baseline (registrar tamanho antes/depois).
- [ ] Navegação manual: painel, conversas, fluxos, editor, agendamentos, configurações e conexão.
- [ ] `ponytail-review` aplicada ao diff da fase, com os `Must fix` resolvidos.
- [ ] Tag `checkpoint/fase-1` criada.

### 4.5 Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Apagar componente ainda usado por engano | Busca textual + build + navegação manual |
| Perder a referência visual do preview | Branch de arquivo antes de apagar |
| Rota antiga quebrar bookmark | Nenhum usuário real usa `/legado`; `/preview` era local. Se necessário, redirecionar `/preview/design-v2` para `/painel` por uma versão |
| `app.jsx` sem layout global quebrar telas | V2 define layout próprio; validar login, cadastro e conta suspensa |
| Remover dependência usada indiretamente | Auditoria com busca + `npm run build`; commit separado |

### 4.6 Rollback

Um `git revert` do merge/commit da fase restaura tudo. Sem migration, sem dado.

---

## 5. FASE 2 — Reestruturar o backend

### 5.1 Objetivo

Tirar validação e regra de negócio de dentro de controllers e jobs, sem mudar comportamento. Alvo: cada arquivo abaixo de ~250 linhas e com uma responsabilidade clara.

### 5.2 Alvos

| Arquivo atual | Linhas | Destino proposto |
|---|---:|---|
| `app/Http/Controllers/FluxoController.php` | 734 | Form Requests + Actions de fluxo |
| `app/Jobs/EnviarEtapaFluxo.php` | 500 | Actions de envio + suporte Meta |
| `app/Jobs/ProcessarMensagemEntrante.php` | ~280 | Action de mensagem recebida + iniciação de fluxos |

### 5.3 Ordem e escopo de cada extração

#### 2.1 — Form Requests de fluxo

Criar:

```text
app/Http/Requests/Fluxos/StoreFluxoRequest.php
app/Http/Requests/Fluxos/UpdateFluxoRequest.php
```

Mover para eles **apenas** as regras de validação de `store`/`update`, preservando:

- mesmas chaves de erro (`nome`, `etapas.*`, `horario`, etc.);
- mesmas mensagens;
- mesmas regras condicionais de colunas/fuso.

**Não mover ainda** a sincronização de etapas. Primeiro o request, rodar testes, commit.

Testes de referência:

```powershell
php artisan test --compact tests/Feature/GerenciarFluxosTest.php
php artisan test --compact tests/Feature/MidiaFluxoTest.php
```

#### 2.2 — Action de sincronização de etapas

Criar:

```text
app/Actions/Fluxos/SincronizarEtapasDoFluxo.php
app/Actions/Fluxos/ArmazenarAnexosDasEtapas.php
app/Actions/Fluxos/SincronizarCondicoesDasEtapas.php
```

Mover de `FluxoController`:

- `validarEtapas`
- `validarIdentificadoresEtapas`
- `validarEtapaMensagem`
- `atributosCondicaoEtapa`
- `sincronizarCondicoes`
- `armazenarNovosAnexos`
- `sincronizarEtapas`
- `atributosMidiaEtapa`

**Contrato:** receber `Fluxo`, array de etapas, arquivos novos e o `ArmazenamentoMidia`; devolver o mesmo array/efeitos que o controller devolvia. Nenhuma alteração de ordem de escrita.

**Proteção:** o teste `test_reordena_etapas_identificadas_preservando_destinos_de_condicao` e os testes de mídia em `MidiaFluxoTest` são a rede.

#### 2.3 — Suporte de horário e fuso

Criar:

```text
app/Support/Fluxos/HorarioDeInicio.php
app/Support/Fluxos/DisponibilidadeDeColunas.php
```

Mover:

- `atributosHorario`
- `colunasHorarioDisponiveis`
- `colunasCondicaoDisponiveis`
- `colunasFusoDisponiveis`
- a validação de fuso confirmado

**Regra:** manter `filter_var(..., FILTER_VALIDATE_BOOLEAN)` e o fail-closed quando a migration não existe. Não “simplificar” a checagem de colunas.

Teste de referência: `tests/Feature/HorarioInicioFluxoTest.php` + os dois testes de formulário em `GerenciarFluxosTest`.

#### 2.4 — `EnviarEtapaFluxo`

Criar:

```text
app/Actions/Mensagens/EnviarTextoDaEtapa.php
app/Actions/Mensagens/EnviarMidiaDaEtapa.php
app/Actions/Mensagens/EnviarIndicadorDigitacao.php
app/Actions/Mensagens/AvaliarCondicaoDeHorario.php
app/Support/Meta/ResumoErroMeta.php
```

Mover, nesta ordem:

1. `enviarMensagem` e `enviarAcaoDigitacao` → actions pequenas;
2. `enviarEtapaMidia`, `obterAttachmentId`, `enviarAnexoPorId`, `limparAttachmentId`, `erroAnexoInvalido`, `resumoErroMeta`, `registrarErroMidia` → `EnviarMidiaDaEtapa` + `ResumoErroMeta`;
3. `executarCondicaoHorario` → `AvaliarCondicaoDeHorario`.

**Não alterar:**

- assinatura do construtor do Job;
- nomes de eventos em `LogSistema`;
- comportamento de `failed()`;
- retry/backoff;
- ordem das chamadas à Graph API.

**Teste de referência:** `MidiaFluxoTest` (24 testes) e `ExecucaoFluxoTest`.

#### 2.5 — `ProcessarMensagemEntrante`

Criar:

```text
app/Actions/Contatos/RegistrarMensagemRecebida.php
app/Actions/Fluxos/IniciarFluxosDoContato.php
app/Support/Contatos/JanelaDeMensagemLivre.php
```

Mover:

- `registrarUltimaMensagemRecebida`
- `instanteDoEvento`
- `tratarInicioForaDoHorario`
- `preencherMensagemInicialDaOrigem`
- `preencherNome`

**Preservar:**

- atualização monotônica da janela;
- fail-closed sem timestamp;
- `mensagemRecebida = false` para read/delivery;
- deduplicação de agendamento pendente;
- textos de log.

**Testes de referência:** `Janela24hAgendamentoTest`, `WebhookMessengerTest`, `IsolamentoContasTest`.

#### 2.6 — Review por extração

Rodar `@ponytail-review` no commit de cada extração de risco, **antes** do commit seguinte:

| Extração | Por que revisar |
|---|---|
| 2.2 sincronização de etapas | Move escrita e validação; erro muda a ordem de gravação |
| 2.4 `EnviarEtapaFluxo` | Move chamadas à Graph API; erro duplica ou perde envio |
| 2.5 `ProcessarMensagemEntrante` | Move a janela de 24 h; erro abre ou fecha a janela errada |

Nas demais (2.1, 2.3), a review pode ser feita uma vez no fim da fase.

Em cada extração, a review precisa confirmar:

1. Nenhum chamador ficou apontando para o método antigo.
2. A regra movida é aplicada em **um** lugar só, sem cópia remanescente no controller ou job.
3. A ordem das escritas e das chamadas externas é a mesma de antes.
4. Nenhum `try/catch` mudou de escopo por acidente.
5. Os testes existentes continuam cobrindo o caminho movido.

### 5.4 Estratégia de teste

- Antes de cada extração: rodar o teste alvo e registrar o resultado.
- Depois de cada extração: rodar o mesmo teste + suíte completa.
- Para classes puras extraídas (`HorarioDeInicio`, `ResumoErroMeta`), adicionar teste unitário **somente** se a lógica não estiver coberta pelo teste de feature.
- Não reescrever testes existentes para acomodar a nova estrutura. Se um teste precisa mudar, o contrato mudou — pare.

### 5.5 Critérios de aceite da Fase 2

- [ ] `FluxoController` abaixo de 250 linhas.
- [ ] `EnviarEtapaFluxo` abaixo de 250 linhas.
- [ ] `ProcessarMensagemEntrante` abaixo de 150 linhas.
- [ ] Nenhuma mudança de schema, rota, payload, log ou mensagem.
- [ ] Suíte completa verde (mesma contagem ou mais, nunca menos).
- [ ] Pint limpo.
- [ ] Build verde (frontend não deve ter sido tocado).
- [ ] `ponytail-review` aplicada nas extrações 2.2, 2.4 e 2.5, com os `Must fix` resolvidos.
- [ ] Tag `checkpoint/fase-2` criada.

### 5.6 Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Extração mudar ordem de escrita | Diff revisado linha a linha; testes de mídia e etapas |
| Job antigo na fila com construtor novo | Não alterar construtores; conferir `jobs` antes do deploy |
| Regra de fuso/horário divergir | Manter `filter_var` e testes de formulário `"1"/"0"` |
| Log operacional desaparecer | Inventário de eventos antes/depois (`fluxo_iniciado`, `agendamento_executado`, etc.) |
| Teste passar por acidente | Rodar teste antes e depois; comparar contagem de asserções |

### 5.7 Rollback

Cada extração é um commit independente. Reverter apenas o commit problemático; os anteriores permanecem.

---

## 6. FASE 3 — Refatorar o frontend

### 6.1 Objetivo

Reduzir o tamanho e o acoplamento das páginas V2, começando pelas maiores, com rede de segurança da Fase 0.

### 6.2 Pré-requisitos

- Fase 0 concluída (CI + lint + Playwright).
- Fase 1 concluída (sem legado/preview para confundir a contagem).
- Baseline visual salvo.
- Nenhuma feature nova em andamento no mesmo período.

### 6.3 Ordem das telas

1. Login, Cadastro, ContaSuspensa, SessoesLogin (baixo risco).
2. Configurações e Conexão.
3. Agendamentos.
4. Fluxos.
5. Conversas.
6. Editor de fluxo (último, maior risco).

### 6.4 `V2/EditorFluxo.jsx` (981 linhas)

#### 6.4.1 — Extrair o estado para um hook

Criar:

```text
resources/js/components/v2/editor/useEditorFluxo.js
```

Mover para o hook:

- `nome`, `ativo`, `etapas`, `gatilhosAtivos`, `horario`, `pausasAtivas`;
- `etapaSelecionada`, `estadoGravacao`, `erros`, `mensagemReordenacao`;
- `etapaParaExcluir`, `dadosBase`, `avisoSaidaAberto`;
- `pausaUnidade`, `pausaInput`, `painelAtivo`;
- refs de saída, foco e textarea;
- `temAlteracoes`, `etapaAtual`;
- efeitos de sincronização com o servidor, `beforeunload` e foco.

**Contrato:** o hook devolve estado + ações nomeadas (`adicionarEtapa`, `moverEtapa`, `removerEtapa`, `atualizarEtapa`, `salvar`, `descartar`). A página passa a ser só composição visual.

#### 6.4.2 — Extrair a view

Criar:

```text
resources/js/components/v2/editor/CabecalhoEditor.jsx
resources/js/components/v2/editor/PainelEtapasEditor.jsx
resources/js/components/v2/editor/PainelPreviaEditor.jsx
resources/js/components/v2/editor/BarraAcoesEditor.jsx
```

Regras:

- `ListaEtapas`, `EditorEtapa`, `PreviaMensagem`, `ResumoFluxo` e `Dialogos` continuam como estão.
- Nenhuma classe CSS nova nesta etapa.
- Preservar `aria-*`, foco e atalhos.
- Preservar o comportamento de “limpar texto” e as setas de reordenação.

#### 6.4.3 — Testes antes/depois

Adicionar testes unitários (Vitest) para funções puras de `resources/js/components/v2/editor/util.jsx`:

- `capturarEstado`
- `estadosIguais`
- `normalizarDestino`
- `validarCondicoesDasEtapas`
- `validarMidiaDasEtapas`
- `converterSegundosDoInput`
- `formatarSegundosEmUnidade`

E um teste Playwright do editor:

1. abrir `/fluxos/criar`;
2. adicionar etapa de texto;
3. preencher texto;
4. salvar;
5. recarregar;
6. confirmar texto e ordem;
7. tentar sair com alteração não salva e confirmar o diálogo.

### 6.5 `V2/Conversas.jsx` (671 linhas)

Criar:

```text
resources/js/components/v2/conversas/useConversas.js
resources/js/components/v2/conversas/ListaConversas.jsx
resources/js/components/v2/conversas/ItemConversa.jsx
resources/js/components/v2/conversas/ThreadConversa.jsx
resources/js/components/v2/conversas/FichaDoContato.jsx
resources/js/components/v2/conversas/CompositorMensagem.jsx
```

Preservar:

- sincronização de `busca`, `ad_id` e `contato` na URL;
- carregamento incremental por cursor (`/conversas/mais`);
- recarregamento parcial de `?contato=`;
- origem do anúncio na lista e na ficha;
- compositor desabilitado quando não aplicável.

Teste Playwright:

1. abrir `/conversas`;
2. buscar por nome;
3. filtrar por anúncio;
4. abrir contato;
5. abrir detalhes;
6. limpar filtros;
7. confirmar que a URL reflete o estado.

### 6.6 Telas menores

Aplicar o mesmo padrão somente quando a página passar de ~250 linhas ou tiver mais de um estado relevante. Não refatorar por esporte.

Ordem: `V2/Fluxos.jsx` (399), `V2/Agendamentos.jsx` (263), `V2/Configuracoes.jsx` (209), `V2/Conexao.jsx` (208), `V2/AdminConvites.jsx` (208), `V2/AdminContas.jsx` (265).

### 6.7 CSS e design tokens

Estado atual:

| Arquivo | Linhas | Papel |
|---|---:|---|
| `resources/css/app.css` | 254 | Tailwind, tokens globais, toasts |
| `resources/js/components/v2/estilo-v2.css` | 1.680 | Casca V2 e componentes |
| `resources/js/components/v2/editor/editor-fluxo.css` | 883 | Editor |
| `resources/js/components/v2/layout-v2.css` | 310 | Navegação e layout |

Plano:

1. **Não renomear classes** durante a Fase 3.1–3.6.
2. Após cada página refatorada, procurar seletores não usados e remover em commit separado.
3. Consolidar variáveis duplicadas apenas quando o valor for idêntico e a mudança for visualmente neutra.
4. Manter `app.css` como fonte dos tokens globais.
5. Não adicionar `!important` para “resolver” conflito.
6. Verificar em tema claro e escuro.

### 6.8 Critérios de aceite da Fase 3

- [x] Páginas V2 refatoradas divididas por responsabilidade; todas abaixo de 300 linhas nesta branch. O valor é meta de revisão, não limite mecânico.
- [x] Hooks e componentes extraídos; funções puras do editor cobertas por testes unitários.
- [x] Playwright cobre login, conversas, fluxos, editor e agendamentos.
- [x] Nenhum `console.error` ou erro de página no login e nas sete rotas V2 verificadas nesta retomada.
- [x] Comparação visual aprovada nas quatro larguras em tema claro e escuro.
- [x] Build verde e tamanho do bundle registrado no checklist mestre.
- [x] `ponytail-review` aplicada nesta retomada às páginas refatoradas; achados e limites registrados acima.
- [x] Auditoria final registrada em `relatorios/2026-11-23-auditoria-ponytail-fase-3.md`. Busca em arquivos, histórico Git e artefatos/sessões locais do OpenCode não encontrou audit Ponytail inicial; a comparação histórica é impossível. Este relatório fica como referência para a próxima auditoria.
- [x] Tag anotada `checkpoint/fase-3` criada após os gates desta retomada.

**Auditoria final (23/11/2026):** sem achado `Must fix` que bloqueie a Fase 3. O relatório final, as verificações, os seis itens para triagem e as limitações de escopo estão em `relatorios/2026-11-23-auditoria-ponytail-fase-3.md`. O audit Ponytail anterior à Fase 0 não foi encontrado; a comparação histórica fica registrada como indisponível, e este relatório estabelece a referência preservada daqui em diante.

### 6.9 Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regressão visual silenciosa | Baseline + comparação nas 4 larguras |
| Perda de estado do editor | Teste Playwright de salvar/recarregar e diálogo de saída |
| Quebra de URL/filtros em Conversas | Teste de busca, filtro e recarregamento parcial |
| Hook grande demais | Limite de ~250 linhas; dividir por responsabilidade |
| CSS duplicado escondido | Busca de seletores antes de remover; commits separados |
| Tempo maior que o previsto | Entregar por página; cada página é um PR/commit |

### 6.10 Rollback

Cada página refatorada é um conjunto de commits independentes. Reverter a página problemática sem afetar as demais. Sem migration.

---

## 7. Encerramento da refatoração

As Fases 0–3 foram concluídas e receberam as tags `checkpoint/fase-0` a `checkpoint/fase-3`. Este plano mantém o histórico, as decisões e os gates dessa refatoração; não inclui novas funcionalidades nem a evolução técnica posterior. Os próximos trabalhos aprovados estão especificados em [PLANO_POS_REFATORACAO.md](PLANO_POS_REFATORACAO.md).

---

## 8. Registro de riscos geral

| ID | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Regressão de UI sem teste | Alta | Alto | Fase 0 antes da Fase 3 |
| R2 | Quebra de rota/bookmark ao remover legado | Baixa | Baixo | Nenhum usuário real; branch de arquivo |
| R3 | Componente “órfão” ainda usado | Média | Médio | Busca + build + navegação |
| R4 | Job antigo incompatível | Baixa | Alto | Não alterar construtores |
| R5 | Mudança involuntária de comportamento | Média | Alto | Testes antes/depois + diff pequeno |
| R6 | CSS global quebrar outra tela | Média | Médio | Não renomear classes; varredura de seletores |
| R7 | CI instável por fuso | Baixa | Médio | `travelTo` e testes determinísticos |
| R8 | Teste E2E tocar dados reais/Meta | Baixa | Alto | Banco E2E dedicado + sem integração |
| R9 | Refatoração virar feature | Média | Alto | Critério de parada e revisão de escopo |
| R10 | Cansaço/erro no fim da fase | Média | Médio | Tags e parada a cada fase |
| R11 | Review da Ponytail virar reescrita ou feature | Média | Alto | Aceitar só achado com caso concreto; `Must fix` limitado ao escopo da fase; o resto vai para `LEMBRETES.md` |
| R12 | Review gerar ruído e travar a fase | Média | Médio | Uma review por fase; na Fase 2, só nas extrações de risco |

---

## 9. Branches, commits e checkpoints

### 9.1 Estratégia

```text
main
├── refactor/fase-0-ci
├── refactor/fase-1-limpeza
├── refactor/fase-2-backend
└── refactor/fase-3-frontend
```

Cada branch:

1. nasce de `main` com a tag da fase anterior;
2. contém commits pequenos;
3. termina com suíte + build verdes;
4. é mesclada com `--no-ff` para preservar o contexto;
5. recebe uma tag anotada.

### 9.2 Convenção de commits

```text
chore: adiciona workflow de CI
test: adiciona fumaça E2E das telas principais
refactor: extrai validacao de fluxo para form request
refactor: extrai sincronizacao de etapas do FluxoController
style: remove seletores orfaos do editor
docs: registra plano e checkpoints da refatoracao
```

### 9.3 Checkpoints

```powershell
git tag -a checkpoint/fase-0 -m "Fase 0 concluida: CI, lint e fumaca"
git tag -a checkpoint/fase-1 -m "Fase 1 concluida: legado e preview removidos"
git tag -a checkpoint/fase-2 -m "Fase 2 concluida: backend reestruturado"
git tag -a checkpoint/fase-3 -m "Fase 3 concluida: frontend refatorado"
```

### 9.4 Verificação entre fases

```powershell
git status --short
php artisan test --compact
vendor/bin/pint --dirty --format agent
npm run build
docker compose ps
```

Se qualquer item falhar: **parar** e corrigir antes de seguir.

Se a regressão aparecer depois do merge — review, navegação manual ou suíte —, a resposta padrão é reverter, não corrigir por cima:

```powershell
git log --oneline -5
git revert -m 1 <sha-do-merge-da-fase>
```

Depois disso, o repositório volta ao último `checkpoint/fase-N` verde e o problema é reaberto com calma, em commit próprio.

---

## 10. Critérios de parada

Interromper a fase imediatamente se:

1. A suíte falhar e a causa não for óbvia em 30 minutos.
2. O build falhar sem mensagem compreensível.
3. Houver dúvida sobre comportamento da Meta (janela, mídia, token).
4. For necessária uma migration ou alteração de dado.
5. A contagem de testes diminuir sem justificativa.
6. Um teste precisar ser alterado para continuar passando (contrato mudou).
7. O diff de um commit passar de ~300 linhas sem possibilidade de divisão.
8. O trabalho começar a incluir uma feature nova.

---

## 11. Checklist mestre

As Fases 0–3 estão concluídas e tagueadas. Este checklist registra o fechamento da Fase 3; os gates das Fases 0–2 são históricos e devem ser consultados nos commits/artefatos correspondentes, sem inferir que foram revalidados nesta retomada.

### Fase 3 — concluída (`checkpoint/fase-3`)

- [x] Vitest para funções puras (`tests/js/editor/util.test.js`)
- [x] Extrações de Editor, Conversas, Fluxos e Agendamentos presentes na branch
- [x] Comparação do tema escuro: 20/20 imagens idênticas (registro operacional; capturas não estão no repositório)
- [x] Suíte PHP 154/154 (1.007 asserções) e Pint limpo, repetidos nesta retomada
- [x] Vitest 19/19 e Playwright 14/14 aprovados nesta retomada
- [x] Revisão das extrações de Fluxos, Agendamentos, Login e Cadastro; nenhum achado concreto encontrado nesta leitura
- [x] Revisão do Editor; nenhum achado concreto encontrado nesta leitura
- [x] Revisão de Conversas; problema de rolagem preexistente registrado acima
- [x] Inspecionar Configurações, Conexão, Convites e Contas; registrar o achado em Contas acima
- [x] Fazer `ponytail-review` por página nas extrações de Editor e Conversas; resumo e achados registrados nesta retomada
- [x] Registrar em `LEMBRETES.md` a contagem paginada de Contas, o salto ao carregar histórico e o erro de histórico sem feedback; correções seguem separadas do escopo da refatoração
- [x] Verificar a suíte Playwright (14/14) e confirmar cobertura de Login, Conversas, Fluxos, Editor e Agendamentos
- [x] Revisar erros de console e erros de página em login e rotas V2 (nenhum encontrado)
- [x] Remover CSS órfão em commit próprio após verificar referências (`d34995d`)
- [x] Comparação visual aprovada: 32 capturas claras e 20 escuras idênticas ao baseline, quatro larguras; caminhos registrados acima
- [x] `npm run lint` (0 erros; 9 warnings anotados) e `npm run build`; tamanho CSS caiu 4,11 KB (EditorFluxo 17,60→16,35 KB; LayoutV2 36,09→33,23 KB); JS permaneceu em 382,95 KB / 118,35 KB gzip
- [x] Reconciliar 157 testes no baseline versus 154 atuais: 11 exclusivos do preview/legado removidos, 2 comportamentos preservados, 8 novos; saldo −3
- [x] Auditoria de código final executada nos principais caminhos de entrada, autenticação, OAuth, webhook, jobs e configuração; sem `Must fix` no escopo da Fase 3. Comparação com auditoria inicial indisponível porque o relatório inicial não foi localizado.
- [x] Registrar o audit Ponytail final e marcar que o audit inicial não foi encontrado; relatório final preservado como referência futura
- [x] Criar tag `checkpoint/fase-3` após todos os gates acima estarem verdes

---

## 12. Anexos

### A. Inventário de remoção da Fase 1

| Caminho | Itens |
|---|---|
| `app/Http/Controllers/PreviewDesignV2Controller.php` | 1 |
| `app/Http/Middleware/GarantirPreviewDesignV2.php` | 1 |
| `app/Support/Design.php` | 1 |
| `resources/js/Pages/Preview/**` | 18 arquivos + `_data` |
| `resources/js/Pages/*.jsx` legado | 14 |
| `resources/js/components/AppLayout.jsx` | 1 |
| `resources/js/components/ui/**` | confirmar |
| `tests/Feature/PreviewDesignV2Test.php` | remover após extrair 2 testes |

### B. Mapa de extração da Fase 2

```text
FluxoController
├── StoreFluxoRequest
├── UpdateFluxoRequest
├── SincronizarEtapasDoFluxo
│   ├── ArmazenarAnexosDasEtapas
│   └── SincronizarCondicoesDasEtapas
└── HorarioDeInicio
    └── DisponibilidadeDeColunas

EnviarEtapaFluxo
├── EnviarTextoDaEtapa
├── EnviarMidiaDaEtapa
├── EnviarIndicadorDigitacao
├── AvaliarCondicaoDeHorario
└── ResumoErroMeta

ProcessarMensagemEntrante
├── RegistrarMensagemRecebida
├── JanelaDeMensagemLivre
└── IniciarFluxosDoContato
```

### C. Mapa de extração da Fase 3

```text
V2/EditorFluxo
├── useEditorFluxo
├── CabecalhoEditor
├── PainelEtapasEditor
├── PainelPreviaEditor
└── BarraAcoesEditor

V2/Conversas
├── useConversas
├── ListaConversas
├── ItemConversa
├── ThreadConversa
├── FichaDoContato
└── CompositorMensagem
```

### D. Comandos úteis

```powershell
# Contagem de testes
php artisan test --compact

# Estilo
vendor/bin/pint --dirty --format agent

# Build
npm run build

# Rotas
php artisan route:list --except-vendor

# Saúde
docker compose ps
(Invoke-WebRequest -UseBasicParsing "https://flowchat.inovawebdesigns.com/up").StatusCode

# Busca de referências
Get-ChildItem app,resources\js,routes,tests -Recurse -Include *.php,*.jsx,*.js |
  Select-String -Pattern "termo"
```

### E. Estimativas

| Fase | Mínimo | Provável | Máximo |
|---|---:|---:|---:|
| 0 | 2 dias | 3 dias | 4 dias |
| 1 | 1 dia | 1,5 dia | 2 dias |
| 2 | 5 dias | 6,5 dias | 8 dias |
| 3 | 10 dias | 12 dias | 15 dias |
| **Total** | **18 dias** | **23 dias** | **29 dias** |

Estimativas de trabalho focado, sem contar imprevistos de Meta ou operação. Não são compromisso de prazo.

Acrescente ~0,5 dia por fase para triagem da review (Fases 1 a 3). O `ponytail-audit` inicial e o final custam ~0,5 dia cada. Total ajustado: **20 a 32 dias**.

---

## 13. Próxima ação recomendada

1. Aprovar as decisões D1, D2 e D3.
2. Executar apenas a Fase 0.
3. Revisar o resultado e decidir se a Fase 1 começa.

Nenhuma fase deve começar sem a anterior tagueada e verde.
