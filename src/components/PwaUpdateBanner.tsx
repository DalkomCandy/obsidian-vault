import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** How often to poll for a newer build while the app stays open. An installed
 * PWA left running for a whole trip won't naturally re-check otherwise --
 * `register()` only fires once, on load. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export function PwaUpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // This component mounts once for the app's whole lifetime, so the
    // interval never needs explicit teardown.
    onRegisteredSW(_url, registration) {
      if (!registration) return
      window.setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL_MS)
    },
  })

  // Also check the instant the tab/PWA regains focus, not just on a timer --
  // that's exactly when someone reopens the app after it deployed a fix.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker?.getRegistration().then((r) => r?.update())
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  if (!needRefresh) return null

  return (
    <div className="pwa-update-banner">
      <span>새 버전이 있어요</span>
      <button type="button" onClick={() => void updateServiceWorker(true)}>
        새로고침
      </button>
    </div>
  )
}
