"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Grid3X3, List, X, AlertCircle, Copy, UserPlus, AlertTriangle, User, GraduationCap, ArrowLeft, ExternalLink, Pencil, Plus, ChevronUp, ChevronDown, Filter } from "lucide-react"
import { getUGYear, getYearLabel } from "@/lib/module-utils"
import type { Staff, Module, DragItem, DropTarget, GridSummaryStats, ClipboardData } from "@/types"

// Grid components
import {
  GridDndProvider,
  StaffPoolSidebar,
  GridSummary,
  GridFilters,
  StaffLoadBar,
  KeyboardShortcutsDialog,
} from "@/components/grid"

// Hooks
import { useAllocationValidation } from "@/hooks/useAllocationValidation"
import { useAllocationHistory, invertAction } from "@/hooks/useAllocationHistory"
import { useGridShortcuts } from "@/hooks/useGridShortcuts"
import { useClipboard } from "@/hooks/useClipboard"

const LEVELS = ["All", "UG", "MSc IP", "ASDS", "PhD"] as const
const TERMS = ["All", "MT", "HT", "TT", "FullYear"] as const

interface GridData {
  staff: Staff[]
  modules: Module[]
  allModules: Module[]
  allocations: Record<string, number>
  staffLoad: Record<number, { actual_load: number; expected_load: number; load_status: string }>
}

