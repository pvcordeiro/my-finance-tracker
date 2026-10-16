# My Finance Tracker

A self-hosted finance tracker for keeping household income, expenses, balances, and plans in one place. It supports multiple users and shared groups, stores data in a local SQLite database, and works on desktop and mobile.

## What you can do

- Track income, expenses, and your current balance across a rolling 12-month view.
- See monthly summaries, history, and charts.
- Share finances with other users in a household or group.
- Choose dark, light, or system theme, accent colors, language, and currency.
- Import and export your data as JSON.
- Use the app on desktop, tablet, or mobile, with live updates across sessions.

## Get started

The quickest way to run the app is with Docker Compose. Create a working directory and download the Compose file and environment template:

```sh
mkdir -p ~/finance-tracker
cd ~/finance-tracker
curl -fsSLO https://raw.githubusercontent.com/pvcordeiro/my-finance-tracker/main/docker-compose.yml
curl -fsSLO https://raw.githubusercontent.com/pvcordeiro/my-finance-tracker/main/.env.example
mv .env.example .env
```

Edit `.env` and replace the default administrator username and password before exposing the app. Set `ENABLE_SMTP="false"` if you do not want to configure email. Then start the app:

```sh
docker compose up -d
```

Open [http://localhost:4242](http://localhost:4242). Your database is stored in the `data/` directory alongside the Compose file. Keep both `data/` and `.env` safe.

This quick start is intended for a private, local deployment. Before making the app available outside your machine, read the [Docker deployment guide](DOCKER.md) for registration, HTTPS, and backup guidance.

The first administrator credentials are only used when the database is created. Changing them in `.env` later will not change an existing administrator account; update the password from the account settings instead.

## Documentation

- [Docker deployment](DOCKER.md) — Install with Docker or Compose, configure environment variables, update, back up, and troubleshoot the app.
- [SMTP setup](SMTP_SETUP.md) — Configure an SMTP provider or run without email delivery.
- [User guide](USER_GUIDE.md) — Set up accounts and groups, manage finances, and use personal settings.
- [Development guide](DEVELOPMENT.md) — Install dependencies, run locally, test, and build the project.

## A note about your data

Your financial data stays in the SQLite database on the machine running the app. Back up the `data/` directory regularly, and keep your `.env` file private because it contains your administrator and SMTP credentials.

## Contributing

Bug reports, ideas, and pull requests are welcome. See the [development guide](DEVELOPMENT.md) to get the project running locally.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
