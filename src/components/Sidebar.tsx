import { useMemo, useState } from 'react'
import type { Category, Place } from '../types'
import { MAX_DAY_COUNT, NEW_CATEGORY_STYLE, dayLabel, tripDayCount } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { TripPicker } from './TripPicker'
import { SettingsMenu } from './SettingsMenu'
import { CategoryStylePicker } from './CategoryStylePicker'
import { CategoryFilter } from './CategoryFilter'

interface SidebarProps {
  places: Place[]
  onEditPlace: (place: Place) => void
  onFocusPlace: (place: Place) => void
  width: number
}

type GroupMode = 'category' | 'day'

const GROUP_MODE_KEY = 'travel-map.groupMode'

function loadGroupMode(): GroupMode {
  return localStorage.getItem(GROUP_MODE_KEY) === 'day' ? 'day' : 'category'
}

function nextEmptyCategoryName(existingLabels: string[]): string {
  const base = '빈 카테고리'
  if (!existingLabels.includes(base)) return base
  let n = 2
  while (existingLabels.includes(`${base} ${n}`)) n++
  return `${base} ${n}`
}

export function Sidebar({ places, onEditPlace, onFocusPlace, width }: SidebarProps) {
  const removePlace = usePlaceStore((s) => s.removePlace)
  const movePlace = usePlaceStore((s) => s.movePlace)
  const setPlaceCategory = usePlaceStore((s) => s.setPlaceCategory)
  const setPlaceDay = usePlaceStore((s) => s.setPlaceDay)
  const setTripDayCount = usePlaceStore((s) => s.setTripDayCount)
  const categoryOrder = usePlaceStore((s) => s.categoryOrder)
  const categoryLabels = usePlaceStore((s) => s.categoryLabels)
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
  const addCategory = usePlaceStore((s) => s.addCategory)
  const renameCategory = usePlaceStore((s) => s.renameCategory)
  const removeCategory = usePlaceStore((s) => s.removeCategory)

  const [styleEditCategory, setStyleEditCategory] = useState<Category | null>(null)
  const [renamingCategory, setRenamingCategory] = useState<Category | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [addingRegion, setAddingRegion] = useState(false)
  const [regionDraft, setRegionDraft] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<Category>>(new Set())
  const [groupMode, setGroupModeState] = useState<GroupMode>(loadGroupMode)

  const setGroupMode = (mode: GroupMode) => {
    localStorage.setItem(GROUP_MODE_KEY, mode)
    setGroupModeState(mode)
  }

  const toggleCollapsed = (category: Category) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const regions = useMemo(() => {
    const all = trips.map((t) => t.region)
    // A freshly-typed region has no trips yet, so it wouldn't otherwise
    // appear as an <option> -- which would make the <select> show blank
    // even though it's the actively selected region.
    if (selectedRegion) all.push(selectedRegion)
    return [...new Set(all)].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [trips, selectedRegion])

  const tripById = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips])

  // Grouping for the place list depends on how far down the hierarchy we are.
  const groupedByCategory = useMemo(() => {
    const map = new Map<Category, Place[]>()
    for (const place of places) {
      const list = map.get(place.category) ?? []
      list.push(place)
      map.set(place.category, list)
    }
    // Show every category, including ones with no places yet -- a freshly
    // created category needs to stay visible so it can be renamed/styled.
    return categoryOrder.map((c) => [c, map.get(c) ?? []] as const)
  }, [places, categoryOrder])

  const selectedTrip = selectedTripId ? tripById.get(selectedTripId) : undefined
  const dayCount = tripDayCount(selectedTrip)

  // Every day gets a section even when empty -- an empty day still needs to
  // be a drop target, and seeing the gaps is the point of the itinerary view.
  const groupedByDay = useMemo(() => {
    const map = new Map<number, Place[]>()
    const unscheduled: Place[] = []
    for (const place of places) {
      if (place.day === undefined || place.day > dayCount) {
        unscheduled.push(place)
        continue
      }
      const list = map.get(place.day) ?? []
      list.push(place)
      map.set(place.day, list)
    }
    const days = Array.from({ length: dayCount }, (_, i) => i + 1)
    return { days: days.map((d) => [d, map.get(d) ?? []] as const), unscheduled }
  }, [places, dayCount])

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

  const submitNewRegion = () => {
    const name = regionDraft.trim()
    if (name) setSelectedRegion(name)
    setRegionDraft('')
    setAddingRegion(false)
  }

  const handleAddCategory = () => {
    const name = nextEmptyCategoryName(Object.values(categoryLabels))
    const id = addCategory(name, NEW_CATEGORY_STYLE)
    setRenamingCategory(id)
    setRenameDraft(name)
  }

  const confirmRename = () => {
    if (renamingCategory && renameDraft.trim()) {
      renameCategory(renamingCategory, renameDraft.trim())
    }
    setRenamingCategory(null)
  }

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
        e.stopPropagation()
        const draggedFromTransfer = e.dataTransfer.getData('text/plain')
        if (draggedFromTransfer) movePlace(draggedFromTransfer, place.id, groupMode)
        setDraggedId(null)
      }}
    >
      <span className="drag-handle">⠿</span>
      <button className="place-main" onClick={() => onFocusPlace(place)}>
        <span className="place-name">{place.name}</span>
      </button>
      {selectedTripId && (
        <select
          className={place.day === undefined ? 'place-day-select unset' : 'place-day-select'}
          value={place.day ?? ''}
          title="일차 배정"
          onChange={(e) => setPlaceDay(place.id, e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">–</option>
          {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      )}
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

  const renderDaySection = (key: string, title: string, list: Place[], day: number | undefined) => (
    <div
      className="region-group"
      key={key}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const draggedFromTransfer = e.dataTransfer.getData('text/plain')
        if (draggedFromTransfer) setPlaceDay(draggedFromTransfer, day)
        setDraggedId(null)
      }}
    >
      <div className="region-title static">
        <span className={day === undefined ? 'day-title unscheduled' : 'day-title'}>{title}</span>
        <span className="region-count">{list.length}개</span>
      </div>
      {list.length === 0 ? (
        <p className="day-empty">여기로 장소를 끌어다 놓으세요</p>
      ) : (
        <ul>{list.map(renderPlaceRow)}</ul>
      )}
    </div>
  )

  return (
    <aside className="sidebar" style={{ width, minWidth: width }}>
      <div className="sidebar-header-top">
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
        <SettingsMenu />
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
        />
      )}

      <CategoryFilter
        selected={selectedCategories}
        onToggle={toggleCategoryFilter}
        onSetAll={setAllCategoriesSelected}
      />

      {selectedTripId && (
        <div className="group-mode-row">
          <div className="group-mode-toggle">
            <button
              type="button"
              className={groupMode === 'category' ? 'active' : undefined}
              onClick={() => setGroupMode('category')}
            >
              카테고리별
            </button>
            <button
              type="button"
              className={groupMode === 'day' ? 'active' : undefined}
              onClick={() => setGroupMode('day')}
            >
              일차별
            </button>
          </div>
          {groupMode === 'day' && selectedTrip && (
            <div className="day-count-control" title="여행 일수">
              <button
                type="button"
                disabled={dayCount <= 1}
                onClick={() => setTripDayCount(selectedTrip.id, dayCount - 1)}
              >
                −
              </button>
              <span>{dayCount}일</span>
              <button
                type="button"
                disabled={dayCount >= MAX_DAY_COUNT}
                onClick={() => setTripDayCount(selectedTrip.id, dayCount + 1)}
              >
                +
              </button>
            </div>
          )}
        </div>
      )}

      {selectedTripId && groupMode === 'category' && (
        <div className="add-category-row">
          <button type="button" className="add-category-btn" onClick={handleAddCategory}>
            + 카테고리 추가
          </button>
        </div>
      )}

      <div className="place-list">
        {places.length === 0 && !(selectedTripId && categoryOrder.length > 0) && (
          <p className="empty-state">
            {selectedTripId && categoryOrder.length === 0
              ? '카테고리를 먼저 만들어보세요.'
              : selectedRegion && !selectedTripId
                ? '여행(날짜)을 선택하거나 만들어보세요.'
                : '지도를 클릭하거나 검색해서 첫 여행지를 추가해보세요.'}
          </p>
        )}

        {selectedTripId &&
          groupMode === 'day' && (
            <>
              {groupedByDay.days.map(([day, list]) => renderDaySection(`day-${day}`, dayLabel(day), list, day))}
              {renderDaySection('day-none', '미배정', groupedByDay.unscheduled, undefined)}
            </>
          )}

        {selectedTripId &&
          groupMode === 'category' &&
          groupedByCategory.map(([category, list]) => (
            <div
              className="region-group"
              key={category}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const draggedFromTransfer = e.dataTransfer.getData('text/plain')
                if (draggedFromTransfer) setPlaceCategory(draggedFromTransfer, category)
                setDraggedId(null)
              }}
            >
              <div className="region-title static">
                <button
                  type="button"
                  className={collapsedCategories.has(category) ? 'category-collapse-btn collapsed' : 'category-collapse-btn'}
                  title={collapsedCategories.has(category) ? '펼치기' : '접기'}
                  aria-expanded={!collapsedCategories.has(category)}
                  onClick={() => toggleCollapsed(category)}
                >
                  ▼
                </button>
                {renamingCategory === category ? (
                  <input
                    className="category-rename-input"
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={confirmRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmRename()
                      if (e.key === 'Escape') setRenamingCategory(null)
                    }}
                  />
                ) : (
                  <button
                    className={activeAddCategory === category ? 'category-name-btn active' : 'category-name-btn'}
                    title="선택하면 새로 저장하는 장소가 이 카테고리로 들어가요"
                    onClick={() => setActiveAddCategory(category)}
                  >
                    {categoryLabels[category]}
                  </button>
                )}
                <span className="region-title-right">
                  <span className="region-count">{list.length}개</span>
                  <button
                    className="category-rename-btn"
                    title="카테고리 이름 수정"
                    onClick={() => {
                      setRenamingCategory(category)
                      setRenameDraft(categoryLabels[category])
                    }}
                  >
                    ✎
                  </button>
                  <button
                    className="category-style-btn"
                    title="이 카테고리의 색/아이콘 일괄 변경"
                    onClick={() => setStyleEditCategory(styleEditCategory === category ? null : category)}
                  >
                    🎨
                  </button>
                  {(categoryOrder.length > 1 || list.length === 0) && (
                    <button
                      className="category-delete-btn"
                      title="카테고리 삭제"
                      onClick={() => {
                        const message =
                          list.length > 0
                            ? `"${categoryLabels[category]}" 카테고리를 삭제할까요? 이 카테고리에 있는 ${list.length}개 장소는 다른 카테고리로 옮겨져요.`
                            : `"${categoryLabels[category]}" 카테고리를 삭제할까요?`
                        if (confirm(message)) removeCategory(category)
                      }}
                    >
                      🗑
                    </button>
                  )}
                </span>
              </div>
              {styleEditCategory === category && (
                <CategoryStylePicker category={category} onClose={() => setStyleEditCategory(null)} />
              )}
              {!collapsedCategories.has(category) && <ul>{list.map(renderPlaceRow)}</ul>}
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
