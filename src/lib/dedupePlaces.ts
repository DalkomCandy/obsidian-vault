import type { Place } from '../types'

// Google returns identical coordinates for the same POI every time, so this
// only has to absorb float noise -- roughly 11m, far tighter than the gap
// between two genuinely different places.
const SAME_SPOT_EPSILON = 0.0001

function spotKey(place: Place): string {
  const lat = Math.round(place.lat / SAME_SPOT_EPSILON)
  const lng = Math.round(place.lng / SAME_SPOT_EPSILON)
  return `${place.tripId}|${place.name.trim()}|${lat}|${lng}`
}

/**
 * Collapses entries that are the same place saved twice into the same trip --
 * which happens when two devices each add it before syncing, since the merge
 * unions by id and the two copies have different ids.
 *
 * Only entries that agree on trip, name *and* location are folded together,
 * so nothing distinguishable is ever lost. The oldest copy is kept (it's the
 * one any saved route already points at), and the longest memo among the
 * duplicates survives so notes typed on either device aren't dropped.
 */
export function dedupePlaces(places: Place[]): Place[] {
  // Keeps the caller's ordering -- the sidebar list is manually sortable, so
  // a survivor stays exactly where its first copy sat.
  const indexByKey = new Map<string, number>()
  const result: Place[] = []

  for (const place of places) {
    const key = spotKey(place)
    const at = indexByKey.get(key)
    if (at === undefined) {
      indexByKey.set(key, result.length)
      result.push(place)
      continue
    }

    const existing = result[at]
    const older = existing.createdAt <= place.createdAt ? existing : place
    const newer = older === existing ? place : existing
    const olderMemo = older.memo ?? ''
    const newerMemo = newer.memo ?? ''
    result[at] = { ...older, memo: newerMemo.length > olderMemo.length ? newerMemo : olderMemo }
  }

  return result
}
