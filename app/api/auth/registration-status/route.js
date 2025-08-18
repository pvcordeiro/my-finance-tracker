import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";

export async function GET() {
  try {
    const db = getDatabase();
    const registrationSetting = db
      .prepare("SELECT value FROM settings WHERE key = 'allow_registration'")
      .get();

    const allowRegistration = registrationSetting?.value === "true";

    return NextResponse.json({ allowRegistration });
  } catch (error) {
    console.error("Error checking registration status:", error);
    return NextResponse.json(
      { error: "Failed to check registration status" },
      { status: 500 }
    );
  }
}
