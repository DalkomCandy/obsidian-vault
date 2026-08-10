import type { LocationStatus } from '../hooks/useCurrentLocation'

interface LocationControlProps {
  active: boolean
  status: LocationStatus
  onToggle: () => void
}

/** Was a floating 📍 button over the map -- now tucked into Settings instead. */
export function LocationControl({ active, status, onToggle }: LocationControlProps) {
  return (
    <div className="location-control">
      <span className="settings-menu-label">위치 허용</span>
      <button type="button" className="account-btn" onClick={onToggle}>
        {status === 'locating' ? <span className="btn-spinner" /> : '📍'}
        {active ? '위치 추적 끄기' : '현재 위치 표시'}
      </button>
    </div>
  )
}
