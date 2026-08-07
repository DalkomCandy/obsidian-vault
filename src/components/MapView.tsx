import { useCallback, useMemo } from 'react'
import { Map, type MapMouseEvent } from '@vis.gl/react-google-maps'
import type { Place } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { GOOGLE_MAPS_MAP_ID, DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/googleMaps'
import { MapController } from './MapController'
import { PlaceMarker } from './PlaceMarker'
import { SearchBox } from './SearchBox'
import type { SearchResult } from './SearchBox'

interface MapViewProps {
  places: Place[]
  focusPlace: Place | null
  fitPlaces: Place[] | null
  onMapClick: (lat: number, lng: number) => void
  onEditPlace: (place: Place) => void
  onSearchSelect: (result: SearchResult) => void
}

export function MapView({
  places,
  focusPlace,
  fitPlaces,
  onMapClick,
  onEditPlace,
  onSearchSelect,
}: MapViewProps) {
  const fadeVisitedEnabled = usePlaceStore((s) => s.settings.fadeVisitedEnabled)

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (e.detail.latLng) onMapClick(e.detail.latLng.lat, e.detail.latLng.lng)
    },
    [onMapClick],
  )

  const markers = useMemo(
    () =>
      places.map((place) => (
        <PlaceMarker
          key={place.id}
          place={place}
          faded={place.visited && fadeVisitedEnabled}
          onEditPlace={onEditPlace}
        />
      )),
    [places, fadeVisitedEnabled, onEditPlace],
  )

  return (
    <>
      <SearchBox onPlaceSelected={onSearchSelect} />
      <Map
        className="map-container"
        mapId={GOOGLE_MAPS_MAP_ID}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        onClick={handleClick}
      >
        <MapController focusPlace={focusPlace} fitPlaces={fitPlaces} />
        {markers}
      </Map>
    </>
  )
}
