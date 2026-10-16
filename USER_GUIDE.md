# User guide

This guide covers the everyday parts of My Finance Tracker: getting started, organizing shared finances, and keeping your account and data in good shape.

## First visit

Sign in with the administrator username and password configured for the first startup. Choose your preferred language and currency when prompted. You can change both later from your account settings.

The administrator account starts with its own group. You can create additional groups for different households or purposes, then assign users to the groups they should share.

## Pages at a glance

- **Manage** — Add and update income and expense entries, adjust the current balance, review balance changes, and resolve pending items from earlier months.
- **Summary** — See a financial overview and charts based on your planned entries and current balance.
- **Monthly view** — Compare income and expenses for each month and review itemized details.
- **Settings** — Manage your account, appearance, groups, sessions, and data.

## Tracking income and expenses

On the Manage page, open the income or expense section and add an entry. Give it a description and enter its monthly amounts. Use the recurring option when the same amount should carry forward. You can edit or remove entries later.

When an earlier month’s expected income or expense is still unresolved, it appears in Pending from previous months. Mark it received or paid when it happens, or dismiss it when it no longer applies. This keeps the current plan and outstanding items clear.

## Balance and history

The current balance is the amount you want the tracker to use as your starting point. Use the adjustment controls to add or subtract an amount; an optional note can explain the change. Recent balance changes show the recorded adjustments and their notes.

The Summary and Monthly view pages use the current balance and planned entries to show how your finances may change over time. These are planning views, so update your entries as your plans change.

## Users and groups

Each account has its own sign-in. People who belong to the same group share that group’s financial data. An administrator can create groups, add or remove members, and manage accounts from the admin panel.

If someone needs access to a group, ask an administrator to assign them. If registration is enabled, new users can also create their own accounts from the sign-in page; an administrator can then manage group access.

## Account and appearance settings

From Settings, you can:

- Change your username and password.
- Choose a theme and accent color.
- Set language and currency preferences for this device.
- Review active sessions and revoke access from a device you no longer use.
- Configure a minimum-balance alert.

When SMTP is disabled by the server administrator, email verification, password reset, and recovery-email settings are not available. Users can still change their password while signed in.

## Import, export, and clearing data

Use the data-management controls in Settings to export a JSON backup or import one. Keep exports somewhere secure: they contain financial data. Importing data changes the current account or group data, so review the selected file and target before confirming.

The clear-data action is destructive. Export a backup first if there is anything you may need later.

## Privacy and staying secure

Privacy mode can hide financial values in the interface. It does not replace account security or protect the database file on the host machine.

Use a unique password, sign out on shared devices, and revoke old sessions when needed. For self-hosted deployments, administrators should use HTTPS for public access and keep `.env` and database backups private.

## Need help?

- For installation, updates, backups, and server issues, see the [Docker deployment guide](DOCKER.md).
- For email verification and password reset setup, see [SMTP setup](SMTP_SETUP.md).
- For contributing or running the project locally, see the [development guide](DEVELOPMENT.md).
