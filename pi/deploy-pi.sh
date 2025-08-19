#!/bin/bash

# Finance Tracker Deployment Script for Raspberry Pi
# This script will deploy the application and set it up to run 24/7

set -e

echo "🚀 Starting deployment of Finance Tracker..."

# Configuration
APP_NAME="finance-tracker"
CURRENT_USER=$(whoami)
USER_HOME=$(eval echo ~$CURRENT_USER)
APP_DIR="$USER_HOME/finance-tracker"
SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"
NGINX_CONFIG="/etc/nginx/sites-available/$APP_NAME"
PORT=3000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}


# Prompt for domain and use it everywhere
prompt_domain() {
    read -p "Enter your domain name (e.g., mydomain.com): " DOMAIN
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "your-domain.com" ]; then
        print_error "Domain name is required for deployment"
        exit 1
    fi
    print_status "Using domain: $DOMAIN"
}

# Check if running as root for system services
check_sudo() {
    if [[ $EUID -eq 0 ]]; then
        print_error "Don't run this script as root. It will ask for sudo when needed."
        exit 1
    fi
}

# Update system packages
update_system() {
    print_status "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
}

# Install Node.js and npm if not present
install_nodejs() {
    if ! command -v node &> /dev/null; then
        print_status "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        print_status "Node.js is already installed: $(node --version)"
    fi
}

# Install PM2 for process management
install_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2..."
        sudo npm install -g pm2
        
        # Setup PM2 to start on boot
        sudo pm2 startup systemd -u $CURRENT_USER --hp $USER_HOME
        pm2 save
    else
        print_status "PM2 is already installed: $(pm2 --version)"
    fi
}

# Install and configure Nginx
install_nginx() {
    if ! command -v nginx &> /dev/null; then
        print_status "Installing Nginx..."
        sudo apt install -y nginx
        sudo systemctl enable nginx
    else
        print_status "Nginx is already installed"
    fi
}

# Create application directory and set permissions
setup_app_directory() {
    print_status "Setting up application directory..."
    
    # Get current user and group
    CURRENT_USER=$(whoami)
    CURRENT_GROUP=$(id -gn)
    
    sudo mkdir -p $APP_DIR
    sudo chown -R $CURRENT_USER:$CURRENT_GROUP $APP_DIR
    
    # Create data directory for SQLite database
    mkdir -p $APP_DIR/data
}

# Stop existing services
stop_existing_services() {
    print_status "Stopping existing services..."
    pm2 stop $APP_NAME 2>/dev/null || true
    pm2 delete $APP_NAME 2>/dev/null || true
}

# Deploy application files
deploy_app() {
    print_status "Deploying application files..."
    
    # Stop any existing PM2 processes first
    pm2 stop $APP_NAME 2>/dev/null || true
    pm2 delete $APP_NAME 2>/dev/null || true

    
    # Get the current script directory (should be in pi folder)
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
    
    print_status "Copying files from $PROJECT_ROOT to $APP_DIR"
    
    # Copy specific directories and files to avoid recursion
    cp -r "$PROJECT_ROOT/app" "$APP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/components" "$APP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/hooks" "$APP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/lib" "$APP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/public" "$APP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/styles" "$APP_DIR/" 2>/dev/null || true
    
    # Copy configuration files
    cp "$PROJECT_ROOT/package.json" "$APP_DIR/" 2>/dev/null || true
    cp "$PROJECT_ROOT/package-lock.json" "$APP_DIR/" 2>/dev/null || true
    cp "$PROJECT_ROOT/pnpm-lock.yaml" "$APP_DIR/" 2>/dev/null || true
    cp "$PROJECT_ROOT/next.config.mjs" "$APP_DIR/" 2>/dev/null || true
    cp "$PROJECT_ROOT/tailwind.config.js" "$APP_DIR/" 2>/dev/null || true
    cp "$PROJECT_ROOT/postcss.config.js" "$APP_DIR/" 2>/dev/null || true
    cp "$PROJECT_ROOT/postcss.config.mjs" "$APP_DIR/" 2>/dev/null || true
    cp "$PROJECT_ROOT/tsconfig.json" "$APP_DIR/" 2>/dev/null || true
    cp "$PROJECT_ROOT/components.json" "$APP_DIR/" 2>/dev/null || true
    
    # Set proper ownership
    CURRENT_GROUP=$(id -gn)
    sudo chown -R $CURRENT_USER:$CURRENT_GROUP $APP_DIR
    
    # Copy management scripts from pi folder
    mkdir -p $APP_DIR/scripts
    cp "$SCRIPT_DIR/backup-pi.sh" "$APP_DIR/scripts/backup.sh"
    cp "$SCRIPT_DIR/update-pi.sh" "$APP_DIR/scripts/update.sh"
    chmod +x $APP_DIR/scripts/backup.sh
    chmod +x $APP_DIR/scripts/update.sh
    
    cd $APP_DIR
    
    # Install dependencies
    print_status "Installing dependencies..."
    
    # Check if we should use pnpm or npm
    if [ -f "pnpm-lock.yaml" ]; then
        # Install pnpm if not present
        if ! command -v pnpm &> /dev/null; then
            print_status "Installing pnpm..."
            sudo npm install -g pnpm
        fi
        print_status "Using pnpm for dependency installation..."
        # Install all dependencies (including dev) for building
        pnpm install
    elif [ -f "package-lock.json" ]; then
        print_status "Using npm for dependency installation..."
        # Install all dependencies (including dev) for building
        npm ci
    else
        print_status "No lock file found, using npm install..."
        npm install
    fi
    
    # Build the application
    print_status "Building application..."
    
    # Use the same package manager for build
    if [ -f "pnpm-lock.yaml" ]; then
        pnpm run build
        # Clean up dev dependencies after build to save space
        print_status "Cleaning up dev dependencies..."
        pnpm prune --prod
    else
        npm run build
        # Clean up dev dependencies after build to save space
        print_status "Cleaning up dev dependencies..."
        npm prune --production
    fi
}

