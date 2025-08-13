import { NextResponse } from "next/server"
import { getDatabase } from "../../../../lib/database.js"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const db = getDatabase()
    const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Session validation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
