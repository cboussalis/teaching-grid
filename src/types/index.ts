export type StaffRank = 'Teaching Fellow' | 'Assistant Prof' | 'Associate Prof' | 'Prof'
export type StaffGender = 'M' | 'F'
export type StaffAffiliation = 'External' | 'Honorary'

export interface Staff {
  id: number
  name: string
  abbrev: string
  loa: number
  mt_available: number
  ht_available: number
  expected_load: number
  notes: string | null
  rank: StaffRank | null
  gender: StaffGender | null
  affiliation: StaffAffiliation | null
}

export interface Module {
  id: number
  code: string
  name: string
  level: 'UG' | 'MSc IP' | 'ASDS' | 'PhD'
  term: 'MT' | 'HT' | 'TT' | 'FullYear'
  load: number
  ects: number | null
  notes: string | null
}

export interface Allocation {
  id: number
  module_id: number
  staff_id: number
  load_hours: number
}

export interface AllocationWithDetails extends Allocation {
  staff_name: string
  staff_abbrev: string
  module_code: string
  module_name: string
  module_term: 'MT' | 'HT' | 'TT' | 'FullYear'
  module_level?: 'UG' | 'MSc IP' | 'ASDS' | 'PhD'
}

export interface ServiceRole {
  id: number
  name: string
  category: 'Dept' | 'School'
  staff_id: number | null
  term: string | null
}

export interface ServiceRoleWithStaff extends ServiceRole {
  staff_name: string | null
  staff_abbrev: string | null
}

export interface AcademicYear {
  id: number
  year_label: string
  is_current: number
}

export interface StaffWithLoad extends Staff {
  actual_load: number
  load_status: 'under' | 'balanced' | 'over'
}

export interface ModuleWithAllocations extends Module {
  allocations: AllocationWithDetails[]
  allocated_hours: number
  allocation_status: 'full' | 'partial' | 'unallocated'
}

export interface DashboardStats {
  totalStaff: number
  totalModules: number
  unassignedModules: number
  loadWarnings: number
  currentYear: string
}

// Warning types for real-time validation
export type WarningType = 'loa_conflict' | 'term_unavailable' | 'over_allocated' | 'under_allocated' | 'unallocated_module'

export interface AllocationWarning {
  type: WarningType
  message: string
  severity: 'error' | 'warning' | 'info'
  staffId?: number
  moduleId?: number
}

// Clipboard data for copy/paste operations
export interface ClipboardData {
  moduleId: number
  allocations: { staffId: number; hours: number }[]
}

// Drag-and-drop types
export interface DraggedStaff {
  type: 'staff'
  staffId: number
  staffName: string
  staffAbbrev: string
  currentLoad: number
  expectedLoad: number
  loadStatus: 'under' | 'balanced' | 'over'
}

export interface DraggedAllocation {
  type: 'allocation'
  moduleId: number
  staffId: number
  hours: number
  moduleCode: string
  staffAbbrev: string
}

export type DragItem = DraggedStaff | DraggedAllocation

export interface DropTarget {
  moduleId: number
  staffId: number
  moduleCode: string
  moduleTerm: string
  moduleLoad: number
  currentHours: number
}

// History action for undo/redo
export type AllocationAction =
  | { type: 'set'; moduleId: number; staffId: number; oldHours: number; newHours: number }
  | { type: 'delete'; moduleId: number; staffId: number; oldHours: number }
  | { type: 'batch'; actions: AllocationAction[] }

export interface HistoryEntry {
  action: AllocationAction
  timestamp: number
}

// Batch operation types
export interface BatchAllocationOperation {
  operation: 'upsert' | 'delete'
  moduleId: number
  staffId: number
  hours?: number
}

// Grid summary stats
export interface GridSummaryStats {
  unallocatedModules: number
  overloadedStaff: number
  underloadedStaff: number
  totalAllocations: number
}

// Communication tracking
export type CommunicationStatus = 'not_started' | 'email_sent' | 'in_discussion' | 'agreed' | 'disputed'

export interface Communication {
  id: number
  staff_id: number
  status: CommunicationStatus
  updated_at: string
}

export interface CommunicationLog {
  id: number
  communication_id: number
  note: string
  created_at: string
}

export interface CommunicationWithStaff extends Communication {
  staff_name: string
  staff_abbrev: string
  staff_expected_load: number
  actual_load: number
  log_count: number
  latest_note: string | null
}

export interface CommunicationDetail extends CommunicationWithStaff {
  logs: CommunicationLog[]
  allocations: AllocationWithDetails[]
  service_roles: ServiceRoleWithStaff[]
}

export interface CommunicationStats {
  total: number
  not_started: number
  email_sent: number
  in_discussion: number
  agreed: number
  disputed: number
}
