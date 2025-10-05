# Another Personal Finance Tracker

A modern, full-featured finance tracker built with Next.js 15 and React 19, designed for privacy, multi-device access, and easy self-hosting. Includes a comprehensive admin panel, group management, session-based authentication, and a beautiful, mobile-friendly UI powered by Bun runtime.

Desktop:

https://github.com/user-attachments/assets/58fc4ffb-19ae-4f61-9a5f-354d4595db1f

Mobile:

https://github.com/user-attachments/assets/a30efb78-74b5-45bb-b922-e2aa8f7005f7

## Features

### Core Finance Features

- 📊 Track income & expenses with 12-month rolling view
- 💰 Manage and track bank balances with history
- 📈 Visual analytics with interactive charts and summaries
- 📅 Monthly and yearly financial summaries
- 🔄 Real-time data sync with Server-Sent Events (SSE)
- 📤 Data import/export (JSON)
- � Detailed transaction history and editing

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

## Quick Start (Docker)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed
- [Bun](https://bun.sh) (included in Docker image)

### 1. Clone/download this repo

### 2. Copy `.env.example` to `.env` and configure your settings:

```bash
# Admin Configuration (IMPORTANT: Change these!)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="yourpassword"

# Features
ALLOW_REGISTRATION="true"  # Set to "false" to disable user registration

# Production Settings
NODE_ENV="production"
```

### 3. Start with Docker Compose:

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

## Local Development

### Prerequisites

- [Bun](https://bun.sh) v1.0 or higher

### Setup

```bash
# Install dependencies
bun install

# Create .env file
cp .env.example .env

# Run development server
bun run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

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
2. Log in to the admin panel at `/admin` with your admin credentials
3. Create groups for organizing finances (e.g., "Personal", "Family", "Business")
4. Create user accounts or enable registration for users to sign up
5. Assign users to groups as needed

### Authentication

- **User login:** Register (if enabled) or sign in at `/login` with username and password
- **Admin login:** Access the admin panel at `/admin` (separate from user login)
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
- **Bank balance:** Track and update your current bank balance
- **Balance history:** View historical balance changes over time
- **Monthly summaries:** See monthly income, expenses, and net changes
- **Visual charts:** Interactive charts showing financial trends
- **Data export:** Download all your financial data as JSON
- **Data import:** Bulk upload entries from JSON files

### Multi-Device

- Access from any browser/device on your network or the internet
- All preferences and settings sync automatically
- Real-time updates when data changes
- Session management to control device access

### Data & Backups

- **Database:** `data/finance.db` (SQLite, local persistence)
- **Export:** Download your data as JSON from the app's data management section
- **Import:** Upload JSON files to restore or bulk-add entries
- **Backup:** Copy the `data/finance.db` file regularly for backups
- **Docker volumes:** Database is automatically persisted in Docker setup

## Admin Panel

The admin panel (`/admin`) provides comprehensive system management:

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
- View all user-group relationships
- Manage access control

### Settings

- Toggle user registration on/off
- Configure system-wide settings
- View system statistics

### Security

- Change admin password
- View admin account details
- Admin-only access with separate authentication

### Common Issues

1. **Cannot access from other devices:**

   - Ensure the server is running and accessible on your network
   - Check firewall settings on the host machine
   - Verify devices are on the same network (or use proper port forwarding)
   - Docker exposes port 80 by default (maps to internal port 3000)

2. **Database errors:**

   - Check file permissions in the `data/` directory
   - Ensure SQLite is properly installed (included in Docker image)
   - Verify the database file isn't corrupted (restore from backup)

3. **Performance on Raspberry Pi or low-spec devices:**

   - Use Raspberry Pi 4 or newer for best performance
   - Use a fast SD card (Class 10 or better) or USB SSD
   - Monitor CPU and memory usage with `htop`
   - Consider limiting concurrent sessions

4. **Session issues:**

   - Clear browser cookies if experiencing login problems
   - Check session expiration settings
   - Revoke old sessions from user settings if needed

### Performance Optimization

```bash
# Monitor system resources
htop

# Check Docker container logs
docker logs <container_name>

# View database size
ls -lh data/finance.db
```

## Development

### Tech Stack

- **Runtime:** Bun v1.0+
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** SQLite3
- **Authentication:** Session-based with HTTP-only cookies
- **Real-time:** Server-Sent Events (SSE)
- **Form Validation:** React Hook Form + Zod
- **Charts:** Recharts
- **Icons:** Lucide React

### Project Structure

```
app/              # Next.js 15 app directory
  ├── api/        # API routes (auth, entries, admin, etc.)
  ├── admin/      # Admin panel page
  ├── details/    # Transaction details page
  ├── login/      # Login page
  ├── manage/     # Data management page
  ├── user/       # User settings page
  └── page.tsx    # Main dashboard

components/       # React components
  ├── admin/      # Admin panel components
  ├── auth/       # Authentication components
  ├── finance/    # Finance tracking components
  ├── ui/         # Reusable UI components (shadcn/ui)
  └── user/       # User settings components

hooks/            # Custom React hooks
  ├── use-auth.tsx          # Authentication hook
  ├── use-finance-data.tsx  # Finance data fetching
  ├── use-mobile.tsx        # Mobile detection
  └── use-privacy.tsx       # Privacy mode hook

lib/              # Utility functions and backend logic
  ├── auth-middleware.js    # Authentication middleware
  ├── database.js           # SQLite database setup
  ├── session.js            # Session management
  ├── sse-notifications.js  # Server-Sent Events
  ├── rate-limit.ts         # API rate limiting
  ├── types.ts              # TypeScript types
  ├── utils.ts              # Utility functions
  └── validations.ts        # Zod schemas

data/             # SQLite database (created at runtime)
  └── finance.db  # Main database file

public/           # Static assets
```

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

- **Session-based authentication:** Secure, HTTP-only cookies
- **Password hashing:** bcrypt for password storage
- **Admin separation:** Admin panel uses separate authentication
- **Registration control:** Can be disabled to prevent unauthorized signups
- **Session management:** Users can view and revoke active sessions
- **Rate limiting:** API endpoints protected against abuse
- **HTTPS recommended:** Use reverse proxy (Cloudflare, nginx) for production
- **Regular backups:** Database backups recommended for data safety
- **Keep updated:** Regularly update dependencies for security patches
- **Environment variables:** Sensitive data stored in `.env` file
- **Multi-session support:** Track and control access from multiple devices

### Security Best Practices

1. **Change default credentials:** Always update `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`
2. **Use HTTPS:** Deploy with SSL/TLS in production (Cloudflare proxy recommended)
3. **Regular backups:** Automate database backups to prevent data loss
4. **Update dependencies:** Keep Bun, Next.js, and packages up to date
5. **Monitor sessions:** Regularly review and revoke suspicious sessions
6. **Strong passwords:** Enforce strong password policies for users
7. **Network security:** Use firewall rules to restrict access if needed
8. **Disable registration:** Turn off registration when not needed

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

- Point domain to server IP in Cloudflare DNS
- Enable orange cloud proxy for automatic SSL
- Configure firewall rules in Cloudflare dashboard

**Option 2: Let's Encrypt + nginx**

```bash
# Example nginx reverse proxy configuration
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
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

This project is open source. Feel free to use, modify, and distribute as needed.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Built with ❤️ using Next.js, React, Bun, and SQLite.
