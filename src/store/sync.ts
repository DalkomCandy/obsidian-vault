import { usePlaceStore } from './usePlaceStore'
import { supabase, isSupabaseConfigured, APP_STATE_ROW_ID } from '../lib/supabase'
import { DEFAULT_CATEGORY_LABELS, DEFAULT_CATEGORY_STYLES, type CategoryStyle } from '../types'

interface SyncableState {
  trips: ReturnType<typeof usePlaceStore.getState>['trips']
  places: ReturnType<typeof usePlaceStore.getState>['places']
  categoryOrder: ReturnType<typeof usePlaceStore.getState>['categoryOrder']
  categoryLabels: ReturnType<typeof usePlaceStore.getState>['categoryLabels']
  categoryStyles: ReturnType<typeof usePlaceStore.getState>['categoryStyles']
}

function snapshot(): SyncableState {
  const s = usePlaceStore.getState()
  return {
    trips: s.trips,
    places: s.places,
    categoryOrder: s.categoryOrder,
    categoryLabels: s.categoryLabels,
    categoryStyles: s.categoryStyles,
  }
}

let syncTimer: ReturnType<typeof setTimeout> | undefined
let applyingRemote = false

async function pushNow() {
  if (!supabase) return
  try {
    await supabase
      .from('app_state')
      .upsert({ id: APP_STATE_ROW_ID, data: snapshot(), updated_at: new Date().toISOString() })
  } catch (err) {
    console.error('[supabase] 동기화 실패 (네트워크 확인 필요). 로컬 저장은 정상입니다.', err)
  }
}

function scheduleSync() {
  if (!isSupabaseConfigured || !supabase || applyingRemote) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(pushNow, 800)
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
    if (!(category in labels)) labels[category] = DEFAULT_CATEGORY_LABELS[category] ?? category
    if (!(category in styles)) styles[category] = DEFAULT_CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLES.etc
  }
  return { categoryOrder: order, categoryLabels: labels, categoryStyles: styles }
}

/** Fetches the remote state once (call on app start) and applies it locally. */
export async function loadRemoteState(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', APP_STATE_ROW_ID)
      .maybeSingle()
    if (error || !data?.data) return

    const remote = data.data as Partial<SyncableState>
    const current = usePlaceStore.getState()
    const remoteTrips = Array.isArray(remote.trips) ? remote.trips : []
    const remotePlaces = Array.isArray(remote.places) ? remote.places : []
    const remoteOrder = Array.isArray(remote.categoryOrder) ? remote.categoryOrder : []
    const remoteLabels = remote.categoryLabels && typeof remote.categoryLabels === 'object' ? remote.categoryLabels : {}
    const remoteStyles = remote.categoryStyles && typeof remote.categoryStyles === 'object' ? remote.categoryStyles : {}

    const trips = mergeById(current.trips, remoteTrips)
    const places = mergeById(current.places, remotePlaces)
    const categoryOrder = mergeOrder(current.categoryOrder, remoteOrder)
    const categoryLabels = mergeRecord(current.categoryLabels, remoteLabels)
    const categoryStyles = mergeRecord(current.categoryStyles, remoteStyles)

    const sanitized = sanitizeCategoryMaps(categoryOrder, categoryLabels, categoryStyles, places)
    const merged = { trips, places, ...sanitized }

    const changed =
      trips.length !== remoteTrips.length ||
      places.length !== remotePlaces.length ||
      categoryOrder.length !== remoteOrder.length

    applyingRemote = true
    usePlaceStore.getState().hydrate(merged)
    applyingRemote = false

    // The merge may have pulled in local-only data the remote row didn't
    // have yet (e.g. this device connecting to Supabase for the first
    // time) -- push the converged result back up so both sides match.
    if (changed) await pushNow()
  } catch (err) {
    console.error('[supabase] 원격 데이터를 불러오지 못했어요. 이 기기의 로컬 데이터를 그대로 사용합니다.', err)
  }
}

if (isSupabaseConfigured) {
  usePlaceStore.subscribe((state, prev) => {
    if (
      state.trips !== prev.trips ||
      state.places !== prev.places ||
      state.categoryOrder !== prev.categoryOrder ||
      state.categoryLabels !== prev.categoryLabels ||
      state.categoryStyles !== prev.categoryStyles
    ) {
      scheduleSync()
    }
  })
}
