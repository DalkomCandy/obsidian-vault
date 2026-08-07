import { ICON_SCALE_OPTIONS, useIconScale } from '../hooks/useIconScale'

const LABELS: Record<number, string> = {
  0.75: '작게',
  1: '보통',
  1.3: '크게',
  1.6: '아주 크게',
}

export function IconSizeControl() {
  const { iconScale, setIconScale } = useIconScale()

  return (
    <div className="icon-size-control">
      <span>마커 크기</span>
      <div className="icon-size-options">
        {ICON_SCALE_OPTIONS.map((scale) => (
          <button
            key={scale}
            type="button"
            className={scale === iconScale ? 'icon-size-btn active' : 'icon-size-btn'}
            onClick={() => setIconScale(scale)}
          >
            {LABELS[scale]}
          </button>
        ))}
      </div>
    </div>
  )
}
