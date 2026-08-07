import { useCallback, useMemo } from 'react'
import { Map, useMapsLibrary, type MapMouseEvent } from '@vis.gl/react-google-maps'
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
  onLocationPicked: (result: SearchResult) => void
  onEditPlace: (place: Place) => void
  onSaveDraft: (name: string, category: Category) => void
  onCancelDraft: () => void
}

export function MapView({
  places,
  focusPlace,
  fitPlaces,
  draftLocation,
  onLocationPicked,
  onEditPlace,
  onSaveDraft,
  onCancelDraft,
}: MapViewProps) {
  const fadeVisitedEnabled = usePlaceStore((s) => s.settings.fadeVisitedEnabled)
  const selectedTripId = usePlaceStore((s) => s.selectedTripId)
  const placesLib = useMapsLibrary('places')

  // Only clicking an existing Google Maps POI icon opens the quick-add popup;
  // clicking empty ground does nothing (no placeId on the event).
  const handleClick = useCallback(
    async (e: MapMouseEvent) => {
      const placeId = e.detail.placeId
      const latLng = e.detail.latLng
      if (!placeId || !latLng || !placesLib) return
      e.stop()

      try {
        const place = new placesLib.Place({ id: placeId })
        await place.fetchFields({ fields: ['displayName', 'location', 'formattedAddress'] })
        onLocationPicked({
          name: place.displayName ?? '',
          lat: place.location?.lat() ?? latLng.lat,
          lng: place.location?.lng() ?? latLng.lng,
          address: place.formattedAddress ?? undefined,
        })
      } catch {
        onLocationPicked({ name: '', lat: latLng.lat, lng: latLng.lng })
      }
    },
    [onLocationPicked, placesLib],
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
      <SearchBox onPlaceSelected={onLocationPicked} />
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
