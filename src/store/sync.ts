import { usePlaceStore } from './usePlaceStore'
import { supabase, isSupabaseConfigured, APP_STATE_ROW_ID } from '../lib/supabase'

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
    await supabase
      .from('app_state')
      .upsert({ id: APP_STATE_ROW_ID, data: snapshot(), updated_at: new Date().toISOString() })
  }, 800)
}

/** Fetches the remote state once (call on app start) and applies it locally. */
export async function loadRemoteState(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('id', APP_STATE_ROW_ID)
    .maybeSingle()
  if (error || !data?.data) return

  const remote = data.data as Partial<SyncableState>
  applyingRemote = true
  usePlaceStore.setState({
    trips: remote.trips ?? usePlaceStore.getState().trips,
    places: remote.places ?? usePlaceStore.getState().places,
    categoryOrder: remote.categoryOrder ?? usePlaceStore.getState().categoryOrder,
    categoryLabels: remote.categoryLabels ?? usePlaceStore.getState().categoryLabels,
    categoryStyles: remote.categoryStyles ?? usePlaceStore.getState().categoryStyles,
  })
  applyingRemote = false
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
