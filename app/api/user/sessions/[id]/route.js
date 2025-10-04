import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { validateSession, getSessionFromRequest } from "@/lib/session";

export async function DELETE(request, { params }) {
  try {
    const sessionToken = getSessionFromRequest(request);
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await validateSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const db = await getDatabase();

    return new Promise((resolve) => {
      db.get(
        `SELECT id, user_id, token FROM sessions WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) {
            console.error("Database error:", err);
            resolve(
              NextResponse.json(
                { error: "Failed to revoke session" },
                { status: 500 }
              )
            );
            return;
          }

          if (!row) {
            resolve(
              NextResponse.json({ error: "Session not found" }, { status: 404 })
            );
            return;
          }

          if (row.user_id !== session.id) {
            resolve(
              NextResponse.json({ error: "Unauthorized" }, { status: 403 })
            );
            return;
          }

          if (row.token === sessionToken) {
            resolve(
              NextResponse.json(
                { error: "Cannot revoke current session" },
                { status: 400 }
              )
            );
            return;
          }

          db.run(`DELETE FROM sessions WHERE id = ?`, [id], (err) => {
            if (err) {
              console.error("Database error:", err);
              resolve(
                NextResponse.json(
                  { error: "Failed to revoke session" },
                  { status: 500 }
                )
              );
              return;
            }

            resolve(
              NextResponse.json({
                success: true,
                message: "Session revoked successfully",
              })
            );
          });
        }
      );
    });
  } catch (error) {
    console.error("Error revoking session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
