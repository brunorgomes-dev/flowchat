#!/usr/bin/env bash
#
# Backup do MySQL e do volume de mídias do FlowChat.
#
# Uso:
#   bash docker/backup/backup.sh
#
# Variáveis opcionais:
#   FLOWCHAT_BACKUP_DIR            diretório dedicado (absoluto ou relativo à raiz do repositório). Padrão: $HOME/flowchat-backups
#   FLOWCHAT_BACKUP_RETENTION_DAYS retenção em dias (inteiro >= 0). Padrão: 14. 0 desativa.
#   FLOWCHAT_APP_IMAGE             imagem usada só para ler o volume. Padrão: flowchat-app:latest
#
# O script recusa destino dentro do repositório e grava migrations.txt e
# migration-hashes.txt para a checagem de schema feita pelo restore.
#
# O script não lê o .env do host e nunca imprime credenciais. O dump usa as
# variáveis MYSQL_* já presentes no container do banco.
set -euo pipefail

# Evita a conversão automática de caminhos do Git Bash/MSYS, que transformaria
# argumentos de container como "-C /data" em caminhos do Windows.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
REPO_DIR=$(cd -- "$SCRIPT_DIR/../.." && pwd -P)
cd "$REPO_DIR"

. "$SCRIPT_DIR/lib.sh"

BACKUP_ROOT=${FLOWCHAT_BACKUP_DIR:-"$HOME/flowchat-backups"}
RETENTION_DAYS=${FLOWCHAT_BACKUP_RETENTION_DAYS:-14}
APP_IMAGE=${FLOWCHAT_APP_IMAGE:-flowchat-app:latest}

die() {
  echo "ERRO: $*" >&2
  exit 1
}

info() {
  echo "[backup] $*"
}

umask 077

