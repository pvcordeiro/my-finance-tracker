import { NextResponse } from "next/server"
import { getDatabase } from "../../../lib/database.js"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || 1 // Default to user 1 for demo

    const db = getDatabase()
    const bankAmount = db
      .prepare("SELECT amount FROM bank_amounts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1")
      .get(userId)

    return NextResponse.json({ amount: bankAmount?.amount || 0 })
  } catch (error) {
    console.error("Get bank amount error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { amount, userId = 1 } = await request.json()

    if (amount === undefined || amount === null) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 })
    }

    const db = getDatabase()

    // Insert or update bank amount
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO bank_amounts (user_id, amount, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `)

    stmt.run(userId, amount)

    return NextResponse.json({ success: true, amount })
  } catch (error) {
    console.error("Save bank amount error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
