"use client"

import { useState, useEffect } from "react"
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
import { Plus, Pencil, Trash2, BarChart3 } from "lucide-react"
import type { StaffWithLoad, StaffRank, StaffGender, StaffAffiliation } from "@/types"

const AFFILIATIONS: { value: StaffAffiliation; label: string }[] = [
  { value: 'External', label: 'External' },
  { value: 'Honorary', label: 'Honorary' },
]

const RANKS: StaffRank[] = ['Teaching Fellow', 'Assistant Prof', 'Associate Prof', 'Prof']

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffWithLoad[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffWithLoad | null>(null)
  const [deletingStaff, setDeletingStaff] = useState<StaffWithLoad | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    abbrev: "",
    loa: 0,
    mt_available: 1,
    ht_available: 1,
    expected_load: 0,
    notes: "",
    rank: null as StaffRank | null,
    gender: null as StaffGender | null,
    affiliation: null as StaffAffiliation | null,
  })
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [supervision, setSupervision] = useState<{
    capstone: { staff_id: number; abbrev: string }[];
    mscDissertation: { staff_id: number; abbrev: string }[];
    asdsDissertation: { staff_id: number; abbrev: string }[];
  } | null>(null)

  async function fetchStaff() {
    const res = await fetch("/api/staff?withLoad=true&includeSupervision=true")
    const data = await res.json()
    setStaff(data.staff)
    setSupervision(data.supervision)
    setLoading(false)
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  function openCreateDialog() {
    setEditingStaff(null)
    setFormData({
      name: "",
      abbrev: "",
      loa: 0,
      mt_available: 1,
      ht_available: 1,
      expected_load: 0,
      notes: "",
      rank: null,
      gender: null,
      affiliation: null,
    })
    setError(null)
    setDialogOpen(true)
  }

  function openEditDialog(s: StaffWithLoad) {
    setEditingStaff(s)
    setFormData({
      name: s.name,
      abbrev: s.abbrev,
      loa: s.loa,
      mt_available: s.mt_available,
      ht_available: s.ht_available,
      expected_load: s.expected_load,
      notes: s.notes || "",
      rank: s.rank,
      gender: s.gender,
      affiliation: s.affiliation,
    })
    setError(null)
    setDialogOpen(true)
  }

  function openDeleteDialog(s: StaffWithLoad) {
    setDeletingStaff(s)
    setDeleteDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const url = editingStaff ? `/api/staff/${editingStaff.id}` : "/api/staff"
    const method = editingStaff ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "An error occurred")
      return
    }

    setDialogOpen(false)
    fetchStaff()
  }

  async function handleDelete() {
    if (!deletingStaff) return

    await fetch(`/api/staff/${deletingStaff.id}`, { method: "DELETE" })
    setDeleteDialogOpen(false)
    setDeletingStaff(null)
    fetchStaff()
  }

  async function inlineUpdate(id: number, field: Partial<StaffWithLoad>) {
    await fetch(`/api/staff/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(field),
    })
    fetchStaff()
  }

  async function batchUpdate(field: Partial<StaffWithLoad>) {
    await Promise.all(
      Array.from(selected).map((id) =>
        fetch(`/api/staff/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(field),
        })
      )
    )
    fetchStaff()
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === staff.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(staff.map((s) => s.id)))
    }
  }

  function getLoadBadge(s: StaffWithLoad) {
    if (s.expected_load === 0) {
      return <Badge variant="secondary">{s.actual_load.toFixed(1)}h</Badge>
    }

    const variant =
      s.load_status === "under"
        ? "warning"
        : s.load_status === "over"
        ? "destructive"
        : "success"

    return (
      <Badge variant={variant}>
        {s.actual_load.toFixed(1)}h / {s.expected_load.toFixed(1)}h
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
          <h1 className="text-3xl font-bold">Staff</h1>
          <p className="text-muted-foreground">
            Manage staff members and their availability
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAnalysisOpen(true)}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Analysis
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* Batch action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {selected.size} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Set Rank:</span>
            <Select
              value=""
              onValueChange={(v) =>
                batchUpdate({ rank: v === "none" ? null : v as StaffRank })
              }
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Choose..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Clear</SelectItem>
                {RANKS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Set Gender:</span>
            <Select
              value=""
              onValueChange={(v) =>
                batchUpdate({ gender: v === "none" ? null : v as StaffGender })
              }
            >
              <SelectTrigger className="h-8 w-[80px] text-xs">
                <SelectValue placeholder="Choose..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Clear</SelectItem>
                <SelectItem value="M">M</SelectItem>
                <SelectItem value="F">F</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Set LOA:</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => batchUpdate({ loa: 1 })}
            >
              LOA
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => batchUpdate({ loa: 0 })}
            >
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Affiliation:</span>
            <Select
              value=""
              onValueChange={(v) =>
                batchUpdate({ affiliation: v === "none" ? null : v as StaffAffiliation })
              }
            >
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue placeholder="Choose..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Clear</SelectItem>
                {AFFILIATIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSelected(new Set())}
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={staff.length > 0 && selected.size === staff.length}
                  ref={(el) => {
                    if (el) el.indeterminate = selected.size > 0 && selected.size < staff.length
                  }}
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Abbrev</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Affiliation</TableHead>
              <TableHead>LOA</TableHead>
              <TableHead>MT</TableHead>
              <TableHead>HT</TableHead>
              <TableHead>Load</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selected.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.abbrev}</TableCell>
                <TableCell>
                  <Select
                    value={s.rank || "none"}
                    onValueChange={(v) =>
                      inlineUpdate(s.id, { rank: v === "none" ? null : v as StaffRank })
                    }
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      {RANKS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={s.gender || "none"}
                    onValueChange={(v) =>
                      inlineUpdate(s.id, { gender: v === "none" ? null : v as StaffGender })
                    }
                  >
                    <SelectTrigger className="h-8 w-[60px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="F">F</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={s.affiliation || "none"}
                    onValueChange={(v) =>
                      inlineUpdate(s.id, { affiliation: v === "none" ? null : v as StaffAffiliation })
                    }
                  >
                    <SelectTrigger className="h-8 w-[100px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      {AFFILIATIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={s.loa ? "destructive" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => inlineUpdate(s.id, { loa: s.loa ? 0 : 1 })}
                  >
                    {s.loa ? "LOA" : "-"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {s.mt_available ? (
                    <Badge variant="success">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {s.ht_available ? (
                    <Badge variant="success">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </TableCell>
                <TableCell>{getLoadBadge(s)}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {s.notes || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(s)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {staff.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8">
                  No staff members found. Add one to get started.
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
              {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
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
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abbrev">Abbreviation</Label>
                  <Input
                    id="abbrev"
                    value={formData.abbrev}
                    onChange={(e) =>
                      setFormData({ ...formData, abbrev: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Rank</Label>
                  <Select
                    value={formData.rank || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        rank: value === "none" ? null : value as StaffRank,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      {RANKS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={formData.gender || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        gender: value === "none" ? null : value as StaffGender,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="F">F</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Affiliation</Label>
                  <Select
                    value={formData.affiliation || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        affiliation: value === "none" ? null : value as StaffAffiliation,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select affiliation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Department</SelectItem>
                      <SelectItem value="External">External</SelectItem>
                      <SelectItem value="Honorary">Honorary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_load">Expected Load (hours)</Label>
                <Input
                  id="expected_load"
                  type="number"
                  step="0.1"
                  value={formData.expected_load}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expected_load: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.loa === 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        loa: e.target.checked ? 1 : 0,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-sm">On Leave of Absence</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.mt_available === 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mt_available: e.target.checked ? 1 : 0,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Available MT</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.ht_available === 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ht_available: e.target.checked ? 1 : 0,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Available HT</span>
                </label>
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
                {editingStaff ? "Save Changes" : "Add Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Analysis Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Staff Analysis</DialogTitle>
          </DialogHeader>
          {(() => {
            const dept = staff.filter((s) => !s.affiliation)
            const excluded = staff.length - dept.length
            const total = dept.length
            if (total === 0) return <p className="text-sm text-muted-foreground py-4">No department staff data.</p>

            const active = dept.filter((s) => !s.loa)
            const onLoa = total - active.length
            const gM = dept.filter((s) => s.gender === "M").length
            const gF = dept.filter((s) => s.gender === "F").length
            const gU = total - gM - gF

            const rankCounts = RANKS.map((r) => ({
              label: r,
              count: dept.filter((s) => s.rank === r).length,
            }))
            const rankUnset = total - rankCounts.reduce((s, r) => s + r.count, 0)

            const loads = dept.filter((s) => s.expected_load > 0)
            const expectedVals = loads.map((s) => s.expected_load).sort((a, b) => a - b)
            const actualVals = loads.map((s) => s.actual_load).sort((a, b) => a - b)
            const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
            const median = (arr: number[]) => {
              if (!arr.length) return 0
              const m = Math.floor(arr.length / 2)
              return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2
            }

            const over = dept.filter((s) => s.load_status === "over").length
            const under = dept.filter((s) => s.load_status === "under").length
            const balanced = dept.filter((s) => s.load_status === "balanced").length

            const mtAvail = dept.filter((s) => s.mt_available).length
            const htAvail = dept.filter((s) => s.ht_available).length

            const bar = (value: number, max: number, color: string) => (
              <div className="h-2 rounded-full bg-muted overflow-hidden flex-1">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: max > 0 ? `${(value / max) * 100}%` : "0%" }}
                />
              </div>
            )

            const statRow = (label: string, value: number, max: number, color: string) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="w-[120px] text-muted-foreground truncate">{label}</span>
                {bar(value, max, color)}
                <span className="w-[32px] text-right font-medium">{value}</span>
              </div>
            )

            return (
              <div className="space-y-5 py-2">
                {excluded > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Excluding {excluded} external/honorary staff
                  </p>
                )}
                {/* Headcount */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Headcount</h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-md border px-3 py-2">
                      <div className="text-2xl font-bold">{total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="rounded-md border px-3 py-2">
                      <div className="text-2xl font-bold">{active.length}</div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                    <div className="rounded-md border px-3 py-2">
                      <div className="text-2xl font-bold">{onLoa}</div>
                      <div className="text-xs text-muted-foreground">On LOA</div>
                    </div>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Gender</h4>
                  <div className="space-y-1.5">
                    {statRow("Male", gM, total, "bg-blue-500")}
                    {statRow("Female", gF, total, "bg-pink-500")}
                    {gU > 0 && statRow("Unset", gU, total, "bg-gray-400")}
                  </div>
                </div>

                {/* Rank */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Rank</h4>
                  <div className="space-y-1.5">
                    {rankCounts.map((r) =>
                      statRow(r.label, r.count, total, "bg-primary")
                    )}
                    {rankUnset > 0 && statRow("Unset", rankUnset, total, "bg-gray-400")}
                  </div>
                </div>

                {/* Load */}
                {loads.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Load (staff with target &gt; 0)</h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg expected</span>
                        <span className="font-medium">{avg(expectedVals).toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg actual</span>
                        <span className="font-medium">{avg(actualVals).toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Median expected</span>
                        <span className="font-medium">{median(expectedVals).toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Median actual</span>
                        <span className="font-medium">{median(actualVals).toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Range expected</span>
                        <span className="font-medium">{expectedVals[0].toFixed(1)}&ndash;{expectedVals[expectedVals.length - 1].toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Range actual</span>
                        <span className="font-medium">{actualVals[0].toFixed(1)}&ndash;{actualVals[actualVals.length - 1].toFixed(1)}h</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 mt-3">
                      {statRow("Balanced", balanced, total, "bg-green-500")}
                      {statRow("Under", under, total, "bg-yellow-500")}
                      {statRow("Over", over, total, "bg-red-500")}
                    </div>
                  </div>
                )}

                {/* Availability */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Term Availability</h4>
                  <div className="space-y-1.5">
                    {statRow("MT available", mtAvail, total, "bg-green-500")}
                    {statRow("HT available", htAvail, total, "bg-green-500")}
                  </div>
                </div>

                {/* Supervision */}
                {supervision && (() => {
                  const capCount = supervision.capstone.filter(s => dept.some(d => d.id === s.staff_id)).length
                  const mscCount = supervision.mscDissertation.filter(s => dept.some(d => d.id === s.staff_id)).length
                  const asdsCount = supervision.asdsDissertation.filter(s => dept.some(d => d.id === s.staff_id)).length
                  const maxSuper = Math.max(capCount, mscCount, asdsCount, 1)

                  // Staff with any supervision
                  const supervisorIds = new Set([
                    ...supervision.capstone.map(s => s.staff_id),
                    ...supervision.mscDissertation.map(s => s.staff_id),
                    ...supervision.asdsDissertation.map(s => s.staff_id),
                  ])
                  const withSupervision = dept.filter(s => supervisorIds.has(s.id)).length
                  const withoutSupervision = dept.length - withSupervision

                  return (
                    <>
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Supervision Assignments</h4>
                        <div className="space-y-1.5">
                          {statRow("UG Capstone", capCount, maxSuper, "bg-blue-500")}
                          {statRow("MSc IP Diss.", mscCount, maxSuper, "bg-purple-500")}
                          {statRow("ASDS Diss.", asdsCount, maxSuper, "bg-indigo-500")}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Supervision Coverage</h4>
                        <div className="space-y-1.5">
                          {statRow("Has supervision", withSupervision, total, "bg-green-500")}
                          {statRow("No supervision", withoutSupervision, total, "bg-orange-500")}
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingStaff?.name}? This will
              also remove all their teaching allocations. This action cannot be
              undone.
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
    </div>
  )
}
