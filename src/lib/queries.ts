import { getDb } from './db'
import type {
  Staff,
  Module,
  Allocation,
  AllocationWithDetails,
  ServiceRole,
  ServiceRoleWithStaff,
  AcademicYear,
  StaffWithLoad,
  ModuleWithAllocations,
  DashboardStats,
  Communication,
  CommunicationLog,
  CommunicationWithStaff,
  CommunicationDetail,
  CommunicationStats,
  CommunicationStatus
} from '@/types'

// ============ Staff Queries ============

export function getAllStaff(): Staff[] {
  const db = getDb()
  return db.prepare('SELECT * FROM staff ORDER BY name').all() as Staff[]
}

export function getStaffById(id: number): Staff | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM staff WHERE id = ?').get(id) as Staff | undefined
}

export function getStaffWithLoad(): StaffWithLoad[] {
  const db = getDb()
  const staff = db.prepare(`
    SELECT
      s.*,
      COALESCE(SUM(a.load_hours), 0) as actual_load
    FROM staff s
    LEFT JOIN allocation a ON s.id = a.staff_id
    GROUP BY s.id
    ORDER BY s.name
  `).all() as (Staff & { actual_load: number })[]

  return staff.map(s => ({
    ...s,
    load_status: s.actual_load < s.expected_load * 0.9 ? 'under' :
                 s.actual_load > s.expected_load * 1.1 ? 'over' : 'balanced'
  }))
}

export function createStaff(staff: Omit<Staff, 'id'>): number {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO staff (name, abbrev, loa, mt_available, ht_available, expected_load, notes, rank, gender, affiliation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    staff.name,
    staff.abbrev,
    staff.loa,
    staff.mt_available,
    staff.ht_available,
    staff.expected_load,
    staff.notes,
    staff.rank,
    staff.gender,
    staff.affiliation
  )
  return result.lastInsertRowid as number
}

