import { create } from 'zustand'
import type { Category, CategoryStyle, Place, SavedRoute, Trip } from '../types'
import {
  DEFAULT_CATEGORY_LABELS,
  DEFAULT_CATEGORY_ORDER,
  DEFAULT_CATEGORY_STYLES,
  FALLBACK_CATEGORY_LABEL,
  FALLBACK_CATEGORY_STYLE,
  MAX_DAY_COUNT,
  formatTripLabel,
  todayDateString,
} from '../types'
import { dedupePlaces } from '../lib/dedupePlaces'

const TRIPS_KEY = 'travel-map.trips'
const PLACES_KEY = 'travel-map.places'
const ROUTES_KEY = 'travel-map.routes'
const CATEGORIES_KEY = 'travel-map.categories'
const ICON_SCALE_KEY = 'travel-map.iconScale'
const DEFAULT_ICON_SCALE = 1
const FADED_OPACITY_KEY = 'travel-map.fadedOpacity'
const DEFAULT_FADED_OPACITY = 0.38
const SHOW_LABELS_KEY = 'travel-map.showPlaceLabels'
const UNDO_DELETE_WINDOW_MS = 6000

let undoDeleteTimer: ReturnType<typeof setTimeout> | undefined

interface LegacyPlace {
  id: string
  name: string
  lat: number
  lng: number
  region: string
  category: Category
  memo: string
  createdAt: string
}

interface CategoriesState {
  order: Category[]
  labels: Record<Category, string>
  styles: Record<Category, CategoryStyle>
}

function isLegacyPlace(p: unknown): p is LegacyPlace {
  return typeof p === 'object' && p !== null && 'region' in p && !('tripId' in p)
}

function dateFromCreatedAt(createdAt: string): string {
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return '1970-01-01'
  return d.toISOString().slice(0, 10)
}

/** Migrates pre-trip data (flat `place.region` string) into `Trip` + `Place.tripId`. */
function migrate(rawPlaces: unknown[]): { trips: Trip[]; places: Place[] } {
  const trips: Trip[] = []
  const tripByRegionDate = new Map<string, Trip>()
  const places: Place[] = []

  for (const raw of rawPlaces) {
    if (!isLegacyPlace(raw)) {
      places.push(raw as Place)
      continue
    }
    const date = dateFromCreatedAt(raw.createdAt)
    const key = `${raw.region}__${date}`
    let trip = tripByRegionDate.get(key)
    if (!trip) {
      trip = {
        id: crypto.randomUUID(),
        region: raw.region,
        date,
        name: formatTripLabel(date),
        createdAt: raw.createdAt,
      }
      tripByRegionDate.set(key, trip)
      trips.push(trip)
    }
    places.push({
      id: raw.id,
      tripId: trip.id,
      name: raw.name,
      lat: raw.lat,
      lng: raw.lng,
      category: raw.category,
      memo: raw.memo,
      createdAt: raw.createdAt,
    })
  }

  return { trips, places }
}

function loadTripsAndPlaces(): { trips: Trip[]; places: Place[] } {
  try {
    const rawPlaces = localStorage.getItem(PLACES_KEY)
    const parsedPlaces: unknown[] = rawPlaces ? JSON.parse(rawPlaces) : []
    const needsMigration = parsedPlaces.some(isLegacyPlace)

    if (!needsMigration) {
      const rawTrips = localStorage.getItem(TRIPS_KEY)
      const parsedTrips: Array<Partial<Trip> & Pick<Trip, 'id' | 'region' | 'date' | 'createdAt'>> = rawTrips
        ? JSON.parse(rawTrips)
        : []
      const trips: Trip[] = parsedTrips.map((t) => ({ ...t, name: t.name ?? formatTripLabel(t.date) }))
      // Clears out any same-place-twice rows a past cross-device merge left
      // behind, and writes the cleaned list back so it doesn't re-appear.
      const places = dedupePlaces(parsedPlaces as Place[])
      if (places.length !== parsedPlaces.length) persistPlaces(places)
      return { trips, places }
    }

    const migrated = migrate(parsedPlaces)
    persistTrips(migrated.trips)
    persistPlaces(migrated.places)
    return migrated
  } catch {
    return { trips: [], places: [] }
  }
}

