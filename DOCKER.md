# Docker deployment

This guide covers running My Finance Tracker as a Docker container. The default Compose setup keeps the database on your host and reads application settings from one `.env` file.

## Docker Compose (recommended)

Create a deployment directory and download the Compose file and environment template:

```sh
mkdir -p ~/finance-tracker
cd ~/finance-tracker
curl -fsSLO https://raw.githubusercontent.com/pvcordeiro/my-finance-tracker/main/docker-compose.yml
curl -fsSLO https://raw.githubusercontent.com/pvcordeiro/my-finance-tracker/main/.env.example
mv .env.example .env
```

Open `.env` and replace the example administrator username and password before exposing the app. Those credentials are used when the database is first created; changing them later in `.env` does not change an existing account. If you want account verification and password resets, configure SMTP as described in [SMTP setup](SMTP_SETUP.md). If email is not needed, set `ENABLE_SMTP="false"` and remove the SMTP credentials.

Start the service:

```sh
docker compose up -d
```

Open [http://localhost:4242](http://localhost:4242). The Compose file mounts `./data` into the container, so your SQLite database remains on the host when you update or recreate the container.

To use another host port, set `HOST_PORT` in `.env`. For example, `HOST_PORT="8080"` makes the app available at `http://localhost:8080`. This changes the port on your machine; the app continues to listen on port `3000` inside the container.

## Run the container directly

For a single-container setup, create a `.env` file as above, then run:

```sh
docker run -d \
  --name my-finance-tracker \
  --restart unless-stopped \
  -p 4242:3000 \
  -v "$HOME/finance-tracker-data:/app/data" \
  --env-file .env \
  pvcordeiro/my-finance-tracker:latest
```

The `/app/data` mount is important: without it, the database is stored inside the container and can be lost when that container is removed.

## Configuration

The repository includes a commented example in [`.env.example`](.env.example). These are the main settings:

| Variable | Default | What it controls |
| --- | --- | --- |
| `HOST_PORT` | `4242` | Host port exposed by Docker Compose. |
| `ADMIN_USERNAME` | `admin` | Username for the first administrator account. Change before exposing the app. |
| `ADMIN_PASSWORD` | `changeme` | Password for the first administrator account. Change before exposing the app. |
| `ALLOW_REGISTRATION` | `false` | Initial registration setting for a new database. After setup, manage registration in the admin panel. |
| `ENABLE_SMTP` | `true` | Enables verification email, password resets, and recovery-email changes. Set to `false` to run without email. |
| `APP_URL` | — | Public HTTPS origin used to create verification and reset links. Needed when SMTP email is enabled. |
| `SMTP_HOST` | — | SMTP server hostname. |
| `SMTP_PORT` | `587` | SMTP server port. |
| `SMTP_SECURE` | `false` | Set to `true` for a direct TLS connection. |
| `SMTP_USER` | — | SMTP authentication username. |
| `SMTP_PASSWORD` | — | SMTP authentication password or key. |
| `EMAIL_FROM` | — | Sender address accepted by your provider. |
| `EMAIL_FROM_NAME` | `My Finance Tracker` | Sender display name. |
| `TRUST_PROXY` | `true` | Whether to trust proxy-provided client IP headers. Keep your reverse proxy configured to replace incoming forwarded headers. |
| `NODE_ENV` | `production` in the container | Runtime mode. Normally leave this to the container image. |

For the full SMTP setup and no-email behavior, see [SMTP_SETUP.md](SMTP_SETUP.md).

The initial values for registration and balance history are read when the database is created. After setup, manage registration and balance-history settings from the admin panel.

## Updating

Pull the current image and recreate the service:

```sh
docker compose pull
docker compose up -d
```

Your `.env` and `data/` directory remain on the host and are not replaced by this operation.

## Backups and restore

Stop the service briefly for a simple consistent copy, then archive the data directory:

```sh
docker compose stop
tar -czf "finance-data-$(date +%Y-%m-%d).tar.gz" data
docker compose start
```

To restore, stop the app, replace the contents of `data/` with the backup, and start the app again. Keep backups somewhere other than the machine hosting the tracker.

## Common commands

```sh
docker compose logs -f       # Follow application logs
docker compose ps            # Check service status
docker compose up -d --force-recreate  # Apply .env changes
docker compose down          # Stop and remove the container
```

The default Compose file uses a host directory for the database, so `docker compose down` leaves your data in `./data`. If you customize the file to use Docker-managed volumes, check the volume behavior before removing them. Keep a separate backup either way.

## Troubleshooting

### The container does not start

Check the logs with `docker compose logs`. Confirm that the `.env` file exists beside `docker-compose.yml` and that your Docker daemon is running.

### The app is unreachable

Check `docker compose ps`, confirm the host port in `.env`, and check the host firewall. If you use a reverse proxy, make sure it forwards traffic to the mapped host port.

### Data is not persisting

Confirm that the `./data:/app/data` mount is present and that Docker can write to the host `data/` directory.

### Session locations show IP addresses

The container attempts to download the country lookup data on first startup. If it could not do so, check that the host has internet access, then retry:

```sh
docker compose exec my-finance-tracker bun /app/scripts/update-ip-country.js
```

Location data is approximate. Local, private, and unlisted IP addresses may not resolve to a country.

## Related guides

- [SMTP setup](SMTP_SETUP.md)
- [User guide](USER_GUIDE.md)
- [Development guide](DEVELOPMENT.md)
- [Project README](README.md)
