import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";
import { changeUsernameSchema } from "../../../../lib/validations.ts";
import {
  getSessionFromRequest,
  validateSession,
} from "../../../../lib/session.js";

export async function POST(request) {
  try {
    const sessionToken = getSessionFromRequest(request);
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = validateSession(sessionToken);
    if (!sessionUser) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const validation = changeUsernameSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { new_username } = validation.data;

    const db = getDatabase();

    const existing = db.prepare(
      "SELECT id FROM users WHERE username = ?"
    ).get(new_username);
    if (existing) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    db.prepare(
      "UPDATE users SET username = ? WHERE id = ?"
    ).run(new_username, sessionUser.id);

    return NextResponse.json({
      message: "Username updated successfully",
      username: new_username,
    });
  } catch (error) {
    console.error("Change username error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
