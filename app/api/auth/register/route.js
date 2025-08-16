import { NextResponse } from "next/server"
import { getDatabase, hashPassword } from "../../../../lib/database.js"
import { registerSchema } from "../../../../lib/validations.ts"
import { rateLimit, getClientIp } from "../../../../lib/rate-limit.ts"

export async function POST(request) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request)
    if (!rateLimit(`register_${clientIp}`, { maxRequests: 3, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      )
    }

    const { username, password } = validation.data

    const db = getDatabase()

    // Check if user already exists
    const existingUser = db.prepare("SELECT id FROM users WHERE username = ?").get(username)
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = hashPassword(password)

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
