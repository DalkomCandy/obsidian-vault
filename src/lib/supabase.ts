import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// .env values often carry stray quotes/whitespace when pasted on mobile, and
// createClient() throws synchronously on a malformed URL -- which, since this
// module is imported at the top of the app's import graph, would otherwise
// take the whole page down to a blank screen before React ever mounts. Trim
// the inputs and never let a bad value escape this module.
const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/^['"]|['"]$/g, '')
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim().replace(/^['"]|['"]$/g, '')

let client: SupabaseClient | null = null
let initError: string | null = null

if (url && anonKey) {
  try {
    client = createClient(url, anonKey)
  } catch (err) {
    initError = err instanceof Error ? err.message : String(err)
    console.error('[supabase] 초기화 실패 — VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY 값을 확인해주세요.', err)
  }
}

export const supabase = client
export const isSupabaseConfigured = client !== null
export const supabaseInitError = initError

// The whole app's data is stored as one JSON blob in one row, keyed by this
// id. Simple to sync, plenty for a single-user personal travel planner.
export const APP_STATE_ROW_ID = 'default'
