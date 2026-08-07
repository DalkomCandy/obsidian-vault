export type Category =
  | 'sight'
  | 'food'
  | 'cafe'
  | 'lodging'
  | 'shopping'
  | 'activity'
  | 'transport'
  | 'etc'

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
  iconColor: string | null // null = use the category's default style
  iconShape: MarkerShape | null // null = use the category's default style
  createdAt: string
}

export interface CategoryStyle {
  color: string
  shape: MarkerShape
}

export const CATEGORY_LABELS: Record<Category, string> = {
  sight: '관광지',
  food: '음식점',
  cafe: '카페',
  lodging: '숙소',
  shopping: '쇼핑',
  activity: '액티비티',
  transport: '교통',
  etc: '기타',
}

export const CATEGORY_ORDER: Category[] = [
  'sight',
  'food',
  'cafe',
  'lodging',
  'shopping',
  'activity',
  'transport',
  'etc',
]

// Sensible starting point for each category's marker. Fully editable at
// runtime via the bulk "카테고리 스타일" picker in the sidebar.
export const DEFAULT_CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  sight: { color: '#2563eb', shape: 'camera' },
  food: { color: '#dc2626', shape: 'fork' },
  cafe: { color: '#a16207', shape: 'cup' },
  lodging: { color: '#7c3aed', shape: 'bed' },
  shopping: { color: '#db2777', shape: 'bag' },
  activity: { color: '#16a34a', shape: 'star' },
  transport: { color: '#0891b2', shape: 'car' },
  etc: { color: '#525252', shape: 'pin' },
}

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

// Shapes offered in the per-category bulk style picker. "기타" has no fixed
// icon so it gets the full shape list; the rest get a short relevant subset.
export const CATEGORY_RELEVANT_SHAPES: Record<Category, MarkerShape[]> = {
  sight: ['camera', 'flag', 'pin', 'star'],
  food: ['fork', 'circle', 'pin', 'square'],
  cafe: ['cup', 'circle', 'pin', 'square'],
  lodging: ['bed', 'home', 'pin', 'square'],
  shopping: ['bag', 'pin', 'square', 'diamond'],
  activity: ['star', 'flag', 'pin', 'circle'],
  transport: ['car', 'pin', 'circle', 'square'],
  etc: MARKER_SHAPES,
}

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

export function resolveIconStyle(
  place: Pick<Place, 'iconColor' | 'iconShape' | 'category'>,
  categoryStyles: Record<Category, CategoryStyle>,
): CategoryStyle {
  const base = categoryStyles[place.category]
  return {
    color: place.iconColor ?? base.color,
    shape: place.iconShape ?? base.shape,
  }
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
