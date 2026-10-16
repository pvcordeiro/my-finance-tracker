import { describe, expect, test } from "bun:test";
import { accountActionEmail, emailConfigured, smtpEnabled } from "./email.js";

describe("SMTP configuration", () => {
  test("is enabled by default", () => {
    const previous = process.env.ENABLE_SMTP;
    delete process.env.ENABLE_SMTP;
    try {
      expect(smtpEnabled()).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.ENABLE_SMTP;
      else process.env.ENABLE_SMTP = previous;
    }
  });

  test("can be disabled explicitly", () => {
    const previous = process.env.ENABLE_SMTP;
    process.env.ENABLE_SMTP = "false";
    try {
      expect(smtpEnabled()).toBe(false);
      expect(emailConfigured()).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.ENABLE_SMTP;
      else process.env.ENABLE_SMTP = previous;
    }
  });

  test("accepts provider-agnostic SMTP credentials", () => {
    const keys = [
      "ENABLE_SMTP",
      "SMTP_HOST",
      "SMTP_USER",
      "SMTP_PASSWORD",
      "EMAIL_FROM",
    ];
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    process.env.ENABLE_SMTP = "true";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "mailer";
    process.env.SMTP_PASSWORD = "secret";
    process.env.EMAIL_FROM = "finance@example.com";
    try {
      expect(emailConfigured()).toBe(true);
    } finally {
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  });

});

describe("localized account action emails", () => {
  test("renders English verification email as English", () => {
    const email = accountActionEmail({
      language: "en",
      kind: "verification",
      actionUrl: "https://example.com/verify?token=sample",
    });

    expect(email.subject).toBe("Verify your Finance Tracker email");
    expect(email.html).toContain('<html lang="en">');
    expect(email.html).toContain("Verify your email to get started");
    expect(email.text).toContain("This one-time link is valid for 30 minutes.");
  });

  test("renders password reset email in Portuguese", () => {
    const email = accountActionEmail({
      language: "pt",
      kind: "passwordReset",
      actionUrl: "https://example.com/reset?token=sample",
    });

    expect(email.subject).toBe("Redefina sua senha do Finance Tracker");
    expect(email.html).toContain('<html lang="pt">');
    expect(email.html).toContain("Vamos ajudar você a entrar novamente");
    expect(email.html).toContain("Se você não solicitou a redefinição de senha");
  });

  test("falls back to English for unknown languages", () => {
    const email = accountActionEmail({
      language: "fr",
      kind: "recovery",
      actionUrl: "https://example.com/verify?token=sample",
    });

    expect(email.subject).toBe("Verify your Finance Tracker email");
    expect(email.html).toContain('<html lang="en">');
  });
});