// Guarantees every category id referenced by `order` or by a place has a
// matching label and style, filling in a fallback for anything missing
// (e.g. data left behind by a category that was deleted on another device,
// or corrupted localStorage). Without this, any code that indexes
// `categoryStyles[place.category]`/`categoryLabels[place.category]`
// unguarded can crash the whole app.
function sanitizeCategories(state: CategoriesState, places: Place[]): CategoriesState {
  const order = [...state.order]
  const labels = { ...state.labels }
  const styles = { ...state.styles }
  const known = new Set([...order, ...Object.keys(labels), ...Object.keys(styles), ...places.map((p) => p.category)])
  for (const category of known) {
    if (!order.includes(category)) order.push(category)
    if (!(category in labels)) labels[category] = FALLBACK_CATEGORY_LABEL
    if (!(category in styles)) styles[category] = FALLBACK_CATEGORY_STYLE
  }
  return { order, labels, styles }
}

function loadCategories(places: Place[]): CategoriesState {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY)
    if (!raw) {
      return sanitizeCategories(
        { order: [...DEFAULT_CATEGORY_ORDER], labels: { ...DEFAULT_CATEGORY_LABELS }, styles: { ...DEFAULT_CATEGORY_STYLES } },
        places,
      )
    }
    const parsed: Partial<CategoriesState> = JSON.parse(raw)
    return sanitizeCategories(
      {
        order: parsed.order ?? [...DEFAULT_CATEGORY_ORDER],
        labels: { ...DEFAULT_CATEGORY_LABELS, ...parsed.labels },
        styles: { ...DEFAULT_CATEGORY_STYLES, ...parsed.styles },
      },
      places,
    )
  } catch {
    return sanitizeCategories(
      { order: [...DEFAULT_CATEGORY_ORDER], labels: { ...DEFAULT_CATEGORY_LABELS }, styles: { ...DEFAULT_CATEGORY_STYLES } },
      places,
    )
  }
}

function persistTrips(trips: Trip[]) {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips))
}

function persistPlaces(places: Place[]) {
  localStorage.setItem(PLACES_KEY, JSON.stringify(places))
}

function persistCategories(state: CategoriesState) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(state))
}

function persistRoutes(routes: SavedRoute[]) {
  localStorage.setItem(ROUTES_KEY, JSON.stringify(routes))
}

function loadRoutes(): SavedRoute[] {
  try {
    const raw = localStorage.getItem(ROUTES_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as SavedRoute[]) : []
  } catch {
    return []
  }
}

function loadIconScale(): number {
  const stored = Number(localStorage.getItem(ICON_SCALE_KEY))
  return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_ICON_SCALE
}

function loadFadedOpacity(): number {
  // `Number(null)` is 0, which would sail through a `>= 0` check and make
  // every faded marker invisible before the setting was ever touched.
  const raw = localStorage.getItem(FADED_OPACITY_KEY)
  if (raw === null) return DEFAULT_FADED_OPACITY
  const stored = Number(raw)
  return Number.isFinite(stored) && stored > 0 && stored <= 1 ? stored : DEFAULT_FADED_OPACITY
}

function loadShowPlaceLabels(): boolean {
  // Off by default -- labels on a dense map are a deliberate opt-in.
  return localStorage.getItem(SHOW_LABELS_KEY) === 'true'
}

/**
 * Every category defaults to visible; only an explicit toggle-off should
 * hide one. Deriving `selectedCategories` from `categoryOrder` minus this
 * deny-list -- instead of maintaining an allow-list some code paths have to
 * remember to append to -- means a category that shows up via a Supabase
 * merge (hydrate) is selected automatically, same as one created locally.
 */
function deriveSelectedCategories(categoryOrder: Category[], deselected: Set<Category>): Category[] {
  return categoryOrder.filter((c) => !deselected.has(c))
}

