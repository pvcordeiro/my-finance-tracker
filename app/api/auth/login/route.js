import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDatabase } from "../../../../lib/database.js"

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 })
    }

    const db = getDatabase()
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // For demo purposes, allow simple password comparison
    const isValid = password === "demo" || (await bcrypt.compare(password, user.password_hash))

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    return NextResponse.json({
      user: { id: user.id, username: user.username },
      message: "Login successful",
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
