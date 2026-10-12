# My Finance Tracker - Docker Image

A modern, self-hosted personal finance tracker built with Next.js 15, React 19, and Bun runtime. Track income, expenses, and bank balances with a beautiful mobile-friendly interface.

## 🚀 Quick Start

### Single Command Setup

```bash
docker run -d \
  --name my-finance-tracker \
  --restart unless-stopped \
  -p 4242:3000 \
  -v ~/finance-data:/app/data \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=changeme \
  pvcordeiro/my-finance-tracker:latest
```

Visit: http://localhost:4242

### Recommended: Docker Compose

```yaml
services:
  my-finance-tracker:
    image: pvcordeiro/my-finance-tracker:latest
    ports:
      - "4242:3000"
    volumes:
      - ./finance-data:/app/data
    environment:
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=changeme
    restart: unless-stopped
```

```bash
docker-compose up -d
```

## 📋 Key Features

- 📊 **Financial Tracking** - Income, expenses, bank balances with 12-month rolling view
- 📈 **Visual Analytics** - Interactive charts and monthly/yearly summaries
- 👥 **Multi-User** - Individual accounts with group/household support
- 🔐 **Secure Auth** - Session-based authentication with multi-session management
- 🛡️ **Admin Panel** - User, group, and system settings management
- 🌓 **Themes** - Dark/Light/System with customizable accent colors
- 👁️ **Privacy Mode** - Hide sensitive financial data
- 📱 **Mobile-Friendly** - Optimized responsive interface
- ⚡ **Fast** - Built with Bun runtime for excellent performance
- 🔄 **Real-time** - Server-Sent Events for live data updates

## 🔧 Configuration

### Environment Variables

| Variable                 | Default    | Description                                                |
| ------------------------ | ---------- | ---------------------------------------------------------- |
| `ADMIN_USERNAME`         | `admin`    | Initial admin username                                     |
| `ADMIN_PASSWORD`         | `changeme` | Initial admin password (change immediately!)               |
| `ALLOW_REGISTRATION`     | `false`    | Allow new user registration (enable only while inviting users) |
| `ENABLE_BALANCE_HISTORY` | `true`     | Enable transaction history display                         |
| `APP_URL`                | —          | Public HTTPS origin used in verification/reset links       |
| `BREVO_SMTP_HOST`        | Brevo host | SMTP relay host                                             |
| `BREVO_SMTP_PORT`        | `587`      | SMTP port                                                   |
| `BREVO_SMTP_USER`        | —          | Brevo SMTP login                                            |
| `BREVO_SMTP_KEY`         | —          | Brevo SMTP key (not the Brevo API key)                      |
| `EMAIL_FROM`             | —          | Verified sender name and address                            |

### Volumes

- `/app/data` - SQLite database and persistent data storage

## 💾 Data Management

### Backup

```bash
# Create backup
docker-compose exec finance-tracker tar -czf /app/data/backup.tar.gz -C /app/data finance.db

# Copy to host
docker cp finance-tracker:/app/data/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz
```

Or simply backup your mounted volume:

```bash
tar -czf backup-$(date +%Y%m%d).tar.gz finance-data/
```

### Restore

```bash
# Stop container
docker-compose down

# Restore data
tar -xzf backup.tar.gz

# Start container
docker-compose up -d
```

## 🔒 Security Best Practices

1. **Change Default Password** - Immediately change the default admin password after first login
2. **Disable Registration** - Go into admin panel and disable account creation after creating the necessary accounts
3. **Regular Backups** - Schedule regular backups of your data volume
4. **Keep Updated** - Pull latest image regularly for security updates
5. **Keep SMTP secrets private** - Add Brevo SMTP values to `.env` on the host and never commit them
6. **Configure your proxy** - Use HTTPS and configure the reverse proxy to replace forwarded IP headers rather than append or trust client-supplied values

## 📦 Available Tags

- `latest` - Latest stable release
- `main` - Latest build from main branch
- `main-<commit>` - Specific commit builds
- `v<version>` - Specific version releases

## 🐳 Common Commands

```bash
# View logs
docker-compose logs -f

# Update to latest
docker-compose pull && docker-compose up -d

# Stop
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v

# View container stats
docker stats finance-tracker

# Access container shell
docker-compose exec finance-tracker sh
```

## 🏗️ Architecture

- **Runtime:** Bun (fast JavaScript runtime)
- **Framework:** Next.js 15 with React 19
- **Database:** SQLite (embedded, no external DB needed)
- **UI:** Tailwind CSS, Radix UI, shadcn/ui
- **Real-time:** Server-Sent Events (SSE)
- **Ports:** External 4242 → Internal 3000 (configurable)

## 🔍 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs finance-tracker

# Verify volume permissions
ls -la finance-data/
```

### Cannot access application

- Ensure port 4242 is not in use: `lsof -i :4242`
- Check firewall settings
- Verify container is running: `docker ps`

### Data not persisting

- Confirm volume is correctly mounted
- Check file permissions in mounted directory
