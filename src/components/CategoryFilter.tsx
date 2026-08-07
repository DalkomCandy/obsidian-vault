import type { CSSProperties } from 'react'
import type { Category } from '../types'
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_ORDER } from '../types'

interface CategoryFilterProps {
  selected: Category[]
  onToggle: (category: Category) => void
}

export function CategoryFilter({ selected, onToggle }: CategoryFilterProps) {
  return (
    <div className="category-filter">
      {CATEGORY_ORDER.map((category) => {
        const active = selected.includes(category)
        return (
          <button
            key={category}
            type="button"
            className={active ? 'category-chip active' : 'category-chip'}
            style={{ '--chip-color': CATEGORY_COLORS[category] } as CSSProperties}
            onClick={() => onToggle(category)}
          >
            <span className="dot" />
            {CATEGORY_LABELS[category]}
          </button>
        )
      })}
    </div>
  )
}
