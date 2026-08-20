FROM php:8.4-cli-alpine

RUN apk add --no-cache nodejs npm libzip-dev zip \
    && docker-php-ext-install zip \
    && addgroup -g 1000 appgroup \
    && adduser -u 1000 -G appgroup -s /bin/sh -D appuser \
    && mkdir -p /app && chown -R appuser:appgroup /app

WORKDIR /app

USER appuser
