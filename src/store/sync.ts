import { usePlaceStore } from './usePlaceStore'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { CategoryStyle } from '../types'
import { FALLBACK_CATEGORY_LABEL, FALLBACK_CATEGORY_STYLE } from '../types'
import { dedupePlaces } from '../lib/dedupePlaces'

interface SyncableState {
  trips: ReturnType<typeof usePlaceStore.getState>['trips']
  places: ReturnType<typeof usePlaceStore.getState>['places']
  routes: ReturnType<typeof usePlaceStore.getState>['routes']
  categoryOrder: ReturnType<typeof usePlaceStore.getState>['categoryOrder']
  categoryLabels: ReturnType<typeof usePlaceStore.getState>['categoryLabels']
  categoryStyles: ReturnType<typeof usePlaceStore.getState>['categoryStyles']
}

function snapshot(): SyncableState {
  const s = usePlaceStore.getState()
  return {
    trips: s.trips,
    places: s.places,
    routes: s.routes,
    categoryOrder: s.categoryOrder,
    categoryLabels: s.categoryLabels,
    categoryStyles: s.categoryStyles,
  }
}

let syncTimer: ReturnType<typeof setTimeout> | undefined
let applyingRemote = false

/**
 * The signed-in user's id, which is also the primary key of their row.
 * Null means "not signed in" -- the app then runs purely on localStorage and
 * never touches the network, which is a supported way to use it, not an error.
 */
let currentUserId: string | null = null

export interface SyncStatus {
  state: 'idle' | 'ok' | 'error'
  /** When the last successful push or pull completed. */
  at: number | null
  message: string | null
}

let status: SyncStatus = { state: 'idle', at: null, message: null }
const statusListeners = new Set<() => void>()

function setStatus(next: SyncStatus) {
  status = next
  for (const listen of statusListeners) listen()
}

export function getSyncStatus(): SyncStatus {
  return status
}

export function subscribeSyncStatus(listener: () => void): () => void {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}

async function pushNow() {
  if (!supabase || !currentUserId) return
  try {
    const { error } = await supabase
      .from('app_state')
      .upsert({ user_id: currentUserId, data: snapshot(), updated_at: new Date().toISOString() })
    if (error) throw error
    setStatus({ state: 'ok', at: Date.now(), message: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    setStatus({ state: 'error', at: Date.now(), message })
    console.error('[supabase] 동기화 실패 (네트워크 확인 필요). 로컬 저장은 정상입니다.', err)
  }
}

function scheduleSync() {
  if (!isSupabaseConfigured || !supabase || !currentUserId || applyingRemote) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(pushNow, 800)
}

const LAST_USER_KEY = 'travel-map.lastSyncedUserId'

/** Which account this device's local data last belonged to, if any. */
function lastSyncedUserId(): string | null {
  try {
    return localStorage.getItem(LAST_USER_KEY)
  } catch {
    return null
  }
}

function rememberSyncedUser(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(LAST_USER_KEY, userId)
    else localStorage.removeItem(LAST_USER_KEY)
  } catch {
    // A blocked localStorage only costs us the account-switch guard below.
  }
}

/**
 * Point sync at a signed-in user (or at nobody on sign-out).
 *
 * On sign-out the local data is deliberately left in place: it's this
 * device's own copy, and wiping the screen because a session expired would
 * look like data loss mid-trip.
 */
export function setSyncUser(userId: string | null): void {
  if (currentUserId === userId) return
  clearTimeout(syncTimer)
  currentUserId = userId
  if (userId) void loadRemoteState()
}

/**
 * Wipes this device's copy so the next sign-in starts from that account's
 * data alone. Used when deliberately switching accounts -- see the guard in
 * loadRemoteStateOnce for why leaving it in place would leak data across.
 */
export function clearLocalData(): void {
  rememberSyncedUser(null)
  usePlaceStore.getState().hydrate({
    trips: [],
    places: [],
    routes: [],
    categoryOrder: [],
    categoryLabels: {},
    categoryStyles: {},
  })
}

/**
 * Union-merge by id so a device connecting to Supabase for the first time
 * (whose remote row is empty or from a different device) can never wipe out
 * this device's local data. On an id collision the local copy wins, since
 * it's presumed to be what the person is actively looking at right now.
 */
function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>()
  for (const item of remote) byId.set(item.id, item)
  for (const item of local) byId.set(item.id, item)
  return [...byId.values()]
}

function mergeOrder(local: string[], remote: string[]): string[] {
  return [...new Set([...local, ...remote])]
}

function mergeRecord<T>(local: Record<string, T>, remote: Record<string, T>): Record<string, T> {
  return { ...remote, ...local }
}

/**
 * Fills in any category referenced by places/categoryOrder but missing a
 * label or style (e.g. remote data saved before a category existed, or a
 * partially-written row). Without this, a marker whose category has no
 * matching style crashes the render entirely.
 */
function sanitizeCategoryMaps(
  categoryOrder: string[],
  categoryLabels: Record<string, string>,
  categoryStyles: Record<string, CategoryStyle>,
  places: { category: string }[],
) {
  const known = new Set([...categoryOrder, ...Object.keys(categoryLabels), ...Object.keys(categoryStyles)])
  for (const p of places) known.add(p.category)

  const labels = { ...categoryLabels }
  const styles = { ...categoryStyles }
  const order = [...categoryOrder]
  for (const category of known) {
    if (!order.includes(category)) order.push(category)
    if (!(category in labels)) labels[category] = FALLBACK_CATEGORY_LABEL
    if (!(category in styles)) styles[category] = FALLBACK_CATEGORY_STYLE
  }
  return { categoryOrder: order, categoryLabels: labels, categoryStyles: styles }
}