# Handle ARM64 native compilation for better-sqlite3
setup_database_dependencies() {
    print_status "Setting up database dependencies for ARM64..."
    cd $APP_DIR
    
    # Test if better-sqlite3 works
    print_status "Testing database connectivity..."
    if node -e "const Database = require('better-sqlite3'); const db = new Database('./data/finance.db'); console.log('Database connected successfully!'); db.close();" 2>/dev/null; then
        print_status "Database connectivity test passed!"
        return 0
    fi
    
    print_warning "Database connectivity failed. Setting up ARM64 native compilation..."
    
    # Install build tools if not present
    if ! command -v gcc &> /dev/null; then
        print_status "Installing build tools..."
        sudo apt update
        sudo apt install -y build-essential python3 python3-dev
    fi
    
    # Use the same package manager for compilation
    if [ -f "pnpm-lock.yaml" ]; then
        print_status "Compiling better-sqlite3 for ARM64 using pnpm..."
        # Allow build scripts and compile better-sqlite3
        pnpm config set unsafe-perm true
        pnpm approve-builds better-sqlite3
        
        # Wait for compilation with timeout (10 minutes max)
        print_status "Waiting for native compilation to complete (this may take 3-8 minutes)..."
        print_warning "This step may appear to hang - this is normal during ARM64 compilation"
        timeout 600 bash -c 'while ! node -e "const Database = require(\"better-sqlite3\"); const db = new Database(\"./data/finance.db\"); console.log(\"Success!\"); db.close();" 2>/dev/null; do sleep 5; echo -n "."; done' || {
            print_error "Compilation timed out or failed!"
            print_warning "You may need to manually run: pnpm approve-builds better-sqlite3"
            return 1
        }
    else
        print_status "Compiling better-sqlite3 for ARM64 using npm..."
        # Rebuild better-sqlite3 for ARM64
        npm rebuild better-sqlite3 --build-from-source
    fi
    
    # Final test
    print_status "Final database connectivity test..."
    if node -e "const Database = require('better-sqlite3'); const db = new Database('./data/finance.db'); console.log('Database connected successfully!'); db.close();" 2>/dev/null; then
        print_status "✅ Database setup completed successfully!"
        return 0
    else
        print_error "❌ Database setup failed!"
        return 1
    fi
}

