import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDatabase } from "../../../../lib/database.js"
import { loginSchema } from "../../../../lib/validations.ts"
import { rateLimit, getClientIp } from "../../../../lib/rate-limit.ts"
import { createSession, getSessionCookieOptions, SESSION_COOKIE_NAME } from "../../../../lib/session.js"

export async function POST(request) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request)
    if (!rateLimit(clientIp, { maxRequests: 5, windowMs: 15 * 60 * 1000 })) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      )
    }

    const { username, password } = validation.data

    const db = getDatabase()
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Create session
    const sessionToken = createSession(user.id)

    // Create response with session cookie
    const response = NextResponse.json({
      user: { id: user.id, username: user.username },
      message: "Login successful",
    })

    // Set secure HTTP-only cookie
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions())

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
