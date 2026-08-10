import { useState } from 'react'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import { clearLocalData } from '../store/sync'

/**
 * Sign-in for the optional cross-device sync, living in the settings menu.
 *
 * Signing in is not a gate on the app: everything works from localStorage
 * either way. It only decides whether there's a private copy on Supabase --
 * which matters now that the site is publicly reachable, since without an
 * account the stored trips would be readable by anyone who loads the page.
 */
export function AccountControl() {
  const { session, phase, busy, error, notice, signIn, signUp, signOut } = useSupabaseAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  if (phase === 'disabled') {
    return (
      <div className="account-control">
        <span className="settings-menu-label">기기 간 동기화</span>
        <p className="account-hint">
          Supabase가 설정되지 않아 이 기기에만 저장돼요. 여러 기기에서 같은 계획을 보려면 README의 Supabase 설정을
          참고하세요.
        </p>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="account-control">
        <span className="settings-menu-label">기기 간 동기화</span>
        <p className="account-hint">확인 중…</p>
      </div>
    )
  }

  if (phase === 'signed-in' && session) {
    return (
      <div className="account-control">
        <span className="settings-menu-label">기기 간 동기화</span>
        <p className="account-email">{session.user.email}</p>
        <p className="account-hint">이 계정으로 저장되고 있어요. 다른 기기에서 같은 계정으로 로그인하면 이어집니다.</p>
        <div className="account-actions">
          <button type="button" className="account-btn" disabled={busy} onClick={() => void signOut()}>
            로그아웃
          </button>
          {/* Signing straight into another account would carry this one's
              trips along (sync merges local into whatever it connects to),
              so switching clears the local copy first. */}
          <button
            type="button"
            className="account-btn"
            disabled={busy}
            onClick={() => {
              const ok = confirm(
                '다른 계정으로 전환할까요?\n\n' +
                  `이 기기에 있는 데이터는 지워지고, 새로 로그인한 계정의 데이터를 받아옵니다. ` +
                  `지금 계정(${session.user.email})의 데이터는 그대로 남아 있어서 다시 로그인하면 돌아와요.`,
              )
              if (!ok) return
              clearLocalData()
              void signOut()
            }}
          >
            계정 전환
          </button>
        </div>
        {error && <p className="account-error">{error}</p>}
      </div>
    )
  }

  const submit = () => {
    if (!email.trim() || !password) return
    if (mode === 'signin') void signIn(email.trim(), password)
    else void signUp(email.trim(), password)
  }

  return (
    <div className="account-control">
      <span className="settings-menu-label">기기 간 동기화</span>
      <p className="account-hint">
        로그인하면 이 계정에만 저장돼요. 로그인하지 않아도 앱은 그대로 쓸 수 있고, 이 기기에만 저장됩니다.
      </p>
      <input
        type="email"
        className="account-input"
        placeholder="이메일"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        className="account-input"
        placeholder="비밀번호 (6자 이상)"
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
      />
      <div className="account-actions">
        <button type="button" className="account-btn primary" disabled={busy} onClick={submit}>
          {busy ? '처리 중…' : mode === 'signin' ? '로그인' : '가입하기'}
        </button>
        <button
          type="button"
          className="account-btn link"
          disabled={busy}
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? '계정 만들기' : '로그인으로'}
        </button>
      </div>
      {error && <p className="account-error">{error}</p>}
      {notice && <p className="account-notice">{notice}</p>}
    </div>
  )
}
