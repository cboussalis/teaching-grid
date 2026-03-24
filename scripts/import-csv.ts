/**
 * Import staff and modules from CSV files
 *
 * Usage:
 *   npx tsx scripts/import-csv.ts data/staff.csv data/modules.csv
 *
 * Staff CSV columns:
 *   name, abbrev, load, loa, mt_available, ht_available, notes
 *
 * Modules CSV columns:
 *   code, name, load, term, level, ects, notes
 *
 * See data/examples/ for sample files.
 */

import Database from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'

const dbPath = path.join(__dirname, '..', 'data', 'teaching.db')

// --- CSV parser ---

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() || ''
    })
    rows.push(row)
  }
  return rows
}

// --- Validation helpers ---

const VALID_TERMS = ['MT', 'HT', 'TT', 'FullYear']
const VALID_LEVELS = ['UG', 'MSc IP', 'ASDS', 'PhD']

function normaliseTerm(raw: string): string | null {
  const val = raw.trim()
  // Exact match (case-insensitive)
  const match = VALID_TERMS.find(t => t.toLowerCase() === val.toLowerCase())
  if (match) return match
  // Common alternatives
  const lower = val.toLowerCase()
  if (lower === 'michaelmas' || lower === 'autumn' || lower === 'fall') return 'MT'
  if (lower === 'hilary' || lower === 'spring') return 'HT'
  if (lower === 'trinity' || lower === 'summer') return 'TT'
  if (lower === 'full year' || lower === 'fullyear' || lower === 'full' || lower === 'annual') return 'FullYear'
  return null
}

function normaliseLevel(raw: string): string | null {
  const val = raw.trim()
  const match = VALID_LEVELS.find(l => l.toLowerCase() === val.toLowerCase())
  if (match) return match
  // Common alternatives
  const lower = val.toLowerCase()
  if (lower === 'undergraduate' || lower === 'undergrad') return 'UG'
  if (lower === 'msc' || lower === 'masters' || lower === 'msc ip') return 'MSc IP'
  if (lower === 'data science' || lower === 'data') return 'ASDS'
  if (lower === 'doctoral' || lower === 'phd') return 'PhD'
  return null
}

// --- Import functions ---

