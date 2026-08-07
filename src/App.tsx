import { useMemo, useState } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { MapView } from './components/MapView'
import { Sidebar } from './components/Sidebar'
import { PlaceForm, draftFromPlace, type PlaceDraft } from './components/PlaceForm'
import type { SearchResult } from './components/SearchBox'
import { usePlaceStore } from './store/usePlaceStore'
import { GOOGLE_MAPS_API_KEY } from './lib/googleMaps'
import type { Place } from './types'
import './App.css'

function App() {
  const places = usePlaceStore((s) => s.places)
  const selectedRegion = usePlaceStore((s) => s.selectedRegion)
  const addPlace = usePlaceStore((s) => s.addPlace)
  const updatePlace = usePlaceStore((s) => s.updatePlace)

  const [draft, setDraft] = useState<PlaceDraft | null>(null)
  const [focusPlace, setFocusPlace] = useState<Place | null>(null)

  const visiblePlaces = useMemo(
    () => (selectedRegion ? places.filter((p) => p.region === selectedRegion) : places),
    [places, selectedRegion],
  )

  const fitPlaces = useMemo(
    () => (selectedRegion ? visiblePlaces : null),
    [selectedRegion, visiblePlaces],
  )

  const existingRegions = useMemo(
    () => [...new Set(places.map((p) => p.region))].sort((a, b) => a.localeCompare(b, 'ko')),
    [places],
  )

  const handleMapClick = (lat: number, lng: number) => {
    setDraft({
      name: '',
      lat,
      lng,
      region: selectedRegion ?? '',
      category: 'sight',
      memo: '',
      visited: false,
    })
  }

  const handleSearchSelect = (result: SearchResult) => {
    setDraft({
      name: result.name,
      lat: result.lat,
      lng: result.lng,
      region: selectedRegion ?? '',
      category: 'sight',
      memo: result.address,
      visited: false,
    })
  }

  const handleEditPlace = (place: Place) => {
    setDraft(draftFromPlace(place))
  }

  const handleFocusPlace = (place: Place) => {
    setFocusPlace({ ...place })
  }

  const handleSave = (saved: PlaceDraft) => {
    if (saved.id) {
      updatePlace(saved.id, saved)
    } else {
      addPlace({
        name: saved.name,
        lat: saved.lat,
        lng: saved.lng,
        region: saved.region,
        category: saved.category,
        memo: saved.memo,
        visited: saved.visited,
        visitDate: saved.visited ? new Date().toISOString() : null,
      })
    }
    setDraft(null)
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
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places']}>
      <div className="app-shell">
        <Sidebar places={places} onEditPlace={handleEditPlace} onFocusPlace={handleFocusPlace} />
        <main className="map-pane">
          <MapView
            places={visiblePlaces}
            focusPlace={focusPlace}
            fitPlaces={fitPlaces}
            onMapClick={handleMapClick}
            onEditPlace={handleEditPlace}
            onSearchSelect={handleSearchSelect}
          />
        </main>
        {draft && (
          <PlaceForm
            draft={draft}
            existingRegions={existingRegions}
            onSave={handleSave}
            onCancel={() => setDraft(null)}
          />
        )}
      </div>
    </APIProvider>
  )
}

export default App
