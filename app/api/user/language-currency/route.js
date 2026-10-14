import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { currencyCodes } from "@/lib/i18n";
import {
  getSessionFromRequest,
  validateSession,
  verifyRequestOrigin,
} from "@/lib/session";

export async function PATCH(request) {
  try {
    if (!verifyRequestOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const session = validateSession(getSessionFromRequest(request));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates = [];
    const values = [];

    if (Object.hasOwn(body, "language")) {
      if (!["en", "pt"].includes(body.language)) {
        return NextResponse.json({ error: "Invalid language." }, { status: 400 });
      }
      updates.push("language = ?");
      values.push(body.language);
    }

    if (Object.hasOwn(body, "currency")) {
      if (!currencyCodes.includes(body.currency)) {
        return NextResponse.json({ error: "Invalid currency." }, { status: 400 });
      }
      updates.push("currency = ?");
      values.push(body.currency);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No preferences provided." }, { status: 400 });
    }

    getDatabase()
      .prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
      .run(...values, session.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update language and currency preferences failed:", error);
    return NextResponse.json(
      { error: "Unable to update language and currency preferences." },
      { status: 500 }
    );
  }
}
