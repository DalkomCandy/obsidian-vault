import { useState, type CSSProperties } from 'react'
import type { CategoryStyle } from '../types'
import { MARKER_COLOR_PALETTE, MARKER_SHAPES, MARKER_SHAPE_LABELS } from '../types'
import { MATERIAL_ICON_GROUPS } from '../lib/materialIcons'
import { PlacePin } from './PlacePin'

interface StylePickerProps {
  initial: CategoryStyle
  applyLabel: string
  onApply: (style: CategoryStyle) => void
  onClose: () => void
  /** e.g. "카테고리 기본값으로 되돌리기" for a place-level override -- omit where there's nothing to fall back to. */
  extraAction?: { label: string; onClick: () => void }
}

function GoogleIconTab({
  iconUrl,
  color,
  onPick,
}: {
  iconUrl: string | undefined
  color: string
  onPick: (url: string) => void
}) {
  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState(MATERIAL_ICON_GROUPS[0].label)

  const trimmed = query.trim().toLowerCase()
  const results = trimmed
    ? MATERIAL_ICON_GROUPS.flatMap((g) => g.icons).filter(
        (icon) => icon.label.toLowerCase().includes(trimmed) || icon.name.toLowerCase().includes(trimmed),
      )
    : (MATERIAL_ICON_GROUPS.find((g) => g.label === activeGroup)?.icons ?? [])

  return (
    <div className="google-icon-tab">
      <input
        className="google-icon-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="아이콘 검색 (예: 커피, 호텔)"
      />
      {!trimmed && (
        <div className="google-icon-group-tabs">
          {MATERIAL_ICON_GROUPS.map((g) => (
            <button
              key={g.label}
              type="button"
              className={g.label === activeGroup ? 'google-icon-group-tab active' : 'google-icon-group-tab'}
              onClick={() => setActiveGroup(g.label)}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}
      <div className="google-icon-grid">
        {results.length === 0 && <p className="google-icon-empty">검색 결과가 없어요.</p>}
        {results.map((icon) => (
          <button
            key={icon.name}
            type="button"
            className={icon.url === iconUrl ? 'shape-icon-chip active' : 'shape-icon-chip'}
            title={icon.label}
            onClick={() => onPick(icon.url)}
          >
            <PlacePin color={color} shape="circle" iconUrl={icon.url} faded={false} />
          </button>
        ))}
      </div>
    </div>
  )
}

/** Shared color/shape/icon editor UI -- used both for a category's style (all its places) and a single place's override. */
export function StylePicker({ initial, applyLabel, onApply, onClose, extraAction }: StylePickerProps) {
  const [shape, setShape] = useState(initial.shape)
  const [color, setColor] = useState(initial.color)
  const [iconUrl, setIconUrl] = useState(initial.iconUrl)
  const [tab, setTab] = useState<'custom' | 'google'>('custom')

  const dirty = shape !== initial.shape || color !== initial.color || iconUrl !== initial.iconUrl

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
            {MARKER_SHAPES.map((s) => (
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

        {tab === 'google' && <GoogleIconTab iconUrl={iconUrl} color={color} onPick={setIconUrl} />}

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
        <div className="category-style-actions">
          {extraAction && (
            <button type="button" className="category-style-reset" onClick={extraAction.onClick}>
              {extraAction.label}
            </button>
          )}
          <button
            type="button"
            className="primary category-style-apply"
            disabled={!dirty}
            onClick={() => onApply({ shape, color, iconUrl })}
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
