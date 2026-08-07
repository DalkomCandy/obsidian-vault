import { forwardRef, useMemo } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import type { Place } from '../types'
import { CATEGORY_LABELS } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { getMarkerIcon } from '../utils/markerIcon'

const DEFAULT_CENTER: [number, number] = [36.5, 127.8] // South Korea
const DEFAULT_ZOOM = 7

interface MapViewProps {
  places: Place[]
  onMapClick: (lat: number, lng: number) => void
  onEditPlace: (place: Place) => void
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export const MapView = forwardRef<LeafletMap, MapViewProps>(function MapView(
  { places, onMapClick, onEditPlace },
  ref,
) {
  const fadeVisitedEnabled = usePlaceStore((s) => s.settings.fadeVisitedEnabled)
  const toggleVisited = usePlaceStore((s) => s.toggleVisited)
  const removePlace = usePlaceStore((s) => s.removePlace)

  const markers = useMemo(
    () =>
      places.map((place) => {
        const faded = place.visited && fadeVisitedEnabled
        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={getMarkerIcon(place.category, faded)}
          >
            <Popup>
              <div className="popup-content">
                <div className="popup-title">{place.name}</div>
                <div className="popup-meta">
                  {CATEGORY_LABELS[place.category]} · {place.region}
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
            </Popup>
          </Marker>
        )
      }),
    [places, fadeVisitedEnabled, toggleVisited, removePlace, onEditPlace],
  )

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="map-container" ref={ref}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onMapClick={onMapClick} />
      {markers}
    </MapContainer>
  )
})
