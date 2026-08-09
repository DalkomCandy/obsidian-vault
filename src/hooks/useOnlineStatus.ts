import { useEffect, useState } from 'react'

/**
 * Whether the browser currently has a network connection. Roaming abroad
 * drops in and out constantly, and without this the map simply stops drawing
 * tiles with no explanation -- which reads as a broken app rather than a
 * missing signal.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
