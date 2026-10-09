# Build do frontend
FROM node:20 AS build-js
WORKDIR /app
COPY . .
RUN npm ci && npm run build

# Aplicação Laravel
FROM php:8.3-cli
RUN docker-php-ext-install pdo_mysql
RUN apt-get update && apt-get install -y --no-install-recommends unzip && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY . .
COPY --from=build-js /app/public/build ./public/build
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress
EXPOSE 8000
# php -S direto (cwd public) para herdar as env vars do compose; artisan serve não repassa todas
CMD ["sh", "-c", "cd public && exec php -S 0.0.0.0:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php"]