# Create environment file
create_env_file() {
    print_status "Creating environment file..."
    
    # Generate session secret
    SESSION_SECRET=$(openssl rand -base64 32)
    
    # Prompt for admin credentials
    echo ""
    print_status "Setting up admin credentials:"
    read -p "Enter admin username (default: admin): " ADMIN_USERNAME
    if [ -z "$ADMIN_USERNAME" ]; then
        ADMIN_USERNAME="admin"
    fi
    
    # Prompt for password with confirmation
    while true; do
        read -s -p "Enter admin password: " ADMIN_PASSWORD
        echo ""
        read -s -p "Confirm admin password: " ADMIN_PASSWORD_CONFIRM
        echo ""
        
        if [ "$ADMIN_PASSWORD" = "$ADMIN_PASSWORD_CONFIRM" ]; then
            if [ ${#ADMIN_PASSWORD} -lt 6 ]; then
                print_warning "Password should be at least 6 characters long. Please try again."
                continue
            fi
            break
        else
            print_warning "Passwords don't match. Please try again."
        fi
    done
    
    cat > $APP_DIR/.env << EOF
# Environment Configuration
DATABASE_URL="file:./data/finance.db"
SESSION_SECRET="$SESSION_SECRET"
ADMIN_USERNAME="$ADMIN_USERNAME"
ADMIN_PASSWORD="$ADMIN_PASSWORD"
ALLOW_REGISTRATION="true"
NODE_ENV="production"
PORT=$PORT
DOMAIN="$DOMAIN"
EOF
    
    print_status "Admin credentials configured:"
    print_status "Username: $ADMIN_USERNAME"
    print_warning "Please save these credentials securely!"
}

# Create PM2 ecosystem file
create_pm2_config() {
    print_status "Creating PM2 configuration..."
    
    # Determine which package manager to use
    if [ -f "$APP_DIR/pnpm-lock.yaml" ]; then
        PKG_MANAGER="pnpm"
    else
        PKG_MANAGER="npm"
    fi
    
    cat > $APP_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: '$PKG_MANAGER',
    args: 'start',
    cwd: '$APP_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: '$APP_DIR/logs/err.log',
    out_file: '$APP_DIR/logs/out.log',
    log_file: '$APP_DIR/logs/combined.log',
    time: true
  }]
};
EOF
    
    # Create logs directory
    mkdir -p $APP_DIR/logs
}

# Configure Nginx reverse proxy
configure_nginx() {
    print_status "Configuring Nginx..."
    sudo tee $NGINX_CONFIG > /dev/null << EOF
# Production Nginx configuration for Finance Tracker with Let's Encrypt
# Copy this to: /etc/nginx/sites-available/finance-tracker

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://\$host\$request_uri;
}

# Catch-all server for unknown hosts (security)
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    server_name _;
    
    # Use snakeoil cert for unknown hosts (fallback)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Return 444 (close connection) for unknown hosts
    return 444;
}

# HTTPS server - Production with Let's Encrypt
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # Let's Encrypt SSL certificates
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;
    
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
        if (\$host !~ ^($(echo "$DOMAIN" | sed 's/\./\\\\./g'))\$) {
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
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}

EOF
    
    # Enable the site
    sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
    
    # Remove default site if it exists
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    sudo nginx -t
    
    # Restart nginx
    sudo systemctl restart nginx
}

# Start the application with PM2
start_application() {
    print_status "Starting application with PM2..."
    cd $APP_DIR
    
    # Stop any existing processes first
    pm2 stop $APP_NAME 2>/dev/null || true
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Start the application
    print_status "Starting application processes..."
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Wait a moment for startup
    sleep 3
    
    # Check if the application started successfully
    if pm2 list | grep -q "$APP_NAME.*online"; then
        print_status "✅ Application started successfully!"
        pm2 status
    else
        print_warning "Application may have startup issues. Checking logs..."
        pm2 logs $APP_NAME --lines 20
        
        print_status "Attempting restart..."
        pm2 restart $APP_NAME
        sleep 3
        
        if pm2 list | grep -q "$APP_NAME.*online"; then
            print_status "✅ Application recovered successfully!"
            pm2 status
        else
            print_error "❌ Application failed to start. Check logs with: pm2 logs $APP_NAME"
            return 1
        fi
    fi
}

# Test final deployment
test_deployment() {
    print_status "Testing final deployment..."
    
    # Test if the app is responding
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_status "Testing HTTP response (attempt $attempt/$max_attempts)..."
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT | grep -q "200\|302"; then
            print_status "✅ Application is responding to HTTP requests!"
            break
        elif [ $attempt -eq $max_attempts ]; then
            print_warning "⚠️  Application may not be fully ready yet"
            print_warning "Check with: pm2 logs $APP_NAME"
        else
            sleep 5
        fi
        ((attempt++))
    done
    
    # Test admin API endpoint
    if curl -s http://localhost:$PORT/api/admin/auth | grep -q "Unauthorized\|401"; then
        print_status "✅ Admin API endpoint is working!"
    else
        print_warning "⚠️  Admin API endpoint may not be ready yet"
    fi
}

