import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH =
  process.env.DATABASE_PATH || path.join(DB_DIR, "roomdash.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
  }
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT NOT NULL UNIQUE,
      nickname TEXT NOT NULL,
      official_seats INTEGER,
      max_seats INTEGER,
      av_equipment TEXT DEFAULT '[]',
      shelly_ip TEXT,
      outlook_email TEXT,
      is_vip INTEGER DEFAULT 0,
      is_bookable INTEGER DEFAULT 1,
      bookable_method TEXT DEFAULT 'outlook',
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checklist_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER REFERENCES rooms(id),
      checklist_date TEXT NOT NULL,
      step_checked INTEGER DEFAULT 0,
      step_prepped INTEGER DEFAULT 0,
      step_cycled INTEGER DEFAULT 0,
      checked_at TEXT,
      prepped_at TEXT,
      cycled_at TEXT,
      completed_by TEXT,
      notes TEXT,
      UNIQUE(room_id, checklist_date)
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER REFERENCES rooms(id),
      action_type TEXT NOT NULL,
      result TEXT NOT NULL,
      details TEXT,
      triggered_by_ip TEXT,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shelly_status (
      room_id INTEGER PRIMARY KEY REFERENCES rooms(id),
      is_online INTEGER DEFAULT 0,
      output_on INTEGER DEFAULT 0,
      watts REAL,
      voltage REAL,
      temperature_c REAL,
      last_polled TEXT,
      last_seen_online TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_room_id ON logs(room_id);
    CREATE INDEX IF NOT EXISTS idx_logs_action_type ON logs(action_type);
    CREATE INDEX IF NOT EXISTS idx_checklist_date ON checklist_entries(checklist_date);
  `);
}

export default getDb;
