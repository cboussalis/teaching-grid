import { useState, useCallback } from 'react'
import type { ClipboardData } from '@/types'

interface UseClipboardReturn {
  clipboard: ClipboardData | null
  copy: (data: ClipboardData) => void
  paste: () => ClipboardData | null
  hasData: boolean
  clear: () => void
}

export function useClipboard(): UseClipboardReturn {
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null)

  const copy = useCallback((data: ClipboardData) => {
    setClipboard(data)
  }, [])

  const paste = useCallback((): ClipboardData | null => {
    return clipboard
  }, [clipboard])

  const clear = useCallback(() => {
    setClipboard(null)
  }, [])

  return {
    clipboard,
    copy,
    paste,
    hasData: clipboard !== null && clipboard.allocations.length > 0,
    clear
  }
}
