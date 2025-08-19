#!/bin/bash

# Server Name Configuration Script
# This script helps you configure secure server names for nginx

echo "🔒 Nginx Server Name Security Configuration"
echo "==========================================="

# Get current IP address
current_ip=$(hostname -I | awk '{print $1}')
echo "📍 Detected Pi IP address: $current_ip"

echo ""
echo "Choose your server name configuration:"
echo "1. Use IP address only (most secure for local network)"
echo "2. Use IP address + localhost"
echo "3. Use custom domain name"
echo "4. Use IP + domain + localhost (if you have a domain)"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        server_names="$current_ip"
        echo "📝 Using IP address only: $server_names"
        ;;
    2)
        server_names="$current_ip localhost"
        echo "📝 Using IP address and localhost: $server_names"
        ;;
    3)
        read -p "Enter your domain name (e.g., mypi.local or mydomain.com): " domain
        server_names="$domain"
        echo "📝 Using domain name: $server_names"
        ;;
    4)
        read -p "Enter your domain name: " domain
        server_names="$current_ip $domain localhost"
        echo "📝 Using IP, domain, and localhost: $server_names"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🔧 Updating nginx configuration..."

# Create secure nginx config
cat > nginx-secure-config.conf << EOF
# Secure Nginx configuration for Finance Tracker
# Copy this to: /etc/nginx/sites-available/finance-tracker

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name $server_names;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://\$host\$request_uri;
}

# Catch-all server for unknown hosts (security)
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    server_name _;
    
    # Use snakeoil cert for unknown hosts
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Return 444 (close connection) for unknown hosts
    return 444;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $server_names;
    
    # SSL configuration
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Hide nginx version
    server_tokens off;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/x-javascript
        application/xml+rss
        application/javascript
        application/json;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Validate Host header (security)
        if (\$host !~ ^($server_names)\$) {
            return 444;
        }
    }
    
    # Static file caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Favicon
    location /favicon.ico {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1d;
    }
    
    # Block access to sensitive files
    location ~ /\.(ht|env) {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

echo "✅ Secure configuration created: nginx-secure-config.conf"
echo ""
echo "🚀 To apply this configuration:"
echo "1. Copy to nginx: sudo cp nginx-secure-config.conf /etc/nginx/sites-available/finance-tracker"
echo "2. Enable site: sudo ln -sf /etc/nginx/sites-available/finance-tracker /etc/nginx/sites-enabled/"
echo "3. Remove default: sudo rm -f /etc/nginx/sites-enabled/default"
echo "4. Test config: sudo nginx -t"
echo "5. Restart nginx: sudo systemctl restart nginx"
echo ""
echo "🔒 Security features enabled:"
echo "- Specific server names only"
echo "- Unknown hosts blocked (return 444)"
echo "- Host header validation"
echo "- Security headers"
echo "- Sensitive file blocking"
