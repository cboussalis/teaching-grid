"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Download, AlertTriangle, Users, BookOpen, X, Pencil, Check, FileSpreadsheet, FileText, Plus } from "lucide-react"
import { ExportModal, type TemplateRowData } from "@/components/export/ExportModal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { Staff, ServiceRole, ServiceRoleWithStaff, AllocationWithDetails, ModuleWithAllocations } from "@/types"

interface WorkloadReport {
  staff: Staff
  teachingLoad: number
  serviceRoles: ServiceRole[]
  allocations: AllocationWithDetails[]
}

interface Warning {
  type: string
  message: string
  staffId?: number
  moduleId?: number
}

export default function ReportsPage() {
  const [workloadReport, setWorkloadReport] = useState<WorkloadReport[]>([])
  const [moduleReport, setModuleReport] = useState<ModuleWithAllocations[]>([])
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [loading, setLoading] = useState(true)

  // Staff detail modal state
  const [selectedStaff, setSelectedStaff] = useState<WorkloadReport | null>(null)
  const [staffModalOpen, setStaffModalOpen] = useState(false)
  const [editingAllocationId, setEditingAllocationId] = useState<number | null>(null)
  const [editHoursValue, setEditHoursValue] = useState("")

  // Service role management state
  const [allServiceRoles, setAllServiceRoles] = useState<ServiceRoleWithStaff[]>([])
  const [serviceRoleFormOpen, setServiceRoleFormOpen] = useState(false)
  const [newRoleForm, setNewRoleForm] = useState({ name: "", category: "Dept" as "Dept" | "School", term: "" })

  // Export modal state
  const [exportModalOpen, setExportModalOpen] = useState(false)

  const fetchReports = useCallback(async () => {
    const [workloadRes, moduleRes, warningsRes] = await Promise.all([
      fetch("/api/reports?type=workload"),
      fetch("/api/reports?type=modules"),
      fetch("/api/reports?type=warnings"),
    ])
    const [workloadData, moduleData, warningsData] = await Promise.all([
      workloadRes.json(),
      moduleRes.json(),
      warningsRes.json(),
    ])
    setWorkloadReport(workloadData)
    setModuleReport(moduleData)
    setWarnings(warningsData)
    setLoading(false)

    // Update selected staff if modal is open
    if (selectedStaff) {
      const updated = workloadData.find((r: WorkloadReport) => r.staff.id === selectedStaff.staff.id)
      if (updated) {
        setSelectedStaff(updated)
      }
    }
  }, [selectedStaff])

  useEffect(() => {
    fetchReports()
  }, [])

  // Fetch all service roles
  const fetchAllServiceRoles = useCallback(async () => {
    const res = await fetch("/api/services")
    const data = await res.json()
    setAllServiceRoles(data)
  }, [])

  // Assign an existing service role to the selected staff member
  const assignServiceRole = useCallback(async (roleId: number) => {
    if (!selectedStaff) return
    await fetch(`/api/services/${roleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: selectedStaff.staff.id }),
    })
    await Promise.all([fetchReports(), fetchAllServiceRoles()])
  }, [selectedStaff, fetchReports, fetchAllServiceRoles])

  // Unassign a service role from the selected staff member
  const unassignServiceRole = useCallback(async (roleId: number) => {
    await fetch(`/api/services/${roleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: null }),
    })
    await Promise.all([fetchReports(), fetchAllServiceRoles()])
  }, [fetchReports, fetchAllServiceRoles])

  // Create a new service role and assign it to the selected staff member
  const createAndAssignServiceRole = useCallback(async (formData: { name: string; category: string; term: string }) => {
    if (!selectedStaff) return
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.name,
        category: formData.category,
        staff_id: selectedStaff.staff.id,
        term: formData.term || null,
      }),
    })
    setServiceRoleFormOpen(false)
    setNewRoleForm({ name: "", category: "Dept", term: "" })
    await Promise.all([fetchReports(), fetchAllServiceRoles()])
  }, [selectedStaff, fetchReports, fetchAllServiceRoles])

  // Open staff detail modal
  const openStaffModal = useCallback((report: WorkloadReport) => {
    setSelectedStaff(report)
    setStaffModalOpen(true)
    setEditingAllocationId(null)
    setServiceRoleFormOpen(false)
    setNewRoleForm({ name: "", category: "Dept", term: "" })
    // Fetch all service roles for the dropdown
    fetchAllServiceRoles()
  }, [fetchAllServiceRoles])

  // Save allocation hours
  const saveAllocationHours = useCallback(async (allocationId: number, moduleId: number, staffId: number, hours: number) => {
    if (hours === 0) {
      // Delete allocation
      await fetch(`/api/allocations/${moduleId}/${staffId}`, {
        method: "DELETE",
      })
    } else {
      // Update allocation
      await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, staffId, hours }),
      })
    }
    setEditingAllocationId(null)
    fetchReports()
  }, [fetchReports])

  // Delete allocation
  const deleteAllocation = useCallback(async (moduleId: number, staffId: number) => {
    await fetch(`/api/allocations/${moduleId}/${staffId}`, {
      method: "DELETE",
    })
    fetchReports()
  }, [fetchReports])

  function exportWorkloadCSV() {
    const headers = ["Name", "Abbrev", "Expected Load", "Actual Load", "Difference", "Status", "MT Hours", "HT Hours", "Term Balance", "Modules", "Service Roles"]
    const rows = workloadReport.map((r) => {
      const diff = r.teachingLoad - r.staff.expected_load
      const status = r.staff.expected_load === 0 ? "N/A" :
        diff > r.staff.expected_load * 0.1 ? "Over" :
        diff < -r.staff.expected_load * 0.1 ? "Under" : "Balanced"

      // Calculate term balance
      let mtHours = 0
      let htHours = 0
      r.allocations.forEach((a) => {
        if (a.module_term === "MT") {
          mtHours += a.load_hours
        } else if (a.module_term === "HT") {
          htHours += a.load_hours
        } else if (a.module_term === "FullYear") {
          mtHours += a.load_hours / 2
          htHours += a.load_hours / 2
        }
      })
      const totalTermHours = mtHours + htHours
      const mtPercent = totalTermHours > 0 ? (mtHours / totalTermHours) * 100 : 50
      const isImbalanced = totalTermHours > 0 && (mtPercent > 70 || mtPercent < 30)

      return [
        r.staff.name,
        r.staff.abbrev,
        r.staff.expected_load,
        r.teachingLoad.toFixed(1),
        diff.toFixed(1),
        status,
        mtHours.toFixed(1),
        htHours.toFixed(1),
        isImbalanced ? "Imbalanced" : "Balanced",
        r.allocations.map(a => `${a.module_code}(${a.load_hours}h)`).join("; "),
        r.serviceRoles.map(s => s.name).join("; ")
      ]
    })

    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n")
    downloadCSV(csv, "workload_report.csv")
  }

  function exportModuleCSV() {
    const headers = ["Code", "Name", "Level", "Term", "Load", "Allocated", "Status", "Staff"]
    const rows = moduleReport.map((m) => [
      m.code,
      m.name,
      m.level,
      m.term,
      m.load,
      m.allocated_hours.toFixed(1),
      m.allocation_status,
      m.allocations.map(a => `${a.staff_abbrev}(${a.load_hours}h)`).join("; ")
    ])

    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n")
    downloadCSV(csv, "module_report.csv")
  }

  function exportWarningsCSV() {
    const headers = ["Type", "Message"]
    const rows = warnings.map((w) => [w.type, w.message])

    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n")
    downloadCSV(csv, "warnings_report.csv")
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  async function exportTeachingPlanExcel(templateData: Map<string, TemplateRowData> | null) {
    console.log("[ReportsPage] exportTeachingPlanExcel called")
    console.log("[ReportsPage] templateData is:", templateData ? `Map with ${templateData.size} entries` : "null")

    // Convert Map to object for JSON serialization
    const templateObj: Record<string, TemplateRowData> | null = templateData
      ? Object.fromEntries(templateData)
      : null

    console.log("[ReportsPage] Converted to object:", templateObj ? `Object with ${Object.keys(templateObj).length} keys` : "null")
    if (templateObj) {
      const keys = Object.keys(templateObj)
      console.log("[ReportsPage] First 5 keys:", keys.slice(0, 5))
      keys.slice(0, 3).forEach(key => {
        console.log(`[ReportsPage] ${key}:`, templateObj[key])
      })
    }

    const requestBody = JSON.stringify({ templateData: templateObj })
    console.log("[ReportsPage] Request body length:", requestBody.length)

    const response = await fetch("/api/export/excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    })

    console.log("[ReportsPage] Response status:", response.status)

    if (!response.ok) {
      throw new Error("Failed to generate Excel file")
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get("Content-Disposition")
    const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
    link.download = filenameMatch ? filenameMatch[1] : "Teaching_Plan.xlsx"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function downloadTextReport(type: 'teaching' | 'service' | 'modules') {
    const response = await fetch(`/api/export/text?type=${type}`)
    if (!response.ok) {
      console.error("Failed to download text report")
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get("Content-Disposition")
    const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
    const defaultFilenames: Record<string, string> = {
      teaching: "Teaching_Allocations_Report.txt",
      service: "Service_Allocations_Report.txt",
      modules: "Module_Offering_Report.txt",
    }
    link.download = filenameMatch ? filenameMatch[1] : defaultFilenames[type]
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            View workload reports and allocation warnings
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Text Reports
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadTextReport('teaching')}>
                Teaching Allocations Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadTextReport('service')}>
                Service Allocations Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadTextReport('modules')}>
                Module Offering Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setExportModalOpen(true)} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export Teaching Plan
          </Button>
        </div>
      </div>

      <Tabs defaultValue="workload">
        <TabsList>
          <TabsTrigger value="workload" className="gap-2">
            <Users className="h-4 w-4" />
            Staff Workload
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Module Allocations
          </TabsTrigger>
          <TabsTrigger value="warnings" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Warnings
            {warnings.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {warnings.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Staff Workload Report */}
        <TabsContent value="workload" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={exportWorkloadCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Abbrev</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Term Balance</TableHead>
                  <TableHead>Levels</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Service Roles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workloadReport.map((r) => {
                  const diff = r.teachingLoad - r.staff.expected_load
                  const status =
                    r.staff.expected_load === 0
                      ? "secondary"
                      : diff > r.staff.expected_load * 0.1
                      ? "destructive"
                      : diff < -r.staff.expected_load * 0.1
                      ? "warning"
                      : "success"

                  // Calculate term balance (FullYear counts as half MT, half HT)
                  let mtHours = 0
                  let htHours = 0
                  r.allocations.forEach((a) => {
                    if (a.module_term === "MT") {
                      mtHours += a.load_hours
                    } else if (a.module_term === "HT") {
                      htHours += a.load_hours
                    } else if (a.module_term === "FullYear") {
                      mtHours += a.load_hours / 2
                      htHours += a.load_hours / 2
                    }
                    // TT is not counted in balance
                  })
                  const totalTermHours = mtHours + htHours
                  const mtPercent = totalTermHours > 0 ? (mtHours / totalTermHours) * 100 : 50
                  const htPercent = totalTermHours > 0 ? (htHours / totalTermHours) * 100 : 50
                  // Imbalance threshold: warn if one term is more than 70% of total
                  const isImbalanced = totalTermHours > 0 && (mtPercent > 70 || htPercent > 70)

                  // Calculate which levels this staff member teaches
                  const levels = {
                    UG: r.allocations.some((a) => a.module_level === "UG"),
                    "MSc IP": r.allocations.some((a) => a.module_level === "MSc IP"),
                    ASDS: r.allocations.some((a) => a.module_level === "ASDS"),
                    PhD: r.allocations.some((a) => a.module_level === "PhD"),
                  }

                  return (
                    <TableRow
                      key={r.staff.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openStaffModal(r)}
                    >
                      <TableCell className="font-medium">
                        <span className="text-blue-600 hover:underline">
                          {r.staff.name}
                        </span>
                        {r.staff.loa === 1 && (
                          <Badge variant="destructive" className="ml-2">
                            LOA
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{r.staff.abbrev}</TableCell>
                      <TableCell>
                        {r.staff.expected_load > 0
                          ? `${r.staff.expected_load}h`
                          : "-"}
                      </TableCell>
                      <TableCell>{r.teachingLoad.toFixed(1)}h</TableCell>
                      <TableCell>
                        <Badge variant={status}>
                          {status === "secondary"
                            ? "N/A"
                            : status === "destructive"
                            ? `+${diff.toFixed(1)}h Over`
                            : status === "warning"
                            ? `${diff.toFixed(1)}h Under`
                            : "Balanced"}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        {totalTermHours === 0 ? (
                          <span className="text-muted-foreground text-sm">-</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex h-4 w-full rounded overflow-hidden">
                              <div
                                className={`${isImbalanced && mtPercent > 70 ? "bg-amber-500" : "bg-blue-400"}`}
                                style={{ width: `${mtPercent}%` }}
                                title={`MT: ${mtHours.toFixed(1)}h`}
                              />
                              <div
                                className={`${isImbalanced && htPercent > 70 ? "bg-amber-500" : "bg-green-400"}`}
                                style={{ width: `${htPercent}%` }}
                                title={`HT: ${htHours.toFixed(1)}h`}
                              />
                            </div>
                            <div className={`text-xs ${isImbalanced ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                              MT: {mtHours.toFixed(1)}h | HT: {htHours.toFixed(1)}h
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {(["UG", "MSc IP", "ASDS", "PhD"] as const).map((level) => (
                            <div
                              key={level}
                              className="flex flex-col items-center"
                              title={level}
                            >
                              <span className="text-xs text-muted-foreground mb-0.5">
                                {level === "MSc IP" ? "MSc" : level}
                              </span>
                              {levels[level] ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <X className="h-4 w-4 text-red-400" />
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {r.allocations.slice(0, 3).map((a) => (
                            <Badge key={a.id} variant="outline">
                              {a.module_code}
                            </Badge>
                          ))}
                          {r.allocations.length > 3 && (
                            <Badge variant="secondary">
                              +{r.allocations.length - 3}
                            </Badge>
                          )}
                          {r.allocations.length === 0 && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <div className="flex flex-wrap gap-1">
                          {r.serviceRoles.slice(0, 2).map((s) => (
                            <Badge key={s.id} variant="secondary">
                              {s.name.length > 15
                                ? s.name.slice(0, 15) + "..."
                                : s.name}
                            </Badge>
                          ))}
                          {r.serviceRoles.length > 2 && (
                            <Badge variant="outline">
                              +{r.serviceRoles.length - 2}
                            </Badge>
                          )}
                          {r.serviceRoles.length === 0 && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Module Allocations Report */}
        <TabsContent value="modules" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={exportModuleCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Load</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Allocated To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moduleReport.map((m) => {
                  const statusVariant =
                    m.allocation_status === "full"
                      ? "success"
                      : m.allocation_status === "partial"
                      ? "warning"
                      : "destructive"

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.code}</TableCell>
                      <TableCell>{m.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.level}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{m.term}</Badge>
                      </TableCell>
                      <TableCell>
                        {m.allocated_hours.toFixed(1)}h / {m.load}h
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant}>
                          {m.allocation_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {m.allocations.map((a) => (
                            <Badge key={a.id} variant="outline">
                              {a.staff_abbrev} ({a.load_hours}h)
                            </Badge>
                          ))}
                          {m.allocations.length === 0 && (
                            <span className="text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Warnings Report */}
        <TabsContent value="warnings" className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={exportWarningsCSV}
              disabled={warnings.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {warnings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="text-green-500 mb-2">
                  <AlertTriangle className="h-8 w-8 mx-auto" />
                </div>
                <p className="text-lg font-medium">No warnings</p>
                <p className="text-muted-foreground">
                  All allocations look good!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Group warnings by type */}
              {["Term Unavailable", "Load Imbalance", "Unallocated Module"].map(
                (type) => {
                  const typeWarnings = warnings.filter((w) => w.type === type)
                  if (typeWarnings.length === 0) return null

                  return (
                    <Card key={type}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle
                            className={`h-5 w-5 ${
                              type === "Term Unavailable"
                                ? "text-red-500"
                                : type === "Load Imbalance"
                                ? "text-yellow-500"
                                : "text-orange-500"
                            }`}
                          />
                          {type}
                          <Badge variant="outline">{typeWarnings.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {typeWarnings.map((w, i) => (
                            <Alert key={i} variant={type === "Term Unavailable" ? "destructive" : "warning"}>
                              <AlertDescription>{w.message}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                }
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        onExport={exportTeachingPlanExcel}
      />

      {/* Staff Detail Modal */}
      <Dialog open={staffModalOpen} onOpenChange={setStaffModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedStaff && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedStaff.staff.name}
                  <Badge variant="outline">{selectedStaff.staff.abbrev}</Badge>
                  {selectedStaff.staff.loa === 1 && (
                    <Badge variant="destructive">LOA</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Staff Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground">Expected Load</div>
                    <div className="text-xl font-semibold">
                      {selectedStaff.staff.expected_load > 0 ? `${selectedStaff.staff.expected_load}h` : "-"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground">Actual Load</div>
                    <div className="text-xl font-semibold">{selectedStaff.teachingLoad.toFixed(1)}h</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground">Difference</div>
                    <div className={`text-xl font-semibold ${
                      selectedStaff.teachingLoad - selectedStaff.staff.expected_load > 0
                        ? "text-red-600"
                        : selectedStaff.teachingLoad - selectedStaff.staff.expected_load < 0
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}>
                      {(selectedStaff.teachingLoad - selectedStaff.staff.expected_load) > 0 ? "+" : ""}
                      {(selectedStaff.teachingLoad - selectedStaff.staff.expected_load).toFixed(1)}h
                    </div>
                  </div>
                </div>

                {/* Availability Badges */}
                <div className="flex gap-2 flex-wrap">
                  {selectedStaff.staff.mt_available === 0 && (
                    <Badge variant="outline" className="text-yellow-600">Not available MT</Badge>
                  )}
                  {selectedStaff.staff.ht_available === 0 && (
                    <Badge variant="outline" className="text-yellow-600">Not available HT</Badge>
                  )}
                </div>

                {/* Allocations Table */}
                <div>
                  <h4 className="font-medium mb-3">Module Allocations</h4>
                  {selectedStaff.allocations.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No allocations</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Module</TableHead>
                            <TableHead>Term</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedStaff.allocations.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{a.module_code}</span>
                                  <span className="text-muted-foreground ml-2">{a.module_name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{a.module_term}</Badge>
                              </TableCell>
                              <TableCell>
                                {editingAllocationId === a.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={editHoursValue}
                                      onChange={(e) => setEditHoursValue(e.target.value)}
                                      className="w-20 h-8"
                                      min="0"
                                      step="0.5"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          const hours = parseFloat(editHoursValue)
                                          if (!isNaN(hours) && hours >= 0) {
                                            saveAllocationHours(a.id, a.module_id, a.staff_id, hours)
                                          }
                                        } else if (e.key === "Escape") {
                                          setEditingAllocationId(null)
                                        }
                                      }}
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        const hours = parseFloat(editHoursValue)
                                        if (!isNaN(hours) && hours >= 0) {
                                          saveAllocationHours(a.id, a.module_id, a.staff_id, hours)
                                        }
                                      }}
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => setEditingAllocationId(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span>{a.load_hours}h</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {editingAllocationId !== a.id && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingAllocationId(a.id)
                                        setEditHoursValue(a.load_hours.toString())
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deleteAllocation(a.module_id, a.staff_id)
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Service Roles */}
                <div>
                  <h4 className="font-medium mb-3">Service Roles</h4>

                  {/* Current assigned roles */}
                  {selectedStaff.serviceRoles.length > 0 ? (
                    <div className="rounded-md border mb-3">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Role</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Term</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedStaff.serviceRoles.map((role) => (
                            <TableRow key={role.id}>
                              <TableCell className="font-medium">{role.name}</TableCell>
                              <TableCell>
                                <Badge variant={role.category === "Dept" ? "outline" : "secondary"}>
                                  {role.category}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {role.term ? (
                                  <Badge variant="secondary">{role.term}</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => unassignServiceRole(role.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm mb-3">No service roles assigned</p>
                  )}

                  {/* Assign existing unassigned role */}
                  {(() => {
                    const unassignedRoles = allServiceRoles.filter((r) => r.staff_id === null)
                    if (unassignedRoles.length === 0) return null
                    return (
                      <div className="mb-3">
                        <Select onValueChange={(val) => assignServiceRole(parseInt(val))}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Assign an existing role..." />
                          </SelectTrigger>
                          <SelectContent>
                            {unassignedRoles.map((role) => (
                              <SelectItem key={role.id} value={role.id.toString()}>
                                {role.name} ({role.category})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  })()}

                  {/* Create new role inline form */}
                  {serviceRoleFormOpen ? (
                    <div className="rounded-md border p-3 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="new-role-name">Name</Label>
                        <Input
                          id="new-role-name"
                          value={newRoleForm.name}
                          onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                          placeholder="Role name"
                          autoFocus
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={newRoleForm.category}
                            onValueChange={(val) => setNewRoleForm({ ...newRoleForm, category: val as "Dept" | "School" })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dept">Dept</SelectItem>
                              <SelectItem value="School">School</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-role-term">Term</Label>
                          <Input
                            id="new-role-term"
                            value={newRoleForm.term}
                            onChange={(e) => setNewRoleForm({ ...newRoleForm, term: e.target.value })}
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => createAndAssignServiceRole(newRoleForm)}
                          disabled={!newRoleForm.name.trim()}
                        >
                          Create & Assign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setServiceRoleFormOpen(false)
                            setNewRoleForm({ name: "", category: "Dept", term: "" })
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setServiceRoleFormOpen(true)}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      New Role
                    </Button>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStaffModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
