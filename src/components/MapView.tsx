import { useCallback, useMemo, useState } from 'react'
import { Map, useMapsLibrary, useMap, type MapMouseEvent } from '@vis.gl/react-google-maps'
import type { Category, Place, TravelMode } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { GOOGLE_MAPS_MAP_ID, DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/googleMaps'
import { MapController, type MapPadding } from './MapController'
import { PlaceMarker } from './PlaceMarker'
import { SearchBox } from './SearchBox'
import type { SearchResult } from './SearchBox'
import { QuickAddMarker, type DraftLocation } from './QuickAddMarker'
import { RouteModePicker, type RouteOption } from './RouteModePicker'
import { RouteLine } from './RouteLine'
import { CurrentLocationMarker } from './CurrentLocationMarker'
import { useCurrentLocation } from '../hooks/useCurrentLocation'
import { reportPlaceLookupError, reportPlaceLookupSuccess } from '../lib/placeLookupStatus'
import { SettingsMenu } from './SettingsMenu'
import { TripMenu } from './TripMenu'
import { CategoryFilter } from './CategoryFilter'

/** Recentres the map on the tracked position without restarting the watch. */
function RecenterButton({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  return (
    <button
      type="button"
      className="map-control-btn"
      title="현재 위치로 이동"
      onClick={() => {
        map?.panTo({ lat, lng })
        map?.setZoom(16)
      }}
    >
      ⌖
    </button>
  )
}

interface MapViewProps {
  places: Place[]
  visitOrderByPlaceId: Map<string, number> | null
  /** How much of the map div's edges the floating chrome actually covers. */
  mapPadding: MapPadding
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
  onDraftNameChange: (name: string) => void
  routeOriginId: string | null
  onSetRouteOrigin: (place: Place | null) => void
  onRouteCommitted: (originName: string, destinationId: string, mode: TravelMode, option: RouteOption) => void
}

export function MapView({
  places,
  visitOrderByPlaceId,
  mapPadding,
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
  onDraftNameChange,
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
  const { location, status, error: locationError, toggle: toggleLocation, active: locationActive } = useCurrentLocation()
  const [pendingRecenter, setPendingRecenter] = useState(false)

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
        reportPlaceLookupSuccess()
        onLocationPicked({
          name: place.displayName ?? '',
          lat: place.location?.lat() ?? latLng.lat,
          lng: place.location?.lng() ?? latLng.lng,
          address: place.formattedAddress ?? undefined,
          rating: place.rating ?? undefined,
          userRatingCount: place.userRatingCount ?? undefined,
          googleMapsUri: place.googleMapsURI ?? undefined,
        })
      } catch (err) {
        // Google's place lookup can fail for POIs it otherwise shows on the
        // map (quota, permissions, transient network errors, ids it won't
        // resolve) -- the popup lets the name be typed in by hand rather
        // than getting stuck, and the diagnostics panel surfaces why so a
        // lookup that fails for every single POI (a config problem) reads
        // differently from one that fails occasionally (network blips).
        const message = err instanceof Error ? err.message : String(err)
        console.error('Failed to fetch place details', err)
        reportPlaceLookupError(message)
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
            visitOrder={visitOrderByPlaceId?.get(place.id)}
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
      visitOrderByPlaceId,
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
      <div className="map-topbar">
        <SearchBox onPlaceSelected={onLocationPicked} />
        <TripMenu />
        <SettingsMenu
          locationActive={locationActive}
          locationStatus={status}
          onToggleLocation={() => {
            if (!locationActive) setPendingRecenter(true)
            toggleLocation()
          }}
        />
      </div>
      <CategoryFilter compact />
      {locationError && <div className="map-location-error">{locationError}</div>}
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
        <MapController focusPlace={focusPlace} fitPlaces={fitPlaces} mapPadding={mapPadding} />
        {markers}
        {draftLocation && (
          <QuickAddMarker
            draft={draftLocation}
            defaultCategory={defaultAddCategory}
            onSave={onSaveDraft}
            onCancel={onCancelDraft}
            onNameChange={onDraftNameChange}
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
        {location && locationActive && (
          <CurrentLocationMarker
            location={location}
            centerOnFirstFix={pendingRecenter}
            onCentered={() => setPendingRecenter(false)}
          />
        )}
      </Map>

      {/* Sibling of <Map>, not a child: if the Maps API fails to load (which
          is exactly what happens offline) the map renders nothing, and
          controls nested inside it would disappear along with it. The
          location toggle itself lives in the settings panel now -- this
          only recentres once tracking is already on. */}
      {location && locationActive && (
        <div className="map-controls">
          <RecenterButton lat={location.lat} lng={location.lng} />
        </div>
      )}
    </>
  )
}
