import { useMemo, useState } from 'react'
import type { Place } from '../types'
import { CATEGORY_LABELS } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'

interface SidebarProps {
  places: Place[]
  onEditPlace: (place: Place) => void
  onFocusPlace: (place: Place) => void
}

export function Sidebar({ places, onEditPlace, onFocusPlace }: SidebarProps) {
  const settings = usePlaceStore((s) => s.settings)
  const toggleFade = usePlaceStore((s) => s.toggleFade)
  const toggleVisited = usePlaceStore((s) => s.toggleVisited)
  const removePlace = usePlaceStore((s) => s.removePlace)
  const selectedRegion = usePlaceStore((s) => s.selectedRegion)
  const setSelectedRegion = usePlaceStore((s) => s.setSelectedRegion)

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const grouped = useMemo(() => {
    const map = new Map<string, Place[]>()
    for (const place of places) {
      const list = map.get(place.region) ?? []
      list.push(place)
      map.set(place.region, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ko'))
  }, [places])

  const visibleGroups = useMemo(
    () => grouped.filter(([region]) => !selectedRegion || region === selectedRegion),
    [grouped, selectedRegion],
  )

  const toggleCollapse = (region: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(region)) next.delete(region)
      else next.add(region)
      return next
    })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>여행 지도</h1>
        <p className="subtitle">지역별로 여행지를 관리하고, 다녀온 곳은 흐리게 표시해요</p>
      </div>

      <div className="settings-panel">
        <label className="switch-label">
          <span>다녀온 장소 흐리게 표시</span>
          <input
            type="checkbox"
            checked={settings.fadeVisitedEnabled}
            onChange={toggleFade}
          />
        </label>
      </div>

      <div className="region-filter">
        <select
          className="region-select"
          value={selectedRegion ?? ''}
          onChange={(e) => setSelectedRegion(e.target.value || null)}
        >
          <option value="">전체 ({places.length})</option>
          {grouped.map(([region, list]) => (
            <option key={region} value={region}>
              {region} ({list.length})
            </option>
          ))}
        </select>
      </div>

      <div className="place-list">
        {grouped.length === 0 && (
          <p className="empty-state">지도를 클릭하거나 검색해서 첫 여행지를 추가해보세요.</p>
        )}
        {visibleGroups.map(([region, list]) => {
          const visitedCount = list.filter((p) => p.visited).length
          const isCollapsed = collapsed.has(region)
          return (
            <div className="region-group" key={region}>
              <button className="region-title" onClick={() => toggleCollapse(region)}>
                <span>{isCollapsed ? '▶' : '▼'} {region}</span>
                <span className="region-count">
                  {visitedCount}/{list.length} 방문
                </span>
              </button>
              {!isCollapsed && (
                <ul>
                  {list.map((place) => (
                    <li
                      key={place.id}
                      className={place.visited && settings.fadeVisitedEnabled ? 'place-item faded' : 'place-item'}
                    >
                      <button className="place-main" onClick={() => onFocusPlace(place)}>
                        <span className="place-name">{place.name}</span>
                        <span className="place-category">{CATEGORY_LABELS[place.category]}</span>
                      </button>
                      <div className="place-controls">
                        <button
                          title={place.visited ? '방문 취소' : '방문 완료로 표시'}
                          onClick={() => toggleVisited(place.id)}
                        >
                          {place.visited ? '✓' : '○'}
                        </button>
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
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
