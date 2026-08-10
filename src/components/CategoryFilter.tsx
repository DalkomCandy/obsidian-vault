import type { CSSProperties } from 'react'
import { FALLBACK_CATEGORY_LABEL, FALLBACK_CATEGORY_STYLE } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'

interface CategoryFilterProps {
  /** Horizontal scrolling chip strip with no header, for floating over the map. */
  compact?: boolean
}

export function CategoryFilter({ compact = false }: CategoryFilterProps) {
  const categoryOrder = usePlaceStore((s) => s.categoryOrder)
  const categoryLabels = usePlaceStore((s) => s.categoryLabels)
  const categoryStyles = usePlaceStore((s) => s.categoryStyles)
  const selected = usePlaceStore((s) => s.selectedCategories)
  const toggleCategoryFilter = usePlaceStore((s) => s.toggleCategoryFilter)
  const setAllCategoriesSelected = usePlaceStore((s) => s.setAllCategoriesSelected)
  const allSelected = selected.length === categoryOrder.length

  // Nothing to filter yet -- an empty floating strip would just be dead
  // space over the map, whereas the sidebar's full header stays as a cue
  // that categories belong there.
  if (compact && categoryOrder.length === 0) return null

  return (
    <div className={compact ? 'category-filter compact' : 'category-filter'}>
      {!compact && (
        <div className="category-filter-header">
          <span className="category-filter-label">카테고리</span>
          <button type="button" className="category-filter-all" onClick={() => setAllCategoriesSelected(!allSelected)}>
            {allSelected ? '전체 해제' : '전체 선택'}
          </button>
        </div>
      )}
      <div className="category-filter-chips">
        {compact && (
          <button
            type="button"
            className="category-chip category-chip-all"
            onClick={() => setAllCategoriesSelected(!allSelected)}
          >
            {allSelected ? '전체 해제' : '전체 선택'}
          </button>
        )}
        {categoryOrder.map((category) => {
          const active = selected.includes(category)
          const style = categoryStyles[category] ?? FALLBACK_CATEGORY_STYLE
          return (
            <button
              key={category}
              type="button"
              className={active ? 'category-chip active' : 'category-chip'}
              style={{ '--chip-color': style.color } as CSSProperties}
              onClick={() => toggleCategoryFilter(category)}
            >
              <span className="dot" />
              {categoryLabels[category] ?? FALLBACK_CATEGORY_LABEL}
            </button>
          )
        })}
      </div>
    </div>
  )
}