export function updateStaff(id: number, staff: Partial<Staff>): void {
  const db = getDb()
  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (staff.name !== undefined) { fields.push('name = ?'); values.push(staff.name) }
  if (staff.abbrev !== undefined) { fields.push('abbrev = ?'); values.push(staff.abbrev) }
  if (staff.loa !== undefined) { fields.push('loa = ?'); values.push(staff.loa) }
  if (staff.mt_available !== undefined) { fields.push('mt_available = ?'); values.push(staff.mt_available) }
  if (staff.ht_available !== undefined) { fields.push('ht_available = ?'); values.push(staff.ht_available) }
  if (staff.expected_load !== undefined) { fields.push('expected_load = ?'); values.push(staff.expected_load) }
  if (staff.notes !== undefined) { fields.push('notes = ?'); values.push(staff.notes) }
  if (staff.rank !== undefined) { fields.push('rank = ?'); values.push(staff.rank) }
  if (staff.gender !== undefined) { fields.push('gender = ?'); values.push(staff.gender) }
  if (staff.affiliation !== undefined) { fields.push('affiliation = ?'); values.push(staff.affiliation) }

  if (fields.length > 0) {
    values.push(id)
    db.prepare(`UPDATE staff SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }
}

export function deleteStaff(id: number): void {
  const db = getDb()
  db.prepare('DELETE FROM staff WHERE id = ?').run(id)
}

// ============ Module Queries ============

export function getAllModules(): Module[] {
  const db = getDb()
  return db.prepare('SELECT * FROM module ORDER BY code').all() as Module[]
}

export function getModuleById(id: number): Module | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM module WHERE id = ?').get(id) as Module | undefined
}

export function getModulesWithAllocations(filters?: { level?: string; term?: string }): ModuleWithAllocations[] {
  const db = getDb()

  let whereClause = ''
  const params: string[] = []

  if (filters?.level) {
    whereClause += ' WHERE m.level = ?'
    params.push(filters.level)
  }
  if (filters?.term) {
    whereClause += whereClause ? ' AND m.term = ?' : ' WHERE m.term = ?'
    params.push(filters.term)
  }

  const modules = db.prepare(`
    SELECT m.* FROM module m ${whereClause} ORDER BY m.code
  `).all(...params) as Module[]

  return modules.map(module => {
    const allocations = db.prepare(`
      SELECT
        a.*,
        s.name as staff_name,
        s.abbrev as staff_abbrev,
        m.code as module_code,
        m.name as module_name,
        m.term as module_term,
        m.level as module_level
      FROM allocation a
      JOIN staff s ON a.staff_id = s.id
      JOIN module m ON a.module_id = m.id
      WHERE a.module_id = ?
    `).all(module.id) as AllocationWithDetails[]

    const allocated_hours = allocations.reduce((sum, a) => sum + a.load_hours, 0)

    return {
      ...module,
      allocations,
      allocated_hours,
      allocation_status: allocated_hours === 0 ? 'unallocated' :
                        allocated_hours >= module.load ? 'full' : 'partial'
    }
  })
}

export function createModule(module: Omit<Module, 'id'>): number {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO module (code, name, level, term, load, ects, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    module.code,
    module.name,
    module.level,
    module.term,
    module.load,
    module.ects,
    module.notes
  )
  return result.lastInsertRowid as number
}

export function updateModule(id: number, module: Partial<Module>): void {
  const db = getDb()
  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (module.code !== undefined) { fields.push('code = ?'); values.push(module.code) }
  if (module.name !== undefined) { fields.push('name = ?'); values.push(module.name) }
  if (module.level !== undefined) { fields.push('level = ?'); values.push(module.level) }
  if (module.term !== undefined) { fields.push('term = ?'); values.push(module.term) }
  if (module.load !== undefined) { fields.push('load = ?'); values.push(module.load) }
  if (module.ects !== undefined) { fields.push('ects = ?'); values.push(module.ects) }
  if (module.notes !== undefined) { fields.push('notes = ?'); values.push(module.notes) }

  if (fields.length > 0) {
    values.push(id)
    db.prepare(`UPDATE module SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }
}

export function deleteModule(id: number): void {
  const db = getDb()
  db.prepare('DELETE FROM module WHERE id = ?').run(id)
}

// ============ Allocation Queries ============

export function getAllAllocations(): AllocationWithDetails[] {
  const db = getDb()
  return db.prepare(`
    SELECT
      a.*,
      s.name as staff_name,
      s.abbrev as staff_abbrev,
      m.code as module_code,
      m.name as module_name,
      m.term as module_term,
      m.level as module_level
    FROM allocation a
    JOIN staff s ON a.staff_id = s.id
    JOIN module m ON a.module_id = m.id
    ORDER BY m.code, s.name
  `).all() as AllocationWithDetails[]
}

export function getAllocationsForModule(moduleId: number): AllocationWithDetails[] {
  const db = getDb()
  return db.prepare(`
    SELECT
      a.*,
      s.name as staff_name,
      s.abbrev as staff_abbrev,
      m.code as module_code,
      m.name as module_name,
      m.term as module_term,
      m.level as module_level
    FROM allocation a
    JOIN staff s ON a.staff_id = s.id
    JOIN module m ON a.module_id = m.id
    WHERE a.module_id = ?
    ORDER BY s.name
  `).all(moduleId) as AllocationWithDetails[]
}

export function getAllocationsForStaff(staffId: number): AllocationWithDetails[] {
  const db = getDb()
  return db.prepare(`
    SELECT
      a.*,
      s.name as staff_name,
      s.abbrev as staff_abbrev,
      m.code as module_code,
      m.name as module_name,
      m.term as module_term,
      m.level as module_level
    FROM allocation a
    JOIN staff s ON a.staff_id = s.id
    JOIN module m ON a.module_id = m.id
    WHERE a.staff_id = ?
    ORDER BY m.code
  `).all(staffId) as AllocationWithDetails[]
}

export function createAllocation(allocation: Omit<Allocation, 'id'>): number {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO allocation (module_id, staff_id, load_hours)
    VALUES (?, ?, ?)
  `).run(allocation.module_id, allocation.staff_id, allocation.load_hours)
  return result.lastInsertRowid as number
}

export function updateAllocation(id: number, loadHours: number): void {
  const db = getDb()
  db.prepare('UPDATE allocation SET load_hours = ? WHERE id = ?').run(loadHours, id)
}

export function deleteAllocation(id: number): void {
  const db = getDb()
  db.prepare('DELETE FROM allocation WHERE id = ?').run(id)
}

export function deleteAllocationByModuleAndStaff(moduleId: number, staffId: number): void {
  const db = getDb()
  db.prepare('DELETE FROM allocation WHERE module_id = ? AND staff_id = ?').run(moduleId, staffId)
}

export function upsertAllocation(moduleId: number, staffId: number, loadHours: number): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO allocation (module_id, staff_id, load_hours)
    VALUES (?, ?, ?)
    ON CONFLICT(module_id, staff_id) DO UPDATE SET load_hours = excluded.load_hours
  `).run(moduleId, staffId, loadHours)
}

