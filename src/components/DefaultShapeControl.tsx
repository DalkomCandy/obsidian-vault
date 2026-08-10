import { MARKER_SHAPES, MARKER_SHAPE_LABELS } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { PlacePin } from './PlacePin'

/**
 * Picks the shape a brand-new category starts with. Doesn't touch categories
 * that already exist -- those keep whatever shape/color/icon was set for
 * them via the per-category 🎨 picker.
 */
export function DefaultShapeControl() {
  const defaultMarkerShape = usePlaceStore((s) => s.defaultMarkerShape)
  const setDefaultMarkerShape = usePlaceStore((s) => s.setDefaultMarkerShape)

  return (
    <div className="default-shape-control">
      <span className="settings-menu-label">새 카테고리 기본 핀 모양</span>
      <div className="shape-select">
        {MARKER_SHAPES.map((shape) => (
          <button
            key={shape}
            type="button"
            className={shape === defaultMarkerShape ? 'shape-icon-chip active' : 'shape-icon-chip'}
            title={MARKER_SHAPE_LABELS[shape]}
            onClick={() => setDefaultMarkerShape(shape)}
          >
            <PlacePin color="#2563eb" shape={shape} faded={false} />
          </button>
        ))}
      </div>
    </div>
  )
}
