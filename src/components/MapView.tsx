import { useCallback, useMemo } from 'react'
import { Map, type MapMouseEvent } from '@vis.gl/react-google-maps'
import type { Category, Place } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { GOOGLE_MAPS_MAP_ID, DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/googleMaps'
import { MapController } from './MapController'
import { PlaceMarker } from './PlaceMarker'
import { SearchBox } from './SearchBox'
import type { SearchResult } from './SearchBox'
import { QuickAddMarker, type DraftLocation } from './QuickAddMarker'

interface MapViewProps {
  places: Place[]
  focusPlace: Place | null
  fitPlaces: Place[] | null
  draftLocation: DraftLocation | null
  onMapClick: (lat: number, lng: number) => void
  onEditPlace: (place: Place) => void
  onSearchSelect: (result: SearchResult) => void
  onSaveDraft: (name: string, category: Category) => void
  onCancelDraft: () => void
}

export function MapView({
  places,
  focusPlace,
  fitPlaces,
  draftLocation,
  onMapClick,
  onEditPlace,
  onSearchSelect,
  onSaveDraft,
  onCancelDraft,
}: MapViewProps) {
  const fadeVisitedEnabled = usePlaceStore((s) => s.settings.fadeVisitedEnabled)
  const selectedTripId = usePlaceStore((s) => s.selectedTripId)

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (e.detail.latLng) onMapClick(e.detail.latLng.lat, e.detail.latLng.lng)
    },
    [onMapClick],
  )

  const markers = useMemo(
    () =>
      places.map((place) => {
        const otherTrip = Boolean(selectedTripId) && place.tripId !== selectedTripId
        const faded = otherTrip || (place.visited && fadeVisitedEnabled)
        return <PlaceMarker key={place.id} place={place} faded={faded} onEditPlace={onEditPlace} />
      }),
    [places, fadeVisitedEnabled, selectedTripId, onEditPlace],
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
        {draftLocation && (
          <QuickAddMarker draft={draftLocation} onSave={onSaveDraft} onCancel={onCancelDraft} />
        )}
      </Map>
    </>
  )
}