// Batch operations for efficient multi-allocation changes
export function batchUpsertAllocations(
  allocations: { moduleId: number; staffId: number; hours: number }[]
): void {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO allocation (module_id, staff_id, load_hours)
    VALUES (?, ?, ?)
    ON CONFLICT(module_id, staff_id) DO UPDATE SET load_hours = excluded.load_hours
  `)

  const transaction = db.transaction((items: typeof allocations) => {
    for (const item of items) {
      if (item.hours > 0) {
        stmt.run(item.moduleId, item.staffId, item.hours)
      }
    }
  })

  transaction(allocations)
}

export function batchDeleteAllocations(
  allocations: { moduleId: number; staffId: number }[]
): void {
  const db = getDb()
  const stmt = db.prepare('DELETE FROM allocation WHERE module_id = ? AND staff_id = ?')

  const transaction = db.transaction((items: typeof allocations) => {
    for (const item of items) {
      stmt.run(item.moduleId, item.staffId)
    }
  })

  transaction(allocations)
}

// ============ Service Role Queries ============

export function getAllServiceRoles(): ServiceRoleWithStaff[] {
  const db = getDb()
  return db.prepare(`
    SELECT
      sr.*,
      s.name as staff_name,
      s.abbrev as staff_abbrev
    FROM service_role sr
    LEFT JOIN staff s ON sr.staff_id = s.id
    ORDER BY sr.category, sr.name
  `).all() as ServiceRoleWithStaff[]
}

export function getServiceRoleById(id: number): ServiceRoleWithStaff | undefined {
  const db = getDb()
  return db.prepare(`
    SELECT
      sr.*,
      s.name as staff_name,
      s.abbrev as staff_abbrev
    FROM service_role sr
    LEFT JOIN staff s ON sr.staff_id = s.id
    WHERE sr.id = ?
  `).get(id) as ServiceRoleWithStaff | undefined
}

export function createServiceRole(role: Omit<ServiceRole, 'id'>): number {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO service_role (name, category, staff_id, term)
    VALUES (?, ?, ?, ?)
  `).run(role.name, role.category, role.staff_id, role.term)
  return result.lastInsertRowid as number
}

