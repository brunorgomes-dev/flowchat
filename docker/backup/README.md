# Backup e restauração — MySQL e mídias

Procedimento para gerar e restaurar backups do FlowChat cobrindo o banco MySQL e os arquivos privados de mídia. Os scripts ficam em `docker/backup/` e não alteram o comportamento da aplicação.

## 1. O que entra no backup

| Dado | Onde vive | Como é copiado |
| --- | --- | --- |
| Banco MySQL | volume `dados_mysql` (`/var/lib/mysql` no container `db`) | `mysqldump` executado dentro do container `db`, com transação consistente |
| Mídias e arquivos privados | volume `dados_midia` montado em `/app/storage/app/private` | `tar.gz` do conteúdo do volume, preservando caminhos |

O disco `local` do Laravel aponta para `storage_path('app/private')` (`config/filesystems.php`). As mídias ficam em `flowchat/etapas/{account_id}/...` (`app/Support/ArmazenamentoMidia.php`). O arquivo gerado preserva essa estrutura relativa (`./flowchat/etapas/...`).

### O que NÃO entra no backup

- `.env` e qualquer segredo de ambiente.
- `APP_KEY`.
- Imagens Docker, código-fonte, `vendor`, `node_modules`, builds.
- Arquivos públicos (`storage/app/public`) — hoje não são usados para mídia do fluxo.
- Logs de container.

**Importante:** o banco contém dados pessoais (contatos, mensagens, origens), hashes de senha, sessões e tokens de Página criptografados. Os tokens só podem ser lidos com o `APP_KEY` correto, que não está no backup. Guarde o `APP_KEY` separadamente, em cofre de segredos, e nunca junto do arquivo de backup.

## 2. Pré-requisitos

- Docker com Compose em execução.
- Serviço `db` em execução e saudável (o backup não inicia serviços).
- Bash disponível (Linux, WSL ou Git Bash). O repositório e o Docker precisam estar acessíveis nesse shell. No Git Bash, os scripts já desativam a conversão automática de caminhos (`MSYS_NO_PATHCONV`).
- `realpath` com suporte a `-m` é usado para canonicalizar o destino e resolver symlinks/componentes inexistentes; Linux, WSL e Git Bash GNU o fornecem. Há fallback limitado no script.
- `gzip`, `tar` e `sha256sum` no host (os dois primeiros também existem na imagem `flowchat-app`, usada para ler o volume).
- Espaço em disco para pelo menos uma cópia completa do banco + mídias.
- Destino de backup fora do repositório (padrão: `$HOME/flowchat-backups`).

## 3. Gerar o backup

```bash
cd /caminho/para/flowchat
bash docker/backup/backup.sh
```

Variáveis opcionais:

| Variável | Padrão | Função |
| --- | --- | --- |
| `FLOWCHAT_BACKUP_DIR` | `$HOME/flowchat-backups` | diretório dedicado, absoluto |
| `FLOWCHAT_BACKUP_RETENTION_DAYS` | `14` | retenção em dias; `0` desativa |
| `FLOWCHAT_APP_IMAGE` | `flowchat-app:latest` | imagem usada só para ler o volume |

Exemplo com retenção de 30 dias:

```bash
FLOWCHAT_BACKUP_RETENTION_DAYS=30 bash docker/backup/backup.sh
```

O script não lê o `.env` do host. O dump usa `MYSQL_DATABASE`, `MYSQL_USER` e `MYSQL_PASSWORD` já presentes no container `db`, via `MYSQL_PWD`, sem imprimir credenciais.

`FLOWCHAT_BACKUP_DIR` pode ser absoluto ou relativo à raiz do repositório. O script canonicaliza o caminho (incluindo symlinks e componentes ainda inexistentes) e **recusa** o próprio repositório ou qualquer destino dentro dele. A recusa acontece antes de criar diretório, marcador ou lock.

### Metadados de schema

Além do dump e da mídia, o backup grava:

- `migrations.txt` — lista ordenada das migrations aplicadas no banco;
- `migration-hashes.txt` — SHA-256 de cada arquivo de migration no código do backup, indexado pelo nome sem `.php`.

O `manifest.txt` registra `schema_format`, `schema_complete`, a contagem e os hashes desses dois arquivos. A identificação usa o conteúdo dos arquivos de migration, não apenas `git rev-parse HEAD`; assim funciona com workspace sujo e alterações locais. Se uma migration aplicada não tiver arquivo correspondente no código, o backup é marcado `schema_complete=no` e o restore o recusa.

### Estrutura gerada

