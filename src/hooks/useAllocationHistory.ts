import { useState, useCallback, useRef } from 'react'
import type { AllocationAction, HistoryEntry } from '@/types'

const MAX_HISTORY_SIZE = 50

interface UseAllocationHistoryReturn {
  canUndo: boolean
  canRedo: boolean
  undo: () => AllocationAction | null
  redo: () => AllocationAction | null
  pushAction: (action: AllocationAction) => void
  clear: () => void
}

export function useAllocationHistory(): UseAllocationHistoryReturn {
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([])
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([])

  // Use ref for the last action to prevent double-adding
  const lastActionRef = useRef<number>(0)

  const pushAction = useCallback((action: AllocationAction) => {
    const now = Date.now()
    // Debounce to prevent duplicate entries from rapid changes
    if (now - lastActionRef.current < 100) return
    lastActionRef.current = now

    setUndoStack(prev => {
      const newStack = [...prev, { action, timestamp: now }]
      // Keep only the last MAX_HISTORY_SIZE entries
      if (newStack.length > MAX_HISTORY_SIZE) {
        return newStack.slice(-MAX_HISTORY_SIZE)
      }
      return newStack
    })
    // Clear redo stack when a new action is performed
    setRedoStack([])
  }, [])

  const undo = useCallback((): AllocationAction | null => {
    if (undoStack.length === 0) return null

    const entry = undoStack[undoStack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, entry])

    return entry.action
  }, [undoStack])

  const redo = useCallback((): AllocationAction | null => {
    if (redoStack.length === 0) return null

    const entry = redoStack[redoStack.length - 1]
    setRedoStack(prev => prev.slice(0, -1))
    setUndoStack(prev => [...prev, entry])

    return entry.action
  }, [redoStack])

  const clear = useCallback(() => {
    setUndoStack([])
    setRedoStack([])
  }, [])

  return {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undo,
    redo,
    pushAction,
    clear
  }
}

// Helper function to invert an action (for undo)
export function invertAction(action: AllocationAction): AllocationAction {
  switch (action.type) {
    case 'set':
      return {
        type: 'set',
        moduleId: action.moduleId,
        staffId: action.staffId,
        oldHours: action.newHours,
        newHours: action.oldHours
      }
    case 'delete':
      return {
        type: 'set',
        moduleId: action.moduleId,
        staffId: action.staffId,
        oldHours: 0,
        newHours: action.oldHours
      }
    case 'batch':
      return {
        type: 'batch',
        actions: action.actions.map(invertAction).reverse()
      }
  }
}