export function updateServiceRole(id: number, role: Partial<ServiceRole>): void {
  const db = getDb()
  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (role.name !== undefined) { fields.push('name = ?'); values.push(role.name) }
  if (role.category !== undefined) { fields.push('category = ?'); values.push(role.category) }
  if (role.staff_id !== undefined) { fields.push('staff_id = ?'); values.push(role.staff_id) }
  if (role.term !== undefined) { fields.push('term = ?'); values.push(role.term) }

  if (fields.length > 0) {
    values.push(id)
    db.prepare(`UPDATE service_role SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }
}

export function deleteServiceRole(id: number): void {
  const db = getDb()
  db.prepare('DELETE FROM service_role WHERE id = ?').run(id)
}

// ============ Academic Year Queries ============

export function getCurrentAcademicYear(): AcademicYear | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM academic_year WHERE is_current = 1').get() as AcademicYear | undefined
}

export function getAllAcademicYears(): AcademicYear[] {
  const db = getDb()
  return db.prepare('SELECT * FROM academic_year ORDER BY year_label DESC').all() as AcademicYear[]
}

export function setCurrentAcademicYear(id: number): void {
  const db = getDb()
  db.prepare('UPDATE academic_year SET is_current = 0').run()
  db.prepare('UPDATE academic_year SET is_current = 1 WHERE id = ?').run(id)
}

export function createAcademicYear(yearLabel: string): number {
  const db = getDb()
  const result = db.prepare('INSERT INTO academic_year (year_label, is_current) VALUES (?, 0)').run(yearLabel)
  return result.lastInsertRowid as number
}

// ============ Dashboard Stats ============

export function getDashboardStats(): DashboardStats {
  const db = getDb()

  const totalStaff = (db.prepare('SELECT COUNT(*) as count FROM staff').get() as { count: number }).count
  const totalModules = (db.prepare('SELECT COUNT(*) as count FROM module').get() as { count: number }).count

  const unassignedModules = (db.prepare(`
    SELECT COUNT(*) as count FROM module m
    WHERE NOT EXISTS (SELECT 1 FROM allocation a WHERE a.module_id = m.id)
  `).get() as { count: number }).count

  // Count staff with load imbalance (>10% off target)
  const loadWarnings = (db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT
        s.id,
        s.expected_load,
        COALESCE(SUM(a.load_hours), 0) as actual_load
      FROM staff s
      LEFT JOIN allocation a ON s.id = a.staff_id
      WHERE s.expected_load > 0
      GROUP BY s.id
      HAVING ABS(actual_load - expected_load) > expected_load * 0.1
    )
  `).get() as { count: number }).count

  const currentYear = getCurrentAcademicYear()

  return {
    totalStaff,
    totalModules,
    unassignedModules,
    loadWarnings,
    currentYear: currentYear?.year_label || 'Unknown'
  }
}

// ============ Grid Data ============

export function getGridData(filters?: { level?: string; term?: string }): {
  staff: Staff[];
  modules: Module[];
  allocations: Map<string, number>; // key: `${moduleId}-${staffId}`, value: load_hours
} {
  const db = getDb()

  let moduleWhereClause = ''
  const params: string[] = []

  if (filters?.level) {
    moduleWhereClause += ' WHERE level = ?'
    params.push(filters.level)
  }
  if (filters?.term) {
    moduleWhereClause += moduleWhereClause ? ' AND term = ?' : ' WHERE term = ?'
    params.push(filters.term)
  }

  const staff = db.prepare('SELECT * FROM staff ORDER BY abbrev').all() as Staff[]
  const modules = db.prepare(`SELECT * FROM module ${moduleWhereClause} ORDER BY code`).all(...params) as Module[]

  const allocationsRaw = db.prepare('SELECT module_id, staff_id, load_hours FROM allocation').all() as Allocation[]
  const allocations = new Map<string, number>()
  allocationsRaw.forEach(a => {
    allocations.set(`${a.module_id}-${a.staff_id}`, a.load_hours)
  })

  return { staff, modules, allocations }
}

// ============ Reports ============

export function getStaffWorkloadReport(): {
  staff: Staff;
  teachingLoad: number;
  serviceRoles: ServiceRole[];
  allocations: AllocationWithDetails[];
}[] {
  const db = getDb()
  const staff = getAllStaff()

  return staff.map(s => {
    const allocations = getAllocationsForStaff(s.id)
    const teachingLoad = allocations.reduce((sum, a) => sum + a.load_hours, 0)
    const serviceRoles = db.prepare(`
      SELECT * FROM service_role WHERE staff_id = ?
    `).all(s.id) as ServiceRole[]

    return {
      staff: s,
      teachingLoad,
      serviceRoles,
      allocations
    }
  })
}

