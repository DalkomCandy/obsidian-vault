import { useEffect, useMemo, useRef, useState } from 'react'
import { usePlaceStore } from '../store/usePlaceStore'
import { CategoryFilter } from './CategoryFilter'
import { AddCategoryForm } from './AddCategoryForm'

export function MapControlPanel() {
  const trips = usePlaceStore((s) => s.trips)
  const selectedRegion = usePlaceStore((s) => s.selectedRegion)
  const setSelectedRegion = usePlaceStore((s) => s.setSelectedRegion)
  const selectedCategories = usePlaceStore((s) => s.selectedCategories)
  const toggleCategoryFilter = usePlaceStore((s) => s.toggleCategoryFilter)
  const setAllCategoriesSelected = usePlaceStore((s) => s.setAllCategoriesSelected)

  const [addingRegion, setAddingRegion] = useState(false)
  const [regionDraft, setRegionDraft] = useState('')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)

  const regions = useMemo(() => {
    const all = trips.map((t) => t.region)
    // A freshly-typed region has no trips yet, so it wouldn't otherwise
    // appear as an <option> -- which would make the <select> show blank
    // even though it's the actively selected region.
    if (selectedRegion) all.push(selectedRegion)
    return [...new Set(all)].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [trips, selectedRegion])

  useEffect(() => {
    if (!categoryOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [categoryOpen])

  const submitNewRegion = () => {
    const name = regionDraft.trim()
    if (name) setSelectedRegion(name)
    setRegionDraft('')
    setAddingRegion(false)
  }

  return (
    <div className="map-control-panel">
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

      <div className="category-quick" ref={categoryRef}>
        <button
          type="button"
          className="category-quick-trigger"
          onClick={() => setCategoryOpen((v) => !v)}
        >
          카테고리 {categoryOpen ? '▴' : '▾'}
        </button>
        <div className={categoryOpen ? 'category-quick-dropdown open' : 'category-quick-dropdown'}>
          <CategoryFilter
            selected={selectedCategories}
            onToggle={toggleCategoryFilter}
            onSetAll={setAllCategoriesSelected}
          />
          <button type="button" className="add-category-btn" onClick={() => setAddingCategory(true)}>
            + 카테고리 추가
          </button>
        </div>
      </div>

      {addingCategory && <AddCategoryForm onDone={() => setAddingCategory(false)} />}
    </div>
  )
}
