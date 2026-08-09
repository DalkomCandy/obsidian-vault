import { useCallback, useMemo, useState } from 'react'
import { Map, useMapsLibrary, type MapMouseEvent } from '@vis.gl/react-google-maps'
import type { Category, Place, TravelMode } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { GOOGLE_MAPS_MAP_ID, DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/googleMaps'
import { MapController } from './MapController'
import { PlaceMarker } from './PlaceMarker'
import { SearchBox } from './SearchBox'
import type { SearchResult } from './SearchBox'
import { QuickAddMarker, type DraftLocation } from './QuickAddMarker'
import { RouteModePicker, type RouteOption } from './RouteModePicker'
import { RouteLine } from './RouteLine'

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
  const routes = usePlaceStore((s) => s.routes)
  const saveRoute = usePlaceStore((s) => s.saveRoute)
  const removeRoute = usePlaceStore((s) => s.removeRoute)
  const placesLib = useMapsLibrary('places')

  const [routeCandidate, setRouteCandidate] = useState<{ origin: Place; destination: Place } | null>(null)

  const clearRouteState = useCallback(() => {
    setRouteCandidate(null)
    if (routeOriginId) onSetRouteOrigin(null)
  }, [routeOriginId, onSetRouteOrigin])

  // A saved route only draws while both of its endpoints are on screen, so it
  // follows the same region/trip/category filtering as the markers it links.
  const visibleRoutes = useMemo(() => {
    const visibleIds = new Set(places.map((p) => p.id))
    return routes.filter((r) => visibleIds.has(r.originId) && visibleIds.has(r.destinationId))
  }, [routes, places])

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
      <Map
        className="map-container"
        mapId={GOOGLE_MAPS_MAP_ID}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        streetViewControl={false}
        rotateControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        zoomControl={false}
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
              saveRoute({
                tripId: routeCandidate.origin.tripId,
                originId: routeCandidate.origin.id,
                destinationId: routeCandidate.destination.id,
                mode,
                path: option.path,
                durationText: option.durationText,
                distanceText: option.distanceText,
                durationSeconds: option.durationSeconds,
                distanceMeters: option.distanceMeters,
              })
              onRouteCommitted(routeCandidate.origin.name, routeCandidate.destination.id, mode, option)
              setRouteCandidate(null)
            }}
            onCancel={() => setRouteCandidate(null)}
          />
        )}
        {visibleRoutes.map((route) => (
          <RouteLine key={route.id} route={route} onDelete={() => removeRoute(route.id)} />
        ))}
      </Map>
    </>
  )
}
