#!/bin/sh
set -e

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
  echo "SSL certs found, using HTTPS config"
  envsubst '$DOMAIN' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
else
  echo "SSL certs not found, using HTTP-only config"
  envsubst '$DOMAIN' < /etc/nginx/nginx.conf.http > /etc/nginx/nginx.conf
fi

# Start fail2ban
fail2ban-client start

exec nginx -g 'daemon off;'