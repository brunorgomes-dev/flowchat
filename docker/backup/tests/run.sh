#!/usr/bin/env bash
#
# Testes isolados das proteções de backup/restore.
#
# Não usa Docker engine, containers, volumes reais ou banco de dados. A única
# dependência externa é um mock executável que simula a saída de `docker run`
# usado para inspecionar o volume de mídia.
set -u

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
LIB="$SCRIPT_DIR/../lib.sh"

# shellcheck source=../lib.sh
. "$LIB"

TMP=$(mktemp -d "${TMPDIR:-/tmp}/flowchat-backup-tests.XXXXXX") || {
  echo "ERRO: não foi possível criar diretório temporário" >&2
  exit 1
}
trap 'rm -rf -- "$TMP"' EXIT

PASS=0
FAIL=0

pass() {
  PASS=$((PASS + 1))
  printf 'PASS: %s\n' "$1"
}

fail() {
  FAIL=$((FAIL + 1))
  printf 'FAIL: %s\n' "$1"
}

assert_ok() {
  local nome=$1
  shift
  if "$@" >/dev/null 2>&1; then
    pass "$nome"
  else
    fail "$nome"
  fi
}

assert_fail() {
  local nome=$1
  shift
  if "$@" >/dev/null 2>&1; then
    fail "$nome"
  else
    pass "$nome"
  fi
}

criar_migrations() {
  local dir=$1
  shift
  mkdir -p -- "$dir"
  local nome
  for nome in "$@"; do
    printf '<?php // %s\n' "$nome" > "$dir/$nome.php"
  done
}

criar_backup_schema() {
  local backup=$1 app=$2
  shift 2
  mkdir -p -- "$backup"
  : > "$backup/migrations.txt"
  local nome
  for nome in "$@"; do
    printf '%s\n' "$nome" >> "$backup/migrations.txt"
  done

  local completo contagem hash_migrations hash_hashes
  completo=$(gerar_arquivos_schema "$app" "$backup/migrations.txt" "$backup")
  contagem=$(wc -l < "$backup/migrations.txt" | tr -d ' ')
  hash_migrations=$(sha256sum -- "$backup/migrations.txt" | awk '{print $1}')
  hash_hashes=$(sha256sum -- "$backup/migration-hashes.txt" | awk '{print $1}')

  {
    echo "flowchat_backup=1"
    echo "schema_format=1"
    echo "schema_complete=$completo"
    echo "schema_migrations_count=$contagem"
    echo "schema_migrations_sha256=$hash_migrations"
    echo "schema_migration_hashes_sha256=$hash_hashes"
  } > "$backup/manifest.txt"
}

executar_testes_caminho() {
  local repo="$TMP/repo" externo="$TMP/externo"
  mkdir -p -- "$repo/database/migrations" "$externo"

  assert_ok "caminho externo válido" validar_destino_backup "$repo" "$externo/backups"
  assert_fail "caminho dentro do repositório" validar_destino_backup "$repo" "$repo/backups"
  assert_fail "caminho igual à raiz do repositório" validar_destino_backup "$repo" "$repo"
  assert_fail "caminho com .. resolvendo para dentro" validar_destino_backup "$repo" "$repo/../repo/backups"
  assert_ok "componentes inexistentes fora do repositório" validar_destino_backup "$repo" "$externo/a/b/c"

  if (cd "$repo" && validar_destino_backup "$repo" "./backups" >/dev/null 2>&1); then
    fail "caminho relativo equivalente dentro do repositório"
  else
    pass "caminho relativo equivalente dentro do repositório"
  fi

  if ln -s "$repo" "$TMP/link-repo" 2>/dev/null && [ -L "$TMP/link-repo" ]; then
    assert_fail "symlink apontando para o repositório" validar_destino_backup "$repo" "$TMP/link-repo/backups"
  else
    echo "SKIP: symlink não suportado neste sistema de arquivos"
  fi

  if mkdir -p "$TMP/real-externo" && ln -s "$TMP/real-externo" "$TMP/link-externo" 2>/dev/null && [ -L "$TMP/link-externo" ]; then
    assert_ok "symlink externo válido" validar_destino_backup "$repo" "$TMP/link-externo/backups"
  else
    echo "SKIP: symlink externo não suportado neste sistema de arquivos"
  fi
}

