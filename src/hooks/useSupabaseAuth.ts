import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { authErrorMessage, isSupabaseConfigured, supabase } from '../lib/supabase'

export type AuthPhase = 'loading' | 'signed-out' | 'signed-in' | 'disabled'

/**
 * Session state for the optional cross-device sync.
 *
 * Signing in is never required to use the app -- everything works from
 * localStorage alone. Auth exists only so the copy kept on Supabase belongs
 * to one account instead of being readable by anyone who loads the page.
 */
export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [phase, setPhase] = useState<AuthPhase>(isSupabaseConfigured ? 'loading' : 'disabled')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setPhase(data.session ? 'signed-in' : 'signed-out')
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setPhase(next ? 'signed-in' : 'signed-out')
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const run = useCallback(async (fn: () => Promise<{ error: { message: string } | null }>, ok?: string) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    const { error: err } = await fn()
    if (err) setError(authErrorMessage(err.message))
    else if (ok) setNotice(ok)
    setBusy(false)
  }, [])

  const signIn = useCallback(
    (email: string, password: string) => run(() => supabase!.auth.signInWithPassword({ email, password })),
    [run],
  )

  const signUp = useCallback(
    (email: string, password: string) =>
      run(
        () => supabase!.auth.signUp({ email, password }),
        '가입 요청을 보냈어요. 확인 메일이 오면 링크를 눌러주세요. (메일이 필요 없게 설정했다면 바로 로그인됩니다)',
      ),
    [run],
  )

  const signOut = useCallback(() => run(() => supabase!.auth.signOut()), [run])

  return { session, phase, busy, error, notice, signIn, signUp, signOut }
}
