import { useEffect } from 'react'
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import type { CurrentLocation } from '../hooks/useCurrentLocation'

interface CurrentLocationMarkerProps {
  location: CurrentLocation
  /** Pan to the position once, when tracking first gets a fix. */
  centerOnFirstFix: boolean
  onCentered: () => void
}

export function CurrentLocationMarker({ location, centerOnFirstFix, onCentered }: CurrentLocationMarkerProps) {
  const map = useMap()

  useEffect(() => {
    if (!map || !centerOnFirstFix) return
    map.panTo({ lat: location.lat, lng: location.lng })
    onCentered()
  }, [map, centerOnFirstFix, location.lat, location.lng, onCentered])

  return (
    <AdvancedMarker
      position={{ lat: location.lat, lng: location.lng }}
      title={`현재 위치 (오차 약 ${Math.round(location.accuracy)}m)`}
      zIndex={9999}
    >
      <div className="current-location-dot" />
    </AdvancedMarker>
  )
}
