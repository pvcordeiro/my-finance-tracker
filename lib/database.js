import { createRequire } from "module";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { cleanupExpiredSessions } from "./session.js";

const _require = createRequire(import.meta.url);

const dbPath = path.join(process.cwd(), "data", "finance.db");
let db = null;

export function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

export function getDatabase() {
  if (!db) {
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const { Database } = _require("bun:sqlite");
    db = new Database(dbPath);

    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");

    const initSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        last_selected_group_id INTEGER,
        language TEXT DEFAULT 'en',
        currency TEXT DEFAULT 'EUR',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (last_selected_group_id) REFERENCES groups (id)
      );

      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS user_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
        UNIQUE(user_id, group_id)
      );

      CREATE TABLE IF NOT EXISTS bank_amounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS entry_amounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL,
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        year INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES entries (id) ON DELETE CASCADE,
        UNIQUE(entry_id, month, year)
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS balance_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        old_amount DECIMAL(10,2) NOT NULL,
        new_amount DECIMAL(10,2) NOT NULL,
        delta DECIMAL(10,2) NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        current_group_id INTEGER,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (current_group_id) REFERENCES groups (id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS admin_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_entries_group_type ON entries(group_id, type);
      CREATE INDEX IF NOT EXISTS idx_bank_amounts_group ON bank_amounts(group_id);
      CREATE INDEX IF NOT EXISTS idx_bank_amounts_group_updated ON bank_amounts(group_id, updated_at);
      CREATE INDEX IF NOT EXISTS idx_balance_history_group ON balance_history(group_id);
      CREATE INDEX IF NOT EXISTS idx_balance_history_created ON balance_history(group_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_entry_amounts_entry ON entry_amounts(entry_id);
      CREATE INDEX IF NOT EXISTS idx_entry_amounts_date ON entry_amounts(year, month);
      CREATE INDEX IF NOT EXISTS idx_entry_amounts_entry_date ON entry_amounts(entry_id, year, month);
      CREATE INDEX IF NOT EXISTS idx_user_groups_user ON user_groups(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_groups_group ON user_groups(group_id);
    `;

    db.exec(initSQL);

    // Run migrations (ALTER TABLE silently ignores duplicate column errors)
    const migrations = [
      `ALTER TABLE bank_amounts ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`,
      `ALTER TABLE entries ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`,
      `ALTER TABLE users ADD COLUMN accent_color TEXT DEFAULT 'blue'`,
      `ALTER TABLE users ADD COLUMN theme_preference TEXT DEFAULT 'system'`,
      `ALTER TABLE sessions ADD COLUMN user_agent TEXT`,
      `ALTER TABLE sessions ADD COLUMN ip_address TEXT`,
      `ALTER TABLE sessions ADD COLUMN device_name TEXT`,
      `ALTER TABLE users ADD COLUMN privacy_mode BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE entry_amounts ADD COLUMN year INTEGER NOT NULL DEFAULT ${new Date().getFullYear()}`,
      `ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'`,
      `ALTER TABLE users ADD COLUMN currency TEXT DEFAULT 'EUR'`,
    ];

    for (const migration of migrations) {
      try {
        db.exec(migration);
      } catch (err) {
        if (!err.message.includes("duplicate column name")) {
          console.error("Migration error:", err.message);
        }
      }
    }

    // Seed default settings
    db.prepare(
      `INSERT OR IGNORE INTO settings (key, value) VALUES ('allow_registration', ?)`
    ).run(process.env.ALLOW_REGISTRATION || "true");

    db.prepare(
      `INSERT OR IGNORE INTO settings (key, value) VALUES ('enable_balance_history', ?)`
    ).run(process.env.ENABLE_BALANCE_HISTORY || "true");

    // Seed initial admin user if none exists
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "changeme";

    if (adminUsername && adminPassword) {
      const existingAdmin = db
        .prepare(`SELECT id FROM users WHERE is_admin = 1 LIMIT 1`)
        .get();

      if (!existingAdmin) {
        try {
          const hashedPassword = hashPassword(adminPassword);
          const adminResult = db
            .prepare(
              `INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)`
            )
            .run(adminUsername, hashedPassword);
          const adminUserId = adminResult.lastInsertRowid;

          const groupResult = db
            .prepare(
              `INSERT INTO groups (name, created_by) VALUES (?, ?)`
            )
            .run("Admin Group", adminUserId);
          const adminGroupId = groupResult.lastInsertRowid;

          db.prepare(
            `INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)`
          ).run(adminUserId, adminGroupId);

          console.log("Initial admin user created");
        } catch (err) {
          console.error("Error creating initial admin user:", err);
        }
      }
    }

    // Schedule session cleanup
    setTimeout(() => {
      try {
        cleanupExpiredSessions();
      } catch (error) {
        console.error("Session cleanup error:", error);
      }
    }, 1000);

    setInterval(() => {
      try {
        cleanupExpiredSessions();
      } catch (error) {
        console.error("Session cleanup error:", error);
      }
    }, 60 * 60 * 1000);

    console.log("Database initialized successfully at:", dbPath);
  }

  return db;
}

export function closeDatabase() {
  if (db) {
    try {
      db.close();
      db = null;
      console.log("Database connection closed");
    } catch (error) {
      console.error("Error closing database:", error);
    }
  }
}

if (!global.__db_cleanup_registered) {
  process.on("SIGINT", closeDatabase);
  process.on("SIGTERM", closeDatabase);
  global.__db_cleanup_registered = true;
}
