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
import { loadRemoteState } from './store/sync'
import { TRAVEL_MODE_EMOJI, TRAVEL_MODE_LABELS, type Category, type Place, type TravelMode } from './types'
import './App.css'

const NEEDS_TRIP_HINT = '먼저 지역과 여행(날짜)을 선택하거나 만들어주세요'
const NEEDS_CATEGORY_HINT = '먼저 사이드바에서 카테고리를 만들어주세요'

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

  useEffect(() => {
    loadRemoteState()
  }, [])

  const tripById = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips])

  const visiblePlaces = useMemo(
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

  const fitPlaces = useMemo(
    () => ((selectedRegion || selectedTripId) && visiblePlaces.length ? visiblePlaces : null),
    [selectedRegion, selectedTripId, visiblePlaces],
  )

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
      <div className="app-shell">
        <Sidebar
          places={visiblePlaces}
          onEditPlace={handleEditPlace}
          onFocusPlace={handleFocusPlace}
          width={sidebarWidth}
        />
        <div
          className="sidebar-resize-handle"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        />
        <main className="map-pane">
          {hint && <div className="map-hint">{hint}</div>}
          <MapView
            places={visiblePlaces}
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
