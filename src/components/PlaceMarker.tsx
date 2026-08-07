import { useState } from 'react'
import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps'
import type { Place } from '../types'
import { CATEGORY_LABELS, resolveIconColor } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { PlacePin } from './PlacePin'

interface PlaceMarkerProps {
  place: Place
  faded: boolean
  onEditPlace: (place: Place) => void
}

export function PlaceMarker({ place, faded, onEditPlace }: PlaceMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef()
  const [open, setOpen] = useState(false)
  const toggleVisited = usePlaceStore((s) => s.toggleVisited)
  const removePlace = usePlaceStore((s) => s.removePlace)
  const trip = usePlaceStore((s) => s.trips.find((t) => t.id === place.tripId))

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: place.lat, lng: place.lng }}
        onClick={() => setOpen((v) => !v)}
      >
        <PlacePin color={resolveIconColor(place)} shape={place.iconShape} faded={faded} />
      </AdvancedMarker>
      {open && marker && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="popup-content">
            <div className="popup-title">{place.name}</div>
            <div className="popup-meta">
              {CATEGORY_LABELS[place.category]}
              {trip && ` · ${trip.region} · ${trip.name}`}
            </div>
            {place.memo && <div className="popup-memo">{place.memo}</div>}
            <div className="popup-actions">
              <button onClick={() => toggleVisited(place.id)}>
                {place.visited ? '방문 취소' : '방문 완료로 표시'}
              </button>
              <button onClick={() => onEditPlace(place)}>수정</button>
              <button
                className="danger"
                onClick={() => {
                  if (confirm(`"${place.name}"을(를) 삭제할까요?`)) removePlace(place.id)
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  )
}