```text
$HOME/flowchat-backups/
├── .flowchat-backups          # marcador de diretório dedicado
└── AAAA-MM-DD_HHMMSS/         # data/hora UTC
    ├── mysql.sql.gz
    ├── midia.tar.gz
    ├── migrations.txt
    ├── migration-hashes.txt
    ├── SHA256SUMS
    └── manifest.txt
```

- O backup só é considerado válido quando `SHA256SUMS` e `manifest.txt` existem.
- `migrations.txt` e `migration-hashes.txt` são obrigatórios para o restore; backups gerados pelo script antigo, sem esses arquivos, são recusados.
- Arquivos `.partial` indicam execução interrompida e não devem ser usados.
- Diretórios e arquivos são criados com permissão restrita (`umask 077`; `chmod 700/600` quando suportado).

### Consistência entre banco e mídia

O dump usa `--single-transaction`, produzindo um retrato consistente do banco InnoDB. As mídias são arquivadas depois do dump. Como os arquivos enviados são imutáveis e só são removidos por limpeza de órfãos, essa ordem evita que o banco referencie um arquivo que ainda não exista no arquivo.

Ainda assim, banco e mídia não são uma transação única. Para uma janela realmente consistente:

1. pare `app`, `fila` e `agendador` (mantenha `db` em execução);
2. rode o backup;
3. suba os serviços novamente.

Isso não é feito automaticamente pelo script. Sem a janela, arquivos criados entre o dump e o `tar` podem virar órfãos no backup (inofensivo) e uma remoção de órfão concorrente poderia deixar uma referência sem arquivo (raro, mas possível).

## 4. Retenção

- Só remove subdiretórios dentro de `FLOWCHAT_BACKUP_DIR`.
- Só considera nomes no padrão exato `AAAA-MM-DD_HHMMSS`.
- Só age se o marcador `.flowchat-backups` existir.
- Não segue links simbólicos e não toca em arquivos soltos, no marcador ou no lock.
- `0` desativa a remoção automática.

Ainda assim, revise o diretório antes de confiar na retenção e mantenha cópia secundária fora do host.

### 4.1 Política aprovada para o piloto pequeno (13/11/2026)

- Backup diário, com retenção de 14 backups diários.
- RPO de até 24 horas e RTO alvo de até 4 horas.
- `APP_KEY` guardada separadamente em cofre de senhas/segredos, nunca junto dos backups.
- Sem expurgo automático de conversas de clientes reais.
- Prazos provisórios somente para dados de teste, a revisar antes de ampliar o uso: mensagens/anexos de demonstração até 30 dias ou fim da rodada; logs operacionais 90 dias; logs administrativos/segurança 180 dias.
- Criptografia em repouso e cópia fora do host somente quando o destino de hospedagem for escolhido; não estão ativas hoje.
- Nenhuma tarefa agendada no Windows nem rotina de backup para o banco local atual.
- Não ler, imprimir ou copiar `APP_KEY`, senhas ou tokens para relatórios e tickets.

## 5. Restaurar em ambiente isolado

Nunca restaure no projeto ativo. O script recusa explicitamente quando:

- `--project` é `flowchat` (projeto ativo);
- o container de destino pertence ao projeto ativo ou é o mesmo container do `db` ativo;
- o container publica portas;
- o volume de destino é o volume ativo, está em uso por **qualquer** container do projeto de destino (mesmo com o mesmo label) ou contém qualquer entrada (arquivo, oculto ou diretório);
- o banco de destino já tem tabelas, salvo `--allow-nonempty`;
- o schema do backup não é verificável ou contém migration que não existe no código de destino;
- checksums não conferem.

Além disso, `--confirm` é obrigatório.

Por padrão, o projeto ativo é `flowchat` e o volume ativo é `flowchat_dados_midia`. Se o ambiente usar outros nomes, defina `FLOWCHAT_ACTIVE_PROJECT` e `FLOWCHAT_ACTIVE_MEDIA_VOLUME` antes de rodar o script de restauração.

### 5.1 Criar o ambiente descartável

Crie um arquivo de ambiente **fictício** fora do repositório (nunca use credenciais de produção) e suba apenas o banco:

```bash
export RESTORE_DB_DATABASE=flowchat_restore
export RESTORE_DB_USERNAME=flowchat_restore
export RESTORE_DB_PASSWORD='<senha-ficticia-forte>'

docker compose -p flowchat-restore \
  -f docker/backup/docker-compose.restore.yml up -d db
```

O Compose de restauração não publica portas, usa rede interna e cria o volume exclusivo:

- `flowchat-restore_restore_mysql`

