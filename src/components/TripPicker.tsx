import { useState } from 'react'
import type { Trip } from '../types'
import { formatTripLabel, todayDateString } from '../types'

interface TripPickerProps {
  region: string
  trips: Trip[]
  selectedTripId: string | null
  onSelectTrip: (tripId: string | null) => void
  onCreateTrip: (name: string) => void
  onRenameTrip: (id: string, name: string) => void
  onDeleteTrip: (id: string) => void
  onImportPlaces: () => void
  onExportTrip: () => void
}

export function TripPicker({
  region,
  trips,
  selectedTripId,
  onSelectTrip,
  onCreateTrip,
  onRenameTrip,
  onDeleteTrip,
  onImportPlaces,
  onExportTrip,
}: TripPickerProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState(formatTripLabel(todayDateString()))
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const regionTrips = trips
    .filter((t) => t.region === region)
    .sort((a, b) => b.date.localeCompare(a.date))

  const selectedTrip = regionTrips.find((t) => t.id === selectedTripId) ?? null

  const startRename = () => {
    if (!selectedTrip) return
    setNameDraft(selectedTrip.name)
    setRenaming(true)
  }

  const confirmRename = () => {
    if (selectedTrip && nameDraft.trim()) {
      onRenameTrip(selectedTrip.id, nameDraft.trim())
    }
    setRenaming(false)
  }

  return (
    <div className="trip-picker">
      <div className="trip-chip-row">
        {regionTrips.map((trip) => (
          <button
            key={trip.id}
            className={trip.id === selectedTripId ? 'chip active' : 'chip'}
            onClick={() => onSelectTrip(trip.id === selectedTripId ? null : trip.id)}
          >
            {trip.name}
          </button>
        ))}
        <button type="button" className="chip chip-add" onClick={() => setCreating((v) => !v)}>
          + 새 여행
        </button>
      </div>

      {creating && (
        <div className="trip-create-row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="여행 이름 (예: 오사카 벚꽃놀이)"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                onCreateTrip(newName.trim())
                setCreating(false)
              }
              if (e.key === 'Escape') setCreating(false)
            }}
          />
          <button
            type="button"
            className="primary"
            disabled={!newName.trim()}
            onClick={() => {
              onCreateTrip(newName.trim())
              setCreating(false)
            }}
          >
            추가
          </button>
        </div>
      )}

      {selectedTrip && !renaming && (
        <div className="trip-manage-row">
          <button type="button" onClick={startRename}>
            이름 수정
          </button>
          <button type="button" onClick={onImportPlaces} title="이 지역의 다른 여행에서 장소 복사해오기">
            가져오기
          </button>
          <button type="button" onClick={onExportTrip} title="KML로 내보내기 (구글 내 지도에서 열 수 있어요)">
            내보내기
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (confirm(`"${selectedTrip.name}" 여행을 삭제할까요? 이 여행에 저장된 장소도 함께 삭제돼요.`)) {
                onDeleteTrip(selectedTrip.id)
              }
            }}
          >
            여행 삭제
          </button>
        </div>
      )}

      {selectedTrip && renaming && (
        <div className="trip-create-row">
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmRename()
              if (e.key === 'Escape') setRenaming(false)
            }}
          />
          <button type="button" className="primary" onClick={confirmRename}>
            저장
          </button>
          <button type="button" onClick={() => setRenaming(false)}>
            취소
          </button>
        </div>
      )}
    </div>
  )
}
