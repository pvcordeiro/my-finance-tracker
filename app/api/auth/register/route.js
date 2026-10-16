import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDatabase, hashPassword } from "../../../../lib/database.js";
import { registerSchema } from "../../../../lib/validations.ts";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit.ts";
import { accountActionEmail, emailConfigured, publicAppUrl, sendAccountEmail, smtpEnabled, validateSenderConfiguration } from "../../../../lib/email.js";
import { verifyRequestOrigin } from "../../../../lib/session.js";
import { currencyCodes } from "../../../../lib/i18n.ts";
import { languageFromAcceptLanguage } from "../../../../lib/language.ts";

export async function POST(request) {
  try {
    if (!verifyRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    const db = getDatabase();
    const sendVerificationEmail =
      smtpEnabled() && process.env.ALLOW_UNVERIFIED_REGISTRATION !== "true";
    if (sendVerificationEmail && (!emailConfigured() || !process.env.APP_URL)) {
      return NextResponse.json({ error: "Account registration requires email delivery configuration." }, { status: 503 });
    }
    if (sendVerificationEmail) validateSenderConfiguration();
    const registrationSetting = db.prepare(
      "SELECT value FROM settings WHERE key = 'allow_registration'"
    ).get();

    if (!registrationSetting || registrationSetting.value !== "true") {
      return NextResponse.json(
        { error: "Account registration is currently disabled" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      username,
      password,
      email: providedEmail,
      language = languageFromAcceptLanguage(request.headers.get("accept-language")),
      currency = "EUR",
    } = validation.data;

    if (smtpEnabled() && !providedEmail) {
      return NextResponse.json({ error: "Email is required when SMTP is enabled." }, { status: 400 });
    }
    const email = smtpEnabled() ? providedEmail?.toLowerCase() : null;

    if (!currencyCodes.includes(currency)) {
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
    }

    // Allow multiple legitimate test accounts while keeping a per-IP hourly cap.
    const clientIp = getClientIp(request);
    if (!rateLimit(`register_${clientIp}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    if (sendVerificationEmail && !emailConfigured()) {
      return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });
    }


    const normalizedUsername = username.trim();
    const existingUser = db.prepare(
      `SELECT id FROM users
       WHERE username = ? COLLATE NOCASE
          OR (? IS NOT NULL AND (email = ? COLLATE NOCASE OR pending_email = ? COLLATE NOCASE))`
    ).get(normalizedUsername, email, email, email);
    if (existingUser) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 409 }
      );
    }

    const hashedPassword = hashPassword(password);
    const token = sendVerificationEmail
      ? crypto.randomBytes(32).toString("base64url")
      : null;
    const tokenHash = token ? crypto.createHash("sha256").update(token).digest("hex") : null;
    const created = db.transaction(() => {
      const userResult = db.prepare(
        "INSERT INTO users (username, email, pending_email, password_hash, language, currency) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        normalizedUsername,
        smtpEnabled() && !token ? email : null,
        token ? email : null,
        hashedPassword,
        language,
        currency
      );
      const id = userResult.lastInsertRowid;
      const groupResult = db.prepare("INSERT INTO groups (name, created_by) VALUES (?, ?)").run(`${username}'s group`, id);
      db.prepare("INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)").run(id, groupResult.lastInsertRowid);
      if (tokenHash) {
        db.prepare("INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at, target_email) VALUES (?, ?, 'verify-email', ?, ?)")
          .run(id, tokenHash, new Date(Date.now() + 30 * 60 * 1000).toISOString(), email.toLowerCase());
      }
      return { id, groupId: groupResult.lastInsertRowid };
    })();
    const userId = created.id;
    const groupId = created.groupId;

    if (token) {
      try {
        const verificationUrl = `${publicAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
        const message = accountActionEmail({
          language,
          kind: "verification",
          actionUrl: verificationUrl,
        });
        await sendAccountEmail({
          to: email.toLowerCase(),
          ...message,
        });
      } catch (error) {
        db.prepare("DELETE FROM users WHERE id = ?").run(userId);
        throw error;
      }
    }

    const response = NextResponse.json({
      user: null,
      message: token
        ? "Check your email to verify your account before signing in."
        : "Account created. You can now sign in.",
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
