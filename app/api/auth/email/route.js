import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { getSessionFromRequest, validateSession, verifyRequestOrigin } from "@/lib/session";
import { rateLimit, getClientIp } from "@/lib/rate-limit.ts";
import { accountActionEmail, emailConfigured, publicAppUrl, sendAccountEmail, validateSenderConfiguration } from "@/lib/email";

const unexpiredToken = "expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

function noStoreJson(body, init) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...init?.headers, "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    if (!verifyRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    const sessionToken = getSessionFromRequest(request);
    const session = validateSession(sessionToken);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!emailConfigured()) return NextResponse.json({ error: "Email delivery is not configured" }, { status: 503 });
    validateSenderConfiguration();
    if (!rateLimit(`email-verify:${session.id}:${getClientIp(request)}`, { maxRequests: 3, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json({ error: "Please wait before requesting another verification email." }, { status: 429 });
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const db = getDatabase();
    const existing = db.prepare("SELECT id FROM users WHERE (email = ? COLLATE NOCASE OR pending_email = ? COLLATE NOCASE) AND id != ?").get(email, email, session.id);
    if (existing) return NextResponse.json({ error: "That email is already linked to another account." }, { status: 409 });

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const current = db.prepare("SELECT email, pending_email, email_verified_at FROM users WHERE id = ?").get(session.id);
    if (current?.email?.toLowerCase() === email && !current.pending_email) {
      return NextResponse.json({ error: "That email is already verified for this account." }, { status: 409 });
    }
    const link = `${publicAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    const message = accountActionEmail({
      language: session.language,
      kind: "recovery",
      actionUrl: link,
    });
    await sendAccountEmail({ to: email, ...message });
    const issue = db.transaction(() => {
      const latest = db.prepare("SELECT email, pending_email FROM users WHERE id = ?").get(session.id);
      const conflict = db.prepare("SELECT id FROM users WHERE (email = ? COLLATE NOCASE OR pending_email = ? COLLATE NOCASE) AND id != ?").get(email, email, session.id);
      if (conflict || latest?.email?.toLowerCase() === email && !latest.pending_email) return false;
      db.prepare("UPDATE users SET pending_email = ? WHERE id = ?").run(email, session.id);
      db.prepare("DELETE FROM auth_tokens WHERE user_id = ? AND purpose = 'verify-email'").run(session.id);
      db.prepare("INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at, target_email) VALUES (?, ?, 'verify-email', ?, ?)").run(session.id, tokenHash, expiresAt, email);
      return true;
    });
    if (!issue()) return NextResponse.json({ error: "That email is already linked to another account." }, { status: 409 });
    return NextResponse.json({ success: true, message: "Verification email sent." });
  } catch (error) {
    console.error("Email verification request failed:", error);
    return NextResponse.json({ error: "Unable to send verification email." }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    if (!verifyRequestOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    const session = validateSession(getSessionFromRequest(request));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getDatabase();
    db.transaction(() => {
      db.prepare("UPDATE users SET pending_email = NULL WHERE id = ?").run(session.id);
      db.prepare("DELETE FROM auth_tokens WHERE user_id = ? AND purpose = 'verify-email'").run(session.id);
    })();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel email change failed:", error);
    return NextResponse.json({ error: "Unable to cancel email change." }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get("token") || "";
    if (!token) {
      const sessionToken = getSessionFromRequest(request);
      const session = validateSession(sessionToken);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const user = getDatabase().prepare("SELECT email, pending_email, email_verified_at FROM users WHERE id = ?").get(session.id);
      return NextResponse.json({
        email: user?.email || "",
        pendingEmail: user?.pending_email || "",
        verified: Boolean(user?.email_verified_at),
        pendingVerified: false,
      });
    }
    if (token.length < 32 || token.length > 128) return noStoreJson({ error: "Invalid or expired verification link." }, { status: 400 });
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const valid = getDatabase().prepare(`SELECT 1 FROM auth_tokens WHERE token_hash = ? AND purpose = 'verify-email' AND ${unexpiredToken}`).get(hash);
    if (!valid) return noStoreJson({ error: "Invalid or expired verification link." }, { status: 400 });
    return noStoreJson({ valid: true });
  } catch (error) {
    console.error("Email verification link check failed:", error);
    return noStoreJson({ error: "Unable to check verification link." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    if (!verifyRequestOrigin(request)) return noStoreJson({ error: "Invalid request origin." }, { status: 403 });
    const { token = "" } = await request.json();
    if (typeof token !== "string" || token.length < 32 || token.length > 128) return noStoreJson({ error: "Invalid or expired verification link." }, { status: 400 });
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const db = getDatabase();
    const row = db.prepare(`SELECT id, user_id, target_email FROM auth_tokens WHERE token_hash = ? AND purpose = 'verify-email' AND ${unexpiredToken}`).get(hash);
    if (!row) return noStoreJson({ error: "Invalid or expired verification link." }, { status: 400 });
    if (!row.target_email) return noStoreJson({ error: "This verification link has no email address attached." }, { status: 400 });
    const owner = db.prepare("SELECT email, pending_email FROM users WHERE id = ?").get(row.user_id);
    const requestedEmail = row.target_email.toLowerCase();
    if (owner?.pending_email?.toLowerCase() !== requestedEmail && owner?.email?.toLowerCase() !== requestedEmail) return noStoreJson({ error: "This email change was replaced by a newer request." }, { status: 409 });
    const conflict = db.prepare("SELECT id FROM users WHERE (email = ? COLLATE NOCASE OR pending_email = ? COLLATE NOCASE) AND id != ?").get(requestedEmail, requestedEmail, row.user_id);
    if (conflict) return noStoreJson({ error: "That email is already linked to another account." }, { status: 409 });
    const accepted = db.transaction(() => {
      const current = db.prepare("SELECT email, pending_email FROM users WHERE id = ?").get(row.user_id);
      const currentToken = db.prepare(`SELECT id, target_email FROM auth_tokens WHERE id = ? AND token_hash = ? AND purpose = 'verify-email' AND ${unexpiredToken}`).get(row.id, hash);
      if (!currentToken || currentToken.target_email?.toLowerCase() !== requestedEmail) return false;
      if (current?.pending_email?.toLowerCase() === requestedEmail) {
        db.prepare("UPDATE users SET email = pending_email, pending_email = NULL, email_verified_at = CURRENT_TIMESTAMP WHERE id = ? AND pending_email IS NOT NULL").run(row.user_id);
      } else if (current?.email?.toLowerCase() !== requestedEmail) {
        return false;
      }
      db.prepare("DELETE FROM auth_tokens WHERE user_id = ? AND purpose = 'verify-email'").run(row.user_id);
      return true;
    })();
    if (!accepted) return noStoreJson({ error: "This email change was replaced by a newer request." }, { status: 409 });
    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Email verification failed:", error);
    return noStoreJson({ error: "Unable to verify email." }, { status: 500 });
  }
}
