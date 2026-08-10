import { useEffect, useMemo, useRef, useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { MapView } from './components/MapView'
import { Sidebar } from './components/Sidebar'
import { PlaceForm, draftFromPlace, type PlaceDraft } from './components/PlaceForm'
import type { SearchResult } from './components/SearchBox'
import type { DraftLocation } from './components/QuickAddMarker'
import type { RouteOption } from './components/RouteModePicker'
import { usePlaceStore } from './store/usePlaceStore'
import { GOOGLE_MAPS_API_KEY } from './lib/googleMaps'
import { setSyncUser } from './store/sync'
import { useSupabaseAuth } from './hooks/useSupabaseAuth'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useIsMobile } from './hooks/useMediaQuery'
import { snapHeightPx } from './hooks/useSheetDrag'
import {
  TRAVEL_MODE_EMOJI,
  TRAVEL_MODE_LABELS,
  sortByVisitOrder,
  type Category,
  type Place,
  type TravelMode,
} from './types'
import './App.css'

const NEEDS_TRIP_HINT = '먼저 지역과 여행(날짜)을 선택하거나 만들어주세요'
const NEEDS_CATEGORY_HINT = '먼저 사이드바에서 카테고리를 만들어주세요'

// Google hands back the same coordinates for the same POI every time, so a
// tight epsilon (~11m) is enough to recognize "this is the one I already
// saved" without ever colliding with a genuinely different neighbour.
const SAME_PLACE_EPSILON = 0.0001

function isSameSpot(a: { lat: number; lng: number }, b: { lat: number; lng: number }): boolean {
  return Math.abs(a.lat - b.lat) < SAME_PLACE_EPSILON && Math.abs(a.lng - b.lng) < SAME_PLACE_EPSILON
}

// How tall the floating region/search/settings bar + category chip row are
// together on mobile -- keep in sync with the `top` offsets App.css gives
// .map-controls/.offline-banner for the same reason (they clear the same
// obstruction). Used so panning/fitting the map can avoid centring content
// behind it, not just for visually parking other controls below it.
const MOBILE_TOPBAR_COVER_PX = 112

const SIDEBAR_WIDTH_KEY = 'travel-map.sidebarWidth'
const MIN_SIDEBAR_WIDTH = 240
const MAX_SIDEBAR_WIDTH = 520
const DEFAULT_SIDEBAR_WIDTH = 320

function loadSidebarWidth(): number {
  const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
  if (Number.isFinite(stored) && stored >= MIN_SIDEBAR_WIDTH && stored <= MAX_SIDEBAR_WIDTH) return stored
  return DEFAULT_SIDEBAR_WIDTH
}

