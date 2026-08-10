import { useEffect, useRef, useState } from 'react'
import { usePlaceStore } from '../store/usePlaceStore'
import { buildTripKml, downloadKml, kmlFilename } from '../lib/exportKml'
import { ImportPlacesDialog } from './ImportPlacesDialog'
import { TripPicker } from './TripPicker'
import { RegionPicker } from './RegionPicker'

/** Floating-bar counterpart to SettingsMenu: region + trip switching/management
 * tucked behind an icon button instead of sitting inline in the top bar. */
export function TripMenu() {
  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const trips = usePlaceStore((s) => s.trips)
  const places = usePlaceStore((s) => s.places)
  const routes = usePlaceStore((s) => s.routes)
  const categoryLabels = usePlaceStore((s) => s.categoryLabels)
  const selectedRegion = usePlaceStore((s) => s.selectedRegion)
  const selectedTripId = usePlaceStore((s) => s.selectedTripId)
  const setSelectedTripId = usePlaceStore((s) => s.setSelectedTripId)
  const addTrip = usePlaceStore((s) => s.addTrip)
  const renameTrip = usePlaceStore((s) => s.renameTrip)
  const removeTrip = usePlaceStore((s) => s.removeTrip)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null

  const handleExport = () => {
    if (!selectedTrip) return
    const tripPlaces = places.filter((p) => p.tripId === selectedTrip.id)
    const placeIds = new Set(tripPlaces.map((p) => p.id))
    const tripRoutes = routes.filter((r) => placeIds.has(r.originId) && placeIds.has(r.destinationId))
    const kml = buildTripKml(selectedTrip, tripPlaces, tripRoutes, categoryLabels)
    downloadKml(kmlFilename(selectedTrip), kml)
  }

  return (
    <div className="trip-menu" ref={containerRef}>
      <button type="button" className="trip-menu-btn" title="여행 선택" onClick={() => setOpen((v) => !v)}>
        <span className="trip-menu-icon">☰</span>
      </button>
      {open && (
        <div className="trip-menu-panel">
          <RegionPicker variant="floating" />
          {selectedRegion && (
            <TripPicker
              region={selectedRegion}
              trips={trips}
              selectedTripId={selectedTripId}
              onSelectTrip={setSelectedTripId}
              onCreateTrip={(name) => {
                const trip = addTrip(selectedRegion, name)
                setSelectedTripId(trip.id)
              }}
              onRenameTrip={renameTrip}
              onDeleteTrip={removeTrip}
              onImportPlaces={() => setImporting(true)}
              onExportTrip={handleExport}
            />
          )}
        </div>
      )}
      {importing && selectedTrip && (
        <ImportPlacesDialog
          targetTrip={selectedTrip}
          onClose={() => setImporting(false)}
          onImported={(count) =>
            alert(count > 0 ? `${count}개 장소를 가져왔어요.` : '가져올 새 장소가 없었어요 (이미 저장된 장소는 건너뜁니다).')
          }
        />
      )}
    </div>
  )
}
