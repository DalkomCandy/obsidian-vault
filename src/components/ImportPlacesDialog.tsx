import { useMemo, useState } from 'react'
import type { Trip } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'

interface ImportPlacesDialogProps {
  targetTrip: Trip
  onClose: () => void
  onImported: (count: number) => void
}

/** Pulls places from another trip in the same region into the current one. */
export function ImportPlacesDialog({ targetTrip, onClose, onImported }: ImportPlacesDialogProps) {
  const trips = usePlaceStore((s) => s.trips)
  const places = usePlaceStore((s) => s.places)
  const categoryLabels = usePlaceStore((s) => s.categoryLabels)
  const copyPlacesToTrip = usePlaceStore((s) => s.copyPlacesToTrip)

  const sourceTrips = useMemo(
    () => trips.filter((t) => t.region === targetTrip.region && t.id !== targetTrip.id),
    [trips, targetTrip],
  )
  const [sourceTripId, setSourceTripId] = useState(sourceTrips[0]?.id ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const sourcePlaces = useMemo(
    () => places.filter((p) => p.tripId === sourceTripId),
    [places, sourceTripId],
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleImport = () => {
    const added = copyPlacesToTrip([...selected], targetTrip.id)
    onImported(added)
    onClose()
  }

  return (
    <div className="form-overlay" onClick={onClose}>
      <div className="place-form" onClick={(e) => e.stopPropagation()}>
        <h3>이전 여행에서 장소 가져오기</h3>
        <p className="form-trip-label">
          {targetTrip.region} · {targetTrip.name}(으)로 복사돼요
        </p>

        {sourceTrips.length === 0 ? (
          <p className="empty-state">이 지역에 다른 여행이 아직 없어요.</p>
        ) : (
          <>
            <label>
              가져올 여행
              <select
                value={sourceTripId}
                onChange={(e) => {
                  setSourceTripId(e.target.value)
                  setSelected(new Set())
                }}
              >
                {sourceTrips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="import-toolbar">
              <span>{selected.size}개 선택됨</span>
              <button
                type="button"
                onClick={() =>
                  setSelected(
                    selected.size === sourcePlaces.length ? new Set() : new Set(sourcePlaces.map((p) => p.id)),
                  )
                }
              >
                {selected.size === sourcePlaces.length && sourcePlaces.length > 0 ? '전체 해제' : '전체 선택'}
              </button>
            </div>

            <div className="import-list">
              {sourcePlaces.length === 0 && <p className="empty-state">이 여행에는 저장된 장소가 없어요.</p>}
              {sourcePlaces.map((place) => (
                <label key={place.id} className="import-row">
                  <input type="checkbox" checked={selected.has(place.id)} onChange={() => toggle(place.id)} />
                  <span className="import-row-name">{place.name}</span>
                  <span className="import-row-category">{categoryLabels[place.category] ?? ''}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="form-actions">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" disabled={selected.size === 0} onClick={handleImport}>
            가져오기
          </button>
        </div>
      </div>
    </div>
  )
}
