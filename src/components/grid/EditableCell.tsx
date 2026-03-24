"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { AlertCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AllocationWarning } from "@/types"

interface EditableCellProps {
  moduleId: number
  staffId: number
  currentHours: number
  moduleLoad: number
  warnings: AllocationWarning[]
  onSave: (moduleId: number, staffId: number, hours: number, oldHours: number) => Promise<void>
  onNavigateNext?: () => void
  getCellStyle: (moduleId: number, staffId: number, moduleLoad: number) => string
}

export function EditableCell({
  moduleId,
  staffId,
  currentHours,
  moduleLoad,
  warnings,
  onSave,
  onNavigateNext,
  getCellStyle,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = useCallback(() => {
    setEditValue(currentHours > 0 ? currentHours.toString() : "")
    setIsEditing(true)
  }, [currentHours])

  const handleSave = useCallback(async () => {
    if (isSaving) return

    const newHours = parseFloat(editValue) || 0

    // If value hasn't changed, just close
    if (newHours === currentHours) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(moduleId, staffId, newHours, currentHours)
    } finally {
      setIsSaving(false)
      setIsEditing(false)
    }
  }, [editValue, currentHours, moduleId, staffId, onSave, isSaving])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setEditValue("")
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancel()
    } else if (e.key === "Tab") {
      e.preventDefault()
      handleSave().then(() => {
        onNavigateNext?.()
      })
    }
  }, [handleSave, handleCancel, onNavigateNext])

  const hasErrors = warnings.some(w => w.severity === "error")
  const hasWarnings = warnings.some(w => w.severity === "warning")

  if (isEditing) {
    return (
      <td className="p-0">
        <input
          ref={inputRef}
          type="number"
          step="0.5"
          min="0"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          className="w-full h-full px-2 py-1 text-center text-sm border-2 border-blue-500 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{ minWidth: "60px" }}
        />
      </td>
    )
  }

  const cellContent = (
    <td
      className={`text-center cursor-pointer transition-colors relative ${getCellStyle(moduleId, staffId, moduleLoad)} ${isSaving ? "opacity-50" : ""}`}
      onClick={handleStartEdit}
    >
      <div className="flex items-center justify-center gap-0.5 px-2 py-2">
        {currentHours > 0 ? (
          <span className="font-medium">{currentHours}</span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
        {(hasErrors || hasWarnings) && currentHours > 0 && (
          <AlertCircle
            className={`h-3 w-3 ${hasErrors ? "text-red-500" : "text-yellow-500"}`}
          />
        )}
      </div>
    </td>
  )

  if (warnings.length > 0 && currentHours > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {cellContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            {warnings.map((warning, i) => (
              <div
                key={i}
                className={`text-sm ${
                  warning.severity === "error"
                    ? "text-red-600"
                    : warning.severity === "warning"
                    ? "text-yellow-600"
                    : "text-blue-600"
                }`}
              >
                {warning.message}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return cellContent
}
