# Finance Tracker - Raspberry Pi Deployment Guide

This guide will help you deploy your Finance Tracker application to a Raspberry Pi and set it up to run 24/7 in the background.

## Prerequisites

- Raspberry Pi running Raspberry Pi OS (Debian-based)
- SSH access to your Pi
- Basic terminal knowledge

## Quick Deployment

1. **Copy files to your Raspberry Pi:**
   ```bash
   # From your local machine, copy the project to your Pi
   scp -r . pi@your-pi-ip:/home/pi/finance-tracker-deploy/
   ```

2. **SSH into your Raspberry Pi:**
   ```bash
   ssh pi@your-pi-ip
   ```

3. **Run the deployment script:**
   ```bash
   cd /home/pi/finance-tracker-deploy
   chmod +x deploy-pi.sh
   ./deploy-pi.sh
   ```

## What the Script Does

### 🔧 System Setup
- Updates system packages
- Installs Node.js 20.x
- Installs PM2 for process management
- Installs and configures Nginx as reverse proxy

### 📱 Application Deployment
- Creates application directory at `/home/pi/finance-tracker`
- Installs dependencies and builds the application
- Creates production environment configuration
- Sets up database directory with proper permissions

### 🔄 24/7 Background Service
- Configures PM2 to manage the application process
- Sets up automatic restart on crashes
- Configures PM2 to start on system boot
- Creates logs directory for monitoring

### 🌐 Web Server Configuration
- Configures Nginx reverse proxy
- Enables gzip compression
- Sets up security headers
- Configures static file caching

### 🔒 Security & Maintenance
- Sets up UFW firewall
- Creates automatic daily database backups
- Provides update script for future deployments
- Generates secure admin credentials

## Post-Deployment

### Access Your Application
- **Local**: `http://localhost`
- **Network**: `http://your-pi-ip`
- **Admin Panel**: `http://your-pi-ip/admin`

### Important First Steps
1. **Save admin credentials** (displayed after deployment)
2. **Change admin password** after first login
3. **Test the application** by creating a user account

### Management Commands

```bash
# Check application status
pm2 status

# View application logs
pm2 logs finance-tracker

# Restart application
pm2 restart finance-tracker

# Stop application
pm2 stop finance-tracker

# View detailed logs
pm2 logs finance-tracker --lines 100

# Monitor in real-time
pm2 monit
```

### Database Management

```bash
# Manual backup
/home/pi/finance-tracker/backup.sh

# View backup files
ls -la /home/pi/finance-tracker-backups/

# Check database size
du -h /home/pi/finance-tracker/data/finance.db
```

### Application Updates

```bash
# Quick update (if you make changes)
/home/pi/finance-tracker/update.sh
```

## Directory Structure

```
/home/pi/finance-tracker/
├── data/                   # SQLite database
├── logs/                   # Application logs
├── backup.sh              # Backup script
├── update.sh              # Update script
├── ecosystem.config.js     # PM2 configuration
├── .env                   # Environment variables
└── [application files]
```

## Monitoring & Logs

### Application Logs
```bash
# Real-time logs
pm2 logs finance-tracker --lines 0

# Error logs only
pm2 logs finance-tracker --err

# Output logs only
pm2 logs finance-tracker --out
```

### System Logs
```bash
# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
```

### Performance Monitoring
```bash
# PM2 monitoring dashboard
pm2 monit

# System resources
htop

# Disk usage
df -h
```

## Troubleshooting

### Application Won't Start
```bash
# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs finance-tracker

# Restart PM2
pm2 restart finance-tracker
```

### Database Issues
```bash
# Check database permissions
ls -la /home/pi/finance-tracker/data/

# Test database connection
sqlite3 /home/pi/finance-tracker/data/finance.db ".tables"
```

### Nginx Issues
```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx
```

### Network Issues
```bash
# Check if application is listening
netstat -tulpn | grep :3000

# Test local connection
curl http://localhost:3000

# Check firewall
sudo ufw status
```

## Backup & Recovery

### Automatic Backups
- Daily backups at 2 AM (configured in crontab)
- Keeps 7 days of backups
- Stored in `/home/pi/finance-tracker-backups/`

### Manual Backup
```bash
# Create immediate backup
/home/pi/finance-tracker/backup.sh

# Copy backup to external location
scp /home/pi/finance-tracker-backups/finance_backup_*.db user@backup-server:/path/
```

### Restore from Backup
```bash
# Stop application
pm2 stop finance-tracker

# Replace database
cp /home/pi/finance-tracker-backups/finance_backup_YYYYMMDD_HHMMSS.db /home/pi/finance-tracker/data/finance.db

# Start application
pm2 start finance-tracker
```

## SSL/HTTPS Setup (Optional)

For production use with a domain name:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already configured)
sudo systemctl status certbot.timer
```

## Performance Optimization

### Raspberry Pi 4
- Default configuration should work well
- Monitor memory usage with `pm2 monit`

### Raspberry Pi 3 or older
- Reduce PM2 max memory restart to 250M
- Consider using PM2 cluster mode for better performance:
  ```bash
  pm2 delete finance-tracker
  pm2 start ecosystem.config.js --instances 2
  ```

## Updating the Application

1. **From your development machine:**
   ```bash
   # Copy updated files
   scp -r . pi@your-pi-ip:/home/pi/finance-tracker-temp/
   ```

2. **On your Raspberry Pi:**
   ```bash
   # Run update script
   cd /home/pi/finance-tracker-temp
   chmod +x deploy-pi.sh
   ./deploy-pi.sh
   ```

## Support & Maintenance

### Regular Maintenance Tasks
- Check logs weekly: `pm2 logs finance-tracker`
- Monitor disk space: `df -h`
- Update system monthly: `sudo apt update && sudo apt upgrade`
- Verify backups: `ls -la /home/pi/finance-tracker-backups/`

### Performance Monitoring
- Use `pm2 monit` for real-time monitoring
- Check memory usage with `htop`
- Monitor database size growth

The application will now run 24/7 in the background and automatically restart if the Pi reboots or if the application crashes!
