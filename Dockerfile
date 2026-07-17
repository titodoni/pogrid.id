FROM php:8.4-cli-alpine

RUN apk add --no-cache nodejs npm libzip-dev zip \
    && docker-php-ext-install zip
