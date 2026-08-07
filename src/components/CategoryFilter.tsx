import type { CSSProperties } from 'react'
import type { Category } from '../types'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'

interface CategoryFilterProps {
  selected: Category[]
  onToggle: (category: Category) => void
  onSetAll: (selected: boolean) => void
}

export function CategoryFilter({ selected, onToggle, onSetAll }: CategoryFilterProps) {
  const categoryStyles = usePlaceStore((s) => s.categoryStyles)
  const allSelected = selected.length === CATEGORY_ORDER.length

  return (
    <div className="category-filter">
      <div className="category-filter-header">
        <span className="category-filter-label">카테고리</span>
        <button type="button" className="category-filter-all" onClick={() => onSetAll(!allSelected)}>
          {allSelected ? '전체 해제' : '전체 선택'}
        </button>
      </div>
      <div className="category-filter-chips">
        {CATEGORY_ORDER.map((category) => {
          const active = selected.includes(category)
          return (
            <button
              key={category}
              type="button"
              className={active ? 'category-chip active' : 'category-chip'}
              style={{ '--chip-color': categoryStyles[category].color } as CSSProperties}
              onClick={() => onToggle(category)}
            >
              <span className="dot" />
              {CATEGORY_LABELS[category]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
