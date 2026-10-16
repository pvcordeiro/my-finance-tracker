# SMTP Setup

My Finance Tracker uses SMTP for account verification, password reset links, and recovery-email changes. SMTP is enabled by default to preserve the standard account security flow.

## Configure an SMTP provider

1. Create SMTP credentials with your email provider. Use its **SMTP password/key**, not an API key unless the provider explicitly says its API key can authenticate over SMTP.
2. Set these variables in the host `.env` file used by Docker Compose:

   ```dotenv
   ENABLE_SMTP="true"
   APP_URL="https://finance.example.com"
   SMTP_HOST="your-provider-smtp-host"
   SMTP_PORT="587"
   SMTP_SECURE="false"
   SMTP_USER="your-smtp-username"
   SMTP_PASSWORD="your-smtp-password-or-key"
   EMAIL_FROM="verified-sender@your-domain.com"
   EMAIL_FROM_NAME="My Finance Tracker"
   ```

   Replace the example values with the SMTP host, port, username, password/key, and verified sender provided by your SMTP service. Any provider that supports standard SMTP username/password authentication can use these settings.

3. Recreate the service to apply the changes:

   ```sh
   docker compose up -d --force-recreate
   ```

`APP_URL` must be the public origin where the app is accessible. Production deployments require HTTPS so email links point to a secure address.

## Run without email

For a private or self-hosted deployment that does not have an SMTP account, set:

```dotenv
ENABLE_SMTP="false"
```

Recreate the service after changing the setting. SMTP credentials and `APP_URL` are not required when email is disabled. New accounts use a username and password without an email address or verification step. Password-reset links, email verification, and recovery-email settings are unavailable in this mode. Users can still change their password while signed in from account settings.

The default is `ENABLE_SMTP=true`. If the variable is omitted, the app retains the email-enabled behavior and requires valid SMTP credentials to send email.

The SMTP transport supports providers using standard username/password authentication; providers requiring OAuth or another custom authentication flow need a compatible SMTP credential/mode.

## Keep credentials private

- Put SMTP secrets in the host `.env` file, not in a committed Compose file.
- Do not expose SMTP credentials through `NEXT_PUBLIC_*` variables.
- Rotate the SMTP key in your provider if it is accidentally exposed.
