import { useMemo, useState } from 'react'
import { usePlaceStore } from '../store/usePlaceStore'

interface RegionPickerProps {
  /**
   * 'floating' sits over the map (mobile top bar), where pushing the row
   * below it down when adding a region would shove the search box around.
   * There the add-region field drops down as its own popover instead.
   */
  variant?: 'sidebar' | 'floating'
}

export function RegionPicker({ variant = 'sidebar' }: RegionPickerProps) {
  const trips = usePlaceStore((s) => s.trips)
  const selectedRegion = usePlaceStore((s) => s.selectedRegion)
  const setSelectedRegion = usePlaceStore((s) => s.setSelectedRegion)

  const [addingRegion, setAddingRegion] = useState(false)
  const [regionDraft, setRegionDraft] = useState('')

  const regions = useMemo(() => {
    const all = trips.map((t) => t.region)
    // A freshly-typed region has no trips yet, so it wouldn't otherwise
    // appear as an <option> -- which would make the <select> show blank
    // even though it's the actively selected region.
    if (selectedRegion) all.push(selectedRegion)
    return [...new Set(all)].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [trips, selectedRegion])

  const submitNewRegion = () => {
    const name = regionDraft.trim()
    if (name) setSelectedRegion(name)
    setRegionDraft('')
    setAddingRegion(false)
  }

  return (
    <div className={variant === 'floating' ? 'region-picker floating' : 'region-picker'}>
      <div className="region-row">
        <select
          className="region-select"
          value={selectedRegion ?? ''}
          onChange={(e) => setSelectedRegion(e.target.value || null)}
        >
          <option value="">전체 지역</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="region-add-btn"
          title="새 지역 추가"
          onClick={() => setAddingRegion((v) => !v)}
        >
          +
        </button>
      </div>

      {addingRegion && (
        <div className="region-add-row">
          <input
            autoFocus
            value={regionDraft}
            onChange={(e) => setRegionDraft(e.target.value)}
            placeholder="새 지역 이름 (예: 도쿄)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitNewRegion()
              if (e.key === 'Escape') setAddingRegion(false)
            }}
          />
          <button type="button" className="primary" onClick={submitNewRegion}>
            추가
          </button>
        </div>
      )}
    </div>
  )
}
