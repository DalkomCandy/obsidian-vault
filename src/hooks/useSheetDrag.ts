import { useCallback, useEffect, useRef, useState } from 'react'

export type SheetSnap = 'peek' | 'half' | 'full'
export const SNAP_ORDER: SheetSnap[] = ['peek', 'half', 'full']

const PEEK_PX = 92
const HALF_RATIO = 0.52
const FULL_RATIO = 0.88
const MIN_PX = 90

// Below this many pixels of vertical movement, a press-and-release still
// counts as a tap (cycling snap points) rather than a drag.
const DRAG_THRESHOLD_PX = 6

function snapHeightPx(snap: SheetSnap): number {
  if (snap === 'peek') return PEEK_PX
  if (snap === 'half') return window.innerHeight * HALF_RATIO
  return window.innerHeight * FULL_RATIO
}

function nearestSnap(heightPx: number): SheetSnap {
  let best: SheetSnap = 'half'
  let bestDist = Infinity
  for (const candidate of SNAP_ORDER) {
    const dist = Math.abs(snapHeightPx(candidate) - heightPx)
    if (dist < bestDist) {
      bestDist = dist
      best = candidate
    }
  }
  return best
}

interface UseSheetDragOptions {
  snap: SheetSnap
  onSnapChange: (snap: SheetSnap) => void
  sheetRef: React.RefObject<HTMLElement | null>
}

/**
 * Lets the mobile bottom sheet's grabber be dragged to any height, snapping
 * to the nearest of peek/half/full on release, while a plain tap (no real
 * movement) still cycles through them the way it always did.
 *
 * Built on Pointer Events with window-level listeners -- same approach as
 * useRowDrag -- so one code path covers mouse and touch, and the drag keeps
 * tracking even if the finger slides off the small grabber hit area.
 */
export function useSheetDrag({ snap, onSnapChange, sheetRef }: UseSheetDragOptions) {
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const stateRef = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null)
  const dragHeightRef = useRef<number | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const startHeight = sheetRef.current?.getBoundingClientRect().height ?? snapHeightPx(snap)
      stateRef.current = { startY: e.clientY, startHeight, moved: false }
    },
    [sheetRef, snap],
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const state = stateRef.current
      if (!state) return
      const delta = state.startY - e.clientY // finger moving up increases height
      if (!state.moved && Math.abs(delta) < DRAG_THRESHOLD_PX) return
      state.moved = true
      e.preventDefault()
      const next = Math.min(snapHeightPx('full'), Math.max(MIN_PX, state.startHeight + delta))
      dragHeightRef.current = next
      setDragHeight(next)
    }

    const finish = () => {
      const state = stateRef.current
      if (!state) return
      stateRef.current = null
      if (state.moved && dragHeightRef.current !== null) {
        onSnapChange(nearestSnap(dragHeightRef.current))
      } else {
        // Tap: no meaningful movement happened, so cycle like before.
        onSnapChange(SNAP_ORDER[(SNAP_ORDER.indexOf(snap) + 1) % SNAP_ORDER.length])
      }
      dragHeightRef.current = null
      setDragHeight(null)
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [snap, onSnapChange])

  return {
    dragHeight,
    grabberProps: { onPointerDown, style: { touchAction: 'none' as const } },
  }
}
