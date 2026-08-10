import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import type { Place } from '../types'

export interface MapPadding {
  /** Extra obstruction beyond the map div's own edge, in screen px. 0 on desktop. */
  top: number
  bottom: number
}

interface MapControllerProps {
  focusPlace: Place | null
  fitPlaces: Place[] | null
  /**
   * Identifies *which view* is being shown (region/trip/day), not what's in
   * it. Framing happens when this changes and at no other time -- see the
   * effect below.
   */
  fitContextKey: string
  mapPadding: MapPadding
}

// Breathing room kept around fitted bounds even with no floating chrome in the way.
const BASE_PADDING = 64

export function MapController({ focusPlace, fitPlaces, fitContextKey, mapPadding }: MapControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (!map || !focusPlace) return
    map.panTo({ lat: focusPlace.lat, lng: focusPlace.lng })
    map.setZoom(15)
    recentreForPadding(map, mapPadding)
  }, [map, focusPlace, mapPadding])

  // Read inside the fit effect without being a dependency of it: the camera
  // should follow "which trip/day am I looking at", never "what's currently
  // in it". Depending on the array (or on its contents) meant every add and
  // delete re-framed the map out from under whatever you'd panned to.
  const latest = useRef({ fitPlaces, mapPadding })
  latest.current = { fitPlaces, mapPadding }

  useEffect(() => {
    const { fitPlaces: places, mapPadding: padding } = latest.current
    if (!map || !places || places.length === 0) return
    if (places.length === 1) {
      map.panTo({ lat: places[0].lat, lng: places[0].lng })
      map.setZoom(14)
      recentreForPadding(map, padding)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    places.forEach((place) => bounds.extend({ lat: place.lat, lng: place.lng }))
    // fitBounds accepts per-side padding directly, so the floating top bars
    // and bottom sheet on mobile can be excluded from the "fit into" area
    // in one call instead of fitting to the full (partly obstructed) div.
    map.fitBounds(bounds, {
      top: BASE_PADDING + padding.top,
      bottom: BASE_PADDING + padding.bottom,
      left: BASE_PADDING,
      right: BASE_PADDING,
    })
  }, [map, fitContextKey])

  return null
}

/**
 * panTo/setZoom always centre on the map div's full height, which on mobile
 * is wrong: a chunk of that div is hidden under the floating top bars and/or
 * the bottom sheet, so a naively-centred point can land right behind them.
 * Nudges the map by the pixel difference so the point centres in the area
 * that's actually visible instead.
 */
export function recentreForPadding(map: Pick<google.maps.Map, 'panBy'>, padding: MapPadding) {
  const offset = (padding.bottom - padding.top) / 2
  if (offset !== 0) map.panBy(0, offset)
}
