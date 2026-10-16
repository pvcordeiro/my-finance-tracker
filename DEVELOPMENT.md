# Development guide

This guide is for running My Finance Tracker from a checkout of the repository and making changes to it.

## Requirements

- [Bun](https://bun.sh/) (the repository uses Bun 1.2.20).
- Git.

The application uses Bun’s built-in SQLite driver. Run the Next.js server through Bun so API routes can access `bun:sqlite`.

## Set up locally

Clone the repository, install dependencies, and prepare your environment file:

```sh
git clone https://github.com/pvcordeiro/my-finance-tracker.git
cd my-finance-tracker
bun install
cp .env.example .env
```

If you do not have SMTP credentials for local development, set `ENABLE_SMTP="false"` in `.env`. If you do want to test email delivery, configure the SMTP values; `APP_URL` should point to the app’s public origin, and production deployments must use HTTPS. Leave `NODE_ENV` unset for local development—Next.js sets it for each command.

Start the development server:

```sh
bun run dev
```

Open the URL printed by Next.js (normally [http://localhost:3000](http://localhost:3000)). The `.env.example` uses port `4242` for Docker’s host mapping; the local Next.js server defaults to port `3000` unless `PORT` is set in your environment.

## Useful commands

```sh
bun run dev       # Start the development server under Bun
bun test          # Run the test suite
bun run build     # Create a production build
bun run start     # Run the production server under Bun
```

Build before starting the production server. Both `dev` and `start` scripts explicitly use Bun because the application relies on `bun:sqlite` in server routes.

## Project layout

- `app/` — Next.js pages and API routes.
- `components/` — Shared UI, finance, authentication, and settings components.
- `hooks/` — Client-side authentication, finance data, language, and UI state.
- `lib/` — Database, email, session, validation, and finance utilities.
- `public/` — Static files and installable app assets.
- `scripts/` — Maintenance tasks, including country lookup data updates.

## Tests and checks

Run the full test suite after making changes:

```sh
bun test
```

For changes that affect the production bundle or types, also run:

```sh
bun run build
```

When changing Docker or environment configuration, check the Compose file too:

```sh
docker compose config --quiet
```

## Data and environment

The local SQLite database is created at `data/finance.db`. Do not commit `.env`, database files, SMTP credentials, or user exports. `.env.example` is the safe template for configuration; the [Docker guide](DOCKER.md) explains the available deployment settings.

## Contributing

Keep changes consistent with nearby code, update the relevant guide when behavior or setup changes, and include the checks that make sense for the change. User-facing setup and usage instructions belong in the [user guide](USER_GUIDE.md), [Docker guide](DOCKER.md), or [SMTP guide](SMTP_SETUP.md); the README should remain a short entry point.
