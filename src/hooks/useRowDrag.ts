import { useCallback, useEffect, useRef, useState } from 'react'

export const DRAG_ID_ATTR = 'data-drag-id'
export const DROP_GROUP_ATTR = 'data-drop-group'

interface DropTarget {
  rowId?: string
  group?: string
}

interface UseRowDragOptions {
  /** Dropped onto another row: reorder, adopting that row's group. */
  onDropOnRow: (draggedId: string, targetId: string) => void
  /** Dropped onto a section's empty space: just move into that group. */
  onDropOnGroup: (draggedId: string, group: string) => void
}

/** How close to a scrollable edge before the list starts following the drag. */
const AUTOSCROLL_EDGE = 48
const AUTOSCROLL_SPEED = 12

function targetAt(x: number, y: number, draggedId: string): DropTarget {
  const el = document.elementFromPoint(x, y)
  if (!el) return {}
  const row = el.closest(`[${DRAG_ID_ATTR}]`)
  const rowId = row?.getAttribute(DRAG_ID_ATTR) ?? undefined
  if (rowId && rowId !== draggedId) return { rowId }
  const group = el.closest(`[${DROP_GROUP_ATTR}]`)?.getAttribute(DROP_GROUP_ATTR) ?? undefined
  return { group }
}

function scrollableAncestor(el: Element | null): Element | null {
  let node = el
  while (node) {
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node
    node = node.parentElement
  }
  return null
}

/**
 * Drag-to-reorder built on Pointer Events rather than HTML5 drag-and-drop.
 *
 * The HTML5 API never fires on touch devices at all -- `dragstart` simply
 * doesn't happen -- so on a phone the entire reorder/reassign interaction was
 * silently dead. Pointer events cover mouse, touch and stylus through one
 * code path, at the cost of doing hit-testing and edge-autoscroll by hand.
 */
export function useRowDrag({ onDropOnRow, onDropOnGroup }: UseRowDragOptions) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [hoverTarget, setHoverTarget] = useState<DropTarget>({})
  const stateRef = useRef<{ id: string; target: DropTarget } | null>(null)
  const scrollTimer = useRef<number | null>(null)

  const stopAutoscroll = useCallback(() => {
    if (scrollTimer.current !== null) {
      window.clearInterval(scrollTimer.current)
      scrollTimer.current = null
    }
  }, [])

  const finish = useCallback(() => {
    stopAutoscroll()
    const state = stateRef.current
    stateRef.current = null
    setDraggedId(null)
    setHoverTarget({})
    if (!state) return
    if (state.target.rowId) onDropOnRow(state.id, state.target.rowId)
    else if (state.target.group) onDropOnGroup(state.id, state.target.group)
  }, [onDropOnRow, onDropOnGroup, stopAutoscroll])

  useEffect(() => {
    if (!draggedId) return

    const onMove = (e: PointerEvent) => {
      e.preventDefault()
      const state = stateRef.current
      if (!state) return
      const target = targetAt(e.clientX, e.clientY, state.id)
      state.target = target
      setHoverTarget(target)

      // Keep the list moving when the pointer sits near its top or bottom,
      // which on a phone is the only way to reach an off-screen day.
      stopAutoscroll()
      const scroller = scrollableAncestor(document.elementFromPoint(e.clientX, e.clientY))
      if (!scroller) return
      const box = scroller.getBoundingClientRect()
      const delta =
        e.clientY < box.top + AUTOSCROLL_EDGE
          ? -AUTOSCROLL_SPEED
          : e.clientY > box.bottom - AUTOSCROLL_EDGE
            ? AUTOSCROLL_SPEED
            : 0
      if (delta !== 0) {
        scrollTimer.current = window.setInterval(() => scroller.scrollBy(0, delta), 16)
      }
    }

    const onUp = () => finish()
    const onCancel = () => {
      stopAutoscroll()
      stateRef.current = null
      setDraggedId(null)
      setHoverTarget({})
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      stopAutoscroll()
    }
  }, [draggedId, finish, stopAutoscroll])

  const handleProps = useCallback(
    (id: string) => ({
      onPointerDown: (e: React.PointerEvent) => {
        // Left mouse button or any touch/pen contact.
        if (e.pointerType === 'mouse' && e.button !== 0) return
        e.preventDefault()
        stateRef.current = { id, target: {} }
        setDraggedId(id)
      },
      // Without this the browser scrolls the sheet instead of dragging.
      style: { touchAction: 'none' as const },
    }),
    [],
  )

  return { draggedId, hoverTarget, handleProps }
}
