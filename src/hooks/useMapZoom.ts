import { useEffect, useState } from 'react'
import { useMap } from '@vis.gl/react-google-maps'

/** Tracks the map's current zoom level, for chrome that should thin out at low zoom (see RouteLine). */
export function useMapZoom(): number | undefined {
  const map = useMap()
  const [zoom, setZoom] = useState<number | undefined>(() => map?.getZoom())

  useEffect(() => {
    if (!map) return
    setZoom(map.getZoom())
    const listener = map.addListener('zoom_changed', () => setZoom(map.getZoom()))
    return () => listener.remove()
  }, [map])

  return zoom
}
