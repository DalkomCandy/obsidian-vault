import { useState } from 'react'
import type { Trip } from '../types'
import { formatTripLabel, todayDateString } from '../types'

interface TripPickerProps {
  region: string
  trips: Trip[]
  selectedTripId: string | null
  onSelectTrip: (tripId: string | null) => void
  onCreateTrip: (date: string) => void
}

export function TripPicker({ region, trips, selectedTripId, onSelectTrip, onCreateTrip }: TripPickerProps) {
  const [creating, setCreating] = useState(false)
  const [date, setDate] = useState(todayDateString())

  const regionTrips = trips
    .filter((t) => t.region === region)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="trip-picker">
      <div className="trip-chip-row">
        {regionTrips.map((trip) => (
          <button
            key={trip.id}
            className={trip.id === selectedTripId ? 'chip active' : 'chip'}
            onClick={() => onSelectTrip(trip.id === selectedTripId ? null : trip.id)}
          >
            {formatTripLabel(trip.date)}
          </button>
        ))}
        <button type="button" className="chip chip-add" onClick={() => setCreating((v) => !v)}>
          + 새 여행
        </button>
      </div>
      {creating && (
        <div className="trip-create-row">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button
            type="button"
            className="primary"
            onClick={() => {
              onCreateTrip(date)
              setCreating(false)
            }}
          >
            추가
          </button>
        </div>
      )}
    </div>
  )
}
