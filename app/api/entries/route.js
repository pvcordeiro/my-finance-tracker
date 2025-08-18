import { NextResponse } from "next/server"
import { getDatabase } from "../../../lib/database.js"
import { entrySchema } from "../../../lib/validations.ts"
import { withAuth, getAuthenticatedUser } from "../../../lib/auth-middleware.js"

export const GET = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const userId = user.id;

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
})

export const POST = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const userId = user.id;
    
    const body = await request.json()
    const { entries } = body

    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: "Entries must be an array" }, { status: 400 })
    }

    // Validate each entry
    for (const entry of entries) {
      const validation = entrySchema.safeParse(entry)
      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid entry data", details: validation.error.errors },
          { status: 400 }
        )
      }
    }

    const db = getDatabase()

    // Clear existing entries for user
    db.prepare("DELETE FROM entries WHERE user_id = ?").run(userId)

    // Insert new entries
    const stmt = db.prepare(`
      INSERT INTO entries (user_id, name, type, amounts, created_at, updated_at) 
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)

    let insertedCount = 0
    for (const entry of entries) {
      if (entry.name && entry.type && entry.amounts) {
        stmt.run(userId, entry.name, entry.type, entry.amounts)
        insertedCount++
      }
    }

    return NextResponse.json({ success: true, count: insertedCount })
  } catch (error) {
    console.error("Save entries error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
