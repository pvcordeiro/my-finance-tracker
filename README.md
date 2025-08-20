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

## Quick Start (Raspberry Pi or Linux)

### Prerequisites

```bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18+ recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Installation

1. **Clone/download this repo**
2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps # or pnpm install
   ```
3. **Start the app:**

   ```bash
   # Development
   npm run dev -- -H 0.0.0.0

   # Production
   npm run build
   npm start
   ```

   The SQLite database will be created at `data/finance.db` on first run.

### Network Access

1. **Find your device's IP:**
   ```bash
   hostname -I
   ```
2. **Access from any device on your network:**
   - `http://[YOUR_PI_IP]:3000`

#### (Optional) PM2 for 24/7 Operation

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
pm2 start npm --name "finance-tracker" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

### Firewall (Optional)

```bash
# Allow port 3000 through firewall
sudo ufw allow 3000

# Check firewall status
sudo ufw status
```

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

   - Ensure the server is running on `0.0.0.0:3000`
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
- HTTPS recommended for external access (see `pi/DEPLOYMENT.md`)
- Regular database backups recommended
- Keep your system and dependencies updated
