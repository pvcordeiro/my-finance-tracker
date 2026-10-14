import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { validateSession, getSessionFromRequest } from "@/lib/session";
import { formatCountryName, isPublicIp, lookupIpCountry } from "@/lib/ip-country";

export async function GET(request) {
  try {
    const sessionToken = getSessionFromRequest(request);
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = validateSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();
    const rows = db.prepare(`
      SELECT 
        id,
        token,
        user_agent,
        ip_address,
        device_name,
        created_at,
        last_accessed,
        expires_at
      FROM sessions 
      WHERE user_id = ? AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      ORDER BY last_accessed DESC
    `).all(session.id) ?? [];

    const sessions = rows.map(({ token: _token, ...row }) => {
      const countryCode = isPublicIp(row.ip_address)
        ? lookupIpCountry(db, row.ip_address)
        : null;

      return {
        ...row,
        country_code: countryCode,
        country: formatCountryName(countryCode, request.headers.get("accept-language")?.split(",")[0] || "en"),
        is_current: _token === sessionToken,
      };
    });

    const locationDataAvailable = Boolean(
      db.prepare("SELECT 1 FROM ip_country_ranges LIMIT 1").get()
    );
    return NextResponse.json({ sessions, locationDataAvailable });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
