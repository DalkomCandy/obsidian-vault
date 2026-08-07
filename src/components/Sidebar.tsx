import { useMemo, useState } from 'react'
import type { Category, Place } from '../types'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { TripPicker } from './TripPicker'
import { CategoryFilter } from './CategoryFilter'
import { ThemeToggle } from './ThemeToggle'
import { CategoryStylePicker } from './CategoryStylePicker'
import { IconSizeControl } from './IconSizeControl'

interface SidebarProps {
  places: Place[]
  onEditPlace: (place: Place) => void
  onFocusPlace: (place: Place) => void
}

export function Sidebar({ places, onEditPlace, onFocusPlace }: SidebarProps) {
  const removePlace = usePlaceStore((s) => s.removePlace)
  const reorderPlace = usePlaceStore((s) => s.reorderPlace)
  const trips = usePlaceStore((s) => s.trips)
  const selectedRegion = usePlaceStore((s) => s.selectedRegion)
  const setSelectedRegion = usePlaceStore((s) => s.setSelectedRegion)
  const selectedTripId = usePlaceStore((s) => s.selectedTripId)
  const setSelectedTripId = usePlaceStore((s) => s.setSelectedTripId)
  const selectedCategories = usePlaceStore((s) => s.selectedCategories)
  const toggleCategoryFilter = usePlaceStore((s) => s.toggleCategoryFilter)
  const setAllCategoriesSelected = usePlaceStore((s) => s.setAllCategoriesSelected)
  const addTrip = usePlaceStore((s) => s.addTrip)
  const renameTrip = usePlaceStore((s) => s.renameTrip)
  const removeTrip = usePlaceStore((s) => s.removeTrip)
  const activeAddCategory = usePlaceStore((s) => s.activeAddCategory)
  const setActiveAddCategory = usePlaceStore((s) => s.setActiveAddCategory)

  const [styleEditCategory, setStyleEditCategory] = useState<Category | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const regions = useMemo(
    () => [...new Set(trips.map((t) => t.region))].sort((a, b) => a.localeCompare(b, 'ko')),
    [trips],
  )

  const tripById = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips])

  // Grouping for the place list depends on how far down the hierarchy we are.
  const groupedByCategory = useMemo(() => {
    const map = new Map<Category, Place[]>()
    for (const place of places) {
      const list = map.get(place.category) ?? []
      list.push(place)
      map.set(place.category, list)
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => [c, map.get(c)!] as const)
  }, [places])

  const groupedByTrip = useMemo(() => {
    const map = new Map<string, Place[]>()
    for (const place of places) {
      const list = map.get(place.tripId) ?? []
      list.push(place)
      map.set(place.tripId, list)
    }
    return [...map.entries()].sort((a, b) => {
      const da = tripById.get(a[0])?.date ?? ''
      const db = tripById.get(b[0])?.date ?? ''
      return db.localeCompare(da)
    })
  }, [places, tripById])

  const groupedByRegion = useMemo(() => {
    const map = new Map<string, Place[]>()
    for (const place of places) {
      const region = tripById.get(place.tripId)?.region ?? '알 수 없음'
      const list = map.get(region) ?? []
      list.push(place)
      map.set(region, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ko'))
  }, [places, tripById])

  const renderPlaceRow = (place: Place) => (
    <li
      key={place.id}
      className={place.id === draggedId ? 'place-item dragging' : 'place-item'}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', place.id)
        e.dataTransfer.effectAllowed = 'move'
        setDraggedId(place.id)
      }}
      onDragEnd={() => setDraggedId(null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const draggedFromTransfer = e.dataTransfer.getData('text/plain')
        if (draggedFromTransfer) reorderPlace(draggedFromTransfer, place.id)
        setDraggedId(null)
      }}
    >
      <span className="drag-handle">⠿</span>
      <button className="place-main" onClick={() => onFocusPlace(place)}>
        <span className="place-name">{place.name}</span>
      </button>
      <div className="place-controls">
        <button title="수정" onClick={() => onEditPlace(place)}>
          ✎
        </button>
        <button
          title="삭제"
          onClick={() => {
            if (confirm(`"${place.name}"을(를) 삭제할까요?`)) removePlace(place.id)
          }}
        >
          ✕
        </button>
      </div>
    </li>
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-top">
          <h1>여행 지도</h1>
          <ThemeToggle />
        </div>
        <p className="subtitle">전체 → 지역 → 여행 순으로 관리해요</p>
      </div>

      <div className="settings-panel">
        <IconSizeControl />
      </div>

      <div className="region-filter">
        <select
          className="region-select"
          value={selectedRegion ?? ''}
          onChange={(e) => setSelectedRegion(e.target.value || null)}
        >
          <option value="">전체</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>

      {selectedRegion && (
        <TripPicker
          region={selectedRegion}
          trips={trips}
          selectedTripId={selectedTripId}
          onSelectTrip={setSelectedTripId}
          onCreateTrip={(date) => {
            const trip = addTrip(selectedRegion, date)
            setSelectedTripId(trip.id)
          }}
          onRenameTrip={renameTrip}
          onDeleteTrip={removeTrip}
        />
      )}

      <CategoryFilter
        selected={selectedCategories}
        onToggle={toggleCategoryFilter}
        onSetAll={setAllCategoriesSelected}
      />

      <div className="place-list">
        {places.length === 0 && (
          <p className="empty-state">
            {selectedRegion && !selectedTripId
              ? '여행(날짜)을 선택하거나 만들어보세요.'
              : '지도를 클릭하거나 검색해서 첫 여행지를 추가해보세요.'}
          </p>
        )}

        {selectedTripId &&
          groupedByCategory.map(([category, list]) => (
            <div className="region-group" key={category}>
              <div className="region-title static">
                <button
                  className={activeAddCategory === category ? 'category-name-btn active' : 'category-name-btn'}
                  title="선택하면 새로 저장하는 장소가 이 카테고리로 들어가요"
                  onClick={() => setActiveAddCategory(category)}
                >
                  {CATEGORY_LABELS[category]}
                </button>
                <span className="region-title-right">
                  <span className="region-count">{list.length}개</span>
                  <button
                    className="category-style-btn"
                    title="이 카테고리의 색/아이콘 일괄 변경"
                    onClick={() => setStyleEditCategory(styleEditCategory === category ? null : category)}
                  >
                    🎨
                  </button>
                </span>
              </div>
              {styleEditCategory === category && <CategoryStylePicker category={category} />}
              <ul>{list.map(renderPlaceRow)}</ul>
            </div>
          ))}

        {!selectedTripId &&
          selectedRegion &&
          groupedByTrip.map(([tripId, list]) => {
            const trip = tripById.get(tripId)
            return (
              <div className="region-group" key={tripId}>
                <button className="region-title" onClick={() => setSelectedTripId(tripId)}>
                  <span>{trip ? trip.name : '알 수 없음'}</span>
                  <span className="region-count">{list.length}개</span>
                </button>
              </div>
            )
          })}

        {!selectedTripId &&
          !selectedRegion &&
          groupedByRegion.map(([region, list]) => (
            <div className="region-group" key={region}>
              <button className="region-title" onClick={() => setSelectedRegion(region)}>
                <span>{region}</span>
                <span className="region-count">{list.length}개</span>
              </button>
            </div>
          ))}
      </div>
    </aside>
  )
}
