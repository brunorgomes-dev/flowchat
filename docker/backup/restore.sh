#!/usr/bin/env bash
#
# Restauração do MySQL e do volume de mídias do FlowChat em ambiente isolado.
#
# Uso:
#   bash docker/backup/restore.sh \
#     --backup-dir /caminho/absoluto/flowchat-backups/AAAA-MM-DD_HHMMSS \
#     --project flowchat-restore \
#     --db-container <container-mysql-isolado> \
#     --media-volume <volume-isolado> \
#     --confirm
#
# Opções:
#   --db-only          restaura somente o banco
#   --media-only       restaura somente as mídias
#   --allow-nonempty   permite restaurar sobre banco que já tem tabelas
#
# O script recusa explicitamente o projeto ativo, exige confirmação, exige
# volume de mídia vazio e confere migrations + hashes do schema antes de
# escrever qualquer dado. Ele não lê o .env do host e não imprime credenciais.
set -euo pipefail

# Evita a conversão automática de caminhos do Git Bash/MSYS, que transformaria
# argumentos de container como "-C /data" em caminhos do Windows.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
REPO_DIR=$(cd -- "$SCRIPT_DIR/../.." && pwd -P)
cd "$REPO_DIR"

. "$SCRIPT_DIR/lib.sh"

ACTIVE_PROJECT=${FLOWCHAT_ACTIVE_PROJECT:-flowchat}
ACTIVE_MEDIA_VOLUME=${FLOWCHAT_ACTIVE_MEDIA_VOLUME:-flowchat_dados_midia}
APP_IMAGE=${FLOWCHAT_APP_IMAGE:-flowchat-app:latest}

BACKUP_DIR=""
PROJECT=""
DB_CONTAINER=""
MEDIA_VOLUME=""
CONFIRM=0
ALLOW_NONEMPTY=0
DO_DB=1
DO_MEDIA=1
RESTORE_STARTED=0
RESTORE_FINISHED=0

die() {
  echo "ERRO: $*" >&2
  exit 1
}

info() {
  echo "[restore] $*"
}

aviso_restauracao_parcial() {
  local status=$?
  trap - EXIT INT TERM

  if [ "$RESTORE_STARTED" -eq 1 ] && [ "$RESTORE_FINISHED" -eq 0 ]; then
    echo "[restore] AVISO: a restauração foi interrompida após o início." >&2
    echo "[restore] O ambiente isolado pode estar parcialmente restaurado (banco e/ou mídia) e não deve ser reutilizado sem revisão." >&2
  fi

  exit "$status"
}

trap aviso_restauracao_parcial EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

usage() {
  cat >&2 <<'TXT'
Uso:
  bash docker/backup/restore.sh \
    --backup-dir /caminho/absoluto/flowchat-backups/AAAA-MM-DD_HHMMSS \
    --project flowchat-restore \
    --db-container <container-mysql-isolado> \
    --media-volume <volume-isolado> \
    --confirm

Opções:
  --db-only          restaura somente o banco
  --media-only       restaura somente as mídias
  --allow-nonempty   permite restaurar sobre banco que já tem tabelas
TXT
  exit 1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --backup-dir)
      [ "$#" -ge 2 ] || usage
      BACKUP_DIR=$2
      shift 2
      ;;
    --project)
      [ "$#" -ge 2 ] || usage
      PROJECT=$2
      shift 2
      ;;
    --db-container)
      [ "$#" -ge 2 ] || usage
      DB_CONTAINER=$2
      shift 2
      ;;
    --media-volume)
      [ "$#" -ge 2 ] || usage
      MEDIA_VOLUME=$2
      shift 2
      ;;
    --db-only)
      DO_MEDIA=0
      shift
      ;;
    --media-only)
      DO_DB=0
      shift
      ;;
    --allow-nonempty)
      ALLOW_NONEMPTY=1
      shift
      ;;
    --confirm)
      CONFIRM=1
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      die "argumento desconhecido: $1"
      ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "docker não encontrado no PATH"
command -v gzip >/dev/null 2>&1 || die "gzip não encontrado no PATH"
command -v sha256sum >/dev/null 2>&1 || die "sha256sum não encontrado no PATH"

[ "$CONFIRM" -eq 1 ] || die "restauração exige --confirm"
[ -n "$BACKUP_DIR" ] || die "informe --backup-dir"
[ -n "$PROJECT" ] || die "informe --project do ambiente isolado"
[ "$DO_DB" -eq 1 ] || [ "$DO_MEDIA" -eq 1 ] || die "use --db-only ou --media-only, não ambos"

