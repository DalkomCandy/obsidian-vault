import { useCallback, useEffect, useRef, useState } from 'react'

export interface CurrentLocation {
  lat: number
  lng: number
  /** Reported horizontal accuracy in metres, drawn as a halo on the map. */
  accuracy: number
}

export type LocationStatus = 'idle' | 'locating' | 'tracking' | 'denied' | 'unavailable'

function messageFor(err: GeolocationPositionError): { status: LocationStatus; message: string } {
  if (err.code === err.PERMISSION_DENIED) {
    return { status: 'denied', message: '위치 권한이 거부됐어요. 브라우저 주소창의 자물쇠 아이콘에서 위치를 허용해주세요.' }
  }
  if (err.code === err.POSITION_UNAVAILABLE) {
    return { status: 'unavailable', message: '현재 위치를 찾지 못했어요. 실내라면 창가나 실외에서 다시 시도해보세요.' }
  }
  return { status: 'unavailable', message: '위치 확인이 시간 내에 끝나지 않았어요. 다시 시도해주세요.' }
}

/**
 * Tracks the device's position while enabled. Kept opt-in rather than started
 * on load: a planning session at a desk has no use for it, and an unprompted
 * permission dialog on first open is hostile.
 */
export function useCurrentLocation() {
  const [location, setLocation] = useState<CurrentLocation | null>(null)
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const watchId = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    setStatus('idle')
  }, [])

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable')
      setError('이 브라우저는 위치 기능을 지원하지 않아요.')
      return
    }
    if (watchId.current !== null) return
    setStatus('locating')
    setError(null)
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setStatus('tracking')
        setError(null)
      },
      (err) => {
        const { status: nextStatus, message } = messageFor(err)
        setStatus(nextStatus)
        setError(message)
        // A denied permission will never resolve by retrying, so stop the
        // watch instead of letting it fire the same error forever.
        if (watchId.current !== null) {
          navigator.geolocation.clearWatch(watchId.current)
          watchId.current = null
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )
  }, [])

  const toggle = useCallback(() => {
    if (watchId.current !== null) stop()
    else start()
  }, [start, stop])

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [])

  return { location, status, error, start, stop, toggle, active: status === 'locating' || status === 'tracking' }
}
