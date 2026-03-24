"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, ArrowUp, ArrowDown, Package, Copy, Clipboard, Undo, Redo, Keyboard } from "lucide-react"

interface GridFiltersProps {
  staffSearch: string
  moduleSearch: string
  onStaffSearchChange: (value: string) => void
  onModuleSearchChange: (value: string) => void
  staffSearchRef?: React.RefObject<HTMLInputElement>
  moduleSearchRef?: React.RefObject<HTMLInputElement>
  // Quick filters
  showOverloaded: boolean
  showUnderloaded: boolean
  showUnallocatedOnly: boolean
  onToggleOverloaded: () => void
  onToggleUnderloaded: () => void
  onToggleUnallocated: () => void
  // Actions
  canUndo: boolean
  canRedo: boolean
  hasClipboard: boolean
  selectedModuleId: number | null
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onPaste: () => void
  onShowHelp: () => void
}

export function GridFilters({
  staffSearch,
  moduleSearch,
  onStaffSearchChange,
  onModuleSearchChange,
  staffSearchRef,
  moduleSearchRef,
  showOverloaded,
  showUnderloaded,
  showUnallocatedOnly,
  onToggleOverloaded,
  onToggleUnderloaded,
  onToggleUnallocated,
  canUndo,
  canRedo,
  hasClipboard,
  selectedModuleId,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onShowHelp,
}: GridFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-white rounded-lg border">
      {/* Search inputs */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={staffSearchRef}
            type="text"
            placeholder="Search staff..."
            value={staffSearch}
            onChange={(e) => onStaffSearchChange(e.target.value)}
            className="pl-9 w-40"
          />
          {staffSearch && (
            <button
              onClick={() => onStaffSearchChange("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={moduleSearchRef}
            type="text"
            placeholder="Search modules..."
            value={moduleSearch}
            onChange={(e) => onModuleSearchChange(e.target.value)}
            className="pl-9 w-40"
          />
          {moduleSearch && (
            <button
              onClick={() => onModuleSearchChange("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="h-8 w-px bg-gray-200" />

      {/* Quick filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show:</span>
        <Button
          variant={showOverloaded ? "default" : "outline"}
          size="sm"
          onClick={onToggleOverloaded}
          className="h-8"
        >
          <ArrowUp className="h-3 w-3 mr-1" />
          Overloaded
        </Button>
        <Button
          variant={showUnderloaded ? "default" : "outline"}
          size="sm"
          onClick={onToggleUnderloaded}
          className="h-8"
        >
          <ArrowDown className="h-3 w-3 mr-1" />
          Underloaded
        </Button>
        <Button
          variant={showUnallocatedOnly ? "default" : "outline"}
          size="sm"
          onClick={onToggleUnallocated}
          className="h-8"
        >
          <Package className="h-3 w-3 mr-1" />
          Unallocated
        </Button>
      </div>

      <div className="h-8 w-px bg-gray-200" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          disabled={!selectedModuleId}
          title="Copy allocation pattern (Ctrl+C)"
          className="h-8 w-8 p-0"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onPaste}
          disabled={!hasClipboard || !selectedModuleId}
          title="Paste allocation pattern (Ctrl+V)"
          className="h-8 w-8 p-0"
        >
          <Clipboard className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onShowHelp}
          title="Keyboard shortcuts (?)"
          className="h-8 w-8 p-0"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
