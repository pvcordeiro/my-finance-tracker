import nodemailer from "nodemailer";
import { readFileSync } from "node:fs";
import path from "node:path";

const emailLogo = readFileSync(
  path.join(process.cwd(), "public", "finance-logo.png")
);

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

const accountEmailCopy = {
  en: {
    tagline: "A little more peace of mind.",
    copyLink: "If the button doesn’t work, copy this link into your browser:",
    sentBy: "Sent by",
    footer: "Made for keeping the household on track. 🌱",
    automated: "This is an automated account-security email. Please don’t reply.",
    verification: {
      subject: "Verify your Finance Tracker email",
      eyebrow: "Welcome to My Finance Tracker",
      title: "Verify your email to get started",
      message: "Confirm this email address to finish creating your account and keep a safe way to get back in.",
      actionLabel: "Verify my email",
      expiry: "This one-time link is valid for 30 minutes.",
      ignoreNote: "If you didn’t create an account, you can safely ignore this email.",
    },
    recovery: {
      subject: "Verify your Finance Tracker email",
      eyebrow: "Account verification",
      title: "Confirm your recovery email",
      message: "One quick click and this address can help you get back into your account if you ever forget your password.",
      actionLabel: "Verify email address",
      expiry: "This link is valid for 30 minutes.",
      ignoreNote: "Didn’t ask to change your email? You can safely ignore this message. Your current verified email remains active.",
    },
    passwordReset: {
      subject: "Reset your Finance Tracker password",
      eyebrow: "Password reset",
      title: "Let’s get you back in",
      message: "We received a request to reset your Finance Tracker password. Use the button below to choose a new one.",
      actionLabel: "Create a new password",
      expiry: "This one-time link is valid for 30 minutes.",
      ignoreNote: "If you didn’t request a password reset, you can ignore this email—your password will stay the same.",
    },
  },
  pt: {
    tagline: "Mais tranquilidade para você.",
    copyLink: "Se o botão não funcionar, copie este link e cole no navegador:",
    sentBy: "Enviado por",
    footer: "Feito para ajudar a manter as finanças da casa em dia. 🌱",
    automated: "Este é um e-mail automático de segurança da conta. Não responda.",
    verification: {
      subject: "Confirme seu e-mail do Finance Tracker",
      eyebrow: "Bem-vindo ao My Finance Tracker",
      title: "Confirme seu e-mail para começar",
      message: "Confirme este endereço de e-mail para concluir a criação da sua conta e ter uma forma segura de acessá-la novamente.",
      actionLabel: "Confirmar meu e-mail",
      expiry: "Este link de uso único é válido por 30 minutos.",
      ignoreNote: "Se você não criou uma conta, pode ignorar este e-mail com segurança.",
    },
    recovery: {
      subject: "Confirme seu e-mail do Finance Tracker",
      eyebrow: "Verificação da conta",
      title: "Confirme seu e-mail de recuperação",
      message: "Com apenas um clique, este endereço poderá ajudar você a recuperar o acesso à sua conta caso esqueça a senha.",
      actionLabel: "Verificar endereço de e-mail",
      expiry: "Este link é válido por 30 minutos.",
      ignoreNote: "Não solicitou a alteração do e-mail? Você pode ignorar esta mensagem. Seu e-mail verificado atual continua ativo.",
    },
    passwordReset: {
      subject: "Redefina sua senha do Finance Tracker",
      eyebrow: "Redefinição de senha",
      title: "Vamos ajudar você a entrar novamente",
      message: "Recebemos uma solicitação para redefinir sua senha do Finance Tracker. Use o botão abaixo para escolher uma nova senha.",
      actionLabel: "Criar uma nova senha",
      expiry: "Este link de uso único é válido por 30 minutos.",
      ignoreNote: "Se você não solicitou a redefinição de senha, pode ignorar este e-mail. Sua senha continuará a mesma.",
    },
  },
};

export function accountActionEmail({ language = "en", kind, actionUrl }) {
  const locale = language === "pt" ? "pt" : "en";
  const translations = accountEmailCopy[locale];
  const copy = translations[kind];
  if (!copy) throw new Error(`Unknown account email kind: ${kind}`);
  const safe = {
    eyebrow: escapeHtml(copy.eyebrow),
    title: escapeHtml(copy.title),
    message: escapeHtml(copy.message),
    actionLabel: escapeHtml(copy.actionLabel),
    actionUrl: escapeHtml(actionUrl),
    expiry: escapeHtml(copy.expiry),
    ignoreNote: escapeHtml(copy.ignoreNote),
    tagline: escapeHtml(translations.tagline),
    copyLink: escapeHtml(translations.copyLink),
    sentBy: escapeHtml(translations.sentBy),
    footer: escapeHtml(translations.footer),
    automated: escapeHtml(translations.automated),
  };

  const text = `${copy.eyebrow}\n\n${copy.title}\n\n${copy.message}\n\n${copy.actionLabel}: ${actionUrl}\n\n${copy.expiry}\n${copy.ignoreNote}\n\nMy Finance Tracker`;
  const html = `<!doctype html>
<html lang="${locale}">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><title>${safe.title}</title></head>
  <body style="margin:0;padding:0;background:#f4f5f2;font-family:Arial,Helvetica,sans-serif;color:#20251f;-webkit-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safe.message}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f5f2;padding:36px 14px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e6e9e2;border-radius:18px;overflow:hidden;">
          <tr><td style="padding:28px 34px 25px;background:#173d2d;color:#ffffff;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
              <td valign="middle"><div style="font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#c6ddca;">${safe.eyebrow}</div><div style="margin-top:9px;font-size:26px;line-height:32px;font-weight:700;letter-spacing:-.5px;color:#ffffff;">${safe.tagline}</div></td>
               <td width="66" align="right" valign="middle"><img src="cid:finance-tracker-logo" width="54" height="54" alt="Finance Tracker" style="display:block;width:54px;height:54px;border:0;border-radius:15px;"></td>
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
            <p style="margin:22px 0 0;font-size:12px;line-height:19px;color:#7a8278;">${safe.copyLink}<br><a href="${safe.actionUrl}" style="color:#286346;word-break:break-all;">${safe.actionUrl}</a></p>
          </td></tr>
          <tr><td style="padding:17px 34px;border-top:1px solid #edf0e9;font-size:12px;line-height:19px;color:#7a8278;">${safe.sentBy} <strong style="color:#53604f;">My Finance Tracker</strong><br>${safe.footer}</td></tr>
        </table>
        <div style="padding:18px 10px 0;font-size:11px;line-height:17px;color:#8b9288;">${safe.automated}</div>
      </td></tr>
    </table>
  </body>
</html>`;

  return {
    subject: copy.subject,
    text,
    html,
    attachments: [
      {
        filename: "finance-logo.png",
        content: emailLogo,
        contentType: "image/png",
        cid: "finance-tracker-logo",
        contentDisposition: "inline",
      },
    ],
  };
}

export async function sendAccountEmail({ to, subject, text, html, attachments }) {
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
    subject: subject || "My Finance Tracker",
    text,
    html,
    attachments,
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
