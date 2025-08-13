# Finance Tracker - Raspberry Pi Setup

A modern React-based finance tracker with server-side data persistence, perfect for running on a Raspberry Pi for 24/7 multi-device access.

## Features

- 📊 Income and expense tracking with 12-month rolling view
- 💰 Bank balance management
- 📈 Financial analytics and summaries
- 📱 Mobile-responsive design
- 🔐 User authentication
- 💾 SQLite database for reliable data persistence
- 🌐 Multi-device access over local network

## Raspberry Pi Setup

### Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18 or higher)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Installation

1. **Clone/Download the project** to your Raspberry Pi
2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Initialize the database:**
   ```bash
   # The database will be created automatically on first run
   # Demo data will be seeded for testing
   ```

4. **Start the application:**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

### Network Access Configuration

#### Option 1: Local Network Access (Recommended)

1. **Find your Raspberry Pi's IP address:**
   ```bash
   hostname -I
   ```

2. **Start the server on all interfaces:**
   ```bash
   # Edit package.json or use:
   npm run dev -- -H 0.0.0.0
   ```

3. **Access from any device on your network:**
   - From your phone: `http://192.168.1.XXX:3000`
   - From your laptop: `http://192.168.1.XXX:3000`
   - Replace `XXX` with your Pi's actual IP

#### Option 2: PM2 for 24/7 Operation

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

### Firewall Configuration

```bash
# Allow port 3000 through firewall
sudo ufw allow 3000

# Check firewall status
sudo ufw status
```

## Usage

### Default Credentials
- **Username:** `demo`
- **Password:** `demo`

### Multi-Device Testing

1. **Start the server** on your Raspberry Pi
2. **Find the Pi's IP address** using `hostname -I`
3. **Access from multiple devices:**
   - Phone browser: `http://[PI_IP]:3000`
   - Laptop browser: `http://[PI_IP]:3000`
   - Tablet browser: `http://[PI_IP]:3000`

4. **Test data synchronization:**
   - Add an expense on your phone
   - Check that it appears on your laptop
   - Verify bank balance updates across devices

### Database Location

- **Database file:** `./data/finance.db`
- **Backup location:** Create regular backups of this file
- **Data export:** Use the built-in export feature in the app

## Troubleshooting

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
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── login/          # Login page
│   ├── summary/        # Summary page
│   └── page.tsx        # Main dashboard
├── components/         # React components
├── hooks/             # Custom React hooks
├── lib/               # Database utilities
├── scripts/           # Database scripts
└── data/              # SQLite database (created at runtime)
```

### API Endpoints

- `POST /api/auth/login` - User authentication
- `GET/POST /api/bank-amount` - Bank balance management
- `GET/POST /api/entries` - Income/expense entries
- `GET /api/data/export` - Data export

## Security Notes

- Change default credentials in production
- Consider setting up HTTPS for external access
- Regular database backups recommended
- Keep the system updated
