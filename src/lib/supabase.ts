import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null

// The whole app's data is stored as one JSON blob in one row, keyed by this
// id. Simple to sync, plenty for a single-user personal travel planner.
export const APP_STATE_ROW_ID = 'default'
