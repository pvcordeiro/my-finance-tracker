#!/bin/bash

# Security Audit Script for Finance Tracker Nginx Configuration
# This script checks for common security issues in the nginx setup

echo "🔒 Finance Tracker Security Audit"
echo "================================="

# Check if we're on the Pi
if [ ! -f "/etc/nginx/nginx.conf" ]; then
    echo "⚠️  This script should be run on the Pi where nginx is installed"
    echo "💡 Copy this script to your Pi and run it there"
    exit 1
fi

echo ""
echo "🔍 Checking nginx configuration security..."

# Check for wildcard server names in active config
echo ""
echo "1. Checking for insecure wildcard server names..."
if grep -r "server_name _;" /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "default_server"; then
    echo "⚠️  Found wildcard server names that are NOT in default_server blocks"
    echo "🔧 Consider updating to specific hostnames"
else
    echo "✅ No insecure wildcard server names found"
fi

# Check for default server blocks
echo ""
echo "2. Checking for security default server blocks..."
if grep -r "default_server" /etc/nginx/sites-enabled/ >/dev/null 2>&1; then
    echo "✅ Default server blocks found (good for security)"
    grep -r "default_server" /etc/nginx/sites-enabled/ 2>/dev/null | head -3
else
    echo "⚠️  No default server blocks found"
    echo "🔧 Consider adding a default server block to handle unknown hosts"
fi

# Check for security headers
echo ""
echo "3. Checking for security headers..."
security_headers=("X-Frame-Options" "X-XSS-Protection" "X-Content-Type-Options" "Strict-Transport-Security")
missing_headers=()

for header in "${security_headers[@]}"; do
    if grep -r "$header" /etc/nginx/sites-enabled/ >/dev/null 2>&1; then
        echo "✅ $header header found"
    else
        echo "⚠️  $header header missing"
        missing_headers+=("$header")
    fi
done

# Check for HTTPS configuration
echo ""
echo "4. Checking HTTPS configuration..."
if grep -r "listen 443" /etc/nginx/sites-enabled/ >/dev/null 2>&1; then
    echo "✅ HTTPS (port 443) configured"
    
    # Check for HTTP to HTTPS redirect
    if grep -r "return 301 https" /etc/nginx/sites-enabled/ >/dev/null 2>&1; then
        echo "✅ HTTP to HTTPS redirect configured"
    else
        echo "⚠️  HTTP to HTTPS redirect not found"
        echo "🔧 Consider adding: return 301 https://\$host\$request_uri;"
    fi
else
    echo "⚠️  HTTPS not configured"
    echo "🔧 Consider setting up SSL certificates and HTTPS"
fi

# Check SSL certificate validity
echo ""
echo "5. Checking SSL certificates..."
cert_files=$(grep -r "ssl_certificate " /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "ssl_certificate_key" | awk '{print $3}' | sed 's/;//' | sort -u)

if [ -n "$cert_files" ]; then
    for cert in $cert_files; do
        if [ -f "$cert" ]; then
            echo "✅ Certificate file exists: $cert"
            # Check if it's about to expire (if openssl is available)
            if command -v openssl >/dev/null 2>&1; then
                expiry=$(openssl x509 -enddate -noout -in "$cert" 2>/dev/null | cut -d= -f2)
                if [ $? -eq 0 ]; then
                    echo "   📅 Expires: $expiry"
                fi
            fi
        else
            echo "❌ Certificate file missing: $cert"
        fi
    done
else
    echo "⚠️  No SSL certificate files configured"
fi

# Check for blocked file access
echo ""
echo "6. Checking for sensitive file protection..."
if grep -r "location.*\\.env" /etc/nginx/sites-enabled/ >/dev/null 2>&1; then
    echo "✅ .env file access blocked"
else
    echo "⚠️  .env file access not explicitly blocked"
    echo "🔧 Consider adding: location ~ /\\.(env|ht) { deny all; }"
fi

# Check nginx configuration validity
echo ""
echo "7. Testing nginx configuration..."
if nginx -t >/dev/null 2>&1; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors:"
    nginx -t
fi

# Summary
echo ""
echo "📋 Security Summary"
echo "==================="

if [ ${#missing_headers[@]} -eq 0 ]; then
    echo "✅ All recommended security headers are present"
else
    echo "⚠️  Missing security headers: ${missing_headers[*]}"
fi

# Show current listening ports
echo ""
echo "🌐 Current nginx listening ports:"
netstat -tuln 2>/dev/null | grep nginx || netstat -tuln 2>/dev/null | grep :80 || netstat -tuln 2>/dev/null | grep :443

echo ""
echo "🔧 Recommended next steps:"
echo "1. Review any warnings above"
echo "2. Update to specific server names instead of wildcards"
echo "3. Ensure HTTPS is properly configured"
echo "4. Set up proper SSL certificates for production"
echo "5. Monitor nginx logs regularly"
