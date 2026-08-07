import { useMemo, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { MapView } from './components/MapView'
import { Sidebar } from './components/Sidebar'
import { PlaceForm, draftFromPlace, type PlaceDraft } from './components/PlaceForm'
import { usePlaceStore } from './store/usePlaceStore'
import type { Place } from './types'
import './App.css'

function App() {
  const places = usePlaceStore((s) => s.places)
  const selectedRegion = usePlaceStore((s) => s.selectedRegion)
  const addPlace = usePlaceStore((s) => s.addPlace)
  const updatePlace = usePlaceStore((s) => s.updatePlace)

  const [draft, setDraft] = useState<PlaceDraft | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  const visiblePlaces = useMemo(
    () => (selectedRegion ? places.filter((p) => p.region === selectedRegion) : places),
    [places, selectedRegion],
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

  const handleEditPlace = (place: Place) => {
    setDraft(draftFromPlace(place))
  }

  const handleFocusPlace = (place: Place) => {
    mapRef.current?.flyTo([place.lat, place.lng], 15, { duration: 0.6 })
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

  return (
    <div className="app-shell">
      <Sidebar places={visiblePlaces} onEditPlace={handleEditPlace} onFocusPlace={handleFocusPlace} />
      <main className="map-pane">
        <MapView ref={mapRef} places={visiblePlaces} onMapClick={handleMapClick} onEditPlace={handleEditPlace} />
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
  )
}

export default App
