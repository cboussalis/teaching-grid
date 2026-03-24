"use client"

import { AlertCircle, CheckCircle, ArrowUp, ArrowDown, Package } from "lucide-react"
import type { GridSummaryStats } from "@/types"

interface GridSummaryProps {
  stats: GridSummaryStats
  onFilterUnallocated?: () => void
  onFilterOverloaded?: () => void
  onFilterUnderloaded?: () => void
}

export function GridSummary({
  stats,
  onFilterUnallocated,
  onFilterOverloaded,
  onFilterUnderloaded,
}: GridSummaryProps) {
  return (
    <div className="flex items-center gap-4 p-3 bg-white rounded-lg border text-sm">
      <div
        className={`flex items-center gap-1.5 ${onFilterUnallocated ? "cursor-pointer hover:text-blue-600" : ""}`}
        onClick={onFilterUnallocated}
        title={onFilterUnallocated ? "Click to filter" : undefined}
      >
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Unallocated:</span>
        <span className={`font-semibold ${stats.unallocatedModules > 0 ? "text-red-600" : "text-green-600"}`}>
          {stats.unallocatedModules}
        </span>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      <div
        className={`flex items-center gap-1.5 ${onFilterOverloaded ? "cursor-pointer hover:text-blue-600" : ""}`}
        onClick={onFilterOverloaded}
        title={onFilterOverloaded ? "Click to filter" : undefined}
      >
        <ArrowUp className="h-4 w-4 text-red-500" />
        <span className="text-muted-foreground">Overloaded:</span>
        <span className={`font-semibold ${stats.overloadedStaff > 0 ? "text-red-600" : "text-green-600"}`}>
          {stats.overloadedStaff}
        </span>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      <div
        className={`flex items-center gap-1.5 ${onFilterUnderloaded ? "cursor-pointer hover:text-blue-600" : ""}`}
        onClick={onFilterUnderloaded}
        title={onFilterUnderloaded ? "Click to filter" : undefined}
      >
        <ArrowDown className="h-4 w-4 text-yellow-500" />
        <span className="text-muted-foreground">Underloaded:</span>
        <span className={`font-semibold ${stats.underloadedStaff > 0 ? "text-yellow-600" : "text-green-600"}`}>
          {stats.underloadedStaff}
        </span>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      <div className="flex items-center gap-1.5">
        {stats.unallocatedModules === 0 && stats.overloadedStaff === 0 ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        )}
        <span className="text-muted-foreground">Total allocations:</span>
        <span className="font-semibold">{stats.totalAllocations}</span>
      </div>
    </div>
  )
}
