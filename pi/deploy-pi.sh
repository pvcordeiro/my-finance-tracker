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
DOMAIN="your-domain.com"  # Change this to your domain or use IP
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
    
    # Remove existing app directory to prevent conflicts
    if [ -d "$APP_DIR" ]; then
        print_status "Removing existing application directory..."
        sudo rm -rf $APP_DIR
    fi
    
    # Create fresh app directory
    mkdir -p $APP_DIR
    
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

# Create environment file
create_env_file() {
    print_status "Creating environment file..."
    cat > $APP_DIR/.env << EOF
# Environment Configuration
DATABASE_URL="file:./data/finance.db"
SESSION_SECRET="$(openssl rand -base64 32)"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="$(openssl rand -base64 12)"
ALLOW_REGISTRATION="true"
NODE_ENV="production"
PORT=$PORT
EOF
    
    print_warning "Admin credentials created:"
    print_warning "Username: admin"
    print_warning "Password: $(grep ADMIN_PASSWORD $APP_DIR/.env | cut -d'=' -f2 | tr -d '"')"
    print_warning "Please save these credentials and change them after first login!"
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
server {
    listen 80;
    server_name $DOMAIN $(hostname -I | awk '{print $1}');
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
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
        proxy_pass http://localhost:$PORT;
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
    }
    
    # Static file caching
    location /_next/static {
        proxy_pass http://localhost:$PORT;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Favicon
    location /favicon.ico {
        proxy_pass http://localhost:$PORT;
        proxy_cache_valid 200 1d;
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
    
    # Start the application
    pm2 start ecosystem.config.js --instances 2
    
    # Save PM2 configuration
    pm2 save
    
    # Show status
    pm2 status
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

# Main deployment function
main() {
    check_sudo
    
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
    create_pm2_config
    configure_nginx
    start_application
    setup_backup_script
    setup_update_script
    setup_firewall
    
    print_status "=========================================="
    print_status "🎉 Deployment completed successfully!"
    print_status "=========================================="
    
    echo ""
    print_status "Your Finance Tracker is now running at:"
    print_status "  Local: http://localhost"
    print_status "  Network: http://$(hostname -I | awk '{print $1}')"
    
    echo ""
    print_status "Admin credentials:"
    print_status "  Username: admin"
    print_status "  Password: $(grep ADMIN_PASSWORD $APP_DIR/.env | cut -d'=' -f2 | tr -d '"')"
    
    echo ""
    print_status "Useful commands:"
    print_status "  Check status: pm2 status"
    print_status "  View logs: pm2 logs $APP_NAME"
    print_status "  Restart app: pm2 restart $APP_NAME"
    print_status "  Update app: $APP_DIR/scripts/update.sh"
    print_status "  Manual backup: $APP_DIR/scripts/backup.sh"
    
    echo ""
    print_warning "Remember to:"
    print_warning "1. Change the admin password after first login"
    print_warning "2. Update the domain name in Nginx config if needed"
    print_warning "3. Set up SSL certificate for production use"
}

# Run the deployment
main "$@"
EOF
