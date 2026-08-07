import { create } from 'zustand'
import type { Place, Settings } from '../types'

const PLACES_KEY = 'travel-map.places'
const SETTINGS_KEY = 'travel-map.settings'

function loadPlaces(): Place[] {
  try {
    const raw = localStorage.getItem(PLACES_KEY)
    return raw ? (JSON.parse(raw) as Place[]) : []
  } catch {
    return []
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

function persistPlaces(places: Place[]) {
  localStorage.setItem(PLACES_KEY, JSON.stringify(places))
}

function persistSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

interface PlaceStore {
  places: Place[]
  settings: Settings
  selectedRegion: string | null
  addPlace: (place: Omit<Place, 'id' | 'createdAt'>) => void
  updatePlace: (id: string, patch: Partial<Place>) => void
  removePlace: (id: string) => void
  toggleVisited: (id: string) => void
  toggleFade: () => void
  setSelectedRegion: (region: string | null) => void
}

export const usePlaceStore = create<PlaceStore>((set, get) => ({
  places: loadPlaces(),
  settings: loadSettings(),
  selectedRegion: null,

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

  setSelectedRegion: (region) => set({ selectedRegion: region }),
}))
