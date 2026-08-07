import type { Category } from '../types'
import { CATEGORY_COLORS } from '../types'

interface PlacePinProps {
  category: Category
  faded: boolean
}

export function PlacePin({ category, faded }: PlacePinProps) {
  const color = CATEGORY_COLORS[category]
  return (
    <div style={{ opacity: faded ? 0.38 : 1, cursor: 'pointer' }}>
      <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 0C5.8 0 0 5.8 0 13c0 9.3 13 21 13 21s13-11.7 13-21C26 5.8 20.2 0 13 0z" fill={color} />
        <circle cx="13" cy="13" r="5.5" fill="white" />
      </svg>
    </div>
  )
}
