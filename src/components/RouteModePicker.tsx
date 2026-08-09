import { useEffect, useState } from 'react'
import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef, useMapsLibrary } from '@vis.gl/react-google-maps'
import { PopupClose } from './PopupClose'
import type { Place, TravelMode } from '../types'
import { TRAVEL_MODE_EMOJI, TRAVEL_MODE_LABELS, googleMapsDirectionsUrl } from '../types'

export interface RouteOption {
  path: google.maps.LatLngLiteral[]
  durationText: string
  distanceText: string
}

const MODES: TravelMode[] = ['WALKING', 'DRIVING', 'TRANSIT']

interface RouteModePickerProps {
  origin: Place
  destination: Place
  onSelect: (mode: TravelMode, option: RouteOption) => void
  onCancel: () => void
}

type RouteFailure = 'unavailable' | 'denied'

export function RouteModePicker({ origin, destination, onSelect, onCancel }: RouteModePickerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef()
  const routesLib = useMapsLibrary('routes')
  const [options, setOptions] = useState<Partial<Record<TravelMode, RouteOption | RouteFailure>>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!routesLib) return
    let cancelled = false
    setLoading(true)

    const service = new routesLib.DirectionsService()
    Promise.all(
      MODES.map(async (mode) => {
        try {
          const result = await service.route({
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: destination.lat, lng: destination.lng },
            travelMode: mode,
          })
          const route = result.routes[0]
          const leg = route?.legs[0]
          if (!route || !leg) return [mode, 'unavailable'] as const
          return [
            mode,
            {
              path: route.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() })),
              durationText: leg.duration?.text ?? '',
              distanceText: leg.distance?.text ?? '',
            },
          ] as const
        } catch (err) {
          // Surfaced in devtools so a config problem (e.g. Directions API not
          // enabled on the key) is distinguishable from "genuinely no route".
          console.error(`[경로] ${mode} 요청 실패`, err)
          const message = err instanceof Error ? err.message : String(err)
          const failure: RouteFailure = message.includes('REQUEST_DENIED') ? 'denied' : 'unavailable'
          return [mode, failure] as const
        }
      }),
    ).then((results) => {
      if (cancelled) return
      const next: Partial<Record<TravelMode, RouteOption | RouteFailure>> = {}
      for (const [mode, value] of results) next[mode] = value
      setOptions(next)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [routesLib, origin.lat, origin.lng, destination.lat, destination.lng])

  return (
    <>
      <AdvancedMarker ref={markerRef} position={{ lat: destination.lat, lng: destination.lng }} />
      {marker && (
        <InfoWindow anchor={marker} headerDisabled onCloseClick={onCancel}>
          <div className="route-picker">
            <PopupClose onClick={onCancel} />
            <div className="route-picker-title">
              {origin.name} → {destination.name}
            </div>
            {loading && <div className="route-picker-loading">경로 확인 중…</div>}
            {!loading && (
              <div className="route-picker-options">
                {MODES.map((mode) => {
                  const option = options[mode]
                  const failed = !option || option === 'unavailable' || option === 'denied'

                  // Google's own app covers legs the Directions API won't
                  // answer for (transit in Japan, most notably), so a dead
                  // row becomes a hand-off instead of a dead end.
                  if (failed) {
                    return (
                      <a
                        key={mode}
                        className="route-picker-option route-picker-option-link"
                        href={googleMapsDirectionsUrl(origin, destination, mode)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="route-picker-emoji">{TRAVEL_MODE_EMOJI[mode]}</span>
                        <span className="route-picker-label">{TRAVEL_MODE_LABELS[mode]}</span>
                        <span className="route-picker-duration">
                          {option === 'denied' ? 'API 설정 필요' : 'Google 지도 ↗'}
                        </span>
                      </a>
                    )
                  }

                  return (
                    <button
                      key={mode}
                      type="button"
                      className="route-picker-option"
                      onClick={() => onSelect(mode, option)}
                    >
                      <span className="route-picker-emoji">{TRAVEL_MODE_EMOJI[mode]}</span>
                      <span className="route-picker-label">{TRAVEL_MODE_LABELS[mode]}</span>
                      <span className="route-picker-duration">{option.durationText}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  )
}