function App() {
  const places = usePlaceStore((s) => s.places)
  const trips = usePlaceStore((s) => s.trips)
  const selectedRegion = usePlaceStore((s) => s.selectedRegion)
  const selectedTripId = usePlaceStore((s) => s.selectedTripId)
  const selectedCategories = usePlaceStore((s) => s.selectedCategories)
  const activeAddCategory = usePlaceStore((s) => s.activeAddCategory)
  const focusedDay = usePlaceStore((s) => s.focusedDay)
  const categoryOrder = usePlaceStore((s) => s.categoryOrder)
  const addPlace = usePlaceStore((s) => s.addPlace)
  const updatePlace = usePlaceStore((s) => s.updatePlace)

  const [editDraft, setEditDraft] = useState<PlaceDraft | null>(null)
  const [draftLocation, setDraftLocation] = useState<DraftLocation | null>(null)
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null)
  const [routeOriginId, setRouteOriginId] = useState<string | null>(null)
  const [focusPlace, setFocusPlace] = useState<Place | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const hintTimer = useRef<number | undefined>(undefined)
  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth)
  const sidebarWidthRef = useRef(sidebarWidth)
  const online = useOnlineStatus()
  const isMobile = useIsMobile()
  // On a phone the list is a bottom sheet over a full-bleed map, snapping
  // between a peek (map-first), half, and near-full (list-first).
  const [sheetSnap, setSheetSnap] = useState<'peek' | 'half' | 'full'>('half')

  // The sheet and top bars sit *over* the map on mobile rather than beside
  // it, so fitting/panning to a place has to steer around them or a marker
  // can end up centred right behind the sheet. Desktop's sidebar pushes the
  // map div itself instead, so it needs no correction here.
  const mapPadding = useMemo(
    () => (isMobile ? { top: MOBILE_TOPBAR_COVER_PX, bottom: Math.round(snapHeightPx(sheetSnap)) } : { top: 0, bottom: 0 }),
    [isMobile, sheetSnap],
  )

  // Sync follows the session: data lands in the signed-in account's own row,
  // and signing out simply stops syncing without touching what's stored here.
  const { session } = useSupabaseAuth()
  useEffect(() => {
    setSyncUser(session?.user.id ?? null)
  }, [session])

  const tripById = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips])

  // Sidebar is a focused management view -- scoped tightly to the active trip.
  const sidebarPlaces = useMemo(
    () =>
      places.filter((place) => {
        const trip = tripById.get(place.tripId)
        if (selectedRegion && trip?.region !== selectedRegion) return false
        if (selectedTripId && place.tripId !== selectedTripId) return false
        if (!selectedCategories.includes(place.category)) return false
        return true
      }),
    [places, tripById, selectedRegion, selectedTripId, selectedCategories],
  )

  // Categories present in the currently selected trip -- an other-trip place
  // only earns a faded reference spot on the map if it shares one of these;
  // categories the active trip has nothing in stay fully hidden for others.
  const activeTripCategories = useMemo(
    () => (selectedTripId ? new Set(sidebarPlaces.map((p) => p.category)) : null),
    [selectedTripId, sidebarPlaces],
  )

  // Map is a spatial reference view -- shows the active trip's places plus
  // other same-region trips' same-category spots (faded), so you can tell
  // "I already marked a sightseeing spot near here on a different day"
  // without other trips' unrelated categories cluttering the map.
  const mapPlaces = useMemo(
    () =>
      places.filter((place) => {
        const trip = tripById.get(place.tripId)
        if (selectedRegion && trip?.region !== selectedRegion) return false
        if (!selectedCategories.includes(place.category)) return false
        if (selectedTripId && place.tripId !== selectedTripId && !activeTripCategories?.has(place.category)) {
          return false
        }
        // Focusing a day narrows the map to that day's plan; other trips'
        // reference pins stay, since they're what the focus is compared against.
        if (focusedDay !== null && place.tripId === selectedTripId && place.day !== focusedDay) return false
        return true
      }),
    [places, tripById, selectedRegion, selectedCategories, selectedTripId, activeTripCategories, focusedDay],
  )

  // Numbers the focused day's stops in visit order so the map reads as a route.
  const visitOrderByPlaceId = useMemo(() => {
    if (focusedDay === null || !selectedTripId) return null
    const ofDay = sidebarPlaces.filter((p) => p.day === focusedDay)
    const map = new Map<string, number>()
    sortByVisitOrder(ofDay).forEach((place, index) => map.set(place.id, index + 1))
    return map
  }, [focusedDay, selectedTripId, sidebarPlaces])

  const fitPlaces = useMemo(() => {
    if (!selectedRegion && !selectedTripId) return null
    const scoped = focusedDay !== null ? sidebarPlaces.filter((p) => p.day === focusedDay) : sidebarPlaces
    return scoped.length ? scoped : null
  }, [selectedRegion, selectedTripId, sidebarPlaces, focusedDay])

  const showHint = (message: string) => {
    setHint(message)
    window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(null), 2500)
  }

  const applySidebarWidth = (clientX: number) => {
    const next = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, clientX))
    sidebarWidthRef.current = next
    setSidebarWidth(next)
  }

  const handleResizeStart = () => {
    const onMouseMove = (e: MouseEvent) => applySidebarWidth(e.clientX)
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (touch) applySidebarWidth(touch.clientX)
    }
    const stop = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', stop)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', stop)
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidthRef.current))
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', stop)
    document.addEventListener('touchmove', onTouchMove)
    document.addEventListener('touchend', stop)
  }

  const handleLocationPicked = (result: SearchResult) => {
    if (!selectedTripId) {
      showHint(NEEDS_TRIP_HINT)
      return
    }
    if (categoryOrder.length === 0) {
      showHint(NEEDS_CATEGORY_HINT)
      return
    }

    // Clicking the Google POI icon for somewhere already saved in this trip
    // should surface what's saved, not offer to save a second copy of it.
    const alreadySaved = places.find((p) => p.tripId === selectedTripId && isSameSpot(p, result))
    if (alreadySaved) {
      setDraftLocation(null)
      setFocusPlace({ ...alreadySaved })
      setOpenPlaceId(alreadySaved.id)
      if (!sidebarPlaces.some((p) => p.id === alreadySaved.id)) {
        showHint('이미 저장된 장소예요 (카테고리 필터에 가려져 있어요)')
      }
      return
    }

    // Saved under a different trip is a legitimate new entry for this one --
    // just say so, so it doesn't feel like an accidental duplicate.
    const savedElsewhere = places.find((p) => isSameSpot(p, result))
    if (savedElsewhere) {
      const trip = tripById.get(savedElsewhere.tripId)
      showHint(trip ? `"${trip.name}"에도 저장된 장소예요` : '다른 여행에도 저장된 장소예요')
    }

    setOpenPlaceId(null)
    setDraftLocation({ lat: result.lat, lng: result.lng, name: result.name, address: result.address })
  }

  const handleSaveDraft = (category: Category) => {
    if (!selectedTripId || !draftLocation) return
    addPlace({
      tripId: selectedTripId,
      name: draftLocation.name,
      lat: draftLocation.lat,
      lng: draftLocation.lng,
      category,
      memo: draftLocation.address ?? '',
      // While a day is focused, anything added is part of that day's plan.
      ...(focusedDay !== null ? { day: focusedDay } : {}),
    })
    setDraftLocation(null)
  }

  const handleEditPlace = (place: Place) => {
    setEditDraft(draftFromPlace(place))
  }

  const handleFocusPlace = (place: Place) => {
    setFocusPlace({ ...place })
  }

  const handleSaveEdit = (saved: PlaceDraft) => {
    updatePlace(saved.id, {
      name: saved.name,
      category: saved.category,
      memo: saved.memo,
      imageUrl: saved.imageUrl || undefined,
      linkUrl: saved.linkUrl || undefined,
      time: saved.time || undefined,
    })
    setEditDraft(null)
  }

  const handleSetRouteOrigin = (place: Place | null) => {
    setRouteOriginId(place?.id ?? null)
    if (place) showHint('다른 장소를 클릭해서 경로를 확인하세요')
  }

  const handleRouteCommitted = (
    originName: string,
    destinationId: string,
    mode: TravelMode,
    option: RouteOption,
  ) => {
    const destination = places.find((p) => p.id === destinationId)
    if (!destination) return
    const line = `${TRAVEL_MODE_EMOJI[mode]} ${originName}에서 ${TRAVEL_MODE_LABELS[mode]} ${option.durationText} (${option.distanceText})`
    updatePlace(destinationId, { memo: destination.memo ? `${destination.memo}\n${line}` : line })
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="api-key-notice">
        <h2>Google Maps API 키가 필요해요</h2>
        <p>
          프로젝트 루트에 <code>.env</code> 파일을 만들고 아래처럼 키를 넣어주세요.
        </p>
        <pre>{'VITE_GOOGLE_MAPS_API_KEY=your_api_key_here'}</pre>
        <p>Maps JavaScript API와 Places API를 활성화한 키가 필요합니다. 자세한 내용은 README를 참고하세요.</p>
      </div>
    )
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'routes']}>
      <div className={isMobile ? `app-shell mobile sheet-${sheetSnap}` : 'app-shell'}>
        <Sidebar
          places={sidebarPlaces}
          onEditPlace={handleEditPlace}
          onFocusPlace={handleFocusPlace}
          width={isMobile ? undefined : sidebarWidth}
          sheetSnap={isMobile ? sheetSnap : null}
          onSheetSnapChange={setSheetSnap}
          onFocusFromSheet={() => setSheetSnap('peek')}
        />
        {!isMobile && (
          <div
            className="sidebar-resize-handle"
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
          />
        )}
        <main className="map-pane">
          {!online && (
            <div className="offline-banner">
              오프라인 상태예요. 저장된 계획은 그대로 볼 수 있지만, 지도 타일·검색·경로는 연결된 뒤에 다시 동작해요.
            </div>
          )}
          {hint && <div className="map-hint">{hint}</div>}
          <MapView
            places={mapPlaces}
            visitOrderByPlaceId={visitOrderByPlaceId}
            isMobile={isMobile}
            mapPadding={mapPadding}
            focusPlace={focusPlace}
            fitPlaces={fitPlaces}
            draftLocation={draftLocation}
            defaultAddCategory={activeAddCategory ?? categoryOrder[0]}
            openPlaceId={openPlaceId}
            onOpenPlaceChange={setOpenPlaceId}
            onLocationPicked={handleLocationPicked}
            onEditPlace={handleEditPlace}
            onSaveDraft={handleSaveDraft}
            onCancelDraft={() => setDraftLocation(null)}
            routeOriginId={routeOriginId}
            onSetRouteOrigin={handleSetRouteOrigin}
            onRouteCommitted={handleRouteCommitted}
          />
        </main>
        {editDraft && (
          <PlaceForm draft={editDraft} onSave={handleSaveEdit} onCancel={() => setEditDraft(null)} />
        )}
      </div>
    </APIProvider>
  )
}

export default App
