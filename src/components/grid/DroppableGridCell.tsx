"use client"

import { useDroppable } from "@dnd-kit/core"
import { useGridDnd } from "./GridDndContext"
import type { DropTarget, DragItem } from "@/types"

interface DroppableGridCellProps {
  moduleId: number
  staffId: number
  moduleCode: string
  moduleTerm: string
  moduleLoad: number
  currentHours: number
  canDrop: (item: DragItem, target: DropTarget) => boolean
  children: React.ReactNode
}

export function DroppableGridCell({
  moduleId,
  staffId,
  moduleCode,
  moduleTerm,
  moduleLoad,
  currentHours,
  canDrop,
  children,
}: DroppableGridCellProps) {
  const dropData: DropTarget = {
    moduleId,
    staffId,
    moduleCode,
    moduleTerm,
    moduleLoad,
    currentHours,
  }

  const { setNodeRef, isOver, active } = useDroppable({
    id: `cell-${moduleId}-${staffId}`,
    data: dropData,
  })

  const { activeItem, isDragging } = useGridDnd()

  // Determine if this is a valid drop target
  const isValidTarget = isDragging && activeItem
    ? canDrop(activeItem, dropData)
    : false

  // Visual feedback classes
  let overlayClass = ""
  if (isDragging && activeItem) {
    if (isOver) {
      overlayClass = isValidTarget
        ? "ring-2 ring-green-400 ring-inset bg-green-50"
        : "ring-2 ring-red-400 ring-inset bg-red-50"
    } else if (isValidTarget) {
      overlayClass = "ring-1 ring-blue-200 ring-inset"
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`relative transition-all ${overlayClass}`}
    >
      {children}
    </div>
  )
}