BACKUP_ROOT=$(canonicalizar_caminho "$BACKUP_ROOT") || die "não foi possível canonicalizar FLOWCHAT_BACKUP_DIR"
case "$BACKUP_ROOT" in
  /*) ;;
  *) die "FLOWCHAT_BACKUP_DIR precisa resolver para um caminho absoluto" ;;
esac
[ "$BACKUP_ROOT" != "/" ] || die "FLOWCHAT_BACKUP_DIR não pode ser /"
validar_destino_backup "$REPO_DIR" "$BACKUP_ROOT" \
  || die "recusado: FLOWCHAT_BACKUP_DIR não pode ser o repositório nem estar dentro dele"

command -v docker >/dev/null 2>&1 || die "docker não encontrado no PATH"
command -v gzip >/dev/null 2>&1 || die "gzip não encontrado no PATH"
command -v sha256sum >/dev/null 2>&1 || die "sha256sum não encontrado no PATH"
docker compose version >/dev/null 2>&1 || die "docker compose não está disponível"

case "$RETENTION_DAYS" in
  ''|*[!0-9]*) die "FLOWCHAT_BACKUP_RETENTION_DAYS precisa ser um inteiro >= 0" ;;
esac

DB_CONTAINER=$(docker compose ps -q db | tr -d '\r')
[ -n "$DB_CONTAINER" ] || die "o serviço db não está em execução; inicie-o antes do backup"

PROJECT=$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$DB_CONTAINER" | tr -d '\r')
[ -n "$PROJECT" ] || die "não foi possível identificar o projeto Compose do serviço db"

MEDIA_VOLUME=$(docker volume ls -q \
  --filter "label=com.docker.compose.project=$PROJECT" \
  --filter "label=com.docker.compose.volume=dados_midia" | tr -d '\r')
MEDIA_COUNT=$(printf '%s\n' "$MEDIA_VOLUME" | sed '/^$/d' | wc -l | tr -d ' ')
[ "$MEDIA_COUNT" -eq 1 ] || die "esperava exatamente um volume dados_midia no projeto $PROJECT"

if [ -e "$BACKUP_ROOT" ] && [ ! -d "$BACKUP_ROOT" ]; then
  die "FLOWCHAT_BACKUP_DIR existe e não é um diretório: $BACKUP_ROOT"
fi

# A raiz precisa ser dedicada ao FlowChat. O marcador impede que a retenção
# apague diretórios de outra finalidade caso o caminho seja configurado errado.
if [ -d "$BACKUP_ROOT" ]; then
  [ -f "$BACKUP_ROOT/.flowchat-backups" ] || die "o diretório $BACKUP_ROOT existe e não possui o marcador .flowchat-backups; use um diretório dedicado"
else
  mkdir -p -- "$BACKUP_ROOT"
  printf 'Diretório dedicado aos backups do FlowChat.\n' > "$BACKUP_ROOT/.flowchat-backups"
fi
chmod 700 -- "$BACKUP_ROOT" 2>/dev/null || true

LOCK_DIR="$BACKUP_ROOT/.lock"
mkdir -- "$LOCK_DIR" 2>/dev/null || die "outro backup parece estar em execução (remova $LOCK_DIR se for um lock antigo)"
cleanup() {
  rmdir -- "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

STAMP=$(date -u +%Y-%m-%d_%H%M%S)
DEST="$BACKUP_ROOT/$STAMP"
[ ! -e "$DEST" ] || die "o destino já existe: $DEST"
mkdir -p -- "$DEST"
chmod 700 -- "$DEST" 2>/dev/null || true

DB_FILE="$DEST/mysql.sql.gz"
MEDIA_FILE="$DEST/midia.tar.gz"

info "gerando dump consistente do banco (projeto $PROJECT)"
docker compose exec -T db sh -c '
  exec env MYSQL_PWD="$MYSQL_PASSWORD" mysqldump \
    --user="$MYSQL_USER" \
    --single-transaction \
    --quick \
    --skip-lock-tables \
    --no-tablespaces \
    --triggers \
    --set-gtid-purged=OFF \
    --default-character-set=utf8mb4 \
    "$MYSQL_DATABASE"
' | gzip -9 > "$DB_FILE.partial"
mv -- "$DB_FILE.partial" "$DB_FILE"

info "arquivando o volume de mídias $MEDIA_VOLUME"
docker run --rm --network none \
  -v "$MEDIA_VOLUME:/data:ro" \
  --entrypoint tar "$APP_IMAGE" \
  -C /data -czf - . > "$MEDIA_FILE.partial"
mv -- "$MEDIA_FILE.partial" "$MEDIA_FILE"

[ -s "$DB_FILE" ] || die "o dump do banco ficou vazio"
[ -s "$MEDIA_FILE" ] || die "o arquivo de mídias ficou vazio"
gzip -t "$DB_FILE" || die "o dump do banco está corrompido"
gzip -t "$MEDIA_FILE" || die "o arquivo de mídias está corrompido"

MIGRATIONS_FILE="$DEST/migrations.txt"
MIGRATION_HASHES_FILE="$DEST/migration-hashes.txt"

info "registrando migrations aplicadas e hashes do código"
docker compose exec -T db sh -c '
  exec env MYSQL_PWD="$MYSQL_PASSWORD" mysql \
    --user="$MYSQL_USER" --batch --skip-column-names "$MYSQL_DATABASE" \
    -e "SELECT migration FROM migrations ORDER BY id"
' | tr -d '\r' > "$MIGRATIONS_FILE"
[ -s "$MIGRATIONS_FILE" ] || die "não foi possível registrar as migrations aplicadas (lista vazia)"

SCHEMA_COMPLETE=$(gerar_arquivos_schema "$REPO_DIR/database/migrations" "$MIGRATIONS_FILE" "$DEST")
SCHEMA_COUNT=$(awk 'NF { n++ } END { print n + 0 }' "$MIGRATIONS_FILE")
SCHEMA_MIGRATIONS_SHA=$(sha256sum -- "$MIGRATIONS_FILE" | awk '{print $1}')
SCHEMA_HASHES_SHA=$(sha256sum -- "$MIGRATION_HASHES_FILE" | awk '{print $1}')

if [ "$SCHEMA_COMPLETE" != "yes" ]; then
  info "AVISO: há migration aplicada sem arquivo correspondente no código atual; o restore será recusado até o schema ser verificado."
fi

chmod 600 -- "$DB_FILE" "$MEDIA_FILE" "$MIGRATIONS_FILE" "$MIGRATION_HASHES_FILE" 2>/dev/null || true

(
  cd "$DEST"
  sha256sum mysql.sql.gz midia.tar.gz migrations.txt migration-hashes.txt > SHA256SUMS
  {
    echo "flowchat_backup=1"
    echo "criado_em_utc=$STAMP"
    echo "projeto_compose=$PROJECT"
    echo "volume_midia=$MEDIA_VOLUME"
    echo "imagem_leitura_midia=$APP_IMAGE"
    echo "banco_arquivo=mysql.sql.gz"
    echo "midia_arquivo=midia.tar.gz"
    echo "banco_bytes=$(wc -c < mysql.sql.gz | tr -d ' ')"
    echo "midia_bytes=$(wc -c < midia.tar.gz | tr -d ' ')"
    echo "retencao_dias=$RETENTION_DAYS"
    echo "schema_format=1"
    echo "schema_complete=$SCHEMA_COMPLETE"
    echo "schema_migrations_count=$SCHEMA_COUNT"
    echo "schema_migrations_sha256=$SCHEMA_MIGRATIONS_SHA"
    echo "schema_migration_hashes_sha256=$SCHEMA_HASHES_SHA"
  } > manifest.txt
)
chmod 600 -- "$DEST/SHA256SUMS" "$DEST/manifest.txt" 2>/dev/null || true

# Retenção: somente subdiretórios com o padrão exato de data dentro da raiz
# dedicada. Qualquer outro arquivo ou diretório é ignorado.
if [ "$RETENTION_DAYS" -gt 0 ]; then
  info "aplicando retenção de $RETENTION_DAYS dias (somente em $BACKUP_ROOT)"
  find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d \
    -name '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]_[0-9][0-9][0-9][0-9][0-9][0-9]' \
    -mtime +"$RETENTION_DAYS" -print0 |
    while IFS= read -r -d '' antigo; do
      case "$antigo" in
        "$BACKUP_ROOT"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]_[0-9][0-9][0-9][0-9][0-9][0-9])
          info "removendo backup antigo: $antigo"
          rm -rf -- "$antigo"
          ;;
        *)
          info "ignorando caminho fora do padrão: $antigo"
          ;;
      esac
    done
fi

info "backup concluído em $DEST"
ls -l -- "$DEST"
