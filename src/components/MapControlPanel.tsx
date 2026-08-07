import { useMemo } from 'react'
import { usePlaceStore } from '../store/usePlaceStore'
import { CategoryFilter } from './CategoryFilter'

export function MapControlPanel() {
  const trips = usePlaceStore((s) => s.trips)
  const selectedRegion = usePlaceStore((s) => s.selectedRegion)
  const setSelectedRegion = usePlaceStore((s) => s.setSelectedRegion)
  const selectedCategories = usePlaceStore((s) => s.selectedCategories)
  const toggleCategoryFilter = usePlaceStore((s) => s.toggleCategoryFilter)
  const setAllCategoriesSelected = usePlaceStore((s) => s.setAllCategoriesSelected)

  const regions = useMemo(
    () => [...new Set(trips.map((t) => t.region))].sort((a, b) => a.localeCompare(b, 'ko')),
    [trips],
  )

  return (
    <div className="map-control-panel">
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
      <CategoryFilter
        selected={selectedCategories}
        onToggle={toggleCategoryFilter}
        onSetAll={setAllCategoriesSelected}
      />
    </div>
  )
}