executar_testes_schema() {
  local app_exato="$TMP/app-exato"
  local backup_exato="$TMP/backup-exato"
  criar_migrations "$app_exato" 2026_01_01_000000_a 2026_01_02_000000_b
  criar_backup_schema "$backup_exato" "$app_exato" 2026_01_01_000000_a 2026_01_02_000000_b
  assert_ok "schema exato" validar_compatibilidade_schema "$backup_exato" "$app_exato"

  local app_antigo="$TMP/app-antigo"
  local backup_antigo="$TMP/backup-antigo"
  criar_migrations "$app_antigo" 2026_01_01_000000_a 2026_01_02_000000_b 2026_01_03_000000_c
  criar_backup_schema "$backup_antigo" "$app_antigo" 2026_01_01_000000_a 2026_01_02_000000_b
  local saida_antigo status_antigo
  saida_antigo=$(validar_compatibilidade_schema "$backup_antigo" "$app_antigo" 2>&1)
  status_antigo=$?
  if [ "$status_antigo" -eq 0 ] && printf '%s' "$saida_antigo" | grep -q 'mais antigo'; then
    pass "backup mais antigo que o código é aceito com aviso"
  else
    fail "backup mais antigo que o código é aceito com aviso"
  fi

  local app_novo="$TMP/app-novo"
  local app_fonte_mais_nova="$TMP/app-fonte-mais-nova"
  local backup_mais_novo="$TMP/backup-mais-novo"
  criar_migrations "$app_novo" 2026_01_01_000000_a 2026_01_02_000000_b
  criar_migrations "$app_fonte_mais_nova" 2026_01_01_000000_a 2026_01_02_000000_b 2026_01_03_000000_c
  criar_backup_schema "$backup_mais_novo" "$app_fonte_mais_nova" \
    2026_01_01_000000_a 2026_01_02_000000_b 2026_01_03_000000_c
  assert_fail "backup mais novo que o código de destino" validar_compatibilidade_schema "$backup_mais_novo" "$app_novo"

  local backup_sem_metadados="$TMP/backup-sem-metadados"
  mkdir -p -- "$backup_sem_metadados"
  : > "$backup_sem_metadados/manifest.txt"
  assert_fail "metadados de schema ausentes" validar_compatibilidade_schema "$backup_sem_metadados" "$app_exato"

  local backup_incompleto="$TMP/backup-incompleto"
  criar_migrations "$TMP/app-incompleto" 2026_01_01_000000_a
  criar_backup_schema "$backup_incompleto" "$TMP/app-incompleto" \
    2026_01_01_000000_a 2026_01_02_000000_b
  assert_fail "backup com migration sem arquivo no código de origem" validar_compatibilidade_schema "$backup_incompleto" "$TMP/app-incompleto"

  local app_alterado="$TMP/app-alterado"
  local backup_alterado="$TMP/backup-alterado"
  criar_migrations "$app_alterado" 2026_01_01_000000_a
  criar_backup_schema "$backup_alterado" "$app_alterado" 2026_01_01_000000_a
  printf '<?php // conteúdo alterado\n' > "$app_alterado/2026_01_01_000000_a.php"
  assert_fail "migration alterada após o backup (versão não verificável)" \
    validar_compatibilidade_schema "$backup_alterado" "$app_alterado"

  local backup_marcado_incompleto="$TMP/backup-marcado-incompleto"
  cp -R -- "$backup_exato" "$backup_marcado_incompleto"
  sed -i 's/^schema_complete=yes$/schema_complete=no/' "$backup_marcado_incompleto/manifest.txt"
  assert_fail "manifesto marcado como incompleto" validar_compatibilidade_schema "$backup_marcado_incompleto" "$app_exato"
}

executar_testes_volume() {
  local mock="$TMP/mock-docker"
  cat > "$mock" <<'MOCK'
#!/usr/bin/env bash
printf '%s' "${MOCK_VOLUME_OUTPUT:-}"
exit "${MOCK_VOLUME_EXIT:-0}"
MOCK
  chmod +x -- "$mock"

  local saida
  saida=$(DOCKER_BIN="$mock" MOCK_VOLUME_OUTPUT='' primeira_entrada_volume volume-teste imagem-teste)
  if [ -z "$saida" ]; then
    pass "volume vazio"
  else
    fail "volume vazio"
  fi

  saida=$(DOCKER_BIN="$mock" MOCK_VOLUME_OUTPUT='arquivo.txt' primeira_entrada_volume volume-teste imagem-teste)
  if [ -n "$saida" ]; then
    pass "volume com arquivo normal"
  else
    fail "volume com arquivo normal"
  fi

  saida=$(DOCKER_BIN="$mock" MOCK_VOLUME_OUTPUT='.arquivo-oculto' primeira_entrada_volume volume-teste imagem-teste)
  if [ -n "$saida" ]; then
    pass "volume com arquivo oculto"
  else
    fail "volume com arquivo oculto"
  fi

  saida=$(DOCKER_BIN="$mock" MOCK_VOLUME_OUTPUT='diretorio' primeira_entrada_volume volume-teste imagem-teste)
  if [ -n "$saida" ]; then
    pass "volume com diretório"
  else
    fail "volume com diretório"
  fi

  if DOCKER_BIN="$mock" MOCK_VOLUME_EXIT=1 primeira_entrada_volume volume-teste imagem-teste >/dev/null 2>&1; then
    fail "falha ao inspecionar o volume deve ser detectada"
  else
    status=$?
    if [ "$status" -eq 2 ]; then
      pass "falha ao inspecionar o volume deve ser detectada"
    else
      fail "falha ao inspecionar o volume deve ser detectada (status $status)"
    fi
  fi

  saida=$(DOCKER_BIN="$mock" MOCK_VOLUME_OUTPUT='' containers_usando_volume volume-teste)
  if [ -z "$saida" ]; then
    pass "volume sem containers usando"
  else
    fail "volume sem containers usando"
  fi

  saida=$(DOCKER_BIN="$mock" MOCK_VOLUME_OUTPUT='container-em-uso' containers_usando_volume volume-teste)
  if [ -n "$saida" ]; then
    pass "container do mesmo projeto usando o volume é detectado"
  else
    fail "container do mesmo projeto usando o volume é detectado"
  fi
}

