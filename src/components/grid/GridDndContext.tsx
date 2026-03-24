"use client"

import { createContext, useContext, useState, useCallback, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core"
import type { DragItem, DropTarget } from "@/types"
import { DraggableOverlay } from "./DragOverlay"

interface GridDndContextValue {
  activeItem: DragItem | null
  overTarget: DropTarget | null
  isDragging: boolean
}

const GridDndReactContext = createContext<GridDndContextValue>({
  activeItem: null,
  overTarget: null,
  isDragging: false,
})

export function useGridDnd() {
  return useContext(GridDndReactContext)
}

interface GridDndProviderProps {
  children: React.ReactNode
  onDragEnd: (item: DragItem, target: DropTarget) => void
  canDrop: (item: DragItem, target: DropTarget) => boolean
}

export function GridDndProvider({ children, onDragEnd, canDrop }: GridDndProviderProps) {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null)
  const [overTarget, setOverTarget] = useState<DropTarget | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    if (active.data.current) {
      setActiveItem(active.data.current as DragItem)
    }
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (over?.data.current) {
      setOverTarget(over.data.current as DropTarget)
    } else {
      setOverTarget(null)
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (active && over && active.data.current && over.data.current) {
      const item = active.data.current as DragItem
      const target = over.data.current as DropTarget

      if (canDrop(item, target)) {
        onDragEnd(item, target)
      }
    }

    setActiveItem(null)
    setOverTarget(null)
  }, [onDragEnd, canDrop])

  const handleDragCancel = useCallback(() => {
    setActiveItem(null)
    setOverTarget(null)
  }, [])

  const contextValue = useMemo(
    () => ({
      activeItem,
      overTarget,
      isDragging: activeItem !== null,
    }),
    [activeItem, overTarget]
  )

  const isValidDrop = activeItem && overTarget ? canDrop(activeItem, overTarget) : false

  return (
    <GridDndReactContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {activeItem && (
            <DraggableOverlay item={activeItem} isValid={isValidDrop} />
          )}
        </DragOverlay>
      </DndContext>
    </GridDndReactContext.Provider>
  )
}
