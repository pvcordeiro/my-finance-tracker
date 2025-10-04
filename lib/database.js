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
            last_selected_group_id INTEGER,
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
            amounts TEXT, -- Will be removed after migration
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

        db.exec(initSQL, (err) => {
          if (err) {
            reject(err);
            return;
          }

          db.run(
            `ALTER TABLE bank_amounts ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`,
            (err) => {
              if (err && !err.message.includes("duplicate column name")) {
                console.error("Error adding user_id to bank_amounts:", err);
              }
            }
          );

          db.run(
            `ALTER TABLE entries ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`,
            (err) => {
              if (err && !err.message.includes("duplicate column name")) {
                console.error("Error adding user_id to entries:", err);
              }
            }
          );

          db.run(
            `ALTER TABLE users ADD COLUMN accent_color TEXT DEFAULT 'blue'`,
            (err) => {
              if (err && !err.message.includes("duplicate column name")) {
                console.error("Error adding accent_color to users:", err);
              }
            }
          );

          db.run(
            `ALTER TABLE users ADD COLUMN theme_preference TEXT DEFAULT 'system'`,
            (err) => {
              if (err && !err.message.includes("duplicate column name")) {
                console.error("Error adding theme_preference to users:", err);
              }
            }
          );

          db.run(`ALTER TABLE sessions ADD COLUMN user_agent TEXT`, (err) => {
            if (err && !err.message.includes("duplicate column name")) {
              console.error("Error adding user_agent to sessions:", err);
            }
          });

          db.run(`ALTER TABLE sessions ADD COLUMN ip_address TEXT`, (err) => {
            if (err && !err.message.includes("duplicate column name")) {
              console.error("Error adding ip_address to sessions:", err);
            }
          });

          db.run(`ALTER TABLE sessions ADD COLUMN device_name TEXT`, (err) => {
            if (err && !err.message.includes("duplicate column name")) {
              console.error("Error adding device_name to sessions:", err);
            }
          });

          const adminUsername = process.env.ADMIN_USERNAME;
          const adminPassword = process.env.ADMIN_PASSWORD;

          const ensureSettingsAndCleanup = () => {
            db.run(
              `INSERT OR IGNORE INTO settings (key, value) VALUES ('allow_registration', ?)`,
              [process.env.ALLOW_REGISTRATION || "true"],
              (err) => {
                if (err) {
                  reject(err);
                  return;
                }

                db.run(
                  `INSERT OR IGNORE INTO settings (key, value) VALUES ('enable_balance_history', 'false')`,
                  (err) => {
                    if (err) {
                      console.error(
                        "Error inserting enable_balance_history setting:",
                        err
                      );
                    }
                  }
                );

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
          };

          if (adminUsername && adminPassword) {
            db.get(
              `SELECT id FROM users WHERE is_admin = 1 LIMIT 1`,
              [],
              (err, existingAdmin) => {
                if (err) {
                  console.error("Error checking existing admin:", err);
                  ensureSettingsAndCleanup();
                  return;
                }

                if (existingAdmin) {
                  ensureSettingsAndCleanup();
                  return;
                }

                const hashedPassword = hashPassword(adminPassword);
                db.run(
                  `INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)`,
                  [adminUsername, hashedPassword],
                  function (err) {
                    if (err) {
                      console.error("Error creating initial admin user:", err);
                      ensureSettingsAndCleanup();
                      return;
                    }
                    const adminUserId = this.lastID;
                    const adminGroupName = "Admin Group";
                    db.run(
                      `INSERT INTO groups (name, created_by) VALUES (?, ?)`,
                      [adminGroupName, adminUserId],
                      function (err) {
                        if (err) {
                          console.error("Error creating admin group:", err);
                          ensureSettingsAndCleanup();
                          return;
                        }
                        const adminGroupId = this.lastID;
                        db.run(
                          `INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)`,
                          [adminUserId, adminGroupId],
                          (err) => {
                            if (err) {
                              console.error(
                                "Error assigning admin to group:",
                                err
                              );
                            }
                            console.log("Initial admin user created");
                            ensureSettingsAndCleanup();
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          } else {
            db.run(
              `INSERT OR IGNORE INTO settings (key, value) VALUES ('allow_registration', ?)`,
              [process.env.ALLOW_REGISTRATION || "true"],
              (err) => {
                if (err) {
                  reject(err);
                  return;
                }

                db.run(
                  `INSERT OR IGNORE INTO settings (key, value) VALUES ('enable_balance_history', 'false')`,
                  (err) => {
                    if (err) {
                      console.error(
                        "Error inserting enable_balance_history setting:",
                        err
                      );
                    }
                  }
                );

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