interface PlaceStore {
  trips: Trip[]
  places: Place[]
  routes: SavedRoute[]
  categoryOrder: Category[]
  categoryLabels: Record<Category, string>
  categoryStyles: Record<Category, CategoryStyle>
  selectedRegion: string | null
  selectedTripId: string | null
  selectedCategories: Category[]
  /** Source of truth behind `selectedCategories` -- see deriveSelectedCategories. */
  deselectedCategories: Set<Category>
  activeAddCategory: Category | null
  /**
   * The day currently being worked on. Doubles as the map filter and as the
   * day newly-saved places land on, so "planning day 2" is a single state
   * rather than two settings that can disagree.
   */
  focusedDay: number | null
  iconScale: number
  fadedOpacity: number
  /** Draw each marker's place name beneath its pin. */
  showPlaceLabels: boolean
  /** The most recently soft-deleted place (and its routes), while its undo window is open. */
  lastDeleted: { place: Place; routes: SavedRoute[] } | null

  addTrip: (region: string, name: string) => Trip
  renameTrip: (id: string, name: string) => void
  removeTrip: (id: string) => void
  addPlace: (place: Omit<Place, 'id' | 'createdAt'>) => Place
  /** Copies a place (same name/location/category/etc) as a new entry -- for a
   * spot you'll visit more than once, like accommodation you return to. */
  duplicatePlace: (id: string) => Place | null
  /** One copy per given day, in a single update. Returns how many were added. */
  duplicatePlaceToDays: (id: string, days: number[]) => number
  updatePlace: (id: string, patch: Partial<Place>) => void
  /** Sets a per-place marker style override, independent of its category's. */
  setPlaceStyle: (id: string, style: CategoryStyle) => void
  /** Drops the override so the place goes back to following its category's style. */
  clearPlaceStyle: (id: string) => void
  removePlace: (id: string) => void
  /** Removes the place immediately but keeps it (plus its routes) recoverable via undoDeletePlace for a few seconds. */
  deletePlaceWithUndo: (id: string) => void
  undoDeletePlace: () => void
  movePlace: (draggedId: string, targetId: string, align?: 'category' | 'day') => void
  setPlaceCategory: (id: string, category: Category) => void
  copyPlacesToTrip: (placeIds: string[], targetTripId: string) => number
  setPlaceDay: (id: string, day: number | undefined) => void
  setPlaceTime: (id: string, time: string | undefined) => void
  setFocusedDay: (day: number | null) => void
  setTripDayCount: (tripId: string, dayCount: number) => void
  saveRoute: (route: Omit<SavedRoute, 'id' | 'createdAt'>) => void
  removeRoute: (id: string) => void
  setSelectedRegion: (region: string | null) => void
  setSelectedTripId: (tripId: string | null) => void
  toggleCategoryFilter: (category: Category) => void
  setAllCategoriesSelected: (selected: boolean) => void
  setCategoryStyle: (category: Category, style: CategoryStyle) => void
  setActiveAddCategory: (category: Category | null) => void
  addCategory: (label: string, style: CategoryStyle) => Category
  renameCategory: (category: Category, label: string) => void
  removeCategory: (category: Category) => void
  setIconScale: (scale: number) => void
  setFadedOpacity: (opacity: number) => void
  setShowPlaceLabels: (show: boolean) => void
  hydrate: (data: {
    trips: Trip[]
    places: Place[]
    routes: SavedRoute[]
    categoryOrder: Category[]
    categoryLabels: Record<Category, string>
    categoryStyles: Record<Category, CategoryStyle>
  }) => void
}

const initial = loadTripsAndPlaces()
const initialCategories = loadCategories(initial.places)
persistCategories(initialCategories)