O volume de mídia `flowchat-restore_restore_midia` é criado pelo `restore.sh` com os labels do projeto e **não** é montado em nenhum container. Isso permite exigir que nenhum container do projeto o esteja usando antes da extração.

### 5.2 Executar a restauração

```bash
DB_CONTAINER=$(docker compose -p flowchat-restore \
  -f docker/backup/docker-compose.restore.yml ps -q db)

bash docker/backup/restore.sh \
  --backup-dir "$HOME/flowchat-backups/AAAA-MM-DD_HHMMSS" \
  --project flowchat-restore \
  --db-container "$DB_CONTAINER" \
  --media-volume flowchat-restore_restore_midia \
  --confirm
```

Use `--db-only` ou `--media-only` quando quiser restaurar apenas uma parte.

### 5.2.1 Compatibilidade de schema (fail-closed)

Antes de restaurar o banco, o script compara as migrations do backup com os arquivos em `database/migrations` do código de destino:

- **Compatível:** toda migration aplicada no backup existe no destino e o SHA-256 do arquivo coincide.
- **Backup mais novo que o código:** alguma migration do backup não existe no destino → recusa.
- **Backup mais antigo que o código:** o destino tem migrations extras → permite com aviso; nenhuma migration é executada automaticamente. Após revisar, as migrations pendentes podem ser aplicadas **manualmente, apenas no ambiente isolado**, seguindo o procedimento de implantação.
- **Metadados ausentes, `schema_complete=no`, contagem divergente, hash alterado ou lista vazia:** recusa.

A verificação usa o conteúdo dos arquivos de migration, não apenas `git rev-parse HEAD`. Isso funciona com workspace sujo, mas qualquer alteração local em uma migration compartilhada faz o restore recusar até que o backup e o código sejam reconciliados.

### 5.2.2 Volume de mídia vazio e livre

O `restore.sh` cria o volume `--media-volume` com os labels do projeto se ele ainda não existir. Antes de restaurar o banco, recusa se **qualquer** container (rodando ou parado) referenciar o volume, inclusive containers do mesmo projeto, e recusa se encontrar qualquer entrada — inclusive arquivo oculto ou subdiretório. Não há opção para mesclar ou limpar automaticamente: use um volume novo e descartável. A checagem acontece antes do banco para não deixar o banco restaurado e a mídia pela metade.

### 5.2.3 Senha do MySQL isolado

O entrypoint do MySQL monta SQL sem escapar aspas; o `restore.sh` valida que `MYSQL_PASSWORD` contém apenas letras e números e recusa valores com outros caracteres. Use uma senha fictícia alfanumérica no ambiente descartável. Isso é uma limitação do entrypoint, não uma recomendação para produção.

### 5.2.4 Recuperação após interrupção

Se a operação for interrompida depois do início (erro no dump, SIGINT/SIGTERM ou falha na mídia), o script emite um aviso de que o ambiente isolado pode estar parcialmente restaurado. Não reutilize esse ambiente: revise os logs, descarte os containers/volumes do ensaio conforme o procedimento da hospedagem e crie um ambiente novo. O script nunca apaga ou sobrescreve volumes existentes.

### 5.3 Verificações pós-restauração

O script confirma a contagem de tabelas e de arquivos de mídia. Para uma validação mais completa:

- conferir `SHOW TABLES;` e algumas contagens no banco isolado;
- conferir no log qual foi o resultado da checagem de schema e se há migrations do destino ainda não aplicadas;
- listar `flowchat/etapas/` no volume restaurado e comparar a quantidade com o `manifest.txt`;
- confirmar que o volume de mídia estava vazio antes da restauração;
- conferir `SHA256SUMS` do backup antes da restauração (o script já faz);
- opcionalmente subir uma instância descartável do app apontando para o banco/volume restaurados e validar login, conversas e anexos.

Não aponte o ambiente ativo para o banco ou volume de ensaio.

### 5.4 Descartar o ensaio

Depois da revisão, remova o ambiente isolado com `-p` e `-f` explícitos. Evite `down -v` a menos que queira apagar os volumes do ensaio. Nunca use o comando no projeto `flowchat`.

## 6. Proteção dos backups

Os arquivos contêm dados pessoais e material sensível:

- restrinja o diretório ao operador responsável (`700`) e os arquivos a `600`;
- mantenha o diretório fora do repositório e nunca faça commit;
- criptografe em repouso (por exemplo, volume cifrado ou ferramenta de criptografia antes de enviar para outro local);
- armazene uma cópia off-host/off-site com acesso autenticado;
- não envie backup por chat, email ou armazenamento público;
- registre quem acessa, por quanto tempo os backups são retidos e como são destruídos;
- guarde `APP_KEY` separadamente, em cofre de segredos; sem ela os tokens criptografados no banco não são recuperáveis;
- trate os backups como dados de produção mesmo em ambiente de teste.

