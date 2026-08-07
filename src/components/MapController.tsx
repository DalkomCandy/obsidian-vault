import { useEffect } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import type { Place } from '../types'

interface MapControllerProps {
  focusPlace: Place | null
  fitPlaces: Place[] | null
}

export function MapController({ focusPlace, fitPlaces }: MapControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (!map || !focusPlace) return
    map.panTo({ lat: focusPlace.lat, lng: focusPlace.lng })
    map.setZoom(15)
  }, [map, focusPlace])

  useEffect(() => {
    if (!map || !fitPlaces || fitPlaces.length === 0) return
    if (fitPlaces.length === 1) {
      map.panTo({ lat: fitPlaces[0].lat, lng: fitPlaces[0].lng })
      map.setZoom(14)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    fitPlaces.forEach((place) => bounds.extend({ lat: place.lat, lng: place.lng }))
    map.fitBounds(bounds, 64)
  }, [map, fitPlaces])

  return null
}
