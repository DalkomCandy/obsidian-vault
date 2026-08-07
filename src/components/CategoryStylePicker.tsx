import { useState, type CSSProperties } from 'react'
import type { Category } from '../types'
import {
  CATEGORY_RELEVANT_SHAPES,
  MARKER_COLOR_PALETTE,
  MARKER_SHAPES,
  MARKER_SHAPE_LABELS,
  googleIconCandidatesFor,
  googleIconUrl,
} from '../types'
import { usePlaceStore } from '../store/usePlaceStore'
import { PlacePin } from './PlacePin'

interface CategoryStylePickerProps {
  category: Category
  onClose: () => void
}

function GoogleIconTab({
  category,
  iconUrl,
  onPick,
}: {
  category: Category
  iconUrl: string | undefined
  onPick: (url: string) => void
}) {
  const candidates = googleIconCandidatesFor(category)
  const [broken, setBroken] = useState<Set<string>>(new Set())

  const visible = candidates.filter((name) => !broken.has(name))

  return (
    <div className="google-icon-grid">
      {visible.length === 0 && <p className="google-icon-empty">불러올 수 있는 아이콘이 없어요.</p>}
      {visible.map((name) => {
        const url = googleIconUrl(name)
        return (
          <button
            key={name}
            type="button"
            className={url === iconUrl ? 'shape-icon-chip active' : 'shape-icon-chip'}
            title={name}
            onClick={() => onPick(url)}
          >
            <span className="google-icon-swatch">
              <img
                src={url}
                width={20}
                height={20}
                alt=""
                onError={() => setBroken((prev) => new Set(prev).add(name))}
              />
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function CategoryStylePicker({ category, onClose }: CategoryStylePickerProps) {
  const categoryStyles = usePlaceStore((s) => s.categoryStyles)
  const setCategoryStyle = usePlaceStore((s) => s.setCategoryStyle)
  const current = categoryStyles[category]
  const [shape, setShape] = useState(current.shape)
  const [color, setColor] = useState(current.color)
  const [iconUrl, setIconUrl] = useState(current.iconUrl)
  const [tab, setTab] = useState<'custom' | 'google'>('custom')

  const shapes = CATEGORY_RELEVANT_SHAPES[category] ?? MARKER_SHAPES
  const dirty = shape !== current.shape || color !== current.color || iconUrl !== current.iconUrl

  return (
    <div className="style-popup-overlay" onClick={onClose}>
      <div className="category-style-picker" onClick={(e) => e.stopPropagation()}>
        <div className="category-style-row">
          <div className="category-style-preview">
            <PlacePin color={color} shape={shape} iconUrl={iconUrl} faded={false} />
          </div>
          <div className="style-tabs">
            <button
              type="button"
              className={tab === 'custom' ? 'style-tab active' : 'style-tab'}
              onClick={() => setTab('custom')}
            >
              커스텀 모양
            </button>
            <button
              type="button"
              className={tab === 'google' ? 'style-tab active' : 'style-tab'}
              onClick={() => setTab('google')}
            >
              구글 아이콘
            </button>
          </div>
        </div>

        {tab === 'custom' && (
          <div className="shape-select">
            {shapes.map((s) => (
              <button
                key={s}
                type="button"
                className={s === shape && !iconUrl ? 'shape-icon-chip active' : 'shape-icon-chip'}
                title={MARKER_SHAPE_LABELS[s]}
                onClick={() => {
                  setShape(s)
                  setIconUrl(undefined)
                }}
              >
                <PlacePin color={color} shape={s} faded={false} />
              </button>
            ))}
          </div>
        )}

        {tab === 'google' && <GoogleIconTab category={category} iconUrl={iconUrl} onPick={setIconUrl} />}

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
          <label className="swatch-custom" style={{ '--swatch-color': color } as CSSProperties} title="직접 선택 (RGB)">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
        <button
          type="button"
          className="primary category-style-apply"
          disabled={!dirty}
          onClick={() => {
            setCategoryStyle(category, { shape, color, iconUrl })
            onClose()
          }}
        >
          이 카테고리 전체에 적용
        </button>
      </div>
    </div>
  )
}
