export type Category =
  | 'sight'
  | 'food'
  | 'cafe'
  | 'lodging'
  | 'shopping'
  | 'activity'
  | 'etc'

export interface Place {
  id: string
  name: string
  lat: number
  lng: number
  region: string
  category: Category
  memo: string
  visited: boolean
  visitDate: string | null
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
