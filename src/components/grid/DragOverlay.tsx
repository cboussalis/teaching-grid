"use client"

import { Badge } from "@/components/ui/badge"
import type { DragItem } from "@/types"

interface DraggableOverlayProps {
  item: DragItem
  isValid: boolean
}

export function DraggableOverlay({ item, isValid }: DraggableOverlayProps) {
  if (item.type === "staff") {
    return (
      <div
        className={`px-3 py-1.5 rounded-md shadow-lg border-2 ${
          isValid
            ? "bg-white border-green-400"
            : "bg-white border-red-400"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.staffAbbrev}</span>
          <Badge
            variant={
              item.loadStatus === "over"
                ? "destructive"
                : item.loadStatus === "under"
                ? "warning"
                : "success"
            }
            className="text-xs"
          >
            {item.currentLoad.toFixed(1)}h
          </Badge>
        </div>
      </div>
    )
  }

  if (item.type === "allocation") {
    return (
      <div
        className={`px-3 py-1.5 rounded-md shadow-lg border-2 ${
          isValid
            ? "bg-green-50 border-green-400"
            : "bg-red-50 border-red-400"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.staffAbbrev}</span>
          <Badge variant="outline" className="text-xs">
            {item.hours}h
          </Badge>
        </div>
      </div>
    )
  }

  return null
}
