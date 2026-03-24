/**
 * Import script for migrating data from last year's Excel/CSV files
 *
 * Usage:
 *   npx tsx scripts/import-excel.ts
 *
 * Files expected in ../last-year/:
 *   - staff_25-26.csv
 *   - PS_GRID_DRAFT1.xlsx
 *   - service_25-26.xlsx
 */

import Database from 'better-sqlite3'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

const dbPath = path.join(__dirname, '..', 'data', 'teaching.db')
const lastYearPath = path.join(__dirname, '..', '..', 'last-year')

// Ensure data directory exists
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Initialize tables
db.exec(`
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

  CREATE TABLE IF NOT EXISTS module (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    level TEXT CHECK(level IN ('UG', 'MSc IP', 'ASDS', 'PhD')),
    term TEXT CHECK(term IN ('MT', 'HT', 'TT', 'FullYear')),
    load REAL NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS allocation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL REFERENCES module(id) ON DELETE CASCADE,
    staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    load_hours REAL NOT NULL,
    UNIQUE(module_id, staff_id)
  );

  CREATE TABLE IF NOT EXISTS service_role (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT CHECK(category IN ('Dept', 'School')),
    staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    term TEXT
  );

  CREATE TABLE IF NOT EXISTS academic_year (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year_label TEXT UNIQUE NOT NULL,
    is_current INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_allocation_module ON allocation(module_id);
  CREATE INDEX IF NOT EXISTS idx_allocation_staff ON allocation(staff_id);
  CREATE INDEX IF NOT EXISTS idx_service_role_staff ON service_role(staff_id);
`)

// Insert academic year
const yearExists = db.prepare('SELECT COUNT(*) as count FROM academic_year').get() as { count: number }
if (yearExists.count === 0) {
  db.prepare('INSERT INTO academic_year (year_label, is_current) VALUES (?, 1)').run('2026-27')
}

// Helper to parse CSV
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n')
  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() || ''
    })
    rows.push(row)
  }
  return rows
}

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

// Import staff from CSV
function importStaff() {
  console.log('\n--- Importing Staff ---')
  const csvPath = path.join(lastYearPath, 'staff_25-26.csv')

  if (!fs.existsSync(csvPath)) {
    console.log('Staff CSV not found, skipping')
    return
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)

  const insertStaff = db.prepare(`
    INSERT OR REPLACE INTO staff (name, abbrev, loa, mt_available, ht_available, expected_load, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  let count = 0
  for (const row of rows) {
    if (!row.name || !row.name_abbrev) continue

    insertStaff.run(
      row.name,
      row.name_abbrev,
      parseInt(row.loa) || 0,
      parseInt(row.mt_available) ?? 1,
      parseInt(row.ht_available) ?? 1,
      parseFloat(row.load) || 0,
      row.notes || null
    )
    count++
    console.log(`  Added: ${row.name} (${row.name_abbrev})`)
  }

  console.log(`Imported ${count} staff members`)
}

// Import modules and allocations from Excel grid
function importModulesAndAllocations() {
  console.log('\n--- Importing Modules and Allocations from Grid ---')
  const xlsxPath = path.join(lastYearPath, 'PS_GRID_DRAFT1.xlsx')

  if (!fs.existsSync(xlsxPath)) {
    console.log('Grid Excel file not found, skipping')
    return
  }

  const workbook = XLSX.readFile(xlsxPath)

  // Process each sheet as a different level/category
  for (const sheetName of workbook.SheetNames) {
    console.log(`\nProcessing sheet: ${sheetName}`)
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 })

    if (data.length < 2) {
      console.log('  Sheet is empty or has no data rows')
      continue
    }

    // First row is headers - find staff abbreviations
    const headers = data[0] as string[]
    const staffStartCol = findStaffStartColumn(headers)

    if (staffStartCol === -1) {
      console.log('  Could not find staff columns')
      continue
    }

    // Determine level based on sheet name
    const level = determineLevel(sheetName)

    // Get staff abbreviations from headers
    const staffCols: { abbrev: string; col: number }[] = []
    for (let col = staffStartCol; col < headers.length; col++) {
      const abbrev = headers[col]?.toString().trim()
      if (abbrev && abbrev !== '' && !abbrev.toLowerCase().includes('total')) {
        staffCols.push({ abbrev, col })
      }
    }

    // Process module rows
    const insertModule = db.prepare(`
      INSERT OR IGNORE INTO module (code, name, level, term, load, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const insertAllocation = db.prepare(`
      INSERT OR IGNORE INTO allocation (module_id, staff_id, load_hours)
      VALUES (?, ?, ?)
    `)

    let moduleCount = 0
    let allocationCount = 0

    for (let row = 1; row < data.length; row++) {
      const rowData = data[row] as unknown[]
      if (!rowData || !rowData[0]) continue

      const moduleCode = rowData[0]?.toString().trim()
      const moduleName = rowData[1]?.toString().trim() || moduleCode

      if (!moduleCode || moduleCode.toLowerCase().includes('total')) continue

      // Determine term from code or data
      const term = determineTerm(moduleCode, rowData)

      // Calculate total load from allocations
      let totalLoad = 0
      for (const { col } of staffCols) {
        const value = rowData[col]
        if (value && typeof value === 'number') {
          totalLoad += value
        } else if (value && typeof value === 'string') {
          const num = parseFloat(value)
          if (!isNaN(num)) totalLoad += num
        }
      }

      // Default load if no allocations found
      if (totalLoad === 0) totalLoad = 1

      try {
        insertModule.run(moduleCode, moduleName, level, term, totalLoad, null)
        moduleCount++

        // Get the module ID
        const moduleRow = db.prepare('SELECT id FROM module WHERE code = ?').get(moduleCode) as { id: number } | undefined
        if (!moduleRow) continue

        // Insert allocations
        for (const { abbrev, col } of staffCols) {
          const value = rowData[col]
          let hours = 0

          if (value && typeof value === 'number') {
            hours = value
          } else if (value && typeof value === 'string') {
            const num = parseFloat(value)
            if (!isNaN(num)) hours = num
          }

          if (hours > 0) {
            // Find staff by abbreviation
            const staffRow = db.prepare('SELECT id FROM staff WHERE abbrev = ?').get(abbrev) as { id: number } | undefined
            if (staffRow) {
              insertAllocation.run(moduleRow.id, staffRow.id, hours)
              allocationCount++
            }
          }
        }
      } catch (e) {
        // Skip duplicates
      }
    }

    console.log(`  Imported ${moduleCount} modules, ${allocationCount} allocations from ${sheetName}`)
  }
}

function findStaffStartColumn(headers: string[]): number {
  // Look for common patterns that indicate start of staff columns
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]?.toString().toLowerCase() || ''
    // Staff columns typically start after module info columns
    if (i >= 2 && headers[i] && !['module', 'code', 'name', 'term', 'level', 'load', 'type'].some(x => h.includes(x))) {
      return i
    }
  }
  return 2 // Default to column 2
}

