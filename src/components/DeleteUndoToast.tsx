import { usePlaceStore } from '../store/usePlaceStore'

/** Replaces the old "삭제할까요?" confirm dialog: deleting is immediate, with a short window to undo it instead. */
export function DeleteUndoToast() {
  const lastDeleted = usePlaceStore((s) => s.lastDeleted)
  const undoDeletePlace = usePlaceStore((s) => s.undoDeletePlace)

  if (!lastDeleted) return null

  return (
    <div className="undo-toast">
      <span>"{lastDeleted.place.name}" 삭제됨</span>
      <button type="button" onClick={undoDeletePlace}>
        실행취소
      </button>
    </div>
  )
}