export function getSupervisionStats(): {
  capstone: { staff_id: number; abbrev: string }[];
  mscDissertation: { staff_id: number; abbrev: string }[];
  asdsDissertation: { staff_id: number; abbrev: string }[];
} {
  const db = getDb()
  const capstone = db.prepare(`
    SELECT DISTINCT a.staff_id, s.abbrev
    FROM allocation a
    JOIN staff s ON s.id = a.staff_id
    JOIN module m ON m.id = a.module_id
    WHERE m.code = 'POU44000'
    ORDER BY s.abbrev
  `).all() as { staff_id: number; abbrev: string }[]

  const mscDissertation = db.prepare(`
    SELECT DISTINCT a.staff_id, s.abbrev
    FROM allocation a
    JOIN staff s ON s.id = a.staff_id
    JOIN module m ON m.id = a.module_id
    WHERE m.code = 'POP88200'
    ORDER BY s.abbrev
  `).all() as { staff_id: number; abbrev: string }[]

  const asdsDissertation = db.prepare(`
    SELECT DISTINCT a.staff_id, s.abbrev
    FROM allocation a
    JOIN staff s ON s.id = a.staff_id
    JOIN module m ON m.id = a.module_id
    WHERE m.code = 'POP77100'
    ORDER BY s.abbrev
  `).all() as { staff_id: number; abbrev: string }[]

  return { capstone, mscDissertation, asdsDissertation }
}

export function getWarningsReport(): {
  type: string;
  message: string;
  staffId?: number;
  moduleId?: number;
}[] {
  const db = getDb()
  const warnings: { type: string; message: string; staffId?: number; moduleId?: number }[] = []

  // Staff allocated to modules in terms they're unavailable for
  const termConflicts = db.prepare(`
    SELECT s.id, s.name, s.abbrev, m.code, m.term
    FROM staff s
    JOIN allocation a ON s.id = a.staff_id
    JOIN module m ON a.module_id = m.id
    WHERE (s.mt_available = 0 AND m.term = 'MT')
       OR (s.ht_available = 0 AND m.term = 'HT')
  `).all() as { id: number; name: string; abbrev: string; code: string; term: string }[]

  termConflicts.forEach(c => {
    warnings.push({
      type: 'Term Unavailable',
      message: `${c.name} (${c.abbrev}) is allocated to ${c.code} but unavailable for ${c.term}`,
      staffId: c.id
    })
  })

  // Load imbalances
  const loadImbalances = db.prepare(`
    SELECT
      s.id, s.name, s.abbrev, s.expected_load,
      COALESCE(SUM(a.load_hours), 0) as actual_load
    FROM staff s
    LEFT JOIN allocation a ON s.id = a.staff_id
    WHERE s.expected_load > 0
    GROUP BY s.id
    HAVING ABS(actual_load - expected_load) > expected_load * 0.1
  `).all() as { id: number; name: string; abbrev: string; expected_load: number; actual_load: number }[]

  loadImbalances.forEach(s => {
    const diff = s.actual_load - s.expected_load
    const status = diff > 0 ? 'overloaded' : 'underloaded'
    warnings.push({
      type: 'Load Imbalance',
      message: `${s.name} (${s.abbrev}) is ${status}: ${s.actual_load.toFixed(1)}h vs expected ${s.expected_load.toFixed(1)}h`,
      staffId: s.id
    })
  })

  // Unallocated modules
  const unallocated = db.prepare(`
    SELECT m.id, m.code, m.name
    FROM module m
    WHERE NOT EXISTS (SELECT 1 FROM allocation a WHERE a.module_id = m.id)
  `).all() as { id: number; code: string; name: string }[]

  unallocated.forEach(m => {
    warnings.push({
      type: 'Unallocated Module',
      message: `${m.code} - ${m.name} has no staff allocated`,
      moduleId: m.id
    })
  })

  return warnings
}

// ============ Communication Queries ============

export function getAllCommunications(): CommunicationWithStaff[] {
  const db = getDb()
  return db.prepare(`
    SELECT
      c.id, c.staff_id, c.status, c.updated_at,
      s.name as staff_name,
      s.abbrev as staff_abbrev,
      s.expected_load as staff_expected_load,
      COALESCE(al.total_load, 0) as actual_load,
      COALESCE(lg.log_count, 0) as log_count,
      lg.latest_note
    FROM communication c
    JOIN staff s ON c.staff_id = s.id
    LEFT JOIN (
      SELECT staff_id, SUM(load_hours) as total_load
      FROM allocation GROUP BY staff_id
    ) al ON al.staff_id = c.staff_id
    LEFT JOIN (
      SELECT
        communication_id,
        COUNT(*) as log_count,
        (SELECT note FROM communication_log cl2
         WHERE cl2.communication_id = communication_log.communication_id
         ORDER BY cl2.created_at DESC LIMIT 1) as latest_note
      FROM communication_log
      GROUP BY communication_id
    ) lg ON lg.communication_id = c.id
    ORDER BY s.name
  `).all() as CommunicationWithStaff[]
}

