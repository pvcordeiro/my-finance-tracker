import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDatabase } from "../../../../lib/database.js"

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 })
    }

    if (password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 })
    }

    const db = getDatabase()

    // Check if user already exists
    const existingUser = db.prepare("SELECT id FROM users WHERE username = ?").get(username)
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 })
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const stmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    const result = stmt.run(username, hashedPassword)

    return NextResponse.json({
      user: { id: result.lastInsertRowid, username },
      message: "User created successfully",
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
