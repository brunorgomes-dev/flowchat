#!/usr/bin/env bash
#
# Funções compartilhadas pelos scripts de backup/restore e pelos testes de
# shell. Este arquivo não executa operações por si só.

# Resolve um caminho para a forma canônica, incluindo symlinks e componentes
# que ainda não existem. Requer realpath com suporte a -m (GNU coreutils,
# disponível em Linux, WSL e Git Bash). Há um fallback para prefixo existente.
canonicalizar_caminho() {
  local caminho=${1:-}

  if [ -z "$caminho" ]; then
    return 2
  fi

  case "$caminho" in
    /*) ;;
    *) caminho="$PWD/$caminho" ;;
  esac

  if command -v realpath >/dev/null 2>&1 && realpath -m -- / >/dev/null 2>&1; then
    realpath -m -- "$caminho"
    return $?
  fi

  # Fallback: resolve o prefixo existente com cd -P e normaliza o restante.
  local existente="$caminho" resto=""
  while [ ! -e "$existente" ] && [ "$existente" != "/" ]; do
    resto="/$(basename -- "$existente")$resto"
    existente=$(dirname -- "$existente")
  done

  existente=$(cd -P -- "$existente" 2>/dev/null && pwd -P) || return 2

  local resultado="${existente%/}"
  [ -n "$resultado" ] || resultado="/"

  local componente
  local IFS=/
  for componente in $resto; do
    case "$componente" in
      ''|.) ;;
      ..) resultado=$(dirname -- "$resultado") ;;
      *) resultado="$resultado/$componente" ;;
    esac
  done

  printf '%s\n' "${resultado:-/}"
}

# Retorna 0 quando o destino é externo ao repositório, 1 quando é a própria
# raiz ou está dentro dela, e 2 quando não foi possível canonicalizar.
validar_destino_backup() {
  local repo=${1:-} destino=${2:-} repo_real destino_real

  [ -n "$repo" ] && [ -n "$destino" ] || return 2

  repo_real=$(canonicalizar_caminho "$repo") || return 2
  destino_real=$(canonicalizar_caminho "$destino") || return 2

  case "$destino_real" in
    "$repo_real"|"$repo_real"/*) return 1 ;;
  esac

  return 0
}

# Imprime a primeira entrada do volume (arquivo, oculto ou diretório), sem
# escrever nada. Retorna 2 se não for possível inspecionar o volume.
primeira_entrada_volume() {
  local volume=${1:-} imagem=${2:-} docker_bin=${DOCKER_BIN:-docker}
  local saida temporario

  [ -n "$volume" ] && [ -n "$imagem" ] || return 2

  temporario=$(mktemp "${TMPDIR:-/tmp}/flowchat-volume.XXXXXX") || return 2
  if ! "$docker_bin" run --rm --network none \
    -v "$volume:/data:ro" \
    --entrypoint sh "$imagem" \
    -c 'find /data -mindepth 1 -maxdepth 1 -print -quit' > "$temporario" 2>/dev/null; then
    rm -f -- "$temporario"
    return 2
  fi

  saida=$(tr -d '\r' < "$temporario")
  rm -f -- "$temporario"
  printf '%s' "$saida"
}

# Lista containers (inclusive parados) que referenciam o volume. Retorna 2 se
# não for possível consultar.
containers_usando_volume() {
  local volume=${1:-} docker_bin=${DOCKER_BIN:-docker} saida temporario

  [ -n "$volume" ] || return 2

  temporario=$(mktemp "${TMPDIR:-/tmp}/flowchat-volume-use.XXXXXX") || return 2
  if ! "$docker_bin" ps -aq --filter "volume=$volume" > "$temporario" 2>/dev/null; then
    rm -f -- "$temporario"
    return 2
  fi

  saida=$(tr -d '\r' < "$temporario")
  rm -f -- "$temporario"
  printf '%s' "$saida"
}

# Gera migration-hashes.txt no diretório de destino e imprime "yes" ou "no"
# indicando se todas as migrations aplicadas têm arquivo correspondente no
# código atual.
gerar_arquivos_schema() {
  local migrations_dir=${1:-} applied_file=${2:-} destino=${3:-}
  local hashes_file="$destino/migration-hashes.txt"

  [ -n "$migrations_dir" ] && [ -n "$applied_file" ] && [ -n "$destino" ] || return 2
  [ -d "$migrations_dir" ] || return 2
  [ -f "$applied_file" ] || return 2

  : > "$hashes_file"

  local arquivo nome hash
  for arquivo in "$migrations_dir"/*.php; do
    [ -f "$arquivo" ] || continue
    nome=$(basename -- "$arquivo")
    nome=${nome%.php}
    hash=$(sha256sum -- "$arquivo" | awk '{print $1}')
    printf '%s  %s\n' "$hash" "$nome" >> "$hashes_file"
  done

  LC_ALL=C sort -k2,2 -o "$hashes_file" -- "$hashes_file"

  local completo=yes nome_migracao
  while IFS= read -r nome_migracao || [ -n "$nome_migracao" ]; do
    nome_migracao=$(printf '%s' "$nome_migracao" | tr -d '\r')
    [ -n "$nome_migracao" ] || continue

    case "$nome_migracao" in
      *[!A-Za-z0-9_]*)
        completo=no
        continue
        ;;
    esac

    if ! awk -v n="$nome_migracao" '$2 == n { encontrado = 1 } END { exit encontrado ? 0 : 1 }' "$hashes_file"; then
      completo=no
    fi
  done < "$applied_file"

  printf '%s\n' "$completo"
}

# Lê uma chave simples do manifesto sem executar o conteúdo do arquivo.
valor_manifesto() {
  local arquivo=${1:-} chave=${2:-}
  sed -n "s/^${chave}=//p" "$arquivo" | head -n 1 | tr -d '\r'
}

# Valida, fail-closed, se o schema registrado no backup é compatível com as
# migrations do código de destino. Retorna 0 quando pode restaurar e 1 quando
# deve recusar. Avisos de backup mais antigo vão para stderr.
validar_compatibilidade_schema() {
  local backup_dir=${1:-} migrations_dir=${2:-}
  local manifesto="$backup_dir/manifest.txt"
  local migrations="$backup_dir/migrations.txt"
  local hashes="$backup_dir/migration-hashes.txt"

  [ -n "$backup_dir" ] && [ -n "$migrations_dir" ] || return 1
  [ -d "$backup_dir" ] || { echo "ERRO: diretório de backup ausente." >&2; return 1; }
  [ -d "$migrations_dir" ] || { echo "ERRO: diretório de migrations do destino ausente." >&2; return 1; }
  [ -f "$manifesto" ] || { echo "ERRO: manifest.txt ausente; schema não verificável." >&2; return 1; }
  [ -f "$migrations" ] || { echo "ERRO: migrations.txt ausente; schema não verificável." >&2; return 1; }
  [ -f "$hashes" ] || { echo "ERRO: migration-hashes.txt ausente; schema não verificável." >&2; return 1; }

  local formato completo contagem informada hash_migrations hash_hashes esperado_migrations esperado_hashes
  formato=$(valor_manifesto "$manifesto" schema_format)
  completo=$(valor_manifesto "$manifesto" schema_complete)
  contagem=$(valor_manifesto "$manifesto" schema_migrations_count)
  esperado_migrations=$(valor_manifesto "$manifesto" schema_migrations_sha256)
  esperado_hashes=$(valor_manifesto "$manifesto" schema_migration_hashes_sha256)

  [ "$formato" = "1" ] || { echo "ERRO: schema_format ausente ou desconhecido; restauração recusada." >&2; return 1; }
  [ "$completo" = "yes" ] || { echo "ERRO: o backup não registra schema completo; restauração recusada." >&2; return 1; }
  case "$contagem" in
    ''|*[!0-9]*) echo "ERRO: schema_migrations_count ausente ou inválido." >&2; return 1 ;;
  esac
  [ -n "$esperado_migrations" ] || { echo "ERRO: hash de migrations ausente; restauração recusada." >&2; return 1; }
  [ -n "$esperado_hashes" ] || { echo "ERRO: hash dos arquivos de migration ausente; restauração recusada." >&2; return 1; }

  hash_migrations=$(sha256sum -- "$migrations" | awk '{print $1}')
  hash_hashes=$(sha256sum -- "$hashes" | awk '{print $1}')
  [ "$hash_migrations" = "$esperado_migrations" ] || { echo "ERRO: migrations.txt não confere com o manifesto." >&2; return 1; }
  [ "$hash_hashes" = "$esperado_hashes" ] || { echo "ERRO: migration-hashes.txt não confere com o manifesto." >&2; return 1; }

  local total=0 nome_migracao hash_backup hash_destino arquivo_destino
  while IFS= read -r nome_migracao || [ -n "$nome_migracao" ]; do
    nome_migracao=$(printf '%s' "$nome_migracao" | tr -d '\r')
    [ -n "$nome_migracao" ] || continue
    total=$((total + 1))

    case "$nome_migracao" in
      *[!A-Za-z0-9_]*)
        echo "ERRO: nome de migration inválido no backup: $nome_migracao" >&2
        return 1
        ;;
    esac

    arquivo_destino="$migrations_dir/$nome_migracao.php"
    if [ ! -f "$arquivo_destino" ]; then
      echo "ERRO: o backup contém a migration $nome_migracao, que não existe no código de destino; restauração recusada." >&2
      return 1
    fi

    hash_backup=$(awk -v n="$nome_migracao" '$2 == n { print $1; exit }' "$hashes")
    if [ -z "$hash_backup" ]; then
      echo "ERRO: hash da migration $nome_migracao ausente no backup; restauração recusada." >&2
      return 1
    fi

    hash_destino=$(sha256sum -- "$arquivo_destino" | awk '{print $1}')
    if [ "$hash_destino" != "$hash_backup" ]; then
      echo "ERRO: a migration $nome_migracao difere entre o backup e o código de destino; restauração recusada." >&2
      return 1
    fi
  done < "$migrations"

  [ "$total" -gt 0 ] || { echo "ERRO: lista de migrations do backup vazia; schema não verificável." >&2; return 1; }
  [ "$total" -eq "$contagem" ] || { echo "ERRO: contagem de migrations diverge do manifesto." >&2; return 1; }

  local distintos
  distintos=$(sed '/^$/d' "$migrations" | sort -u | wc -l | tr -d ' ')
  [ "$distintos" -eq "$total" ] || { echo "ERRO: migrations duplicadas no backup." >&2; return 1; }

  local extras=0 arquivo nome_base
  for arquivo in "$migrations_dir"/*.php; do
    [ -f "$arquivo" ] || continue
    nome_base=$(basename -- "$arquivo")
    nome_base=${nome_base%.php}
    if ! grep -qxF -- "$nome_base" "$migrations"; then
      extras=$((extras + 1))
      echo "AVISO: migration do código de destino não aplicada no backup: $nome_base" >&2
    fi
  done

  if [ "$extras" -gt 0 ]; then
    echo "AVISO: o backup é mais antigo que o código de destino ($extras migration(s) extra(s)). Nenhuma migration será executada automaticamente." >&2
  fi

  return 0
}
