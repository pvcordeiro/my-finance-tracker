import { NextResponse } from "next/server"
import { getDatabase } from "../../../../lib/database.js"
import { deleteUserSchema } from "../../../../lib/validations.ts"

function verifyAdmin(request) {
  const adminHeader = request.headers.get("x-admin-auth")
  const expectedAuth = Buffer.from(`${process.env.ADMIN_USERNAME}:${process.env.ADMIN_PASSWORD}`).toString('base64')
  return adminHeader === expectedAuth
}

export async function GET(request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDatabase()
    const users = db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.created_at,
        COUNT(e.id) as entry_count,
        MAX(e.updated_at) as last_activity
      FROM users u 
      LEFT JOIN entries e ON u.id = e.user_id 
      GROUP BY u.id, u.username, u.created_at
      ORDER BY u.created_at DESC
    `).all()

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    
    const validation = deleteUserSchema.safeParse({ userId })
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const db = getDatabase()
    
    // Delete user and all related data (cascading)
    const result = db.prepare("DELETE FROM users WHERE id = ?").run(validation.data.userId)
    
    if (result.changes === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
