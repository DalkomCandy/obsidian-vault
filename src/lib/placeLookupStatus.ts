/**
 * Tracks the outcome of the last Google Place fetch triggered by clicking a
 * POI on the map. Every quick-add click going through this lets the
 * diagnostics panel show *why* a lookup failed (permission, quota, network)
 * instead of the popup just silently landing on an empty name.
 */
export interface PlaceLookupStatus {
  state: 'idle' | 'ok' | 'error'
  at: number | null
  message: string | null
}

let status: PlaceLookupStatus = { state: 'idle', at: null, message: null }
const listeners = new Set<() => void>()

function setStatus(next: PlaceLookupStatus) {
  status = next
  for (const listen of listeners) listen()
}

export function getPlaceLookupStatus(): PlaceLookupStatus {
  return status
}

export function subscribePlaceLookupStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function reportPlaceLookupSuccess(): void {
  setStatus({ state: 'ok', at: Date.now(), message: null })
}

export function reportPlaceLookupError(message: string): void {
  setStatus({ state: 'error', at: Date.now(), message })
}
