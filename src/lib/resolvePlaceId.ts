import { reportPlaceLookupError } from './placeLookupStatus'

/**
 * A resolved id has to be the *same* spot, not merely the nearest match for
 * the name -- a text search for "스타벅스" biased to Tokyo will happily
 * return a branch across town. 120m is loose enough for the drift between a
 * saved pin and Google's own centre for large venues (stations, malls) while
 * still excluding a different building.
 */
const MAX_MATCH_METRES = 120

/** Metres between two coordinates (equirectangular approximation, ample at this scale). */
function distanceMetres(a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const x = toRad(b.lng - a.lng) * Math.cos(toRad((a.lat + b.lat) / 2))
  const y = toRad(b.lat - a.lat)
  return Math.hypot(x, y) * R
}

/**
 * Finds Google's place id for a place saved before we started storing one
 * (or imported from KML), so its link can open the real listing instead of
 * a bare coordinate pin. Returns null when nothing matches closely enough --
 * a wrong id is worse than none, since it would send you to the wrong shop.
 */
export async function resolveGooglePlaceId(
  placesLib: typeof google.maps.places,
  place: { name: string; lat: number; lng: number },
): Promise<string | null> {
  const name = place.name.trim()
  if (!name) return null
  const origin = { lat: place.lat, lng: place.lng }

  try {
    const { places: results } = await placesLib.Place.searchByText({
      textQuery: name,
      fields: ['id', 'location'],
      maxResultCount: 5,
      locationBias: { center: origin, radius: 500 },
    })

    let best: { id: string; metres: number } | null = null
    for (const result of results) {
      const loc = result.location
      if (!result.id || !loc) continue
      const metres = distanceMetres(origin, { lat: loc.lat(), lng: loc.lng() })
      if (!best || metres < best.metres) best = { id: result.id, metres }
    }
    return best && best.metres <= MAX_MATCH_METRES ? best.id : null
  } catch (err) {
    // Same failure modes as the POI-click lookup (referrer restrictions,
    // quota, network) -- surface it in diagnostics rather than silently
    // leaving every old place unlinked with no explanation.
    const message = err instanceof Error ? err.message : String(err)
    console.error('Failed to resolve place id', err)
    reportPlaceLookupError(message)
    return null
  }
}
