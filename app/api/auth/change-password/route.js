import { NextResponse } from "next/server";
import {
  getDatabase,
  verifyPassword,
  hashPassword,
} from "../../../../lib/database.js";
import { changePasswordSchema } from "../../../../lib/validations.ts";
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
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { current_password, new_password } = validation.data;

    const db = await getDatabase();
    const userRow = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, password_hash FROM users WHERE id = ?",
        [sessionUser.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const matches = verifyPassword(current_password, userRow.password_hash);
    if (!matches) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const newHash = hashPassword(new_password);

    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [newHash, sessionUser.id],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
