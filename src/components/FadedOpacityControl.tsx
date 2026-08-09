import { usePlaceStore } from '../store/usePlaceStore'

const MIN_OPACITY = 0.1
const MAX_OPACITY = 1

export function FadedOpacityControl() {
  const fadedOpacity = usePlaceStore((s) => s.fadedOpacity)
  const setFadedOpacity = usePlaceStore((s) => s.setFadedOpacity)

  return (
    <div className="icon-size-control">
      <div className="icon-size-header">
        <span>이전 여행지 투명도</span>
        <span className="icon-size-value">{Math.round(fadedOpacity * 100)}%</span>
      </div>
      <input
        type="range"
        min={MIN_OPACITY}
        max={MAX_OPACITY}
        step={0.02}
        value={fadedOpacity}
        onChange={(e) => setFadedOpacity(Number(e.target.value))}
        className="icon-size-slider"
      />
    </div>
  )
}