function determineLevel(sheetName: string): 'UG' | 'MSc IP' | 'ASDS' | 'PhD' {
  const name = sheetName.toLowerCase()
  if (name.includes('ug') || name.includes('undergrad')) return 'UG'
  if (name.includes('msc') || name.includes('ip')) return 'MSc IP'
  if (name.includes('asds') || name.includes('data')) return 'ASDS'
  if (name.includes('phd') || name.includes('doctoral')) return 'PhD'
  return 'UG' // Default
}

function determineTerm(code: string, rowData: unknown[]): 'MT' | 'HT' | 'TT' | 'FullYear' {
  const codeStr = code.toLowerCase()

  // Check code patterns
  if (codeStr.includes('mt') || codeStr.endsWith('1')) return 'MT'
  if (codeStr.includes('ht') || codeStr.endsWith('2')) return 'HT'
  if (codeStr.includes('tt') || codeStr.endsWith('3')) return 'TT'
  if (codeStr.includes('full') || codeStr.includes('year') || codeStr.endsWith('0')) return 'FullYear'

  // Check if there's a term column
  for (const cell of rowData) {
    const val = cell?.toString().toLowerCase() || ''
    if (val === 'mt' || val === 'michaelmas') return 'MT'
    if (val === 'ht' || val === 'hilary') return 'HT'
    if (val === 'tt' || val === 'trinity') return 'TT'
    if (val === 'full' || val === 'full year') return 'FullYear'
  }

  return 'MT' // Default
}

// Import service roles from Excel
function importServiceRoles() {
  console.log('\n--- Importing Service Roles ---')
  const xlsxPath = path.join(lastYearPath, 'service_25-26.xlsx')

  if (!fs.existsSync(xlsxPath)) {
    console.log('Service roles Excel file not found, skipping')
    return
  }

  const workbook = XLSX.readFile(xlsxPath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO service_role (name, category, staff_id, term)
    VALUES (?, ?, ?, ?)
  `)

  let count = 0
  for (const row of data) {
    // Try to find role name column
    const roleName = row['Role'] || row['role'] || row['Name'] || row['name'] || row['Service'] || Object.values(row)[0]
    if (!roleName || typeof roleName !== 'string') continue

    // Try to find category
    let category: 'Dept' | 'School' = 'Dept'
    const catVal = row['Category'] || row['category'] || row['Type'] || ''
    if (catVal?.toString().toLowerCase().includes('school')) {
      category = 'School'
    }

    // Try to find assigned staff
    let staffId: number | null = null
    const staffVal = row['Staff'] || row['staff'] || row['Assigned'] || row['assigned'] || ''
    if (staffVal) {
      const staffRow = db.prepare('SELECT id FROM staff WHERE abbrev = ? OR name LIKE ?').get(
        staffVal.toString(),
        `%${staffVal}%`
      ) as { id: number } | undefined
      if (staffRow) staffId = staffRow.id
    }

    // Try to find term
    const termVal = row['Term'] || row['term'] || ''

    try {
      insertRole.run(roleName.toString(), category, staffId, termVal?.toString() || null)
      count++
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log(`Imported ${count} service roles`)
}

// Main import function
async function main() {
  console.log('=== Teaching Grid Data Import ===')
  console.log(`Database: ${dbPath}`)
  console.log(`Source: ${lastYearPath}`)

  try {
    importStaff()
    importModulesAndAllocations()
    importServiceRoles()

    // Print summary
    console.log('\n=== Import Summary ===')
    const staffCount = (db.prepare('SELECT COUNT(*) as count FROM staff').get() as { count: number }).count
    const moduleCount = (db.prepare('SELECT COUNT(*) as count FROM module').get() as { count: number }).count
    const allocationCount = (db.prepare('SELECT COUNT(*) as count FROM allocation').get() as { count: number }).count
    const roleCount = (db.prepare('SELECT COUNT(*) as count FROM service_role').get() as { count: number }).count

    console.log(`Staff: ${staffCount}`)
    console.log(`Modules: ${moduleCount}`)
    console.log(`Allocations: ${allocationCount}`)
    console.log(`Service Roles: ${roleCount}`)

    console.log('\nImport complete!')
  } catch (error) {
    console.error('Import failed:', error)
    process.exit(1)
  } finally {
    db.close()
  }
}

main()
