#!/bin/bash

# SSL Certificate Setup Script for Finance Tracker
# This script helps you set up SSL certificates for HTTPS

echo "🔐 SSL Certificate Setup for Finance Tracker"
echo "============================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo"
    exit 1
fi

echo "Choose your SSL certificate option:"
echo "1. Use existing snakeoil certificates (for development/testing)"
echo "2. Generate self-signed certificates"
echo "3. Set up Let's Encrypt certificates (for production with domain)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "📝 Using snakeoil certificates..."
        
        # Check if snakeoil certificates exist
        if [ -f "/etc/ssl/certs/ssl-cert-snakeoil.pem" ] && [ -f "/etc/ssl/private/ssl-cert-snakeoil.key" ]; then
            echo "✅ Snakeoil certificates already exist"
        else
            echo "Installing ssl-cert package..."
            apt update && apt install -y ssl-cert
            make-ssl-cert generate-default-snakeoil
        fi
        
        echo "✅ Snakeoil certificates are ready"
        echo "⚠️  Warning: These certificates will show security warnings in browsers"
        ;;
        
    2)
        echo "📝 Generating self-signed certificates..."
        
        # Create directory if it doesn't exist
        mkdir -p /etc/ssl/private
        
        # Get server information
        read -p "Enter your domain or IP address: " server_name
        
        # Generate private key
        openssl genrsa -out /etc/ssl/private/finance-tracker.key 2048
        
        # Generate certificate
        openssl req -new -x509 -key /etc/ssl/private/finance-tracker.key \
            -out /etc/ssl/certs/finance-tracker.crt -days 365 \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$server_name"
        
        # Set proper permissions
        chmod 600 /etc/ssl/private/finance-tracker.key
        chmod 644 /etc/ssl/certs/finance-tracker.crt
        
        echo "✅ Self-signed certificates generated"
        echo "📍 Certificate: /etc/ssl/certs/finance-tracker.crt"
        echo "📍 Private Key: /etc/ssl/private/finance-tracker.key"
        echo ""
        echo "🔧 Update your nginx config to use these certificates:"
        echo "ssl_certificate /etc/ssl/certs/finance-tracker.crt;"
        echo "ssl_certificate_key /etc/ssl/private/finance-tracker.key;"
        ;;
        
    3)
        echo "📝 Setting up Let's Encrypt certificates..."
        
        # Check if domain is provided
        read -p "Enter your domain name (e.g., yourdomain.com): " domain
        
        if [ -z "$domain" ]; then
            echo "❌ Domain name is required for Let's Encrypt"
            exit 1
        fi
        
        # Install certbot
        echo "Installing certbot..."
        apt update && apt install -y certbot python3-certbot-nginx
        
        # Stop nginx temporarily
        systemctl stop nginx
        
        # Get certificate
        echo "Obtaining certificate for $domain..."
        certbot certonly --standalone -d $domain
        
        # Start nginx again
        systemctl start nginx
        
        echo "✅ Let's Encrypt certificate obtained"
        echo "📍 Certificate: /etc/letsencrypt/live/$domain/fullchain.pem"
        echo "📍 Private Key: /etc/letsencrypt/live/$domain/privkey.pem"
        echo ""
        echo "🔧 Update your nginx config to use these certificates:"
        echo "ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;"
        echo "ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;"
        echo ""
        echo "📅 Note: Let's Encrypt certificates expire in 90 days"
        echo "Set up auto-renewal with: sudo crontab -e"
        echo "Add: 0 12 * * * /usr/bin/certbot renew --quiet"
        ;;
        
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🔧 Next steps:"
echo "1. Update your nginx configuration if needed"
echo "2. Test nginx config: sudo nginx -t"
echo "3. Restart nginx: sudo systemctl restart nginx"
echo "4. Test HTTPS: curl -k https://your-pi-ip"
