# Build do frontend
FROM node:24 AS build-js
WORKDIR /app
COPY package.json package-lock.json ./
# npm >= 11 corrige o bug de dependencias opcionais na instalacao do rolldown
# (npm/cli#4828): com o npm 10 embutido no node:20, o `npm ci` ignora os
# bindings de plataforma (ex: @rolldown/binding-linux-x64-gnu) quando o
# lockfile foi gerado em outro SO (ex: Windows)
RUN npm install -g npm@11 --silent \
    && npm ci --legacy-peer-deps --no-audit --no-fund
COPY . .
# Usa o modelo público apenas para resolver variáveis VITE_* no build.
# Nenhum .env real entra no contexto.
RUN cp .env.example .env && npm run build

# Aplicação Laravel servida por Apache + PHP
FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql pcntl \
    && a2enmod rewrite

RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY docker/php/uploads.ini /usr/local/etc/php/conf.d/uploads.ini
COPY docker/php/producao.ini /usr/local/etc/php/conf.d/producao.ini
COPY docker/apache/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker/apache/flowchat.conf /etc/apache2/conf-available/flowchat.conf
RUN a2enconf flowchat
COPY docker/entrypoint.sh /usr/local/bin/flowchat-entrypoint
COPY docker/healthcheck-app.sh /usr/local/bin/healthcheck-app
COPY docker/healthcheck-fila.sh /usr/local/bin/healthcheck-fila
COPY docker/healthcheck-agendador.sh /usr/local/bin/healthcheck-agendador
RUN chmod +x /usr/local/bin/flowchat-entrypoint /usr/local/bin/healthcheck-app /usr/local/bin/healthcheck-fila /usr/local/bin/healthcheck-agendador

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY . .
COPY --from=build-js /app/public/build ./public/build

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80

ENTRYPOINT ["flowchat-entrypoint"]
CMD ["apache2-foreground"]
