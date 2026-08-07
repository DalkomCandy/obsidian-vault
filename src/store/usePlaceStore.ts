import { create } from 'zustand'
import type { Category, Place, Settings, Trip } from '../types'
import { CATEGORY_ORDER, formatTripLabel } from '../types'

const TRIPS_KEY = 'travel-map.trips'
const PLACES_KEY = 'travel-map.places'
const SETTINGS_KEY = 'travel-map.settings'

interface LegacyPlace {
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
      visited: raw.visited,
      visitDate: raw.visitDate,
      iconColor: null,
      iconShape: 'pin',
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
      return { trips, places: parsedPlaces as Place[] }
    }

    const migrated = migrate(parsedPlaces)
    persistTrips(migrated.trips)
    persistPlaces(migrated.places)
    return migrated
  } catch {
    return { trips: [], places: [] }
  }
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? (JSON.parse(raw) as Settings) : { fadeVisitedEnabled: true }
  } catch {
    return { fadeVisitedEnabled: true }
  }
}

function persistTrips(trips: Trip[]) {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips))
}

function persistPlaces(places: Place[]) {
  localStorage.setItem(PLACES_KEY, JSON.stringify(places))
}

function persistSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

interface PlaceStore {
  trips: Trip[]
  places: Place[]
  settings: Settings
  selectedRegion: string | null
  selectedTripId: string | null
  selectedCategories: Category[]

  addTrip: (region: string, date: string) => Trip
  renameTrip: (id: string, name: string) => void
  removeTrip: (id: string) => void
  addPlace: (place: Omit<Place, 'id' | 'createdAt'>) => void
  updatePlace: (id: string, patch: Partial<Place>) => void
  removePlace: (id: string) => void
  toggleVisited: (id: string) => void
  toggleFade: () => void
  setSelectedRegion: (region: string | null) => void
  setSelectedTripId: (tripId: string | null) => void
  toggleCategoryFilter: (category: Category) => void
  setAllCategoriesSelected: (selected: boolean) => void
}

const initial = loadTripsAndPlaces()

export const usePlaceStore = create<PlaceStore>((set, get) => ({
  trips: initial.trips,
  places: initial.places,
  settings: loadSettings(),
  selectedRegion: null,
  selectedTripId: null,
  selectedCategories: [...CATEGORY_ORDER],

  addTrip: (region, date) => {
    const existing = get().trips.find((t) => t.region === region && t.date === date)
    if (existing) return existing
    const trip: Trip = {
      id: crypto.randomUUID(),
      region,
      date,
      name: formatTripLabel(date),
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
    set({
      trips,
      places,
      selectedTripId: get().selectedTripId === id ? null : get().selectedTripId,
    })
    persistTrips(trips)
    persistPlaces(places)
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
  },

  updatePlace: (id, patch) => {
    const places = get().places.map((p) => (p.id === id ? { ...p, ...patch } : p))
    set({ places })
    persistPlaces(places)
  },

  removePlace: (id) => {
    const places = get().places.filter((p) => p.id !== id)
    set({ places })
    persistPlaces(places)
  },

  toggleVisited: (id) => {
    const places = get().places.map((p) =>
      p.id === id
        ? {
            ...p,
            visited: !p.visited,
            visitDate: !p.visited ? new Date().toISOString() : null,
          }
        : p,
    )
    set({ places })
    persistPlaces(places)
  },

  toggleFade: () => {
    const settings = { ...get().settings, fadeVisitedEnabled: !get().settings.fadeVisitedEnabled }
    set({ settings })
    persistSettings(settings)
  },

  setSelectedRegion: (region) => set({ selectedRegion: region, selectedTripId: null }),
  setSelectedTripId: (tripId) => set({ selectedTripId: tripId }),

  toggleCategoryFilter: (category) => {
    const current = get().selectedCategories
    const selectedCategories = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category]
    set({ selectedCategories })
  },

  setAllCategoriesSelected: (selected) => {
    set({ selectedCategories: selected ? [...CATEGORY_ORDER] : [] })
  },
}))

