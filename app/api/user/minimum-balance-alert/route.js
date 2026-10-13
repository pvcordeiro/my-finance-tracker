import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import {
  getSessionFromRequest,
  validateSession,
  verifyRequestOrigin,
} from "@/lib/session";

function getSession(request) {
  return validateSession(getSessionFromRequest(request));
}

export async function GET(request) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const row = getDatabase()
      .prepare("SELECT minimum_balance_alert FROM users WHERE id = ?")
      .get(session.id);

    return NextResponse.json({
      minimumBalanceAlert: row?.minimum_balance_alert ?? null,
    });
  } catch (error) {
    console.error("Get minimum balance alert failed:", error);
    return NextResponse.json(
      { error: "Unable to load minimum balance alert." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    if (!verifyRequestOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { minimumBalanceAlert } = await request.json();
    if (
      typeof minimumBalanceAlert !== "number" ||
      !Number.isFinite(minimumBalanceAlert) ||
      minimumBalanceAlert < 0 ||
      minimumBalanceAlert > 10_000_000
    ) {
      return NextResponse.json(
        { error: "Enter a valid minimum balance." },
        { status: 400 }
      );
    }

    const value = Math.round(minimumBalanceAlert * 100) / 100;
    getDatabase()
      .prepare("UPDATE users SET minimum_balance_alert = ? WHERE id = ?")
      .run(value, session.id);

    return NextResponse.json({ success: true, minimumBalanceAlert: value });
  } catch (error) {
    console.error("Update minimum balance alert failed:", error);
    return NextResponse.json(
      { error: "Unable to update minimum balance alert." },
      { status: 500 }
    );
  }
}
