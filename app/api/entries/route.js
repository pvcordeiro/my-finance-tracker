import { NextResponse } from "next/server"
import { getDatabase } from "../../../lib/database.js"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || 1

    const db = getDatabase()
    const entries = db.prepare("SELECT * FROM entries WHERE user_id = ? ORDER BY created_at DESC").all(userId)

    // Parse amounts JSON for each entry
    const parsedEntries = entries.map((entry) => ({
      ...entry,
      amounts: JSON.parse(entry.amounts),
    }))

    return NextResponse.json({ entries: parsedEntries })
  } catch (error) {
    console.error("Get entries error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { entries, userId = 1 } = await request.json()

    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: "Entries must be an array" }, { status: 400 })
    }

    const db = getDatabase()

    // Clear existing entries for user
    db.prepare("DELETE FROM entries WHERE user_id = ?").run(userId)

    // Insert new entries
    const stmt = db.prepare(`
      INSERT INTO entries (user_id, name, type, amounts, created_at, updated_at) 
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)

    for (const entry of entries) {
      if (entry.name && entry.type && entry.amounts) {
        stmt.run(userId, entry.name, entry.type, JSON.stringify(entry.amounts))
      }
    }

    return NextResponse.json({ success: true, count: entries.length })
  } catch (error) {
    console.error("Save entries error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
