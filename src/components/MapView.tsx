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
  defaultAddCategory: Category
  openPlaceId: string | null
  onOpenPlaceChange: (id: string | null) => void
  onLocationPicked: (result: SearchResult) => void
  onEditPlace: (place: Place) => void
  onSaveDraft: (category: Category) => void
  onCancelDraft: () => void
}

export function MapView({
  places,
  focusPlace,
  fitPlaces,
  draftLocation,
  defaultAddCategory,
  openPlaceId,
  onOpenPlaceChange,
  onLocationPicked,
  onEditPlace,
  onSaveDraft,
  onCancelDraft,
}: MapViewProps) {
  const selectedTripId = usePlaceStore((s) => s.selectedTripId)
  const placesLib = useMapsLibrary('places')

  // Only clicking an existing Google Maps POI icon opens the quick-add popup.
  // Clicking empty ground closes whatever popup is open (draft or a saved
  // place); clicking a different POI/marker replaces it with that one.
  const handleClick = useCallback(
    async (e: MapMouseEvent) => {
      const placeId = e.detail.placeId
      const latLng = e.detail.latLng
      if (!placeId || !latLng) {
        if (draftLocation) onCancelDraft()
        if (openPlaceId) onOpenPlaceChange(null)
        return
      }
      if (!placesLib) return
      e.stop()
      if (openPlaceId) onOpenPlaceChange(null)

      try {
        const place = new placesLib.Place({ id: placeId })
        await place.fetchFields({
          fields: ['displayName', 'location', 'formattedAddress', 'rating', 'userRatingCount', 'googleMapsURI'],
        })
        onLocationPicked({
          name: place.displayName ?? '',
          lat: place.location?.lat() ?? latLng.lat,
          lng: place.location?.lng() ?? latLng.lng,
          address: place.formattedAddress ?? undefined,
          rating: place.rating ?? undefined,
          userRatingCount: place.userRatingCount ?? undefined,
          googleMapsUri: place.googleMapsURI ?? undefined,
        })
      } catch {
        onLocationPicked({ name: '', lat: latLng.lat, lng: latLng.lng })
      }
    },
    [onLocationPicked, placesLib, draftLocation, onCancelDraft, openPlaceId, onOpenPlaceChange],
  )

  const markers = useMemo(
    () =>
      places.map((place) => {
        const faded = Boolean(selectedTripId) && place.tripId !== selectedTripId
        return (
          <PlaceMarker
            key={place.id}
            place={place}
            faded={faded}
            isOpen={place.id === openPlaceId}
            onOpenChange={(open) => {
              onOpenPlaceChange(open ? place.id : null)
              if (open && draftLocation) onCancelDraft()
            }}
            onEditPlace={onEditPlace}
          />
        )
      }),
    [places, selectedTripId, openPlaceId, onOpenPlaceChange, draftLocation, onCancelDraft, onEditPlace],
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
          <QuickAddMarker
            draft={draftLocation}
            defaultCategory={defaultAddCategory}
            onSave={onSaveDraft}
            onCancel={onCancelDraft}
          />
        )}
      </Map>
    </>
  )
}
