import { useState, type CSSProperties } from 'react'
import type { Category } from '../types'
import { CATEGORY_RELEVANT_SHAPES, MARKER_COLOR_PALETTE, MARKER_SHAPE_LABELS } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { PlacePin } from './PlacePin'

interface CategoryStylePickerProps {
  category: Category
}

export function CategoryStylePicker({ category }: CategoryStylePickerProps) {
  const categoryStyles = usePlaceStore((s) => s.categoryStyles)
  const setCategoryStyle = usePlaceStore((s) => s.setCategoryStyle)
  const current = categoryStyles[category]
  const [shape, setShape] = useState(current.shape)
  const [color, setColor] = useState(current.color)

  const shapes = CATEGORY_RELEVANT_SHAPES[category]
  const dirty = shape !== current.shape || color !== current.color

  return (
    <div className="category-style-picker">
      <div className="category-style-row">
        <div className="category-style-preview">
          <PlacePin color={color} shape={shape} faded={false} />
        </div>
        <div className="shape-select">
          {shapes.map((s) => (
            <button
              key={s}
              type="button"
              className={s === shape ? 'shape-icon-chip active' : 'shape-icon-chip'}
              title={MARKER_SHAPE_LABELS[s]}
              onClick={() => setShape(s)}
            >
              <PlacePin color={color} shape={s} faded={false} />
            </button>
          ))}
        </div>
      </div>
      <div className="color-swatches">
        {MARKER_COLOR_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            className={c === color ? 'swatch active' : 'swatch'}
            style={{ '--swatch-color': c } as CSSProperties}
            onClick={() => setColor(c)}
            title={c}
          />
        ))}
      </div>
      <button
        type="button"
        className="primary category-style-apply"
        disabled={!dirty}
        onClick={() => setCategoryStyle(category, { shape, color })}
      >
        이 카테고리 전체에 적용
      </button>
    </div>
  )
}
