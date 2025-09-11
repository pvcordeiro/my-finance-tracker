import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";
import { settingsSchema } from "../../../../lib/validations.ts";
import {
  validateAdminSession,
  getAdminSessionFromRequest,
} from "../../../../lib/admin-session.js";

async function verifyAdmin(request) {
  const sessionToken = getAdminSessionFromRequest(request);
  const adminSession = await validateAdminSession(sessionToken);
  return adminSession !== null;
}

export async function GET(request) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const settings = await new Promise((resolve, reject) => {
      db.all("SELECT key, value FROM settings", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const settingsObj = {};
    settings.forEach((setting) => {
      settingsObj[setting.key] = setting.value === "true";
    });

    return NextResponse.json({ settings: settingsObj });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const validation = settingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid settings", details: validation.error.errors },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    for (const [key, value] of Object.entries(validation.data)) {
      await new Promise((resolve, reject) => {
        db.run(
          `
            INSERT OR REPLACE INTO settings (key, value, updated_at) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
          `,
          [key, value.toString()],
          function (err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
