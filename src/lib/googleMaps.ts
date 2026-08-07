export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

// "DEMO_MAP_ID" is Google's public testing Map ID — it lets Advanced Markers
// render without requiring you to create a Map ID in Cloud Console first.
// Set VITE_GOOGLE_MAPS_MAP_ID once you have your own styled Map ID.
export const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'

export const DEFAULT_CENTER = { lat: 36.5, lng: 127.8 } // South Korea
export const DEFAULT_ZOOM = 7
