#!/bin/bash

# Finance Tracker Deployment Script for Raspberry Pi
# This script will deploy the application and set it up to run 24/7

set -e

echo "🚀 Starting deployment of Finance Tracker..."

# Configuration
APP_NAME="finance-tracker"
APP_DIR="/home/pi/finance-tracker"
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
        sudo pm2 startup systemd -u pi --hp /home/pi
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
    sudo mkdir -p $APP_DIR
    sudo chown -R pi:pi $APP_DIR
    
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
    
    # Copy all files except node_modules and .git
    rsync -av --exclude 'node_modules' --exclude '.git' --exclude '.next' --exclude 'data/finance.db*' ./ $APP_DIR/
    
    cd $APP_DIR
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm ci --production
    
    # Build the application
    print_status "Building application..."
    npm run build
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
    cat > $APP_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'npm',
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
    gzip_proxied expired no-cache no-store private must-revalidate;
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
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Show status
    pm2 status
}

# Create backup script
create_backup_script() {
    print_status "Creating backup script..."
    cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash

# Finance Tracker Backup Script
BACKUP_DIR="/home/pi/finance-tracker-backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/home/pi/finance-tracker"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp $APP_DIR/data/finance.db $BACKUP_DIR/finance_backup_$DATE.db

# Keep only last 7 days of backups
find $BACKUP_DIR -name "finance_backup_*.db" -mtime +7 -delete

echo "Backup completed: finance_backup_$DATE.db"
EOF
    
    chmod +x $APP_DIR/backup.sh
    
    # Add to crontab for daily backups
    (crontab -l 2>/dev/null; echo "0 2 * * * /home/pi/finance-tracker/backup.sh") | crontab -
}

# Create update script
create_update_script() {
    print_status "Creating update script..."
    cat > $APP_DIR/update.sh << 'EOF'
#!/bin/bash

# Finance Tracker Update Script
APP_DIR="/home/pi/finance-tracker"
APP_NAME="finance-tracker"

cd $APP_DIR

echo "🔄 Updating Finance Tracker..."

# Pull latest changes (if using git)
# git pull origin main

# Install any new dependencies
npm ci --production

# Build the application
npm run build

# Restart the application
pm2 restart $APP_NAME

echo "✅ Update completed!"
pm2 status
EOF
    
    chmod +x $APP_DIR/update.sh
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
    create_backup_script
    create_update_script
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
    print_status "  Update app: $APP_DIR/update.sh"
    print_status "  Manual backup: $APP_DIR/backup.sh"
    
    echo ""
    print_warning "Remember to:"
    print_warning "1. Change the admin password after first login"
    print_warning "2. Update the domain name in Nginx config if needed"
    print_warning "3. Set up SSL certificate for production use"
}

# Run the deployment
main "$@"
EOF