case "$BACKUP_DIR" in
  /*) ;;
  *) die "--backup-dir precisa ser um caminho absoluto" ;;
esac
[ -d "$BACKUP_DIR" ] || die "diretório de backup não encontrado: $BACKUP_DIR"
[ -f "$BACKUP_DIR/manifest.txt" ] || die "manifest.txt ausente em $BACKUP_DIR"
[ -f "$BACKUP_DIR/SHA256SUMS" ] || die "SHA256SUMS ausente em $BACKUP_DIR"

info "conferindo integridade dos arquivos de backup"
(cd "$BACKUP_DIR" && sha256sum -c --quiet SHA256SUMS) || die "checksum não confere"

if [ "$DO_DB" -eq 1 ]; then
  info "verificando compatibilidade do schema do backup"
  validar_compatibilidade_schema "$BACKUP_DIR" "$REPO_DIR/database/migrations" \
    || die "restauração recusada: schema do backup incompatível ou não verificável"
fi

# ---------- proteções contra o ambiente ativo ----------
[ "$PROJECT" != "$ACTIVE_PROJECT" ] || die "recusado: --project é o projeto ativo ($ACTIVE_PROJECT)"
[ "$PROJECT" != "flowchat" ] || die "recusado: projeto 'flowchat' é o ambiente ativo"

ACTIVE_DB_ID=$(docker compose ps -q db 2>/dev/null | tr -d '\r' || true)

if [ "$DO_DB" -eq 1 ]; then
  [ -n "$DB_CONTAINER" ] || die "informe --db-container do MySQL isolado"
  docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || die "container não encontrado: $DB_CONTAINER"
  [ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" | tr -d '\r')" = "true" ] || die "o container de destino não está em execução"

  TARGET_DB_ID=$(docker inspect -f '{{.Id}}' "$DB_CONTAINER" | tr -d '\r')
  if [ -n "$ACTIVE_DB_ID" ] && [ "$TARGET_DB_ID" = "$ACTIVE_DB_ID" ]; then
    die "recusado: o container de destino é o banco do projeto ativo"
  fi

  TARGET_PROJECT=$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$DB_CONTAINER" 2>/dev/null | tr -d '\r' || true)
  [ -n "$TARGET_PROJECT" ] || die "o container de destino não pertence a um projeto Compose identificável"
  [ "$TARGET_PROJECT" = "$PROJECT" ] || die "o label do projeto do container ($TARGET_PROJECT) não confere com --project ($PROJECT)"
  [ "$TARGET_PROJECT" != "$ACTIVE_PROJECT" ] || die "recusado: o container de destino pertence ao projeto ativo"

  PORTS=$(docker port "$DB_CONTAINER" 2>/dev/null | tr -d '\r' || true)
  [ -z "$PORTS" ] || die "recusado: o MySQL de destino publica portas; use um ambiente isolado sem portas"

  docker exec "$DB_CONTAINER" sh -c \
    'test -n "${MYSQL_DATABASE:-}" && test -n "${MYSQL_USER:-}" && test -n "${MYSQL_PASSWORD:-}"' \
    || die "o container de destino não expõe MYSQL_DATABASE/MYSQL_USER/MYSQL_PASSWORD"

  docker exec "$DB_CONTAINER" sh -c \
    'case "${MYSQL_PASSWORD:-}" in ""|*[!A-Za-z0-9]*) exit 1 ;; esac' \
    || die "recusado: a senha do MySQL isolado deve conter apenas letras e números (limitação do entrypoint)"

  TABELAS=$(docker exec "$DB_CONTAINER" sh -c '
    exec env MYSQL_PWD="$MYSQL_PASSWORD" mysql \
      --user="$MYSQL_USER" --batch --skip-column-names "$MYSQL_DATABASE" \
      -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()"
  ' | tr -d '\r') || die "não foi possível consultar o banco de destino"
  if [ "$TABELAS" -gt 0 ] && [ "$ALLOW_NONEMPTY" -eq 0 ]; then
    die "recusado: o banco de destino já tem $TABELAS tabela(s); use um banco vazio ou --allow-nonempty"
  fi
fi

if [ "$DO_MEDIA" -eq 1 ]; then
  [ -n "$MEDIA_VOLUME" ] || die "informe --media-volume isolado"
  case "$MEDIA_VOLUME" in
    "${PROJECT}_"*) ;;
    *) die "o volume de mídia deve começar com ${PROJECT}_" ;;
  esac

  if ! docker volume inspect "$MEDIA_VOLUME" >/dev/null 2>&1; then
    docker volume create \
      --label "com.docker.compose.project=$PROJECT" \
      --label "com.docker.compose.volume=restore_midia" \
      "$MEDIA_VOLUME" >/dev/null \
      || die "não foi possível criar o volume de mídia $MEDIA_VOLUME"
  fi

  [ "$MEDIA_VOLUME" != "$ACTIVE_MEDIA_VOLUME" ] || die "recusado: --media-volume é o volume ativo"

  VOLUME_PROJECT=$(docker volume inspect -f '{{ index .Labels "com.docker.compose.project" }}' "$MEDIA_VOLUME" 2>/dev/null | tr -d '\r' || true)
  [ -n "$VOLUME_PROJECT" ] || die "o volume de destino não pertence a um projeto Compose identificável"
  [ "$VOLUME_PROJECT" = "$PROJECT" ] || die "o label do projeto do volume ($VOLUME_PROJECT) não confere com --project ($PROJECT)"
  [ "$VOLUME_PROJECT" != "$ACTIVE_PROJECT" ] || die "recusado: o volume de destino pertence ao projeto ativo"

  EM_USO=$(containers_usando_volume "$MEDIA_VOLUME") \
    || die "não foi possível consultar containers usando o volume $MEDIA_VOLUME"
  [ -z "$EM_USO" ] \
    || die "recusado: o volume de mídia $MEDIA_VOLUME está em uso por container(s) do projeto de destino; pare-os antes da restauração"

  ENTRADA_VOLUME=$(primeira_entrada_volume "$MEDIA_VOLUME" "$APP_IMAGE") \
    || die "não foi possível inspecionar o volume de mídia $MEDIA_VOLUME"
  [ -z "$ENTRADA_VOLUME" ] \
    || die "recusado: o volume de mídia $MEDIA_VOLUME não está vazio (contém $ENTRADA_VOLUME); use um volume novo ou descarte o ensaio"
fi

info "destino confirmado: projeto=$PROJECT"
if [ "$DO_DB" -eq 1 ]; then
  info "banco: container=$DB_CONTAINER (sem portas publicadas)"
fi
if [ "$DO_MEDIA" -eq 1 ]; then
  info "mídia: volume=$MEDIA_VOLUME (somente containers do projeto $PROJECT)"
fi

if [ "$DO_DB" -eq 1 ]; then
  RESTORE_STARTED=1
  info "restaurando banco"
  gunzip -c "$BACKUP_DIR/mysql.sql.gz" | docker exec -i "$DB_CONTAINER" sh -c '
    exec env MYSQL_PWD="$MYSQL_PASSWORD" mysql --user="$MYSQL_USER" "$MYSQL_DATABASE"
  ' || die "falha ao restaurar o banco"

  TABELAS_DEPOIS=$(docker exec "$DB_CONTAINER" sh -c '
    exec env MYSQL_PWD="$MYSQL_PASSWORD" mysql \
      --user="$MYSQL_USER" --batch --skip-column-names "$MYSQL_DATABASE" \
      -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()"
  ' | tr -d '\r') || die "não foi possível verificar o banco restaurado"
  [ "$TABELAS_DEPOIS" -gt 0 ] || die "o banco restaurado não tem tabelas"
  info "banco restaurado: $TABELAS_DEPOIS tabela(s)"
fi

if [ "$DO_MEDIA" -eq 1 ]; then
  if [ "$DO_DB" -eq 0 ]; then
    RESTORE_STARTED=1
  fi
  info "restaurando mídias"
  docker run --rm -i --network none \
    -v "$MEDIA_VOLUME:/data" \
    --entrypoint tar "$APP_IMAGE" \
    -C /data -xzf - < "$BACKUP_DIR/midia.tar.gz" \
    || die "falha ao restaurar as mídias"

  ARQUIVOS=$(docker run --rm --network none \
    -v "$MEDIA_VOLUME:/data:ro" \
    --entrypoint sh "$APP_IMAGE" \
    -c 'find /data -type f | wc -l' | tr -d ' \r')
  info "mídias restauradas: $ARQUIVOS arquivo(s)"
fi

RESTORE_FINISHED=1

info "restauração concluída no projeto isolado $PROJECT"
info "não aponte o app ativo para este banco/volume; valide e descarte o ambiente isolado depois da revisão"
