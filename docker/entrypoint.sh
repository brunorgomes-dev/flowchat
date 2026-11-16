#!/bin/sh
set -e

mkdir -p \
    storage/app/private \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

# O volume nomeado pode ter sido criado por uma imagem anterior executada
# como root. Ajusta a propriedade antes de iniciar Apache, worker ou scheduler.
if [ "$(id -u)" = "0" ]; then
    chown -R www-data:www-data storage bootstrap/cache
fi

exec "$@"
