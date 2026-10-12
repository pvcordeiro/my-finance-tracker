import nodemailer from "nodemailer";

export function validateSenderConfiguration() {
  const from = process.env.EMAIL_FROM?.trim() || "";
  const match = from.match(/<([^<>]+)>\s*$/);
  const address = (match?.[1] || from).trim();
  const valid = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address);
  if (!valid) throw new Error("EMAIL_FROM must be a valid sender email address, optionally formatted as Name <address>");
  return { from, address };
}

export function emailConfigured() {
  return Boolean(process.env.BREVO_SMTP_HOST && process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_KEY && process.env.EMAIL_FROM);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function accountActionEmail({ eyebrow, title, message, actionLabel, actionUrl, expiry, ignoreNote }) {
  const safe = {
    eyebrow: escapeHtml(eyebrow),
    title: escapeHtml(title),
    message: escapeHtml(message),
    actionLabel: escapeHtml(actionLabel),
    actionUrl: escapeHtml(actionUrl),
    expiry: escapeHtml(expiry),
    ignoreNote: escapeHtml(ignoreNote),
  };

  const text = `${eyebrow}\n\n${title}\n\n${message}\n\n${actionLabel}: ${actionUrl}\n\n${expiry}\n${ignoreNote}\n\nMy Finance Tracker`;
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><title>${safe.title}</title></head>
  <body style="margin:0;padding:0;background:#f4f5f2;font-family:Arial,Helvetica,sans-serif;color:#20251f;-webkit-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safe.message}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f5f2;padding:36px 14px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e6e9e2;border-radius:18px;overflow:hidden;">
          <tr><td style="padding:28px 34px 25px;background:#173d2d;color:#ffffff;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
              <td valign="middle"><div style="font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#c6ddca;">${safe.eyebrow}</div><div style="margin-top:9px;font-size:26px;line-height:32px;font-weight:700;letter-spacing:-.5px;color:#ffffff;">A little more peace of mind.</div></td>
              <td width="66" align="right" valign="middle"><div style="width:54px;height:54px;line-height:54px;text-align:center;background:#e7f0dc;border-radius:17px;font-size:29px;">💸</div></td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:34px 34px 12px;">
            <div style="font-size:23px;line-height:30px;font-weight:700;letter-spacing:-.35px;color:#20251f;">${safe.title}</div>
            <p style="margin:14px 0 0;font-size:15px;line-height:25px;color:#5c655b;">${safe.message}</p>
          </td></tr>
          <tr><td align="center" style="padding:20px 34px 25px;">
            <a href="${safe.actionUrl}" style="display:inline-block;padding:15px 25px;background:#286346;border:1px solid #286346;border-radius:10px;color:#ffffff;text-decoration:none;font-size:15px;line-height:20px;font-weight:700;">${safe.actionLabel} &nbsp; →</a>
          </td></tr>
          <tr><td style="padding:0 34px 28px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f8f3;border:1px solid #e8ede3;border-radius:12px;"><tr><td style="padding:15px 17px;font-size:13px;line-height:21px;color:#586257;">
              <strong style="color:#354035;">⏳ ${safe.expiry}</strong><br>${safe.ignoreNote}
            </td></tr></table>
            <p style="margin:22px 0 0;font-size:12px;line-height:19px;color:#7a8278;">If the button doesn’t work, copy this link into your browser:<br><a href="${safe.actionUrl}" style="color:#286346;word-break:break-all;">${safe.actionUrl}</a></p>
          </td></tr>
          <tr><td style="padding:17px 34px;border-top:1px solid #edf0e9;font-size:12px;line-height:19px;color:#7a8278;">Sent by <strong style="color:#53604f;">My Finance Tracker</strong><br>Made for keeping the household on track. 🌱</td></tr>
        </table>
        <div style="padding:18px 10px 0;font-size:11px;line-height:17px;color:#8b9288;">This is an automated account-security email. Please don’t reply.</div>
      </td></tr>
    </table>
  </body>
</html>`;

  return { text, html };
}

export async function sendAccountEmail({ to, subject, text, html }) {
  if (!emailConfigured()) throw new Error("Email delivery is not configured");
  const sender = validateSenderConfiguration();
  const configuredName = process.env.EMAIL_FROM_NAME?.trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted).trim();
  const addressName = sender.from.match(/^(.*?)\s*<[^<>]+>\s*$/)?.[1]?.trim();
  const senderName = configuredName || addressName || "My Finance Tracker";
  const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.BREVO_SMTP_PORT || 587),
    secure: process.env.BREVO_SMTP_SECURE === "true",
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });
  await transporter.sendMail({
    from: { name: senderName, address: sender.address },
    to,
    subject,
    text,
    html,
  });
}

export function publicAppUrl() {
  const configured = process.env.APP_URL;
  if (!configured) throw new Error("APP_URL is not configured");
  const url = new URL(configured);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("APP_URL must use HTTPS in production");
  }
  return url.origin;
}
