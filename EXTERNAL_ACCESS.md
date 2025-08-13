# External Access Setup for Raspberry Pi

## Prerequisites
1. **Port Forwarding**: Configure your router to forward port 443 to your Raspberry Pi
2. **Static IP**: Set a static IP for your Raspberry Pi in your router settings
3. **Dynamic DNS** (optional): Use a service like DuckDNS for a domain name

## SSL Certificate Setup

### Option 1: Self-Signed Certificate (Quick Setup)
```bash
# Generate self-signed certificate
chmod +x scripts/generate-ssl.sh
./scripts/generate-ssl.sh
```

### Option 2: Let's Encrypt (Recommended for Production)
```bash
# Install certbot
sudo apt update
sudo apt install certbot

# Generate certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem certs/private-key.pem
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/certificate.pem
sudo chown pi:pi certs/*.pem
```

## Deployment Steps

1. **Build the application**:
```bash
npm run build
```

2. **Set up environment variables**:
```bash
cp .env.example .env.local
# Edit .env.local with your external domain/IP
```

3. **Start with HTTPS**:
```bash
# Using custom HTTPS server
sudo node server.js

# Or using PM2 for process management
sudo npm install -g pm2
sudo pm2 start server.js --name finance-tracker
sudo pm2 startup
sudo pm2 save
```

## Router Configuration
1. Log into your router admin panel
2. Find "Port Forwarding" or "Virtual Server" settings
3. Forward external port 443 to your Pi's IP port 443
4. Save and restart router

## Security Notes
- Use strong passwords for user accounts
- Consider using a VPN instead of direct port forwarding
- Regularly update SSL certificates
- Monitor access logs for suspicious activity

## Troubleshooting
- **Certificate errors**: Browsers will warn about self-signed certificates
- **Connection refused**: Check port forwarding and firewall settings
- **Permission denied**: Run with sudo for port 443 access
