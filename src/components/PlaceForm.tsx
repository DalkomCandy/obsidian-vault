import { useState, type CSSProperties } from 'react'
import type { Category, MarkerShape, Place } from '../types'
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  MARKER_COLOR_PALETTE,
  MARKER_SHAPES,
  MARKER_SHAPE_LABELS,
  formatTripLabel,
} from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { PlacePin } from './PlacePin'

export interface PlaceDraft {
  id: string
  name: string
  lat: number
  lng: number
  category: Category
  memo: string
  visited: boolean
  iconColor: string | null
  iconShape: MarkerShape
}

interface PlaceFormProps {
  draft: PlaceDraft
  onSave: (draft: PlaceDraft) => void
  onCancel: () => void
}

export function PlaceForm({ draft, onSave, onCancel }: PlaceFormProps) {
  const [name, setName] = useState(draft.name)
  const [category, setCategory] = useState<Category>(draft.category)
  const [memo, setMemo] = useState(draft.memo)
  const [visited, setVisited] = useState(draft.visited)
  const [iconColor, setIconColor] = useState<string | null>(draft.iconColor)
  const [iconShape, setIconShape] = useState<MarkerShape>(draft.iconShape)

  const place = usePlaceStore((s) => s.places.find((p) => p.id === draft.id))
  const trip = usePlaceStore((s) => s.trips.find((t) => t.id === place?.tripId))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ ...draft, name: name.trim(), category, memo: memo.trim(), visited, iconColor, iconShape })
  }

  const previewColor = iconColor ?? CATEGORY_COLORS[category]

  return (
    <div className="form-overlay" onClick={onCancel}>
      <form className="place-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>여행지 수정</h3>
        {trip && (
          <p className="form-trip-label">
            {trip.region} · {formatTripLabel(trip.date)}
          </p>
        )}

        <label>
          이름
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label>
          카테고리
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="icon-picker">
          <div className="icon-preview">
            <PlacePin color={previewColor} shape={iconShape} faded={false} />
          </div>
          <div className="icon-picker-controls">
            <div className="color-swatches">
              {MARKER_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={color === previewColor ? 'swatch active' : 'swatch'}
                  style={{ '--swatch-color': color } as CSSProperties}
                  onClick={() => setIconColor(color)}
                  title={color}
                />
              ))}
              <button
                type="button"
                className={iconColor === null ? 'swatch swatch-reset active' : 'swatch swatch-reset'}
                onClick={() => setIconColor(null)}
                title="카테고리 기본색"
              >
                ↺
              </button>
            </div>
            <div className="shape-select">
              {MARKER_SHAPES.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  className={shape === iconShape ? 'shape-chip active' : 'shape-chip'}
                  onClick={() => setIconShape(shape)}
                >
                  {MARKER_SHAPE_LABELS[shape]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label>
          메모
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} placeholder="메모 (선택)" />
        </label>

        <label className="checkbox-label">
          <input type="checkbox" checked={visited} onChange={(e) => setVisited(e.target.checked)} />
          이미 방문한 곳이에요
        </label>

        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            취소
          </button>
          <button type="submit" className="primary">
            저장
          </button>
        </div>
      </form>
    </div>
  )
}

export function draftFromPlace(place: Place): PlaceDraft {
  return {
    id: place.id,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    category: place.category,
    memo: place.memo,
    visited: place.visited,
    iconColor: place.iconColor,
    iconShape: place.iconShape,
  }
}
