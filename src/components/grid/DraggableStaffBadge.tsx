"use client"

import { useDraggable } from "@dnd-kit/core"
import { Badge } from "@/components/ui/badge"
import type { DraggedStaff } from "@/types"
import { StaffLoadBar } from "./StaffLoadBar"

interface DraggableStaffBadgeProps {
  staffId: number
  staffName: string
  staffAbbrev: string
  currentLoad: number
  expectedLoad: number
  loadStatus: "under" | "balanced" | "over"
  isOnLoa: boolean
  mtAvailable: boolean
  htAvailable: boolean
  compact?: boolean
}

export function DraggableStaffBadge({
  staffId,
  staffName,
  staffAbbrev,
  currentLoad,
  expectedLoad,
  loadStatus,
  isOnLoa,
  mtAvailable,
  htAvailable,
  compact = false,
}: DraggableStaffBadgeProps) {
  const dragData: DraggedStaff = {
    type: "staff",
    staffId,
    staffName,
    staffAbbrev,
    currentLoad,
    expectedLoad,
    loadStatus,
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `staff-${staffId}`,
    data: dragData,
    disabled: isOnLoa,
  })

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`
          cursor-grab active:cursor-grabbing select-none
          ${isDragging ? "opacity-50" : ""}
          ${isOnLoa ? "cursor-not-allowed opacity-60" : ""}
        `}
      >
        <div className="text-center">
          <div className="font-medium text-sm">{staffAbbrev}</div>
          <div className="text-xs text-muted-foreground">
            {currentLoad.toFixed(1)}h
          </div>
          <StaffLoadBar
            actualLoad={currentLoad}
            expectedLoad={expectedLoad}
            loadStatus={loadStatus}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        p-2 border rounded-md bg-white
        cursor-grab active:cursor-grabbing select-none
        hover:border-blue-300 hover:shadow-sm
        transition-all
        ${isDragging ? "opacity-50 shadow-md" : ""}
        ${isOnLoa ? "cursor-not-allowed opacity-60 bg-gray-50" : ""}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-medium text-sm">{staffAbbrev}</div>
          <div className="text-xs text-muted-foreground truncate max-w-[100px]">
            {staffName}
          </div>
        </div>
        <div className="text-right">
          <Badge
            variant={
              loadStatus === "over"
                ? "destructive"
                : loadStatus === "under"
                ? "warning"
                : "success"
            }
            className="text-xs"
          >
            {currentLoad.toFixed(1)}h
          </Badge>
          {isOnLoa && (
            <div className="text-xs text-red-500 mt-0.5">LOA</div>
          )}
          {!isOnLoa && (!mtAvailable || !htAvailable) && (
            <div className="text-xs text-yellow-600 mt-0.5">
              {!mtAvailable && !htAvailable ? "No terms" : !mtAvailable ? "No MT" : "No HT"}
            </div>
          )}
        </div>
      </div>
      <StaffLoadBar
        actualLoad={currentLoad}
        expectedLoad={expectedLoad}
        loadStatus={loadStatus}
      />
    </div>
  )
}
