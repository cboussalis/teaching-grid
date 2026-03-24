import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'teaching.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function initializeDatabase(): void {
  const db = getDb()

  // Create tables
  db.exec(`
    -- Staff members
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      abbrev TEXT UNIQUE NOT NULL,
      loa INTEGER DEFAULT 0,
      mt_available INTEGER DEFAULT 1,
      ht_available INTEGER DEFAULT 1,
      expected_load REAL DEFAULT 0,
      notes TEXT
    );

    -- Modules
    CREATE TABLE IF NOT EXISTS module (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      level TEXT CHECK(level IN ('UG', 'MSc IP', 'ASDS', 'PhD')),
      term TEXT CHECK(term IN ('MT', 'HT', 'TT', 'FullYear')),
      load REAL NOT NULL,
      ects INTEGER,
      notes TEXT
    );

    -- Teaching allocations (staff ↔ module)
    CREATE TABLE IF NOT EXISTS allocation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES module(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      load_hours REAL NOT NULL,
      UNIQUE(module_id, staff_id)
    );

    -- Service roles
    CREATE TABLE IF NOT EXISTS service_role (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT CHECK(category IN ('Dept', 'School')),
      staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
      term TEXT
    );

    -- Academic year tracking
    CREATE TABLE IF NOT EXISTS academic_year (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_label TEXT UNIQUE NOT NULL,
      is_current INTEGER DEFAULT 0
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_allocation_module ON allocation(module_id);
    CREATE INDEX IF NOT EXISTS idx_allocation_staff ON allocation(staff_id);
    CREATE INDEX IF NOT EXISTS idx_service_role_staff ON service_role(staff_id);
    CREATE INDEX IF NOT EXISTS idx_module_level ON module(level);
    CREATE INDEX IF NOT EXISTS idx_module_term ON module(term);
  `)

  // Insert default academic year if none exists
  const yearExists = db.prepare('SELECT COUNT(*) as count FROM academic_year').get() as { count: number }
  if (yearExists.count === 0) {
    db.prepare('INSERT INTO academic_year (year_label, is_current) VALUES (?, 1)').run('2026-27')
  }

  // Migration: Add ects column to module table if it doesn't exist
  const moduleColumns = db.prepare("PRAGMA table_info(module)").all() as { name: string }[]
  const hasEcts = moduleColumns.some(col => col.name === 'ects')
  if (!hasEcts) {
    db.exec('ALTER TABLE module ADD COLUMN ects INTEGER')
  }

  // Migration: Add rank and gender columns to staff table if they don't exist
  const staffColumns = db.prepare("PRAGMA table_info(staff)").all() as { name: string }[]
  if (!staffColumns.some(col => col.name === 'rank')) {
    db.exec("ALTER TABLE staff ADD COLUMN rank TEXT CHECK(rank IN ('Teaching Fellow','Assistant Prof','Associate Prof','Prof'))")
  }
  if (!staffColumns.some(col => col.name === 'gender')) {
    db.exec("ALTER TABLE staff ADD COLUMN gender TEXT CHECK(gender IN ('M','F'))")
  }
  if (!staffColumns.some(col => col.name === 'affiliation')) {
    db.exec("ALTER TABLE staff ADD COLUMN affiliation TEXT CHECK(affiliation IN ('External','Honorary'))")
  }

  // Communication tracking tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS communication (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL UNIQUE REFERENCES staff(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'not_started'
        CHECK(status IN ('not_started','email_sent','in_discussion','agreed','disputed')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS communication_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      communication_id INTEGER NOT NULL REFERENCES communication(id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_communication_staff ON communication(staff_id);
    CREATE INDEX IF NOT EXISTS idx_communication_log_comm ON communication_log(communication_id);
  `)
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
