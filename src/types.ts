// A category id. There are no built-in categories -- users create their own
// from scratch via the sidebar, so this isn't a fixed union.
export type Category = string

export type MarkerShape =
  | 'pin'
  | 'star'
  | 'heart'
  | 'flag'
  | 'circle'
  | 'square'
  | 'diamond'
  | 'triangle'
  | 'bookmark'
  | 'home'
  | 'bed'
  | 'cup'
  | 'fork'
  | 'bag'
  | 'camera'
  | 'car'

export interface Trip {
  id: string
  region: string
  date: string // 'YYYY-MM-DD'
  name: string
  createdAt: string
}

export interface Place {
  id: string
  tripId: string
  name: string
  lat: number
  lng: number
  category: Category
  memo: string
  createdAt: string
}

export interface CategoryStyle {
  color: string
  shape: MarkerShape
  // Optional Google-provided official place icon (image URL). When set, this
  // is preferred over `shape` for rendering; `shape` stays as a fallback in
  // case the image fails to load.
  iconUrl?: string
}

// No built-in categories -- everyone starts from zero and adds their own via
// the sidebar's "카테고리 추가" button.
export const DEFAULT_CATEGORY_ORDER: Category[] = []
export const DEFAULT_CATEGORY_LABELS: Record<Category, string> = {}
export const DEFAULT_CATEGORY_STYLES: Record<Category, CategoryStyle> = {}

// Style a freshly-created category starts with, before the user customizes
// it via the 🎨 picker or renames it away from "빈 카테고리".
export const NEW_CATEGORY_STYLE: CategoryStyle = { color: '#2563eb', shape: 'circle' }

// A place or category id should always resolve to a real label/style, but
// stale local data or a cross-device sync can in principle reference a
// category id that no longer has an entry. Render *something* instead of
// crashing.
export const FALLBACK_CATEGORY_STYLE: CategoryStyle = { color: '#525252', shape: 'pin' }
export const FALLBACK_CATEGORY_LABEL = '알 수 없는 카테고리'

export const MARKER_SHAPES: MarkerShape[] = [
  'pin',
  'star',
  'heart',
  'flag',
  'circle',
  'square',
  'diamond',
  'triangle',
  'bookmark',
  'home',
  'bed',
  'cup',
  'fork',
  'bag',
  'camera',
  'car',
]

export const MARKER_SHAPE_LABELS: Record<MarkerShape, string> = {
  pin: '핀',
  star: '별',
  heart: '하트',
  flag: '깃발',
  circle: '원',
  square: '사각형',
  diamond: '다이아몬드',
  triangle: '삼각형',
  bookmark: '북마크',
  home: '집',
  bed: '침대',
  cup: '컵',
  fork: '포크',
  bag: '가방',
  camera: '카메라',
  car: '자동차',
}

export const MARKER_COLOR_PALETTE = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#a16207',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#525252',
]

export type TravelMode = 'WALKING' | 'DRIVING' | 'TRANSIT'

export const TRAVEL_MODE_LABELS: Record<TravelMode, string> = {
  WALKING: '도보',
  DRIVING: '자동차',
  TRANSIT: '대중교통',
}

export const TRAVEL_MODE_EMOJI: Record<TravelMode, string> = {
  WALKING: '🚶',
  DRIVING: '🚗',
  TRANSIT: '🚌',
}

export function formatTripLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${y.slice(2)}.${m}.${d}`
}

export function todayDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
