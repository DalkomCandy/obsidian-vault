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
  /** How many days this trip is planned over. Absent on older data. */
  dayCount?: number
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
  /** 1-based day within the trip. Absent means "not scheduled yet". */
  day?: number
  /** Image URL shown in the place's popup. */
  imageUrl?: string
  /** Reference link (blog post, booking page, …) opened from the popup. */
  linkUrl?: string
  /** Planned visit time as 'HH:MM'. Absent means "no fixed time". */
  time?: string
  /** Overrides the category's marker style for this place alone. Absent
   * means "use the category's style", same as every other place in it. */
  style?: CategoryStyle
  /** Google's own id for this spot, when it came from a POI click or search.
   * Absent for KML imports and hand-placed pins, which have no listing. */
  googlePlaceId?: string
}

/** Valid 'HH:MM' in 24-hour form, or empty for "clear the time". */
export function isValidTime(value: string): boolean {
  return value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/**
 * Orders a day's places the way they'll actually be visited: anything with a
 * set time first, in clock order, then the untimed ones in whatever manual
 * order they were dragged into.
 */
export function sortByVisitOrder(places: Place[]): Place[] {
  const timed = places.filter((p) => p.time)
  const untimed = places.filter((p) => !p.time)
  timed.sort((a, b) => (a.time as string).localeCompare(b.time as string))
  return [...timed, ...untimed]
}

export const DEFAULT_DAY_COUNT = 3
export const MAX_DAY_COUNT = 30

export function tripDayCount(trip: Trip | undefined): number {
  const count = trip?.dayCount
  return Number.isFinite(count) && (count as number) >= 1 ? (count as number) : DEFAULT_DAY_COUNT
}

export function dayLabel(day: number): string {
  return `${day}일차`
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

export const TRAVEL_MODE_COLOR: Record<TravelMode, string> = {
  WALKING: '#16a34a',
  DRIVING: '#2563eb',
  TRANSIT: '#dc2626',
}

/** A route the user chose to keep, drawn on the map until they delete it. */
export interface SavedRoute {
  id: string
  tripId: string
  originId: string
  destinationId: string
  mode: TravelMode
  path: { lat: number; lng: number }[]
  durationText: string
  distanceText: string
  /** Raw values, so day totals can be summed instead of parsed back out of the text. */
  durationSeconds?: number
  distanceMeters?: number
  createdAt: string
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 60) return `${minutes}분`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`
}

export function formatDistance(totalMeters: number): string {
  return totalMeters < 1000 ? `${Math.round(totalMeters)} m` : `${(totalMeters / 1000).toFixed(1)} km`
}

/**
 * Opens the given trip leg in Google Maps proper. Used as the fallback when
 * the Directions API can't answer -- most notably transit in Japan, which
 * the consumer app covers but the API does not.
 */
/**
 * Opens turn-by-turn navigation to a place. Leaving the origin out makes
 * Google Maps start from wherever the phone currently is, which is what you
 * want standing on a street corner -- and on mobile this hands off to the
 * installed Google Maps app rather than the web page.
 */
/**
 * Opens the place itself in Google Maps (not directions to it) -- for
 * checking hours, photos and reviews, or sharing it.
 *
 * With a stored Google place id this resolves to that exact listing, so the
 * spot's actual info page opens. Without one (KML imports, hand-placed pins)
 * it falls back to the coordinates, which drop an unnamed pin at the right
 * spot -- deliberately not a name search, since that would happily match a
 * different branch of the same chain on the other side of the city.
 */
export function googleMapsViewUrl(place: {
  lat: number
  lng: number
  name?: string
  googlePlaceId?: string
}): string {
  const coords = `${place.lat},${place.lng}`
  if (!place.googlePlaceId) {
    return `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: coords })}`
  }
  // query_place_id is only honoured alongside a query, so send the name when
  // there is one -- the id is what actually decides which listing opens.
  const params = new URLSearchParams({
    api: '1',
    query: place.name?.trim() || coords,
    query_place_id: place.googlePlaceId,
  })
  return `https://www.google.com/maps/search/?${params.toString()}`
}

export function googleMapsNavigationUrl(
  destination: { lat: number; lng: number },
  mode: TravelMode = 'WALKING',
): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
    travelmode: mode.toLowerCase(),
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function googleMapsDirectionsUrl(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: TravelMode,
): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: mode.toLowerCase(),
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
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