function importStaff(db: Database.Database, csvPath: string): number {
  console.log(`\n--- Importing Staff from ${csvPath} ---`)

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)

  if (rows.length === 0) {
    console.log('  No data rows found')
    return 0
  }

  // Check required columns
  const first = rows[0]
  if (!('name' in first) || !('abbrev' in first)) {
    console.error('  Error: staff CSV must have "name" and "abbrev" columns')
    console.error(`  Found columns: ${Object.keys(first).join(', ')}`)
    process.exit(1)
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO staff (name, abbrev, loa, mt_available, ht_available, expected_load, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  let count = 0
  let warnings = 0

  for (const row of rows) {
    if (!row.name || !row.abbrev) {
      console.log(`  Skipping row: missing name or abbrev`)
      warnings++
      continue
    }

    insert.run(
      row.name,
      row.abbrev,
      parseInt(row.loa) || 0,
      row.mt_available !== undefined ? (parseInt(row.mt_available) ?? 1) : 1,
      row.ht_available !== undefined ? (parseInt(row.ht_available) ?? 1) : 1,
      parseFloat(row.load) || 0,
      row.notes || null
    )
    count++
    console.log(`  + ${row.name} (${row.abbrev})`)
  }

  if (warnings > 0) console.log(`  ${warnings} row(s) skipped`)
  console.log(`  Imported ${count} staff members`)
  return count
}

function importModules(db: Database.Database, csvPath: string): number {
  console.log(`\n--- Importing Modules from ${csvPath} ---`)

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)

  if (rows.length === 0) {
    console.log('  No data rows found')
    return 0
  }

  // Check required columns
  const first = rows[0]
  if (!('code' in first) || !('name' in first)) {
    console.error('  Error: modules CSV must have "code" and "name" columns')
    console.error(`  Found columns: ${Object.keys(first).join(', ')}`)
    process.exit(1)
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO module (code, name, level, term, load, ects, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  let count = 0
  let warnings = 0

  for (const row of rows) {
    if (!row.code || !row.name) {
      console.log(`  Skipping row: missing code or name`)
      warnings++
      continue
    }

    // Validate term
    let term: string | null = null
    if (row.term) {
      term = normaliseTerm(row.term)
      if (!term) {
        console.log(`  Warning: "${row.term}" is not a valid term for ${row.code}, setting to null`)
        console.log(`    Valid terms: ${VALID_TERMS.join(', ')}`)
        warnings++
      }
    }

    // Validate level
    let level: string | null = null
    if (row.level) {
      level = normaliseLevel(row.level)
      if (!level) {
        console.log(`  Warning: "${row.level}" is not a valid level for ${row.code}, setting to null`)
        console.log(`    Valid levels: ${VALID_LEVELS.join(', ')}`)
        warnings++
      }
    }

    const load = parseFloat(row.load) || 1
    const ects = row.ects ? parseInt(row.ects) : null

    insert.run(
      row.code,
      row.name,
      level,
      term,
      load,
      ects,
      row.notes || null
    )
    count++
    console.log(`  + ${row.code} — ${row.name} (${level || '?'}, ${term || '?'}, load: ${load})`)
  }

  if (warnings > 0) console.log(`  ${warnings} warning(s)`)
  console.log(`  Imported ${count} modules`)
  return count
}

// --- Main ---

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Teaching Grid CSV Import

Usage:
  npx tsx scripts/import-csv.ts <staff.csv> <modules.csv>

Arguments:
  staff.csv     Path to staff CSV file
  modules.csv   Path to modules CSV file

Either file can be omitted to import just one type:
  npx tsx scripts/import-csv.ts data/staff.csv
  npx tsx scripts/import-csv.ts --modules data/modules.csv

Staff CSV columns (required: name, abbrev):
  name           Full name                          Jane Smith
  abbrev         Short abbreviation for the grid    JS
  load           Expected teaching load             3
  loa            Leave of absence (0 or 1)          0
  mt_available   Available Michaelmas Term (0/1)    1
  ht_available   Available Hilary Term (0/1)        1
  notes          Optional notes                     On research buyout

Modules CSV columns (required: code, name):
  code           Module code                        POL101
  name           Module name                        Intro to Politics
  load           Teaching load (default: 1)         1
  term           MT, HT, TT, or FullYear            HT
  level          UG, MSc IP, ASDS, or PhD           UG
  ects           ECTS credits                        5
  notes          Optional notes

See data/examples/ for sample files.
`)
    process.exit(0)
  }

  // Parse arguments
  let staffPath: string | null = null
  let modulesPath: string | null = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--modules' && args[i + 1]) {
      modulesPath = args[++i]
    } else if (args[i] === '--staff' && args[i + 1]) {
      staffPath = args[++i]
    } else if (!staffPath) {
      staffPath = args[i]
    } else if (!modulesPath) {
      modulesPath = args[i]
    }
  }

  // Validate files exist
  if (staffPath && !fs.existsSync(staffPath)) {
    console.error(`File not found: ${staffPath}`)
    process.exit(1)
  }
  if (modulesPath && !fs.existsSync(modulesPath)) {
    console.error(`File not found: ${modulesPath}`)
    process.exit(1)
  }

  if (!staffPath && !modulesPath) {
    console.error('No CSV files provided. Run with --help for usage.')
    process.exit(1)
  }

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // Open database
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  console.log('=== Teaching Grid CSV Import ===')
  console.log(`Database: ${dbPath}`)

  try {
    let staffCount = 0
    let moduleCount = 0

    if (staffPath) {
      staffCount = importStaff(db, staffPath)
    }
    if (modulesPath) {
      moduleCount = importModules(db, modulesPath)
    }

    // Summary
    console.log('\n=== Summary ===')
    if (staffPath) console.log(`  Staff imported: ${staffCount}`)
    if (modulesPath) console.log(`  Modules imported: ${moduleCount}`)

    const totalStaff = (db.prepare('SELECT COUNT(*) as c FROM staff').get() as { c: number }).c
    const totalModules = (db.prepare('SELECT COUNT(*) as c FROM module').get() as { c: number }).c
    console.log(`\n  Total staff in DB: ${totalStaff}`)
    console.log(`  Total modules in DB: ${totalModules}`)
    console.log('\nDone. Start the app with `npm run dev` and assign staff to modules in the grid.')
  } catch (error) {
    console.error('\nImport failed:', error)
    process.exit(1)
  } finally {
    db.close()
  }
}

main()
