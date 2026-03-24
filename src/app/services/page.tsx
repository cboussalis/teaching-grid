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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, Trash2 } from "lucide-react"
import type { ServiceRoleWithStaff, Staff } from "@/types"

const CATEGORIES = ["All", "Dept", "School"] as const

export default function ServicesPage() {
  const [roles, setRoles] = useState<ServiceRoleWithStaff[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>("All")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<ServiceRoleWithStaff | null>(null)
  const [deletingRole, setDeletingRole] = useState<ServiceRoleWithStaff | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    category: "Dept" as "Dept" | "School",
    staff_id: null as number | null,
    term: "",
  })
  const [error, setError] = useState<string | null>(null)

  async function fetchData() {
    const [rolesRes, staffRes] = await Promise.all([
      fetch("/api/services"),
      fetch("/api/staff"),
    ])
    const [rolesData, staffData] = await Promise.all([
      rolesRes.json(),
      staffRes.json(),
    ])
    setRoles(rolesData)
    setStaff(staffData)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredRoles = categoryFilter === "All"
    ? roles
    : roles.filter((r) => r.category === categoryFilter)

  function openCreateDialog() {
    setEditingRole(null)
    setFormData({
      name: "",
      category: "Dept",
      staff_id: null,
      term: "",
    })
    setError(null)
    setDialogOpen(true)
  }

  function openEditDialog(r: ServiceRoleWithStaff) {
    setEditingRole(r)
    setFormData({
      name: r.name,
      category: r.category,
      staff_id: r.staff_id,
      term: r.term || "",
    })
    setError(null)
    setDialogOpen(true)
  }

  function openDeleteDialog(r: ServiceRoleWithStaff) {
    setDeletingRole(r)
    setDeleteDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const url = editingRole ? `/api/services/${editingRole.id}` : "/api/services"
    const method = editingRole ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        staff_id: formData.staff_id || null,
        term: formData.term || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "An error occurred")
      return
    }

    setDialogOpen(false)
    fetchData()
  }

  async function handleDelete() {
    if (!deletingRole) return

    await fetch(`/api/services/${deletingRole.id}`, { method: "DELETE" })
    setDeleteDialogOpen(false)
    setDeletingRole(null)
    fetchData()
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Roles</h1>
          <p className="text-muted-foreground">
            Manage departmental and school service roles
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service Role
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
            <TabsList>
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat} value={cat}>
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Term</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoles.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>
                  <Badge variant={r.category === "Dept" ? "default" : "secondary"}>
                    {r.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.staff_name ? (
                    <Badge variant="outline">
                      {r.staff_abbrev} - {r.staff_name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>{r.term || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(r)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredRoles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No service roles found. Add one to get started.
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
              {editingRole ? "Edit Service Role" : "Add Service Role"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
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
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: "Dept" | "School") =>
                      setFormData({ ...formData, category: value })
                    }
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
                  <Label htmlFor="term">Term (optional)</Label>
                  <Input
                    id="term"
                    value={formData.term}
                    onChange={(e) =>
                      setFormData({ ...formData, term: e.target.value })
                    }
                    placeholder="e.g., MT, HT, Full Year"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff_id">Assigned To</Label>
                <Select
                  value={formData.staff_id?.toString() || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      staff_id: value === "none" ? null : parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.abbrev} - {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {editingRole ? "Save Changes" : "Add Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role &quot;{deletingRole?.name}&quot;?
              This action cannot be undone.
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
