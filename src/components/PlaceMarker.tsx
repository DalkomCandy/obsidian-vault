import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps'
import type { Place } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { useIconScale } from '../hooks/useIconScale'
import { PlacePin } from './PlacePin'

interface PlaceMarkerProps {
  place: Place
  faded: boolean
  isOpen: boolean
  onMarkerClick: () => void
  onOpenChange: (open: boolean) => void
  onEditPlace: (place: Place) => void
  onRouteFrom: (place: Place) => void
}

export function PlaceMarker({
  place,
  faded,
  isOpen,
  onMarkerClick,
  onOpenChange,
  onEditPlace,
  onRouteFrom,
}: PlaceMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef()
  const removePlace = usePlaceStore((s) => s.removePlace)
  const trip = usePlaceStore((s) => s.trips.find((t) => t.id === place.tripId))
  const categoryLabels = usePlaceStore((s) => s.categoryLabels)
  const style = usePlaceStore((s) => s.categoryStyles[place.category])
  const { iconScale } = useIconScale()

  return (
    <>
      <AdvancedMarker ref={markerRef} position={{ lat: place.lat, lng: place.lng }} onClick={onMarkerClick}>
        <PlacePin color={style.color} shape={style.shape} faded={faded} scale={iconScale} />
      </AdvancedMarker>
      {isOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={() => onOpenChange(false)}>
          <div className="popup-content">
            <div className="popup-title">{place.name}</div>
            <div className="popup-meta">
              {categoryLabels[place.category]}
              {trip && ` · ${trip.region} · ${trip.name}`}
            </div>
            {place.memo && <div className="popup-memo">{place.memo}</div>}
            <div className="popup-actions">
              <button onClick={() => onRouteFrom(place)}>경로</button>
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
