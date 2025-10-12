# 💸 My Finance Tracker

A modern, full-featured finance tracker built with Next.js 15 and React 19, designed for privacy, multi-device access, and easy self-hosting. Includes a comprehensive admin panel, group management, session-based authentication, and a beautiful, mobile-friendly UI powered by Bun runtime.

## Features

### Core Finance Features

- 📊 Track income & expenses with 12-month rolling view
- 💰 Manage and track bank balances with history
- 📈 Visual analytics with interactive charts and summaries
- 📅 Monthly and yearly financial summaries
- 🔄 Real-time data sync with Server-Sent Events (SSE)
- 📤 Data import/export (JSON)
- 📝 Detailed transaction history

### User Experience

- 🎨 Modern, responsive UI (Tailwind CSS, Radix UI, shadcn/ui)
- 🌓 Dark/Light/System theme support with persistence
- 🎨 Customizable accent colors (Blue, Purple, Yellow, Orange, Pink, Magenta, Cyan)
- 👁️ Privacy mode to hide sensitive financial data
- 📱 Mobile-optimized interface with bottom navigation
- 🖥️ Multi-device access (desktop, mobile, tablet)
- ⚡ Built with Bun for fast performance

### Authentication & Security

- 🔐 Secure session-based authentication
- 👥 User registration system (can be toggled on/off)
- 🔄 Multi-session management - view and revoke active sessions
- 🔒 Change username and password functionality
- ⏱️ Session expiration and automatic cleanup

### Multi-User & Group Management

- 👥 Multiple user support with individual accounts
- 🏢 Group/household support - multiple users can share financial data
- 🔄 Easy group switching for users in multiple groups
- 👤 User-to-group assignment management
- � Per-user preferences (theme, accent color, privacy mode)

### Admin Panel

- 🛡️ Comprehensive admin dashboard
- 👥 User management (view, delete, promote to admin)
- � Group management (create, rename, delete)
- 👤 User-to-group assignment control
- ⚙️ System settings configuration
- 🔐 Toggle registration on/off
- 📊 View user and group statistics
- 🎯 Admin password changes

### Technical Features

- � SQLite database for reliable, local data persistence
- ⚡ Bun runtime for fast performance
- 🐳 Docker support with compose configuration
- 🚀 Server-Sent Events for real-time updates
- 📡 REST API with comprehensive endpoints
- 🔄 Automatic session cleanup
- 🛡️ Rate limiting for security

# 🚀 Quick Start

## Install docker and run this

```bash
docker run -d \
  --name my-finance-tracker \
  -p 4242:3000 \
  -v ~/finance-data:/app/data \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=changeme \
  pvcordeiro/my-finance-tracker:latest
```

Visit: http://localhost:4242

## Or run in docker compose (recomended)

```bash
# Create directory
mkdir ~/finance-tracker && cd ~/finance-tracker
```

```bash
# Create docker-compose.yml
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
# Start
docker-compose up -d
```

## Common Commands

```bash
# View logs
docker-compose logs -f

# Update to latest
docker-compose pull && docker-compose up -d

# Stop
docker-compose down
```

# 🖥️ Local Development

### Setup

```bash
# Install dependencies
bun install

# Create .env file
cp .env.example .env

# Run development server
bun run dev
```

