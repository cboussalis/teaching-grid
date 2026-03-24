import { useMemo } from 'react'
import type { Staff, Module, AllocationWarning, WarningType } from '@/types'

interface StaffLoad {
  actual_load: number
  expected_load: number
  load_status: 'under' | 'balanced' | 'over'
}

interface ValidationContext {
  staff: Staff[]
  modules: Module[]
  allocations: Record<string, number>
  staffLoad: Record<number, StaffLoad>
}

interface CellValidation {
  warnings: AllocationWarning[]
  isValid: boolean
  canDrop: boolean
}

export function useAllocationValidation(context: ValidationContext | null) {
  // Generate warnings for a specific cell (module-staff combination)
  const validateCell = useMemo(() => {
    if (!context) return () => ({ warnings: [], isValid: true, canDrop: true })

    return (moduleId: number, staffId: number): CellValidation => {
      const warnings: AllocationWarning[] = []
      const module = context.modules.find(m => m.id === moduleId)
      const staffMember = context.staff.find(s => s.id === staffId)
      const key = `${moduleId}-${staffId}`
      const hours = context.allocations[key] || 0

      if (!module || !staffMember) {
        return { warnings: [], isValid: true, canDrop: true }
      }

      // Check if staff is on LOA (warning only - doesn't prevent allocation)
      if (staffMember.loa === 1 && hours > 0) {
        warnings.push({
          type: 'loa_conflict',
          message: `${staffMember.name} is on Leave of Absence`,
          severity: 'warning',
          staffId,
          moduleId
        })
      }

      // Check term availability
      if (module.term === 'MT' && staffMember.mt_available === 0 && hours > 0) {
        warnings.push({
          type: 'term_unavailable',
          message: `${staffMember.name} is not available in Michaelmas Term`,
          severity: 'error',
          staffId,
          moduleId
        })
      }

      if (module.term === 'HT' && staffMember.ht_available === 0 && hours > 0) {
        warnings.push({
          type: 'term_unavailable',
          message: `${staffMember.name} is not available in Hilary Term`,
          severity: 'error',
          staffId,
          moduleId
        })
      }

      // For FullYear modules, check both terms
      if (module.term === 'FullYear' && hours > 0) {
        if (staffMember.mt_available === 0) {
          warnings.push({
            type: 'term_unavailable',
            message: `${staffMember.name} is not available in Michaelmas Term (required for full-year module)`,
            severity: 'warning',
            staffId,
            moduleId
          })
        }
        if (staffMember.ht_available === 0) {
          warnings.push({
            type: 'term_unavailable',
            message: `${staffMember.name} is not available in Hilary Term (required for full-year module)`,
            severity: 'warning',
            staffId,
            moduleId
          })
        }
      }

      const isValid = !warnings.some(w => w.severity === 'error')
      // Only term availability blocks allocation, not LOA
      const canDrop = !(module.term === 'MT' && staffMember.mt_available === 0) &&
        !(module.term === 'HT' && staffMember.ht_available === 0)

      return { warnings, isValid, canDrop }
    }
  }, [context])

  // Generate all warnings for a staff member's overall load
  const validateStaffLoad = useMemo(() => {
    if (!context) return () => []

    return (staffId: number): AllocationWarning[] => {
      const warnings: AllocationWarning[] = []
      const load = context.staffLoad[staffId]
      const staffMember = context.staff.find(s => s.id === staffId)

      if (!load || !staffMember || load.expected_load === 0) return warnings

      if (load.load_status === 'over') {
        warnings.push({
          type: 'over_allocated',
          message: `${staffMember.name} is overloaded: ${load.actual_load.toFixed(1)}h / ${load.expected_load}h`,
          severity: 'warning',
          staffId
        })
      }

      if (load.load_status === 'under') {
        warnings.push({
          type: 'under_allocated',
          message: `${staffMember.name} is underloaded: ${load.actual_load.toFixed(1)}h / ${load.expected_load}h`,
          severity: 'info',
          staffId
        })
      }

      return warnings
    }
  }, [context])

  // Generate warnings for a module's allocation status
  const validateModule = useMemo(() => {
    if (!context) return () => []

    return (moduleId: number): AllocationWarning[] => {
      const warnings: AllocationWarning[] = []
      const module = context.modules.find(m => m.id === moduleId)

      if (!module) return warnings

      let totalHours = 0
      context.staff.forEach(s => {
        const key = `${moduleId}-${s.id}`
        totalHours += context.allocations[key] || 0
      })

      if (totalHours === 0) {
        warnings.push({
          type: 'unallocated_module',
          message: `${module.code} has no staff allocated`,
          severity: 'warning',
          moduleId
        })
      }

      return warnings
    }
  }, [context])

  // Get all warnings for the entire grid
  const getAllWarnings = useMemo(() => {
    if (!context) return () => []

    return (): AllocationWarning[] => {
      const warnings: AllocationWarning[] = []

      // Check all allocations
      context.modules.forEach(module => {
        context.staff.forEach(staff => {
          const cellWarnings = validateCell(module.id, staff.id)
          warnings.push(...cellWarnings.warnings)
        })
      })

      // Check staff load
      context.staff.forEach(staff => {
        warnings.push(...validateStaffLoad(staff.id))
      })

      // Check module allocation status
      context.modules.forEach(module => {
        warnings.push(...validateModule(module.id))
      })

      return warnings
    }
  }, [context, validateCell, validateStaffLoad, validateModule])

  // Check if a drop target is valid for a staff member
  const canDropStaff = useMemo(() => {
    if (!context) return () => true

    return (staffId: number, moduleId: number): boolean => {
      const module = context.modules.find(m => m.id === moduleId)
      const staffMember = context.staff.find(s => s.id === staffId)

      if (!module || !staffMember) return false

      // Only term unavailability blocks allocation (LOA is just a warning)
      if (module.term === 'MT' && staffMember.mt_available === 0) return false
      if (module.term === 'HT' && staffMember.ht_available === 0) return false

      return true
    }
  }, [context])

  return {
    validateCell,
    validateStaffLoad,
    validateModule,
    getAllWarnings,
    canDropStaff
  }
}