# Setup backup script
setup_backup_script() {
    print_status "Setting up backup script..."
    
    # The backup script was already copied during deployment
    # Just need to add it to crontab for daily backups
    (crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/scripts/backup.sh") | crontab -
    
    print_status "Daily backup scheduled at 2 AM"
}


# Setup update script
setup_update_script() {
    print_status "Setting up update script..."
    # The update script was already copied during deployment
    print_status "Update script available at $APP_DIR/scripts/update.sh"
}


# Setup firewall
setup_firewall() {
    print_status "Setting up firewall..."
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
}

# Setup SSL certificates
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    # Get the current script directory (should be in pi folder)
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
    SSL_SCRIPT="$SCRIPT_DIR/setup-ssl.sh"
    
    if [ -f "$SSL_SCRIPT" ]; then
        print_status "Running SSL setup script..."
        echo ""
        print_warning "SSL Setup will now begin. This will:"
        print_warning "1. Install Certbot for Let's Encrypt"
        print_warning "2. Request SSL certificates for $DOMAIN"
        print_warning "3. Configure automatic certificate renewal"
        echo ""
        
        # Ask for confirmation
        read -p "Do you want to set up SSL certificates now? (y/N): " setup_ssl_confirm
        
        if [[ $setup_ssl_confirm =~ ^[Yy]$ ]]; then
            # Make the script executable and run it
            chmod +x "$SSL_SCRIPT"
            
            # Run the SSL setup script with the domain
            if sudo "$SSL_SCRIPT" "$DOMAIN"; then
                print_status "✅ SSL certificates installed successfully!"
                print_status "Your site is now available at: https://$DOMAIN"
            else
                print_warning "⚠️  SSL setup encountered issues."
                print_warning "You can run it manually later with: $SSL_SCRIPT $DOMAIN"
            fi
        else
            print_warning "Skipping SSL setup. You can run it manually later with:"
            print_warning "$SSL_SCRIPT $DOMAIN"
        fi
    else
        print_warning "SSL setup script not found at $SSL_SCRIPT"
        print_warning "SSL setup skipped."
    fi
}

# Main deployment function
main() {
    check_sudo
    prompt_domain
    
    print_status "🍓 Finance Tracker Raspberry Pi Deployment"
    print_status "=========================================="
    
    update_system
    install_nodejs
    install_pm2
    install_nginx
    setup_app_directory
    stop_existing_services
    deploy_app
    create_env_file
    setup_database_dependencies
    create_pm2_config
    configure_nginx
    start_application
    test_deployment
    setup_backup_script
    setup_update_script
    setup_firewall
    setup_ssl
    
    print_status "=========================================="
    print_status "🎉 Deployment completed successfully!"
    print_status "=========================================="
    
    echo ""
    print_status "Your Finance Tracker is now running at:"
    print_status "  Local: http://localhost"
    print_status "  Network: http://$(hostname -I | awk '{print $1}')"
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        print_status "  Internet: https://$DOMAIN (SSL enabled)"
    else
        print_status "  Internet: http://$DOMAIN (SSL not configured)"
        print_warning "  Note: Run the SSL setup for HTTPS: ./pi/setup-ssl.sh $DOMAIN"
    fi
    
    echo ""
    print_status "Admin credentials:"
    print_status "  Username: $(grep ADMIN_USERNAME $APP_DIR/.env | cut -d'=' -f2 | tr -d '"')"
    print_warning "  Password: [Hidden for security - you entered this during setup]"
    
    echo ""
    print_status "Admin panel access:"
    print_status "  Local: http://$(hostname -I | awk '{print $1}')/admin"
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        print_status "  Internet: https://$DOMAIN/admin"
    else
        print_status "  Internet: http://$DOMAIN/admin"
    fi
    
    echo ""
    print_status "Useful commands:"
    print_status "  Check status: pm2 status"
    print_status "  View logs: pm2 logs $APP_NAME"
    print_status "  Restart app: pm2 restart $APP_NAME"
    print_status "  Update app: $APP_DIR/scripts/update.sh"
    print_status "  Manual backup: $APP_DIR/scripts/backup.sh"
    
    echo ""
    print_warning "Remember to:"
    print_warning "1. Keep your admin credentials secure"
    print_warning "2. Update server names in Nginx config for your specific domain/IP if needed"
    print_warning "3. Set up SSL certificate for production use"
}

# Run the deployment
main "$@"