The app will be available at [http://localhost:4242](http://localhost:4242).

### Build for Production

```bash
# Build the application
bun run build

# Start production server
bun run start
```

## Usage

### First Time Setup

1. On first run, the admin account is automatically created using credentials from `.env`
2. Create groups for organizing finances (e.g., "Personal", "Family", "Business")
3. Create user accounts or enable registration for users to sign up
4. Assign users to groups as needed

### Authentication

- **Registration:** Can be enabled/disabled by admin in the settings panel
- **Session management:** View and revoke active sessions in user settings
- **Password changes:** Users can change their password and username in settings

### Group Management

- **Multiple groups:** Support for households, families, or separate budgets
- **Group switching:** Easily switch between groups if you're a member of multiple
- **Shared finances:** Users in the same group see the same financial data
- **Admin controls:** Admins can create, rename, and delete groups
- **User assignment:** Admins can add or remove users from groups

### User Preferences

- **Themes:** Choose between Light, Dark, or System theme (syncs across devices)
- **Accent colors:** Customize the UI with 7 different accent colors
- **Privacy mode:** Toggle to hide sensitive financial numbers
- **Session management:** View all active sessions and revoke access from other devices

### Finance Tracking

- **Add entries:** Record income and expenses with custom names and amounts
- **Current balance:** Track and update your current balance
- **Balance history:** View historical balance changes over time
- **Monthly summaries:** See monthly income, expenses, and net changes
- **Visual charts:** Interactive charts showing financial trends
- **Data export:** Backup all your financial data as JSON
- **Data import:** Restore all your financial data from a JSON file
- **Wipe data:** This will wipe all your financial data!!!

### Multi-Device

- Access from any browser/device on your network or the internet(if exposed)
- All preferences and settings sync automatically
- Real-time updates when data changes

## Admin Panel

The admin panel provides comprehensive system management:

### Users Management

- View all registered users
- Delete user accounts
- Promote users to admin status
- View user creation dates and group memberships

### Groups Management

- Create new groups for organizing finances
- Rename existing groups
- Delete groups (removes all associated financial data)
- View group member counts and creation dates

### User-Group Assignments

- Assign users to specific groups
- Remove users from groups
- Manage access control

### Settings

- Toggle user registration on/off
- Toggle transaction history on/off

### Security

- Change admin password
- View admin account details

### Common Issues

1. **Cannot access from other devices:**

   - Ensure the server is running and accessible on your network
   - Check firewall settings on the host machine
   - Verify devices are on the same network (or use proper port forwarding)
   - Docker exposes port 4242 by default (maps to internal port 3000)

2. **Database errors:**

   - Check file permissions in the `data/` directory
   - Verify the database file isn't corrupted (restore from backup)

3. **Performance on Raspberry Pi or low-spec devices:**

   - Use Raspberry Pi 3 or newer for best performance
   - Use a fast SD card (Class 10 or better) or USB SSD
   - Monitor CPU and memory usage with `htop`
   - Consider limiting concurrent sessions

4. **Session issues:**

   - Clear browser cookies if experiencing login problems
   - Revoke old sessions from user settings if needed

### Performance Optimization

```bash
# Monitor system resources
htop

# Check Docker container logs
docker logs <container_name>
```

## Development

### Tech Stack

- **Runtime:** Bun v1.0+
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** SQLite3
- **Authentication:** Session-based with cookies
- **Real-time:** Server-Sent Events (SSE)
- **Form Validation:** React Hook Form + Zod
- **Charts:** Recharts
- **Icons:** Lucide React

### API Endpoints

#### Authentication

- `POST /api/auth/login` — User login
- `POST /api/auth/logout` — User logout
- `POST /api/auth/register` — User registration (if enabled)
- `GET /api/auth/session` — Get current session
- `GET /api/auth/registration-status` — Check if registration is enabled
- `POST /api/auth/change-password` — Change user password
- `POST /api/auth/change-username` — Change username

#### Finance Data

- `GET /api/entries` — Get all entries for current group
- `POST /api/entries` — Create/update entries (bulk operations)
- `GET /api/entries/stream` — SSE endpoint for real-time updates
- `GET /api/bank-amount` — Get current bank balance
- `POST /api/bank-amount` — Update bank balance
- `GET /api/bank-amount/stream` — SSE for balance updates
- `GET /api/balance-history` — Get balance history data
- `GET /api/data/export` — Export all data as JSON

#### User Settings

- `GET /api/user/sessions` — Get all active sessions
- `DELETE /api/user/sessions` — Revoke a session
- `POST /api/user/theme` — Update theme preference
- `POST /api/user/accent-color` — Update accent color
- `POST /api/user/privacy-mode` — Toggle privacy mode

#### Groups

- `POST /api/switch-group` — Switch active group

#### Admin Panel

- `GET /api/admin/users` — Get all users
- `DELETE /api/admin/users` — Delete a user
- `PATCH /api/admin/users` — Update user (promote to admin)
- `GET /api/admin/groups` — Get all groups
- `POST /api/admin/groups` — Create a group
- `PATCH /api/admin/groups` — Rename a group
- `DELETE /api/admin/groups` — Delete a group
- `GET /api/admin/user-groups` — Get user-group assignments
- `POST /api/admin/user-groups` — Assign user to group
- `DELETE /api/admin/user-groups` — Remove user from group
- `GET /api/admin/settings` — Get system settings
- `POST /api/admin/settings` — Update system settings

### Database Schema

The SQLite database includes the following main tables:

- **users:** User accounts and authentication
- **sessions:** Active user sessions
- **groups:** Financial groups/households
- **user_groups:** User-to-group assignments
- **entries:** Income and expense transactions
- **entry_amounts:** Monthly amounts for each entry
- **bank_amounts:** Bank balance records
- **balance_history:** Historical balance tracking
- **settings:** System-wide settings

## Security Notes

- **Password hashing:** bcrypt for password storage
- **Registration control:** Can be disabled to prevent unauthorized signups
- **Session management:** Users can view and revoke active sessions
- **Rate limiting:** API endpoints protected against abuse
- **HTTPS recommended:** Use reverse proxy (Cloudflare, nginx) for production
- **Regular backups:** Database backups recommended for data safety
- **Environment variables:** Sensitive data stored in `.env` file

## Deployment Options

### Docker (Recommended)

The easiest way to deploy with Docker Compose (see Quick Start section above).

### Raspberry Pi

The application runs well on Raspberry Pi 4 or newer:

1. Install Docker and Docker Compose on your Pi
2. Follow the Docker setup instructions
3. Use a quality SD card or USB SSD for better performance
4. Consider setting up automatic backups

### VPS/Cloud Server

Deploy on any VPS or cloud provider:

1. Install Docker or Bun runtime
2. Clone the repository
3. Configure environment variables
4. Use a reverse proxy (nginx, Caddy) for HTTPS
5. Set up automatic backups and monitoring

### Custom Domain with HTTPS

For secure external access:

**Option 1: Cloudflare (Easiest)**

- Create a cloudflare tunnel at server and point it to your domain at cloudflare

**Option 2: Let's Encrypt + nginx**

```bash
# Example nginx reverse proxy configuration
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:4242;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Guidelines

1. Follow the existing code style
2. Test your changes thoroughly
3. Update documentation as needed
4. Ensure all TypeScript types are properly defined
5. Test on both mobile and desktop viewports

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
