import { usePlaceStore } from '../store/usePlaceStore'

const MIN_SCALE = 0.6
const MAX_SCALE = 2

export function IconSizeControl() {
  const iconScale = usePlaceStore((s) => s.iconScale)
  const setIconScale = usePlaceStore((s) => s.setIconScale)

  return (
    <div className="icon-size-control">
      <div className="icon-size-header">
        <span>마커 크기</span>
        <span className="icon-size-value">{Math.round(iconScale * 100)}%</span>
      </div>
      <input
        type="range"
        min={MIN_SCALE}
        max={MAX_SCALE}
        step={0.05}
        value={iconScale}
        onChange={(e) => setIconScale(Number(e.target.value))}
        className="icon-size-slider"
      />
    </div>
  )
}
