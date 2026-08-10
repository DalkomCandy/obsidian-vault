import { useMemo, useRef, useState } from 'react'
import type { Category, Place } from '../types'
import {
  MAX_DAY_COUNT,
  NEW_CATEGORY_STYLE,
  TRAVEL_MODE_EMOJI,
  dayLabel,
  formatDistance,
  formatDuration,
  sortByVisitOrder,
  tripDayCount,
} from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { DRAG_ID_ATTR, DROP_GROUP_ATTR, useRowDrag } from '../hooks/useRowDrag'
import { useSheetDrag, type SheetSnap } from '../hooks/useSheetDrag'
import { TimeCell } from './TimeCell'
import { CategoryStylePicker } from './CategoryStylePicker'

export type { SheetSnap }

interface SidebarProps {
  places: Place[]
  onEditPlace: (place: Place) => void
  onFocusPlace: (place: Place) => void
  /** Opens the travel-mode picker for a leg of the day's itinerary. */
  onPickRoute: (from: Place, to: Place) => void
  /** Desktop only -- the mobile sheet is sized by snap point, not by width. */
  width?: number
  /** Non-null on phones, where the sidebar renders as a bottom sheet. */
  sheetSnap: SheetSnap | null
  onSheetSnapChange: (snap: SheetSnap) => void
  /** Collapse the sheet so the map is visible after picking a place. */
  onFocusFromSheet: () => void
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

export function Sidebar({
  places,
  onEditPlace,
  onFocusPlace,
  onPickRoute,
  width,
  sheetSnap,
  onSheetSnapChange,
  onFocusFromSheet,
}: SidebarProps) {
  const deletePlaceWithUndo = usePlaceStore((s) => s.deletePlaceWithUndo)
  const movePlace = usePlaceStore((s) => s.movePlace)
  const setPlaceCategory = usePlaceStore((s) => s.setPlaceCategory)
  const setPlaceDay = usePlaceStore((s) => s.setPlaceDay)
  const setPlaceTime = usePlaceStore((s) => s.setPlaceTime)
  const setTripDayCount = usePlaceStore((s) => s.setTripDayCount)
  const focusedDay = usePlaceStore((s) => s.focusedDay)
  const setFocusedDay = usePlaceStore((s) => s.setFocusedDay)
  const categoryOrder = usePlaceStore((s) => s.categoryOrder)
  const categoryLabels = usePlaceStore((s) => s.categoryLabels)
  const routes = usePlaceStore((s) => s.routes)
  const trips = usePlaceStore((s) => s.trips)
  const selectedRegion = usePlaceStore((s) => s.selectedRegion)
  const setSelectedRegion = usePlaceStore((s) => s.setSelectedRegion)
  const selectedTripId = usePlaceStore((s) => s.selectedTripId)
  const setSelectedTripId = usePlaceStore((s) => s.setSelectedTripId)
  const activeAddCategory = usePlaceStore((s) => s.activeAddCategory)
  const setActiveAddCategory = usePlaceStore((s) => s.setActiveAddCategory)
  const addCategory = usePlaceStore((s) => s.addCategory)
  const renameCategory = usePlaceStore((s) => s.renameCategory)
  const removeCategory = usePlaceStore((s) => s.removeCategory)

  const [styleEditCategory, setStyleEditCategory] = useState<Category | null>(null)
  const [renamingCategory, setRenamingCategory] = useState<Category | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<Category>>(new Set())
  const [groupMode, setGroupModeState] = useState<GroupMode>(loadGroupMode)

  const sheetRef = useRef<HTMLElement>(null)
  const { dragHeight, grabberProps } = useSheetDrag({
    snap: sheetSnap ?? 'half',
    onSnapChange: onSheetSnapChange,
    sheetRef,
  })

  const { draggedId, hoverTarget, handleProps } = useRowDrag({
    onDropOnRow: (id, targetId) => movePlace(id, targetId, groupMode),
    onDropOnGroup: (id, group) => {
      const [kind, value] = [group.slice(0, group.indexOf(':')), group.slice(group.indexOf(':') + 1)]
      if (kind === 'day') setPlaceDay(id, value === 'none' ? undefined : Number(value))
      else if (kind === 'cat') setPlaceCategory(id, value)
    },
  })

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

  const routeByPair = useMemo(() => {
    const map = new Map<string, (typeof routes)[number]>()
    for (const route of routes) map.set(`${route.originId}->${route.destinationId}`, route)
    return map
  }, [routes])

  /**
   * Totals the saved routes linking a day's places in the order they're
   * listed. Legs with no saved route are counted separately rather than
   * silently treated as zero, so a partial total never reads as complete.
   */
  const daySummary = (list: Place[]) => {
    let seconds = 0
    let meters = 0
    let missing = 0
    for (let i = 0; i < list.length - 1; i++) {
      const from = list[i]
      const to = list[i + 1]
      const route = routeByPair.get(`${from.id}->${to.id}`) ?? routeByPair.get(`${to.id}->${from.id}`)
      if (route?.durationSeconds) {
        seconds += route.durationSeconds
        meters += route.distanceMeters ?? 0
      } else {
        missing += 1
      }
    }
    return { seconds, meters, missing }
  }

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
    // Within a day, timed stops lead in clock order -- that's the order the
    // travel totals and the map's numbering both read from.
    return {
      days: days.map((d) => [d, sortByVisitOrder(map.get(d) ?? [])] as const),
      unscheduled,
    }
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
      {...{ [DRAG_ID_ATTR]: place.id }}
      className={
        place.id === draggedId
          ? 'place-item dragging'
          : hoverTarget.rowId === place.id
            ? 'place-item drop-target'
            : 'place-item'
      }
    >
      <span className="drag-handle" title="끌어서 순서/일차 변경" {...handleProps(place.id)}>
        ⠿
      </span>
      <button
        className="place-main"
        onClick={() => {
          onFocusPlace(place)
          // Tapping a place on a phone means "show me where that is" -- keep
          // the sheet over the map and you can't see what you just picked.
          if (sheetSnap && sheetSnap !== 'peek') onFocusFromSheet()
        }}
      >
        <span className="place-name">{place.name}</span>
      </button>
      {selectedTripId && groupMode === 'day' && (
        <TimeCell value={place.time} onChange={(time) => setPlaceTime(place.id, time)} />
      )}
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
              {dayLabel(d)}
            </option>
          ))}
        </select>
      )}
      <div className="place-controls">
        <button title="수정" onClick={() => onEditPlace(place)}>
          ✎
        </button>
        <button title="삭제" onClick={() => deletePlaceWithUndo(place.id)}>
          ✕
        </button>
      </div>
    </li>
  )

  // The gap between two consecutive stops in the day's order. Once a route
  // is saved it shows the mode/duration; until then it's the button that
  // creates it -- the order is already decided here, so picking the two ends
  // off the map by hand (the popup's "경로 그리기") is the long way round.
  const renderLegRow = (from: Place, to: Place) => {
    const route = routeByPair.get(`${from.id}->${to.id}`) ?? routeByPair.get(`${to.id}->${from.id}`)
    if (!route) {
      return (
        <li key={`leg-${from.id}-${to.id}`} className="day-leg-row">
          <button type="button" className="day-leg-add" onClick={() => onPickRoute(from, to)}>
            + 이동 방법
          </button>
        </li>
      )
    }
    return (
      <li key={`leg-${from.id}-${to.id}`} className="day-leg-row">
        <span className="day-leg-emoji">{TRAVEL_MODE_EMOJI[route.mode]}</span>
        <span>
          {route.durationText}
          {route.distanceText ? ` · ${route.distanceText}` : ''}
        </span>
      </li>
    )
  }

  const renderDaySection = (key: string, title: string, list: Place[], day: number | undefined) => {
    const summary = day === undefined ? null : daySummary(list)
    const focused = day !== undefined && day === focusedDay
    return (
      <div
        key={key}
        {...{ [DROP_GROUP_ATTR]: `day:${day ?? 'none'}` }}
        className={[
          'region-group',
          focused ? 'day-focused' : '',
          hoverTarget.group === `day:${day ?? 'none'}` ? 'drop-target' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="region-title static">
          {day === undefined ? (
            <span className="day-title unscheduled">{title}</span>
          ) : (
            <button
              type="button"
              className={focused ? 'day-title day-title-btn focused' : 'day-title day-title-btn'}
              title={focused ? '이 날짜만 보기 해제' : '이 날짜만 지도에 보기 (새 장소도 이 날로 저장돼요)'}
              onClick={() => setFocusedDay(focused ? null : day)}
            >
              {title}
              {focused && <span className="day-focus-mark">보는 중</span>}
            </button>
          )}
          <span className="region-count">{list.length}개</span>
        </div>
        {summary && (summary.seconds > 0 || summary.missing > 0) && (
          <div className="day-summary">
            {summary.seconds > 0 && (
              <span>
                이동 {formatDuration(summary.seconds)} · {formatDistance(summary.meters)}
              </span>
            )}
            {summary.missing > 0 && <span className="day-summary-missing">경로 {summary.missing}구간 미확인</span>}
          </div>
        )}
        {list.length === 0 ? (
          <p className="day-empty">여기로 장소를 끌어다 놓으세요</p>
        ) : (
          <ul>
            {list.flatMap((place, i) => {
              const next = list[i + 1]
              const leg = next ? renderLegRow(place, next) : null
              return leg ? [renderPlaceRow(place), leg] : [renderPlaceRow(place)]
            })}
          </ul>
        )}
      </div>
    )
  }

  return (
    <aside
      ref={sheetRef}
      className={
        sheetSnap ? (dragHeight !== null ? 'sidebar sidebar-sheet dragging' : 'sidebar sidebar-sheet') : 'sidebar'
      }
      style={sheetSnap ? (dragHeight !== null ? { height: dragHeight } : undefined) : { width, minWidth: width }}
    >
      {sheetSnap && (
        <button
          type="button"
          className="sheet-grabber"
          aria-label={sheetSnap === 'full' ? '목록 접기' : '목록 펼치기'}
          title="끌어서 크기를 조절하거나 눌러서 전환"
          {...grabberProps}
        >
          <span className="sheet-grabber-bar" />
        </button>
      )}
      {/* Region select, search, settings, the category filter, and trip
          switching/management all live in the floating bar over the map now
          (both platforms) -- the sidebar starts directly with the group-mode
          toggle they'd otherwise sit above. */}
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
              key={category}
              {...{ [DROP_GROUP_ATTR]: `cat:${category}` }}
              className={
                hoverTarget.group === `cat:${category}` ? 'region-group drop-target' : 'region-group'
              }
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
