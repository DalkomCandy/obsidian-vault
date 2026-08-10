import { AdvancedMarker, Polyline } from '@vis.gl/react-google-maps'
import type { SavedRoute } from '../types'
import { TRAVEL_MODE_COLOR, TRAVEL_MODE_EMOJI } from '../types'

interface RouteLineProps {
  route: SavedRoute
  /** Below this, the duration-label pill covers too much of a zoomed-out
   * map relative to what it's labelling -- only the line stays. */
  zoom: number | undefined
  onDelete: () => void
}

const MIN_ZOOM_FOR_LABEL = 15

/**
 * Halfway along the drawn line. Indexing `path[length / 2]` lands on the
 * *destination* for a two-point path -- which is exactly what a manually
 * entered leg has -- so even-length paths average their two middle points
 * instead of rounding to one of them.
 */
function midpointOf(path: SavedRoute['path']): SavedRoute['path'][number] | undefined {
  if (path.length === 0) return undefined
  const mid = (path.length - 1) / 2
  const a = path[Math.floor(mid)]
  const b = path[Math.ceil(mid)]
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }
}

export function RouteLine({ route, zoom, onDelete }: RouteLineProps) {
  const midpoint = midpointOf(route.path)
  const color = TRAVEL_MODE_COLOR[route.mode]
  const showLabel = zoom === undefined || zoom >= MIN_ZOOM_FOR_LABEL

  return (
    <>
      <Polyline path={route.path} strokeColor={color} strokeOpacity={0.85} strokeWeight={4} />
      {midpoint && showLabel && (
        <AdvancedMarker position={midpoint} onClick={onDelete} title="클릭하면 저장된 경로가 삭제돼요">
          <div className="route-duration-label" style={{ borderColor: color }}>
            {TRAVEL_MODE_EMOJI[route.mode]} {route.durationText}
            <span className="route-duration-remove">×</span>
          </div>
        </AdvancedMarker>
      )}
    </>
  )
}
