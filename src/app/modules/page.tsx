"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, Trash2, X } from "lucide-react"
import type { ModuleWithAllocations } from "@/types"

const LEVELS = ["All", "UG", "MSc IP", "ASDS", "PhD"] as const
const TERMS = ["All", "MT", "HT", "TT", "FullYear"] as const

export default function ModulesPage() {
  const [modules, setModules] = useState<ModuleWithAllocations[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState<string>("All")
  const [termFilter, setTermFilter] = useState<string>("All")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<ModuleWithAllocations | null>(null)
  const [deletingModule, setDeletingModule] = useState<ModuleWithAllocations | null>(null)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    level: "UG" as "UG" | "MSc IP" | "ASDS" | "PhD",
    term: "MT" as "MT" | "HT" | "TT" | "FullYear",
    load: 0,
    ects: null as number | null,
    ectsCustom: "", // For "other" option
    notes: "",
  })
  const [error, setError] = useState<string | null>(null)

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [batchEditDialogOpen, setBatchEditDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [batchEditField, setBatchEditField] = useState<"level" | "term" | "ects" | null>(null)
  const [batchEditValue, setBatchEditValue] = useState<string>("")
  const [batchEctsCustom, setBatchEctsCustom] = useState<string>("")
  const [batchProcessing, setBatchProcessing] = useState(false)

  async function fetchModules() {
    const params = new URLSearchParams({ withAllocations: "true" })
    if (levelFilter !== "All") params.set("level", levelFilter)
    if (termFilter !== "All") params.set("term", termFilter)

    const res = await fetch(`/api/modules?${params}`)
    const data = await res.json()
    setModules(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchModules()
  }, [levelFilter, termFilter])

  function openCreateDialog() {
    setEditingModule(null)
    setFormData({
      code: "",
      name: "",
      level: "UG",
      term: "MT",
      load: 0,
      ects: null,
      ectsCustom: "",
      notes: "",
    })
    setError(null)
    setDialogOpen(true)
  }

  function openEditDialog(m: ModuleWithAllocations) {
    setEditingModule(m)
    const isStandardEcts = m.ects === 5 || m.ects === 10 || m.ects === 30
    setFormData({
      code: m.code,
      name: m.name,
      level: m.level,
      term: m.term,
      load: m.load,
      ects: isStandardEcts ? m.ects : (m.ects !== null ? -1 : null), // -1 signals "other"
      ectsCustom: !isStandardEcts && m.ects !== null ? String(m.ects) : "",
      notes: m.notes || "",
    })
    setError(null)
    setDialogOpen(true)
  }

  function openDeleteDialog(m: ModuleWithAllocations) {
    setDeletingModule(m)
    setDeleteDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Resolve ECTS value (handle "other" case)
    let ectsValue: number | null = null
    if (formData.ects === -1) {
      // "Other" selected - use custom value
      ectsValue = formData.ectsCustom ? parseInt(formData.ectsCustom, 10) : null
    } else {
      ectsValue = formData.ects
    }

    const url = editingModule ? `/api/modules/${editingModule.id}` : "/api/modules"
    const method = editingModule ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: formData.code,
        name: formData.name,
        level: formData.level,
        term: formData.term,
        load: formData.load,
        ects: ectsValue,
        notes: formData.notes,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "An error occurred")
      return
    }

    setDialogOpen(false)
    fetchModules()
  }

  async function handleDelete() {
    if (!deletingModule) return

    await fetch(`/api/modules/${deletingModule.id}`, { method: "DELETE" })
    setDeleteDialogOpen(false)
    setDeletingModule(null)
    fetchModules()
  }

  // Batch selection helpers
  const allSelected = useMemo(() => {
    return modules.length > 0 && modules.every(m => selectedIds.has(m.id))
  }, [modules, selectedIds])

  const someSelected = useMemo(() => {
    return modules.some(m => selectedIds.has(m.id)) && !allSelected
  }, [modules, selectedIds, allSelected])

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(modules.map(m => m.id)))
    }
  }

  function toggleSelect(id: number) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function openBatchEditDialog(field: "level" | "term" | "ects") {
    setBatchEditField(field)
    setBatchEditValue("")
    setBatchEctsCustom("")
    setBatchEditDialogOpen(true)
  }

  async function handleBatchEdit() {
    if (!batchEditField || !batchEditValue || selectedIds.size === 0) return

    // Resolve ECTS value for batch edit
    let ectsValue: number | null = null
    if (batchEditField === "ects") {
      if (batchEditValue === "other") {
        ectsValue = batchEctsCustom ? parseInt(batchEctsCustom, 10) : null
      } else {
        ectsValue = parseInt(batchEditValue, 10)
      }
    }

    setBatchProcessing(true)
    try {
      const updatePromises = Array.from(selectedIds).map(id => {
        const module = modules.find(m => m.id === id)
        if (!module) return Promise.resolve()

        return fetch(`/api/modules/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: module.code,
            name: module.name,
            level: batchEditField === "level" ? batchEditValue : module.level,
            term: batchEditField === "term" ? batchEditValue : module.term,
            load: module.load,
            ects: batchEditField === "ects" ? ectsValue : module.ects,
            notes: module.notes,
          }),
        })
      })

      await Promise.all(updatePromises)
      setBatchEditDialogOpen(false)
      setSelectedIds(new Set())
      fetchModules()
    } catch (error) {
      console.error("Batch edit failed:", error)
    } finally {
      setBatchProcessing(false)
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return

    setBatchProcessing(true)
    try {
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`/api/modules/${id}`, { method: "DELETE" })
      )

      await Promise.all(deletePromises)
      setBatchDeleteDialogOpen(false)
      setSelectedIds(new Set())
      fetchModules()
    } catch (error) {
      console.error("Batch delete failed:", error)
    } finally {
      setBatchProcessing(false)
    }
  }

  function getStatusBadge(m: ModuleWithAllocations) {
    const variant =
      m.allocation_status === "full"
        ? "success"
        : m.allocation_status === "partial"
        ? "warning"
        : "destructive"

    return (
      <Badge variant={variant}>
        {m.allocated_hours.toFixed(1)}h / {m.load.toFixed(1)}h
      </Badge>
    )
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modules</h1>
          <p className="text-muted-foreground">
            Manage modules and their allocations
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Module
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
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

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <span className="font-medium">{selectedIds.size} module{selectedIds.size > 1 ? "s" : ""} selected</span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">Batch edit:</span>
            <Button variant="outline" size="sm" onClick={() => openBatchEditDialog("level")}>
              Change Level
            </Button>
            <Button variant="outline" size="sm" onClick={() => openBatchEditDialog("term")}>
              Change Term
            </Button>
            <Button variant="outline" size="sm" onClick={() => openBatchEditDialog("ects")}>
              Change ECTS
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBatchDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all modules"
                />
              </TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>ECTS</TableHead>
              <TableHead>Load</TableHead>
              <TableHead>Allocated To</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((m) => (
              <TableRow key={m.id} className={selectedIds.has(m.id) ? "bg-blue-50" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(m.id)}
                    onChange={() => toggleSelect(m.id)}
                    aria-label={`Select ${m.code}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{m.code}</TableCell>
                <TableCell>{m.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{m.level}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{m.term}</Badge>
                </TableCell>
                <TableCell>
                  {m.ects !== null ? m.ects : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>{getStatusBadge(m)}</TableCell>
                <TableCell>
                  {m.allocations.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {m.allocations.map((a) => (
                        <Badge key={a.id} variant="outline">
                          {a.staff_abbrev} ({a.load_hours}h)
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[150px] truncate">
                  {m.notes || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(m)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {modules.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  No modules found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingModule ? "Edit Module" : "Add Module"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Module Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="load">Load (hours)</Label>
                  <Input
                    id="load"
                    type="number"
                    step="0.1"
                    value={formData.load}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        load: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Module Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value: "UG" | "MSc IP" | "ASDS" | "PhD") =>
                      setFormData({ ...formData, level: value })
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
                  <Label htmlFor="term">Term</Label>
                  <Select
                    value={formData.term}
                    onValueChange={(value: "MT" | "HT" | "TT" | "FullYear") =>
                      setFormData({ ...formData, term: value })
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
                <Label htmlFor="ects">ECTS</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.ects === null ? "" : String(formData.ects)}
                    onValueChange={(value) => {
                      if (value === "-1") {
                        setFormData({ ...formData, ects: -1, ectsCustom: "" })
                      } else if (value === "") {
                        setFormData({ ...formData, ects: null, ectsCustom: "" })
                      } else {
                        setFormData({ ...formData, ects: parseInt(value, 10), ectsCustom: "" })
                      }
                    }}
                  >
                    <SelectTrigger className={formData.ects === -1 ? "w-[100px]" : ""}>
                      <SelectValue placeholder="Select ECTS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="-1">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.ects === -1 && (
                    <Input
                      type="number"
                      placeholder="Enter ECTS"
                      value={formData.ectsCustom}
                      onChange={(e) =>
                        setFormData({ ...formData, ectsCustom: e.target.value })
                      }
                      className="w-[100px]"
                      min="1"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingModule ? "Save Changes" : "Add Module"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingModule?.code} - {deletingModule?.name}?
              This will also remove all allocations for this module. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Edit Dialog */}
      <Dialog open={batchEditDialogOpen} onOpenChange={setBatchEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Batch Edit {batchEditField === "level" ? "Level" : batchEditField === "term" ? "Term" : "ECTS"}
            </DialogTitle>
            <DialogDescription>
              Change the {batchEditField} for {selectedIds.size} selected module{selectedIds.size > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="batchValue" className="mb-2 block">
              New {batchEditField === "level" ? "Level" : batchEditField === "term" ? "Term" : "ECTS"}
            </Label>
            {batchEditField === "level" ? (
              <Select value={batchEditValue} onValueChange={setBatchEditValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UG">UG</SelectItem>
                  <SelectItem value="MSc IP">MSc IP</SelectItem>
                  <SelectItem value="ASDS">ASDS</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                </SelectContent>
              </Select>
            ) : batchEditField === "term" ? (
              <Select value={batchEditValue} onValueChange={setBatchEditValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MT">MT</SelectItem>
                  <SelectItem value="HT">HT</SelectItem>
                  <SelectItem value="TT">TT</SelectItem>
                  <SelectItem value="FullYear">Full Year</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Select value={batchEditValue} onValueChange={(v) => { setBatchEditValue(v); setBatchEctsCustom(""); }}>
                  <SelectTrigger className={batchEditValue === "other" ? "w-[100px]" : ""}>
                    <SelectValue placeholder="Select ECTS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {batchEditValue === "other" && (
                  <Input
                    type="number"
                    placeholder="Enter ECTS"
                    value={batchEctsCustom}
                    onChange={(e) => setBatchEctsCustom(e.target.value)}
                    className="w-[100px]"
                    min="1"
                  />
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchEditDialogOpen(false)}
              disabled={batchProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBatchEdit}
              disabled={!batchEditValue || (batchEditValue === "other" && !batchEctsCustom) || batchProcessing}
            >
              {batchProcessing ? "Updating..." : `Update ${selectedIds.size} Module${selectedIds.size > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Module{selectedIds.size > 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected module{selectedIds.size > 1 ? "s" : ""}?
              This will also remove all allocations for these modules. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={batchProcessing}
            >
              {batchProcessing ? "Deleting..." : `Delete ${selectedIds.size} Module${selectedIds.size > 1 ? "s" : ""}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
