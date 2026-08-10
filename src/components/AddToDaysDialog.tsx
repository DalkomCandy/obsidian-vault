import { useMemo, useState } from 'react'
import type { Place } from '../types'
import { dayLabel, tripDayCount } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'

interface AddToDaysDialogProps {
  place: Place
  onClose: () => void
  onAdded: (count: number) => void
}

/**
 * Copies a place onto whichever other days it's also visited -- accommodation
 * you return to each night, a station you pass through twice. Picking the days
 * here is the whole interaction: the copies land already assigned, instead of
 * making one copy and then re-opening the edit form to set its day.
 */
export function AddToDaysDialog({ place, onClose, onAdded }: AddToDaysDialogProps) {
  const trip = usePlaceStore((s) => s.trips.find((t) => t.id === place.tripId))
  const places = usePlaceStore((s) => s.places)
  const duplicatePlaceToDays = usePlaceStore((s) => s.duplicatePlaceToDays)
  const dayCount = tripDayCount(trip)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Days this place already sits on -- its own, plus any copy made earlier.
  // Shown ticked and locked so a third copy of the same night can't be added
  // by accident.
  const existingDays = useMemo(() => {
    const sameSpot = places.filter(
      (p) => p.tripId === place.tripId && p.name === place.name && p.lat === place.lat && p.lng === place.lng,
    )
    return new Set(sameSpot.map((p) => p.day).filter((d): d is number => d !== undefined))
  }, [places, place])

  const toggle = (day: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  const handleAdd = () => {
    const added = duplicatePlaceToDays(place.id, [...selected].sort((a, b) => a - b))
    onAdded(added)
    onClose()
  }

  return (
    <div className="form-overlay" onClick={onClose}>
      <div className="place-form" onClick={(e) => e.stopPropagation()}>
        <h3>다른 날에도 추가</h3>
        <p className="form-trip-label">
          "{place.name}"을(를) 추가할 날을 고르세요. 고른 날마다 사본이 하나씩 생겨요.
        </p>

        <div className="day-check-grid">
          {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => {
            const already = existingDays.has(day)
            return (
              <label key={day} className={already ? 'day-check already' : 'day-check'}>
                <input
                  type="checkbox"
                  checked={already || selected.has(day)}
                  disabled={already}
                  onChange={() => toggle(day)}
                />
                <span>{dayLabel(day)}</span>
                {already && <span className="day-check-note">있음</span>}
              </label>
            )
          })}
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" disabled={selected.size === 0} onClick={handleAdd}>
            {selected.size > 0 ? `${selected.size}일에 추가` : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}
