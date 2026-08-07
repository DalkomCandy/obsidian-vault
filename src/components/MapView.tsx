import { useCallback, useMemo, useState } from 'react'
import { Map, useMapsLibrary, type MapMouseEvent } from '@vis.gl/react-google-maps'
import type { Category, Place, TravelMode } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { GOOGLE_MAPS_MAP_ID, DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/googleMaps'
import { MapController } from './MapController'
import { PlaceMarker } from './PlaceMarker'
import { SearchBox } from './SearchBox'
import type { SearchResult } from './SearchBox'
import { MapControlPanel } from './MapControlPanel'
import { QuickAddMarker, type DraftLocation } from './QuickAddMarker'
import { RouteModePicker, type RouteOption } from './RouteModePicker'
import { RouteLine, type ActiveRoute } from './RouteLine'

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
  routeOriginId: string | null
  onSetRouteOrigin: (place: Place | null) => void
  onRouteCommitted: (originName: string, destinationId: string, mode: TravelMode, option: RouteOption) => void
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
  routeOriginId,
  onSetRouteOrigin,
  onRouteCommitted,
}: MapViewProps) {
  const selectedTripId = usePlaceStore((s) => s.selectedTripId)
  const placesLib = useMapsLibrary('places')

  const [routeCandidate, setRouteCandidate] = useState<{ origin: Place; destination: Place } | null>(null)
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null)

  const clearRouteState = useCallback(() => {
    setRouteCandidate(null)
    setActiveRoute(null)
    if (routeOriginId) onSetRouteOrigin(null)
  }, [routeOriginId, onSetRouteOrigin])

  // Only clicking an existing Google Maps POI icon opens the quick-add popup.
  // Clicking empty ground closes whatever popup/route state is open;
  // clicking a different POI/marker replaces it with that one.
  const handleClick = useCallback(
    async (e: MapMouseEvent) => {
      const placeId = e.detail.placeId
      const latLng = e.detail.latLng
      if (!placeId || !latLng) {
        if (draftLocation) onCancelDraft()
        if (openPlaceId) onOpenPlaceChange(null)
        clearRouteState()
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
    [onLocationPicked, placesLib, draftLocation, onCancelDraft, openPlaceId, onOpenPlaceChange, clearRouteState],
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
            onMarkerClick={() => {
              if (routeOriginId && place.id !== routeOriginId) {
                const origin = places.find((p) => p.id === routeOriginId)
                if (origin) {
                  setActiveRoute(null)
                  setRouteCandidate({ origin, destination: place })
                  onSetRouteOrigin(null)
                }
                return
              }
              onOpenPlaceChange(place.id === openPlaceId ? null : place.id)
              if (draftLocation) onCancelDraft()
            }}
            onOpenChange={(open) => {
              onOpenPlaceChange(open ? place.id : null)
              if (open && draftLocation) onCancelDraft()
            }}
            onEditPlace={onEditPlace}
            onRouteFrom={(p) => {
              onOpenPlaceChange(null)
              setRouteCandidate(null)
              setActiveRoute(null)
              onSetRouteOrigin(p)
            }}
          />
        )
      }),
    [
      places,
      selectedTripId,
      openPlaceId,
      onOpenPlaceChange,
      draftLocation,
      onCancelDraft,
      onEditPlace,
      routeOriginId,
      onSetRouteOrigin,
    ],
  )

  return (
    <>
      <SearchBox onPlaceSelected={onLocationPicked} />
      <MapControlPanel />
      <Map
        className="map-container"
        mapId={GOOGLE_MAPS_MAP_ID}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        streetViewControl={false}
        rotateControl={false}
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
        {routeCandidate && (
          <RouteModePicker
            origin={routeCandidate.origin}
            destination={routeCandidate.destination}
            onSelect={(mode, option) => {
              setActiveRoute({ mode, path: option.path, durationText: option.durationText, distanceText: option.distanceText })
              onRouteCommitted(routeCandidate.origin.name, routeCandidate.destination.id, mode, option)
              setRouteCandidate(null)
            }}
            onCancel={() => setRouteCandidate(null)}
          />
        )}
        {activeRoute && <RouteLine route={activeRoute} onClose={() => setActiveRoute(null)} />}
      </Map>
    </>
  )
}
