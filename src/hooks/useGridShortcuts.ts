import { useEffect, useCallback, useRef } from 'react'

interface ShortcutHandlers {
  onUndo?: () => void
  onRedo?: () => void
  onFocusStaffSearch?: () => void
  onFocusModuleSearch?: () => void
  onShowHelp?: () => void
  onEscape?: () => void
  onCopy?: () => void
  onPaste?: () => void
}

interface UseGridShortcutsOptions {
  enabled?: boolean
}

export function useGridShortcuts(
  handlers: ShortcutHandlers,
  options: UseGridShortcutsOptions = {}
) {
  const { enabled = true } = options
  const handlersRef = useRef(handlers)

  // Update ref on every render to always have fresh handlers
  useEffect(() => {
    handlersRef.current = handlers
  })

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle shortcuts when typing in an input
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape in inputs
      if (event.key === 'Escape') {
        handlersRef.current.onEscape?.()
      }
      return
    }

    const { key, ctrlKey, metaKey, shiftKey } = event
    const cmdOrCtrl = ctrlKey || metaKey

    // Undo: Ctrl+Z
    if (cmdOrCtrl && !shiftKey && key === 'z') {
      event.preventDefault()
      handlersRef.current.onUndo?.()
      return
    }

    // Redo: Ctrl+Shift+Z or Ctrl+Y
    if (cmdOrCtrl && shiftKey && key === 'z') {
      event.preventDefault()
      handlersRef.current.onRedo?.()
      return
    }

    if (cmdOrCtrl && key === 'y') {
      event.preventDefault()
      handlersRef.current.onRedo?.()
      return
    }

    // Focus staff search: Ctrl+F
    if (cmdOrCtrl && key === 'f') {
      event.preventDefault()
      handlersRef.current.onFocusStaffSearch?.()
      return
    }

    // Focus module search: Ctrl+G
    if (cmdOrCtrl && key === 'g') {
      event.preventDefault()
      handlersRef.current.onFocusModuleSearch?.()
      return
    }

    // Copy: Ctrl+C
    if (cmdOrCtrl && key === 'c') {
      event.preventDefault()
      handlersRef.current.onCopy?.()
      return
    }

    // Paste: Ctrl+V
    if (cmdOrCtrl && key === 'v') {
      event.preventDefault()
      handlersRef.current.onPaste?.()
      return
    }

    // Show help: ?
    if (key === '?' && !cmdOrCtrl) {
      event.preventDefault()
      handlersRef.current.onShowHelp?.()
      return
    }

    // Escape
    if (key === 'Escape') {
      handlersRef.current.onEscape?.()
      return
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}

// Shortcut definitions for the help dialog
export const SHORTCUTS = [
  { keys: ['Ctrl', 'Z'], description: 'Undo last change' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo last undone change' },
  { keys: ['Ctrl', 'Y'], description: 'Redo last undone change (alternative)' },
  { keys: ['Ctrl', 'F'], description: 'Focus staff search' },
  { keys: ['Ctrl', 'G'], description: 'Focus module search' },
  { keys: ['Ctrl', 'C'], description: 'Copy module allocation pattern' },
  { keys: ['Ctrl', 'V'], description: 'Paste allocation pattern' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['Esc'], description: 'Cancel current edit / Close dialog' },
  { keys: ['Enter'], description: 'Save current edit' },
  { keys: ['Tab'], description: 'Move to next cell in row' },
]