executar_testes_integracao_backup() {
  local script_backup="$SCRIPT_DIR/../backup.sh"
  local repo_root
  repo_root=$(cd -- "$SCRIPT_DIR/../.." && pwd -P)
  local alvo="$repo_root/.flowchat-backup-test-$$"
  local alvo_rel=".flowchat-backup-test-rel-$$"

  local saida status
  saida=$(FLOWCHAT_BACKUP_DIR="$alvo" bash "$script_backup" 2>&1)
  status=$?

  if [ "$status" -ne 0 ] && printf '%s' "$saida" | grep -q 'recusado' && [ ! -e "$alvo" ]; then
    pass "backup.sh recusa caminho dentro do repositório antes de criar arquivos"
  else
    fail "backup.sh recusa caminho dentro do repositório antes de criar arquivos"
  fi
  rm -rf -- "$alvo" 2>/dev/null || true

  saida=$(cd "$repo_root" && FLOWCHAT_BACKUP_DIR="./$alvo_rel" bash "$script_backup" 2>&1)
  status=$?

  if [ "$status" -ne 0 ] && printf '%s' "$saida" | grep -q 'recusado' && [ ! -e "$repo_root/$alvo_rel" ]; then
    pass "backup.sh recusa caminho relativo equivalente dentro do repositório"
  else
    fail "backup.sh recusa caminho relativo equivalente dentro do repositório"
  fi
  rm -rf -- "$repo_root/$alvo_rel" 2>/dev/null || true
}

executar_testes_estrutura() {
  local script_backup="$SCRIPT_DIR/../backup.sh"
  local script_restore="$SCRIPT_DIR/../restore.sh"
  local linha_volume linha_containers linha_schema linha_banco

  if grep -qF 'schema_migrations_sha256=' "$script_backup" \
    && grep -qF 'migration-hashes.txt' "$script_backup" \
    && grep -qF 'schema_complete=' "$script_backup"; then
    pass "backup.sh registra metadados de schema no manifesto"
  else
    fail "backup.sh registra metadados de schema no manifesto"
  fi

  linha_volume=$(grep -nF 'ENTRADA_VOLUME=$(primeira_entrada_volume' "$script_restore" | head -n 1 | cut -d: -f1)
  linha_containers=$(grep -nF 'EM_USO=$(containers_usando_volume' "$script_restore" | head -n 1 | cut -d: -f1)
  linha_schema=$(grep -nF 'validar_compatibilidade_schema "$BACKUP_DIR"' "$script_restore" | head -n 1 | cut -d: -f1)
  linha_banco=$(grep -nF 'info "restaurando banco"' "$script_restore" | head -n 1 | cut -d: -f1)

  if [ -n "$linha_volume" ] && [ -n "$linha_banco" ] && [ "$linha_volume" -lt "$linha_banco" ]; then
    pass "volume de mídia é verificado antes de restaurar o banco"
  else
    fail "volume de mídia é verificado antes de restaurar o banco"
  fi

  if [ -n "$linha_containers" ] && [ -n "$linha_banco" ] && [ "$linha_containers" -lt "$linha_banco" ]; then
    pass "uso do volume por container é verificado antes de restaurar o banco"
  else
    fail "uso do volume por container é verificado antes de restaurar o banco"
  fi

  if [ -n "$linha_schema" ] && [ -n "$linha_banco" ] && [ "$linha_schema" -lt "$linha_banco" ]; then
    pass "schema é verificado antes de restaurar o banco"
  else
    fail "schema é verificado antes de restaurar o banco"
  fi

  if grep -qF 'parcialmente restaurado' "$script_restore"; then
    pass "restore.sh avisa sobre ambiente parcialmente restaurado"
  else
    fail "restore.sh avisa sobre ambiente parcialmente restaurado"
  fi

  if grep -qF 'senha do MySQL isolado deve conter apenas letras e números' "$script_restore"; then
    pass "restore.sh valida senha alfanumérica do MySQL isolado"
  else
    fail "restore.sh valida senha alfanumérica do MySQL isolado"
  fi
}

executar_testes_caminho
executar_testes_schema
executar_testes_volume
executar_testes_integracao_backup
executar_testes_estrutura

printf '\nRESULTADO: %d passaram, %d falharam\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
