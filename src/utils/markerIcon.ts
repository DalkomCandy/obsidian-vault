import L from 'leaflet'
import type { Category } from '../types'
import { CATEGORY_COLORS } from '../types'

const cache = new Map<string, L.DivIcon>()

export function getMarkerIcon(category: Category, faded: boolean): L.DivIcon {
  const key = `${category}-${faded}`
  const cached = cache.get(key)
  if (cached) return cached

  const color = CATEGORY_COLORS[category]
  const opacity = faded ? 0.38 : 1

  const html = `
    <div style="opacity:${opacity}">
      <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 0C5.8 0 0 5.8 0 13c0 9.3 13 21 13 21s13-11.7 13-21C26 5.8 20.2 0 13 0z" fill="${color}"/>
        <circle cx="13" cy="13" r="5.5" fill="white"/>
      </svg>
    </div>
  `

  const icon = L.divIcon({
    html,
    className: 'travel-marker',
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -30],
  })

  cache.set(key, icon)
  return icon
}
