# Another Personal Finance Tracker

A modern, full-featured finance tracker built with Next.js 15 and React 19, designed for privacy, multi-device access, and easy self-hosting. Includes a secure admin panel, session-based authentication, and a beautiful, mobile-friendly UI.

https://github.com/user-attachments/assets/e50001ff-c556-4d54-b0f6-ba4243d4c7bf

## Features

- 📊 Track income & expenses with 12-month rolling view
- 💰 Manage bank balances
- 📈 Visual analytics, summaries, and charts
- �️ Data import/export (JSON)
- 🔐 Secure session-based authentication
- � Admin panel: manage users, toggle registration, view activity
- 💾 SQLite database for reliable, local data persistence
- 🌐 Multi-device access (desktop, mobile, tablet)
- 🎨 Modern, responsive UI (Tailwind CSS, Radix UI)
- 🕹️ Easy deployment: Raspberry Pi, Linux, or any Node.js server

## Quick Start (Docker)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed

### 1. Clone/download this repo

### 2. Copy `.env.example` into `.env` file and change your admin credentials, secrets, etc:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=yourpassword
SESSION_SECRET=yourrandomsecret
# DATABASE_URL, DOMAIN, etc. can also be set if needed
```

### 3. Start everything with Docker Compose:

```bash
docker compose up --build -d
```

The app will be available at [http://localhost](http://localhost) (or your server's IP).

The SQLite database will be created at `data/finance.db` on first run and persisted on your host.

### 4. (Optional) Domain + HTTPS with Cloudflare

For production deployment with a custom domain and HTTPS, use Cloudflare as your reverse proxy:

1. Point your domain to your server's IP in Cloudflare DNS
2. Enable Cloudflare proxying for automatic SSL
3. The app will be accessible at `https://yourdomain.com`

## Usage

### Authentication

- **User login:** Register or sign in with a username and password
- **Admin login:** Go to `/admin` for admin panel (credentials set at first deploy)
- **Registration:** Can be enabled/disabled by admin in the panel

### Multi-Device

- Access from any browser/device on your network
- All data is synced in real time

### Data & Backups

- **Database:** `data/finance.db` (SQLite, local only)
- **Export:** Download your data as JSON from the app
- **Backup:** Copy the `data/finance.db` file or use provided scripts

## Admin Panel

- Manage users (view, delete)
- Toggle registration (allow/disable new signups)
- View user activity
- Change admin password

### Common Issues

1. **Cannot access from other devices:**

   - Ensure the server is running on `0.0.0.0:80`
   - Check firewall settings
   - Verify devices are on the same network

2. **Database errors:**

   - Check file permissions in the `data/` directory
   - Ensure SQLite is properly installed

3. **Performance on Raspberry Pi:**
   - Use Raspberry Pi 4 for best performance
   - Consider using a fast SD card (Class 10 or better)
   - Monitor CPU and memory usage with `htop`

### Performance Optimization

```bash
# Increase Node.js memory limit if needed
export NODE_OPTIONS="--max-old-space-size=512"

# Monitor system resources
htop
```

## Development

### Project Structure

```
app/         # Next.js 15 app directory (API, pages, admin, etc)
components/  # UI and feature components (finance, admin, auth, ui)
hooks/       # Custom React hooks
lib/         # Database/session/auth logic
data/        # SQLite database (created at runtime)
scripts/     # DB scripts/utilities
pi/          # Raspberry Pi deployment scripts & configs
```

### API Endpoints (selected)

- `POST /api/auth/login` — User login
- `POST /api/auth/register` — User registration
- `GET/POST /api/bank-amount` — Bank balance
- `GET/POST /api/entries` — Income/expense entries
- `GET /api/data/export` — Data export
- `GET/POST /api/admin/*` — Admin panel endpoints

## Security Notes

- Session-based authentication
- HTTP-only cookies for all sessions
- Admin panel protected by separate login
- Registration can be disabled for closed systems
- HTTPS recommended for external access
- Regular database backups recommended
- Keep your system and dependencies updated
