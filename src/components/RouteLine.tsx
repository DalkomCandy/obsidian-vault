import { AdvancedMarker, Polyline } from '@vis.gl/react-google-maps'
import type { TravelMode } from '../types'
import { TRAVEL_MODE_EMOJI } from '../types'

export interface ActiveRoute {
  mode: TravelMode
  path: google.maps.LatLngLiteral[]
  durationText: string
  distanceText: string
}

const MODE_COLOR: Record<TravelMode, string> = {
  WALKING: '#16a34a',
  DRIVING: '#2563eb',
  TRANSIT: '#dc2626',
}

interface RouteLineProps {
  route: ActiveRoute
  onClose: () => void
}

export function RouteLine({ route, onClose }: RouteLineProps) {
  const midpoint = route.path[Math.floor(route.path.length / 2)]

  return (
    <>
      <Polyline path={route.path} strokeColor={MODE_COLOR[route.mode]} strokeOpacity={0.85} strokeWeight={4} />
      {midpoint && (
        <AdvancedMarker position={midpoint} onClick={onClose} title="클릭하면 경로가 지워져요">
          <div className="route-duration-label" style={{ borderColor: MODE_COLOR[route.mode] }}>
            {TRAVEL_MODE_EMOJI[route.mode]} {route.durationText}
          </div>
        </AdvancedMarker>
      )}
    </>
  )
}
