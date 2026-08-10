import { usePlaceStore } from '../store/usePlaceStore'

/** Toggles the place-name captions drawn under each marker. */
export function PlaceLabelControl() {
  const showPlaceLabels = usePlaceStore((s) => s.showPlaceLabels)
  const setShowPlaceLabels = usePlaceStore((s) => s.setShowPlaceLabels)

  return (
    <label className="toggle-row">
      <span className="settings-menu-label">지도에 장소 이름 표시</span>
      <input
        type="checkbox"
        checked={showPlaceLabels}
        onChange={(e) => setShowPlaceLabels(e.target.checked)}
      />
    </label>
  )
}
