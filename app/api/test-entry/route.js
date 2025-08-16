import { NextResponse } from "next/server"
import { getDatabase } from "../../../lib/database.js"

export async function POST(request) {
  try {
    const body = await request.json()
    console.log("Test endpoint received:", body)

    const db = getDatabase()
    
    // Try to insert a simple test entry
    const stmt = db.prepare(`
      INSERT INTO entries (user_id, name, type, amounts, created_at, updated_at) 
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
    
    const result = stmt.run(1, "Test Entry", "income", JSON.stringify([100, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
    console.log("Insert result:", result)

    return NextResponse.json({ success: true, id: result.lastInsertRowid })
  } catch (error) {
    console.error("Test endpoint error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