export const usePlaceStore = create<PlaceStore>((set, get) => ({
  trips: initial.trips,
  places: initial.places,
  routes: loadRoutes(),
  categoryOrder: initialCategories.order,
  categoryLabels: initialCategories.labels,
  categoryStyles: initialCategories.styles,
  selectedRegion: null,
  selectedTripId: null,
  selectedCategories: [...initialCategories.order],
  deselectedCategories: new Set(),
  activeAddCategory: null,
  focusedDay: null,
  iconScale: loadIconScale(),
  fadedOpacity: loadFadedOpacity(),
  showPlaceLabels: loadShowPlaceLabels(),
  lastDeleted: null,

  addTrip: (region, name) => {
    const trip: Trip = {
      id: crypto.randomUUID(),
      region,
      date: todayDateString(),
      name,
      createdAt: new Date().toISOString(),
    }
    const trips = [...get().trips, trip]
    set({ trips })
    persistTrips(trips)
    return trip
  },

  renameTrip: (id, name) => {
    const trips = get().trips.map((t) => (t.id === id ? { ...t, name } : t))
    set({ trips })
    persistTrips(trips)
  },

  removeTrip: (id) => {
    const trips = get().trips.filter((t) => t.id !== id)
    const places = get().places.filter((p) => p.tripId !== id)
    const routes = get().routes.filter((r) => r.tripId !== id)
    set({
      trips,
      places,
      routes,
      selectedTripId: get().selectedTripId === id ? null : get().selectedTripId,
    })
    persistTrips(trips)
    persistPlaces(places)
    persistRoutes(routes)
  },

  addPlace: (place) => {
    const newPlace: Place = {
      ...place,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    const places = [...get().places, newPlace]
    set({ places })
    persistPlaces(places)
    return newPlace
  },

  duplicatePlace: (id) => {
    const place = get().places.find((p) => p.id === id)
    if (!place) return null
    return get().addPlace({
      tripId: place.tripId,
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      category: place.category,
      memo: place.memo,
      day: place.day,
      imageUrl: place.imageUrl,
      linkUrl: place.linkUrl,
      time: place.time,
      style: place.style,
      googlePlaceId: place.googlePlaceId,
    })
  },

  duplicatePlaceToDays: (id, days) => {
    const place = get().places.find((p) => p.id === id)
    if (!place || days.length === 0) return 0
    const now = new Date().toISOString()
    const copies: Place[] = days.map((day) => ({
      ...place,
      id: crypto.randomUUID(),
      createdAt: now,
      day,
    }))
    const places = [...get().places, ...copies]
    set({ places })
    persistPlaces(places)
    return copies.length
  },

  updatePlace: (id, patch) => {
    const places = get().places.map((p) => (p.id === id ? { ...p, ...patch } : p))
    set({ places })
    persistPlaces(places)
  },

  setPlaceStyle: (id, style) => {
    get().updatePlace(id, { style })
  },

  clearPlaceStyle: (id) => {
    // A plain updatePlace({ style: undefined }) merge would leave the key
    // present-but-undefined, which reads identically to "no override" via
    // `place.style ?? categoryStyle` everywhere -- but dropping it entirely
    // keeps persisted/exported data from carrying dead fields around.
    const places = get().places.map((p) => {
      if (p.id !== id) return p
      const { style: _style, ...rest } = p
      return rest
    })
    set({ places })
    persistPlaces(places)
  },

  removePlace: (id) => {
    const places = get().places.filter((p) => p.id !== id)
    // A saved route is only meaningful while both of its endpoints exist.
    const routes = get().routes.filter((r) => r.originId !== id && r.destinationId !== id)
    set({ places, routes })
    persistPlaces(places)
    persistRoutes(routes)
  },

  deletePlaceWithUndo: (id) => {
    const place = get().places.find((p) => p.id === id)
    if (!place) return
    const removedRoutes = get().routes.filter((r) => r.originId === id || r.destinationId === id)
    get().removePlace(id)
    set({ lastDeleted: { place, routes: removedRoutes } })
    clearTimeout(undoDeleteTimer)
    undoDeleteTimer = setTimeout(() => {
      // Only clears if a newer delete hasn't already replaced this one.
      if (get().lastDeleted?.place.id === id) set({ lastDeleted: null })
    }, UNDO_DELETE_WINDOW_MS)
  },

  undoDeletePlace: () => {
    const pending = get().lastDeleted
    if (!pending) return
    clearTimeout(undoDeleteTimer)
    const places = [...get().places, pending.place]
    const routes = [...get().routes, ...pending.routes]
    set({ places, routes, lastDeleted: null })
    persistPlaces(places)
    persistRoutes(routes)
  },

  // Reordering also adopts whatever the drop target is grouped by, so a row
  // dragged across group boundaries lands in the group it was dropped into.
  movePlace: (draggedId, targetId, align = 'category') => {
    if (draggedId === targetId) return
    const current = get().places
    const draggedIndex = current.findIndex((p) => p.id === draggedId)
    const target = current.find((p) => p.id === targetId)
    if (draggedIndex === -1 || !target) return

    const places = [...current]
    const [original] = places.splice(draggedIndex, 1)
    const dragged = { ...original }
    if (align === 'category') {
      dragged.category = target.category
    } else if (target.day === undefined) {
      delete dragged.day
    } else {
      dragged.day = target.day
    }
    const newTargetIndex = places.findIndex((p) => p.id === targetId)
    places.splice(newTargetIndex, 0, dragged)
    set({ places })
    persistPlaces(places)
  },

  setPlaceCategory: (id, category) => {
    const places = get().places.map((p) => (p.id === id ? { ...p, category } : p))
    set({ places })
    persistPlaces(places)
  },

  // Copies places from an earlier trip into the current one. Day assignments
  // are deliberately dropped -- the new trip's schedule is its own -- and
  // anything already saved at that spot is skipped so repeated imports
  // don't pile up duplicates.
  copyPlacesToTrip: (placeIds, targetTripId) => {
    const current = get().places
    const source = current.filter((p) => placeIds.includes(p.id))
    const existing = current.filter((p) => p.tripId === targetTripId)

    const copies: Place[] = []
    for (const place of source) {
      const alreadyThere = existing.some(
        (p) =>
          p.name.trim() === place.name.trim() &&
          Math.abs(p.lat - place.lat) < 0.0001 &&
          Math.abs(p.lng - place.lng) < 0.0001,
      )
      if (alreadyThere) continue
      const copy: Place = {
        ...place,
        id: crypto.randomUUID(),
        tripId: targetTripId,
        createdAt: new Date().toISOString(),
      }
      delete copy.day
      copies.push(copy)
    }

    if (copies.length === 0) return 0
    const places = [...current, ...copies]
    set({ places })
    persistPlaces(places)
    return copies.length
  },

  setPlaceDay: (id, day) => {
    const places = get().places.map((p) => {
      if (p.id !== id) return p
      const next = { ...p }
      if (day === undefined) delete next.day
      else next.day = day
      return next
    })
    set({ places })
    persistPlaces(places)
  },

  setPlaceTime: (id, time) => {
    const places = get().places.map((p) => {
      if (p.id !== id) return p
      const next = { ...p }
      if (!time) delete next.time
      else next.time = time
      return next
    })
    set({ places })
    persistPlaces(places)
  },

  setFocusedDay: (day) => set({ focusedDay: day }),

  setTripDayCount: (tripId, dayCount) => {
    const clamped = Math.min(MAX_DAY_COUNT, Math.max(1, Math.round(dayCount)))
    const trips = get().trips.map((t) => (t.id === tripId ? { ...t, dayCount: clamped } : t))
    // Shrinking the trip would strand places on days that no longer exist, so
    // send those back to the unscheduled pool rather than hiding them.
    const places = get().places.map((p) => {
      if (p.tripId !== tripId || p.day === undefined || p.day <= clamped) return p
      const next = { ...p }
      delete next.day
      return next
    })
    const focusedDay = get().focusedDay
    set({ trips, places, focusedDay: focusedDay !== null && focusedDay > clamped ? null : focusedDay })
    persistTrips(trips)
    persistPlaces(places)
  },

  saveRoute: (route) => {
    // Re-picking a mode for the same pair replaces the old line rather than
    // stacking a second one on top of it.
    const routes = [
      ...get().routes.filter((r) => !(r.originId === route.originId && r.destinationId === route.destinationId)),
      { ...route, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
    ]
    set({ routes })
    persistRoutes(routes)
  },

  removeRoute: (id) => {
    const routes = get().routes.filter((r) => r.id !== id)
    set({ routes })
    persistRoutes(routes)
  },

  // Day focus belongs to one trip, so it can't survive switching away.
  setSelectedRegion: (region) => set({ selectedRegion: region, selectedTripId: null, focusedDay: null }),
  setSelectedTripId: (tripId) => set({ selectedTripId: tripId, focusedDay: null }),

  toggleCategoryFilter: (category) => {
    const deselectedCategories = new Set(get().deselectedCategories)
    if (deselectedCategories.has(category)) deselectedCategories.delete(category)
    else deselectedCategories.add(category)
    set({ deselectedCategories, selectedCategories: deriveSelectedCategories(get().categoryOrder, deselectedCategories) })
  },

  setAllCategoriesSelected: (selected) => {
    const deselectedCategories = selected ? new Set<Category>() : new Set(get().categoryOrder)
    set({ deselectedCategories, selectedCategories: deriveSelectedCategories(get().categoryOrder, deselectedCategories) })
  },

  setCategoryStyle: (category, style) => {
    const categoryStyles = { ...get().categoryStyles, [category]: style }
    set({ categoryStyles })
    persistCategories({ order: get().categoryOrder, labels: get().categoryLabels, styles: categoryStyles })
  },

  setActiveAddCategory: (category) => {
    set({ activeAddCategory: get().activeAddCategory === category ? null : category })
  },

  addCategory: (label, style) => {
    const id = `custom-${crypto.randomUUID()}`
    const categoryOrder = [...get().categoryOrder, id]
    const categoryLabels = { ...get().categoryLabels, [id]: label }
    const categoryStyles = { ...get().categoryStyles, [id]: style }
    set({
      categoryOrder,
      categoryLabels,
      categoryStyles,
      selectedCategories: deriveSelectedCategories(categoryOrder, get().deselectedCategories),
    })
    persistCategories({ order: categoryOrder, labels: categoryLabels, styles: categoryStyles })
    return id
  },

  renameCategory: (category, label) => {
    const categoryLabels = { ...get().categoryLabels, [category]: label }
    set({ categoryLabels })
    persistCategories({ order: get().categoryOrder, labels: categoryLabels, styles: get().categoryStyles })
  },

  removeCategory: (category) => {
    const categoryOrder = get().categoryOrder.filter((c) => c !== category)
    const placesInCategory = get().places.filter((p) => p.category === category)
    // Deleting the last remaining category would strand any places still in
    // it with no valid category to fall back to.
    if (categoryOrder.length === 0 && placesInCategory.length > 0) return
    const fallback = categoryOrder[0]

    const places = get().places.map((p) => (p.category === category ? { ...p, category: fallback ?? p.category } : p))
    const categoryLabels = { ...get().categoryLabels }
    delete categoryLabels[category]
    const categoryStyles = { ...get().categoryStyles }
    delete categoryStyles[category]
    const deselectedCategories = new Set(get().deselectedCategories)
    deselectedCategories.delete(category)
    const selectedCategories = deriveSelectedCategories(categoryOrder, deselectedCategories)
    const activeAddCategory = get().activeAddCategory === category ? null : get().activeAddCategory

    set({ categoryOrder, categoryLabels, categoryStyles, places, selectedCategories, deselectedCategories, activeAddCategory })
    persistCategories({ order: categoryOrder, labels: categoryLabels, styles: categoryStyles })
    persistPlaces(places)
  },

  setIconScale: (scale) => {
    localStorage.setItem(ICON_SCALE_KEY, String(scale))
    set({ iconScale: scale })
  },

  setFadedOpacity: (opacity) => {
    localStorage.setItem(FADED_OPACITY_KEY, String(opacity))
    set({ fadedOpacity: opacity })
  },

  setShowPlaceLabels: (show) => {
    localStorage.setItem(SHOW_LABELS_KEY, String(show))
    set({ showPlaceLabels: show })
  },

  // Applies externally-sourced data (e.g. a Supabase merge) AND persists it,
  // unlike a raw setState which would only update memory -- leaving
  // localStorage holding the pre-merge data until some unrelated action
  // happened to persist over it.
  hydrate: ({ trips, places, routes, categoryOrder, categoryLabels, categoryStyles }) => {
    // A category arriving fresh from a sync merge was never in
    // deselectedCategories, so it derives as selected -- keeping "every
    // category defaults to on" true for synced categories too, not just
    // ones created on this device.
    const selectedCategories = deriveSelectedCategories(categoryOrder, get().deselectedCategories)
    set({ trips, places, routes, categoryOrder, categoryLabels, categoryStyles, selectedCategories })
    persistTrips(trips)
    persistPlaces(places)
    persistRoutes(routes)
    persistCategories({ order: categoryOrder, labels: categoryLabels, styles: categoryStyles })
  },
}))