let inFlightLoad: Promise<void> | null = null

/**
 * Fetches the remote state once (call on app start) and applies it locally.
 * React StrictMode double-invokes mount effects in dev, which would
 * otherwise run this twice concurrently -- if a local edit lands between
 * the two runs' merge computations, the second hydrate() would overwrite
 * the store with a snapshot that predates that edit. Collapsing concurrent
 * calls into a single in-flight promise removes that race entirely.
 */
export function loadRemoteState(): Promise<void> {
  if (inFlightLoad) return inFlightLoad
  inFlightLoad = loadRemoteStateOnce().finally(() => {
    inFlightLoad = null
  })
  return inFlightLoad
}

async function loadRemoteStateOnce(): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !currentUserId) return
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('user_id', currentUserId)
      .maybeSingle()
    if (error) {
      setStatus({ state: 'error', at: Date.now(), message: error.message })
      console.error('[supabase] 원격 데이터를 불러오지 못했어요.', error)
      return
    }
    // Signing into a *different* account than the local data belongs to.
    // The union-merge below assumes both sides are the same person's, so
    // running it here would push the previous account's trips into this one.
    // Take the new account's data as-is instead (and if it has none, start
    // this account empty rather than donating the other one's).
    const previousUserId = lastSyncedUserId()
    const switchedAccounts = previousUserId !== null && previousUserId !== currentUserId
    if (switchedAccounts) {
      const remote = (data?.data ?? null) as Partial<SyncableState> | null
      applyingRemote = true
      usePlaceStore.getState().hydrate({
        trips: remote?.trips ?? [],
        places: remote?.places ?? [],
        routes: remote?.routes ?? [],
        ...sanitizeCategoryMaps(
          remote?.categoryOrder ?? [],
          remote?.categoryLabels ?? {},
          remote?.categoryStyles ?? {},
          remote?.places ?? [],
        ),
      })
      applyingRemote = false
      rememberSyncedUser(currentUserId)
      setStatus({ state: 'ok', at: Date.now(), message: null })
      return
    }

    // No row yet -- first sign-in on a fresh account. Push this device's
    // local data up so the account starts out holding it.
    if (!data?.data) {
      rememberSyncedUser(currentUserId)
      await pushNow()
      return
    }

    const remote = data.data as Partial<SyncableState>
    const current = usePlaceStore.getState()
    const remoteTrips = Array.isArray(remote.trips) ? remote.trips : []
    const remotePlaces = Array.isArray(remote.places) ? remote.places : []
    const remoteRoutes = Array.isArray(remote.routes) ? remote.routes : []
    const remoteOrder = Array.isArray(remote.categoryOrder) ? remote.categoryOrder : []
    const remoteLabels = remote.categoryLabels && typeof remote.categoryLabels === 'object' ? remote.categoryLabels : {}
    const remoteStyles = remote.categoryStyles && typeof remote.categoryStyles === 'object' ? remote.categoryStyles : {}

    const trips = mergeById(current.trips, remoteTrips)
    // Two devices that each saved the same place before syncing produce two
    // rows with different ids, which the id-union can't collapse on its own.
    const places = dedupePlaces(mergeById(current.places, remotePlaces))
    const categoryOrder = mergeOrder(current.categoryOrder, remoteOrder)
    const categoryLabels = mergeRecord(current.categoryLabels, remoteLabels)
    const categoryStyles = mergeRecord(current.categoryStyles, remoteStyles)

    // A route whose endpoints didn't survive the merge would draw a line to
    // nowhere, so drop those rather than carrying them forward.
    const placeIds = new Set(places.map((p) => p.id))
    const routes = mergeById(current.routes, remoteRoutes).filter(
      (r) => placeIds.has(r.originId) && placeIds.has(r.destinationId),
    )

    const sanitized = sanitizeCategoryMaps(categoryOrder, categoryLabels, categoryStyles, places)
    const merged = { trips, places, routes, ...sanitized }

    const changed =
      trips.length !== remoteTrips.length ||
      places.length !== remotePlaces.length ||
      routes.length !== remoteRoutes.length ||
      categoryOrder.length !== remoteOrder.length

    applyingRemote = true
    usePlaceStore.getState().hydrate(merged)
    applyingRemote = false
    rememberSyncedUser(currentUserId)

    // The merge may have pulled in local-only data the remote row didn't
    // have yet (e.g. this device connecting to Supabase for the first
    // time) -- push the converged result back up so both sides match.
    if (changed) await pushNow()
    else setStatus({ state: 'ok', at: Date.now(), message: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    setStatus({ state: 'error', at: Date.now(), message })
    console.error('[supabase] 원격 데이터를 불러오지 못했어요. 이 기기의 로컬 데이터를 그대로 사용합니다.', err)
  }
}

if (isSupabaseConfigured) {
  usePlaceStore.subscribe((state, prev) => {
    if (!currentUserId) return
    if (
      state.trips !== prev.trips ||
      state.places !== prev.places ||
      state.routes !== prev.routes ||
      state.categoryOrder !== prev.categoryOrder ||
      state.categoryLabels !== prev.categoryLabels ||
      state.categoryStyles !== prev.categoryStyles
    ) {
      scheduleSync()
    }
  })
}
