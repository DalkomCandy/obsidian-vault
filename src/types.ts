export type Category =
  | 'sight'
  | 'food'
  | 'cafe'
  | 'lodging'
  | 'shopping'
  | 'activity'
  | 'etc'

export type MarkerShape = 'pin' | 'star' | 'heart' | 'flag' | 'circle'

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
  visited: boolean
  visitDate: string | null
  iconColor: string | null // null = use the category's default color
  iconShape: MarkerShape
  createdAt: string
}

export interface Settings {
  fadeVisitedEnabled: boolean
}

export const CATEGORY_LABELS: Record<Category, string> = {
  sight: '관광지',
  food: '음식점',
  cafe: '카페',
  lodging: '숙소',
  shopping: '쇼핑',
  activity: '액티비티',
  etc: '기타',
}

export const CATEGORY_COLORS: Record<Category, string> = {
  sight: '#2563eb',
  food: '#dc2626',
  cafe: '#a16207',
  lodging: '#7c3aed',
  shopping: '#db2777',
  activity: '#16a34a',
  etc: '#525252',
}

export const CATEGORY_ORDER: Category[] = [
  'sight',
  'food',
  'cafe',
  'lodging',
  'shopping',
  'activity',
  'etc',
]

export const MARKER_SHAPES: MarkerShape[] = ['pin', 'star', 'heart', 'flag', 'circle']

export const MARKER_SHAPE_LABELS: Record<MarkerShape, string> = {
  pin: '핀',
  star: '별',
  heart: '하트',
  flag: '깃발',
  circle: '원',
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

export function resolveIconColor(place: Pick<Place, 'iconColor' | 'category'>): string {
  return place.iconColor ?? CATEGORY_COLORS[place.category]
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
