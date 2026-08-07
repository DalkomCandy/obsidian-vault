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

function scheduleSync() {
  if (!isSupabaseConfigured || !supabase || applyingRemote) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    if (!supabase) return
    try {
      await supabase
        .from('app_state')
        .upsert({ id: APP_STATE_ROW_ID, data: snapshot(), updated_at: new Date().toISOString() })
    } catch (err) {
      console.error('[supabase] 동기화 실패 (네트워크 확인 필요). 로컬 저장은 정상입니다.', err)
    }
  }, 800)
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
    const trips = Array.isArray(remote.trips) ? remote.trips : current.trips
    const places = Array.isArray(remote.places) ? remote.places : current.places
    const categoryOrder = Array.isArray(remote.categoryOrder) ? remote.categoryOrder : current.categoryOrder
    const categoryLabels =
      remote.categoryLabels && typeof remote.categoryLabels === 'object' ? remote.categoryLabels : current.categoryLabels
    const categoryStyles =
      remote.categoryStyles && typeof remote.categoryStyles === 'object' ? remote.categoryStyles : current.categoryStyles

    const sanitized = sanitizeCategoryMaps(categoryOrder, categoryLabels, categoryStyles, places)

    applyingRemote = true
    usePlaceStore.setState({ trips, places, ...sanitized })
    applyingRemote = false
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