export default function GridPage() {
  const [data, setData] = useState<GridData | null>(null)
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState<string>("All")
  const [termFilter, setTermFilter] = useState<string>("All")
  const [view, setView] = useState<"grid" | "module" | "staff" | "year" | "pg">("staff")

  // Search filters
  const [staffSearch, setStaffSearch] = useState("")
  const [moduleSearch, setModuleSearch] = useState("")
  const staffSearchRef = useRef<HTMLInputElement>(null)
  const moduleSearchRef = useRef<HTMLInputElement>(null)

  // Quick filters
  const [showOverloaded, setShowOverloaded] = useState(false)
  const [showUnderloaded, setShowUnderloaded] = useState(false)
  const [showUnallocatedOnly, setShowUnallocatedOnly] = useState(false)

  // Per-module/staff/year view state
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(1)
  const [selectedPGLevel, setSelectedPGLevel] = useState<"MSc IP" | "ASDS" | "PhD">("MSc IP")

  // Sort state for year and PG views
  const [yearViewSort, setYearViewSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'code', direction: 'asc' })
  const [pgViewSort, setPgViewSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'code', direction: 'asc' })

  // Assignment filter for year and PG views
  const [yearAssignmentFilter, setYearAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all")
  const [pgAssignmentFilter, setPgAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all")

  // Navigation history for back navigation
  const [previousView, setPreviousView] = useState<{ view: "grid" | "module" | "staff" | "year" | "pg"; year?: number } | null>(null)

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ moduleId: number; staffId: number } | null>(null)
  const [editValue, setEditValue] = useState("")
  const editInputRef = useRef<HTMLInputElement>(null)

  // Dialog for drop operations (to enter hours)
  const [dropDialogOpen, setDropDialogOpen] = useState(false)
  const [pendingDrop, setPendingDrop] = useState<{
    staffId: number
    moduleId: number
    staffName: string
    moduleName: string
    defaultHours: number
  } | null>(null)
  const [dropHours, setDropHours] = useState("")

  // Keyboard shortcuts help dialog
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)

  // Add module dialog state (for Per-Year view)
  const [addModuleDialogOpen, setAddModuleDialogOpen] = useState(false)
  const [addModuleFormData, setAddModuleFormData] = useState({
    code: "",
    name: "",
    level: "UG" as "UG" | "MSc IP" | "ASDS" | "PhD",
    term: "MT" as "MT" | "HT" | "TT" | "FullYear",
    load: 0,
    notes: "",
  })
  const [addModuleError, setAddModuleError] = useState<string | null>(null)
  const [addModuleDialogYear, setAddModuleDialogYear] = useState<number | null>(null)

  // Staff assignment modal state
  const [staffAssignDialogOpen, setStaffAssignDialogOpen] = useState(false)
  const [staffAssignModule, setStaffAssignModule] = useState<Module | null>(null)

  // Custom hooks
  const history = useAllocationHistory()
  const clipboard = useClipboard()
  const validation = useAllocationValidation(data ? {
    staff: data.staff,
    modules: data.modules,
    allocations: data.allocations,
    staffLoad: data.staffLoad as Record<number, { actual_load: number; expected_load: number; load_status: 'under' | 'balanced' | 'over' }>
  } : null)

  // Fetch data
  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (levelFilter !== "All") params.set("level", levelFilter)
    if (termFilter !== "All") params.set("term", termFilter)

    const res = await fetch(`/api/grid?${params}`)
    const result = await res.json()
    setData(result)
    setLoading(false)
  }, [levelFilter, termFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Focus edit input when editing
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingCell])

  // Helper functions
  function getAllocationKey(moduleId: number, staffId: number) {
    return `${moduleId}-${staffId}`
  }

  function getAllocation(moduleId: number, staffId: number): number {
    if (!data) return 0
    return data.allocations[getAllocationKey(moduleId, staffId)] || 0
  }

  function getModuleAllocatedHours(moduleId: number): number {
    if (!data) return 0
    let total = 0
    data.staff.forEach((s) => {
      total += getAllocation(moduleId, s.id)
    })
    return total
  }

  // Sort helper for module tables
  const sortModules = useCallback((modules: Module[], sort: { column: string; direction: 'asc' | 'desc' }) => {
    return [...modules].sort((a, b) => {
      let aVal: string | number, bVal: string | number
      switch (sort.column) {
        case 'code':
          aVal = a.code; bVal = b.code
          break
        case 'name':
          aVal = a.name; bVal = b.name
          break
        case 'term':
          // Sort MT < HT < TT < FullYear
          const termOrder: Record<string, number> = { 'MT': 1, 'HT': 2, 'TT': 3, 'FullYear': 4 }
          aVal = termOrder[a.term] || 5; bVal = termOrder[b.term] || 5
          break
        case 'load':
          aVal = getModuleAllocatedHours(a.id) / a.load
          bVal = getModuleAllocatedHours(b.id) / b.load
          break
        default:
          return 0
      }
      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data])

  // Optimistic update helper
  const updateAllocationLocally = useCallback((moduleId: number, staffId: number, hours: number) => {
    setData(prev => {
      if (!prev) return prev
      const key = getAllocationKey(moduleId, staffId)
      const newAllocations = { ...prev.allocations }

      if (hours > 0) {
        newAllocations[key] = hours
      } else {
        delete newAllocations[key]
      }

      // Recalculate staff load
      const newStaffLoad = { ...prev.staffLoad }
      const staff = prev.staff.find(s => s.id === staffId)
      if (staff) {
        let totalLoad = 0
        Object.entries(newAllocations).forEach(([k, v]) => {
          if (k.endsWith(`-${staffId}`)) {
            totalLoad += v
          }
        })
        newStaffLoad[staffId] = {
          actual_load: totalLoad,
          expected_load: staff.expected_load,
          load_status: totalLoad < staff.expected_load * 0.9 ? 'under' :
                       totalLoad > staff.expected_load * 1.1 ? 'over' : 'balanced'
        }
      }

      return { ...prev, allocations: newAllocations, staffLoad: newStaffLoad }
    })
  }, [])

  // Save allocation to server
  const saveAllocation = useCallback(async (
    moduleId: number,
    staffId: number,
    hours: number,
    oldHours: number
  ) => {
    // Optimistic update
    updateAllocationLocally(moduleId, staffId, hours)

    // Track in history
    if (hours !== oldHours) {
      if (hours > 0) {
        history.pushAction({
          type: 'set',
          moduleId,
          staffId,
          oldHours,
          newHours: hours
        })
      } else {
        history.pushAction({
          type: 'delete',
          moduleId,
          staffId,
          oldHours
        })
      }
    }

    try {
      if (hours > 0) {
        await fetch("/api/allocations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module_id: moduleId,
            staff_id: staffId,
            load_hours: hours,
            upsert: true,
          }),
        })
      } else {
        await fetch(
          `/api/allocations?module_id=${moduleId}&staff_id=${staffId}`,
          { method: "DELETE" }
        )
      }
    } catch (error) {
      console.error("Failed to save allocation:", error)
      // Revert on error
      updateAllocationLocally(moduleId, staffId, oldHours)
    }
  }, [updateAllocationLocally, history])

  // Undo handler
  const handleUndo = useCallback(async () => {
    const action = history.undo()
    if (!action) return

    const inverted = invertAction(action)

    if (inverted.type === 'set') {
      await saveAllocation(inverted.moduleId, inverted.staffId, inverted.newHours, inverted.oldHours)
    } else if (inverted.type === 'batch') {
      // Handle batch undo
      for (const subAction of inverted.actions) {
        if (subAction.type === 'set') {
          await saveAllocation(subAction.moduleId, subAction.staffId, subAction.newHours, subAction.oldHours)
        }
      }
    }
  }, [history, saveAllocation])

  // Redo handler
  const handleRedo = useCallback(async () => {
    const action = history.redo()
    if (!action) return

    if (action.type === 'set') {
      await saveAllocation(action.moduleId, action.staffId, action.newHours, action.oldHours)
    } else if (action.type === 'delete') {
      await saveAllocation(action.moduleId, action.staffId, 0, action.oldHours)
    } else if (action.type === 'batch') {
      for (const subAction of action.actions) {
        if (subAction.type === 'set') {
          await saveAllocation(subAction.moduleId, subAction.staffId, subAction.newHours, subAction.oldHours)
        } else if (subAction.type === 'delete') {
          await saveAllocation(subAction.moduleId, subAction.staffId, 0, subAction.oldHours)
        }
      }
    }
  }, [history, saveAllocation])

  // Copy allocation pattern for selected module
  const handleCopy = useCallback(() => {
    if (!selectedModuleId || !data) return

    const allocations: { staffId: number; hours: number }[] = []
    data.staff.forEach(s => {
      const hours = getAllocation(selectedModuleId, s.id)
      if (hours > 0) {
        allocations.push({ staffId: s.id, hours })
      }
    })

    clipboard.copy({ moduleId: selectedModuleId, allocations })
  }, [selectedModuleId, data, clipboard])

  // Paste allocation pattern to selected module
  const handlePaste = useCallback(async () => {
    if (!selectedModuleId || !clipboard.hasData || !data) return

    const clipboardData = clipboard.paste()
    if (!clipboardData) return

    // Apply each allocation from clipboard to the selected module
    for (const alloc of clipboardData.allocations) {
      const oldHours = getAllocation(selectedModuleId, alloc.staffId)
      await saveAllocation(selectedModuleId, alloc.staffId, alloc.hours, oldHours)
    }
  }, [selectedModuleId, clipboard, data, saveAllocation])

  // Keyboard shortcuts
  useGridShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onFocusStaffSearch: () => staffSearchRef.current?.focus(),
    onFocusModuleSearch: () => moduleSearchRef.current?.focus(),
    onShowHelp: () => setShowShortcutsHelp(true),
    onEscape: () => {
      setEditingCell(null)
      setDropDialogOpen(false)
    },
    onCopy: handleCopy,
    onPaste: handlePaste,
  })

  // Inline editing handlers
  const startEditing = useCallback((moduleId: number, staffId: number) => {
    const currentHours = getAllocation(moduleId, staffId)
    setEditingCell({ moduleId, staffId })
    setEditValue(currentHours > 0 ? currentHours.toString() : "")
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingCell) return

    const newHours = parseFloat(editValue) || 0
    const oldHours = getAllocation(editingCell.moduleId, editingCell.staffId)

    if (newHours !== oldHours) {
      await saveAllocation(editingCell.moduleId, editingCell.staffId, newHours, oldHours)
    }

    setEditingCell(null)
  }, [editingCell, editValue, saveAllocation])

  const cancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue("")
  }, [])

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent, staffIndex: number) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEdit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEdit()
    } else if (e.key === "Tab" && !e.shiftKey && editingCell && data) {
      e.preventDefault()
      saveEdit().then(() => {
        // Move to next staff column
        const nextStaffIndex = staffIndex + 1
        if (nextStaffIndex < data.staff.length) {
          startEditing(editingCell.moduleId, data.staff[nextStaffIndex].id)
        }
      })
    }
  }, [saveEdit, cancelEdit, editingCell, data])

  // Drag and drop handlers
  const canDrop = useCallback((item: DragItem, target: DropTarget): boolean => {
    if (!data) return false

    const staffId = item.type === 'staff' ? item.staffId : item.staffId
    return validation.canDropStaff(staffId, target.moduleId)
  }, [data, validation])

  const handleDragEnd = useCallback((item: DragItem, target: DropTarget) => {
    if (!data) return

    const staffId = item.type === 'staff' ? item.staffId : item.staffId
    const staff = data.staff.find(s => s.id === staffId)
    const module = data.modules.find(m => m.id === target.moduleId)

    if (!staff || !module) return

    // Calculate default hours
    const allocatedHours = getModuleAllocatedHours(target.moduleId)
    const remainingHours = Math.max(0, module.load - allocatedHours)
    const defaultHours = item.type === 'allocation' ? item.hours : remainingHours

    // Open dialog to confirm/adjust hours
    setPendingDrop({
      staffId,
      moduleId: target.moduleId,
      staffName: staff.name,
      moduleName: `${module.code} - ${module.name}`,
      defaultHours,
    })
    setDropHours(defaultHours.toString())
    setDropDialogOpen(true)

    // If moving an allocation, we'll delete the old one after confirming
    if (item.type === 'allocation' && item.moduleId !== target.moduleId) {
      // Store the source for deletion
      (window as unknown as Record<string, unknown>).__pendingMoveSource = {
        moduleId: item.moduleId,
        staffId: item.staffId,
        hours: item.hours
      }
    }
  }, [data])

  const confirmDrop = useCallback(async () => {
    if (!pendingDrop) return

    const hours = parseFloat(dropHours) || 0
    const oldHours = getAllocation(pendingDrop.moduleId, pendingDrop.staffId)

    if (hours > 0) {
      await saveAllocation(pendingDrop.moduleId, pendingDrop.staffId, hours, oldHours)
    }

    // Handle move operation (delete from source)
    const moveSource = (window as unknown as Record<string, unknown>).__pendingMoveSource as { moduleId: number; staffId: number; hours: number } | undefined
    if (moveSource && moveSource.moduleId !== pendingDrop.moduleId) {
      await saveAllocation(moveSource.moduleId, moveSource.staffId, 0, moveSource.hours)
    }
    delete (window as unknown as Record<string, unknown>).__pendingMoveSource

    setDropDialogOpen(false)
    setPendingDrop(null)
  }, [pendingDrop, dropHours, saveAllocation])

  // Add module handlers (for Per-Year view and PG view)
  const openAddModuleDialog = useCallback((year?: number, level?: "UG" | "MSc IP" | "ASDS" | "PhD") => {
    setAddModuleDialogYear(year || null)
    const defaultLevel = level || "UG"
    const codePrefix = level ? "" : `PL${year}`
    setAddModuleFormData({
      code: codePrefix,
      name: "",
      level: defaultLevel,
      term: "MT",
      load: 0,
      notes: "",
    })
    setAddModuleError(null)
    setAddModuleDialogOpen(true)
  }, [])

  const generatePlaceholderCode = useCallback(() => {
    const level = addModuleFormData.level

    if (level === "UG" && addModuleDialogYear) {
      // Find next available POU{year}XX{n}
      const prefix = `POU${addModuleDialogYear}XX`
      const existingCodes = data?.allModules
        .map(m => m.code)
        .filter(code => code.startsWith(prefix))
        .map(code => parseInt(code.slice(prefix.length)) || 0) || []
      const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1
      return `${prefix}${nextNum}`
    } else if (level !== "UG") {
      // PG placeholder: POPXX{n}
      const prefix = "POPXX"
      const existingCodes = data?.allModules
        .map(m => m.code)
        .filter(code => code.startsWith(prefix))
        .map(code => parseInt(code.slice(prefix.length)) || 0) || []
      const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1
      return `${prefix}${nextNum}`
    }
    return ""
  }, [addModuleFormData.level, addModuleDialogYear, data?.allModules])

  const openStaffAssignDialog = useCallback((module: Module) => {
    setStaffAssignModule(module)
    setStaffAssignDialogOpen(true)
  }, [])

  const submitAddModule = useCallback(async () => {
    setAddModuleError(null)

    const res = await fetch("/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addModuleFormData),
    })

    if (!res.ok) {
      const data = await res.json()
      setAddModuleError(data.error || "An error occurred")
      return
    }

    setAddModuleDialogOpen(false)
    fetchData()
  }, [addModuleFormData, fetchData])

  // Update module term
  const updateModuleTerm = useCallback(async (moduleId: number, term: "MT" | "HT" | "TT" | "FullYear") => {
    const res = await fetch(`/api/modules/${moduleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term }),
    })

    if (res.ok) {
      fetchData()
    }
  }, [fetchData])

  // Filter staff and modules based on search and quick filters
  const filteredStaff = useMemo(() => {
    if (!data) return []

    return data.staff.filter(s => {
      // Search filter
      if (staffSearch) {
        const search = staffSearch.toLowerCase()
        if (!s.name.toLowerCase().includes(search) && !s.abbrev.toLowerCase().includes(search)) {
          return false
        }
      }

      // Load status filters
      const load = data.staffLoad[s.id]
      if (showOverloaded && load?.load_status !== 'over') return false
      if (showUnderloaded && load?.load_status !== 'under') return false

      return true
    })
  }, [data, staffSearch, showOverloaded, showUnderloaded])

  const filteredModules = useMemo(() => {
    if (!data) return []

    return data.modules.filter(m => {
      // Search filter
      if (moduleSearch) {
        const search = moduleSearch.toLowerCase()
        if (!m.code.toLowerCase().includes(search) && !m.name.toLowerCase().includes(search)) {
          return false
        }
      }

      // Unallocated filter
      if (showUnallocatedOnly) {
        const allocated = getModuleAllocatedHours(m.id)
        if (allocated > 0) return false
      }

      return true
    })
  }, [data, moduleSearch, showUnallocatedOnly])

  // Calculate summary stats
  const summaryStats = useMemo((): GridSummaryStats => {
    if (!data) return { unallocatedModules: 0, overloadedStaff: 0, underloadedStaff: 0, totalAllocations: 0 }

    let unallocatedModules = 0
    let overloadedStaff = 0
    let underloadedStaff = 0
    let totalAllocations = 0

    data.modules.forEach(m => {
      const allocated = getModuleAllocatedHours(m.id)
      if (allocated === 0) unallocatedModules++
    })

    Object.values(data.staffLoad).forEach(load => {
      if (load.load_status === 'over') overloadedStaff++
      if (load.load_status === 'under') underloadedStaff++
    })

    totalAllocations = Object.keys(data.allocations).length

    return { unallocatedModules, overloadedStaff, underloadedStaff, totalAllocations }
  }, [data])

  // Eligible staff for staff assignment modal
  const eligibleStaffForAssignment = useMemo(() => {
    if (!staffAssignModule || !data) return []
    return data.staff.filter(
      (s) => getAllocation(staffAssignModule.id, s.id) === 0 &&
             validation.canDropStaff(s.id, staffAssignModule.id)
    )
  }, [staffAssignModule, data, validation])

  // Cell style helper
  function getCellStyle(moduleId: number, staffId: number, moduleLoad: number) {
    const hours = getAllocation(moduleId, staffId)
    if (hours === 0) return "bg-gray-50 hover:bg-gray-100"

    // Check for warnings
    const cellValidation = validation.validateCell(moduleId, staffId)
    if (cellValidation.warnings.some(w => w.severity === 'error')) {
      return "bg-red-100 hover:bg-red-200"
    }
    if (cellValidation.warnings.some(w => w.severity === 'warning')) {
      return "bg-orange-100 hover:bg-orange-200"
    }

    const allocatedHours = getModuleAllocatedHours(moduleId)
    if (allocatedHours >= moduleLoad) return "bg-green-100 hover:bg-green-200"
    return "bg-yellow-100 hover:bg-yellow-200"
  }

  function getStaffHeaderStyle(staffId: number) {
    if (!data) return ""
    const load = data.staffLoad[staffId]
    if (!load || load.expected_load === 0) return ""
    if (load.load_status === "under") return "bg-yellow-50"
    if (load.load_status === "over") return "bg-red-50"
    return "bg-green-50"
  }

  const selectedModule = data?.modules.find((m) => m.id === selectedModuleId) || data?.allModules.find((m) => m.id === selectedModuleId)
  const selectedStaff = data?.staff.find((s) => s.id === selectedStaffId)

  // Navigation helpers
  const navigateToModule = useCallback((moduleId: number) => {
    setPreviousView({ view, year: selectedYear })
    setSelectedModuleId(moduleId)
    setView("module")
  }, [view, selectedYear])

  const navigateToStaff = useCallback((staffId: number) => {
    setPreviousView({ view, year: selectedYear })
    setSelectedStaffId(staffId)
    setView("staff")
  }, [view, selectedYear])

  const navigateBack = useCallback(() => {
    if (previousView) {
      setView(previousView.view)
      if (previousView.year !== undefined) {
        setSelectedYear(previousView.year)
      }
      setPreviousView(null)
    }
  }, [previousView])

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!data) {
    return <div className="p-8 text-center">Error loading data</div>
  }

  return (
    <GridDndProvider onDragEnd={handleDragEnd} canDrop={canDrop}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teaching Grid</h1>
            <p className="text-muted-foreground">
              Assign staff to modules - drag staff or click cells to edit
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={view === "grid" ? "default" : "outline"}
              onClick={() => setView("grid")}
            >
              <Grid3X3 className="mr-2 h-4 w-4" />
              Grid View
            </Button>
            <Button
              variant={view === "module" ? "default" : "outline"}
              onClick={() => setView("module")}
            >
              <List className="mr-2 h-4 w-4" />
              Per-Module View
            </Button>
            <Button
              variant={view === "staff" ? "default" : "outline"}
              onClick={() => setView("staff")}
            >
              <User className="mr-2 h-4 w-4" />
              Per-Staff View
            </Button>
            <Button
              variant={view === "year" ? "default" : "outline"}
              onClick={() => setView("year")}
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              UG Per-Year View
            </Button>
            <Button
              variant={view === "pg" ? "default" : "outline"}
              onClick={() => setView("pg")}
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              PG View
            </Button>
          </div>
        </div>

        {/* Summary Bar */}
        <GridSummary
          stats={summaryStats}
          onFilterUnallocated={() => setShowUnallocatedOnly(!showUnallocatedOnly)}
          onFilterOverloaded={() => setShowOverloaded(!showOverloaded)}
          onFilterUnderloaded={() => setShowUnderloaded(!showUnderloaded)}
        />

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Level</Label>
              <Tabs value={levelFilter} onValueChange={setLevelFilter}>
                <TabsList>
                  {LEVELS.map((level) => (
                    <TabsTrigger key={level} value={level}>
                      {level}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Term</Label>
              <Tabs value={termFilter} onValueChange={setTermFilter}>
                <TabsList>
                  {TERMS.map((term) => (
                    <TabsTrigger key={term} value={term}>
                      {term}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Search and Quick Filters */}
          <GridFilters
            staffSearch={staffSearch}
            moduleSearch={moduleSearch}
            onStaffSearchChange={setStaffSearch}
            onModuleSearchChange={setModuleSearch}
            staffSearchRef={staffSearchRef}
            moduleSearchRef={moduleSearchRef}
            showOverloaded={showOverloaded}
            showUnderloaded={showUnderloaded}
            showUnallocatedOnly={showUnallocatedOnly}
            onToggleOverloaded={() => setShowOverloaded(!showOverloaded)}
            onToggleUnderloaded={() => setShowUnderloaded(!showUnderloaded)}
            onToggleUnallocated={() => setShowUnallocatedOnly(!showUnallocatedOnly)}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            hasClipboard={clipboard.hasData}
            selectedModuleId={selectedModuleId}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onShowHelp={() => setShowShortcutsHelp(true)}
          />
        </div>

        {view === "grid" && (
          /* Full Grid View with Staff Sidebar */
          <div className="flex rounded-md border bg-white overflow-hidden">
            {/* Staff Pool Sidebar */}
            <StaffPoolSidebar
              staff={data.staff}
              staffLoad={data.staffLoad as Record<number, { actual_load: number; expected_load: number; load_status: 'under' | 'balanced' | 'over' }>}
              filterOverloaded={showOverloaded}
              filterUnderloaded={showUnderloaded}
            />

            {/* Main Grid */}
            <div className="flex-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white z-10 min-w-[200px]">
                      Module
                    </TableHead>
                    <TableHead className="min-w-[80px]">Load</TableHead>
                    <TableHead className="min-w-[80px]">Allocated</TableHead>
                    {data.staff.map((s) => (
                      <TableHead
                        key={s.id}
                        className={`min-w-[70px] text-center ${getStaffHeaderStyle(s.id)}`}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="cursor-pointer px-1 hover:bg-gray-100 rounded transition-colors"
                              onClick={() => navigateToStaff(s.id)}
                            >
                              <div className="font-medium text-sm text-blue-600 hover:underline">{s.abbrev}</div>
                              <div className="text-xs text-muted-foreground">
                                {data.staffLoad[s.id]?.actual_load.toFixed(1) || 0}h
                              </div>
                              <StaffLoadBar
                                actualLoad={data.staffLoad[s.id]?.actual_load || 0}
                                expectedLoad={data.staffLoad[s.id]?.expected_load || s.expected_load}
                                loadStatus={(data.staffLoad[s.id]?.load_status || 'under') as 'under' | 'balanced' | 'over'}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div>
                              <div className="font-medium">{s.name}</div>
                              <div>
                                Load: {data.staffLoad[s.id]?.actual_load.toFixed(1) || 0}h
                                {data.staffLoad[s.id]?.expected_load > 0 && (
                                  <> / {data.staffLoad[s.id].expected_load}h</>
                                )}
                              </div>
                              {s.loa === 1 && (
                                <div className="text-red-500">On LOA</div>
                              )}
                              {s.mt_available === 0 && (
                                <div className="text-yellow-600">Not available MT</div>
                              )}
                              {s.ht_available === 0 && (
                                <div className="text-yellow-600">Not available HT</div>
                              )}
                              <div className="text-xs text-blue-500 mt-1">Click to view staff details</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModules.map((m) => {
                    const allocatedHours = getModuleAllocatedHours(m.id)
                    const statusColor =
                      allocatedHours === 0
                        ? "destructive"
                        : allocatedHours >= m.load
                        ? "success"
                        : "warning"

                    const isSelected = selectedModuleId === m.id

                    return (
                      <TableRow
                        key={m.id}
                        className={isSelected ? "bg-blue-50" : ""}
                      >
                        <TableCell
                          className={`sticky left-0 z-10 font-medium ${isSelected ? "bg-blue-50" : "bg-white"}`}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded -m-1">
                                <div className="flex-1">
                                  <div className="flex items-center gap-1">
                                    {m.code}
                                    <UserPlus className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                                    {m.name}
                                  </div>
                                </div>
                                {isSelected && clipboard.hasData && (
                                  <Badge variant="outline" className="text-xs">
                                    <Copy className="h-3 w-3 mr-1" />
                                    Paste
                                  </Badge>
                                )}
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-h-80 overflow-y-auto w-64" align="start">
                              <DropdownMenuLabel className="flex items-center justify-between">
                                <span>Add staff to {m.code}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedModuleId(isSelected ? null : m.id)
                                  }}
                                >
                                  {isSelected ? "Deselect" : "Select"}
                                </Button>
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="flex items-center gap-2 text-blue-600"
                                onClick={() => navigateToModule(m.id)}
                              >
                                <ExternalLink className="h-4 w-4" />
                                View module details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {data.staff.map((s) => {
                                const existingHours = getAllocation(m.id, s.id)
                                const hasLOA = s.loa === 1
                                const hasTermConflict =
                                  (m.term === 'MT' && s.mt_available === 0) ||
                                  (m.term === 'HT' && s.ht_available === 0)
                                const staffLoad = data.staffLoad[s.id]
                                const isOverloaded = staffLoad?.load_status === 'over'

                                return (
                                  <DropdownMenuItem
                                    key={s.id}
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => {
                                      const allocatedHours = getModuleAllocatedHours(m.id)
                                      const remainingHours = Math.max(0, m.load - allocatedHours)
                                      setPendingDrop({
                                        staffId: s.id,
                                        moduleId: m.id,
                                        staffName: s.name,
                                        moduleName: `${m.code} - ${m.name}`,
                                        defaultHours: existingHours > 0 ? existingHours : remainingHours,
                                      })
                                      setDropHours((existingHours > 0 ? existingHours : remainingHours).toString())
                                      setDropDialogOpen(true)
                                    }}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="font-medium">{s.abbrev}</span>
                                      <span className="text-muted-foreground truncate text-sm">{s.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                      {existingHours > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                          {existingHours}h
                                        </Badge>
                                      )}
                                      {hasLOA && (
                                        <Badge variant="destructive" className="text-xs">LOA</Badge>
                                      )}
                                      {hasTermConflict && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Not available {m.term}
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      {isOverloaded && !hasLOA && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <AlertCircle className="h-3 w-3 text-red-500" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Overloaded ({staffLoad?.actual_load.toFixed(1)}h / {staffLoad?.expected_load}h)
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </DropdownMenuItem>
                                )
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{m.load}h</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColor}>
                            {allocatedHours.toFixed(1)}h
                          </Badge>
                        </TableCell>
                        {data.staff.map((s, staffIndex) => {
                          const hours = getAllocation(m.id, s.id)
                          const isEditing = editingCell?.moduleId === m.id && editingCell?.staffId === s.id
                          const cellValidation = validation.validateCell(m.id, s.id)
                          const hasWarnings = cellValidation.warnings.length > 0 && hours > 0

                          const cellContent = isEditing ? (
                            <input
                              ref={editInputRef}
                              type="number"
                              step="0.5"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleEditKeyDown(e, staffIndex)}
                              onBlur={saveEdit}
                              className="w-full h-full px-1 py-0.5 text-center text-sm border-2 border-blue-500 focus:outline-none rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          ) : (
                            <div
                              className="flex items-center justify-center gap-0.5"
                              onClick={() => startEditing(m.id, s.id)}
                            >
                              {hours > 0 ? (
                                <span className="font-medium">{hours}</span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                              {hasWarnings && (
                                <AlertCircle
                                  className={`h-3 w-3 flex-shrink-0 ${
                                    cellValidation.warnings.some(w => w.severity === 'error')
                                      ? "text-red-500"
                                      : "text-yellow-500"
                                  }`}
                                />
                              )}
                            </div>
                          )

                          // Wrap with tooltip if has warnings
                          if (hasWarnings) {
                            return (
                              <Tooltip key={s.id}>
                                <TooltipTrigger asChild>
                                  <TableCell
                                    className={`text-center cursor-pointer transition-colors p-1 ${getCellStyle(m.id, s.id, m.load)}`}
                                  >
                                    {cellContent}
                                  </TableCell>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1">
                                    {cellValidation.warnings.map((warning, i) => (
                                      <div
                                        key={i}
                                        className={`text-sm ${
                                          warning.severity === "error"
                                            ? "text-red-600"
                                            : warning.severity === "warning"
                                            ? "text-yellow-600"
                                            : "text-blue-600"
                                        }`}
                                      >
                                        {warning.message}
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )
                          }

                          return (
                            <TableCell
                              key={s.id}
                              className={`text-center cursor-pointer transition-colors p-1 ${
                                isEditing ? "p-0" : getCellStyle(m.id, s.id, m.load)
                              }`}
                            >
                              {cellContent}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                  {filteredModules.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3 + data.staff.length}
                        className="text-center py-8"
                      >
                        No modules found with the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {view === "module" && (
          /* Per-Module View */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Module List */}
            <div className="rounded-md border bg-white">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Select Module</h3>
                  {previousView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={navigateBack}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to {previousView.view === "year" ? `Year ${previousView.year}` : previousView.view}
                    </Button>
                  )}
                </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {filteredModules.map((m) => {
                  const allocatedHours = getModuleAllocatedHours(m.id)
                  const statusColor =
                    allocatedHours === 0
                      ? "destructive"
                      : allocatedHours >= m.load
                      ? "success"
                      : "warning"

                  return (
                    <div
                      key={m.id}
                      className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                        selectedModuleId === m.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => setSelectedModuleId(m.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{m.code}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {m.name}
                          </div>
                        </div>
                        <Badge variant={statusColor}>
                          {allocatedHours.toFixed(1)}/{m.load}h
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Module Details & Allocations */}
            <div className="md:col-span-2 rounded-md border bg-white">
              {selectedModule ? (
                <>
                  <div className="p-4 border-b">
                    <h3 className="text-xl font-semibold">{selectedModule.code}</h3>
                    <p className="text-muted-foreground">{selectedModule.name}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{selectedModule.level}</Badge>
                      <Badge variant="secondary">{selectedModule.term}</Badge>
                      <Badge variant="outline">Load: {selectedModule.load}h</Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium mb-4">Allocated Staff</h4>
                    <div className="space-y-2">
                      {data.staff
                        .filter((s) => getAllocation(selectedModule.id, s.id) > 0)
                        .map((s) => {
                          const hours = getAllocation(selectedModule.id, s.id)
                          const cellValidation = validation.validateCell(selectedModule.id, s.id)
                          const hasWarnings = cellValidation.warnings.length > 0

                          return (
                            <div
                              key={s.id}
                              className={`flex items-center justify-between p-2 rounded ${
                                hasWarnings
                                  ? cellValidation.warnings.some(w => w.severity === 'error')
                                    ? "bg-red-50"
                                    : "bg-yellow-50"
                                  : "bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="font-medium cursor-pointer hover:underline text-blue-600"
                                  onClick={() => navigateToStaff(s.id)}
                                >
                                  {s.abbrev}
                                </span>
                                <span className="text-muted-foreground">
                                  {s.name}
                                </span>
                                {hasWarnings && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertCircle className={`h-4 w-4 ${
                                        cellValidation.warnings.some(w => w.severity === 'error')
                                          ? "text-red-500"
                                          : "text-yellow-500"
                                      }`} />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {cellValidation.warnings.map((w, i) => (
                                        <div key={i}>{w.message}</div>
                                      ))}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge>{hours}h</Badge>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => navigateToStaff(s.id)}
                                      title="View staff profile"
                                      className="h-8 w-8"
                                    >
                                      <ExternalLink className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View staff profile</TooltipContent>
                                </Tooltip>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => saveAllocation(selectedModule.id, s.id, 0, hours)}
                                  title="Remove allocation"
                                  className="h-8 w-8"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      {data.staff.filter(
                        (s) => getAllocation(selectedModule.id, s.id) > 0
                      ).length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          No staff allocated to this module.
                        </p>
                      )}
                    </div>

                    <h4 className="font-medium mt-6 mb-4">Add Staff</h4>
                    <div className="flex gap-2">
                      <Select
                        onValueChange={(value) => {
                          const staffId = parseInt(value)
                          const staff = data.staff.find((s) => s.id === staffId)
                          if (staff && selectedModule) {
                            const allocatedHours = getModuleAllocatedHours(selectedModule.id)
                            const remainingHours = Math.max(0, selectedModule.load - allocatedHours)

                            setPendingDrop({
                              staffId,
                              moduleId: selectedModule.id,
                              staffName: staff.name,
                              moduleName: `${selectedModule.code} - ${selectedModule.name}`,
                              defaultHours: remainingHours,
                            })
                            setDropHours(remainingHours.toString())
                            setDropDialogOpen(true)
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select staff to add" />
                        </SelectTrigger>
                        <SelectContent>
                          {data.staff
                            .filter(
                              (s) => getAllocation(selectedModule.id, s.id) === 0
                            )
                            .map((s) => {
                              const canAssign = validation.canDropStaff(s.id, selectedModule.id)
                              return (
                                <SelectItem
                                  key={s.id}
                                  value={s.id.toString()}
                                  disabled={!canAssign}
                                >
                                  {s.abbrev} - {s.name}
                                  {s.loa === 1 && " (LOA)"}
                                  {!canAssign && selectedModule.term === 'MT' && s.mt_available === 0 && " (Not available MT)"}
                                  {!canAssign && selectedModule.term === 'HT' && s.ht_available === 0 && " (Not available HT)"}
                                </SelectItem>
                              )
                            })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Select a module from the list to view and edit allocations.
                </div>
              )}
            </div>
          </div>
        )}

        {view === "staff" && (
          /* Per-Staff View */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Staff List */}
            <div className="rounded-md border bg-white">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Select Staff</h3>
                  {previousView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={navigateBack}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to {previousView.view === "year" ? `Year ${previousView.year}` : previousView.view}
                    </Button>
                  )}
                </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {filteredStaff.map((s) => {
                  const staffLoad = data.staffLoad[s.id]
                  const loadStatus = staffLoad?.load_status || 'under'
                  const statusColor =
                    loadStatus === 'over'
                      ? "destructive"
                      : loadStatus === 'balanced'
                      ? "success"
                      : "warning"

                  // Count teaching units per term (excluding FullYear)
                  const termCounts = { MT: 0, HT: 0, TT: 0 }
                  data.allModules.forEach((m) => {
                    if (getAllocation(m.id, s.id) > 0) {
                      if (m.term === "MT") termCounts.MT++
                      else if (m.term === "HT") termCounts.HT++
                      else if (m.term === "TT") termCounts.TT++
                    }
                  })

                  return (
                    <div
                      key={s.id}
                      className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                        selectedStaffId === s.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => setSelectedStaffId(s.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {s.abbrev}
                            {s.loa === 1 && (
                              <Badge variant="destructive" className="text-xs">LOA</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {s.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            MT: {termCounts.MT} | HT: {termCounts.HT} | TT: {termCounts.TT}
                          </div>
                        </div>
                        <Badge variant={statusColor}>
                          {staffLoad?.actual_load.toFixed(1) || 0}/{staffLoad?.expected_load || s.expected_load}h
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Staff Details & Allocations */}
            <div className="md:col-span-2 rounded-md border bg-white">
              {selectedStaff ? (
                <>
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">{selectedStaff.abbrev}</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAddModuleDialog()}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Module
                      </Button>
                    </div>
                    <p className="text-muted-foreground">{selectedStaff.name}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {selectedStaff.loa === 1 && (
                        <Badge variant="destructive">On LOA</Badge>
                      )}
                      {selectedStaff.mt_available === 0 && (
                        <Badge variant="outline" className="text-yellow-600">Not available MT</Badge>
                      )}
                      {selectedStaff.ht_available === 0 && (
                        <Badge variant="outline" className="text-yellow-600">Not available HT</Badge>
                      )}
                      <Badge variant="outline">
                        Load: {data.staffLoad[selectedStaff.id]?.actual_load.toFixed(1) || 0}h / {data.staffLoad[selectedStaff.id]?.expected_load || selectedStaff.expected_load}h
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium mb-4">Allocated Modules</h4>
                    <div className="space-y-2">
                      {data.allModules
                        .filter((m) => getAllocation(m.id, selectedStaff.id) > 0)
                        .map((m) => {
                          const hours = getAllocation(m.id, selectedStaff.id)
                          const cellValidation = validation.validateCell(m.id, selectedStaff.id)
                          const hasWarnings = cellValidation.warnings.length > 0

                          return (
                            <div
                              key={m.id}
                              className={`flex items-center justify-between p-2 rounded ${
                                hasWarnings
                                  ? cellValidation.warnings.some(w => w.severity === 'error')
                                    ? "bg-red-50"
                                    : "bg-yellow-50"
                                  : "bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span
                                  className="font-medium cursor-pointer hover:underline text-blue-600"
                                  onClick={() => navigateToModule(m.id)}
                                >
                                  {m.code}
                                </span>
                                <span className="text-muted-foreground truncate">
                                  {m.name}
                                </span>
                                <Badge variant="outline" className="text-xs">{m.term}</Badge>
                                <Badge variant="outline" className="text-xs">{m.level}</Badge>
                                {hasWarnings && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertCircle className={`h-4 w-4 ${
                                        cellValidation.warnings.some(w => w.severity === 'error')
                                          ? "text-red-500"
                                          : "text-yellow-500"
                                      }`} />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {cellValidation.warnings.map((w, i) => (
                                        <div key={i}>{w.message}</div>
                                      ))}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge>{hours}h</Badge>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => navigateToModule(m.id)}
                                      title="View module details"
                                      className="h-8 w-8"
                                    >
                                      <ExternalLink className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View module details</TooltipContent>
                                </Tooltip>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => saveAllocation(m.id, selectedStaff.id, 0, hours)}
                                  title="Remove allocation"
                                  className="h-8 w-8"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      {data.allModules.filter(
                        (m) => getAllocation(m.id, selectedStaff.id) > 0
                      ).length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          No modules allocated to this staff member.
                        </p>
                      )}
                    </div>

                    <h4 className="font-medium mt-6 mb-4">Add Module</h4>
                    <div className="flex gap-2">
                      <Select
                        onValueChange={(value) => {
                          const moduleId = parseInt(value)
                          const module = data.modules.find((m) => m.id === moduleId)
                          if (module && selectedStaff) {
                            const allocatedHours = getModuleAllocatedHours(moduleId)
                            const remainingHours = Math.max(0, module.load - allocatedHours)

                            setPendingDrop({
                              staffId: selectedStaff.id,
                              moduleId,
                              staffName: selectedStaff.name,
                              moduleName: `${module.code} - ${module.name}`,
                              defaultHours: remainingHours,
                            })
                            setDropHours(remainingHours.toString())
                            setDropDialogOpen(true)
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select module to add" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredModules
                            .filter(
                              (m) => getAllocation(m.id, selectedStaff.id) === 0
                            )
                            .map((m) => {
                              const canAssign = validation.canDropStaff(selectedStaff.id, m.id)
                              return (
                                <SelectItem
                                  key={m.id}
                                  value={m.id.toString()}
                                  disabled={!canAssign}
                                >
                                  {m.code} - {m.name}
                                  {!canAssign && m.term === 'MT' && selectedStaff.mt_available === 0 && " (Not available MT)"}
                                  {!canAssign && m.term === 'HT' && selectedStaff.ht_available === 0 && " (Not available HT)"}
                                </SelectItem>
                              )
                            })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Select a staff member from the list to view and edit allocations.
                </div>
              )}
            </div>
          </div>
        )}

        {view === "year" && (
          /* UG Per-Year View */
          <div className="space-y-4">
            {/* Navigation Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((year) => {
                const yearModules = data.allModules.filter((m) => getUGYear(m.code) === year)
                const totalLoad = yearModules.reduce((sum, m) => sum + m.load, 0)
                const totalAllocated = yearModules.reduce((sum, m) => sum + getModuleAllocatedHours(m.id), 0)
                const assignedModules = yearModules.filter((m) => getModuleAllocatedHours(m.id) > 0)
                const mtAssigned = assignedModules.filter((m) => m.term === "MT").length
                const htAssigned = assignedModules.filter((m) => m.term === "HT").length
                const ttAssigned = assignedModules.filter((m) => m.term === "TT").length

                return (
                  <div
                    key={year}
                    className={`p-4 rounded-md border cursor-pointer transition-colors ${
                      selectedYear === year ? "bg-blue-50 border-blue-300" : "bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedYear(year)}
                  >
                    <div className="font-medium">{getYearLabel(year)}</div>
                    <div className="text-sm text-muted-foreground">
                      {assignedModules.length}/{yearModules.length} modules assigned
                    </div>
                    <div className="text-sm">
                      <span className={totalAllocated >= totalLoad ? "text-green-600" : "text-yellow-600"}>
                        {totalAllocated.toFixed(1)}h
                      </span>
                      <span className="text-muted-foreground"> / {totalLoad.toFixed(1)}h</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="text-xs">
                        Assigned: MT: {mtAssigned}, HT: {htAssigned}, TT: {ttAssigned}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Modules for selected year */}
            <div className="rounded-md border bg-white">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{getYearLabel(selectedYear)} Modules</h3>
                  <p className="text-sm text-muted-foreground">
                    UG Political Science modules for {getYearLabel(selectedYear)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Tabs value={yearAssignmentFilter} onValueChange={(v) => setYearAssignmentFilter(v as "all" | "assigned" | "unassigned")}>
                      <TabsList className="h-8">
                        <TabsTrigger value="all" className="text-xs px-2 h-6">All</TabsTrigger>
                        <TabsTrigger value="assigned" className="text-xs px-2 h-6">Assigned</TabsTrigger>
                        <TabsTrigger value="unassigned" className="text-xs px-2 h-6">Unassigned</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <Button onClick={() => openAddModuleDialog(selectedYear)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Module
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="w-[120px] cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => setYearViewSort(prev => ({
                        column: 'code',
                        direction: prev.column === 'code' && prev.direction === 'asc' ? 'desc' : 'asc'
                      }))}
                    >
                      <div className="flex items-center gap-1">
                        Code
                        {yearViewSort.column === 'code' && (
                          yearViewSort.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => setYearViewSort(prev => ({
                        column: 'name',
                        direction: prev.column === 'name' && prev.direction === 'asc' ? 'desc' : 'asc'
                      }))}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {yearViewSort.column === 'name' && (
                          yearViewSort.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="w-[80px] cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => setYearViewSort(prev => ({
                        column: 'term',
                        direction: prev.column === 'term' && prev.direction === 'asc' ? 'desc' : 'asc'
                      }))}
                    >
                      <div className="flex items-center gap-1">
                        Term
                        {yearViewSort.column === 'term' && (
                          yearViewSort.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="w-[100px] cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => setYearViewSort(prev => ({
                        column: 'load',
                        direction: prev.column === 'load' && prev.direction === 'asc' ? 'desc' : 'asc'
                      }))}
                    >
                      <div className="flex items-center gap-1">
                        Load
                        {yearViewSort.column === 'load' && (
                          yearViewSort.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Allocated To</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortModules(data.allModules.filter((m) => {
                      if (getUGYear(m.code) !== selectedYear) return false
                      if (yearAssignmentFilter === "assigned") return getModuleAllocatedHours(m.id) > 0
                      if (yearAssignmentFilter === "unassigned") return getModuleAllocatedHours(m.id) === 0
                      return true
                    }), yearViewSort)
                    .map((m) => {
                      const allocatedHours = getModuleAllocatedHours(m.id)
                      const statusColor =
                        allocatedHours === 0
                          ? "destructive"
                          : allocatedHours >= m.load
                          ? "success"
                          : "warning"

                      // Get staff allocated to this module
                      const allocatedStaff = data.staff.filter(
                        (s) => getAllocation(m.id, s.id) > 0
                      )

                      return (
                        <TableRow key={m.id}>
                          <TableCell
                            className="font-medium cursor-pointer hover:underline text-blue-600"
                            onClick={() => navigateToModule(m.id)}
                          >
                            {m.code}
                          </TableCell>
                          <TableCell>{m.name}</TableCell>
                          <TableCell>
                            <Select
                              value={m.term}
                              onValueChange={(value: "MT" | "HT" | "TT" | "FullYear") => updateModuleTerm(m.id, value)}
                            >
                              <SelectTrigger className="h-7 w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MT">MT</SelectItem>
                                <SelectItem value="HT">HT</SelectItem>
                                <SelectItem value="TT">TT</SelectItem>
                                <SelectItem value="FullYear">Full Year</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusColor}>
                              {allocatedHours.toFixed(1)}/{m.load}h
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {allocatedStaff.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {allocatedStaff.map((s) => {
                                  const hours = getAllocation(m.id, s.id)
                                  const cellValidation = validation.validateCell(m.id, s.id)
                                  const hasWarnings = cellValidation.warnings.length > 0

                                  return (
                                    <Tooltip key={s.id}>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant={hasWarnings ? "destructive" : "outline"}
                                          className="cursor-pointer hover:bg-blue-100 flex items-center gap-1 pr-1"
                                          onClick={() => navigateToStaff(s.id)}
                                        >
                                          {s.abbrev} ({hours}h)
                                          <span
                                            className="ml-1 hover:bg-red-200 rounded-full p-0.5"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              saveAllocation(m.id, s.id, 0, hours)
                                            }}
                                          >
                                            <X className="h-3 w-3" />
                                          </span>
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div>
                                          <div className="font-medium">{s.name}</div>
                                          <div>{hours}h allocated</div>
                                          {hasWarnings && (
                                            <div className="text-yellow-500 mt-1">
                                              {cellValidation.warnings.map((w, i) => (
                                                <div key={i}>{w.message}</div>
                                              ))}
                                            </div>
                                          )}
                                          <div className="text-xs text-blue-500 mt-1">
                                            Click to view staff details
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel>Edit {m.code}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="flex items-center gap-2 text-blue-600"
                                  onClick={() => navigateToModule(m.id)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View module details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openStaffAssignDialog(m)}
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Add staff to module...
                                </DropdownMenuItem>
                                {allocatedStaff.length > 0 && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                      Edit existing allocations
                                    </DropdownMenuLabel>
                                    {allocatedStaff.map((s) => {
                                      const hours = getAllocation(m.id, s.id)
                                      return (
                                        <DropdownMenuItem
                                          key={s.id}
                                          className="flex items-center justify-between"
                                          onClick={() => {
                                            setPendingDrop({
                                              staffId: s.id,
                                              moduleId: m.id,
                                              staffName: s.name,
                                              moduleName: `${m.code} - ${m.name}`,
                                              defaultHours: hours,
                                            })
                                            setDropHours(hours.toString())
                                            setDropDialogOpen(true)
                                          }}
                                        >
                                          <span>{s.abbrev}</span>
                                          <Badge variant="secondary">{hours}h</Badge>
                                        </DropdownMenuItem>
                                      )
                                    })}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  {data.allModules.filter((m) => {
                      if (getUGYear(m.code) !== selectedYear) return false
                      if (yearAssignmentFilter === "assigned") return getModuleAllocatedHours(m.id) > 0
                      if (yearAssignmentFilter === "unassigned") return getModuleAllocatedHours(m.id) === 0
                      return true
                    }).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {yearAssignmentFilter !== "all"
                          ? `No ${yearAssignmentFilter} modules found for ${getYearLabel(selectedYear)}.`
                          : `No modules found for ${getYearLabel(selectedYear)}.`}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {view === "pg" && (
          /* PG View */
          <div className="space-y-4">
            {/* Navigation Cards */}
            <div className="grid grid-cols-3 gap-4">
              {(["MSc IP", "ASDS", "PhD"] as const).map((level) => {
                const levelModules = data.allModules.filter((m) => m.level === level)
                const totalLoad = levelModules.reduce((sum, m) => sum + m.load, 0)
                const totalAllocated = levelModules.reduce((sum, m) => sum + getModuleAllocatedHours(m.id), 0)
                const assignedModules = levelModules.filter((m) => getModuleAllocatedHours(m.id) > 0)
                const mtAssigned = assignedModules.filter((m) => m.term === "MT").length
                const htAssigned = assignedModules.filter((m) => m.term === "HT").length
                const ttAssigned = assignedModules.filter((m) => m.term === "TT").length

                return (
                  <div
                    key={level}
                    className={`p-4 rounded-md border cursor-pointer transition-colors ${
                      selectedPGLevel === level ? "bg-blue-50 border-blue-300" : "bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedPGLevel(level)}
                  >
                    <div className="font-medium">{level}</div>
                    <div className="text-sm text-muted-foreground">
                      {assignedModules.length}/{levelModules.length} modules assigned
                    </div>
                    <div className="text-sm">
                      <span className={totalAllocated >= totalLoad ? "text-green-600" : "text-yellow-600"}>
                        {totalAllocated.toFixed(1)}h
                      </span>
                      <span className="text-muted-foreground"> / {totalLoad.toFixed(1)}h</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="text-xs">
                        Assigned: MT: {mtAssigned}, HT: {htAssigned}, TT: {ttAssigned}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Modules for selected PG level */}
            <div className="rounded-md border bg-white">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedPGLevel} Modules</h3>
                  <p className="text-sm text-muted-foreground">
                    Postgraduate {selectedPGLevel} modules
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Tabs value={pgAssignmentFilter} onValueChange={(v) => setPgAssignmentFilter(v as "all" | "assigned" | "unassigned")}>
                      <TabsList className="h-8">
                        <TabsTrigger value="all" className="text-xs px-2 h-6">All</TabsTrigger>
                        <TabsTrigger value="assigned" className="text-xs px-2 h-6">Assigned</TabsTrigger>
                        <TabsTrigger value="unassigned" className="text-xs px-2 h-6">Unassigned</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <Button onClick={() => openAddModuleDialog(undefined, selectedPGLevel)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Module
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="w-[120px] cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => setPgViewSort(prev => ({
                        column: 'code',
                        direction: prev.column === 'code' && prev.direction === 'asc' ? 'desc' : 'asc'
                      }))}
                    >
                      <div className="flex items-center gap-1">
                        Code
                        {pgViewSort.column === 'code' && (
                          pgViewSort.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => setPgViewSort(prev => ({
                        column: 'name',
                        direction: prev.column === 'name' && prev.direction === 'asc' ? 'desc' : 'asc'
                      }))}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {pgViewSort.column === 'name' && (
                          pgViewSort.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="w-[80px] cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => setPgViewSort(prev => ({
                        column: 'term',
                        direction: prev.column === 'term' && prev.direction === 'asc' ? 'desc' : 'asc'
                      }))}
                    >
                      <div className="flex items-center gap-1">
                        Term
                        {pgViewSort.column === 'term' && (
                          pgViewSort.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="w-[100px] cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => setPgViewSort(prev => ({
                        column: 'load',
                        direction: prev.column === 'load' && prev.direction === 'asc' ? 'desc' : 'asc'
                      }))}
                    >
                      <div className="flex items-center gap-1">
                        Load
                        {pgViewSort.column === 'load' && (
                          pgViewSort.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Allocated To</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortModules(data.allModules.filter((m) => {
                      if (m.level !== selectedPGLevel) return false
                      if (pgAssignmentFilter === "assigned") return getModuleAllocatedHours(m.id) > 0
                      if (pgAssignmentFilter === "unassigned") return getModuleAllocatedHours(m.id) === 0
                      return true
                    }), pgViewSort)
                    .map((m) => {
                      const allocatedHours = getModuleAllocatedHours(m.id)
                      const statusColor =
                        allocatedHours === 0
                          ? "destructive"
                          : allocatedHours >= m.load
                          ? "success"
                          : "warning"

                      // Get staff allocated to this module
                      const allocatedStaff = data.staff.filter(
                        (s) => getAllocation(m.id, s.id) > 0
                      )

                      return (
                        <TableRow key={m.id}>
                          <TableCell
                            className="font-medium cursor-pointer hover:underline text-blue-600"
                            onClick={() => navigateToModule(m.id)}
                          >
                            {m.code}
                          </TableCell>
                          <TableCell>{m.name}</TableCell>
                          <TableCell>
                            <Select
                              value={m.term}
                              onValueChange={(value: "MT" | "HT" | "TT" | "FullYear") => updateModuleTerm(m.id, value)}
                            >
                              <SelectTrigger className="h-7 w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MT">MT</SelectItem>
                                <SelectItem value="HT">HT</SelectItem>
                                <SelectItem value="TT">TT</SelectItem>
                                <SelectItem value="FullYear">Full Year</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusColor}>
                              {allocatedHours.toFixed(1)}/{m.load}h
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {allocatedStaff.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {allocatedStaff.map((s) => {
                                  const hours = getAllocation(m.id, s.id)
                                  const cellValidation = validation.validateCell(m.id, s.id)
                                  const hasWarnings = cellValidation.warnings.length > 0

                                  return (
                                    <Tooltip key={s.id}>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant={hasWarnings ? "destructive" : "outline"}
                                          className="cursor-pointer hover:bg-blue-100 flex items-center gap-1 pr-1"
                                          onClick={() => navigateToStaff(s.id)}
                                        >
                                          {s.abbrev} ({hours}h)
                                          <span
                                            className="ml-1 hover:bg-red-200 rounded-full p-0.5"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              saveAllocation(m.id, s.id, 0, hours)
                                            }}
                                          >
                                            <X className="h-3 w-3" />
                                          </span>
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div>
                                          <div className="font-medium">{s.name}</div>
                                          <div>{hours}h allocated</div>
                                          {hasWarnings && (
                                            <div className="text-yellow-500 mt-1">
                                              {cellValidation.warnings.map((w, i) => (
                                                <div key={i}>{w.message}</div>
                                              ))}
                                            </div>
                                          )}
                                          <div className="text-xs text-blue-500 mt-1">
                                            Click to view staff details
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel>Edit {m.code}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="flex items-center gap-2 text-blue-600"
                                  onClick={() => navigateToModule(m.id)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View module details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openStaffAssignDialog(m)}
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Add staff to module...
                                </DropdownMenuItem>
                                {allocatedStaff.length > 0 && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                      Edit existing allocations
                                    </DropdownMenuLabel>
                                    {allocatedStaff.map((s) => {
                                      const hours = getAllocation(m.id, s.id)
                                      return (
                                        <DropdownMenuItem
                                          key={s.id}
                                          className="flex items-center justify-between"
                                          onClick={() => {
                                            setPendingDrop({
                                              staffId: s.id,
                                              moduleId: m.id,
                                              staffName: s.name,
                                              moduleName: `${m.code} - ${m.name}`,
                                              defaultHours: hours,
                                            })
                                            setDropHours(hours.toString())
                                            setDropDialogOpen(true)
                                          }}
                                        >
                                          <span>{s.abbrev}</span>
                                          <Badge variant="secondary">{hours}h</Badge>
                                        </DropdownMenuItem>
                                      )
                                    })}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  {data.allModules.filter((m) => {
                      if (m.level !== selectedPGLevel) return false
                      if (pgAssignmentFilter === "assigned") return getModuleAllocatedHours(m.id) > 0
                      if (pgAssignmentFilter === "unassigned") return getModuleAllocatedHours(m.id) === 0
                      return true
                    }).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        {pgAssignmentFilter !== "all"
                          ? `No ${pgAssignmentFilter} modules found for ${selectedPGLevel}.`
                          : `No modules found for ${selectedPGLevel}.`}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Drop Dialog - for confirming hours when dropping staff */}
        <Dialog open={dropDialogOpen} onOpenChange={setDropDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Allocate Hours</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground">Module</Label>
                <p className="font-medium">{pendingDrop?.moduleName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Staff</Label>
                <p className="font-medium">{pendingDrop?.staffName}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropHours">Load Hours</Label>
                <Input
                  id="dropHours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={dropHours}
                  onChange={(e) => setDropHours(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      confirmDrop()
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDropDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmDrop}>
                Allocate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Module Dialog */}
        <Dialog open={addModuleDialogOpen} onOpenChange={setAddModuleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Module</DialogTitle>
            </DialogHeader>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const code = generatePlaceholderCode()
                  if (code) {
                    setAddModuleFormData(prev => ({
                      ...prev,
                      code,
                      name: "Placeholder Module"
                    }))
                  }
                }}
              >
                Use Placeholder
              </Button>
            </div>
            <div className="space-y-4 py-4">
              {addModuleError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                  {addModuleError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moduleCode">Module Code</Label>
                  <Input
                    id="moduleCode"
                    value={addModuleFormData.code}
                    onChange={(e) =>
                      setAddModuleFormData({ ...addModuleFormData, code: e.target.value })
                    }
                    placeholder="e.g., PL101"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moduleLoad">Load (hours)</Label>
                  <Input
                    id="moduleLoad"
                    type="number"
                    step="0.1"
                    value={addModuleFormData.load}
                    onChange={(e) =>
                      setAddModuleFormData({
                        ...addModuleFormData,
                        load: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="moduleName">Module Name</Label>
                <Input
                  id="moduleName"
                  value={addModuleFormData.name}
                  onChange={(e) =>
                    setAddModuleFormData({ ...addModuleFormData, name: e.target.value })
                  }
                  placeholder="e.g., Introduction to Politics"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moduleLevel">Level</Label>
                  <Select
                    value={addModuleFormData.level}
                    onValueChange={(value: "UG" | "MSc IP" | "ASDS" | "PhD") =>
                      setAddModuleFormData({ ...addModuleFormData, level: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UG">UG</SelectItem>
                      <SelectItem value="MSc IP">MSc IP</SelectItem>
                      <SelectItem value="ASDS">ASDS</SelectItem>
                      <SelectItem value="PhD">PhD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moduleTerm">Term</Label>
                  <Select
                    value={addModuleFormData.term}
                    onValueChange={(value: "MT" | "HT" | "TT" | "FullYear") =>
                      setAddModuleFormData({ ...addModuleFormData, term: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MT">MT</SelectItem>
                      <SelectItem value="HT">HT</SelectItem>
                      <SelectItem value="TT">TT</SelectItem>
                      <SelectItem value="FullYear">Full Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="moduleNotes">Notes (optional)</Label>
                <Input
                  id="moduleNotes"
                  value={addModuleFormData.notes}
                  onChange={(e) =>
                    setAddModuleFormData({ ...addModuleFormData, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddModuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitAddModule}>
                Add Module
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Staff Assignment Dialog */}
        <Dialog open={staffAssignDialogOpen} onOpenChange={setStaffAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Add Staff to {staffAssignModule?.code}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {eligibleStaffForAssignment.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No eligible staff available for this module.
                </p>
              ) : (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {eligibleStaffForAssignment.map((s) => {
                    const remainingHours = staffAssignModule
                      ? Math.max(0, staffAssignModule.load - getModuleAllocatedHours(staffAssignModule.id))
                      : 0
                    return (
                      <Button
                        key={s.id}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          if (staffAssignModule) {
                            setPendingDrop({
                              staffId: s.id,
                              moduleId: staffAssignModule.id,
                              staffName: s.name,
                              moduleName: `${staffAssignModule.code} - ${staffAssignModule.name}`,
                              defaultHours: remainingHours,
                            })
                            setDropHours(remainingHours.toString())
                            setStaffAssignDialogOpen(false)
                            setDropDialogOpen(true)
                          }
                        }}
                      >
                        <span className="font-medium">{s.abbrev}</span>
                        <span className="ml-2 text-muted-foreground">{s.name}</span>
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStaffAssignDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Keyboard Shortcuts Help Dialog */}
        <KeyboardShortcutsDialog
          open={showShortcutsHelp}
          onOpenChange={setShowShortcutsHelp}
        />
      </div>
    </GridDndProvider>
  )
}