## 7. Estado real do ensaio e pendências

### Comprovado com dados sintéticos (12/11 e 13/11/2026)

- Dump do MySQL do projeto de smoke com checksums verificados.
- Arquivamento do volume de mídia sintético, preservando a estrutura.
- Restauração em projeto isolado sem portas publicadas: 22 tabelas e 1 arquivo de mídia.
- Ensaio Docker real de 13/11/2026 em quatro projetos descartáveis: backup com 22 migrations e schema completo; restore de 22 tabelas/1 conta/1 contato/1 mensagem/1 mídia; recusa de volume preenchido e de schema incompatível antes de qualquer escrita. Os recursos descartáveis foram removidos depois, com autorização separada; a verificação posterior não encontrou o prefixo exclusivo do ensaio.
- Testes de shell de 13/11/2026: 28 verificações passaram, incluindo volume usado pelo mesmo projeto, falha de inspeção e senha alfanumérica; `bash -n` e `compose config` estático também passaram. Nenhum novo backup/restore real foi executado nesta revisão.
- O banco local com conversas **não** foi copiado.

### Não comprovado

- Restauração de dados reais ou de um backup autorizado do ambiente de produção/teste.
- Recuperação de token criptografado com a `APP_KEY` correta.
- Criptografia em repouso, cópia off-site, RPO/RTO medidos e rotina agendada. Os valores provisórios aprovados são RPO de até 24 h e RTO alvo de até 4 h, mas ainda não foram medidos em produção.
- Funcionamento no ambiente online/hospedagem, que ainda será escolhido.
- Compatibilidade do dump com uma versão futura da aplicação.
- Esta revisão não executou novo backup/restore; o ensaio Docker real de 13/11 usou somente dados sintéticos.

### Procedimento futuro, depois de escolher a hospedagem

1. Guardar a `APP_KEY` em cofre de segredos separado do backup e testar sua recuperação.
2. Aplicar a frequência aprovada (diária), definir o responsável operacional, a janela sem escrita (`app`, `fila` e `agendador` parados) e o destino definitivo.
3. Configurar criptografia em repouso e cópia externa/off-site; medir o RPO de até 24 h e o RTO alvo de até 4 h.
4. Fazer o primeiro backup autorizado do ambiente real, sem copiar dados para destinos não criptografados.
5. Restaurar em ambiente isolado e testar a recuperação de um token criptografado com a `APP_KEY` correta.
6. Agendar ensaios periódicos e revisar a retenção de 14 backups diários antes de dados de pessoas reais.

### Lacunas conhecidas (revisadas em 13/11/2026)

- O `MYSQL_PASSWORD` do ambiente isolado deve conter apenas letras e números; o `restore.sh` valida isso e recusa outros caracteres. O entrypoint do MySQL monta SQL sem escapar aspas.
- A checagem de schema não executa migrations. Um backup mais antigo que o código pode ser restaurado com aviso, mas as migrations pendentes precisam ser aplicadas manualmente no ambiente isolado, após revisão; nunca no ambiente ativo.
- Backups gerados pelo script antigo, sem `migrations.txt`/`migration-hashes.txt`, são recusados. Não há conversão automática. A recuperação manual exigiria usar a versão antiga dos scripts/código em ambiente isolado, validar o conteúdo e gerar um novo backup com o script atual; esse procedimento não foi testado nesta rodada e não deve alterar o backup original.
- No Windows, os modos POSIX (`chmod 700/600`) não são aplicados integralmente pelo NTFS/Git Bash. Confira as ACLs reais com `icacls` e restrinja o diretório ao usuário operador.
- Os scripts removem `\r` das saídas do Docker para funcionar no Git Bash/Windows; não remova esse tratamento.
- O host Windows precisa de WSL ou Git Bash com Docker acessível; os caminhos `$HOME` variam entre esses ambientes.

## 8. Testes sem Docker

Os testes de shell das proteções não usam Docker engine, containers, volumes ou banco:

```bash
bash docker/backup/tests/run.sh
```

Eles cobrem canonicalização/recusa de destino, compatibilidade de schema e inspeção de volume com um mock. Em Git Bash, os casos de symlink são marcados como `SKIP` quando o sistema de arquivos não cria links reais; em WSL/Linux eles são executados. Os testes **não** substituem um ensaio real de backup/restore.
