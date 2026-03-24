"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Download, Plus, Trash2, Mail, Copy, Check } from "lucide-react"
import type {
  CommunicationWithStaff,
  CommunicationDetail,
  CommunicationStats,
  CommunicationStatus,
} from "@/types"

const STATUS_CONFIG: Record<CommunicationStatus, { label: string; variant: "secondary" | "default" | "warning" | "success" | "destructive" }> = {
  not_started: { label: "Not Started", variant: "secondary" },
  email_sent: { label: "Email Sent", variant: "default" },
  in_discussion: { label: "In Discussion", variant: "warning" },
  agreed: { label: "Agreed", variant: "success" },
  disputed: { label: "Disputed", variant: "destructive" },
}

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "not_started", label: "Not Started" },
  { value: "email_sent", label: "Email Sent" },
  { value: "in_discussion", label: "In Discussion" },
  { value: "agreed", label: "Agreed" },
  { value: "disputed", label: "Disputed" },
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "Z")
  return d.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr + "Z")
  return d.toLocaleString("en-IE", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export default function CommunicationsPage() {
  const [communications, setCommunications] = useState<CommunicationWithStaff[]>([])
  const [stats, setStats] = useState<CommunicationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [detail, setDetail] = useState<CommunicationDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [emailDraft, setEmailDraft] = useState<string>("")
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailCopied, setEmailCopied] = useState(false)

  async function fetchData() {
    const [commsRes, statsRes] = await Promise.all([
      fetch("/api/communications"),
      fetch("/api/communications?type=stats"),
    ])
    const [commsData, statsData] = await Promise.all([
      commsRes.json(),
      statsRes.json(),
    ])
    setCommunications(commsData)
    setStats(statsData)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function handleInitializeAll() {
    await fetch("/api/communications", { method: "POST" })
    fetchData()
  }

  async function handleExportCSV() {
    const rows = [
      ["Name", "Abbreviation", "Expected Load", "Actual Load", "Status", "Latest Note", "Updated"],
      ...communications.map((c) => [
        c.staff_name,
        c.staff_abbrev,
        c.staff_expected_load.toString(),
        c.actual_load.toString(),
        STATUS_CONFIG[c.status].label,
        c.latest_note || "",
        c.updated_at,
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "communications.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function openDetail(staffId: number) {
    const res = await fetch(`/api/communications/${staffId}`)
    const data = await res.json()
    setDetail(data)
    setNewNote("")
    setDetailOpen(true)
  }

  async function handleStatusChange(status: CommunicationStatus) {
    if (!detail) return
    await fetch(`/api/communications/${detail.staff_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    // Refresh detail and list
    const res = await fetch(`/api/communications/${detail.staff_id}`)
    setDetail(await res.json())
    fetchData()
  }

  async function handleAddNote() {
    if (!detail || !newNote.trim()) return
    setSubmitting(true)
    await fetch(`/api/communications/${detail.staff_id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: newNote.trim() }),
    })
    setNewNote("")
    const res = await fetch(`/api/communications/${detail.staff_id}`)
    setDetail(await res.json())
    setSubmitting(false)
    fetchData()
  }

  async function handleDeleteNote(logId: number) {
    if (!detail) return
    await fetch(`/api/communications/${detail.staff_id}/log?logId=${logId}`, {
      method: "DELETE",
    })
    const res = await fetch(`/api/communications/${detail.staff_id}`)
    setDetail(await res.json())
    fetchData()
  }

  function generateEmailDraft(d: CommunicationDetail): string {
    const firstName = d.staff_name.split(" ")[0]

    const mtLoad = d.allocations
      .filter((a) => a.module_term === "MT")
      .reduce((sum, a) => sum + a.load_hours, 0)
    const htLoad = d.allocations
      .filter((a) => a.module_term === "HT")
      .reduce((sum, a) => sum + a.load_hours, 0)
    const otherLoad = d.actual_load - mtLoad - htLoad

    let email = `Hi ${firstName},\n\n`
    email += `I hope that you are well.  I would like to confirm what you will be teaching next year, along with your admin responsibilities.  Below is a table which summarizes your allocations for the upcoming year:\n\n`
    email += `${d.staff_name} (Total Load: ${d.actual_load}, MT: ${mtLoad}, HT: ${htLoad}`
    if (otherLoad > 0) email += `, Other: ${otherLoad}`
    email += `)\n`
    email += `----------------\n`

    if (d.allocations.length > 0) {
      email += `  Teaching:\n`
      for (const a of d.allocations) {
        email += `    \u2022 ${a.module_code} - ${a.module_name} (Level ${a.module_level || "N/A"}, Term ${a.module_term}, Load: ${a.load_hours})\n`
      }
    }

    if (d.service_roles.length > 0) {
      email += `\n  Service Roles:\n`
      for (const sr of d.service_roles) {
        email += `    \u2022 ${sr.category} - ${sr.name}\n`
      }
    }

    email += `\nAs always, please let me know if you have any questions.\n\nBest,\nConstantine`

    return email
  }

  async function openEmailDraft(staffId: number) {
    const res = await fetch(`/api/communications/${staffId}`)
    const data: CommunicationDetail = await res.json()
    setEmailDraft(generateEmailDraft(data))
    setEmailCopied(false)
    setEmailOpen(true)
  }

  async function handleCopyEmail() {
    await navigator.clipboard.writeText(emailDraft)
    setEmailCopied(true)
    setTimeout(() => setEmailCopied(false), 2000)
  }

  const filtered = filter === "all"
    ? communications
    : communications.filter((c) => c.status === filter)

  const agreedPct = stats && stats.total > 0
    ? Math.round((stats.agreed / stats.total) * 100)
    : 0

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communications</h1>
          <p className="text-muted-foreground">
            Track allocation communication with staff
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleInitializeAll}>
            <Play className="mr-2 h-4 w-4" />
            Initialize All
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {(Object.keys(STATUS_CONFIG) as CommunicationStatus[]).map((status) => {
            const config = STATUS_CONFIG[status]
            const count = stats[status]
            return (
              <Card
                key={status}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilter(status)}
              >
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <Badge variant={config.variant} className="mt-1">
                    {config.label}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Progress bar */}
      {stats && stats.total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{agreedPct}% agreed ({stats.agreed}/{stats.total})</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${agreedPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          {FILTER_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Abbrev</TableHead>
              <TableHead className="text-right">Load</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Note</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => openDetail(c.staff_id)}
              >
                <TableCell className="font-medium">{c.staff_name}</TableCell>
                <TableCell>{c.staff_abbrev}</TableCell>
                <TableCell className="text-right">
                  {c.actual_load}/{c.staff_expected_load}h
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_CONFIG[c.status].variant}>
                    {STATUS_CONFIG[c.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {c.latest_note || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(c.updated_at)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEmailDraft(c.staff_id)
                    }}
                    title="Draft email"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  {communications.length === 0
                    ? 'No communication records yet. Click "Initialize All" to create records for all staff.'
                    : "No records match this filter."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Email Draft Dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Draft Email</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyEmail}
              >
                {emailCopied ? (
                  <><Check className="h-4 w-4 mr-1" /> Copied</>
                ) : (
                  <><Copy className="h-4 w-4 mr-1" /> Copy to Clipboard</>
                )}
              </Button>
            </div>
          </DialogHeader>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed bg-muted/50 rounded-md p-4 border">
            {emailDraft}
          </pre>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>
                    {detail.staff_name} ({detail.staff_abbrev})
                  </DialogTitle>
                  <Select
                    value={detail.status}
                    onValueChange={(v) => handleStatusChange(v as CommunicationStatus)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_CONFIG) as CommunicationStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_CONFIG[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Allocations */}
                <div>
                  <h3 className="font-semibold mb-2">
                    Allocations ({detail.actual_load}/{detail.staff_expected_load}h)
                  </h3>
                  {detail.allocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No allocations</p>
                  ) : (
                    <div className="space-y-1">
                      {detail.allocations.map((a) => (
                        <div
                          key={a.id}
                          className="flex justify-between text-sm py-1 px-2 rounded bg-muted/50"
                        >
                          <span>
                            {a.module_code} - {a.module_name} ({a.module_term})
                          </span>
                          <span className="font-medium">{a.load_hours}h</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Service Roles */}
                {detail.service_roles.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Service Roles</h3>
                    <div className="space-y-1">
                      {detail.service_roles.map((sr) => (
                        <div
                          key={sr.id}
                          className="text-sm py-1 px-2 rounded bg-muted/50"
                        >
                          {sr.name}
                          {sr.category && (
                            <span className="text-muted-foreground"> ({sr.category}{sr.term ? `, ${sr.term}` : ""})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Communication Log */}
                <div>
                  <h3 className="font-semibold mb-2">Communication Log</h3>
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleAddNote()
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || submitting}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  {detail.logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start justify-between gap-2 text-sm py-2 px-3 rounded border"
                        >
                          <div>
                            <div className="text-muted-foreground text-xs">
                              {formatDateTime(log.created_at)}
                            </div>
                            <div className="mt-0.5">{log.note}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => handleDeleteNote(log.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
