import { NextResponse } from "next/server"
import { getDatabase } from "../../../lib/database.js"
import { bankAmountSchema, userIdSchema } from "../../../lib/validations.ts"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdValidation = userIdSchema.safeParse({ userId: searchParams.get("userId") })
    
    if (!userIdValidation.success) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }
    
    const { userId } = userIdValidation.data

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
    const body = await request.json()
    
    // Validate input
    const validation = bankAmountSchema.safeParse({ amount: body.amount })
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid amount", details: validation.error.errors },
        { status: 400 }
      )
    }

    const userIdValidation = userIdSchema.safeParse({ userId: (body.userId || 1).toString() })
    if (!userIdValidation.success) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const { amount } = validation.data
    const { userId } = userIdValidation.data

    const db = getDatabase()

    // Insert new bank amount entry (keeping history)
    const stmt = db.prepare(`
      INSERT INTO bank_amounts (user_id, amount, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `)
    stmt.run(userId, amount)

    return NextResponse.json({ success: true, amount })
  } catch (error) {
    console.error("Save bank amount error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
