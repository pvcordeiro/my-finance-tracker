#!/bin/sh
set -e

echo "Using Cloudflare SSL configuration"
envsubst '$DOMAIN' < /etc/nginx/nginx.conf.cloudflare > /etc/nginx/nginx.conf

# Clean up any stale Fail2Ban socket
rm -f /var/run/fail2ban/fail2ban.sock

# Start fail2ban
fail2ban-client start

exec nginx -g 'daemon off;'