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

/**
 * Turns Supabase's English auth errors into something readable, since these
 * are shown directly to the person trying to sign in.
 */
export function authErrorMessage(raw: string): string {
  const text = raw.toLowerCase()
  if (text.includes('invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요.'
  if (text.includes('email not confirmed')) {
    return '이메일 인증이 아직 안 됐어요. 받은 메일의 링크를 눌러주세요. (메일이 안 오면 Supabase 설정에서 이메일 확인을 꺼도 됩니다)'
  }
  if (text.includes('user already registered')) return '이미 가입된 이메일이에요. 로그인해주세요.'
  if (text.includes('password should be at least')) return '비밀번호는 6자 이상이어야 해요.'
  if (text.includes('unable to validate email')) return '이메일 형식을 확인해주세요.'
  if (text.includes('rate limit') || text.includes('too many')) {
    return '시도가 너무 잦아요. 잠시 후 다시 해주세요.'
  }
  if (text.includes('failed to fetch')) return 'Supabase에 연결하지 못했어요. 네트워크와 주소 설정을 확인해주세요.'
  return raw
}
