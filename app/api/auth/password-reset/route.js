import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase, hashPassword } from "@/lib/database";
import { getClientIp, rateLimit } from "@/lib/rate-limit.ts";
import { accountActionEmail, emailConfigured, publicAppUrl, sendAccountEmail, validateSenderConfiguration } from "@/lib/email";
import { z } from "zod";
import { verifyRequestOrigin } from "@/lib/session";

const unexpiredToken = "expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

const requestSchema = z.object({ email: z.string().email().max(254) });
const resetSchema = z.object({ token: z.string().min(32).max(128), password: z.string().min(8).max(200) });
const generic = { message: "If an account with that email is verified, reset instructions will be sent." };

export async function POST(request) {
  let issuedTokenHash = null;
  try {
    if (!verifyRequestOrigin(request)) return NextResponse.json(generic, { status: 403 });
    const clientIp = getClientIp(request);
    if (!rateLimit(`password-reset:${clientIp}`, { maxRequests: 5, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json(generic, { status: 200 });
    }
    if (!emailConfigured() || !process.env.APP_URL) return NextResponse.json(generic);
    validateSenderConfiguration();
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(generic);
    const db = getDatabase();
    const user = db.prepare("SELECT id, email, language FROM users WHERE email = ? AND email_verified_at IS NOT NULL").get(parsed.data.email.trim().toLowerCase());
    if (!user) return NextResponse.json(generic);

    if (!rateLimit(`password-reset-user:${user.id}`, { maxRequests: 3, windowMs: 60 * 60 * 1000 })) return NextResponse.json(generic);

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    issuedTokenHash = tokenHash;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const claimed = db.prepare(`
      INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at)
      SELECT ?, ?, 'password-reset', ?
      WHERE EXISTS (SELECT 1 FROM users WHERE id = ? AND email = ? AND email_verified_at IS NOT NULL)
    `).run(user.id, tokenHash, expiresAt, user.id, user.email);
    if (!claimed.changes) return NextResponse.json(generic);

    const link = `${publicAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      const message = accountActionEmail({
        language: user.language,
        kind: "passwordReset",
        actionUrl: link,
      });
      await sendAccountEmail({
        to: user.email,
        ...message,
      });
      db.prepare("DELETE FROM auth_tokens WHERE user_id = ? AND purpose = 'password-reset' AND token_hash != ?").run(user.id, tokenHash);
    } catch (error) {
      db.prepare("DELETE FROM auth_tokens WHERE token_hash = ?").run(tokenHash);
      throw error;
    }
    return NextResponse.json(generic);
  } catch (error) {
    if (issuedTokenHash) getDatabase().prepare("DELETE FROM auth_tokens WHERE token_hash = ?").run(issuedTokenHash);
    console.error("Password reset request failed:", error);
    return NextResponse.json(generic);
  }
}

export async function PUT(request) {
  try {
    if (!verifyRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    if (!rateLimit(`password-reset-complete:${getClientIp(request)}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json({ error: "Too many attempts. Request a new reset link later." }, { status: 429 });
    }
    const parsed = resetSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "The link is invalid or expired, or the password does not meet requirements." }, { status: 400 });
    const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
    const db = getDatabase();
    const row = db.prepare(`SELECT id, user_id FROM auth_tokens WHERE token_hash = ? AND purpose = 'password-reset' AND ${unexpiredToken}`).get(tokenHash);
    if (!row) return NextResponse.json({ error: "The link is invalid or expired." }, { status: 400 });
    const updated = db.transaction(() => {
      const stillValid = db.prepare(`SELECT id FROM auth_tokens WHERE id = ? AND token_hash = ? AND purpose = 'password-reset' AND ${unexpiredToken}`).get(row.id, tokenHash);
      if (!stillValid) return false;
      db.prepare("DELETE FROM auth_tokens WHERE token_hash = ?").run(tokenHash);
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(parsed.data.password), row.user_id);
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(row.user_id);
      db.prepare("DELETE FROM auth_tokens WHERE user_id = ?").run(row.user_id);
      return true;
    })();
    if (!updated) return NextResponse.json({ error: "The link is invalid or expired." }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset completion failed:", error);
    return NextResponse.json({ error: "Unable to reset password." }, { status: 500 });
  }
}
