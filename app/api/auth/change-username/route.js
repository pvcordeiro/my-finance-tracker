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

    const sessionUser = await validateSession(sessionToken);
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

    const db = await getDatabase();

    const existing = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM users WHERE username = ?",
        [new_username],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });
    if (existing) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET username = ? WHERE id = ?",
        [new_username, sessionUser.id],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

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
