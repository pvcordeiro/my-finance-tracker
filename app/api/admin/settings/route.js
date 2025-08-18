import { NextResponse } from "next/server"
import { getDatabase } from "../../../../lib/database.js"
import { settingsSchema } from "../../../../lib/validations.ts"

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
    const settings = db.prepare("SELECT key, value FROM settings").all()
    
    const settingsObj = {}
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value === 'true'
    })

    return NextResponse.json({ settings: settingsObj })
  } catch (error) {
    console.error("Get settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    const validation = settingsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid settings", details: validation.error.errors },
        { status: 400 }
      )
    }

    const db = getDatabase()
    
    // Update settings
    for (const [key, value] of Object.entries(validation.data)) {
      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(key, value.toString())
    }

    return NextResponse.json({ success: true, message: "Settings updated successfully" })
  } catch (error) {
    console.error("Update settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
