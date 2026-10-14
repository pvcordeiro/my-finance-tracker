import { describe, expect, test } from "bun:test";
import { accountActionEmail } from "./email.js";

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
