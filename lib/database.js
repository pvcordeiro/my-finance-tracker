import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { cleanupExpiredSessions } from "./session.js";

const dbPath = path.join(process.cwd(), "data", "finance.db");
let db = null;

export function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword);
}

export async function getDatabase() {
  if (!db) {
    return new Promise((resolve, reject) => {
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error("Database initialization error:", err);
          reject(err);
          return;
        }

        db.run("PRAGMA journal_mode = WAL");
        db.run("PRAGMA foreign_keys = ON");

        const initSQL = `
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS bank_amounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
            amounts TEXT, -- Will be removed after migration
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

          CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS admin_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_entries_user_type ON entries(user_id, type);
          CREATE INDEX IF NOT EXISTS idx_bank_amounts_user ON bank_amounts(user_id);
          CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
          CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
          CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
          CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
          CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
          CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
          CREATE INDEX IF NOT EXISTS idx_entry_amounts_entry ON entry_amounts(entry_id);
          CREATE INDEX IF NOT EXISTS idx_entry_amounts_date ON entry_amounts(year, month);
          CREATE INDEX IF NOT EXISTS idx_entry_amounts_entry_date ON entry_amounts(entry_id, year, month);
        `;

        db.exec(initSQL, (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Create initial admin user if environment variables are set
          const adminUsername = process.env.ADMIN_USERNAME;
          const adminPassword = process.env.ADMIN_PASSWORD;

          if (adminUsername && adminPassword) {
            const hashedPassword = hashPassword(adminPassword);
            db.run(
              `INSERT OR IGNORE INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)`,
              [adminUsername, hashedPassword, true],
              (err) => {
                if (err) {
                  console.error("Error creating initial admin user:", err);
                } else {
                  console.log("Initial admin user created or already exists");
                }

                // Continue with settings insertion
                db.run(
                  `INSERT OR IGNORE INTO settings (key, value) VALUES ('allow_registration', ?)`,
                  [process.env.ALLOW_REGISTRATION || "true"],
                  (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    setTimeout(async () => {
                      try {
                        await cleanupExpiredSessions();
                      } catch (error) {
                        console.error("Session cleanup error:", error);
                      }
                    }, 1000);

                    setInterval(async () => {
                      try {
                        await cleanupExpiredSessions();
                      } catch (error) {
                        console.error("Session cleanup error:", error);
                      }
                    }, 60 * 60 * 1000);

                    console.log(
                      "Database initialized successfully at:",
                      dbPath
                    );
                    resolve(db);
                  }
                );
              }
            );
          } else {
            // No admin credentials, continue with settings
            db.run(
              `INSERT OR IGNORE INTO settings (key, value) VALUES ('allow_registration', ?)`,
              [process.env.ALLOW_REGISTRATION || "true"],
              (err) => {
                if (err) {
                  reject(err);
                  return;
                }

                setTimeout(async () => {
                  try {
                    await cleanupExpiredSessions();
                  } catch (error) {
                    console.error("Session cleanup error:", error);
                  }
                }, 1000);

                setInterval(async () => {
                  try {
                    await cleanupExpiredSessions();
                  } catch (error) {
                    console.error("Session cleanup error:", error);
                  }
                }, 60 * 60 * 1000);

                console.log("Database initialized successfully at:", dbPath);
                resolve(db);
              }
            );
          }
        });
      });
    });
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

process.on("SIGINT", closeDatabase);
process.on("SIGTERM", closeDatabase);