export function getCommunicationByStaffId(staffId: number): CommunicationDetail | undefined {
  const db = getDb()

  const comm = db.prepare(`
    SELECT
      c.id, c.staff_id, c.status, c.updated_at,
      s.name as staff_name,
      s.abbrev as staff_abbrev,
      s.expected_load as staff_expected_load,
      COALESCE(al.total_load, 0) as actual_load,
      0 as log_count,
      NULL as latest_note
    FROM communication c
    JOIN staff s ON c.staff_id = s.id
    LEFT JOIN (
      SELECT staff_id, SUM(load_hours) as total_load
      FROM allocation GROUP BY staff_id
    ) al ON al.staff_id = c.staff_id
    WHERE c.staff_id = ?
  `).get(staffId) as CommunicationWithStaff | undefined

  if (!comm) return undefined

  const logs = db.prepare(`
    SELECT * FROM communication_log
    WHERE communication_id = ?
    ORDER BY created_at DESC
  `).all(comm.id) as CommunicationLog[]

  const allocations = getAllocationsForStaff(staffId)

  const service_roles = db.prepare(`
    SELECT sr.*, s.name as staff_name, s.abbrev as staff_abbrev
    FROM service_role sr
    LEFT JOIN staff s ON sr.staff_id = s.id
    WHERE sr.staff_id = ?
    ORDER BY sr.name
  `).all(staffId) as ServiceRoleWithStaff[]

  return {
    ...comm,
    log_count: logs.length,
    latest_note: logs.length > 0 ? logs[0].note : null,
    logs,
    allocations,
    service_roles
  }
}

export function ensureCommunicationExists(staffId: number): Communication {
  const db = getDb()
  db.prepare(`
    INSERT OR IGNORE INTO communication (staff_id) VALUES (?)
  `).run(staffId)

  return db.prepare(`
    SELECT * FROM communication WHERE staff_id = ?
  `).get(staffId) as Communication
}

export function initializeAllCommunications(): number {
  const db = getDb()
  const result = db.prepare(`
    INSERT OR IGNORE INTO communication (staff_id)
    SELECT id FROM staff WHERE id NOT IN (SELECT staff_id FROM communication)
  `).run()
  return result.changes
}

export function updateCommunicationStatus(staffId: number, status: CommunicationStatus): void {
  const db = getDb()
  db.prepare(`
    UPDATE communication SET status = ?, updated_at = datetime('now')
    WHERE staff_id = ?
  `).run(status, staffId)
}

export function addCommunicationLog(communicationId: number, note: string): CommunicationLog {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO communication_log (communication_id, note) VALUES (?, ?)
  `).run(communicationId, note)

  // Also touch the communication updated_at
  db.prepare(`
    UPDATE communication SET updated_at = datetime('now') WHERE id = ?
  `).run(communicationId)

  return db.prepare(`
    SELECT * FROM communication_log WHERE id = ?
  `).get(result.lastInsertRowid) as CommunicationLog
}

export function deleteCommunicationLog(logId: number): void {
  const db = getDb()
  db.prepare('DELETE FROM communication_log WHERE id = ?').run(logId)
}

export function getCommunicationStats(): CommunicationStats {
  const db = getDb()

  const totalStaff = (db.prepare('SELECT COUNT(*) as count FROM staff').get() as { count: number }).count

  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM communication GROUP BY status
  `).all() as { status: CommunicationStatus; count: number }[]

  const counts: Record<string, number> = {}
  let trackedTotal = 0
  for (const row of statusCounts) {
    counts[row.status] = row.count
    trackedTotal += row.count
  }

  return {
    total: totalStaff,
    not_started: (counts['not_started'] || 0) + (totalStaff - trackedTotal),
    email_sent: counts['email_sent'] || 0,
    in_discussion: counts['in_discussion'] || 0,
    agreed: counts['agreed'] || 0,
    disputed: counts['disputed'] || 0
  }
}
