import type { CSSProperties } from 'react'
import type { Category } from '../types'
import { FALLBACK_CATEGORY_LABEL, FALLBACK_CATEGORY_STYLE } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'

interface CategoryFilterProps {
  selected: Category[]
  onToggle: (category: Category) => void
  onSetAll: (selected: boolean) => void
}

export function CategoryFilter({ selected, onToggle, onSetAll }: CategoryFilterProps) {
  const categoryOrder = usePlaceStore((s) => s.categoryOrder)
  const categoryLabels = usePlaceStore((s) => s.categoryLabels)
  const categoryStyles = usePlaceStore((s) => s.categoryStyles)
  const allSelected = selected.length === categoryOrder.length

  return (
    <div className="category-filter">
      <div className="category-filter-header">
        <span className="category-filter-label">카테고리</span>
        <button type="button" className="category-filter-all" onClick={() => onSetAll(!allSelected)}>
          {allSelected ? '전체 해제' : '전체 선택'}
        </button>
      </div>
      <div className="category-filter-chips">
        {categoryOrder.map((category) => {
          const active = selected.includes(category)
          const style = categoryStyles[category] ?? FALLBACK_CATEGORY_STYLE
          return (
            <button
              key={category}
              type="button"
              className={active ? 'category-chip active' : 'category-chip'}
              style={{ '--chip-color': style.color } as CSSProperties}
              onClick={() => onToggle(category)}
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
