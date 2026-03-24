"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { DraggableStaffBadge } from "./DraggableStaffBadge"
import type { Staff } from "@/types"

interface StaffLoad {
  actual_load: number
  expected_load: number
  load_status: "under" | "balanced" | "over"
}

interface StaffPoolSidebarProps {
  staff: Staff[]
  staffLoad: Record<number, StaffLoad>
  filterOverloaded: boolean
  filterUnderloaded: boolean
}

export function StaffPoolSidebar({
  staff,
  staffLoad,
  filterOverloaded,
  filterUnderloaded,
}: StaffPoolSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [search, setSearch] = useState("")
  const [showLoa, setShowLoa] = useState(false)

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        if (
          !s.name.toLowerCase().includes(searchLower) &&
          !s.abbrev.toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      // LOA filter
      if (!showLoa && s.loa === 1) {
        return false
      }

      // Load status filters
      const load = staffLoad[s.id]
      if (filterOverloaded && load?.load_status !== "over") {
        return false
      }
      if (filterUnderloaded && load?.load_status !== "under") {
        return false
      }

      return true
    })
  }, [staff, staffLoad, search, showLoa, filterOverloaded, filterUnderloaded])

  if (isCollapsed) {
    return (
      <div className="w-10 border-r bg-gray-50 flex flex-col items-center pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="mt-4 -rotate-90 whitespace-nowrap text-xs text-muted-foreground">
          Staff Pool ({filteredStaff.length})
        </div>
      </div>
    )
  }

  return (
    <div className="w-56 border-r bg-white flex flex-col">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="font-semibold text-sm">Staff Pool</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(true)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* LOA Toggle */}
      <div className="px-3 py-2 border-b">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showLoa}
            onChange={(e) => setShowLoa(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-muted-foreground">Show LOA staff</span>
        </label>
      </div>

      {/* Staff count */}
      <div className="px-3 py-2 text-xs text-muted-foreground border-b">
        {filteredStaff.length} of {staff.length} staff
      </div>

      {/* Staff list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredStaff.map((s) => {
          const load = staffLoad[s.id] || {
            actual_load: 0,
            expected_load: s.expected_load,
            load_status: "under" as const,
          }

          return (
            <DraggableStaffBadge
              key={s.id}
              staffId={s.id}
              staffName={s.name}
              staffAbbrev={s.abbrev}
              currentLoad={load.actual_load}
              expectedLoad={load.expected_load}
              loadStatus={load.load_status}
              isOnLoa={s.loa === 1}
              mtAvailable={s.mt_available === 1}
              htAvailable={s.ht_available === 1}
            />
          )
        })}
        {filteredStaff.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">
            No staff found
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-2 border-t bg-gray-50">
        <div className="text-xs text-muted-foreground mb-1">Load status:</div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="success" className="text-xs">Balanced</Badge>
          <Badge variant="warning" className="text-xs">Under</Badge>
          <Badge variant="destructive" className="text-xs">Over</Badge>
        </div>
      </div>
    </div>
  )
}
