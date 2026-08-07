import { useState, type CSSProperties } from 'react'
import { MARKER_COLOR_PALETTE, MARKER_SHAPES, type MarkerShape } from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { PlacePin } from './PlacePin'

interface AddCategoryFormProps {
  onDone: () => void
}

export function AddCategoryForm({ onDone }: AddCategoryFormProps) {
  const addCategory = usePlaceStore((s) => s.addCategory)
  const [name, setName] = useState('')
  const [shape, setShape] = useState<MarkerShape>('pin')
  const [color, setColor] = useState(MARKER_COLOR_PALETTE[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    addCategory(name.trim(), { color, shape })
    onDone()
  }

  return (
    <form className="category-style-picker" onSubmit={handleSubmit}>
      <div className="category-style-row">
        <div className="category-style-preview">
          <PlacePin color={color} shape={shape} faded={false} />
        </div>
        <input
          className="add-category-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="카테고리 이름"
          autoFocus
        />
      </div>
      <div className="shape-select">
        {MARKER_SHAPES.map((s) => (
          <button
            key={s}
            type="button"
            className={s === shape ? 'shape-icon-chip active' : 'shape-icon-chip'}
            onClick={() => setShape(s)}
          >
            <PlacePin color={color} shape={s} faded={false} />
          </button>
        ))}
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
        <label className="swatch-custom" style={{ '--swatch-color': color } as CSSProperties} title="직접 선택">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
      </div>
      <div className="category-style-row category-style-row-end">
        <button type="button" onClick={onDone}>
          취소
        </button>
        <button type="submit" className="category-style-apply" disabled={!name.trim()}>
          추가
        </button>
      </div>
    </form>
  )
}
