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
        email TEXT UNIQUE COLLATE NOCASE,
        pending_email TEXT UNIQUE COLLATE NOCASE,
        email_verified_at DATETIME,
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
        recurrent BOOLEAN NOT NULL DEFAULT FALSE,
        recurrence_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
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

      CREATE TABLE IF NOT EXISTS entry_occurrences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
        is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES entries (id) ON DELETE CASCADE,
        UNIQUE(entry_id, year, month)
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

      CREATE TABLE IF NOT EXISTS auth_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        purpose TEXT NOT NULL CHECK (purpose IN ('verify-email', 'password-reset')),
        target_email TEXT,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS rate_limits (
        bucket_key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at INTEGER NOT NULL
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
      CREATE INDEX IF NOT EXISTS idx_entry_occurrences_entry_date ON entry_occurrences(entry_id, year, month);
      CREATE INDEX IF NOT EXISTS idx_entry_occurrences_pending ON entry_occurrences(is_resolved, year, month);
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
      `ALTER TABLE users ADD COLUMN email TEXT`,
      `ALTER TABLE users ADD COLUMN pending_email TEXT`,
      `ALTER TABLE users ADD COLUMN email_verified_at DATETIME`,
      `ALTER TABLE auth_tokens ADD COLUMN target_email TEXT`,
      `ALTER TABLE entries ADD COLUMN recurrent BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE entries ADD COLUMN recurrence_amount DECIMAL(10,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE entry_occurrences ADD COLUMN is_dismissed BOOLEAN NOT NULL DEFAULT FALSE`,
    ];

    for (const migration of migrations) {
      try {
        db.exec(migration);
      } catch (err) {
        if (!err.message.includes("duplicate column name")) {
          console.error("Migration error:", err.message);
          throw err;
        }
      }
    }

    try {
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase ON users(email COLLATE NOCASE) WHERE email IS NOT NULL");
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pending_email_nocase ON users(pending_email COLLATE NOCASE) WHERE pending_email IS NOT NULL");
      db.exec(`
        UPDATE users SET pending_email = NULL
        WHERE pending_email IS NOT NULL
          AND (lower(pending_email) = lower(email) OR EXISTS (
            SELECT 1 FROM users AS other
            WHERE other.id < users.id
              AND (lower(other.email) = lower(users.pending_email)
                OR lower(other.pending_email) = lower(users.pending_email))
          ))
      `);
      db.exec(`
        DELETE FROM auth_tokens
        WHERE purpose = 'verify-email' AND target_email IS NULL
      `);
    } catch (err) {
      console.error("Recovery email indexes/data could not be initialized:", err.message);
      throw err;
    }

    // These indexes reference year, which is added by the migration above on
    // databases created by older releases. Keep them after migrations so an
    // existing SQLite database can initialize instead of failing at startup.
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_entry_amounts_date ON entry_amounts(year, month);
      CREATE INDEX IF NOT EXISTS idx_entry_amounts_entry_date ON entry_amounts(entry_id, year, month);
    `);

    // Preserve legacy monthly amounts and seed occurrence records as
    // unresolved: older databases did not store paid/received status, so age
    // alone must not be interpreted as proof that an amount was settled.
    try {
      db.prepare(`
          INSERT OR IGNORE INTO entry_occurrences
            (entry_id, year, month, amount, is_resolved, created_at, updated_at)
        SELECT
          ea.entry_id,
          ea.year,
          ea.month,
          ea.amount,
          0,
          COALESCE(ea.created_at, CURRENT_TIMESTAMP),
          COALESCE(ea.updated_at, CURRENT_TIMESTAMP)
        FROM entry_amounts ea
      `).run();

      // Earlier releases inferred "resolved" for many old, non-zero rows.
      // Since new resolutions zero the stored occurrence amount, recover those
      // ambiguous legacy rows as pending instead of hiding recorded amounts.
      db.prepare(`
        UPDATE entry_occurrences
        SET is_resolved = 0, updated_at = CURRENT_TIMESTAMP
        WHERE is_resolved = 1 AND amount != 0
      `).run();
    } catch (err) {
      console.error("Occurrence migration error:", err.message);
      throw err;
    }

    // Seed default settings
    db.prepare(
      `INSERT OR IGNORE INTO settings (key, value) VALUES ('allow_registration', ?)`
    ).run(process.env.ALLOW_REGISTRATION || "false");

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
