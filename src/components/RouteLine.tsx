import { AdvancedMarker, Polyline } from '@vis.gl/react-google-maps'
import type { SavedRoute } from '../types'
import { TRAVEL_MODE_COLOR, TRAVEL_MODE_EMOJI } from '../types'

interface RouteLineProps {
  route: SavedRoute
  onDelete: () => void
}

export function RouteLine({ route, onDelete }: RouteLineProps) {
  const midpoint = route.path[Math.floor(route.path.length / 2)]
  const color = TRAVEL_MODE_COLOR[route.mode]

  return (
    <>
      <Polyline path={route.path} strokeColor={color} strokeOpacity={0.85} strokeWeight={4} />
      {midpoint && (
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
